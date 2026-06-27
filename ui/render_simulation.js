// ════════════════════════════════════════════════════════════════
// render_simulation.js  (REFACTOR — UI Lengkap & Game-like)
// Render output simulateBattle() menjadi HTML siap tampil di modal.
//
// Export:
//   renderSimulationHTML(sim) → return HTML string
//
// Struktur file:
//   [1] IMPORTS
//   [2] HELPERS          — diffStat, splitParts, fmtBreakdown, resolveVal, fmt, pct
//   [3] KALKULASI DMG    — split phys/mag per tipe event
//   [4] KALKULASI SKOR   — lifesteal, spellvamp, mana, shield, heal, skor total
//   [5] PANEL: HERO CARD — header hero (nama, bintang, fraksi, role, gold)
//   [6] PANEL: STAT GRID — stat base vs final (dengan diff buff)
//   [7] PANEL: FORMULA   — BASIC_ATK & DMG_skill breakdown formula
//   [8] PANEL: BUFF SKILL— skill_handler config detail
//   [9] PANEL: DMG SPLIT — ringkasan phys/mag per tipe serangan
//   [10] PANEL: UTIL     — lifesteal, spellvamp, heal, shield, mana, DEF/PEN
//   [11] PANEL: SKOR BAR — skor total + kontribusi per komponen (bar chart)
//   [12] PANEL: BUFF SRC — tabel sumber buff aktif (sinergi, scope, stat)
//   [13] TIMELINE HEADER — header kolom tabel timeline
//   [14] TIMELINE ROWS   — baris per event (merge double, warna, detail)
//   [15] RENDER UTAMA    — renderSimulationHTML (rangkai semua panel → HTML final)
// ════════════════════════════════════════════════════════════════


// ── [1] IMPORTS ──────────────────────────────────────────────────

import { round2, splitEventsDmg } from '../engine/simulate_battle.js';


// ── [2] HELPERS ──────────────────────────────────────────────────

const fmt  = n => Math.round(n).toLocaleString('id-ID');
const pct  = n => `${round2(n * 100)}%`;
const pct1 = n => `${(n * 100).toFixed(1)}%`;

/** Tampilkan "base → final (+diff buff)" kalau ada perubahan dari buff. */
function diffStat(base, final, isPercent = false) {
  if (base === undefined || base === null) return `<b style="color:#fff;">${isPercent ? pct(final) : fmt(final)}</b>`;
  const diff = round2(final - base);
  if (Math.abs(diff) < 0.001) return `<b style="color:#fff;">${isPercent ? pct(final) : fmt(final)}</b>`;
  const sign = diff > 0 ? '+' : '';
  const diffColor = diff > 0 ? '#2ecc71' : '#e74c3c';
  return isPercent
    ? `<span style="color:#aaa;">${round2(base*100)}%</span> → <b style="color:#fff;">${round2(final*100)}%</b> <span style="color:${diffColor}; font-size:0.72rem;">(${sign}${round2(diff*100)}% buff)</span>`
    : `<span style="color:#aaa;">${fmt(base)}</span> → <b style="color:#fff;">${fmt(final)}</b> <span style="color:${diffColor}; font-size:0.72rem;">(${sign}${fmt(diff)} buff)</span>`;
}

/** Split satu breakdown event menjadi { phys, mag }. */
function splitParts(b) {
  if (!b || b.raw === 0) return { phys: 0, mag: 0 };
  const ratio = b.raw !== 0 ? b.final / b.raw : 0;
  let phys = 0, mag = 0;
  b.parts.forEach(p => {
    const v = p.value * ratio;
    if      (p.ref.startsWith('Physical')) phys += v;
    else if (p.ref.startsWith('Magic'))    mag  += v;
  });
  return { phys: round2(phys), mag: round2(mag) };
}

/** Format satu breakdown menjadi string teks. */
function fmtBreakdown(b) {
  if (!b || !b.parts) return '—';
  const partsStr = b.parts
    .map(p => `<span style="color:#aaa;">${p.ref}</span> <span style="color:#666;">(${fmt(p.statValue)}×${p.multiplier})</span>`)
    .join(' <span style="color:#555;">+</span> ');
  let line = `${partsStr} <span style="color:#555;">=</span> <b style="color:#d4af37;">${fmt(b.raw)}</b>`;
  if (b.dmgBonusMultiplier && b.dmgBonusMultiplier !== 1)
    line += ` <span style="color:#555;">×</span><span style="color:#f39c12;">${b.dmgBonusMultiplier}</span>`;
  if (b.raw !== b.final)
    line += ` <span style="color:#555;">=</span> <b style="color:#27ae60;">${fmt(b.final)}</b>`;
  return line;
}

function resolveVal(v, si) {
  return Array.isArray(v) ? v[Math.min(si, v.length - 1)] : v;
}

/** Mini progress bar HTML */
function miniBar(value, max, color = '#27ae60', label = '') {
  const w = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return `
    <div style="display:flex; align-items:center; gap:8px;">
      <div style="flex:1; height:6px; background:#1a1f29; border-radius:3px; overflow:hidden;">
        <div style="width:${w.toFixed(1)}%; height:100%; background:${color}; border-radius:3px; transition:width 0.3s;"></div>
      </div>
      ${label ? `<span style="font-size:0.7rem; color:#666; white-space:nowrap; min-width:60px; text-align:right;">${label}</span>` : ''}
    </div>`;
}


// ── [3] KALKULASI DMG (split phys/mag per tipe event) ────────────

