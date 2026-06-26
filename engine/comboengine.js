// ════════════════════════════════════════════════════════════════
// comboengine.js
// Engine pencarian kombinasi hero terbaik — full enumerate C(n, k).
// ════════════════════════════════════════════════════════════════

import { applyAllBuffs }                                      from './buff_engine.js';
import { simulateBattle }                                     from './simulate_battle.js';
import { buildCacheKey, getScore, setScore, setDebug, getAllL1Entries } from '../cache/cache_manager.js';
import { computeScoreTotals, shouldSkipCache }                from './score_utils.js';

// ── HELPER: deep clone heroList ───────────────────────────────────
function cloneHeroList(heroList) {
  return heroList.map(h => ({
    ...h,
    fraksi:           Array.isArray(h.fraksi) ? [...h.fraksi] : h.fraksi,
    role:             Array.isArray(h.role)   ? [...h.role]   : h.role,
    buffs:            {},
    buffLog:          [],
    scheduled_events: h.scheduled_events ? [...h.scheduled_events] : [],
  }));
}

// ── GENERATE SEMUA KOMBINASI C(arr, k) ───────────────────────────
function generateCombinations(arr, k) {
  const result = [];
  function recurse(start, combo) {
    if (combo.length === k) { result.push([...combo]); return; }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      recurse(i + 1, combo);
      combo.pop();
    }
  }
  recurse(0, []);
  return result;
}

// ════════════════════════════════════════════════════════════════
// FUNGSI UTAMA
// ════════════════════════════════════════════════════════════════

// ── HELPER: simulasi penuh (buff + battle) untuk satu set hero ──────────────
function _simulasiFinal(rawKombo, heroWajib, ALL_HEROES) {
  const heroList = cloneHeroList([...heroWajib, ...rawKombo]);
  applyAllBuffs(heroList);
  const simResults = {};
  heroList.forEach(hero => {
    const baseData = ALL_HEROES[hero.name];
    if (!baseData) return;
    const sim    = simulateBattle(hero, baseData);
    const totals = computeScoreTotals(sim);
    sim.damageTotal  = totals.damageTotal;
    sim.sustainTotal = totals.sustainTotal;
    simResults[hero.label ?? hero.name] = sim;
  });
  return { selectedHeroes: heroList, simResults };
}

// Token pembatalan aktif. Diisi tiap run baru, dipakai oleh cancelComboEngine().
let _cancelToken = null;

export function cancelComboEngine() {
  if (_cancelToken) {
    _cancelToken.cancelled = true;
    // Terminate paksa semua worker yang sudah spawn
    _cancelToken.workers?.forEach(w => {
      if (!w) return;
      try { w.terminate(); } catch (_) {}
    });
    // Resolve semua promise yang masih pending supaya Promise.all tidak stuck
    _cancelToken.resolvers?.forEach(fn => { try { fn(); } catch (_) {} });
    _cancelToken.resolvers = [];
    // Sengaja TIDAK null-kan supaya token.cancelled tetap terbaca setelah Promise.all
  }
}

