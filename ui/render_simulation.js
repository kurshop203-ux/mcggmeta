// ════════════════════════════════════════════════════════════════
// render_simulation.js  (UI Redesign — Mobile Legends Style)
// Render output simulateBattle() menjadi HTML siap tampil di modal.
//
// Export:
//   renderSimulationHTML(sim) → return HTML string
//
// Struktur file:
//   [1] IMPORTS
//   [2] THEME & CONFIG
//   [3] HELPERS
//   [4] PANEL BUILDERS
//   [5] RENDER UTAMA
// ════════════════════════════════════════════════════════════════


// ── [1] IMPORTS ──────────────────────────────────────────────────

import { round2 }                      from '../engine/simulate_battle.js';
import { calcSkorLengkap, resolveVal } from '../engine/score_utils.js';


// ── [2] THEME & CONFIG ───────────────────────────────────────────

const THEME = {
  bg: {
    base:  '#07090f',
    card:  '#0c0f18',
    row:   '#10141f',
    hover: '#151a28',
  },
  border: {
    default: '#1a2035',
    accent:  '#d4af3733',
    strong:  '#2a3050',
  },
  text: {
    primary:   '#e8e8f0',
    secondary: '#9098b0',
    muted:     '#50587a',
    gold:      '#d4af37',
    goldLight: '#f0cc55',
  },
  accent: {
    damage:  '#e74c3c',
    sustain: '#2ecc71',
    mana:    '#5dade2',
    buff:    '#f39c12',
    magic:   '#9b59b6',
    ghost:   '#b7410e',
    summon:  '#27ae60',
    passive: '#8e44ad',
  },
  radius: { sm: '4px', md: '8px', lg: '12px' },
};

const FRAKSI_CONFIG = {
  'Astro Power':     { color: '#6366f1', icon: '🌌' },
  'Dragoncaller':    { color: '#e67e22', icon: '🐉' },
  'Emberlord':       { color: '#b7410e', icon: '🔥' },
  'Enchanted Tales': { color: '#9b59b6', icon: '✨' },
  'Exorcist':        { color: '#4a90d9', icon: '👻' },
  'Heartbond':       { color: '#e91e8c', icon: '💗' },
  'Neobeasts':       { color: '#2ecc71', icon: '🐾' },
};
const FRAKSI_DEFAULT = { color: '#d4af37', icon: '⚔' };

const STAT_ICON = {
  Hybrid_Lifesteal_Bonus: '🩸💫', Lifesteal_Bonus: '🩸',
  Spell_Vamp: '💫',               Spell_Vamp_Bonus: '💫',
  Physical_ATK_Bonus: '⚔',       Magic_ATK_Bonus: '✨',
  ATK_Speed_Bonus: '⚡',          HP_Bonus: '❤️',
  Basic_ATK_DMG_Bonus: '🗡',      Double_ATK_Chance: '🎲',
  Physical_Def_Bonus: '🛡P',      Magic_Def_Bonus: '🛡M',
  DMG_Bonus: '🔥',                Skill_DMG_Bonus: '✦',
  Dragon_DMG_Flat: '🐉',          Heal_Percent_HP: '💚',
  Shield_Percent_HP: '🛡',        MAX_HP_Percent_Bonus: '❤️%',
  Physical_ATK_Flat: '⚔flat',    Magic_ATK_Flat: '✨flat',
  HP_Flat: '❤️flat',
};
const STAT_ICON_DEFAULT = '•';

const SKILL_TYPE_CONFIG = {
  buff:             { label: 'Buff Stat Sementara', color: '#5dade2', icon: '🔵' },
  multihit:         { label: 'Multi-Hit',           color: '#f39c12', icon: '🟡' },
  stack:            { label: 'Stack',               color: '#e67e22', icon: '🟠' },
  cooldown:         { label: 'Cooldown-based',      color: '#9b59b6', icon: '⏰' },
  sequence:         { label: 'Sequence / Delayed',  color: '#2ecc71', icon: '⏩' },
  delayed_multihit: { label: 'Delayed Multi-Hit',   color: '#e74c3c', icon: '🕐' },
};

const SCOPE_COLOR = { global: '#5dade2', role: '#d4af37', handler: '#e67e22' };
const SCOPE_LABEL = { global: '🌐 Global', role: '🎯 Role', handler: '⚙ Handler' };


// ── [3] HELPERS ──────────────────────────────────────────────────

const fmt  = n => Math.round(n).toLocaleString('id-ID');
const pct  = n => `${round2(n * 100)}%`;
const pct1 = n => `${(n * 100).toFixed(1)}%`;

function badge(text, color, bgOpacity = 0.15) {
  const hex = Math.round(bgOpacity * 255).toString(16).padStart(2, '0');
  return `<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;
    background:${color}${hex};border:1px solid ${color}55;border-radius:${THEME.radius.sm};
    color:${color};font-size:0.72rem;font-weight:bold;">${text}</span>`;
}

function collapsiblePanel(id, headerHTML, bodyHTML, defaultOpen = true) {
  const display = defaultOpen ? 'block' : 'none';
  const arrow   = defaultOpen ? '▲' : '▼';
  return `
    <div style="margin-bottom:10px;border:1px solid ${THEME.border.default};border-radius:${THEME.radius.md};overflow:hidden;">
      <div onclick="(function(h){var el=document.getElementById('${id}');var btn=h.querySelector('.tb');var open=el.style.display!=='none';el.style.display=open?'none':'block';btn.textContent=open?'▼':'▲';})(this)"
        style="padding:8px 14px;background:${THEME.bg.card};display:flex;justify-content:space-between;align-items:center;cursor:pointer;user-select:none;border-bottom:1px solid ${THEME.border.default};">
        <div style="display:flex;align-items:center;gap:8px;">${headerHTML}</div>
        <span class="tb" style="color:${THEME.text.muted};font-size:0.8rem;transition:transform 0.2s;">${arrow}</span>
      </div>
      <div id="${id}" style="display:${display};">
        ${bodyHTML}
      </div>
    </div>`;
}

function progressBar(value, max, color, label = '') {
  const w = max > 0 ? Math.min(100, (value / max) * 100).toFixed(1) : 0;
  return `
    <div style="display:flex;align-items:center;gap:8px;">
      <div style="flex:1;height:5px;background:${THEME.bg.base};border-radius:3px;overflow:hidden;">
        <div style="width:${w}%;height:100%;background:${color};border-radius:3px;"></div>
      </div>
      ${label ? `<span style="font-size:0.7rem;color:${THEME.text.muted};min-width:50px;text-align:right;">${label}</span>` : ''}
    </div>`;
}

