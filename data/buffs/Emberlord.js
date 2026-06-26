// ════════════════════════════════════════════════════════════════
// Emberlord.js
// Buff sinergi role Emberlord — mechanic kematian bertahap.
//
// THRESHOLD : 2 / 4 / 6 nama unik hero role Emberlord di grid
// TIER BONUS:
//   Tier 1 (2 nama unik) → 20%
//   Tier 2 (4 nama unik) → 25%
//   Tier 3 (6 nama unik) → 35%
//
// CARA KERJA:
// 1. Semua buff sinergi lain sudah diterapkan duluan (Emberlord didaftarkan TERAKHIR
//    di database_buff.js), jadi stat tiap unit sudah include buff sinergi lain.
// 2. Handler hitung total value tiap unit Emberlord dari finalStats
//    (Physical_ATK + Magic_ATK + HP + Physical_Def + Magic_Def)
// 3. Urutkan dari total value TERENDAH → TERTINGGI (terendah mati duluan)
// 4. Hitung interval kematian = 40 detik / jumlah unit Emberlord
// 5. Tiap unit mati → unit yang masih hidup dapat buff flat dari stat unit mati:
//    - Physical_ATK_Flat += Physical_ATK_mati × tier%
//    - Magic_ATK_Flat    += Magic_ATK_mati × tier%
//    - Heal              += 25% × HP_mati (satu kali saat mati)
// 6. Stack maksimal 5x — kematian ke-6 dst diabaikan
// 7. Unit terakhir selalu selamat (simulasi 40 detik selesai duluan)
//
// CATATAN TEKNIS:
// - Buff real-time TIDAK di-push ke hero.buffs (agar tidak masuk stat awal simulasi)
// - Buff real-time disimpan di hero.scheduled_events[].onTrigger
// - simulateBattle akan jalankan onTrigger saat waktunya tiba → recalc damage otomatis
// - Data untuk UI panel disimpan di hero.emberlord_buff_diterima / buff_diberikan
// ════════════════════════════════════════════════════════════════

import { calculateFinalStats }         from '../../engine/stat_utils.js';
import { getScoreSync, buildCacheKey } from '../../cache/cache_manager.js';

// ── KONFIGURASI (PATCHABLE) ───────────────────────────────────
const TIER_BONUS    = [0.20, 0.25, 0.35];
const HEAL_PERSEN   = 0.25;
const MAX_STACK     = 5;
const DURASI_BATTLE = 40;

// ── HITUNG TOTAL VALUE UNIT ───────────────────────────────────
function hitungTotalValue(finalStats) {
  return (
    (finalStats.Physical_ATK  || 0) +
    (finalStats.Magic_ATK     || 0) +
    (finalStats.HP            || 0) +
    (finalStats.Physical_Def  || 0) +
    (finalStats.Magic_Def     || 0)
  );
}