export async function runComboEngine(heroPool, slotLevel, scoreMode, ALL_HEROES, forcedHeroes = [], onProgress = null) {

  // ── VALIDASI ─────────────────────────────────────────────────
  if (!Array.isArray(heroPool) || heroPool.length === 0)
    throw new Error('heroPool kosong');
  if (typeof slotLevel !== 'number' || slotLevel < 1)
    throw new Error('slotLevel tidak valid');
  if (heroPool.length < slotLevel)
    throw new Error('pool tidak cukup untuk level yang dipilih');
  if (forcedHeroes.length >= slotLevel)
    throw new Error('hero wajib sudah memenuhi atau melebihi slotLevel');
  if (!['damage', 'sustain', 'combined'].includes(scoreMode))
    throw new Error('scoreMode tidak valid');

  // ── SETUP ─────────────────────────────────────────────────────
  const namaWajib = new Set(forcedHeroes.map(h => `${h.name}|${h.stars}|${h.label}`));

  const poolSisa = heroPool
    .filter(h => !namaWajib.has(`${h.name}|${h.stars}|${h.label}`))
    .map(h => ({
      ...h,
      scheduled_events: h.scheduled_events ?? [],
      buffs:            h.buffs            ?? {},
      buffLog:          h.buffLog          ?? [],
    }));

  const heroWajib = forcedHeroes.map(h => ({
    ...h,
    scheduled_events: h.scheduled_events ?? [],
    buffs:            h.buffs            ?? {},
    buffLog:          h.buffLog          ?? [],
  }));

  const slotTersisa = slotLevel - forcedHeroes.length;

  // ── FULL ENUMERATE (MULTI-WORKER) ────────────────────────────
  window.__progressLog    = [];   // reset log progress tiap run baru
  window.__liveProgress   = window.__liveProgress ?? {};
  let _lastProgressLogTime = 0;   // debounce: max 1 log entry per 5 detik
  const _startTime    = performance.now();
  const kombinasiList = generateCombinations(poolSisa, slotTersisa);
  if (kombinasiList.length === 0)
    throw new Error('tidak ada kombinasi yang bisa dibentuk');

  // Snapshot L1 sebelum spawn — semua worker mulai dengan state cache yang sama
  const l1Data      = getAllL1Entries();
  const workerCount = Math.max(1, navigator.hardwareConcurrency ?? 4);
  const chunkSize   = Math.ceil(kombinasiList.length / workerCount);

  window.__liveProgress.totalKombinasi = kombinasiList.length;
  window.__liveProgress.workerCount    = workerCount;

  // Snapshot state global (window.xxx) yang dibutuhkan handler buff —
  // diisi user lewat modal (AstroPower/Exorcist/Enchanted_Tales/Neobeasts/
  // Dragoncaller) sebelum runComboEngine() ini dipanggil. Worker tidak
  // punya akses ke `window` milik main thread, jadi nilainya harus
  // dikirim eksplisit lewat postMessage.
  const globalState = _collectGlobalStateForWorker();

  // Batalkan run sebelumnya jika masih ada (jaga-jaga kalau CARI() tidak cancel duluan)
  if (_cancelToken) cancelComboEngine();

  // Buat cancel token baru untuk run ini
  const token = { cancelled: false, workers: [] };
  _cancelToken = token;

  // State progress gabungan dari semua worker — disimpan di token supaya resolver bisa baca
  const workerEvaluated = new Array(workerCount).fill(0);
  const workerBestSkor  = new Array(workerCount).fill(-Infinity);
  token.workerEvaluated = workerEvaluated;
  token.workerBestSkor  = workerBestSkor;

  // Global best tracker — mencegah UI mundur ke kombo lebih jelek dari worker lain
  let _globalBestSkor      = -Infinity;
  let _globalBestKombinasi = null;

  const promises = [];
  for (let i = 0; i < workerCount; i++) {
    const chunk = kombinasiList.slice(i * chunkSize, (i + 1) * chunkSize);
    if (chunk.length === 0) continue;
    promises.push(_runWorker(chunk, heroWajib, ALL_HEROES, scoreMode, l1Data, globalState, token, i, (msg) => {
      if (msg.type === 'progress') {
        workerEvaluated[i] = msg.evaluated;
        workerBestSkor[i]  = msg.bestSkor;

        // Merge entry baru dari worker ke L1 main thread
        if (msg.newEntries?.length) {
          for (const [key, value] of msg.newEntries) setScore(key, value);
        }

        const totalEval = workerEvaluated.reduce((a, b) => a + b, 0);
        const pct       = Math.min(100, (totalEval / kombinasiList.length) * 100);
        const bestSoFar = Math.max(...workerBestSkor);

        // Update global best — hanya simpan kalau worker ini memang lebih baik dari semua worker
        if (msg.bestKombinasi && msg.bestSkor > _globalBestSkor) {
          _globalBestSkor      = msg.bestSkor;
          _globalBestKombinasi = msg.bestKombinasi;
        }

        // Update live state supaya modal bisa baca kapan saja
        if (window.__liveProgress) {
          window.__liveProgress.evaluated      = totalEval;
          window.__liveProgress.pct            = pct;
          window.__liveProgress.bestSkor       = bestSoFar > -Infinity ? bestSoFar : null;
          window.__liveProgress.totalKombinasi = kombinasiList.length;
        }

        // Catat ke progressLog max 1x per 5 detik (debounce gabungan semua worker)
        const nowMs = performance.now();
        if (nowMs - _lastProgressLogTime >= 5000) {
          _lastProgressLogTime = nowMs;
          const plog    = window.__progressLog;
          const tickNum = plog.length + 1;
          const prevSkor = plog.length ? plog[plog.length - 1].bestSkor : null;
          plog.push({ tick: tickNum, bestSkor: bestSoFar > -Infinity ? bestSoFar : null, prevSkor, scoreMode });
        }

        if (typeof onProgress === 'function' && _globalBestKombinasi) {
          // Simulasi penuh (buff + battle) supaya tampilan identik dengan hasil final
          // Pakai _globalBestKombinasi (bukan msg.bestKombinasi) supaya UI tidak mundur ke kombo lebih jelek
          const { selectedHeroes, simResults } = _simulasiFinal(_globalBestKombinasi, heroWajib, ALL_HEROES);
          onProgress({ pct, evaluated: totalEval, bestSkor: bestSoFar, selectedHeroes, simResults });
        } else if (typeof onProgress === 'function') {
          onProgress({ pct, evaluated: totalEval, bestSkor: bestSoFar, selectedHeroes: null, simResults: null });
        }
      }
    }));
  }

  const results = await Promise.all(promises);

  // Cari best dari semua worker + merge entry baru ke L1 global + L2
  // Sekaligus gabungkan statistik (hit/miss/skip/evaluated) dari semua worker.
  let bestKombinasi = null;
  let bestSkor      = -Infinity;
  const totalStats  = { hit: 0, miss: 0, skip: 0 };
  let totalEvaluated = 0;
  const perWorkerLog = [];

  results.forEach((r, i) => {
    // Worker yang dibatalkan sudah punya struktur kosong, tetap aman diproses
    if ((r.bestSkor ?? -Infinity) > bestSkor) {
      bestSkor      = r.bestSkor;
      bestKombinasi = r.bestKombinasi;
    }
    for (const [key, value] of (r.newEntries ?? [])) setScore(key, value);
    for (const [key, debug] of (r.debugEntries ?? [])) setDebug(key, debug);
    totalStats.hit  += r.stats?.hit  ?? 0;
    totalStats.miss += r.stats?.miss ?? 0;
    totalStats.skip += r.stats?.skip ?? 0;
    totalEvaluated  += r.evaluated   ?? 0;
    perWorkerLog.push({
      worker:    i + 1,
      evaluated: r.evaluated   ?? 0,
      bestSkor:  r.bestSkor    ?? -Infinity,
      hit:       r.stats?.hit  ?? 0,
      miss:      r.stats?.miss ?? 0,
      skip:      r.stats?.skip ?? 0,
      entryBaru: (r.newEntries ?? []).length,
      waktuMs:   r.waktuMs     ?? 0,
      cancelled: r.type === 'cancelled',
    });
  });

  // Kalau run ini dibatalkan: simpan summary lalu lempar AbortError
  if (token.cancelled) {
    const _endTime        = performance.now();
    const totalWaktuDetik = ((_endTime - _startTime) / 1000).toFixed(2);
    const pct             = Math.min(100, (totalEvaluated / kombinasiList.length) * 100).toFixed(1);
    window.__lastRunSummary = {
      status:         'cancelled',
      slotTersisa,
      poolSize:       poolSisa.length,
      heroWajibCount: heroWajib.length,
      totalKombinasi: kombinasiList.length,
      totalEvaluated,
      pct,
      bestSkor:       bestSkor > -Infinity ? bestSkor : null,
      scoreMode,
      totalWaktuDetik,
      totalStats,
      perWorkerLog,
      progressLog:    window.__progressLog ?? [],
    };
    throw new DOMException('Pencarian dibatalkan', 'AbortError');
  }

  // ── SIMULASI FINAL ────────────────────────────────────────────
  const { selectedHeroes: heroWajibFinal, simResults } = _simulasiFinal(bestKombinasi, heroWajib, ALL_HEROES);

  // ── SUMMARY ──────────────────────────────────────────────────
  const _endTime         = performance.now();
  const totalNewEntries  = results.reduce((s, r) => s + r.newEntries.length, 0);
  const totalWaktuDetik  = ((_endTime - _startTime) / 1000).toFixed(2);
  const totalEvaluasiHero = totalStats.hit + totalStats.miss + totalStats.skip;
  const hitRatePct        = totalEvaluasiHero > 0
    ? ((totalStats.hit / totalEvaluasiHero) * 100).toFixed(1)
    : '0.0';

  window.__lastRunSummary = {
    status:         'done',
    slotTersisa,
    poolSize:       poolSisa.length,
    heroWajibCount: heroWajib.length,
    totalKombinasi: kombinasiList.length,
    totalEvaluated,
    pct:            '100.0',
    bestSkor,
    scoreMode,
    totalNewEntries,
    totalWaktuDetik,
    totalStats,
    totalEvaluasiHero,
    hitRatePct,
    perWorkerLog,
    progressLog:    window.__progressLog ?? [],
  };

  return { selectedHeroes: heroWajibFinal, simResults };
}

