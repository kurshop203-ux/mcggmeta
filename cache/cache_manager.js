const DB_NAME      = 'combo_cache';
const DB_VERSION   = 3;
const STORE_META   = 'meta';
const STORE_SCORES = 'sim_scores';
const STORE_DEBUG  = 'sim_debug';

let _db  = null;
const L1 = new Map();

// ── HASH ─────────────────────────────────────────────────────────
export function hashString(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h = h >>> 0;
  }
  return h.toString(16);
}

export function stableStringify(obj) {
  return JSON.stringify(obj, (_, val) =>
    val && typeof val === 'object' && !Array.isArray(val)
      ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => a.localeCompare(b)))
      : val
  );
}

function buildFingerprint(DATABASE_BUFF, ALL_HEROES) {
  return hashString(stableStringify({ DATABASE_BUFF, ALL_HEROES }));
}

// ── INDEXEDDB ─────────────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_META))   db.createObjectStore(STORE_META);
      if (!db.objectStoreNames.contains(STORE_SCORES)) db.createObjectStore(STORE_SCORES);
      if (!db.objectStoreNames.contains(STORE_DEBUG))  db.createObjectStore(STORE_DEBUG);
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

function idbGet(store, key) {
  return new Promise((resolve, reject) => {
    const req = _db.transaction(store, 'readonly').objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror   = () => reject(req.error);
  });
}