// ── HANDLER UTAMA ─────────────────────────────────────────────
function handler({ heroList, qualifying, tierIndex }) {
  const bonusPersen = TIER_BONUS[tierIndex];

  // ── 1. Hitung finalStats tiap unit ──
const unitDenganStats = qualifying.map(hero => {
    const baseData = (typeof window !== 'undefined' ? window : globalThis).ALL_HEROES?.[hero.name];
    if (!baseData) return { hero, finalStats: null, totalValue: 0 };
    // Ranking pakai cache fase 1 — no calculateFinalStats untuk urutan kematian
    const cached     = getScoreSync(buildCacheKey(hero));
    const totalValue = cached ? (cached.damageTotal + cached.sustainTotal) : 0;
    // calculateFinalStats tetap dibutuhkan untuk hitung nilai buff kematian
    const hasil = calculateFinalStats(hero, baseData);
    return { hero, finalStats: hasil.finalStats, totalValue };
  });

  // ── 2. Urutkan terendah → tertinggi (terendah mati duluan) ──
  unitDenganStats.sort((a, b) => a.totalValue - b.totalValue);

  const jumlahUnit = unitDenganStats.length;
  const interval   = DURASI_BATTLE / jumlahUnit;

  // ── 3. Inisialisasi tracking data per hero ──
  unitDenganStats.forEach((unit, index) => {
    unit.hero.emberlord_jumlah_unit    = jumlahUnit;
    unit.hero.emberlord_urutan         = index + 1;
    unit.hero.emberlord_tier           = tierIndex + 1;
    unit.hero.emberlord_is_active      = true;  // ← tandai semua hero Emberlord aktif
    unit.hero.emberlord_buff_diterima  = [];
    unit.hero.emberlord_buff_diberikan = [];
    unit.hero.scheduled_events         = unit.hero.scheduled_events || [];
  });

  // ── 4. Hitung dan distribusi buff kematian ──
  let stackCount = 0;

  // Tracking akumulasi flat per unit untuk hitung buff berantai
  const flatDiterima = unitDenganStats.map(() => ({ Physical_ATK_Flat: 0, Magic_ATK_Flat: 0 }));

  unitDenganStats.forEach((unitMati, indexMati) => {
    if (indexMati === jumlahUnit - 1) return; // unit terakhir tidak pernah mati
    if (stackCount >= MAX_STACK) return;
    stackCount++;

    const fs = unitMati.finalStats;
    if (!fs) return;

    const namaMati       = unitMati.hero.label ?? unitMati.hero.name;
    const jumlahPenerima = jumlahUnit - indexMati - 1;
    const waktuKematian  = interval * (indexMati + 1);

    // Hitung buff dari stat unit mati (sudah termasuk buff yang diterimanya sebelum mati)
    const physATKSaatMati = (fs.Physical_ATK || 0) + flatDiterima[indexMati].Physical_ATK_Flat;
    const magATKSaatMati  = (fs.Magic_ATK    || 0) + flatDiterima[indexMati].Magic_ATK_Flat;
    const buffPhysATK     = physATKSaatMati * bonusPersen;
    const buffMagATK      = magATKSaatMati  * bonusPersen;
    const heal            = (fs.HP           || 0) * HEAL_PERSEN;

    // Catat buff_diberikan untuk UI panel unit yang mati
    unitMati.hero.emberlord_buff_diberikan.push(
      { stat: 'Physical_ATK_Flat', value: buffPhysATK, ke: jumlahPenerima },
      { stat: 'Magic_ATK_Flat',    value: buffMagATK,  ke: jumlahPenerima },
      { stat: 'Heal_Percent_HP',   value: heal,        ke: jumlahPenerima },
    );

    // Terapkan ke semua unit yang masih hidup
    for (let i = indexMati + 1; i < jumlahUnit; i++) {
      const unitHidup = unitDenganStats[i].hero;

      // Akumulasi untuk hitung buff berantai
      flatDiterima[i].Physical_ATK_Flat += buffPhysATK;
      flatDiterima[i].Magic_ATK_Flat    += buffMagATK;

      // ── Catat untuk UI panel ──
      unitHidup.emberlord_buff_diterima.push(
        { dari: namaMati, stat: 'Physical_ATK_Flat', value: buffPhysATK },
        { dari: namaMati, stat: 'Magic_ATK_Flat',    value: buffMagATK  },
        { dari: namaMati, stat: 'Heal_Percent_HP',   value: heal        },
      );

      // ── Push ke scheduled_events dengan onTrigger ──
      // simulateBattle akan jalankan ini real-time saat waktunya tiba.
      // TIDAK ada push ke hero.buffs — buff ini murni real-time.
      const _buffPhysATK = buffPhysATK; // capture untuk closure
      const _buffMagATK  = buffMagATK;
      const _heal        = heal;
unitHidup.scheduled_events.push({
  waktu: waktuKematian,
  _deterministic: true,
  onTrigger: (currentBuffs) => ({
    ...currentBuffs,
    Physical_ATK_Flat: (currentBuffs.Physical_ATK_Flat || 0) + _buffPhysATK,
    Magic_ATK_Flat:    (currentBuffs.Magic_ATK_Flat    || 0) + _buffMagATK,
    Heal_Percent_HP:   (currentBuffs.Heal_Percent_HP   || 0) + _heal,
  }),
});
    }
  });

  // ── 5. Catat waktu kematian tiap unit ──
  unitDenganStats.forEach((unit, index) => {
    unit.hero.emberlord_waktu_mati = index === jumlahUnit - 1
      ? DURASI_BATTLE
      : interval * (index + 1);
  });
}


