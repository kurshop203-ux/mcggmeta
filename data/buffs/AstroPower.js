// ════════════════════════════════════════════════════════════════
// AstroPower.js
// Buff sinergi fraksi Astro Power — mechanic Sovereign pilihan user.
//
// THRESHOLD : 2 / 4 / 6 nama unik hero fraksi Astro Power di grid
//
// CARA KERJA:
// 1. Saat CARI diklik, user memilih 1 hero Astro Power sebagai Sovereign.
// 2. Semua hero Astro Power dapat Astro_DMG_Bonus.
// 3. Hero Sovereign dapat buff tambahan:
//    - Sovereign_DMG_Bonus
//    - Sovereign_Lifesteal
//    - Sovereign_Spell_Vamp
//
// TIER BONUS:
//   Tier 1 (2 unik) → Astro: 10% | Sovereign DMG: 20% | LS/SV: 5%
//   Tier 2 (4 unik) → Astro: 20% | Sovereign DMG: 40% | LS/SV: 10%
//   Tier 3 (6 unik) → Astro: 30% | Sovereign DMG: 80% | LS/SV: 15%
// ════════════════════════════════════════════════════════════════

// ── KONFIGURASI (PATCHABLE) ───────────────────────────────────
const ASTRO_DMG_BONUS      = [0.10, 0.20, 0.30];
const SOVEREIGN_DMG_BONUS  = [0.20, 0.40, 0.80];
const SOVEREIGN_LIFESTEAL  = [0.05, 0.10, 0.15];
const SOVEREIGN_SPELL_VAMP = [0.05, 0.10, 0.15];
const THRESHOLDS           = [2, 4, 6];

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
  const astroDmgBonus     = ASTRO_DMG_BONUS[tierIndex];
  const sovereignDmgBonus = SOVEREIGN_DMG_BONUS[tierIndex];
  const sovereignLS       = SOVEREIGN_LIFESTEAL[tierIndex];
  const sovereignSV       = SOVEREIGN_SPELL_VAMP[tierIndex];

  // ── 1. Terapkan Astro_DMG_Bonus ke semua hero Astro Power ──
  qualifying.forEach(hero => {
    if (hero.buffs.DMG_Bonus === undefined) hero.buffs.DMG_Bonus = 0;
    hero.buffs.DMG_Bonus += astroDmgBonus;
    hero.buffLog.push({ source: 'Astro Power', scope: 'handler', stat: 'DMG_Bonus', value: astroDmgBonus });

    hero.astropower_is_sovereign = false;
    hero.astropower_tier         = tierIndex + 1;
    hero.astropower_total_skor   = 0;
  });

  // ── 2. Cari hero Sovereign dari pilihan user ──
  const pilihanLabel = window.astropowerSovereignLabel;
  let heroSovereign = qualifying.find(h => (h.label ?? h.name) === pilihanLabel);

  // Fallback: kalau pilihan tidak ditemukan, pakai hero pertama
  if (!heroSovereign) heroSovereign = qualifying[0];
  if (!heroSovereign) return;

  // ── 3. Terapkan Sovereign buff ke hero pilihan ──
  heroSovereign.buffs.DMG_Bonus += sovereignDmgBonus;
  heroSovereign.buffLog.push({ source: 'Astro Power (Sovereign)', scope: 'handler', stat: 'DMG_Bonus', value: sovereignDmgBonus });

  if (heroSovereign.buffs.Lifesteal_Bonus === undefined) heroSovereign.buffs.Lifesteal_Bonus = 0;
  heroSovereign.buffs.Lifesteal_Bonus += sovereignLS;
  heroSovereign.buffLog.push({ source: 'Astro Power (Sovereign)', scope: 'handler', stat: 'Lifesteal_Bonus', value: sovereignLS });

  if (heroSovereign.buffs.Spell_Vamp_Bonus === undefined) heroSovereign.buffs.Spell_Vamp_Bonus = 0;
  heroSovereign.buffs.Spell_Vamp_Bonus += sovereignSV;
  heroSovereign.buffLog.push({ source: 'Astro Power (Sovereign)', scope: 'handler', stat: 'Spell_Vamp_Bonus', value: sovereignSV });

  heroSovereign.astropower_is_sovereign  = true;
  heroSovereign.astropower_sovereign_dmg = sovereignDmgBonus;
  heroSovereign.astropower_sovereign_ls  = sovereignLS;
  heroSovereign.astropower_sovereign_sv  = sovereignSV;
}