function diffStat(base, final, isPercent = false) {
  if (base === undefined || base === null)
    return `<b style="color:${THEME.text.primary};">${isPercent ? pct(final) : fmt(final)}</b>`;
  const diff = round2(final - base);
  if (Math.abs(diff) < 0.001)
    return `<b style="color:${THEME.text.primary};">${isPercent ? pct(final) : fmt(final)}</b>`;
  const sign = diff > 0 ? '+' : '';
  const diffColor = diff > 0 ? THEME.accent.sustain : THEME.accent.damage;
  const arrow = diff > 0 ? ' ▲' : ' ▼';
  return isPercent
    ? `<span style="color:${THEME.text.muted};">${round2(base*100)}%</span> → <b style="color:${THEME.text.primary};">${round2(final*100)}%</b> <span style="color:${diffColor};font-size:0.7rem;">(${sign}${round2(diff*100)}%${arrow})</span>`
    : `<span style="color:${THEME.text.muted};">${fmt(base)}</span> → <b style="color:${THEME.text.primary};">${fmt(final)}</b> <span style="color:${diffColor};font-size:0.7rem;">(${sign}${fmt(diff)}${arrow})</span>`;
}

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

function fmtBreakdown(b) {
  if (!b || !b.parts) return '—';
  const partsStr = b.parts
    .map(p => `<span style="color:${THEME.text.secondary};">${p.ref}</span> <span style="color:${THEME.text.muted};">(${fmt(p.statValue)}×${p.multiplier})</span>`)
    .join(' <span style="color:#333;">+</span> ');
  let line = `${partsStr} <span style="color:#333;">=</span> <b style="color:${THEME.text.gold};">${fmt(b.raw)}</b>`;
  if (b.dmgBonusMultiplier && b.dmgBonusMultiplier !== 1)
    line += ` <span style="color:#333;">×</span><span style="color:${THEME.accent.buff};">${b.dmgBonusMultiplier}</span>`;
  if (b.raw !== b.final)
    line += ` <span style="color:#333;">=</span> <b style="color:${THEME.accent.sustain};">${fmt(b.final)}</b>`;
  return line;
}

function panelHeader(icon, title, color = THEME.text.gold) {
  return `<span style="color:${color};font-size:0.82rem;font-weight:bold;letter-spacing:1px;">${icon} ${title}</span>`;
}


// ── [4] PANEL BUILDERS ───────────────────────────────────────────

// ── [5] HERO CARD ────────────────────────────────────────────────
function buildHeroCard(sim) {
  const { hero, baseData: bd } = sim;
  const fraksi  = bd.fraksi ?? hero.fraksi ?? '—';
  const role    = bd.role   ?? hero.role   ?? '—';
  const gold    = bd.gold   ?? '—';
  const cfg     = FRAKSI_CONFIG[fraksi] || FRAKSI_DEFAULT;
  const c       = cfg.color;
  const stars   = '★'.repeat(hero.stars || 1) + '<span style="color:#2a2f40;">★</span>'.repeat(3 - (hero.stars || 1));
  const label   = hero.label && hero.label !== hero.name ? hero.label : null;

  return `
    <div style="
      padding:14px 16px;margin-bottom:10px;
      background:linear-gradient(135deg,${THEME.bg.card},${THEME.bg.base});
      border:1px solid ${c}33;border-left:4px solid ${c};border-radius:${THEME.radius.md};
    ">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
        <div>
          <div style="color:${c};font-size:1.15rem;font-weight:bold;letter-spacing:1px;">
            ${cfg.icon} ${label ?? hero.name}
          </div>
          ${label ? `<div style="color:${THEME.text.muted};font-size:0.75rem;margin-top:1px;">${hero.name}</div>` : ''}
          <div style="color:${THEME.text.gold};font-size:1rem;margin-top:4px;letter-spacing:3px;">${stars}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
          ${badge(`${cfg.icon} ${fraksi}`, c)}
          <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;">
            ${badge(`🎯 ${role}`, THEME.text.gold, 0.08)}
            ${badge(`💰 ${gold}`, '#888', 0.1)}
          </div>
        </div>
      </div>
    </div>`;
}

