// ════════════════════════════════════════════════════════════════
// score_utils.js harcoded phantom/sumon/dragon/emberlord/heartbond
// Satu-satunya tempat logika "ubah hasil simulateBattle() jadi
// damageTotal & sustainTotal". Sebelumnya logika ini (calcDmgSplit +
// replicateCalcSkor) ke-copy-paste persis di comboengine.js DAN
// pregenerate_cache.js — kalau salah satu diubah, yang lain ikut beda
// dan cache jadi tidak akurat. Sekarang cukup ubah di sini saja.
//
// Export:
//   computeScoreTotals(sim)        → { damageTotal, sustainTotal }
//   getScoreValue(totals, mode)    → number sesuai scoreMode
//   shouldSkipCache(hero)          → true kalau hero ini tidak aman di-cache
// ════════════════════════════════════════════════════════════════
import { round2 } from './simulate_battle.js';

function resolveVal(v, si) {
  return Array.isArray(v) ? v[Math.min(si, v.length - 1)] : v;
}


// score_utils.js
export function shouldSkipCache(hero) {
  return (
    
    hero.scheduled_events?.some(ev =>
      typeof ev.onTrigger === 'function' && !ev._deterministic
    ) ||
    (hero.buffs?.Double_ATK_Chance ?? 0) > 0
  );
}

function calcDmgSplit(sim) {
  let basicPhysTotal = 0, basicMagTotal = 0;
  let ghostPhysTotal = 0, ghostMagTotal = 0;
  let skillPhysTotal = 0, skillMagTotal = 0;

  sim.timeline
    .filter(e => ['basic', 'double', 'ghost'].includes(e.type))
    .forEach(e => {
      if (!e.breakdown) return;
      const b     = e.breakdown;
      const ratio = b.raw !== 0 ? b.final / b.raw : 0;
      let phys = 0, mag = 0;
      b.parts.forEach(p => {
        const v = p.value * ratio;
        if      (p.ref.startsWith('Physical')) phys += v;
        else if (p.ref.startsWith('Magic'))    mag  += v;
      });
      const rawTotal = phys + mag;
      if (rawTotal === 0) return;
      if (e.type === 'ghost') {
        ghostPhysTotal += e.dmg * (phys / rawTotal);
        ghostMagTotal  += e.dmg * (mag  / rawTotal);
      } else {
        basicPhysTotal += e.dmg * (phys / rawTotal);
        basicMagTotal  += e.dmg * (mag  / rawTotal);
      }
    });

  sim.timeline
    .filter(e => e.type === 'skill')
    .forEach(e => {
      if (!e.breakdown) return;
      const b     = e.breakdown;
      const ratio = b.raw !== 0 ? b.final / b.raw : 0;
      let phys = 0, mag = 0;
      b.parts.forEach(p => {
        const v = p.value * ratio;
        if      (p.ref.startsWith('Physical')) phys += v;
        else if (p.ref.startsWith('Magic'))    mag  += v;
      });
      const rawTotal = phys + mag;
      if (rawTotal === 0) return;
      skillPhysTotal += e.dmg * (phys / rawTotal);
      skillMagTotal  += e.dmg * (mag  / rawTotal);
    });

  return {
    basicPhysTotal: round2(basicPhysTotal),
    basicMagTotal:  round2(basicMagTotal),
    ghostPhysTotal: round2(ghostPhysTotal),
    ghostMagTotal:  round2(ghostMagTotal),
    skillPhysTotal: round2(skillPhysTotal),
    skillMagTotal:  round2(skillMagTotal),
  };
}

function replicateCalcSkor(sim, fs, dmg, si) {
  const basicTotalDmg = round2(dmg.basicPhysTotal + dmg.basicMagTotal);
  const skillTotalDmg = round2(dmg.skillPhysTotal + dmg.skillMagTotal);
  const ghostDmgTotal = round2(dmg.ghostPhysTotal + dmg.ghostMagTotal);

  const phantom    = sim.hero.exorcist_phantom;
  const isTemplate = phantom && (sim.hero.label ?? sim.hero.name) === phantom.dari_hero;
  const phantomDmg = isTemplate ? round2(phantom.phantom_phys_dmg + phantom.phantom_mag_dmg) : 0;
  const phantomHp  = isTemplate ? round2(phantom.phantom_hp) : 0;

  const totalPen  = round2((fs.Physical_Penetration || 0) + (fs.Magic_Penetration || 0));
  const dragonDmg = fs.Dragon_DMG || 0;
  const summonDmg = round2(sim.summon?.totalDmg || 0);

  const damageTotal = round2(
    basicTotalDmg + skillTotalDmg + ghostDmgTotal +
    phantomDmg + dragonDmg + totalPen + summonDmg
  );

  const baseLifesteal = fs.Lifesteal || 0;
  const lsHealBase    = round2(baseLifesteal * basicTotalDmg);
  const buffLsEvents  = sim.timeline.filter(e => ['basic', 'double'].includes(e.type) && e.buffActive);
  const buffLsDmg     = round2(buffLsEvents.reduce((s, e) => s + e.dmg, 0));
  const lsHealBuff    = round2((sim.buffLifesteal || 0) * buffLsDmg);
  const lsHealTotal   = round2(lsHealBase + lsHealBuff);

  const svHealTotal = round2((fs.Spell_Vamp || 0) * skillTotalDmg);

  const shieldVal        = round2((fs.Shield_Percent_HP || 0) * fs.HP);
  const rawHeal          = fs.Heal_Percent_HP || 0;
  const emberFlat        = Math.floor(rawHeal);
  const heartbondPersen  = rawHeal - emberFlat;
  const passiveHeal      = round2((heartbondPersen * fs.HP) + emberFlat);
  const rawPassiveShield = sim.baseData.passive_shield_flat || 0;
  const passiveShieldFlat = resolveVal(rawPassiveShield, si);

  const sustainTotal = round2(
    lsHealTotal + svHealTotal + passiveHeal +
    shieldVal + passiveShieldFlat +
    (sim.skill.totalHealNow   || 0) +
    (sim.skill.totalShieldNow || 0) +
    fs.HP + phantomHp
  );

  return { damageTotal, sustainTotal };
}

// ── API UTAMA ──────────────────────────────────────────────────────
// Ubah hasil simulateBattle(hero, baseData) jadi { damageTotal, sustainTotal }.
// Inilah satu-satunya tempat "perhitungan manual" terjadi — comboengine.js cukup panggil ini, tidak menyalin rumusnya lagi.
export function computeScoreTotals(sim) {
  const dmg = calcDmgSplit(sim);
  const si  = (sim.hero.stars || 1) - 1;
  return replicateCalcSkor(sim, sim.finalStats, dmg, si);
}

// Pilih angka sesuai scoreMode dari totals yang sudah dihitung.
export function getScoreValue(totals, scoreMode) {
  if (scoreMode === 'damage')  return totals.damageTotal;
  if (scoreMode === 'sustain') return totals.sustainTotal;
  return totals.damageTotal + totals.sustainTotal;
}