// ── MODAL REGISTRASI ──────────────────────────────────────────
// Guard: kode ini cuma boleh jalan di main thread (browser).
// Tanpa guard, baris document.addEventListener() di bawah ini
// dieksekusi langsung saat modul di-import — termasuk saat
// diimpor di dalam Web Worker (combo_worker.js), di mana
// `document` tidak ada → ReferenceError: document is not defined.
if (typeof document !== 'undefined') {
  document.addEventListener('cari:register-modals', ({ detail: { heroList } }) => {
    const qualifying = heroList.filter(h => toArray(h.fraksi).includes('Astro Power'));
    const uniqueCount = new Set(qualifying.map(h => h.name)).size;

    const tierIndex = getActiveTierIndex(uniqueCount, THRESHOLDS);
    if (tierIndex === -1) return;

    window.__registerModalQueue((_, next) => {
      showAstroPowerSovereignModal(qualifying, tierIndex, next);
    });
  });
}

function showAstroPowerSovereignModal(qualifying, tierIndex, onConfirm) {
  const modal   = document.getElementById('detail-modal');
  const content = document.getElementById('detail-modal-content');
  if (!modal || !content) { onConfirm(); return; }

  // Kalau hanya 1 unit, tidak perlu pilih
  if (qualifying.length === 1) {
    window.astropowerSovereignLabel = qualifying[0].label ?? qualifying[0].name;
    onConfirm();
    return;
  }

  content.style.maxHeight = '80vh';
  content.style.overflowY = 'auto';
  content.style.paddingRight = '6px';

  const accentColor    = '#a855f7';
  const currentPilihan = window.astropowerSovereignLabel ?? '';
  const starsStr       = n => '★'.repeat(n) + '☆'.repeat(3 - n);

  const optionCards = qualifying.map(h => {
    const label      = h.label ?? h.name;
    const isSelected = label === currentPilihan;
    return `
      <div
        class="astropower-option-card"
        data-label="${label}"
        style="
          padding:10px 14px; margin-bottom:8px; cursor:pointer;
          background:${isSelected ? accentColor + '22' : '#ffffff08'};
          border:2px solid ${isSelected ? accentColor : '#333'};
          border-radius:6px; transition:border-color 0.15s;
        "
      >
        <div style="font-weight:bold; color:${isSelected ? accentColor : '#fff'};">${label}</div>
        <div style="font-size:0.75rem; color:#999; margin-top:2px;">
          ${starsStr(h.stars)} · ${toArray(h.role).join(', ') || '-'}
        </div>
      </div>
    `;
  }).join('');

  content.innerHTML = `
    <h3 style="margin-top:0; color:${accentColor};">🌌 Pilih Sovereign — Astro Power Tier ${tierIndex + 1}</h3>
    <div style="font-size:0.8rem; color:#999; margin-bottom:14px;">
      Pilih 1 hero Astro Power yang akan menjadi <b style="color:#fff;">Sovereign</b>.
      Hero ini mendapat buff DMG, Lifesteal, dan Spell Vamp tambahan.
    </div>
    <div id="astropower-option-list">${optionCards}</div>
    <button id="astropower-confirm-btn" style="
      width:100%; padding:10px 16px; margin-top:10px;
      background:${accentColor}; color:#0f1218;
      border:none; border-radius:6px; cursor:pointer;
      font-weight:bold; font-family:'Share Tech Mono', monospace;
      font-size:0.9rem; text-transform:uppercase; letter-spacing:1px;
      opacity:${currentPilihan ? 1 : 0.4};
    " ${currentPilihan ? '' : 'disabled'}>▶ Lanjut</button>
  `;

  modal.style.display = 'flex';

  let selected = currentPilihan;

  document.getElementById('astropower-option-list').addEventListener('click', e => {
    const card = e.target.closest('.astropower-option-card');
    if (!card) return;
    selected = card.dataset.label;

    document.querySelectorAll('.astropower-option-card').forEach(c => {
      const isThis = c.dataset.label === selected;
      c.style.background  = isThis ? accentColor + '22' : '#ffffff08';
      c.style.borderColor = isThis ? accentColor : '#333';
      c.querySelector('div').style.color = isThis ? accentColor : '#fff';
    });

    const btn = document.getElementById('astropower-confirm-btn');
    btn.disabled = false;
    btn.style.opacity = '1';
  });

  document.getElementById('astropower-confirm-btn').onclick = () => {
    if (!selected) return;
    window.astropowerSovereignLabel = selected;
    modal.style.display = 'none';
    onConfirm();
  };
}

