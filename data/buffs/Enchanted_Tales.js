// ════════════════════════════════════════════════════════════════
// Enchanted_Tales.js
// Buff sinergi fraksi Enchanted Tales — mechanic Fragment Global.
//
// THRESHOLD : 2 / 4 nama unik hero fraksi Enchanted Tales di grid
//
// TIER BONUS (multiplier per fragment):
//   Tier 1 → 0.015 per fragment
//   Tier 2 → 0.03  per fragment
// ════════════════════════════════════════════════════════════════

// ── KONFIGURASI (PATCHABLE) ───────────────────────────────────
const FRAGMENT_MULTIPLIER = [0.015, 0.03];
const MAX_FRAGMENT        = 40;
const THRESHOLDS          = [2, 4];

// ── HELPER ────────────────────────────────────────────────────
function toArray(v) {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}
function getActiveTierIndex(count, thresholds) {
  let t = -1;
  thresholds.forEach((th, i) => { if (count >= th) t = i; });
  return t;
}

// ── HANDLER UTAMA ─────────────────────────────────────────────
function handler({ heroList, qualifying, tierIndex }) {
  let fragment = window.enchantedTalesFragment ?? 0;
  fragment = Math.max(0, Math.min(MAX_FRAGMENT, Number(fragment) || 0));
  window.enchantedTalesFragment = fragment;

  if (fragment === 0) {
    qualifying.forEach(hero => {
      hero.enchantedtales_fragment  = fragment;
      hero.enchantedtales_tier      = tierIndex + 1;
      hero.enchantedtales_bonus_dmg = 0;
    });
    return;
  }

  const multiplier = FRAGMENT_MULTIPLIER[tierIndex];
  const bonusDmg   = fragment * multiplier;

  qualifying.forEach(hero => {
    if (hero.buffs.DMG_Bonus === undefined) hero.buffs.DMG_Bonus = 0;
    hero.buffs.DMG_Bonus += bonusDmg;
    hero.buffLog.push({ source: 'Enchanted Tales', scope: 'handler', stat: 'DMG_Bonus', value: bonusDmg });
    hero.enchantedtales_fragment  = fragment;
    hero.enchantedtales_tier      = tierIndex + 1;
    hero.enchantedtales_bonus_dmg = bonusDmg;
  });
}

// ── INLINE INPUT UI ───────────────────────────────────────────
export function renderInputUI(container, heroList) {
  const directNames   = new Set(
    heroList.filter(h => toArray(h.fraksi).includes('Enchanted Tales')).map(h => h.name)
  );
  const blessingBonus = heroList.filter(h =>
    toArray(h.blessingFraksi).includes('Enchanted Tales')
  ).length;
  const uniqueCount   = directNames.size + blessingBonus;

  const tierIndex = getActiveTierIndex(uniqueCount, THRESHOLDS);
  if (tierIndex === -1) return; // buff tidak aktif, tidak inject apapun

  const accentColor   = '#9b59b6';
  const currentFrag   = window.enchantedTalesFragment ?? 0;

  const section = document.createElement('div');
  section.style.cssText = `
    border: 1px solid ${accentColor}44;
    border-left: 3px solid ${accentColor};
    border-radius: 6px;
    padding: 10px 12px;
    margin-top: 8px;
    background: ${accentColor}08;
  `;
  section.innerHTML = `
    <div style="color:${accentColor}; font-size:0.8rem; font-weight:bold; margin-bottom:8px;">
      📖 Enchanted Tales — Fragment <span style="font-weight:normal; color:#666;">(Tier ${tierIndex + 1})</span>
    </div>
    <div style="
      display:flex; align-items:center; justify-content:space-between; gap:10px;
    ">
      <div>
        <div style="color:#ccc; font-size:0.78rem;">🧩 Fragment Enchanted Tales (0–40)</div>
        <div style="color:#666; font-size:0.7rem; margin-top:2px;">Bonus % ke DMG_Bonus</div>
      </div>
      <input
        type="number"
        id="enchantedtales-fragment-inline-input"
        min="0" max="40" step="1"
        value="${currentFrag}"
        style="
          width:80px; padding:8px; text-align:center;
          background:#0f1218; border:1px solid ${accentColor}66; border-radius:4px;
          color:#fff; font-family:'Share Tech Mono', monospace; font-weight:bold;
          font-size:1rem;
        "
      />
    </div>
  `;

  container.appendChild(section);
}

