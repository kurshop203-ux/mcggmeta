// ════════════════════════════════════════════════════════════════
// Neobeasts.js
// Buff sinergi fraksi Neobeasts — mechanic Poin Global.
//
// THRESHOLD : 2 / 4 / 6 nama unik hero fraksi Neobeasts di grid
//
// CARA KERJA:
// 1. User input 1 nilai "Poin Neobeasts" (0-999), berlaku GLOBAL
//    untuk seluruh sinergi (bukan per-hero).
// 2. Poin × multiplier tier = bonus % yang diterapkan ke:
//      - Physical_ATK_Bonus
//      - Magic_ATK_Bonus
//      - HP_Bonus
//    untuk SEMUA hero Neobeasts yang qualifying.
//
// TIER BONUS (multiplier per poin):
//   Tier 1 (2 nama unik) → 0.0002 per poin
//   Tier 2 (4 nama unik) → 0.0003 per poin
//   Tier 3 (6 nama unik) → 0.0005 per poin
// ════════════════════════════════════════════════════════════════

// ── KONFIGURASI (PATCHABLE) ───────────────────────────────────
const POIN_MULTIPLIER = [0.0002, 0.0003, 0.0005];
const MAX_POIN        = 999;
const THRESHOLDS      = [2, 4, 6];

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
  let poin = window.neobeastsPoin ?? 0;
  poin = Math.max(0, Math.min(MAX_POIN, Number(poin) || 0));
  window.neobeastsPoin = poin;

  if (poin === 0) {
    qualifying.forEach(hero => {
      hero.neobeasts_poin      = poin;
      hero.neobeasts_tier      = tierIndex + 1;
      hero.neobeasts_bonus_pct = 0;
    });
    return;
  }

  const multiplier = POIN_MULTIPLIER[tierIndex];
  const bonusPct   = poin * multiplier;

  qualifying.forEach(hero => {
    ['Physical_ATK_Bonus', 'Magic_ATK_Bonus', 'HP_Bonus'].forEach(stat => {
      if (hero.buffs[stat] === undefined) hero.buffs[stat] = 0;
      hero.buffs[stat] += bonusPct;
      hero.buffLog.push({ source: 'Neobeasts', scope: 'handler', stat, value: bonusPct });
    });
    hero.neobeasts_poin      = poin;
    hero.neobeasts_tier      = tierIndex + 1;
    hero.neobeasts_bonus_pct = bonusPct;
  });
}

// ── INLINE INPUT UI ───────────────────────────────────────────
export function renderInputUI(container, heroList) {
  const uniqueCount = new Set(
    heroList
      .filter(h => toArray(h.fraksi).includes('Neobeasts'))
      .map(h => h.name)
  ).size;

  const tierIndex = getActiveTierIndex(uniqueCount, THRESHOLDS);
  if (tierIndex === -1) return; // buff tidak aktif, tidak inject apapun

  const accentColor  = '#2ecc71';
  const currentPoin  = window.neobeastsPoin ?? 0;

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
      🐾 Neobeasts — Poin <span style="font-weight:normal; color:#666;">(Tier ${tierIndex + 1})</span>
    </div>
    <div style="
      display:flex; align-items:center; justify-content:space-between; gap:10px;
    ">
      <div>
        <div style="color:#ccc; font-size:0.78rem;">⭐ Poin Neobeasts (0–999)</div>
        <div style="color:#666; font-size:0.7rem; margin-top:2px;">
          Bonus % ke Physical_ATK, Magic_ATK, dan HP
        </div>
      </div>
      <input
        type="number"
        id="neobeasts-poin-inline-input"
        min="0" max="999" step="1"
        value="${currentPoin}"
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
  const input = document.getElementById('neobeasts-poin-inline-input');
  if (!input) return true; // section tidak dirender (buff tidak aktif), skip

  let val = parseInt(input.value, 10);
  if (isNaN(val)) val = 0;
  val = Math.max(0, Math.min(MAX_POIN, val));
  window.neobeastsPoin = val;
  return true; // 0 adalah nilai valid
}

// ── RENDER PANEL ──────────────────────────────────────────────
export function renderNeobeastsPanel(hero) {
  if (!toArray(hero.fraksi).includes('Neobeasts')) return '';
  if (hero.neobeasts_tier === undefined) return '';

  const fmt = n => Math.round(n).toLocaleString('id-ID');
  const pct = n => `${(n * 100).toFixed(2)}%`;

  const accentColor = '#2ecc71';
  const bgGradient  = 'linear-gradient(135deg, #0a1f12, #0f1218)';
  const poin        = hero.neobeasts_poin ?? 0;
  const bonus       = hero.neobeasts_bonus_pct ?? 0;

  const buffNeo = (hero.buffLog || []).filter(b => b.source === 'Neobeasts');
  const STAT_LABEL = {
    Physical_ATK_Bonus: '⚔ Physical ATK Bonus',
    Magic_ATK_Bonus:    '✨ Magic ATK Bonus',
    HP_Bonus:           '❤️ HP Bonus',
  };

  const rowsBuff = buffNeo.length === 0
    ? `<tr><td colspan="2" style="padding:4px 10px; color:#555; font-style:italic;">— belum ada poin / bonus 0%</td></tr>`
    : buffNeo.map(b => `
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
        🐾 NEOBEASTS MECHANIC · TIER ${hero.neobeasts_tier}
      </div>
      <div style="background:#ffffff08; border:1px solid ${accentColor}33; border-radius:6px; padding:8px 12px; margin-bottom:12px;">
        <div style="color:#ccc; font-size:0.78rem;">⭐ Poin Neobeasts (Global)</div>
        <div style="color:#fff; font-weight:bold; font-size:1.1rem; margin-top:2px;">${fmt(poin)} / 999</div>
        <div style="color:#666; font-size:0.7rem; margin-top:2px;">Diisi melalui popup saat klik 🔍 Cari Rekomendasi</div>
      </div>
      <div style="background:${accentColor}11; border:1px solid ${accentColor}33; border-radius:6px; padding:8px 12px; margin-bottom:12px; font-size:0.78rem; color:#aaa; line-height:1.8;">
        <div>🐾 Bonus per Poin (Tier ${hero.neobeasts_tier})</div>
        <div style="color:#fff;">
          ${fmt(poin)} poin × ${pct(POIN_MULTIPLIER[(hero.neobeasts_tier ?? 1) - 1] ?? 0)}
          = <b style="color:${accentColor};">+${pct(bonus)}</b>
        </div>
        <div style="margin-top:4px; color:#666; font-size:0.72rem;">Diterapkan ke Physical_ATK, Magic_ATK, dan HP</div>
      </div>
      <div style="border-top:1px solid ${accentColor}22; margin-bottom:10px;"></div>
      <div style="color:#d4af37; margin-bottom:5px;">📥 Buff Neobeasts diterima</div>
      <table style="width:100%; border-collapse:collapse; font-size:0.78rem;">
        <tbody>${rowsBuff}</tbody>
      </table>
    </div>
  `;
}

// ── EXPORT ────────────────────────────────────────────────────
export default {
  key:          'Neobeasts',
  targetFraksi: 'Neobeasts',
  tiers:         3,
  thresholds:   THRESHOLDS,
  global:       {},
  role_bonus:   {},
  handler,
  renderPanel:    (hero)            => renderNeobeastsPanel(hero),
  renderInputUI:  (container, list) => renderInputUI(container, list),
  collectInput:   ()                => collectInput(),
};