// ── RENDER PANEL EMBERLORD ────────────────────────────────────
export function renderEmberlordPanel(hero) {
  if (!hero.fraksi.includes('Emberlord')) return '';
  if (hero.emberlord_urutan === undefined) return '';

  const urutan        = hero.emberlord_urutan;
  const waktuMati     = hero.emberlord_waktu_mati;
  const totalUnit     = hero.emberlord_jumlah_unit ?? '?';
  const isSelamat     = waktuMati >= 40;
  const buffDiterima  = hero.emberlord_buff_diterima  ?? [];
  const buffDiberikan = hero.emberlord_buff_diberikan ?? [];

  const STAT_ICON = {
    Physical_ATK_Flat: '⚔',
    Magic_ATK_Flat:    '✨',
    Heal_Percent_HP:   '💚',
  };

  const badgeColor = isSelamat ? '#27ae60' : urutan === 1 ? '#e74c3c' : '#f39c12';
  const badgeLabel = isSelamat
    ? `🛡 SELAMAT (unit ke-${urutan} dari ${totalUnit})`
    : `💀 Mati ke-${urutan} dari ${totalUnit}`;

  const rowsDiterima = buffDiterima.length === 0
    ? `<tr><td colspan="3" style="padding:4px 10px; color:#555; font-style:italic;">— belum ada (mati paling duluan)</td></tr>`
    : buffDiterima.map(b => `
        <tr style="border-bottom:1px solid #1a1f28;">
          <td style="padding:3px 10px; color:#d4af37; white-space:nowrap;">${b.dari}</td>
          <td style="padding:3px 10px; color:#888; white-space:nowrap;">${STAT_ICON[b.stat] ?? '•'} ${b.stat}</td>
          <td style="padding:3px 10px; color:#27ae60; font-weight:bold;">+${Math.round(b.value)}</td>
        </tr>`).join('');

  const rowsDiberikan = isSelamat
    ? `<tr><td colspan="3" style="padding:4px 10px; color:#555; font-style:italic;">— unit selamat, tidak memberikan buff kematian</td></tr>`
    : buffDiberikan.length === 0
      ? `<tr><td colspan="3" style="padding:4px 10px; color:#555; font-style:italic;">— tidak ada data</td></tr>`
      : buffDiberikan.map(b => `
          <tr style="border-bottom:1px solid #1a1f28;">
            <td style="padding:3px 10px; color:#888; white-space:nowrap;">${STAT_ICON[b.stat] ?? '•'} ${b.stat}</td>
            <td style="padding:3px 10px; color:#e74c3c; font-weight:bold;">+${Math.round(b.value)}</td>
            <td style="padding:3px 10px; color:#666; font-size:0.75rem;">→ ${b.ke} unit</td>
          </tr>`).join('');

  const round2 = n => Math.round(n * 100) / 100;

  return `
    <div style="
      margin-bottom: 14px;
      padding: 12px 14px;
      background: linear-gradient(135deg, #1a0a00, #0f1218);
      border: 1px solid #b7410e55;
      border-left: 3px solid #b7410e;
      border-radius: 8px;
      font-family: 'Share Tech Mono', monospace;
      font-size: 0.8rem;
    ">
      <div style="color:#ff6b35; font-size:0.95rem; font-weight:bold; margin-bottom:10px; letter-spacing:1px;">
        🔥 EMBERLORD MECHANIC
      </div>
      <div style="
        display: inline-block;
        background: ${badgeColor}22;
        border: 1px solid ${badgeColor}88;
        border-radius: 4px;
        padding: 4px 10px;
        color: ${badgeColor};
        font-weight: bold;
        margin-bottom: 10px;
      ">${badgeLabel}</div>
      <div style="color:#aaa; margin-bottom:12px;">
        ⏱ Simulasi dihitung sampai:
        <b style="color:#fff;">${isSelamat ? '40.00' : round2(waktuMati)} detik</b>
        ${isSelamat ? '<span style="color:#27ae60; font-size:0.75rem;">(selamat sampai akhir)</span>' : ''}
      </div>
      <div style="color:#d4af37; margin-bottom:5px;">📥 Buff DITERIMA (dari unit yang mati sebelum ini)</div>
      <table style="width:100%; border-collapse:collapse; margin-bottom:12px; font-size:0.78rem;">
        <thead>
          <tr style="border-bottom:1px solid #2a3040; color:#555;">
            <th style="padding:3px 10px; text-align:left;">Dari</th>
            <th style="padding:3px 10px; text-align:left;">Stat</th>
            <th style="padding:3px 10px; text-align:left;">Nilai</th>
          </tr>
        </thead>
        <tbody>${rowsDiterima}</tbody>
      </table>
      <div style="color:#d4af37; margin-bottom:5px;">📤 Buff DIBERIKAN ke unit lain setelah mati</div>
      <table style="width:100%; border-collapse:collapse; font-size:0.78rem;">
        <thead>
          <tr style="border-bottom:1px solid #2a3040; color:#555;">
            <th style="padding:3px 10px; text-align:left;">Stat</th>
            <th style="padding:3px 10px; text-align:left;">Nilai</th>
            <th style="padding:3px 10px; text-align:left;">Penerima</th>
          </tr>
        </thead>
        <tbody>${rowsDiberikan}</tbody>
      </table>
    </div>
  `;
}


// ── EXPORT ────────────────────────────────────────────────────
export default {
  key:          'Emberlord',
  targetFraksi: 'Emberlord',
  tiers:         3,
  thresholds:   [2, 4, 6],
  global:       {},
  role_bonus:   {},
  handler,
  renderPanel: (hero) => renderEmberlordPanel(hero), // ← tambah ini
};