// ════════════════════════════════════════════════════════════════
// HELPER: KUMPULKAN STATE GLOBAL UNTUK DIKIRIM KE WORKER
// ════════════════════════════════════════════════════════════════
// harcoded const GLOBAL_STATE_KEYS 
const GLOBAL_STATE_KEYS = [
  'userLevel',               
  'exorcistTemplateLabel',    
  'astropowerSovereignLabel',  
  'enchantedTalesFragment',   
  'neobeastsPoin',           
];

function _collectGlobalStateForWorker() {
  const state = {};
  for (const key of GLOBAL_STATE_KEYS) {
    if (window[key] !== undefined) state[key] = window[key];
  }
  return state;
}

// ════════════════════════════════════════════════════════════════
// HELPER: SPAWN SATU WORKER
// ════════════════════════════════════════════════════════════════
function _runWorker(kombinasi, heroWajib, ALL_HEROES, scoreMode, l1Data, globalState, token, workerIndex, onMsg) {
  const CANCELLED_RESULT = {
    type: 'cancelled', bestSkor: -Infinity, bestKombinasi: null,
    newEntries: [], debugEntries: [], stats: { hit:0, miss:0, skip:0 },
    evaluated: 0, waktuMs: 0,
  };

  return new Promise((resolve, reject) => {
    // Kalau token sudah cancelled sebelum worker sempat spawn, langsung resolve
    if (token.cancelled) { resolve(CANCELLED_RESULT); return; }

    const worker = new Worker(new URL('./combo_worker.js', import.meta.url), { type: 'module' });

    // Simpan resolve di token supaya cancelComboEngine() bisa resolve paksa.
    // Resolver membaca workerEvaluated[workerIndex] saat dipanggil (bukan saat didaftarkan)
    // supaya jumlah kombinasi yang sudah dievaluasi tercatat dengan benar.
    if (!token.resolvers) token.resolvers = [];
    token.resolvers.push(() => resolve({
      ...CANCELLED_RESULT,
      evaluated: token.workerEvaluated?.[workerIndex] ?? 0,
      bestSkor:  token.workerBestSkor?.[workerIndex]  ?? -Infinity,
    }));

    token.workers[workerIndex] = worker;

    worker.onmessage = ({ data }) => {
      if (data.type === 'progress') {
        if (typeof onMsg === 'function') onMsg(data);
        return;
      }
      worker.terminate();
      if (data.type === 'cancelled') {
        resolve({ ...CANCELLED_RESULT, evaluated: data.evaluated ?? 0 });
      } else {
        resolve(data);
      }
    };
    worker.onerror = (err) => {
      worker.terminate();
      reject(err);
    };
    worker.postMessage({ kombinasi, heroWajib, ALL_HEROES, scoreMode, l1Data, globalState });
  });
}

// ════════════════════════════════════════════════════════════════
// CEK INTEGRITAS CACHE
// ════════════════════════════════════════════════════════════════
export async function verifyCacheIntegrity(selectedHeroes, simResults) {
  const mismatches = [];

  for (const hero of selectedHeroes) {
    if (shouldSkipCache(hero)) continue;

    const sim = simResults[hero.label ?? hero.name];
    if (!sim) continue;

    const cacheKey = buildCacheKey(hero);
    const cached   = await getScore(cacheKey);

    if (cached === null) {
      mismatches.push({ hero, cacheKey, cached: null, final: sim, reason: 'MISS' });
      continue;
    }

    const dmgSelisih = Math.abs(cached.damageTotal  - sim.damageTotal);
    const susSelisih = Math.abs(cached.sustainTotal - sim.sustainTotal);
    if (dmgSelisih >= 1 || susSelisih >= 1) {
      mismatches.push({ hero, cacheKey, cached, final: sim, reason: 'MISMATCH' });
    }
  }

  return mismatches;
}