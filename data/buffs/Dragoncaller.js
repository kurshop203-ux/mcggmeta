// ════════════════════════════════════════════════════════════════
// Dragoncaller.js
// Buff sinergi fraksi Dragoncaller — mechanic Dragon DMG dari HP musuh.
//
// THRESHOLD : 2 / 4 / 6 nama unik hero fraksi Dragoncaller di grid
//
// CARA KERJA:
// 1. Cek level user → ambil HP musuh sesuai level dari ENEMY_HP_BY_LEVEL.
// 2. Hitung total Dragon DMG = HP musuh × Dragon_DMG_persen[tier]
// 3. Bagi rata ke semua unit Dragoncaller → tiap unit dapat Dragon_DMG_Flat
//    Dragon_DMG_Flat = (HP musuh × Dragon_DMG_persen) / jumlahUnit
// 4. Terapkan juga DMG_Bonus biasa (Dragoncaller_DMG_Bonus) ke semua unit.
//
// TIER BONUS:
//   Tier 1 (2 nama unik) → DMG_Bonus: 0%  | Dragon_DMG_persen: 24%
//   Tier 2 (4 nama unik) → DMG_Bonus: 15% | Dragon_DMG_persen: 36%
//   Tier 3 (6 nama unik) → DMG_Bonus: 45% | Dragon_DMG_persen: 60%
//
// CATATAN:
// - // - Level user dibaca dari window.userLevel (default: 3 jika tidak diset)
// - Dragon_DMG_Flat harus didaftarkan di BUFF_REGISTRY final_stats.js:
//     Dragon_DMG_Flat: { type: 'flat', targets: ['Dragon_DMG'] }
//   dan finalStats perlu punya field Dragon_DMG (base 0).
// ════════════════════════════════════════════════════════════════

// ── KONFIGURASI (PATCHABLE) ───────────────────────────────────
const DRAGONCALLER_DMG_BONUS = [0.00, 0.15, 0.45]; // % DMG_Bonus tiap tier
const DRAGON_DMG_PERSEN      = [0.24, 0.36, 0.60]; // % dari HP musuh tiap tier

// HP musuh berdasarkan level user
// Edit saat ada update game balance.
const ENEMY_HP_BY_LEVEL = {
  3:  8000,   // 2×1G + 1×2G
  4:  11000,  // 2×1G + 2×2G
  5:  14500,  // 2×1G + 2×2G + 1×3G
  6:  18500,  // 1×1G + 3×2G + 2×3G
  7:  23500,  // 1×1G + 2×2G + 3×3G + 1×4G
  8:  31000,  // 2×2G + 3×3G + 2×4G + 1×5G
  9:  38000,  // 1×2G + 3×3G + 3×4G + 2×5G
  10: 42500,  // 1×2G + 3×3G + 4×4G + 2×5G
};
// SESUDAH:
const DEFAULT_LEVEL = 3; // fallback jika userLevel belum diset

