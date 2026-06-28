// ════════════════════════════════════════════════════════════════
// score_utils.js
// Satu-satunya tempat logika "ubah hasil simulateBattle() jadi
// damageTotal & sustainTotal". Sebelumnya logika ini (calcDmgSplit +
// replicateCalcSkor) ke-copy-paste persis di comboengine.js DAN
// pregenerate_cache.js — kalau salah satu diubah, yang lain ikut beda
// dan cache jadi tidak akurat. Sekarang cukup ubah di sini saja.
//
// Export:
//   resolveVal(v, si)              → nilai dari array atau scalar
//   shouldSkipCache(hero)          → true kalau hero ini tidak aman di-cache
//   computeScoreTotals(sim)        → { damageTotal, sustainTotal }
//   getScoreValue(totals, mode)    → number sesuai scoreMode
//   calcDmgSplit(sim)              → { basicPhysTotal, basicMagTotal, ... }
//   calcSkorLengkap(sim)           → semua field lengkap untuk render UI
// ════════════════════════════════════════════════════════════════
import { round2 } from './simulate_battle.js';

export function resolveVal(v, si) {
  return Array.isArray(v) ? v[Math.min(si, v.length - 1)] : v;
}

export function shouldSkipCache(hero) {
  return (
    hero.scheduled_events?.some(ev =>
      typeof ev.onTrigger === 'function' && !ev._deterministic
    ) ||
    (hero.buffs?.Double_ATK_Chance ?? 0) > 0
  );
}

