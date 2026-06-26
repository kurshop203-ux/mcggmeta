import { applyAllBuffsPhase1, applyEmberlordBuff, applyHeartbondBuff } from './buff_engine.js';
import { simulateBattle }                                               from './simulate_battle.js';
import { buildCacheKey, buildBuffActive, getScoreSync, setScore }       from '../cache/cache_manager.js';
import { computeScoreTotals, getScoreValue, shouldSkipCache }           from './score_utils.js';

if (typeof window === 'undefined') {
  self.window = self;
}

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

const _stats = { hit: 0, miss: 0, skip: 0 };

const _newEntriesMap   = new Map();
const _debugEntriesMap = new Map();

function getHeroTotals(hero, baseData) {
  if (shouldSkipCache(hero)) {
    _stats.skip++;
    const sim    = simulateBattle(hero, baseData);
    const totals = computeScoreTotals(sim);
    return { totals, cacheKey: null };
  }

  const cacheKey = buildCacheKey(hero);
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
};
  setScore(cacheKey, totals);
  _newEntriesMap.set(cacheKey, totals);
  _debugEntriesMap.set(cacheKey, debugInfo);
  return { totals, cacheKey };
}
// harcoded function evaluateCombination(heroWajib, kandidat, ALL_HEROES, scoreMode) 
function evaluateCombination(heroWajib, kandidat, ALL_HEROES, scoreMode) {
  const heroListTemp = cloneHeroList([...heroWajib, ...kandidat]);

  applyAllBuffsPhase1(heroListTemp);
  for (const hero of heroListTemp) {
    const baseData = ALL_HEROES[hero.name];
    if (!baseData) continue;
    getHeroTotals(hero, baseData);
  }

  applyEmberlordBuff(heroListTemp);
  for (const hero of heroListTemp) {
    const baseData = ALL_HEROES[hero.name];
    if (!baseData) continue;
    getHeroTotals(hero, baseData); 
  }

  applyHeartbondBuff(heroListTemp);
  let totalSkor = 0;
  for (const hero of heroListTemp) {
    const baseData = ALL_HEROES[hero.name];
    if (!baseData) continue;
    const { totals } = getHeroTotals(hero, baseData);
    totalSkor += getScoreValue(totals, scoreMode);
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