export function collectInput() {
  const input = document.getElementById('enchantedtales-fragment-inline-input');
  if (!input) return true; // section tidak dirender (buff tidak aktif), skip

  let val = parseInt(input.value, 10);
  if (isNaN(val)) val = 0;
  val = Math.max(0, Math.min(MAX_FRAGMENT, val));
  window.enchantedTalesFragment = val;
  return true; // 0 adalah nilai valid
}

// ── RENDER PANEL ──────────────────────────────────────────────
export function renderEnchantedTalesPanel(hero) {
  if (!toArray(hero.fraksi).includes('Enchanted Tales')) return '';
  if (hero.enchantedtales_tier === undefined) return '';

  const fmt = n => Math.round(n).toLocaleString('id-ID');
  const pct = n => `${(n * 100).toFixed(2)}%`;

  const accentColor = '#9b59b6';
  const bgGradient  = 'linear-gradient(135deg, #1a0d2a, #0f1218)';
  const fragment    = hero.enchantedtales_fragment ?? 0;
  const bonus       = hero.enchantedtales_bonus_dmg ?? 0;

  const buffET = (hero.buffLog || []).filter(b => b.source === 'Enchanted Tales');
  const STAT_LABEL = { DMG_Bonus: '🔥 DMG Bonus' };

  const rowsBuff = buffET.length === 0
    ? `<tr><td colspan="2" style="padding:4px 10px; color:#555; font-style:italic;">— belum ada fragment / bonus 0%</td></tr>`
    : buffET.map(b => `
        <tr style="border-bottom:1px solid #1a1f28;">
          <td style="padding:3px 10px; color:#aaa; white-space:nowrap;">${STAT_LABEL[b.stat] ?? b.stat}</td>
          <td style="padding:3px 10px; color:${accentColor}; font-weight:bold;">+${pct(b.value)}</td>
        </tr>`).join('');

  return `
    <div style="
      margin-bottom: 14px; padding: 12px 14px;
      background: ${bgGradient};
      border: 1px solid ${accentColor}55; border-left: 3px solid ${accentColor};
      border-radius: 8px; font-family: 'Share Tech Mono', monospace; font-size: 0.8rem;
    ">
      <div style="color:${accentColor}; font-size:0.95rem; font-weight:bold; margin-bottom:10px; letter-spacing:1px;">
        📖 ENCHANTED TALES MECHANIC · TIER ${hero.enchantedtales_tier}
      </div>
      <div style="background:#ffffff08; border:1px solid ${accentColor}33; border-radius:6px; padding:8px 12px; margin-bottom:12px;">
        <div style="color:#ccc; font-size:0.78rem;">🧩 Fragment Enchanted Tales (Global)</div>
        <div style="color:#fff; font-weight:bold; font-size:1.1rem; margin-top:2px;">${fmt(fragment)} / 40</div>
        <div style="color:#666; font-size:0.7rem; margin-top:2px;">Diisi melalui popup saat klik 🔍 Cari Rekomendasi</div>
      </div>
      <div style="background:${accentColor}11; border:1px solid ${accentColor}33; border-radius:6px; padding:8px 12px; margin-bottom:12px; font-size:0.78rem; color:#aaa; line-height:1.8;">
        <div>📖 Bonus per Fragment (Tier ${hero.enchantedtales_tier})</div>
        <div style="color:#fff;">
          ${fmt(fragment)} fragment × ${pct(FRAGMENT_MULTIPLIER[(hero.enchantedtales_tier ?? 1) - 1] ?? 0)}
          = <b style="color:${accentColor};">+${pct(bonus)}</b>
        </div>
        <div style="margin-top:4px; color:#666; font-size:0.72rem;">Diterapkan ke DMG_Bonus</div>
      </div>
      <div style="border-top:1px solid ${accentColor}22; margin-bottom:10px;"></div>
      <div style="color:#d4af37; margin-bottom:5px;">📥 Buff Enchanted Tales diterima</div>
      <table style="width:100%; border-collapse:collapse; font-size:0.78rem;">
        <tbody>${rowsBuff}</tbody>
      </table>
    </div>
  `;
}

// ── EXPORT ────────────────────────────────────────────────────
export default {
  key:          'Enchanted_Tales',
  targetFraksi: 'Enchanted Tales',
  tiers:         2,
  thresholds:   THRESHOLDS,
  global:       {},
  role_bonus:   {},
  handler,
  renderPanel:   (hero)            => renderEnchantedTalesPanel(hero),
  renderInputUI: (container, list) => renderInputUI(container, list),
  collectInput:  ()                => collectInput(),
};