// ── HANDLER UTAMA ─────────────────────────────────────────────
function handler({ heroList, qualifying, tierIndex }) {
  const dmgBonus      = DRAGONCALLER_DMG_BONUS[tierIndex];
  const dragonPersen  = DRAGON_DMG_PERSEN[tierIndex];
  const jumlahUnit    = qualifying.length;

  // ── 1. Ambil level user & HP musuh ──
  const userLevel  = window.userLevel ?? DEFAULT_LEVEL;
  // Clamp ke range yang tersedia (3–10)
  const levelClamped = Math.min(10, Math.max(3, userLevel));
  const enemyHP    = ENEMY_HP_BY_LEVEL[levelClamped] ?? ENEMY_HP_BY_LEVEL[DEFAULT_LEVEL];

  // ── 2. Hitung Dragon DMG flat per unit ──
  // Total dragon DMG = enemyHP × dragonPersen
  // Dibagi rata ke semua unit Dragoncaller
  const totalDragonDmg    = enemyHP * dragonPersen;
  const dragonDmgPerUnit  = totalDragonDmg / jumlahUnit;

  // ── 3. Terapkan buff ke semua unit Dragoncaller ──
  qualifying.forEach(hero => {
    // DMG_Bonus (buff % biasa)
    if (dmgBonus > 0) {
      if (hero.buffs.DMG_Bonus === undefined) hero.buffs.DMG_Bonus = 0;
      hero.buffs.DMG_Bonus += dmgBonus;
      hero.buffLog.push({
        source: 'Dragoncaller',
        scope: 'handler',
        stat: 'DMG_Bonus',
        value: dmgBonus,
      });
    }

    // Dragon_DMG_Flat (stat baru — harus ada di BUFF_REGISTRY)
    if (hero.buffs.Dragon_DMG_Flat === undefined) hero.buffs.Dragon_DMG_Flat = 0;
    hero.buffs.Dragon_DMG_Flat += dragonDmgPerUnit;
    hero.buffLog.push({
      source: 'Dragoncaller',
      scope: 'handler',
      stat: 'Dragon_DMG_Flat',
      value: dragonDmgPerUnit,
    });

    // Simpan metadata untuk UI / panel
    hero.dragoncaller_user_level    = levelClamped;
    hero.dragoncaller_enemy_hp      = enemyHP;
    hero.dragoncaller_dragon_persen = dragonPersen;
    hero.dragoncaller_total_dmg     = totalDragonDmg;
    hero.dragoncaller_dmg_per_unit  = dragonDmgPerUnit;
    hero.dragoncaller_jumlah_unit   = jumlahUnit;
    hero.dragoncaller_tier          = tierIndex + 1;
  });
}


// ════════════════════════════════════════════════════════════════
// PATCH final_stats.js — tambahkan 2 hal berikut:
// ════════════════════════════════════════════════════════════════

// ── PATCH 1: Tambah di finalStats (dalam calculateFinalStats) ──
// Cari baris terakhir di objek finalStats (misal setelah Batas_Mana),
// tambahkan field baru:
//
//   Dragon_DMG: 0,   // ← tambah ini
//
// Contoh setelah patch:
//   const finalStats = {
//     HP: ...,
//     ...
//     Batas_Mana: getBaseValue(...),
//     Dragon_DMG: 0,   // ← field baru untuk Dragoncaller
//   };


// ── PATCH 2: Tambah di BUFF_REGISTRY (dalam calculateFinalStats) ──
// Cari bagian BUFF_REGISTRY, tambahkan entry baru di bagian "Flat":
//
//   Dragon_DMG_Flat: { type: 'flat', targets: ['Dragon_DMG'] },
//
// Contoh setelah patch (letakkan setelah HP_Flat):
//   HP_Flat:          { type: 'flat', targets: ['HP'] },
//   Dragon_DMG_Flat:  { type: 'flat', targets: ['Dragon_DMG'] },  // ← tambah ini


// ════════════════════════════════════════════════════════════════
// renderDragoncallerPanel
// Tambahkan fungsi ini ke final_stats.js, lalu export-kan.
// Dipanggil dari showBuffDetail() di find_combo.js.
// ════════════════════════════════════════════════════════════════

