import { applyAllBuffsPhase1, applyEmberlordBuff, applyHeartbondBuff } from './buff_engine.js';
import { simulateBattle }                                               from './simulate_battle.js';
import { buildCacheKey, buildBuffActive, getScoreSync, setScore, hashString } from '../cache/cache_manager.js';
import { computeScoreTotals, getScoreValue, shouldSkipCache }           from './score_utils.js';

if (typeof window === 'undefined') {
  self.window = self;
}

function toArray(v) {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function cloneHeroList(heroList) {
  return heroList.map(h => ({
    ...h,
    fraksi:           Array.isArray(h.fraksi) ? [...h.fraksi] : h.fraksi,
    role:             Array.isArray(h.role)   ? [...h.role]   : h.role,
    buffs:            {},
    buffLog:          [],
    scheduled_events: h.scheduled_events ? [...h.scheduled_events] : [],
    blessingFraksi:   Array.isArray(h.blessingFraksi) ? [...h.blessingFraksi] : [],
    blessingRole:     Array.isArray(h.blessingRole)   ? [...h.blessingRole]   : [],
  }));
}
///////////////////Tambah fungsi baru setelah function cloneHeroList (sekitar line 28):
function buildEmberlordTeamHash(heroList) {
  const units = heroList
    .filter(h => toArray(h.fraksi).includes('Emberlord'))
    .map(h => `${h.name}|${h.stars}|${h.label}`)
    .sort()
    .join(',');
  return hashString(units);
}
const _stats = { hit: 0, miss: 0, skip: 0 };

const _newEntriesMap   = new Map();
const _debugEntriesMap = new Map();

function getHeroTotals(hero, baseData, phase = 'phase1', teamHash = '') {/////////////
  if (shouldSkipCache(hero)) {
    _stats.skip++;
    const sim    = simulateBattle(hero, baseData);
    const totals = computeScoreTotals(sim);
    return { totals, cacheKey: null };
  }

  const cacheKey = buildCacheKey(hero, phase, teamHash);/////////////////
  const cached   = getScoreSync(cacheKey);
  if (cached !== null) {
    _stats.hit++;
    return { totals: cached, cacheKey };
  }

  _stats.miss++;
  const sim    = simulateBattle(hero, baseData);
  const totals = computeScoreTotals(sim);
  const debugInfo = {
    name:        hero.name,
    stars:       hero.stars,
    role:        hero.role,
    fraksi:      hero.fraksi,
    buff_active: buildBuffActive(hero),
    phase,
  };
  setScore(cacheKey, totals);
  _newEntriesMap.set(cacheKey, totals);
  _debugEntriesMap.set(cacheKey, debugInfo);
  return { totals, cacheKey };
}
// harcoded function evaluateCombination(heroWajib, kandidat, ALL_HEROES, scoreMode) 
function evaluateCombination(heroWajib, kandidat, ALL_HEROES, scoreMode) {
  const heroListTemp = cloneHeroList([...heroWajib, ...kandidat]);

  // ── Fase 1: semua buff kecuali Emberlord & Heartbond ──
  applyAllBuffsPhase1(heroListTemp);
  for (const hero of heroListTemp) {
    const baseData = ALL_HEROES[hero.name];
    if (!baseData) continue;
    const { cacheKey } = getHeroTotals(hero, baseData, 'fase1');
hero._prevPhaseKey = cacheKey;
hero._phaseKeys = [cacheKey]; // ← init array
  }

  // ── Deteksi apakah ada Heartbond / Emberlord aktif di kombinasi ini ──
  // Heartbond aktif = ada ≥2 hero fraksi Heartbond
  // Emberlord aktif = ada ≥2 hero fraksi Emberlord
  // Ikuti logika applyOneBuff: qualifying unik + bonus dari blessing
  function countFraksi(list, nama) {
    const unik = new Set(list.filter(h => toArray(h.fraksi).includes(nama)).map(h => h.name));
    if (unik.size === 0) return 0;
    const blessingBonus = list.reduce((n, h) => n + (Array.isArray(h.blessingFraksi) && h.blessingFraksi.includes(nama) ? 1 : 0), 0);
    return unik.size + blessingBonus;
  }
  const adaHeartbond = countFraksi(heroListTemp, 'Heartbond') >= 2;
  const adaEmberlord = countFraksi(heroListTemp, 'Emberlord') >= 2;

  // ── Fase 2: Heartbond (jika aktif) ──
  // baca skor dari _prevPhaseKey (fase1), hasilkan key fase2
  if (adaHeartbond) {
    applyHeartbondBuff(heroListTemp);
    for (const hero of heroListTemp) {
      const baseData = ALL_HEROES[hero.name];
      if (!baseData) continue;
      // Fase 2 (Heartbond)
const { cacheKey } = getHeroTotals(hero, baseData, 'fase2');
hero._prevPhaseKey = cacheKey;
hero._phaseKeys.push(cacheKey); // ← tambah
    }
  }

  // ── Fase 3: Emberlord (jika aktif) ──
  // baca skor dari _prevPhaseKey (fase1 atau fase2), hasilkan key fase3
  // Fase 3: Emberlord (jika aktif)
  //////////////////////
if (adaEmberlord) {
  applyEmberlordBuff(heroListTemp);
  const teamHash = buildEmberlordTeamHash(heroListTemp); // ← hitung sekali
  for (const hero of heroListTemp) {
    const baseData = ALL_HEROES[hero.name];
    if (!baseData) continue;
    const { cacheKey } = getHeroTotals(hero, baseData, 'fase3', teamHash);
    hero._prevPhaseKey = cacheKey;
  }
}
////////////////////
  // ── Hitung total skor dari key fase terakhir ──
  let totalSkor = 0;
  for (const hero of heroListTemp) {
    const baseData = ALL_HEROES[hero.name];
    if (!baseData) continue;
    const cached = getScoreSync(hero._prevPhaseKey);
    if (cached) totalSkor += getScoreValue(cached, scoreMode);
  }
  return totalSkor;
}

let _cancelled = false;

self.onmessage = ({ data }) => {
  // Handle cancel signal
  if (data?.type === 'cancel') {
    _cancelled = true;
    return;
  }

  _cancelled = false;
  const _workerStartTime = performance.now();
  const { kombinasi, heroWajib, ALL_HEROES, scoreMode, l1Data, globalState } = data;

  if (Array.isArray(l1Data)) {
    for (const [key, value] of l1Data) {
      setScore(key, value);
    }
  }
  _newEntriesMap.clear();
  _debugEntriesMap.clear();
  _stats.hit = 0; _stats.miss = 0; _stats.skip = 0;

  window.ALL_HEROES = ALL_HEROES;
  if (globalState && typeof globalState === 'object') {
    Object.assign(window, globalState);
  }

  let bestSkor      = -Infinity;
  let bestKombinasi = null;
  let evaluated     = 0;

  // Kirim progress tiap 5 detik
  let lastProgressTime = performance.now();
  const PROGRESS_INTERVAL_MS = 5000;

  for (const kandidat of kombinasi) {
    if (_cancelled) {
      self.postMessage({ type: 'cancelled', evaluated });
      return;
    }

    const skor = evaluateCombination(heroWajib, kandidat, ALL_HEROES, scoreMode);
    evaluated++;
    if (skor > bestSkor) {
      bestSkor      = skor;
      bestKombinasi = kandidat;
    }

    const now = performance.now();
    if (now - lastProgressTime >= PROGRESS_INTERVAL_MS) {
      lastProgressTime = now;
      self.postMessage({
        type:          'progress',
        evaluated,
        bestSkor,
        bestKombinasi,
        newEntries:    [..._newEntriesMap.entries()],  // kirim entry baru sejak awal
      });
    }
  }

  self.postMessage({
    type:         'done',
    bestSkor,
    bestKombinasi,
    newEntries:   [..._newEntriesMap.entries()],
    debugEntries: [..._debugEntriesMap.entries()],
    stats:        { ..._stats },
    evaluated:    kombinasi.length,
    waktuMs:      Math.round(performance.now() - _workerStartTime),
  });
};