function idbSet(store, key, value) {
  return new Promise((resolve, reject) => {
    const req = _db.transaction(store, 'readwrite').objectStore(store).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

function idbClear(store) {
  return new Promise((resolve, reject) => {
    const req = _db.transaction(store, 'readwrite').objectStore(store).clear();
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

function idbCursorAll(store) {
  return new Promise((resolve, reject) => {
    const entries = [];
    const req = _db.transaction(store, 'readonly').objectStore(store).openCursor();
    req.onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) { entries.push([cursor.key, cursor.value]); cursor.continue(); }
      else resolve(entries);
    };
    req.onerror = () => reject(req.error);
  });
}

// ── WARMUP L1 ────────────────────────────────────────────────────
// Tarik semua entry STORE_SCORES dari L2 ke L1 sekaligus saat app buka.
// Setelah ini, getScoreSync() bisa dipakai di hot loop tanpa await.
async function warmupL1() {
  if (!_db) return;
  const entries = await idbCursorAll(STORE_SCORES);
  for (const [key, value] of entries) {
    L1.set(key, value);
  }
  console.info(`[cache] warmup L1 selesai — ${L1.size} entry dimuat`);
}

// ── BUILD BUFF ACTIVE ─────────────────────────────────────────────
// harcoded export function buildBuffActive(hero)
export function buildBuffActive(hero) {
  function toArray(v) {
    if (v === undefined || v === null) return [];
    return Array.isArray(v) ? v : [v];
  }

  const heroRoles   = new Set([...toArray(hero.role),   ...toArray(hero.blessingRole)]);
  const heroFraksi  = new Set([...toArray(hero.fraksi),  ...toArray(hero.blessingFraksi)]);
  const log         = hero.buffLog ?? [];

  function isActiveInLog(buffKey) {
    return log.some(b => b.source === buffKey || b.source?.startsWith(buffKey));
  }

  function getTier(buffKey) {
    switch (buffKey) {
      case 'AstroPower':      return hero.astropower_tier        ?? null;
      case 'Dragoncaller':    return hero.dragoncaller_tier       ?? null;
      case 'Enchanted_Tales': return hero.enchantedtales_tier     ?? null;
      case 'Exorcist':        return hero.exorcist_phantom?.tier  ?? null;
      case 'Heartbond':       return hero.heartbond_tier          ?? null;
      case 'Neobeasts':       return hero.neobeasts_tier          ?? null;
      case 'Emberlord':       return hero.emberlord_tier          ?? null;
      case 'Northern_Vale':   return hero.northern_vale_tier      ?? null;
      default: {
        const tierKey       = buffKey.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_tier';
        const globalTierKey = buffKey.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_global_tier';
        return hero[tierKey] ?? hero[globalTierKey] ?? null;
      }
    }
  }

  const ALL_BUFFS = [
    { key: 'Swiftblade',    targetRole: 'Swiftblade' },
    { key: 'Weapon_Master', targetRole: 'Weapon Master' },
    { key: 'Bruiser',       targetRole: 'Bruiser' },
    { key: 'Dauntless',     targetRole: 'Dauntless' },
    { key: 'Defender',      targetRole: 'Defender' },
    { key: 'Mage',          targetRole: 'Mage' },
    { key: 'Marksman',      targetRole: 'Marksman' },
    { key: 'Stargazer',     targetRole: 'Stargazer' },
    { key: 'Phasewarper',   targetRole: 'Phasewarper' },
    { key: 'Scavenger',     targetRole: 'Scavenger' },
    { key: 'AstroPower',      targetFraksi: 'Astro Power' },
    { key: 'Dragoncaller',    targetFraksi: 'Dragoncaller' },
    { key: 'Emberlord',       targetFraksi: 'Emberlord' },
    { key: 'Enchanted_Tales', targetFraksi: 'Enchanted Tales' },
    { key: 'Exorcist',        targetFraksi: 'Exorcist' },
    { key: 'Heartbond',       targetFraksi: 'Heartbond' },
    { key: 'Kishin',          targetFraksi: 'Kishin' },
    { key: 'Neobeasts',       targetFraksi: 'Neobeasts' },
    { key: 'Northern_Vale',   targetFraksi: 'Northern Vale' },
  ];

  const result = {};

  for (const { key, targetRole, targetFraksi } of ALL_BUFFS) {
    const heroHasIt = targetRole
      ? heroRoles.has(targetRole)
      : heroFraksi.has(targetFraksi);

    const active = isActiveInLog(key) ||
      (key === 'AstroPower'      && hero.astropower_tier        !== undefined) ||
      (key === 'Dragoncaller'    && hero.dragoncaller_tier       !== undefined) ||
      (key === 'Enchanted_Tales' && hero.enchantedtales_tier     !== undefined) ||
      (key === 'Exorcist'        && hero.exorcist_phantom        !== undefined) ||
      (key === 'Heartbond'       && hero.heartbond_status        !== undefined) ||
      (key === 'Neobeasts'       && hero.neobeasts_tier          !== undefined) ||
      (key === 'Emberlord'       && hero.emberlord_is_active     === true);

    if (!active) {
      result[key] = {};
      continue;
    }

    let type;
    if (heroHasIt) {
      type = targetRole ? 'role' : 'fraksi';
    } else {
      type = targetRole ? 'global_role' : 'global_fraksi';
    }

    const tier = getTier(key);
    const entry = { type, active: true };
    if (tier !== null) entry.tier = tier;

    switch (key) {
      case 'AstroPower':
        entry.sovereign_active = hero.astropower_is_sovereign === true;
        break;
      case 'Dragoncaller':
        entry.unit  = hero.dragoncaller_jumlah_unit  ?? null;
        entry.level = hero.dragoncaller_user_level   ?? null;
        break;
      case 'Enchanted_Tales':
        entry.poin = hero.enchantedtales_fragment ?? null;
        break;
      case 'Exorcist': {
        const p = hero.exorcist_phantom;
        entry.unit             = p?.jumlah_unit ?? null;
        entry.phantom_template = (hero.label ?? hero.name) === p?.dari_hero;
        break;
      }
      case 'Emberlord':
  // buff_diterima TIDAK dimasukkan ke hash — nilainya bergantung pada urutan
  // kematian run tertentu dan hanya dipakai UI panel, bukan penentu state simulasi.
  break;
      case 'Heartbond':
        entry.paired = hero.heartbond_status === 'paired';
        break;
      case 'Neobeasts':
        entry.poin = hero.neobeasts_poin ?? null;
        break;
    }

    for (const [k, v] of Object.entries(entry)) {
      if (v === null) delete entry[k];
    }

    result[key] = entry;
  }

  return result;
}

// ── PUBLIC ────────────────────────────────────────────────────────
export function buildCacheKey(hero, phase = '', teamHash = '') { /////////////////////////
  const buffActive     = buildBuffActive(hero);
  const buffActiveHash = hashString(stableStringify(buffActive));
  const blessingStr = [
    ...(Array.isArray(hero.blessingRole)   ? hero.blessingRole.slice().sort()   : []),
    ...(Array.isArray(hero.blessingFraksi) ? hero.blessingFraksi.slice().sort() : []),
  ].join(',');
  return [hero.name, hero.stars ?? 1, buffActiveHash, blessingStr, phase, teamHash].filter(v => v !== '').join('|'); ////////
}

export async function initCache(DATABASE_BUFF, ALL_HEROES) {
  _db = await openDB();
  const fresh  = buildFingerprint(DATABASE_BUFF, ALL_HEROES);
  const stored = await idbGet(STORE_META, 'fingerprint');
  if (stored !== fresh) {
    L1.clear();
    await idbClear(STORE_SCORES);
    await idbClear(STORE_DEBUG);
    await idbSet(STORE_META, 'fingerprint', fresh);
    console.info('[cache] flush — database berubah');
  } else {
    // Database tidak berubah → warmup L1 dari L2
    await warmupL1();
  }
}

// ── GET SCORE SYNC ────────────────────────────────────────────────
// Cek L1 saja — pure sync, no await, no yield ke event loop.
// Aman dipakai di hot loop setelah initCache() warmup selesai.
export function getScoreSync(key) {
  return L1.get(key) ?? null;
}

// ── GET SCORE ASYNC ───────────────────────────────────────────────
// Fallback async — cek L1 dulu, baru L2.
// Dipakai di luar hot loop (misal verifyCacheIntegrity).
export async function getScore(key) {
  if (L1.has(key)) return L1.get(key);
  if (!_db) return null;
  const val = await idbGet(STORE_SCORES, key);
  if (val !== null) L1.set(key, val);
  return val;
}

// ── SET SCORE ─────────────────────────────────────────────────────
// L1 update sync langsung.
// L2 update fire-and-forget — tidak di-await supaya tidak block hot loop.
export function setScore(key, value) {
  L1.set(key, value);
  if (_db) {
    idbSet(STORE_SCORES, key, value).catch(err =>
      console.warn('[cache] setScore L2 gagal:', err)
    );
  }
}

export function setDebug(key, debugInfo) {
  if (_db && debugInfo) {
    idbSet(STORE_DEBUG, key, debugInfo).catch(err =>
      console.warn('[cache] setDebug gagal:', err)
    );
  }
}

export async function clearCache() {
  L1.clear();
  if (_db) {
    await idbClear(STORE_SCORES);
    await idbClear(STORE_DEBUG);
  }
  console.info('[cache] cleared');
}

if (typeof window !== 'undefined') {
  window.__clearCache = clearCache;
}

export function isDbReady() { return _db !== null; }

export function getAllL1Entries() { return [...L1.entries()]; }

// ── EXPORT 2 FILE ────────────────────────────────────────────────
export async function exportCacheFiles() {
  if (!_db) return;

  const scores = await idbCursorAll(STORE_SCORES);
  const debugs = await idbCursorAll(STORE_DEBUG);

  function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  const ts = Date.now();
  downloadJSON(scores, `combo_cache_${ts}.json`);
  setTimeout(() => downloadJSON(debugs, `combo_cache_debug_${ts}.json`), 300);

  return { scoreCount: scores.length, debugCount: debugs.length };
}

// ── IMPORT ───────────────────────────────────────────────────────
export async function importScores(entries) {
  for (const [key, value] of entries) {
    setScore(key, value); // sync L1 + fire-and-forget L2
  }
}