// ── [6] STAT GRID ─────────────────────────────────────────────────
function buildStatGrid(sim, fs, bs, panelId) {
  const si = (sim.hero.stars || 1) - 1;
  const jangLabel = bs.Jangkauan_ATK <= 1 ? '🗡 Jarak Dekat' : '🏹 Jarak Jauh';

  const statRows = [
    { icon: '❤️', label: 'HP',            base: bs.HP,                   final: fs.HP },
    { icon: '⚔',  label: 'Physical ATK',  base: bs.Physical_ATK,         final: fs.Physical_ATK },
    { icon: '✨',  label: 'Magic ATK',     base: bs.Magic_ATK,            final: fs.Magic_ATK },
    { icon: '🛡',  label: 'Physical DEF',  base: bs.Physical_Def,         final: fs.Physical_Def },
    { icon: '🛡',  label: 'Magic DEF',     base: bs.Magic_Def,            final: fs.Magic_Def },
    { icon: '⚡',  label: 'ATK Speed',     base: bs.ATK_Speed,            final: fs.ATK_Speed, isDecimal: true,
      extra: sim.buffAtkSpeed > 0 ? badge(`+${pct(sim.buffAtkSpeed)} saat buff`, THEME.accent.mana, 0.1) : '' },
    { icon: '🩸',  label: 'Lifesteal',     base: bs.Lifesteal,            final: fs.Lifesteal,    isPct: true },
    { icon: '💫',  label: 'Spell Vamp',    base: bs.Spell_Vamp,           final: fs.Spell_Vamp,   isPct: true },
    { icon: '🔪',  label: 'Phys PEN',      base: bs.Physical_Penetration, final: fs.Physical_Penetration },
    { icon: '🔪',  label: 'Mag PEN',       base: bs.Magic_Penetration,    final: fs.Magic_Penetration },
    { icon: '💧',  label: 'Mana Regen/s',  base: bs.Mana_Regen_Per_Detik, final: fs.Mana_Regen_Per_Detik, isDecimal: true },
    { icon: '💧',  label: 'Batas Mana',    base: bs.Batas_Mana,           final: fs.Batas_Mana },
  ];

  const rows = statRows.map(s => {
    const hasBuff = s.base !== undefined && Math.abs(round2(s.final - s.base)) > 0.001;
    const baseStr = s.base !== undefined
      ? `<span style="color:${THEME.text.muted};font-size:0.74rem;">${s.isPct ? pct(s.base) : (s.isDecimal ? s.base : fmt(s.base))}</span> → `
      : '';
    const finalColor = hasBuff ? THEME.accent.sustain : THEME.text.primary;
    const finalStr = `<b style="color:${finalColor};">${s.isPct ? pct(s.final) : (s.isDecimal ? s.final : fmt(s.final))}</b>`;
    const diffVal = hasBuff
      ? ` ${badge(s.isPct ? `+${round2((s.final - s.base)*100)}%▲` : `+${fmt(round2(s.final-s.base))}▲`, THEME.accent.sustain, 0.12)}`
      : '';

    return `
      <div style="
        padding:6px 12px;border-bottom:1px solid ${THEME.border.default};
        display:flex;align-items:center;justify-content:space-between;
        background:${hasBuff ? 'rgba(46,204,113,0.03)' : 'transparent'};
      ">
        <span style="color:${THEME.text.secondary};font-size:0.78rem;">${s.icon} ${s.label}</span>
        <div style="font-size:0.8rem;text-align:right;display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end;">
          ${baseStr}${finalStr}${diffVal}${s.extra ? ' ' + s.extra : ''}
        </div>
      </div>`;
  }).join('');

  const dragonRow = (fs.Dragon_DMG || 0) > 0 ? `
    <div style="padding:6px 12px;background:rgba(230,126,34,0.05);border-bottom:1px solid ${THEME.border.default};
      display:flex;align-items:center;justify-content:space-between;">
      <span style="color:#e67e22;font-size:0.78rem;">🐉 Dragon DMG Flat</span>
      <b style="color:#e67e22;">${fmt(fs.Dragon_DMG)}</b>
    </div>` : '';

  const manaAwalRow = `
    <div style="padding:6px 12px;border-bottom:1px solid ${THEME.border.default};
      display:flex;align-items:center;justify-content:space-between;">
      <span style="color:${THEME.text.secondary};font-size:0.78rem;">💧 Batas Mana AWAL</span>
      <b style="color:${THEME.text.primary};">${fmt(bs.Batas_Mana_Awal)}</b>
    </div>`;

  const jangRow = `
    <div style="padding:6px 12px;display:flex;align-items:center;justify-content:space-between;">
      <span style="color:${THEME.text.secondary};font-size:0.78rem;">🏹 Jangkauan ATK</span>
      <span style="color:${THEME.text.primary};font-size:0.8rem;">${bs.Jangkauan_ATK} <span style="color:${THEME.text.muted};font-size:0.72rem;">(${jangLabel})</span></span>
    </div>`;

  const body = `<div style="background:${THEME.bg.base};">${rows}${manaAwalRow}${dragonRow}${jangRow}</div>`;
  return collapsiblePanel(`${panelId}-stat`, panelHeader('📊', 'STAT HERO (Base → Final + Buff)'), body, true);
}

// ── [7] FORMULA ──────────────────────────────────────────────────
function buildFormulaPanel(sim, fs, bs, panelId) {
  const { baseData: bd } = sim;
  const si = (sim.hero.stars || 1) - 1;

  function formulaRows(formulaList, color) {
    if (!formulaList || formulaList.length === 0)
      return `<div style="color:${THEME.text.muted};font-size:0.75rem;padding:6px 12px;">— tidak ada formula</div>`;
    return formulaList.map(f => {
      const statVal     = fs[f.ref] ?? 0;
      const baseStatVal = bs[f.ref] ?? statVal;
      const mult        = Array.isArray(f.multiplier) ? f.multiplier[si] : f.multiplier;
      const hasBuff     = Math.abs(round2(statVal - baseStatVal)) > 0.001;
      const result      = round2(statVal * mult);
      return `
        <div style="
          padding:6px 12px;background:${hasBuff ? 'rgba(93,173,226,0.04)' : 'transparent'};
          border-bottom:1px solid ${THEME.border.default};
          display:grid;grid-template-columns:1.5fr 0.6fr 1fr 0.8fr;gap:4px;align-items:center;font-size:0.78rem;
        ">
          <span style="color:${THEME.text.secondary};">${f.ref}</span>
          <span style="color:${THEME.text.muted};">×${mult}</span>
          <span>${diffStat(hasBuff ? baseStatVal : undefined, statVal)}</span>
          <span style="color:${color};font-weight:bold;text-align:right;">= ${fmt(result)}</span>
        </div>`;
    }).join('');
  }

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

  const headerRow = (label, color, rawTotal, bonusMult) => `
    <div style="padding:8px 12px;color:${color};font-size:0.78rem;font-weight:bold;background:${THEME.bg.base};border-bottom:1px solid ${THEME.border.default};">
      ${label}
      <span style="color:${THEME.text.muted};font-weight:normal;margin-left:8px;font-size:0.72rem;">
        raw: ${fmt(rawTotal)} × ${bonusMult} = <b style="color:${THEME.accent.sustain};">${fmt(round2(rawTotal * bonusMult))}</b> per hit
      </span>
    </div>`;

  const colHead = `<div style="padding:4px 12px;display:grid;grid-template-columns:1.5fr 0.6fr 1fr 0.8fr;gap:4px;font-size:0.7rem;color:${THEME.text.muted};border-bottom:1px solid ${THEME.border.default};">
    <span>Stat</span><span>×</span><span>Nilai</span><span style="text-align:right;">Hasil</span></div>`;

  const body = `
    <div style="background:${THEME.bg.base};">
      ${headerRow('⚔ BASIC_ATK', THEME.accent.mana, basicTotal, basicBonusMult)}
      ${colHead}${formulaRows(basicParts, THEME.accent.mana)}
      ${headerRow('✦ DMG_SKILL', THEME.text.gold, skillTotal, skillBonusMult)}
      ${colHead}${formulaRows(skillParts, THEME.text.gold)}
    </div>`;
  return collapsiblePanel(`${panelId}-formula`, panelHeader('🧮', 'FORMULA DAMAGE'), body, false);
}

