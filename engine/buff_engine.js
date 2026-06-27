import { DATABASE_BUFF } from '../data/buffs/database_buff.js';

function toArray(v) {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function getActiveTierIndex(count, thresholds) {
  let tierIndex = -1;
  thresholds.forEach((threshold, i) => {
    if (count >= threshold) tierIndex = i;
  });
  return tierIndex;
}

function applyBonusToHero(hero, bonusObj, sourceName = '?', scope = 'global') {
  Object.entries(bonusObj).forEach(([stat, value]) => {
    if (hero.buffs[stat] === undefined) hero.buffs[stat] = 0;
    hero.buffs[stat] += value;
    hero.buffLog.push({ source: sourceName, scope, stat, value });
  });
}

function applyOneBuff(buffName, buffData, heroList) {
  const { targetRole, targetFraksi, thresholds, global, role_bonus, handler } = buffData;

  const qualifying = heroList.filter(hero => {
    if (targetRole)   return toArray(hero.role).includes(targetRole);
    if (targetFraksi) return toArray(hero.fraksi).includes(targetFraksi);
    return false;
  });

  const uniqueNames = new Set(qualifying.map(h => h.name));
  let count         = uniqueNames.size;
  if (count === 0) return;

  // Bonus count dari hero yang punya blessing matching role/fraksi ini.
  // Setiap hero yang me-blessing targetRole/targetFraksi menambah +1 ke count,
  // terlepas dari apakah hero itu sudah masuk qualifying atau tidak.
  // Ini yang membuat 1 unit Frangko bisa dihitung 2× kalau di-blessing Weapon Master.
  heroList.forEach(hero => {
    const blessingRole   = Array.isArray(hero.blessingRole)   ? hero.blessingRole   : [];
    const blessingFraksi = Array.isArray(hero.blessingFraksi) ? hero.blessingFraksi : [];
    if (targetRole   && blessingRole.includes(targetRole))     count++;
    if (targetFraksi && blessingFraksi.includes(targetFraksi)) count++;
  });

  const tierIndex = getActiveTierIndex(count, thresholds);
  if (tierIndex === -1) return;

  if (global && Object.keys(global).length > 0) {
    const globalBonus = {};
    Object.entries(global).forEach(([stat, values]) => {
      globalBonus[stat] = values[tierIndex];
    });
    const globalTierKey = buffName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_global_tier';
    heroList.forEach(hero => {
      applyBonusToHero(hero, globalBonus, buffName, 'global');
      hero[globalTierKey] = tierIndex + 1;
    });
  }

  if (role_bonus && Object.keys(role_bonus).length > 0) {
    const roleBonus = {};
    Object.entries(role_bonus).forEach(([stat, values]) => {
      roleBonus[stat] = values[tierIndex];
    });
    qualifying.forEach(hero => applyBonusToHero(hero, roleBonus, buffName, 'role'));
  }

  if (typeof handler !== 'function') {
    const tierKey = buffName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_tier';
    qualifying.forEach(hero => { hero[tierKey] = tierIndex + 1; });
  }

  if (typeof handler === 'function') {
    handler({ heroList, qualifying, tierIndex, buffData });
  }
}

// ════════════════════════════════════════════════════════════════
// applyAllBuffs — dipakai untuk SIMULASI FINAL (render detail UI)
//
// PENTING: Emberlord & Heartbond TIDAK ikut loop biasa, melainkan
// dipanggil eksplisit di urutan tetap (Emberlord → Heartbond),
// SAMA seperti urutan yang dipakai combo_worker.js saat scoring.
// Ini supaya ranking kematian Emberlord & ranking pairing Heartbond
// konsisten antara fase scoring (worker) dan fase render final,
// terlepas dari posisi Emberlord/Heartbond di BUFF_LIST.
//
// Kalau urutan ini diubah, ubah juga urutan applyEmberlordBuff/
// applyHeartbondBuff di combo_worker.js agar tetap match.
// ════════════════════════════════════════════════════════════════
// harcode export function applyAllBuffs(heroList)
export function applyAllBuffs(heroList) {
  heroList.forEach(hero => {
    hero.buffs   = {};
    hero.buffLog = [];
  });

  Object.entries(DATABASE_BUFF).forEach(([buffName, buffData]) => {
    if (buffName === 'Emberlord') return; // ← skip, dipanggil eksplisit di bawah
    if (buffName === 'Heartbond') return; // ← skip, dipanggil eksplisit di bawah
    applyOneBuff(buffName, buffData, heroList);
  });

  // Urutan eksplisit & tetap — JANGAN gantung ke posisi BUFF_LIST
  applyOneBuff('Emberlord', DATABASE_BUFF['Emberlord'], heroList);
  applyOneBuff('Heartbond', DATABASE_BUFF['Heartbond'], heroList);

  return heroList;
}
// harcode export function applyAllBuffsPhase1(heroList) 
export function applyAllBuffsPhase1(heroList) {
  heroList.forEach(hero => {
    hero.buffs   = {};
    hero.buffLog = [];
  });
  Object.entries(DATABASE_BUFF).forEach(([buffName, buffData]) => {
    if (buffName === 'Emberlord') return; // ← skip
    if (buffName === 'Heartbond') return; // ← skip
    applyOneBuff(buffName, buffData, heroList);
  });
  return heroList;
}
// harcode export function applyEmberlordBuff(heroList)
export function applyEmberlordBuff(heroList) {
  const buffData = DATABASE_BUFF['Emberlord'];
  if (!buffData) return heroList;
  applyOneBuff('Emberlord', buffData, heroList);
  return heroList;
}
// harcode export function applyHeartbondBuff(heroList)
export function applyHeartbondBuff(heroList) {
  const buffData = DATABASE_BUFF['Heartbond'];
  if (!buffData) return heroList;
  applyOneBuff('Heartbond', buffData, heroList);
  return heroList;
}