// ── RENDER PANEL ──────────────────────────────────────────────
export function renderAstroPowerPanel(hero) {
  if (!toArray(hero.fraksi).includes('Astro Power')) return '';
  if (hero.astropower_tier === undefined) return '';

  const fmt = n => Math.round(n).toLocaleString('id-ID');
  const pct = n => `${Math.round(n * 100)}%`;

  const isSovereign = hero.astropower_is_sovereign === true;
  const accentColor = isSovereign ? '#a855f7' : '#6366f1';
  const bgGradient  = isSovereign
    ? 'linear-gradient(135deg, #150a2a, #0f1218)'
    : 'linear-gradient(135deg, #0d0f1f, #0f1218)';

  const buffAstro = (hero.buffLog || []).filter(b => b.source?.startsWith('Astro Power'));
  const STAT_LABEL = {
    DMG_Bonus:        '🔥 DMG Bonus',
    Lifesteal_Bonus:  '🩸 Lifesteal',
    Spell_Vamp_Bonus: '💫 Spell Vamp',
  };

  const rowsBuff = buffAstro.length === 0
    ? `<tr><td colspan="2" style="padding:4px 10px; color:#555; font-style:italic;">— tidak ada buff</td></tr>`
    : buffAstro.map(b => `
        <tr style="border-bottom:1px solid #1a1f28;">
          <td style="padding:3px 10px; color:#aaa; white-space:nowrap;">
            ${STAT_LABEL[b.stat] ?? b.stat}
            ${b.source === 'Astro Power (Sovereign)' ? '<span style="color:#a855f7; font-size:0.7rem;"> ★ Sovereign</span>' : ''}
          </td>
          <td style="padding:3px 10px; color:${b.source === 'Astro Power (Sovereign)' ? '#a855f7' : accentColor}; font-weight:bold;">
            +${pct(b.value)}
          </td>
        </tr>`).join('');

  const sovereignSection = isSovereign ? `
    <div style="background:#a855f711; border:1px solid #a855f733; border-radius:6px; padding:8px 12px; margin-bottom:12px; font-size:0.78rem;">
      <div style="color:#a855f7; font-weight:bold; margin-bottom:6px;">★ Buff Sovereign Eksklusif</div>
      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px;">
        <div style="text-align:center;">
          <div style="color:#666; font-size:0.7rem;">DMG Bonus</div>
          <div style="color:#a855f7; font-weight:bold;">+${pct(hero.astropower_sovereign_dmg ?? 0)}</div>
        </div>
        <div style="text-align:center;">
          <div style="color:#666; font-size:0.7rem;">Lifesteal</div>
          <div style="color:#e74c3c; font-weight:bold;">+${pct(hero.astropower_sovereign_ls ?? 0)}</div>
        </div>
        <div style="text-align:center;">
          <div style="color:#666; font-size:0.7rem;">Spell Vamp</div>
          <div style="color:#9b59b6; font-weight:bold;">+${pct(hero.astropower_sovereign_sv ?? 0)}</div>
        </div>
      </div>
    </div>
  ` : '';

  return `
    <div style="
      margin-bottom:14px; padding:12px 14px;
      background:${bgGradient};
      border:1px solid ${accentColor}55; border-left:3px solid ${accentColor};
      border-radius:8px; font-family:'Share Tech Mono',monospace; font-size:0.8rem;
    ">
      <div style="color:${accentColor}; font-size:0.95rem; font-weight:bold; margin-bottom:10px; letter-spacing:1px;">
        🌌 ASTRO POWER · TIER ${hero.astropower_tier}
      </div>
      <div style="
        display:inline-block;
        background:${isSovereign ? '#a855f722' : '#55555522'};
        border:1px solid ${isSovereign ? '#a855f7' : '#555'};
        border-radius:4px; padding:4px 10px;
        color:${isSovereign ? '#a855f7' : '#888'};
        font-weight:bold; margin-bottom:10px;
      ">${isSovereign ? '★ SOVEREIGN — Hero Pilihan' : 'Hero Astro Power'}</div>

      ${sovereignSection}

      <div style="border-top:1px solid ${accentColor}22; margin-bottom:10px;"></div>

      <div style="color:#d4af37; margin-bottom:5px;">📥 Buff Astro Power diterima</div>
      <table style="width:100%; border-collapse:collapse; font-size:0.78rem;">
        <tbody>${rowsBuff}</tbody>
      </table>
    </div>
  `;
}

// ── EXPORT ────────────────────────────────────────────────────
export default {
  key:          'AstroPower',
  targetFraksi: 'Astro Power',
  tiers:         3,
  thresholds:   THRESHOLDS,
  global:       {},
  role_bonus:   {},
  handler,
  renderPanel: (hero) => renderAstroPowerPanel(hero), // ← tambah ini

};