export function renderDragoncallerPanel(hero) {
  // Hanya tampilkan untuk hero Dragoncaller yang sudah diproses handler
  if (!hero.fraksi.includes('Dragoncaller')) return '';
  if (hero.dragoncaller_tier === undefined) return '';

  const fmt = n => Math.round(n).toLocaleString('id-ID');
  const pct = n => `${Math.round(n * 100)}%`;

  const {
    dragoncaller_tier:        tier,
    dragoncaller_user_level:  userLevel,
    dragoncaller_enemy_hp:    enemyHP,
    dragoncaller_dragon_persen: dragonPersen,
    dragoncaller_total_dmg:   totalDmg,
    dragoncaller_dmg_per_unit: dmgPerUnit,
    dragoncaller_jumlah_unit: jumlahUnit,
  } = hero;

  // Buff Dragoncaller dari buffLog
  const buffDragoncaller = (hero.buffLog || []).filter(b => b.source === 'Dragoncaller');

  const STAT_LABEL = {
    DMG_Bonus:      '🔥 DMG Bonus',
    Dragon_DMG_Flat:'🐉 Dragon DMG Flat',
  };

  const rowsBuff = buffDragoncaller.length === 0
    ? `<tr><td colspan="2" style="padding:4px 10px; color:#555; font-style:italic;">— tidak ada buff</td></tr>`
    : buffDragoncaller.map(b => {
        const isFlat = b.stat === 'Dragon_DMG_Flat';
        return `
          <tr style="border-bottom:1px solid #1a1f28;">
            <td style="padding:3px 10px; color:#aaa; white-space:nowrap;">
              ${STAT_LABEL[b.stat] ?? b.stat}
            </td>
            <td style="padding:3px 10px; color:#e67e22; font-weight:bold;">
              ${isFlat ? `+${fmt(b.value)}` : `+${pct(b.value)}`}
            </td>
          </tr>`;
      }).join('');

  return `
    <div style="
      margin-bottom: 14px;
      padding: 12px 14px;
      background: linear-gradient(135deg, #1a0d00, #0f1218);
      border: 1px solid #e67e2255;
      border-left: 3px solid #e67e22;
      border-radius: 8px;
      font-family: 'Share Tech Mono', monospace;
      font-size: 0.8rem;
    ">
      <!-- Header -->
      <div style="color:#e67e22; font-size:0.95rem; font-weight:bold; margin-bottom:10px; letter-spacing:1px;">
        🐉 DRAGONCALLER MECHANIC · TIER ${tier}
      </div>

      <!-- Info level & enemy HP -->
      <div style="
        display:grid; grid-template-columns:1fr 1fr;
        gap:6px; margin-bottom:12px;
      ">
        <div style="background:#ffffff08; border-radius:5px; padding:6px 10px;">
          <div style="color:#666; font-size:0.72rem;">Level User</div>
          <div style="color:#fff; font-weight:bold; font-size:0.9rem;">Lv. ${userLevel}</div>
        </div>
        <div style="background:#ffffff08; border-radius:5px; padding:6px 10px;">
          <div style="color:#666; font-size:0.72rem;">HP Musuh</div>
          <div style="color:#e74c3c; font-weight:bold; font-size:0.9rem;">${fmt(enemyHP)}</div>
        </div>
      </div>

      <!-- Formula kalkulasi -->
      <div style="
        background:#e67e2211; border:1px solid #e67e2233;
        border-radius:6px; padding:8px 12px; margin-bottom:12px;
        font-size:0.78rem; color:#aaa; line-height:1.8;
      ">
        <div>🐉 Total Dragon DMG</div>
        <div style="color:#fff;">
          ${fmt(enemyHP)} × ${pct(dragonPersen)}
          = <b style="color:#e67e22;">${fmt(totalDmg)}</b>
        </div>
        <div style="margin-top:4px;">📤 Dibagi ${jumlahUnit} unit</div>
        <div style="color:#fff;">
          ${fmt(totalDmg)} ÷ ${jumlahUnit}
          = <b style="color:#e67e22;">${fmt(dmgPerUnit)} / unit</b>
        </div>
      </div>

      <!-- Divider -->
      <div style="border-top:1px solid #e67e2222; margin-bottom:10px;"></div>

      <!-- Buff yang diterima -->
      <div style="color:#d4af37; margin-bottom:5px;">📥 Buff Dragoncaller diterima</div>
      <table style="width:100%; border-collapse:collapse; font-size:0.78rem;">
        <tbody>${rowsBuff}</tbody>
      </table>
    </div>
  `;
}


// ── EXPORT ────────────────────────────────────────────────────
export default {
  key:          'Dragoncaller',
  targetFraksi: 'Dragoncaller',
  tiers:         3,
  thresholds:   [2, 4, 6],
  global:       {},
  role_bonus:   {},
  handler,
  renderPanel: (hero) => renderDragoncallerPanel(hero), // ← tambah ini
};