// ── [8] BUFF SKILL ───────────────────────────────────────────────
function buildBuffSkillPanel(bd, si, panelId) {
  const skillCfg = bd.DMG_skill?.skill_handler;
  if (!skillCfg) return '';
  const rv   = v => resolveVal(v, si);
  const type = skillCfg.type || 'buff';
  const cfg  = SKILL_TYPE_CONFIG[type] || { label: type, color: '#888', icon: '•' };

  const buffsRows = Object.entries(skillCfg.buffs || {}).map(([k, v]) => `
    <div style="display:flex;justify-content:space-between;padding:5px 12px;border-bottom:1px solid ${THEME.border.default};">
      <span style="color:${THEME.text.secondary};">${k}</span>
      ${badge(`+${round2(rv(v)*100)}%`, cfg.color)}
    </div>`).join('');

  const stackRows = Object.entries(skillCfg.buff_per_stack || {}).map(([k, v]) => `
    <div style="display:flex;justify-content:space-between;padding:5px 12px;border-bottom:1px solid ${THEME.border.default};">
      <span style="color:${THEME.text.secondary};">${k}</span>
      ${badge(`+${round2(rv(v)*100)}% per stack`, THEME.accent.buff)}
    </div>`).join('');

  const infoRow = (icon, label, val) => val ? `
    <div style="display:flex;justify-content:space-between;padding:5px 12px;border-bottom:1px solid ${THEME.border.default};">
      <span style="color:${THEME.text.secondary};font-size:0.78rem;">${icon} ${label}</span>
      <b style="color:${cfg.color};">${val}</b>
    </div>` : '';

  const body = `
    <div style="background:${THEME.bg.base};font-size:0.78rem;">
      ${infoRow('📝', 'Label', skillCfg.label)}
      ${infoRow('⏱', 'Durasi buff', skillCfg.duration ? `${skillCfg.duration}s` : '')}
      ${infoRow('🎯', 'Multi-hit', skillCfg.hits > 1 ? `${skillCfg.hits}× per cast` : '')}
      ${infoRow('⏰', 'Cooldown', skillCfg.cooldown ? `${skillCfg.cooldown}s` : '')}
      ${infoRow('📈', 'Max stacks', skillCfg.max_stacks ? `${skillCfg.max_stacks}` : '')}
      ${infoRow('💚', 'Heal saat cast', skillCfg.heal_now ? `+${Math.round(rv(skillCfg.heal_now)*100)}% HP` : (skillCfg.heal_flat ? `+${rv(skillCfg.heal_flat)} flat` : (skillCfg.heal_magic_atk ? `+${Math.round(rv(skillCfg.heal_magic_atk)*100)}% Magic ATK` : '')))}
      ${infoRow('🛡', 'Shield saat cast', skillCfg.shield_now ? `+${Math.round(rv(skillCfg.shield_now)*100)}% HP` : (skillCfg.shield_flat ? `+${rv(skillCfg.shield_flat)} flat` : ''))}
      ${skillCfg.buff_additive ? infoRow('🔁', 'Buff mode', 'Additive (stack)') : ''}
      ${skillCfg.empowered_basic ? infoRow('⚡', 'Empowered basic', `×${rv(skillCfg.empowered_basic)}`) : ''}
      ${buffsRows}${stackRows}
    </div>`;
  return collapsiblePanel(`${panelId}-buffskill`, panelHeader(cfg.icon, `BUFF SKILL — ${cfg.label}`, cfg.color), body, false);
}

// ── [9] DMG SPLIT ────────────────────────────────────────────────
function buildDmgSplitPanel(sim, skor, panelId) {
  const { basicPhysTotal, basicMagTotal, ghostPhysTotal, ghostMagTotal,
          skillPhysTotal, skillMagTotal,
          basicTotalDmg, skillTotalDmg, ghostDmgTotal } = skor;

  const totalAllDmg = round2(basicTotalDmg + skillTotalDmg + ghostDmgTotal + (sim.summon?.totalDmg || 0));
  const maxDmg = Math.max(basicTotalDmg, skillTotalDmg, ghostDmgTotal, sim.summon?.totalDmg || 0, 1);

  const rows = [];
  rows.push({ label: '⚔ Basic ATK', total: basicTotalDmg, phys: basicPhysTotal, mag: basicMagTotal,
    color: THEME.accent.mana, count: `${sim.basicAtk.hits} hit${sim.basicAtk.doubleHits > 0 ? ` +${sim.basicAtk.doubleHits}× dbl` : ''}` });
  if (skillTotalDmg > 0)
    rows.push({ label: '✦ Skill DMG', total: skillTotalDmg, phys: skillPhysTotal, mag: skillMagTotal,
      color: THEME.text.gold, count: `${sim.skill.casts} cast` });
  if (ghostDmgTotal > 0)
    rows.push({ label: '👻 Ghost', total: ghostDmgTotal, phys: ghostPhysTotal, mag: ghostMagTotal,
      color: THEME.accent.ghost, count: `${sim.basicAtk.ghostHits} hit` });
  if ((sim.summon?.totalDmg || 0) > 0)
    rows.push({ label: '🐾 Summon', total: sim.summon.totalDmg, phys: sim.summon.totalDmg, mag: 0,
      color: THEME.accent.summon, count: `${sim.summon.hits} hit` });

  const dmgRows = rows.map(r => `
    <div style="padding:10px 12px;border-bottom:1px solid ${THEME.border.default};">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <span style="color:${r.color};font-weight:bold;font-size:0.82rem;">${r.label}</span>
        <div style="display:flex;align-items:center;gap:8px;">
          ${badge(r.count, r.color, 0.1)}
          <b style="color:${r.color};font-size:0.9rem;">${fmt(r.total)}</b>
        </div>
      </div>
      ${progressBar(r.total, totalAllDmg, r.color, pct1(r.total / (totalAllDmg || 1)))}
      <div style="display:flex;gap:12px;margin-top:5px;font-size:0.72rem;color:${THEME.text.muted};">
        <span>⚔ Phys: <b style="color:${THEME.accent.damage};">${fmt(r.phys)}</b></span>
        <span>✨ Mag: <b style="color:${THEME.accent.magic};">${fmt(r.mag)}</b></span>
      </div>
    </div>`).join('');

  const footer = `
    <div style="padding:10px 12px;background:rgba(212,175,55,0.05);border-top:1px solid ${THEME.border.accent};
      display:flex;justify-content:space-between;align-items:center;">
      <span style="color:${THEME.text.gold};font-size:0.85rem;">⭐ TOTAL DMG (${sim.duration}s)</span>
      <b style="color:${THEME.text.gold};font-size:1.1rem;">${fmt(sim.totalDmg)}</b>
    </div>`;

  const body = `<div style="background:${THEME.bg.base};">${dmgRows}${footer}</div>`;
  return collapsiblePanel(`${panelId}-dmgsplit`, panelHeader('🔥', 'BREAKDOWN DAMAGE PER TIPE'), body, true);
}