// ════════════════════════════════════════════════════════════════
// calcDmgSplit — sekarang di-export karena dipakai DUA tempat:
//   1. computeScoreTotals()  → untuk ranking kombinasi & cache
//      (cuma butuh angka total, tanpa rincian per-hit)
//   2. calcSkorLengkap()     → untuk render modal detail hero
//      (butuh rincian phys/mag per tipe event)
//
// Sebelum refactor ini, bagian yang sama dihitung dua kali secara
// terpisah — sekali di replicateCalcSkor via computeScoreTotals,
// dan sekali lagi dari nol di dalam calcSkorLengkap. Sekarang
// cukup ubah di sini, kedua pengguna otomatis dapat nilai yang sama.
// ════════════════════════════════════════════════════════════════
export function calcDmgSplit(sim) {
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

// ════════════════════════════════════════════════════════════════
// splitHealPercent — helper baru untuk memecah field Heal_Percent_HP
// yang encoding-nya tidak intuitif:
//
//   rawHeal = emberFlat + heartbondPersen
//
//   - emberFlat      : bagian INTEGER dari rawHeal.
//                      Fraksi EMBERLORD menaruh nilai heal flat (angka
//                      absolut HP, bukan persen) di sini supaya bisa
//                      digabung dalam satu field dengan heartbond.
//
//   - heartbondPersen: bagian DESIMAL dari rawHeal (0–0.999...).
//                      Fraksi HEARTBOND menaruh persentase HP di sini,
//                      jadi heal-nya = heartbondPersen × fs.HP.
//
//   passiveHeal = (heartbondPersen × hp) + emberFlat
//
// Logika ini identik di replicateCalcSkor dan calcSkorLengkap —
// sebelum refactor ini, keduanya copy-paste trik Math.floor yang
// sama tanpa komentar. Sekarang cukup ubah fungsi ini saja.
// ════════════════════════════════════════════════════════════════
function splitHealPercent(rawHeal, hp) {
  const emberFlat       = Math.floor(rawHeal);
  const heartbondPersen = rawHeal - emberFlat;
  const passiveHeal     = round2((heartbondPersen * hp) + emberFlat);
  return { emberFlat, heartbondPersen, passiveHeal };
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

  const shieldVal          = round2((fs.Shield_Percent_HP || 0) * fs.HP);
  const { passiveHeal }    = splitHealPercent(fs.Heal_Percent_HP || 0, fs.HP);
  const rawPassiveShield   = sim.baseData.passive_shield_flat || 0;
  const passiveShieldFlat  = resolveVal(rawPassiveShield, si);

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

// ── calcSkorLengkap — semua data yang dibutuhkan panel-panel UI ────
// Menggabungkan calcDmgSplit + calcSkor dari render_simulation.js
// menjadi satu fungsi di sini. render_simulation.js cukup panggil ini,
// tidak perlu punya kalkulasi sendiri lagi.
//
// PERUBAHAN (refactor duplikasi):
// Sebelumnya bagian "DMG SPLIT" di fungsi ini menghitung ulang
// basicPhysTotal / basicMagTotal / dst dari sim.timeline dari nol —
// kode-nya identik karakter-per-karakter dengan calcDmgSplit().
// Sekarang diganti dengan memanggil calcDmgSplit() langsung, sehingga
// ada satu sumber kebenaran. Hasil numeriknya identik karena sumber
// datanya (sim.timeline) dan langkah perhitungannya sama persis.
export function calcSkorLengkap(sim) {
  const fs = sim.finalStats;
  const si = (sim.hero.stars || 1) - 1;
  // DEBUG SEMENTARA — hapus setelah ketemu masalahnya
  console.log(`[calcSkorLengkap] ${sim.hero.label ?? sim.hero.name}`, {
    Heal_Percent_HP: fs.Heal_Percent_HP,
    HP: fs.HP,
  });
  // ── DMG SPLIT (phys/mag per tipe event) ──
  // Sebelumnya dihitung ulang dari nol di sini. Sekarang cukup panggil
  // calcDmgSplit() yang sudah diekspor — nilai identik, tidak ada duplikasi.
  const {
    basicPhysTotal, basicMagTotal,
    ghostPhysTotal, ghostMagTotal,
    skillPhysTotal, skillMagTotal,
  } = calcDmgSplit(sim);

  // ── TOTALS PER KATEGORI ──
  const basicTotalDmg = round2(basicPhysTotal + basicMagTotal);
  const skillTotalDmg = round2(skillPhysTotal + skillMagTotal);
  const ghostDmgTotal = round2(ghostPhysTotal + ghostMagTotal);

  // ── LIFESTEAL ──
  const baseLifesteal = fs.Lifesteal || 0;
  const lsHealBase    = round2(baseLifesteal * basicTotalDmg);
  const buffLsEvents  = sim.timeline.filter(e => ['basic', 'double'].includes(e.type) && e.buffActive);
  const buffLsDmg     = round2(buffLsEvents.reduce((s, e) => s + e.dmg, 0));
  const buffBasicHits = buffLsEvents.length;
  const lsHealBuff    = round2((sim.buffLifesteal || 0) * buffLsDmg);
  const lsHealTotal   = round2(lsHealBase + lsHealBuff);

  // ── SPELL VAMP ──
  const svHealTotal = round2((fs.Spell_Vamp || 0) * skillTotalDmg);

  // ── MANA ──
  const manaTotal = round2(
    fs.Mana_Regen_Per_Detik * sim.duration
    + sim.basicAtk.hits * sim.skill.manaPerBasic
    + sim.skill.casts  * sim.skill.manaPerSkill
  );

  // ── SHIELD & HEAL ──
  const shieldVal = round2((fs.Shield_Percent_HP || 0) * fs.HP);

  // Gunakan splitHealPercent() — sebelumnya trik Math.floor/desimal
  // ini di-copy-paste langsung di sini dan di replicateCalcSkor.
  const { emberFlat, heartbondPersen, passiveHeal } =
    splitHealPercent(fs.Heal_Percent_HP || 0, fs.HP);

  const rawPassiveShield  = sim.baseData.passive_shield_flat || 0;
  const passiveShieldFlat = resolveVal(rawPassiveShield, si);

  // ── PHANTOM (Exorcist) ──
  const phantom     = sim.hero.exorcist_phantom;
  const isTemplate  = phantom && (sim.hero.label ?? sim.hero.name) === phantom.dari_hero;
  const phantomSkor = isTemplate
    ? round2(phantom.phantom_hp + phantom.phantom_phys_dmg + phantom.phantom_mag_dmg)
    : 0;
  const phantomDmg  = isTemplate ? round2(phantom.phantom_phys_dmg + phantom.phantom_mag_dmg) : 0;
  const phantomHp   = isTemplate ? round2(phantom.phantom_hp) : 0;

  // ── DEF / PEN ──
  const totalDef = round2((fs.Physical_Def || 0) + (fs.Magic_Def || 0));
  const totalPen = round2((fs.Physical_Penetration || 0) + (fs.Magic_Penetration || 0));

  // ── SUMMON ──
  const summonDmg = round2(sim.summon?.totalDmg || 0);

  // ── DAMAGE BREAKDOWN (data-driven, tidak hardcode kondisi fraksi) ──
  const damageBreakdown = [
    { label: 'Basic ATK (Phys+Mag)', value: basicTotalDmg },
    { label: 'Skill DMG (Phys+Mag)', value: skillTotalDmg },
    { label: 'Ghost Phase',          value: ghostDmgTotal },
    { label: 'Phantom (Exorcist)',   value: phantomDmg },
    { label: 'Dragon DMG Flat',      value: fs.Dragon_DMG || 0 },
    { label: 'Total PEN',            value: totalPen },
    { label: 'Summon DMG',           value: summonDmg },
  ];
  const damageTotal = round2(damageBreakdown.reduce((s, r) => s + r.value, 0));

  // ── SUSTAIN BREAKDOWN (data-driven) ──
  const sustainBreakdown = [
    { label: 'Lifesteal Heal',      value: lsHealTotal },
    { label: 'Spell Vamp Heal',     value: svHealTotal },
    { label: 'Passive Heal',        value: passiveHeal },
    { label: 'Shield (buff+pasif)', value: round2(shieldVal + passiveShieldFlat) },
    { label: 'Skill Heal',          value: sim.skill.totalHealNow   || 0 },
    { label: 'Skill Shield',        value: sim.skill.totalShieldNow || 0 },
    { label: 'HP',                  value: fs.HP },
    { label: 'Phantom HP',          value: phantomHp },
  ];
  const sustainTotal = round2(sustainBreakdown.reduce((s, r) => s + r.value, 0));

  return {
    // dmg splits — dibutuhkan buildDmgSplitPanel
    basicPhysTotal, basicMagTotal,
    ghostPhysTotal, ghostMagTotal,
    skillPhysTotal, skillMagTotal,
    // totals per kategori
    basicTotalDmg, skillTotalDmg, ghostDmgTotal,
    // lifesteal detail — dibutuhkan buildUtilPanel
    baseLifesteal, lsHealBase, buffLsDmg, buffBasicHits, lsHealBuff, lsHealTotal,
    // sustain detail
    svHealTotal, manaTotal,
    shieldVal, passiveHeal, passiveShieldFlat,
    // phantom
    phantom, isTemplate, phantomSkor, phantomDmg, phantomHp,
    // def/pen
    totalDef, totalPen,
    // summon
    summonDmg,
    // breakdown arrays — dibutuhkan buildTotalsPanel (bar chart)
    damageBreakdown, damageTotal,
    sustainBreakdown, sustainTotal,
  };
}