function calcDmgSplit(sim) {
  let basicPhysTotal = 0, basicMagTotal = 0;
  let ghostPhysTotal = 0, ghostMagTotal = 0;
  let skillPhysTotal = 0, skillMagTotal = 0;

  sim.timeline
    .filter(e => ['basic', 'double', 'ghost'].includes(e.type))
    .forEach(e => {
      if (!e.breakdown) return;
      const s = splitParts(e.breakdown);
      const rawTotal = s.phys + s.mag;
      if (rawTotal === 0) return;
      if (e.type === 'ghost') {
        ghostPhysTotal += e.dmg * (s.phys / rawTotal);
        ghostMagTotal  += e.dmg * (s.mag  / rawTotal);
      } else {
        basicPhysTotal += e.dmg * (s.phys / rawTotal);
        basicMagTotal  += e.dmg * (s.mag  / rawTotal);
      }
    });

  sim.timeline
    .filter(e => e.type === 'skill')
    .forEach(e => {
      if (!e.breakdown) return;
      const s = splitParts(e.breakdown);
      const rawTotal = s.phys + s.mag;
      if (rawTotal === 0) return;
      skillPhysTotal += e.dmg * (s.phys / rawTotal);
      skillMagTotal  += e.dmg * (s.mag  / rawTotal);
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


// ── [4] KALKULASI SKOR ────────────────────────────────────────────

function calcSkor(sim, fs, dmg, si) {
  const { basicPhysTotal, basicMagTotal, ghostPhysTotal, ghostMagTotal,
          skillPhysTotal, skillMagTotal } = dmg;

  const basicTotalDmg = round2(basicPhysTotal + basicMagTotal);
  const skillTotalDmg = round2(skillPhysTotal + skillMagTotal);
  const ghostDmgTotal = round2(ghostPhysTotal + ghostMagTotal);

  // Lifesteal
  const baseLifesteal  = fs.Lifesteal || 0;
  const lsHealBase     = round2(baseLifesteal * basicTotalDmg);
  const buffLsEvents   = sim.timeline.filter(e => ['basic','double'].includes(e.type) && e.buffActive);
  const buffLsDmg      = round2(buffLsEvents.reduce((s, e) => s + e.dmg, 0));
  const buffBasicHits  = buffLsEvents.length;
  const lsHealBuff     = round2((sim.buffLifesteal || 0) * buffLsDmg);
  const lsHealTotal    = round2(lsHealBase + lsHealBuff);

  // Spell Vamp
  const svHealTotal = round2((fs.Spell_Vamp || 0) * skillTotalDmg);

  // Mana
  const manaTotal = round2(
    fs.Mana_Regen_Per_Detik * sim.duration
    + sim.basicAtk.hits * sim.skill.manaPerBasic
    + sim.skill.casts  * sim.skill.manaPerSkill
  );

  // Shield & Heal
  const shieldVal = round2((fs.Shield_Percent_HP || 0) * fs.HP);
  const rawHeal   = fs.Heal_Percent_HP || 0;

  // Trik pemisahan Emberlord (flat) vs Heartbond (persen)
  const emberFlat       = Math.floor(rawHeal);
  const heartbondPersen = rawHeal - emberFlat;
  const passiveHeal     = round2((heartbondPersen * fs.HP) + emberFlat);

  // Passive shield flat
  const rawPassiveShield = sim.baseData.passive_shield_flat || 0;
  const passiveShieldFlat = resolveVal(rawPassiveShield, si);

  // Phantom (Exorcist)
  const phantom     = sim.hero.exorcist_phantom;
  const isTemplate  = phantom && (sim.hero.label ?? sim.hero.name) === phantom.dari_hero;
  const phantomSkor = isTemplate
    ? round2(phantom.phantom_hp + phantom.phantom_phys_dmg + phantom.phantom_mag_dmg)
    : 0;

  // DEF / PEN
  const totalDef = round2((fs.Physical_Def || 0) + (fs.Magic_Def || 0));
  const totalPen = round2((fs.Physical_Penetration || 0) + (fs.Magic_Penetration || 0));

  // Phantom (Exorcist) — split jadi porsi damage vs porsi HP
  const phantomDmg = isTemplate ? round2(phantom.phantom_phys_dmg + phantom.phantom_mag_dmg) : 0;
  const phantomHp  = isTemplate ? round2(phantom.phantom_hp) : 0;

  // Summon dmg (Neobeasts, dll) — sebelumnya cuma tampil di chart, gak ke total manapun
  const summonDmg = round2(sim.summon?.totalDmg || 0);

  // ── DAMAGE TOTAL ────────────────────────────────────────────
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

  // ── SUSTAIN TOTAL ───────────────────────────────────────────
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
    basicTotalDmg, skillTotalDmg, ghostDmgTotal,
    baseLifesteal, lsHealBase, buffLsDmg, buffBasicHits, lsHealBuff, lsHealTotal,
    svHealTotal, manaTotal,
    shieldVal, passiveHeal, passiveShieldFlat,
    phantom, isTemplate, phantomSkor, phantomDmg, phantomHp,
    totalDef, totalPen, summonDmg,
    damageBreakdown, damageTotal,
    sustainBreakdown, sustainTotal,
  };
}


// ── [5] PANEL: HERO CARD ─────────────────────────────────────────

function buildHeroCard(sim) {
  const { hero, baseData: bd } = sim;
  const stars    = '★'.repeat(hero.stars || 1) + '☆'.repeat(3 - (hero.stars || 1));
  const fraksi   = bd.fraksi   ?? hero.fraksi ?? '—';
  const role     = bd.role     ?? hero.role   ?? '—';
  const gold     = bd.gold     ?? '—';

  const FRAKSI_COLOR = {
    'Astro Power':     '#6366f1',
    'Dragoncaller':    '#e67e22',
    'Emberlord':       '#b7410e',
    'Enchanted Tales': '#9b59b6',
    'Exorcist':        '#4a90d9',
    'Heartbond':       '#e91e8c',
    'Neobeasts':       '#2ecc71',
  };
  const accentColor = FRAKSI_COLOR[fraksi] || '#d4af37';

  return `
    <div style="
      padding: 14px 16px;
      background: linear-gradient(135deg, #12151e, #0f1218);
      border: 1px solid ${accentColor}44;
      border-left: 4px solid ${accentColor};
      border-radius: 8px;
      margin-bottom: 12px;
    ">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
        <div>
          <div style="color:${accentColor}; font-size:1.1rem; font-weight:bold; letter-spacing:1px;">
            ${hero.label ?? hero.name}
          </div>
          <div style="color:#d4af37; font-size:1rem; margin-top:2px; letter-spacing:2px;">${stars}</div>
        </div>
        <div style="text-align:right;">
          <div style="
            display:inline-block; padding:3px 10px;
            background:${accentColor}22; border:1px solid ${accentColor}66;
            border-radius:4px; color:${accentColor}; font-size:0.78rem; font-weight:bold;
          ">${fraksi}</div>
          <div style="margin-top:4px; font-size:0.75rem; color:#888;">
            🎯 ${role} &nbsp;|&nbsp; 💰 ${gold} gold
          </div>
        </div>
      </div>
    </div>`;
}


// ── [6] PANEL: STAT GRID ─────────────────────────────────────────

function buildStatGrid(sim, fs, bs) {
  const si = (sim.hero.stars || 1) - 1;
  const jangLabel = bs.Jangkauan_ATK <= 1 ? '🗡 Jarak Dekat' : '🏹 Jarak Jauh';

  const statRows = [
    { icon: '❤️', label: 'HP',            base: bs.HP,                   final: fs.HP },
    { icon: '⚔',  label: 'Physical ATK',  base: bs.Physical_ATK,         final: fs.Physical_ATK },
    { icon: '✨',  label: 'Magic ATK',     base: bs.Magic_ATK,            final: fs.Magic_ATK },
    { icon: '🛡',  label: 'Physical DEF',  base: bs.Physical_Def,         final: fs.Physical_Def },
    { icon: '🛡',  label: 'Magic DEF',     base: bs.Magic_Def,            final: fs.Magic_Def },
    { icon: '⚡',  label: 'ATK Speed',     base: bs.ATK_Speed,            final: fs.ATK_Speed,    isDecimal: true,
      extra: sim.buffAtkSpeed > 0 ? `<span style="color:#5dade2; font-size:0.7rem;">(+${pct(sim.buffAtkSpeed)} saat buff aktif)</span>` : '' },
    { icon: '🩸',  label: 'Lifesteal',     base: bs.Lifesteal,            final: fs.Lifesteal,    isPct: true },
    { icon: '💫',  label: 'Spell Vamp',    base: bs.Spell_Vamp,           final: fs.Spell_Vamp,   isPct: true },
    { icon: '🔪',  label: 'Phys PEN',      base: bs.Physical_Penetration, final: fs.Physical_Penetration },
    { icon: '🔪',  label: 'Mag PEN',       base: bs.Magic_Penetration,    final: fs.Magic_Penetration },
    { icon: '💧',  label: 'Mana Regen/s',  base: bs.Mana_Regen_Per_Detik, final: fs.Mana_Regen_Per_Detik, isDecimal: true },
    { icon: '💧',  label: 'Batas Mana',    base: bs.Batas_Mana,           final: fs.Batas_Mana },
  ];

  const rows = statRows.map(s => {
    const hasBuff = s.base !== undefined && Math.abs(round2(s.final - s.base)) > 0.001;
    const diffColor = hasBuff ? '#2ecc71' : '';
    const diffVal = hasBuff
      ? (s.isPct
        ? ` <span style="color:#2ecc71; font-size:0.7rem;">(+${round2((s.final - s.base) * 100)}%)</span>`
        : ` <span style="color:#2ecc71; font-size:0.7rem;">(+${fmt(round2(s.final - s.base))})</span>`)
      : '';

    const baseStr = s.base !== undefined
      ? `<span style="color:#666; font-size:0.75rem;">${s.isPct ? pct(s.base) : (s.isDecimal ? s.base : fmt(s.base))}</span> → `
      : '';
    const finalStr = `<b style="color:${hasBuff ? '#2ecc71' : '#ddd'};">${s.isPct ? pct(s.final) : (s.isDecimal ? s.final : fmt(s.final))}</b>`;

    return `
      <div style="
        padding: 6px 10px;
        background: ${hasBuff ? 'rgba(46,204,113,0.04)' : 'transparent'};
        border-bottom: 1px solid #1a1f2a;
        display: flex; align-items: center; justify-content: space-between;
      ">
        <div style="color:#888; font-size:0.78rem;">${s.icon} ${s.label}</div>
        <div style="font-size:0.8rem; text-align:right;">
          ${baseStr}${finalStr}${diffVal}
          ${s.extra ?? ''}
        </div>
      </div>`;
  }).join('');

  // Tambahan: Dragon DMG kalau ada
  const dragonRow = (fs.Dragon_DMG || 0) > 0 ? `
    <div style="padding:6px 10px; background:rgba(230,126,34,0.06); border-bottom:1px solid #1a1f2a;
      display:flex; align-items:center; justify-content:space-between;">
      <div style="color:#e67e22; font-size:0.78rem;">🐉 Dragon DMG Flat</div>
      <b style="color:#e67e22;">${fmt(fs.Dragon_DMG)}</b>
    </div>` : '';

  // Passive mana awal
  const manaAwalRow = `
    <div style="padding:6px 10px; border-bottom:1px solid #1a1f2a;
      display:flex; align-items:center; justify-content:space-between;">
      <div style="color:#888; font-size:0.78rem;">💧 Batas Mana AWAL (cast pertama)</div>
      <b style="color:#ddd;">${fmt(bs.Batas_Mana_Awal)}</b>
    </div>`;

  const jangRow = `
    <div style="padding:6px 10px;
      display:flex; align-items:center; justify-content:space-between;">
      <div style="color:#888; font-size:0.78rem;">🏹 Jangkauan ATK</div>
      <span style="color:#ddd; font-size:0.8rem;">${bs.Jangkauan_ATK} <span style="color:#666; font-size:0.72rem;">(${jangLabel})</span></span>
    </div>`;

  return `
    <div style="margin-bottom:12px; border:1px solid #1a2030; border-radius:8px; overflow:hidden;">
      <div style="
        padding:8px 12px; background:#0c0f16;
        color:#d4af37; font-size:0.82rem; font-weight:bold; letter-spacing:1px;
        border-bottom:1px solid #1a2030;
      ">📊 STAT HERO (Base → Final + Buff)</div>
      ${rows}
      ${manaAwalRow}
      ${dragonRow}
      ${jangRow}
    </div>`;
}


// ── [7] PANEL: FORMULA BASIC & SKILL ─────────────────────────────

function buildFormulaPanel(sim, fs, bs) {
  const { baseData: bd } = sim;
  const si = (sim.hero.stars || 1) - 1;

  function formulaRows(formulaList, label, color) {
    if (!formulaList || formulaList.length === 0)
      return `<div style="color:#555; font-size:0.75rem; padding:6px 12px;">— tidak ada formula</div>`;

    return formulaList.map(f => {
      const statVal     = fs[f.ref] ?? 0;
      const baseStatVal = bs[f.ref] ?? statVal;
      const mult        = Array.isArray(f.multiplier) ? f.multiplier[si] : f.multiplier;
      const hasBuff     = Math.abs(round2(statVal - baseStatVal)) > 0.001;
      const result      = round2(statVal * mult);

      return `
        <div style="
          padding: 6px 12px;
          background: ${hasBuff ? 'rgba(93,173,226,0.04)' : 'transparent'};
          border-bottom: 1px solid #131820;
          display: grid;
          grid-template-columns: 1.5fr 0.6fr 1fr 0.8fr;
          gap: 4px;
          align-items: center;
          font-size: 0.78rem;
        ">
          <span style="color:#aaa;">${f.ref}</span>
          <span style="color:#666;">×${mult}</span>
          <span>${diffStat(hasBuff ? baseStatVal : undefined, statVal)}</span>
          <span style="color:${color}; font-weight:bold; text-align:right;">= ${fmt(result)}</span>
        </div>`;
    }).join('');
  }

  // Hitung dmg total formula
  const basicParts = bd.BASIC_ATK?.formula || [];
  const skillParts = bd.DMG_skill?.formula || [];
  const basicTotal = round2(basicParts.reduce((s, f) => {
    const v = fs[f.ref] ?? 0;
    const m = Array.isArray(f.multiplier) ? f.multiplier[si] : f.multiplier;
    return s + v * m;
  }, 0));
  const skillTotal = round2(skillParts.reduce((s, f) => {
    const v = fs[f.ref] ?? 0;
    const m = Array.isArray(f.multiplier) ? f.multiplier[si] : f.multiplier;
    return s + v * m;
  }, 0));

  const basicBonusMult = sim.basicAtk.breakdown?.dmgBonusMultiplier || 1;
  const skillBonusMult = sim.skill.breakdown?.dmgBonusMultiplier || 1;

  return `
    <div style="margin-bottom:12px; border:1px solid #1a2030; border-radius:8px; overflow:hidden;">
      <div style="padding:8px 12px; background:#0c0f16; color:#d4af37; font-size:0.82rem; font-weight:bold; letter-spacing:1px; border-bottom:1px solid #1a2030;">
        🧮 FORMULA DAMAGE
      </div>

      <!-- BASIC ATK -->
      <div style="padding:8px 12px 4px; color:#5dade2; font-size:0.78rem; font-weight:bold; background:#070a10; border-bottom:1px solid #131820;">
        ⚔ BASIC_ATK
        <span style="color:#888; font-weight:normal; margin-left:8px; font-size:0.72rem;">raw: ${fmt(basicTotal)} × ${basicBonusMult} = <b style="color:#27ae60;">${fmt(round2(basicTotal * basicBonusMult))}</b> per hit</span>
      </div>
      <div style="padding:4px 0 2px; background:#070a10; border-bottom:1px solid #1a2030;">
        <div style="padding:4px 12px 2px; display:grid; grid-template-columns:1.5fr 0.6fr 1fr 0.8fr; gap:4px; font-size:0.7rem; color:#555; border-bottom:1px solid #131820;">
          <span>Stat</span><span>Multiplier</span><span>Nilai (Base → Final)</span><span style="text-align:right;">Hasil</span>
        </div>
        ${formulaRows(basicParts, 'BASIC_ATK', '#5dade2')}
      </div>

      <!-- SKILL DMG -->
      <div style="padding:8px 12px 4px; color:#d4af37; font-size:0.78rem; font-weight:bold; background:#070a10; border-bottom:1px solid #131820;">
        ✦ DMG_SKILL
        <span style="color:#888; font-weight:normal; margin-left:8px; font-size:0.72rem;">raw: ${fmt(skillTotal)} × ${skillBonusMult} = <b style="color:#27ae60;">${fmt(round2(skillTotal * skillBonusMult))}</b> per cast</span>
      </div>
      <div style="padding:4px 0 2px; background:#070a10;">
        <div style="padding:4px 12px 2px; display:grid; grid-template-columns:1.5fr 0.6fr 1fr 0.8fr; gap:4px; font-size:0.7rem; color:#555; border-bottom:1px solid #131820;">
          <span>Stat</span><span>Multiplier</span><span>Nilai (Base → Final)</span><span style="text-align:right;">Hasil</span>
        </div>
        ${formulaRows(skillParts, 'DMG_SKILL', '#d4af37')}
      </div>
    </div>`;
}


// ── [8] PANEL: BUFF SKILL (skill_handler config) ──────────────────

function buildBuffSkillPanel(bd, si) {
  const skillCfg = bd.DMG_skill?.skill_handler;
  if (!skillCfg) return '';
  const rv = v => resolveVal(v, si);
  const type = skillCfg.type || 'buff';

  const TYPE_LABEL = {
    buff: '🔵 Buff Stat Sementara',
    multihit: '🟡 Multi-Hit',
    stack: '🟠 Stack',
    cooldown: '⏰ Cooldown-based',
    sequence: '⏩ Sequence / Delayed',
    delayed_multihit: '🕐 Delayed Multi-Hit',
  };

  const typeColor = {
    buff: '#5dade2', multihit: '#f39c12', stack: '#e67e22',
    cooldown: '#9b59b6', sequence: '#2ecc71', delayed_multihit: '#e74c3c',
  }[type] || '#888';

  const buffsRows = Object.entries(skillCfg.buffs || {}).map(([k, v]) => `
    <div style="display:flex; justify-content:space-between; padding:4px 10px; border-bottom:1px solid #131820;">
      <span style="color:#aaa;">${k}</span>
      <span style="color:${typeColor}; font-weight:bold;">+${round2(rv(v) * 100)}%</span>
    </div>`).join('');

  const stackRows = Object.entries(skillCfg.buff_per_stack || {}).map(([k, v]) => `
    <div style="display:flex; justify-content:space-between; padding:4px 10px; border-bottom:1px solid #131820;">
      <span style="color:#aaa;">${k}</span>
      <span style="color:#e67e22; font-weight:bold;">+${round2(rv(v) * 100)}% per stack</span>
    </div>`).join('');

  return `
    <div style="margin-bottom:12px; border:1px solid ${typeColor}33; border-radius:8px; overflow:hidden;">
      <div style="padding:8px 12px; background:#0c0f16; border-bottom:1px solid ${typeColor}33;
        display:flex; align-items:center; justify-content:space-between;">
        <span style="color:${typeColor}; font-size:0.82rem; font-weight:bold; letter-spacing:1px;">⚡ BUFF SKILL — ${TYPE_LABEL[type] ?? type}</span>
        <span style="color:#666; font-size:0.72rem;">[type: ${type}]</span>
      </div>

      <div style="background:#070a10; font-size:0.78rem;">
        ${skillCfg.label      ? `<div style="padding:5px 10px; color:#ccc; border-bottom:1px solid #131820;">📝 Label: <b>${skillCfg.label}</b></div>` : ''}
        ${skillCfg.duration   ? `<div style="padding:5px 10px; color:#aaa; border-bottom:1px solid #131820;">⏱ Durasi buff: <b style="color:#5dade2;">${skillCfg.duration}s</b></div>` : ''}
        ${skillCfg.hits > 1   ? `<div style="padding:5px 10px; color:#aaa; border-bottom:1px solid #131820;">🎯 Multi-hit: <b style="color:#f39c12;">${skillCfg.hits}× per cast</b></div>` : ''}
        ${skillCfg.cooldown   ? `<div style="padding:5px 10px; color:#aaa; border-bottom:1px solid #131820;">⏰ Cooldown: <b style="color:#9b59b6;">${skillCfg.cooldown}s</b></div>` : ''}
        ${skillCfg.max_stacks ? `<div style="padding:5px 10px; color:#aaa; border-bottom:1px solid #131820;">📈 Max stacks: <b style="color:#e67e22;">${skillCfg.max_stacks}</b></div>` : ''}
        ${skillCfg.heal_now   ? `<div style="padding:5px 10px; color:#aaa; border-bottom:1px solid #131820;">💚 Heal saat cast: <b style="color:#2ecc71;">+${Math.round(rv(skillCfg.heal_now)*100)}% HP</b></div>` : ''}
        ${skillCfg.heal_flat  ? `<div style="padding:5px 10px; color:#aaa; border-bottom:1px solid #131820;">💚 Heal saat cast: <b style="color:#2ecc71;">+${rv(skillCfg.heal_flat)} flat</b></div>` : ''}
        ${skillCfg.heal_magic_atk ? `<div style="padding:5px 10px; color:#aaa; border-bottom:1px solid #131820;">💚 Heal: <b style="color:#2ecc71;">+${round2(rv(skillCfg.heal_magic_atk)*100)}% Magic ATK</b></div>` : ''}
        ${skillCfg.shield_now ? `<div style="padding:5px 10px; color:#aaa; border-bottom:1px solid #131820;">🛡 Shield saat cast: <b style="color:#f39c12;">+${Math.round(rv(skillCfg.shield_now)*100)}% HP</b></div>` : ''}
        ${skillCfg.shield_flat? `<div style="padding:5px 10px; color:#aaa; border-bottom:1px solid #131820;">🛡 Shield flat: <b style="color:#f39c12;">+${rv(skillCfg.shield_flat)}</b></div>` : ''}
        ${skillCfg.buff_additive ? `<div style="padding:5px 10px; color:#aaa; border-bottom:1px solid #131820;">🔁 Buff mode: <b style="color:#5dade2;">Additive (stack)</b></div>` : ''}
        ${skillCfg.empowered_basic ? `<div style="padding:5px 10px; color:#aaa; border-bottom:1px solid #131820;">⚡ Empowered basic: <b style="color:#d4af37;">×${rv(skillCfg.empowered_basic)}</b></div>` : ''}
        ${buffsRows}
        ${stackRows}
      </div>
    </div>`;
}


// ── [9] PANEL: DMG SPLIT (phys/mag per tipe serangan) ────────────

function buildDmgSplitPanel(sim, dmg, skor) {
  const { basicPhysTotal, basicMagTotal, ghostPhysTotal, ghostMagTotal,
          skillPhysTotal, skillMagTotal } = dmg;
  const { basicTotalDmg, skillTotalDmg, ghostDmgTotal } = skor;

  const totalAllDmg = round2(basicTotalDmg + skillTotalDmg + ghostDmgTotal + (sim.summon?.totalDmg || 0));
  const maxDmg = Math.max(basicTotalDmg, skillTotalDmg, ghostDmgTotal, 1);

  // Breakdown per tipe
  const rows = [];

  rows.push({ label: '⚔ Basic ATK', total: basicTotalDmg, phys: basicPhysTotal, mag: basicMagTotal, color: '#5dade2', count: `${sim.basicAtk.hits} hit${sim.basicAtk.doubleHits > 0 ? ` + ${sim.basicAtk.doubleHits}× double` : ''}` });
  if (skillTotalDmg > 0)
    rows.push({ label: '✦ Skill DMG', total: skillTotalDmg, phys: skillPhysTotal, mag: skillMagTotal, color: '#d4af37', count: `${sim.skill.casts} cast` });
  if (ghostDmgTotal > 0)
    rows.push({ label: '👻 Ghost (mati)', total: ghostDmgTotal, phys: ghostPhysTotal, mag: ghostMagTotal, color: '#b7410e', count: `${sim.basicAtk.ghostHits} hit` });
  if (sim.summon?.totalDmg > 0)
    rows.push({ label: '🐒 Summon', total: sim.summon.totalDmg, phys: sim.summon.totalDmg, mag: 0, color: '#2ecc71', count: `${sim.summon.hits} hit` });

  const dmgRows = rows.map(r => `
    <div style="padding:8px 12px; border-bottom:1px solid #131820;">
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <span style="color:${r.color}; font-weight:bold; font-size:0.82rem;">${r.label}</span>
        <span style="color:${r.color}; font-size:0.82rem; font-weight:bold;">${fmt(r.total)}</span>
      </div>
      ${miniBar(r.total, totalAllDmg, r.color, r.count)}
      <div style="display:flex; gap:12px; margin-top:4px; font-size:0.72rem; color:#666;">
        <span>⚔ Phys: <b style="color:#e74c3c;">${fmt(r.phys)}</b></span>
        <span>✨ Mag: <b style="color:#9b59b6;">${fmt(r.mag)}</b></span>
        <span style="color:#555;">${pct1(r.total / (totalAllDmg || 1))} dari total</span>
      </div>
    </div>`).join('');

  return `
    <div style="margin-bottom:12px; border:1px solid #1a2030; border-radius:8px; overflow:hidden;">
      <div style="padding:8px 12px; background:#0c0f16; color:#d4af37; font-size:0.82rem; font-weight:bold; letter-spacing:1px; border-bottom:1px solid #1a2030;">
        🔥 BREAKDOWN DAMAGE PER TIPE
        <span style="color:#555; font-weight:normal; font-size:0.72rem; margin-left:8px;">Total: ${fmt(sim.totalDmg)}</span>
      </div>
      <div style="background:#070a10;">
        ${dmgRows}
        <div style="padding:8px 12px; background:rgba(212,175,55,0.05); border-top:1px solid #d4af3722; display:flex; justify-content:space-between; align-items:center;">
          <span style="color:#d4af37; font-size:0.85rem;">⭐ TOTAL DMG (${sim.duration}s)</span>
          <b style="color:#d4af37; font-size:1.2rem;">${fmt(sim.totalDmg)}</b>
        </div>
      </div>
    </div>`;
}


// ── [10] PANEL: UTILITAS (heal, shield, mana, DEF, PEN, phantom) ─

function buildUtilPanel(sim, fs, skor, dmg) {
  const { lsHealTotal, lsHealBase, lsHealBuff, buffLsDmg, buffBasicHits,
          svHealTotal, passiveHeal, shieldVal, passiveShieldFlat,
          manaTotal, totalDef, totalPen, phantom, isTemplate, phantomSkor } = skor;
  const { basicTotalDmg, skillTotalDmg } = skor;

  const sh = sim.baseData.DMG_skill?.skill_handler;
  const si = (sim.hero.stars || 1) - 1;

  const healLabel = (() => {
    if (!sh || !sim.skill.totalHealNow) return null;
    if (sh.heal_now)        return `${Math.round(resolveVal(sh.heal_now, si)*100)}% × HP`;
    if (sh.heal_flat)       return `${resolveVal(sh.heal_flat, si)} flat`;
    if (sh.heal_magic_atk)  return `${Math.round(resolveVal(sh.heal_magic_atk, si)*100)}% × Magic ATK`;
    if (sh.heal_missing_hp) return `${Math.round(resolveVal(sh.heal_missing_hp, si)*100)}% × Missing HP`;
    return '?';
  })();

  const utilItems = [];

  if (lsHealTotal > 0 || (fs.Lifesteal || 0) > 0) {
    let detail = '';
    if (skor.baseLifesteal > 0) detail += `${pct(skor.baseLifesteal)} × ${fmt(basicTotalDmg)} = ${fmt(lsHealBase)}`;
    if (sim.buffLifesteal > 0) detail += (detail ? ' + ' : '') + `buff ${pct(sim.buffLifesteal)} × ${fmt(buffLsDmg)} (${buffBasicHits} hit) = ${fmt(lsHealBuff)}`;
    utilItems.push({ icon: '🩸', label: 'Lifesteal Heal', value: lsHealTotal, color: '#e74c3c', detail });
  }

  if (svHealTotal > 0 || (fs.Spell_Vamp || 0) > 0) {
    utilItems.push({
      icon: '💫', label: 'Spell Vamp Heal', value: svHealTotal, color: '#9b59b6',
      detail: `${pct(fs.Spell_Vamp || 0)} × ${fmt(skillTotalDmg)} = ${fmt(svHealTotal)}`
    });
  }

  if (sim.skill.totalHealNow > 0 && healLabel) {
    utilItems.push({
      icon: '💚', label: 'Skill Heal', value: sim.skill.totalHealNow, color: '#2ecc71',
      detail: `${healLabel} per cast × ${sim.skill.casts} cast`
    });
  }

  if (passiveHeal > 0) {
    utilItems.push({ icon: '💚', label: 'Passive Heal (Sinergi)', value: passiveHeal, color: '#2ecc71', detail: '(Heartbond persen + Emberlord flat)' });
  }

  const totalShield = round2((shieldVal || 0) + (sim.skill.totalShieldNow || 0) + (passiveShieldFlat || 0));
  if (totalShield > 0) {
    let detail = '';
    if (shieldVal > 0) detail += `Buff ${pct(fs.Shield_Percent_HP || 0)} × HP ${fmt(fs.HP)} = ${fmt(shieldVal)}`;
    if (sim.skill.totalShieldNow > 0) detail += (detail ? ' + ' : '') + `Skill ${fmt(sim.skill.totalShieldNow)}`;
    if (passiveShieldFlat > 0) detail += (detail ? ' + ' : '') + `Pasif flat ${fmt(passiveShieldFlat)}`;
    utilItems.push({ icon: '🛡', label: 'Shield Total', value: totalShield, color: '#f39c12', detail });
  }

  utilItems.push({
    icon: '💧', label: 'Mana Total', value: manaTotal, color: '#5dade2',
    detail: `Regen ${pct(fs.Mana_Regen_Per_Detik)}/s × ${sim.duration}s + ${sim.basicAtk.hits} basic + ${sim.skill.casts} skill`
  });

  if (totalDef > 0) {
    utilItems.push({ icon: '🛡', label: 'Total DEF', value: totalDef, color: '#8e9aaf', detail: `Phys ${fmt(fs.Physical_Def || 0)} + Mag ${fmt(fs.Magic_Def || 0)}` });
  }

  if (totalPen > 0) {
    utilItems.push({ icon: '🔪', label: 'Total PEN', value: totalPen, color: '#e67e22', detail: `Phys ${fmt(fs.Physical_Penetration || 0)} + Mag ${fmt(fs.Magic_Penetration || 0)}` });
  }

  if ((fs.Dragon_DMG || 0) > 0) {
    utilItems.push({ icon: '🐉', label: 'Dragon DMG Flat', value: fs.Dragon_DMG, color: '#e67e22', detail: 'Dari sinergi Dragoncaller' });
  }

  // Phantom Exorcist
  if (isTemplate && phantom) {
    utilItems.push({
      icon: '👻', label: 'Phantom HP', value: phantom.phantom_hp, color: '#4a90d9',
      detail: `${fmt(phantom.max_hp_terkuat)} × 15% × ${phantom.jumlah_unit} unit`
    });
    utilItems.push({
      icon: '👻', label: 'Phantom Phys DMG', value: phantom.phantom_phys_dmg, color: '#e74c3c',
      detail: `Skill phys ${fmt(phantom.skill_phys_total)} × ${pct(phantom.phantom_dmg_multiplier)} × ${phantom.jumlah_unit}`
    });
    utilItems.push({
      icon: '👻', label: 'Phantom Mag DMG', value: phantom.phantom_mag_dmg, color: '#9b59b6',
      detail: `Skill mag ${fmt(phantom.skill_mag_total)} × ${pct(phantom.phantom_dmg_multiplier)} × ${phantom.jumlah_unit}`
    });
  }

  if (utilItems.length === 0) return '';

  const rows = utilItems.map(item => `
    <div style="padding:7px 12px; border-bottom:1px solid #131820;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
        <span style="color:#aaa; font-size:0.78rem;">${item.icon} ${item.label}</span>
        <b style="color:${item.color};">${fmt(item.value)}</b>
      </div>
      ${item.detail ? `<div style="color:#555; font-size:0.7rem;">${item.detail}</div>` : ''}
    </div>`).join('');

  return `
    <div style="margin-bottom:12px; border:1px solid #1a2030; border-radius:8px; overflow:hidden;">
      <div style="padding:8px 12px; background:#0c0f16; color:#d4af37; font-size:0.82rem; font-weight:bold; letter-spacing:1px; border-bottom:1px solid #1a2030;">
        💠 UTILITAS & KONTRIBUSI LAIN
      </div>
      <div style="background:#070a10;">${rows}</div>
    </div>`;
}


// ── [11] PANEL: TOTALS (Damage Total & Sustain Total) ────────────

function buildTotalsBox(title, icon, total, breakdown, color) {
  const rows = breakdown.map(r => `
    <div style="
      padding:6px 12px; display:flex; justify-content:space-between; align-items:center;
      border-bottom:1px solid #131820; font-size:0.76rem;
    ">
      <span style="color:#888;">${r.label}</span>
      <b style="color:${r.value > 0 ? color : '#444'};">${fmt(r.value)}</b>
    </div>`).join('');

  return `
    <div style="margin-bottom:12px; border:1px solid ${color}33; border-radius:8px; overflow:hidden;">
      <div style="
        padding:8px 12px; background:#0c0f16; border-bottom:1px solid ${color}33;
        display:flex; justify-content:space-between; align-items:center;
      ">
        <span style="color:${color}; font-size:0.82rem; font-weight:bold; letter-spacing:1px;">${icon} ${title}</span>
        <span style="color:${color}; font-size:1.2rem; font-weight:bold;">${fmt(total)}</span>
      </div>
      <div style="background:#070a10;">
        ${rows}
      </div>
    </div>`;
}

function buildTotalsPanel(sim, fs, skor) {
  const { damageBreakdown, damageTotal, sustainBreakdown, sustainTotal, manaTotal } = skor;

  const damageBox  = buildTotalsBox('DAMAGE TOTAL',  '⚔️', damageTotal,  damageBreakdown,  '#e74c3c');
  const sustainBox = buildTotalsBox('SUSTAIN TOTAL', '🩸', sustainTotal, sustainBreakdown, '#2ecc71');

  const manaBox = `
    <div style="
      margin-bottom:12px; padding:8px 12px; border:1px solid #5dade233; border-radius:8px;
      display:flex; justify-content:space-between; align-items:center; background:#0c0f16;
    ">
      <span style="color:#5dade2; font-size:0.82rem; font-weight:bold; letter-spacing:1px;">💧 MANA TOTAL <span style="color:#555; font-weight:normal; font-size:0.7rem;">(info, gak ikut total)</span></span>
      <span style="color:#5dade2; font-size:1.1rem; font-weight:bold;">${fmt(manaTotal)}</span>
    </div>`;

  return damageBox + sustainBox + manaBox;
}


// ── [12] PANEL: SUMBER BUFF ──────────────────────────────────────

function buildBuffSourcePanel(sim) {
  const buffLogData = sim.buffLog || [];
  if (buffLogData.length === 0) return '';

  const scopeLabel = { global: '🌐 Global', role: '🎯 Fraksi/Role', handler: '⚙ Handler' };
  const scopeColor = { global: '#5dade2', role: '#d4af37', handler: '#e67e22' };

  const statIcon = {
    Hybrid_Lifesteal_Bonus: '🩸💫', Lifesteal_Bonus: '🩸', Spell_Vamp: '💫', Spell_Vamp_Bonus: '💫',
    Physical_ATK_Bonus: '⚔', Magic_ATK_Bonus: '✨', ATK_Speed_Bonus: '⚡', HP_Bonus: '❤️',
    Basic_ATK_DMG_Bonus: '🗡', Double_ATK_Chance: '🎲', Physical_Def_Bonus: '🛡P', Magic_Def_Bonus: '🛡M',
    DMG_Bonus: '🔥', Skill_DMG_Bonus: '✦🔥', MAX_HP_Percent_Bonus: '❤️%', Dragon_DMG_Flat: '🐉',
    Physical_ATK_Flat: '⚔flat', Magic_ATK_Flat: '✨flat', HP_Flat: '❤️flat',
    Heal_Percent_HP: '💚', Shield_Percent_HP: '🛡',
  };

  // Group by source|scope
  const grouped = {};
  buffLogData.forEach(({ source, scope, stat, value }) => {
    const key = source + '|' + scope;
    if (!grouped[key]) grouped[key] = { source, scope, stats: [] };
    grouped[key].stats.push({ stat, value });
  });

  const rows = Object.values(grouped).map(({ source, scope, stats }) => {
    const color = scopeColor[scope] || '#888';
    const statCells = stats.map(({ stat, value }) => {
      const icon = statIcon[stat] || '•';
      const isFlat = stat.endsWith('_Flat');
      const valStr = isFlat
        ? `<b style="color:#f39c12;">+${fmt(value)}</b>`
        : `<b style="color:#f39c12;">+${round2(value * 100)}%</b>`;
      return `<span style="display:inline-block; margin:2px 4px 2px 0; padding:2px 8px; background:#ffffff08; border-radius:3px; font-size:0.72rem;">${icon} ${stat}: ${valStr}</span>`;
    }).join('');

    return `
      <tr style="border-bottom:1px solid #131820;">
        <td style="padding:6px 10px; color:#ddd; font-weight:bold; white-space:nowrap; vertical-align:top;">${source}</td>
        <td style="padding:6px 10px; white-space:nowrap; vertical-align:top;">
          <span style="color:${color}; font-size:0.72rem; padding:2px 6px; background:${color}22; border-radius:3px;">${scopeLabel[scope] || scope}</span>
        </td>
        <td style="padding:6px 10px; vertical-align:top; line-height:1.8;">${statCells}</td>
      </tr>`;
  }).join('');

  return `
    <div style="margin-bottom:12px; border:1px solid #1a2030; border-radius:8px; overflow:hidden;">
      <div style="padding:8px 12px; background:#0c0f16; color:#d4af37; font-size:0.82rem; font-weight:bold; letter-spacing:1px; border-bottom:1px solid #1a2030;">
        📦 SUMBER BUFF AKTIF
      </div>
      <div style="background:#070a10;">
        <table style="width:100%; border-collapse:collapse; font-size:0.8rem;">
          <thead>
            <tr style="border-bottom:1px solid #1a2030; color:#555; font-size:0.72rem;">
              <th style="padding:5px 10px; text-align:left;">Sinergi</th>
              <th style="padding:5px 10px; text-align:left;">Scope</th>
              <th style="padding:5px 10px; text-align:left;">Buff Diterapkan</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}


// ── [13] TIMELINE SUMMARY BAR ─────────────────────────────────────

function buildTimelineSummary(sim) {
  const basicCount  = sim.basicAtk.hits;
  const doubleCount = sim.basicAtk.doubleHits;
  const skillCount  = sim.skill.casts;
  const ghostCount  = sim.basicAtk.ghostHits;
  const passiveCount = sim.passiveLog?.length || 0;
  const summonCount = sim.summon?.hits || 0;

  const badges = [
    { label: `⚔ ${basicCount}× Basic`, color: '#5dade2' },
    doubleCount > 0 && { label: `⚔⚔ ${doubleCount}× Double`, color: '#e74c3c' },
    { label: `✦ ${skillCount}× Skill`, color: '#d4af37' },
    passiveCount > 0 && { label: `⚡ ${passiveCount}× Passive`, color: '#9b59b6' },
    ghostCount > 0 && { label: `👻 ${ghostCount}× Ghost`, color: '#b7410e' },
    summonCount > 0 && { label: `🐒 ${summonCount}× Summon`, color: '#2ecc71' },
    sim.skill.totalHealNow > 0 && { label: `💚 Heal ${fmt(sim.skill.totalHealNow)}`, color: '#2ecc71' },
    sim.skill.totalShieldNow > 0 && { label: `🛡 Shield ${fmt(sim.skill.totalShieldNow)}`, color: '#f39c12' },
  ].filter(Boolean);

  return `
    <div style="
      padding: 10px 12px;
      background: linear-gradient(90deg, #0c1020, #0f1218);
      border: 1px solid #d4af3722;
      border-radius: 8px;
      margin-bottom: 10px;
      display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
    ">
      <span style="color:#d4af37; font-size:0.78rem; font-weight:bold; margin-right:4px;">⏱ Simulasi ${sim.duration}s:</span>
      ${badges.map(b => `
        <span style="
          padding: 3px 10px;
          background: ${b.color}22;
          border: 1px solid ${b.color}55;
          border-radius: 4px;
          color: ${b.color};
          font-size: 0.75rem;
          font-weight: bold;
        ">${b.label}</span>`).join('')}
    </div>`;
}


// ── [14] TIMELINE ROWS ───────────────────────────────────────────

function buildTimelineRows(sim, basicDetail, skillDetail) {
  // Merge double proc ke baris basic yang sama waktu
  const mergedTimeline = [];
  for (let i = 0; i < sim.timeline.length; i++) {
    const ev   = sim.timeline[i];
    const next = sim.timeline[i + 1];
    if (ev.type === 'double') continue;
    if (ev.type === 'basic' && next?.type === 'double' && next.time === ev.time) {
      mergedTimeline.push({ ...ev, isDouble: true, dmg: round2(ev.dmg + next.dmg), dmgSoFar: next.dmgSoFar, mana: next.mana });
      i++;
    } else {
      mergedTimeline.push({ ...ev, isDouble: false });
    }
  }

  let cntBasic = 0, cntSkill = 0, cntPassive = 0, cntGhost = 0, cntSummon = 0, cntTotal = 0;
  let ghostSeparatorInserted = false;

  return mergedTimeline.map(ev => {
    const isSkill     = ev.type === 'skill';
    const isBasic     = ev.type === 'basic';
    const isDouble    = ev.isDouble || false;
    const isPassive   = ['passive', 'passive_shield', 'passive_atkspeed', 'passive_mana', 'passive_lifesteal', 'passive_spellvamp'].includes(ev.type);
    const isGhost     = ev.type === 'ghost';
    const isMultiHit  = isSkill && (ev.totalHits || 1) > 1;
    const isSummon    = ev.type === 'summon_basic';
    const isEmpowered = ev.isEmpowered || false;

    if (isBasic)                            cntBasic++;
    if (isGhost)                            cntGhost++;
    if (isSkill && (ev.hitIndex || 1) === 1) cntSkill++;
    if (isPassive)                          cntPassive++;
    if (isSummon)                           cntSummon++;
    cntTotal++;

    // Separator ghost phase
    let separatorRow = '';
    if (isGhost && !ghostSeparatorInserted) {
      ghostSeparatorInserted = true;
      separatorRow = `
        <tr>
          <td colspan="7" style="
            padding:8px 10px;
            background:linear-gradient(90deg,#1a0a0055,#2a0a0088,#1a0a0055);
            border-top:1px dashed #b7410e66; border-bottom:1px dashed #b7410e66;
            text-align:center; color:#b7410e; font-size:0.78rem; letter-spacing:1px;">
            ── 💀 FASE GHOST (setelah mati) — basic attack murni, tanpa buff, stat base ──
          </td>
        </tr>`;
    }

    // ── Label & counter ──
    const counterNum = isPassive ? cntPassive : isSummon ? cntSummon : isSkill ? cntSkill : isGhost ? cntGhost : cntBasic;
    const countLabel = `<span style="font-size:0.65rem; color:#444; margin-left:3px;">#${counterNum}</span>`;

    const aksiLabel = isGhost    ? `👻 Ghost${countLabel}`
      : isPassive                ? `⚡ Passive${countLabel}`
      : isSummon                 ? `🐒 Summon${countLabel}`
      : isMultiHit               ? `✦ Skill ×${ev.hitIndex}/${ev.totalHits}${countLabel}`
      : isSkill                  ? `✦ Skill${countLabel}`
      : isDouble                 ? `⚔⚔ Basic x2${countLabel}`
      : `⚔ Basic${countLabel}`;

    // ── Detail kolom (formula + keterangan) ──
    const evDetail = ev.breakdown ? fmtBreakdown(ev.breakdown) : (isSkill ? skillDetail : basicDetail);
    const isZeroDmg = isSkill && ev.dmg === 0;

    const extras = [];
    if (isEmpowered)      extras.push('<span style="color:#d4af37;">⚡ Empowered</span>');
    if (ev.buffActive)    extras.push('<span style="color:#5dade2;">✦ Buff aktif</span>');
    if (isDouble)         extras.push('<span style="color:#e74c3c;">⚔ Double proc!</span>');
    if (ev.isShadowHit)   extras.push('<span style="color:#9b59b6;">👻 Shadow hit</span>');
    if (isGhost)          extras.push('<span style="color:#b7410e;">stat murni</span>');
    if (ev.buff && !isPassive) extras.push(`<span style="color:#f39c12;">${ev.buff}</span>`);
    if (ev.healNow > 0)   extras.push(`<span style="color:#2ecc71;">💚 +${fmt(ev.healNow)} heal</span>`);
    if (ev.shieldNow > 0) extras.push(`<span style="color:#f39c12;">🛡 +${fmt(ev.shieldNow)} shield</span>`);

    let detail;
    if (isPassive) {
      detail = `<span style="color:#9b59b6;">⚡ ${ev.buff || 'Passive proc'}</span>`;
    } else if (isZeroDmg) {
      detail = `<span style="color:#aaa;">✦ ${ev.buff || 'Skill (0 dmg)'}</span>${extras.length ? ' · ' + extras.join(' · ') : ''}`;
    } else {
      detail = `<span style="font-size:0.72rem;">${evDetail}</span>${extras.length ? '<br><span style="color:#555; font-size:0.7rem;">' + extras.join(' · ') + '</span>' : ''}`;
    }

    // ── Mana display ──
    const manaCell = isSkill ? `<span style="color:#888;">${ev.manaBefore}</span><span style="color:#555;">≥${ev.threshold}→</span><b style="color:#5dade2;">${ev.mana}</b>`
      : isGhost ? '<span style="color:#333;">—</span>'
      : `<b style="color:#5dade2;">${ev.mana}</b>`;

    // ── Warna per tipe event ──
    const rowBg     = isGhost      ? 'rgba(183,65,14,0.06)'
                    : isPassive    ? 'rgba(155,89,182,0.08)'
                    : isSummon     ? 'rgba(46,204,113,0.05)'
                    : isSkill      ? 'rgba(212,175,55,0.06)'
                    : isDouble     ? 'rgba(231,76,60,0.08)'
                    : ev.buffActive ? 'rgba(93,173,226,0.05)'
                    : 'transparent';

    const aksiColor = isGhost   ? '#b7410e'
                    : isPassive ? '#9b59b6'
                    : isSummon  ? '#2ecc71'
                    : isDouble  ? '#e74c3c'
                    : isSkill   ? '#d4af37'
                    : '#5dade2';

    const dmgColor  = isGhost        ? '#b7410e'
                    : isPassive      ? '#555'
                    : isSummon       ? '#2ecc71'
                    : isDouble       ? '#e74c3c'
                    : ev.isShadowHit ? '#9b59b6'
                    : '#27ae60';

    const totalColor = isGhost ? '#b7410e' : '#d4af37';
    const atkSpeedColor = isGhost ? '#333'
                        : (ev.buffActive || isSkill || isPassive) ? '#5dade2' : '#666';
    const timeColor = isGhost ? '#b7410e88' : '#888';

    return separatorRow + `
      <tr style="background:${rowBg}; opacity:${isGhost ? '0.8' : '1'}; border-bottom:1px solid #0f1218;">
        <td style="padding:5px 8px; color:${timeColor}; vertical-align:top; white-space:nowrap; font-size:0.78rem;">${ev.time}s</td>
        <td style="padding:5px 8px; color:${aksiColor}; vertical-align:top; white-space:nowrap; font-weight:bold; font-size:0.78rem;">${aksiLabel}</td>
        <td style="padding:5px 8px; color:${atkSpeedColor}; vertical-align:top; font-size:0.75rem; text-align:center;">${ev.effAtkSpeed ?? '—'}</td>
        <td style="padding:5px 8px; color:${dmgColor}; vertical-align:top; font-weight:bold; font-size:0.82rem; text-align:right;">${isPassive ? '—' : `+${fmt(ev.dmg)}`}</td>
        <td style="padding:5px 8px; color:${totalColor}; font-weight:bold; vertical-align:top; font-size:0.82rem; text-align:right;">${fmt(ev.dmgSoFar)}</td>
        <td style="padding:5px 8px; vertical-align:top; font-size:0.75rem; text-align:right; white-space:nowrap;">${manaCell}</td>
        <td style="padding:5px 8px; color:#666; vertical-align:top; font-size:0.72rem; line-height:1.5;">${detail}</td>
      </tr>`;
  }).join('');
}


// ── [15] RENDER UTAMA ────────────────────────────────────────────

export function renderSimulationHTML(sim) {
  const fs  = sim.finalStats;
  const bs  = sim.baseStats;
  const si  = (sim.hero.stars || 1) - 1;
  const bd  = sim.baseData;

  const dmg  = calcDmgSplit(sim);
  const skor = calcSkor(sim, fs, dmg, si);

  const heroCard      = buildHeroCard(sim);
  const statGrid      = buildStatGrid(sim, fs, bs);
  const formulaPanel  = buildFormulaPanel(sim, fs, bs);
  const buffSkillPanel = buildBuffSkillPanel(bd, si);
  const dmgSplitPanel = buildDmgSplitPanel(sim, dmg, skor);
  const utilPanel     = buildUtilPanel(sim, fs, skor, dmg);
  const skorBar       = buildTotalsPanel(sim, fs, skor);
  const buffSrcPanel  = buildBuffSourcePanel(sim);
  const timelineSummary = buildTimelineSummary(sim);

  const basicDetail = sim.basicAtk.breakdown ? fmtBreakdown(sim.basicAtk.breakdown) : '—';
  const skillDetail = sim.skill.breakdown    ? fmtBreakdown(sim.skill.breakdown)    : '—';
  const rows        = buildTimelineRows(sim, basicDetail, skillDetail);

  // Ghost phase callout
  const ghostCallout = (sim.basicAtk.ghostHits || 0) > 0 ? `
    <div style="
      padding: 10px 14px; margin-bottom: 10px;
      background: rgba(183,65,14,0.10);
      border: 1px solid #b7410e44;
      border-left: 3px solid #b7410e;
      border-radius: 6px; font-size: 0.82rem;
    ">
      <span style="color:#b7410e; font-weight:bold;">💀 GHOST PHASE (Emberlord):</span>
      <span style="color:#e07040;"> ${sim.basicAtk.ghostHits}× basic setelah mati</span>
      <span style="color:#888;"> — DMG: </span><b style="color:#e07040;">${fmt(sim.basicAtk.ghostDmg)}</b>
      <span style="color:#555; font-size:0.72rem; margin-left:8px;">(stat base murni, tanpa buff sinergi)</span>
    </div>` : '';

  return `
    <div style="
      font-family: 'Share Tech Mono', 'Courier New', monospace;
      font-size: 0.8rem;
      color: #ccc;
      max-width: 900px;
    ">
      ${heroCard}
      ${statsSection(skorBar, buffSrcPanel)}
      ${statGrid}
      ${formulaPanel}
      ${buffSkillPanel ? buffSkillPanel : ''}
      ${dmgSplitPanel}
      ${utilPanel}
      ${ghostCallout}

      <!-- ── TIMELINE ─────────────────── -->
      <div style="border:1px solid #1a2030; border-radius:8px; overflow:hidden; margin-bottom:12px;">
        <div style="padding:8px 12px; background:#0c0f16; color:#d4af37; font-size:0.82rem; font-weight:bold; letter-spacing:1px; border-bottom:1px solid #1a2030;">
          ⏱ TIMELINE SERANGAN (${sim.duration}s)
        </div>
        ${timelineSummary ? `<div style="padding:10px 12px; background:#070a10; border-bottom:1px solid #131820;">${timelineSummary}</div>` : ''}
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; min-width:620px;">
            <thead>
              <tr style="background:#0a0d14; border-bottom:2px solid #1a2030; font-size:0.72rem; color:#555; text-transform:uppercase; letter-spacing:1px;">
                <th style="padding:6px 8px; text-align:left; white-space:nowrap;">Waktu</th>
                <th style="padding:6px 8px; text-align:left; white-space:nowrap;">Aksi</th>
                <th style="padding:6px 8px; text-align:center; white-space:nowrap;">Spd</th>
                <th style="padding:6px 8px; text-align:right; white-space:nowrap;">DMG</th>
                <th style="padding:6px 8px; text-align:right; white-space:nowrap;">Total</th>
                <th style="padding:6px 8px; text-align:right; white-space:nowrap;">Mana</th>
                <th style="padding:6px 8px; text-align:left;">Detail Formula</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <!-- Legend -->
        <div style="
          padding:8px 12px; background:#070a10; border-top:1px solid #131820;
          display:flex; flex-wrap:wrap; gap:8px; font-size:0.7rem; color:#555;
        ">
          <span>⚔ Basic</span>
          <span style="color:#e74c3c;">⚔⚔ Double</span>
          <span style="color:#d4af37;">✦ Skill</span>
          <span style="color:#9b59b6;">⚡ Passive</span>
          <span style="color:#b7410e;">👻 Ghost</span>
          <span style="color:#2ecc71;">🐒 Summon</span>
          <span style="color:#5dade2;">✦ = buff aktif</span>
          <span style="color:#555;">│ Mana: sebelum≥threshold→sesudah</span>
        </div>
      </div>
    </div>`;
}

/** Letakkan skor dan buff source side by side di layar lebar */
function statsSection(skorBar, buffSrcPanel) {
  if (!buffSrcPanel) return skorBar;
  return `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:0;">
      <div>${skorBar}</div>
      <div>${buffSrcPanel}</div>
    </div>`;
}