// ── [10] UTILITAS ────────────────────────────────────────────────
function buildUtilPanel(sim, fs, skor, panelId) {
  const { lsHealTotal, lsHealBase, lsHealBuff, buffLsDmg, buffBasicHits,
          svHealTotal, passiveHeal, shieldVal, passiveShieldFlat,
          manaTotal, totalDef, totalPen, phantom, isTemplate, phantomSkor,
          basicTotalDmg, skillTotalDmg } = skor;

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
    if (sim.buffLifesteal > 0)  detail += (detail ? ' + ' : '') + `buff ${pct(sim.buffLifesteal)} × ${fmt(buffLsDmg)} (${buffBasicHits} hit) = ${fmt(lsHealBuff)}`;
    utilItems.push({ icon: '🩸', label: 'Lifesteal Heal', value: lsHealTotal, color: THEME.accent.damage, detail });
  }
  if (svHealTotal > 0 || (fs.Spell_Vamp || 0) > 0)
    utilItems.push({ icon: '💫', label: 'Spell Vamp Heal', value: svHealTotal, color: THEME.accent.magic,
      detail: `${pct(fs.Spell_Vamp || 0)} × ${fmt(skillTotalDmg)} = ${fmt(svHealTotal)}` });
  if (sim.skill.totalHealNow > 0 && healLabel)
    utilItems.push({ icon: '💚', label: 'Skill Heal', value: sim.skill.totalHealNow, color: THEME.accent.sustain,
      detail: `${healLabel} per cast × ${sim.skill.casts} cast` });
  if (passiveHeal > 0)
    utilItems.push({ icon: '💚', label: 'Passive Heal (Sinergi)', value: passiveHeal, color: THEME.accent.sustain,
      detail: '(Heartbond persen + Emberlord flat)' });

  const totalShield = round2((shieldVal || 0) + (sim.skill.totalShieldNow || 0) + (passiveShieldFlat || 0));
  if (totalShield > 0) {
    let detail = '';
    if (shieldVal > 0)              detail += `Buff ${pct(fs.Shield_Percent_HP || 0)} × HP ${fmt(fs.HP)} = ${fmt(shieldVal)}`;
    if (sim.skill.totalShieldNow > 0) detail += (detail ? ' + ' : '') + `Skill ${fmt(sim.skill.totalShieldNow)}`;
    if (passiveShieldFlat > 0)      detail += (detail ? ' + ' : '') + `Pasif flat ${fmt(passiveShieldFlat)}`;
    utilItems.push({ icon: '🛡', label: 'Shield Total', value: totalShield, color: THEME.accent.buff, detail });
  }

  utilItems.push({ icon: '💧', label: 'Mana Total', value: manaTotal, color: THEME.accent.mana,
    detail: `Regen ${pct(fs.Mana_Regen_Per_Detik)}/s × ${sim.duration}s + ${sim.basicAtk.hits} basic + ${sim.skill.casts} skill` });
  if (totalDef > 0)
    utilItems.push({ icon: '🛡', label: 'Total DEF', value: totalDef, color: '#8e9aaf',
      detail: `Phys ${fmt(fs.Physical_Def || 0)} + Mag ${fmt(fs.Magic_Def || 0)}` });
  if (totalPen > 0)
    utilItems.push({ icon: '🔪', label: 'Total PEN', value: totalPen, color: THEME.accent.buff,
      detail: `Phys ${fmt(fs.Physical_Penetration || 0)} + Mag ${fmt(fs.Magic_Penetration || 0)}` });
  if ((fs.Dragon_DMG || 0) > 0)
    utilItems.push({ icon: '🐉', label: 'Dragon DMG Flat', value: fs.Dragon_DMG, color: '#e67e22',
      detail: 'Dari sinergi Dragoncaller' });
  if (isTemplate && phantom) {
    utilItems.push({ icon: '👻', label: 'Phantom HP', value: phantom.phantom_hp, color: '#4a90d9',
      detail: `${fmt(phantom.max_hp_terkuat)} × 15% × ${phantom.jumlah_unit} unit` });
    utilItems.push({ icon: '👻', label: 'Phantom Phys DMG', value: phantom.phantom_phys_dmg, color: THEME.accent.damage,
      detail: `Skill phys ${fmt(phantom.skill_phys_total)} × ${pct(phantom.phantom_dmg_multiplier)} × ${phantom.jumlah_unit}` });
    utilItems.push({ icon: '👻', label: 'Phantom Mag DMG', value: phantom.phantom_mag_dmg, color: THEME.accent.magic,
      detail: `Skill mag ${fmt(phantom.skill_mag_total)} × ${pct(phantom.phantom_dmg_multiplier)} × ${phantom.jumlah_unit}` });
  }

  if (utilItems.length === 0) return '';

  const rows = utilItems.map(item => `
    <div style="padding:8px 12px;border-bottom:1px solid ${THEME.border.default};">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
        <span style="color:${THEME.text.secondary};font-size:0.78rem;">${item.icon} ${item.label}</span>
        <b style="color:${item.color};font-size:0.9rem;">${fmt(item.value)}</b>
      </div>
      ${item.detail ? `<div style="color:${THEME.text.muted};font-size:0.7rem;">${item.detail}</div>` : ''}
    </div>`).join('');

  const body = `<div style="background:${THEME.bg.base};">${rows}</div>`;
  return collapsiblePanel(`${panelId}-util`, panelHeader('💠', 'UTILITAS & KONTRIBUSI LAIN'), body, true);
}

// ── [11] TOTALS ──────────────────────────────────────────────────
function buildTotalsBox(title, icon, total, breakdown, color) {
  const rows = breakdown.map(r => `
    <div style="padding:6px 12px;display:flex;justify-content:space-between;align-items:center;
      border-bottom:1px solid ${THEME.border.default};gap:8px;">
      <span style="color:${THEME.text.secondary};font-size:0.76rem;flex:1;">${r.label}</span>
      <div style="flex:2;margin:0 8px;">${progressBar(r.value, total, color)}</div>
      <b style="color:${r.value > 0 ? color : THEME.text.muted};min-width:60px;text-align:right;font-size:0.78rem;">${fmt(r.value)}</b>
    </div>`).join('');

  return `
    <div style="border:1px solid ${color}33;border-radius:${THEME.radius.md};overflow:hidden;margin-bottom:10px;">
      <div style="padding:10px 14px;background:linear-gradient(90deg,${color}11,transparent);
        border-bottom:1px solid ${color}33;display:flex;justify-content:space-between;align-items:center;">
        <span style="color:${color};font-size:0.82rem;font-weight:bold;letter-spacing:1px;">${icon} ${title}</span>
        <b style="color:${color};font-size:1.3rem;">${fmt(total)}</b>
      </div>
      <div style="background:${THEME.bg.base};">${rows}</div>
    </div>`;
}

function buildTotalsPanel(sim, fs, skor) {
  const { damageBreakdown, damageTotal, sustainBreakdown, sustainTotal, manaTotal } = skor;
  const damageBox  = buildTotalsBox('DAMAGE TOTAL',  '⚔️', damageTotal,  damageBreakdown,  THEME.accent.damage);
  const sustainBox = buildTotalsBox('SUSTAIN TOTAL', '🩸', sustainTotal, sustainBreakdown, THEME.accent.sustain);
  const manaBox = `
    <div style="padding:8px 14px;border:1px solid ${THEME.accent.mana}33;border-radius:${THEME.radius.md};margin-bottom:10px;
      display:flex;justify-content:space-between;align-items:center;background:${THEME.bg.card};">
      <span style="color:${THEME.accent.mana};font-size:0.82rem;font-weight:bold;">💧 MANA TOTAL
        <span style="color:${THEME.text.muted};font-weight:normal;font-size:0.7rem;margin-left:6px;">(info, tidak ikut skor)</span>
      </span>
      <b style="color:${THEME.accent.mana};font-size:1.1rem;">${fmt(manaTotal)}</b>
    </div>`;

  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
      <div>${damageBox}</div>
      <div>${sustainBox}</div>
    </div>
    ${manaBox}`;
}

// ── [12] BUFF SOURCE ─────────────────────────────────────────────
function buildBuffSourcePanel(sim) {
  const buffLogData = sim.buffLog || [];
  if (buffLogData.length === 0) return '';

  const grouped = {};
  buffLogData.forEach(({ source, scope, stat, value }) => {
    const key = source + '|' + scope;
    if (!grouped[key]) grouped[key] = { source, scope, stats: [] };
    grouped[key].stats.push({ stat, value });
  });

  const rows = Object.values(grouped).map(({ source, scope, stats }) => {
    const color = SCOPE_COLOR[scope] || '#888';
    const statCells = stats.map(({ stat, value }) => {
      const icon  = STAT_ICON[stat] || STAT_ICON_DEFAULT;
      const isFlat = stat.endsWith('_Flat');
      const valStr = isFlat
        ? `<b style="color:${THEME.accent.buff};">+${fmt(value)}</b>`
        : `<b style="color:${THEME.accent.buff};">+${round2(value*100)}%</b>`;
      return `<span style="display:inline-block;margin:2px 3px 2px 0;padding:2px 7px;
        background:${THEME.bg.row};border-radius:${THEME.radius.sm};font-size:0.72rem;">
        ${icon} ${stat}: ${valStr}</span>`;
    }).join('');

    return `
      <tr style="border-bottom:1px solid ${THEME.border.default};">
        <td style="padding:6px 10px;color:${THEME.text.primary};font-weight:bold;white-space:nowrap;vertical-align:top;">${source}</td>
        <td style="padding:6px 10px;white-space:nowrap;vertical-align:top;">${badge(SCOPE_LABEL[scope] || scope, color, 0.1)}</td>
        <td style="padding:6px 10px;vertical-align:top;line-height:1.8;">${statCells}</td>
      </tr>`;
  }).join('');

  return `
    <div style="margin-bottom:10px;border:1px solid ${THEME.border.default};border-radius:${THEME.radius.md};overflow:hidden;">
      <div style="padding:8px 14px;background:${THEME.bg.card};border-bottom:1px solid ${THEME.border.default};">
        ${panelHeader('📦', 'SUMBER BUFF AKTIF')}
      </div>
      <div style="background:${THEME.bg.base};overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:0.8rem;min-width:400px;">
          <thead>
            <tr style="border-bottom:1px solid ${THEME.border.strong};font-size:0.72rem;color:${THEME.text.muted};">
              <th style="padding:5px 10px;text-align:left;">Sinergi</th>
              <th style="padding:5px 10px;text-align:left;">Scope</th>
              <th style="padding:5px 10px;text-align:left;">Buff</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

// ── [13] TIMELINE SUMMARY ────────────────────────────────────────
function buildTimelineSummary(sim) {
  const basicCount   = sim.basicAtk.hits;
  const doubleCount  = sim.basicAtk.doubleHits;
  const skillCount   = sim.skill.casts;
  const ghostCount   = sim.basicAtk.ghostHits;
  const passiveCount = sim.passiveLog?.length || 0;
  const summonCount  = sim.summon?.hits || 0;

  const badges = [
    { label: `⚔ ${basicCount}× Basic`,   color: THEME.accent.mana },
    doubleCount > 0 && { label: `⚔⚔ ${doubleCount}× Double`, color: THEME.accent.damage },
    { label: `✦ ${skillCount}× Skill`,   color: THEME.text.gold },
    passiveCount > 0 && { label: `⚡ ${passiveCount}× Passive`, color: THEME.accent.passive },
    ghostCount > 0   && { label: `👻 ${ghostCount}× Ghost`,   color: THEME.accent.ghost },
    summonCount > 0  && { label: `🐾 ${summonCount}× Summon`, color: THEME.accent.summon },
    sim.skill.totalHealNow > 0   && { label: `💚 Heal ${fmt(sim.skill.totalHealNow)}`,   color: THEME.accent.sustain },
    sim.skill.totalShieldNow > 0 && { label: `🛡 Shield ${fmt(sim.skill.totalShieldNow)}`, color: THEME.accent.buff },
  ].filter(Boolean);

  return `
    <div style="display:flex;flex-wrap:wrap;gap:5px;padding:10px 12px;
      background:linear-gradient(90deg,${THEME.bg.card},${THEME.bg.base});
      border-bottom:1px solid ${THEME.border.default};align-items:center;">
      <span style="color:${THEME.text.gold};font-size:0.78rem;font-weight:bold;margin-right:4px;">⏱ ${sim.duration}s:</span>
      ${badges.map(b => badge(b.label, b.color)).join(' ')}
    </div>`;
}

// ── [14] TIMELINE ROWS ───────────────────────────────────────────
function buildTimelineRows(sim, basicDetail, skillDetail) {
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

  let cntBasic = 0, cntSkill = 0, cntPassive = 0, cntGhost = 0, cntSummon = 0;
  let ghostSeparatorInserted = false;

  return mergedTimeline.map(ev => {
    const isSkill     = ev.type === 'skill';
    const isDouble    = ev.isDouble || false;
    const isPassive   = ['passive','passive_shield','passive_atkspeed','passive_mana','passive_lifesteal','passive_spellvamp'].includes(ev.type);
    const isGhost     = ev.type === 'ghost';
    const isMultiHit  = isSkill && (ev.totalHits || 1) > 1;
    const isSummon    = ev.type === 'summon_basic';
    const isEmpowered = ev.isEmpowered || false;

    if (ev.type === 'basic') cntBasic++;
    if (isGhost)             cntGhost++;
    if (isSkill && (ev.hitIndex || 1) === 1) cntSkill++;
    if (isPassive)           cntPassive++;
    if (isSummon)            cntSummon++;

    let separatorRow = '';
    if (isGhost && !ghostSeparatorInserted) {
      ghostSeparatorInserted = true;
      separatorRow = `
        <tr>
          <td colspan="7" style="padding:8px 10px;
            background:linear-gradient(90deg,#1a0a0055,#2a0a0088,#1a0a0055);
            border-top:1px dashed ${THEME.accent.ghost}66;border-bottom:1px dashed ${THEME.accent.ghost}66;
            text-align:center;color:${THEME.accent.ghost};font-size:0.78rem;letter-spacing:1px;">
            ── 💀 FASE GHOST (setelah mati) — stat base murni, tanpa buff ──
          </td>
        </tr>`;
    }

    const counterNum  = isPassive ? cntPassive : isSummon ? cntSummon : isSkill ? cntSkill : isGhost ? cntGhost : cntBasic;
    const countLabel  = `<span style="font-size:0.65rem;color:#333;margin-left:2px;">#${counterNum}</span>`;
    const aksiLabel   = isGhost   ? `👻 Ghost${countLabel}`
      : isPassive               ? `⚡ Passive${countLabel}`
      : isSummon                ? `🐾 Summon${countLabel}`
      : isMultiHit              ? `✦ Skill ×${ev.hitIndex}/${ev.totalHits}${countLabel}`
      : isSkill                 ? `✦ Skill${countLabel}`
      : isDouble                ? `⚔⚔ x2${countLabel}`
      : `⚔ Basic${countLabel}`;

    const evDetail  = ev.breakdown ? fmtBreakdown(ev.breakdown) : (isSkill ? skillDetail : basicDetail);
    const isZeroDmg = isSkill && ev.dmg === 0;
    const extras    = [];
    if (isEmpowered)      extras.push(`<span style="color:${THEME.text.gold};">⚡ Empowered</span>`);
    if (ev.buffActive)    extras.push(`<span style="color:${THEME.accent.mana};">✦ Buff aktif</span>`);
    if (isDouble)         extras.push(`<span style="color:${THEME.accent.damage};">⚔ Double!</span>`);
    if (ev.isShadowHit)   extras.push(`<span style="color:${THEME.accent.magic};">Shadow hit</span>`);
    if (isGhost)          extras.push(`<span style="color:${THEME.accent.ghost};">stat murni</span>`);
    if (ev.buff && !isPassive) extras.push(`<span style="color:${THEME.accent.buff};">${ev.buff}</span>`);
    if (ev.healNow > 0)   extras.push(`<span style="color:${THEME.accent.sustain};">💚 +${fmt(ev.healNow)}</span>`);
    if (ev.shieldNow > 0) extras.push(`<span style="color:${THEME.accent.buff};">🛡 +${fmt(ev.shieldNow)}</span>`);

    let detail;
    if (isPassive)
      detail = `<span style="color:${THEME.accent.passive};">⚡ ${ev.buff || 'Passive proc'}</span>`;
    else if (isZeroDmg)
      detail = `<span style="color:${THEME.text.secondary};">✦ ${ev.buff || 'Skill (0 dmg)'}</span>${extras.length ? ' · '+extras.join(' · ') : ''}`;
    else
      detail = `<span style="font-size:0.72rem;">${evDetail}</span>${extras.length ? '<br><span style="color:'+THEME.text.muted+';font-size:0.7rem;">'+extras.join(' · ')+'</span>' : ''}`;

    const manaCell = isSkill
      ? `<span style="color:${THEME.text.muted};">${ev.manaBefore}</span><span style="color:#333;">≥${ev.threshold}→</span><b style="color:${THEME.accent.mana};">${ev.mana}</b>`
      : isGhost ? `<span style="color:#222;">—</span>`
      : `<b style="color:${THEME.accent.mana};">${ev.mana}</b>`;

    const rowBg      = isGhost   ? 'rgba(183,65,14,0.06)' : isPassive ? 'rgba(142,68,173,0.07)'
      : isSummon ? 'rgba(39,174,96,0.05)' : isSkill  ? 'rgba(212,175,55,0.05)'
      : isDouble  ? 'rgba(231,76,60,0.07)' : ev.buffActive ? 'rgba(93,173,226,0.04)' : 'transparent';
    const aksiColor  = isGhost ? THEME.accent.ghost : isPassive ? THEME.accent.passive
      : isSummon ? THEME.accent.summon : isDouble ? THEME.accent.damage
      : isSkill  ? THEME.text.gold : THEME.accent.mana;
    const dmgColor   = isGhost ? THEME.accent.ghost : isPassive ? THEME.text.muted
      : isSummon ? THEME.accent.summon : isDouble ? THEME.accent.damage
      : ev.isShadowHit ? THEME.accent.magic : THEME.accent.sustain;
    const totalColor = isGhost ? THEME.accent.ghost : THEME.text.gold;
    const spdColor   = isGhost ? '#1a1a1a' : (ev.buffActive || isSkill || isPassive) ? THEME.accent.mana : THEME.text.muted;
    const timeColor  = isGhost ? THEME.accent.ghost + '88' : THEME.text.muted;

    return separatorRow + `
      <tr style="background:${rowBg};border-bottom:1px solid ${THEME.bg.base};">
        <td style="padding:5px 8px;color:${timeColor};vertical-align:top;white-space:nowrap;font-size:0.77rem;">${ev.time}s</td>
        <td style="padding:5px 8px;color:${aksiColor};vertical-align:top;white-space:nowrap;font-weight:bold;font-size:0.77rem;">${aksiLabel}</td>
        <td style="padding:5px 8px;color:${spdColor};vertical-align:top;font-size:0.74rem;text-align:center;">${ev.effAtkSpeed ?? '—'}</td>
        <td style="padding:5px 8px;color:${dmgColor};vertical-align:top;font-weight:bold;font-size:0.82rem;text-align:right;">${isPassive ? '—' : `+${fmt(ev.dmg)}`}</td>
        <td style="padding:5px 8px;color:${totalColor};font-weight:bold;vertical-align:top;font-size:0.82rem;text-align:right;">${fmt(ev.dmgSoFar)}</td>
        <td style="padding:5px 8px;vertical-align:top;font-size:0.74rem;text-align:right;white-space:nowrap;">${manaCell}</td>
        <td style="padding:5px 8px;color:${THEME.text.muted};vertical-align:top;font-size:0.72rem;line-height:1.5;">${detail}</td>
      </tr>`;
  }).join('');
}


// ── [5] RENDER UTAMA ─────────────────────────────────────────────

export function renderSimulationHTML(sim) {
  const fs  = sim.finalStats;
  const bs  = sim.baseStats;
  const si  = (sim.hero.stars || 1) - 1;
  const bd  = sim.baseData;
  const skor = calcSkorLengkap(sim);   // ← satu-satunya kalkulasi

  // panelId unik per hero — cegah konflik kalau ada >1 hero di halaman sama
  const panelId = `sim-${(sim.hero.label ?? sim.hero.name).replace(/[^a-z0-9]/gi, '_')}`;

  const heroCard       = buildHeroCard(sim);
  const totalsPanel    = buildTotalsPanel(sim, fs, skor);
  const buffSrcPanel   = buildBuffSourcePanel(sim);
  const statGrid       = buildStatGrid(sim, fs, bs, panelId);
  const dmgSplitPanel  = buildDmgSplitPanel(sim, skor, panelId);
  const utilPanel      = buildUtilPanel(sim, fs, skor, panelId);
  const formulaPanel   = buildFormulaPanel(sim, fs, bs, panelId);
  const buffSkillPanel = buildBuffSkillPanel(bd, si, panelId);

  const basicDetail = sim.basicAtk.breakdown ? fmtBreakdown(sim.basicAtk.breakdown) : '—';
  const skillDetail = sim.skill.breakdown    ? fmtBreakdown(sim.skill.breakdown)    : '—';
  const timelineRows = buildTimelineRows(sim, basicDetail, skillDetail);
  const timelineSummary = buildTimelineSummary(sim);

  const ghostCallout = (sim.basicAtk.ghostHits || 0) > 0 ? `
    <div style="padding:10px 14px;margin-bottom:10px;
      background:rgba(183,65,14,0.10);border:1px solid ${THEME.accent.ghost}44;
      border-left:3px solid ${THEME.accent.ghost};border-radius:${THEME.radius.md};font-size:0.82rem;">
      <span style="color:${THEME.accent.ghost};font-weight:bold;">💀 GHOST PHASE (Emberlord):</span>
      <span style="color:#e07040;"> ${sim.basicAtk.ghostHits}× basic setelah mati</span>
      <span style="color:${THEME.text.muted};"> — DMG: </span><b style="color:#e07040;">${fmt(sim.basicAtk.ghostDmg)}</b>
      <span style="color:${THEME.text.muted};font-size:0.72rem;margin-left:8px;">(stat base murni, tanpa buff sinergi)</span>
    </div>` : '';

  const timelineBody = `
    ${timelineSummary}
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;min-width:620px;">
        <thead>
          <tr style="background:${THEME.bg.card};border-bottom:2px solid ${THEME.border.strong};
            font-size:0.72rem;color:${THEME.text.muted};text-transform:uppercase;letter-spacing:1px;">
            <th style="padding:6px 8px;text-align:left;white-space:nowrap;">Waktu</th>
            <th style="padding:6px 8px;text-align:left;white-space:nowrap;">Aksi</th>
            <th style="padding:6px 8px;text-align:center;white-space:nowrap;">Spd</th>
            <th style="padding:6px 8px;text-align:right;white-space:nowrap;">DMG</th>
            <th style="padding:6px 8px;text-align:right;white-space:nowrap;">Total</th>
            <th style="padding:6px 8px;text-align:right;white-space:nowrap;">Mana</th>
            <th style="padding:6px 8px;text-align:left;">Detail Formula</th>
          </tr>
        </thead>
        <tbody>${timelineRows}</tbody>
      </table>
    </div>
    <div style="padding:8px 12px;background:${THEME.bg.base};border-top:1px solid ${THEME.border.default};
      display:flex;flex-wrap:wrap;gap:8px;font-size:0.7rem;color:${THEME.text.muted};">
      ${[
        ['⚔ Basic', THEME.accent.mana],
        ['⚔⚔ Double', THEME.accent.damage],
        ['✦ Skill', THEME.text.gold],
        ['⚡ Passive', THEME.accent.passive],
        ['👻 Ghost', THEME.accent.ghost],
        ['🐾 Summon', THEME.accent.summon],
        ['✦ = buff aktif', THEME.accent.mana],
      ].map(([t, c]) => `<span style="color:${c};">${t}</span>`).join('')}
    </div>`;

  return `
    <div style="
      font-family:'Share Tech Mono','Courier New',monospace;
      font-size:0.8rem;color:${THEME.text.primary};max-width:900px;
    ">
      ${heroCard}

      <!-- Totals: 2 kolom di desktop, stack di mobile -->
      ${totalsPanel}

      <!-- Buff source full width -->
      ${buffSrcPanel}

      <!-- Panels collapsible -->
      ${statGrid}
      ${dmgSplitPanel}
      ${utilPanel}
      ${ghostCallout}
      ${formulaPanel}
      ${buffSkillPanel}

      <!-- Timeline collapsible, default tertutup -->
      ${collapsiblePanel(`${panelId}-timeline`, panelHeader('⏱', `TIMELINE SERANGAN (${sim.duration}s)`), timelineBody, false)}
    </div>`;
}