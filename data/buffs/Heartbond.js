// ════════════════════════════════════════════════════════════════
// Heartbond.js
// Buff sinergi fraksi Heartbond — mechanic Pairing berdasarkan skor.
//
// THRESHOLD : 2 / 4 / 6 nama unik hero fraksi Heartbond di grid
//
// CARA KERJA PAIRING:
// 1. Semua buff sinergi lain diterapkan duluan (Heartbond didaftarkan
//    setelah sinergi biasa di database_buff.js).
// 2. Handler jalankan simulateBattle 40s untuk tiap unit Heartbond,
//    lalu urutkan dari skor TERTINGGI → TERENDAH.
// 3. Pasangkan secara berurutan: rank 1 ↔ rank 2, rank 3 ↔ rank 4, dst.
//    Jika jumlah unit ganjil → unit terakhir (skor terendah) = Unpaired (jomblo).
// 4. PAIRED heroes mendapat buff lebih besar + Heal.
//    UNPAIRED hero mendapat buff lebih kecil, tanpa Heal.
//
// TIER BONUS:
//   Tier 1 (2 nama unik) → Paired: 10% | Unpaired: 5%
//   Tier 2 (4 nama unik) → Paired: 20% | Unpaired: 10%
//   Tier 3 (6 nama unik) → Paired: 70% | Unpaired: 35%
// ════════════════════════════════════════════════════════════════

import { getScoreSync, buildCacheKey } from '../../cache/cache_manager.js';

// ── KONFIGURASI (PATCHABLE) ───────────────────────────────────
// Edit nilai di sini saat ada update game, tidak perlu ubah logic.
const PAIRED_ATK_BONUS   = [0.10, 0.20, 0.70]; // % Physical_ATK & Magic_ATK untuk hero paired
const PAIRED_HP_BONUS    = [0.10, 0.20, 0.70]; // % MAX HP untuk hero paired
const PAIRED_HEAL        = [0.45, 0.45, 0.45]; // % HP sebagai Heal untuk hero paired (flat per tier)
const UNPAIRED_ATK_BONUS = [0.05, 0.10, 0.35]; // % Physical_ATK & Magic_ATK untuk hero unpaired
const UNPAIRED_HP_BONUS  = [0.05, 0.10, 0.35]; // % MAX HP untuk hero unpaired
const DURASI_BATTLE      = 40;                  // detik simulasi untuk menghitung skor

// ── HITUNG TOTAL SKOR UNIT ────────────────────────────────────
// Dipakai untuk menentukan urutan pairing.
// total skor = total damage basic attack + total damage skill + HP
function hitungTotalSkor(sim) {
  return (
    (sim.basicAtk?.totalDmg || 0) +
    (sim.skill?.totalDmg    || 0) +
    (sim.finalStats?.HP     || 0)
  );
}

// ── HANDLER UTAMA ─────────────────────────────────────────────
// Dipanggil otomatis oleh applyAllBuffs() setelah semua sinergi lain selesai.
function handler({ heroList, qualifying, tierIndex }) {
  const pairedAtkBonus   = PAIRED_ATK_BONUS[tierIndex];
  const pairedHpBonus    = PAIRED_HP_BONUS[tierIndex];
  const pairedHeal       = PAIRED_HEAL[tierIndex];
  const unpairedAtkBonus = UNPAIRED_ATK_BONUS[tierIndex];
  const unpairedHpBonus  = UNPAIRED_HP_BONUS[tierIndex];

  // ── 1. Jalankan simulateBattle untuk tiap unit Heartbond ──
  //    Kumpulkan skor tiap unit untuk keperluan pairing
  qualifying.forEach(hero => { hero.heartbond_tier = tierIndex + 1; });

const unitDenganSkor = qualifying.map(hero => {
    const cached    = getScoreSync(buildCacheKey(hero));
    const totalSkor = cached ? (cached.damageTotal + cached.sustainTotal) : 0;
    hero.heartbond_total_skor = totalSkor;
    return { hero, totalSkor };
  });

  // ── 2. Urutkan dari skor TERTINGGI → TERENDAH ──
  unitDenganSkor.sort((a, b) => b.totalSkor - a.totalSkor);

  // ── 3. Tentukan pasangan ──
  // rank 1 ↔ rank 2, rank 3 ↔ rank 4, dst.
  // Jika ganjil → unit terakhir = unpaired
  const pasangan = []; // array of [unitA, unitB]
  for (let i = 0; i + 1 < unitDenganSkor.length; i += 2) {
    pasangan.push([unitDenganSkor[i], unitDenganSkor[i + 1]]);
  }
  const unitJomblo = unitDenganSkor.length % 2 !== 0
    ? unitDenganSkor[unitDenganSkor.length - 1]
    : null;

  // ── 4. Terapkan buff ke PAIRED heroes ──
  pasangan.forEach(([unitA, unitB], pairIndex) => {
    const labelA = unitA.hero.label ?? unitA.hero.name;
    const labelB = unitB.hero.label ?? unitB.hero.name;
    const nomorPasangan = pairIndex + 1;

    [unitA, unitB].forEach(unit => {
      const hero    = unit.hero;
      const partner = unit === unitA ? unitB : unitA;
      const labelPartner = partner.hero.label ?? partner.hero.name;

      // Physical_ATK_Bonus
      if (hero.buffs.Physical_ATK_Bonus === undefined) hero.buffs.Physical_ATK_Bonus = 0;
      hero.buffs.Physical_ATK_Bonus += pairedAtkBonus;
      hero.buffLog.push({
        source: `Heartbond (Pasangan ${nomorPasangan} bersama ${labelPartner})`,
        scope: 'handler', stat: 'Physical_ATK_Bonus', value: pairedAtkBonus,
      });

      // Magic_ATK_Bonus
      if (hero.buffs.Magic_ATK_Bonus === undefined) hero.buffs.Magic_ATK_Bonus = 0;
      hero.buffs.Magic_ATK_Bonus += pairedAtkBonus;
      hero.buffLog.push({
        source: `Heartbond (Pasangan ${nomorPasangan} bersama ${labelPartner})`,
        scope: 'handler', stat: 'Magic_ATK_Bonus', value: pairedAtkBonus,
      });

      // MAX_HP_Percent_Bonus
      if (hero.buffs.MAX_HP_Percent_Bonus === undefined) hero.buffs.MAX_HP_Percent_Bonus = 0;
      hero.buffs.MAX_HP_Percent_Bonus += pairedHpBonus;
      hero.buffLog.push({
        source: `Heartbond (Pasangan ${nomorPasangan} bersama ${labelPartner})`,
        scope: 'handler', stat: 'MAX_HP_Percent_Bonus', value: pairedHpBonus,
      });

      // Heal_Percent_HP
      if (hero.buffs.Heal_Percent_HP === undefined) hero.buffs.Heal_Percent_HP = 0;
      hero.buffs.Heal_Percent_HP += pairedHeal;
      hero.buffLog.push({
        source: `Heartbond (Pasangan ${nomorPasangan} bersama ${labelPartner})`,
        scope: 'handler', stat: 'Heal_Percent_HP', value: pairedHeal,
      });

      // Simpan metadata pairing untuk UI
      hero.heartbond_status   = 'paired';
      hero.heartbond_partner  = labelPartner;
      hero.heartbond_pair_no  = nomorPasangan;
      hero.heartbond_rank     = unitDenganSkor.indexOf(unit) + 1;
    });
  });

  // ── 5. Terapkan buff ke UNPAIRED hero ──
  if (unitJomblo) {
    const hero = unitJomblo.hero;

    // Physical_ATK_Bonus
    if (hero.buffs.Physical_ATK_Bonus === undefined) hero.buffs.Physical_ATK_Bonus = 0;
    hero.buffs.Physical_ATK_Bonus += unpairedAtkBonus;
    hero.buffLog.push({
      source: 'Heartbond (Tidak berpasangan)',
      scope: 'handler', stat: 'Physical_ATK_Bonus', value: unpairedAtkBonus,
    });

    // Magic_ATK_Bonus
    if (hero.buffs.Magic_ATK_Bonus === undefined) hero.buffs.Magic_ATK_Bonus = 0;
    hero.buffs.Magic_ATK_Bonus += unpairedAtkBonus;
    hero.buffLog.push({
      source: 'Heartbond (Tidak berpasangan)',
      scope: 'handler', stat: 'Magic_ATK_Bonus', value: unpairedAtkBonus,
    });

    // MAX_HP_Percent_Bonus
    if (hero.buffs.MAX_HP_Percent_Bonus === undefined) hero.buffs.MAX_HP_Percent_Bonus = 0;
    hero.buffs.MAX_HP_Percent_Bonus += unpairedHpBonus;
    hero.buffLog.push({
      source: 'Heartbond (Tidak berpasangan)',
      scope: 'handler', stat: 'MAX_HP_Percent_Bonus', value: unpairedHpBonus,
    });

    // Simpan metadata untuk UI
    hero.heartbond_status = 'unpaired';
    hero.heartbond_rank   = unitDenganSkor.length;
  }
}



export function renderHeartbondPanel(hero) {
  // Tampilkan panel hanya untuk hero fraksi Heartbond yang sudah diproses handler
  if (!hero.fraksi.includes('Heartbond')) return '';
  if (hero.heartbond_status === undefined) return '';
 
  const fmt   = n => Math.round(n).toLocaleString('id-ID');
  const pct   = n => `${Math.round(n * 100)}%`;
  const isPaired = hero.heartbond_status === 'paired';
 
  // ── Warna tema per status ──
  const accentColor = isPaired ? '#e91e8c' : '#888888'; // pink = paired, abu = jomblo
  const bgGradient  = isPaired
    ? 'linear-gradient(135deg, #1a0010, #0f1218)'
    : 'linear-gradient(135deg, #111318, #0f1218)';
 
  // ── Badge status ──
  const badgeLabel = isPaired
    ? `💞 PASANGAN ${hero.heartbond_pair_no} · bersama ${hero.heartbond_partner}`
    : `💔 TIDAK BERPASANGAN (Jomblo)`;
  const badgeColor = isPaired ? '#e91e8c' : '#666';
 
  // ── Kumpulkan buff Heartbond yang diterima (dari buffLog) ──
  const buffHeartbond = (hero.buffLog || []).filter(b => b.source?.startsWith('Heartbond'));
 
  const STAT_LABEL = {
    Physical_ATK_Bonus:  '⚔ Physical ATK Bonus',
    Magic_ATK_Bonus:     '✨ Magic ATK Bonus',
    MAX_HP_Percent_Bonus:'💚 MAX HP Bonus',
    Heal_Percent_HP:     '🩹 Heal % HP',
  };
 
  const rowsBuff = buffHeartbond.length === 0
    ? `<tr><td colspan="2" style="padding:4px 10px; color:#555; font-style:italic;">— tidak ada buff</td></tr>`
    : buffHeartbond.map(b => `
        <tr style="border-bottom:1px solid #1a1f28;">
          <td style="padding:3px 10px; color:#aaa; white-space:nowrap;">
            ${STAT_LABEL[b.stat] ?? b.stat}
          </td>
          <td style="padding:3px 10px; color:${isPaired ? '#e91e8c' : '#999'}; font-weight:bold;">
            +${pct(b.value)}
          </td>
        </tr>`).join('');
 
  // ── Info pasangan (hanya untuk paired) ──
  const partnerSection = isPaired ? `
    <div style="
      display:flex; align-items:center; gap:10px;
      background:#ffffff08; border:1px solid ${accentColor}33;
      border-radius:6px; padding:8px 12px; margin-bottom:12px;
    ">
      <div style="font-size:1.4rem;">💞</div>
      <div>
        <div style="color:#ccc; font-size:0.78rem;">Pasangan</div>
        <div style="color:#fff; font-weight:bold; font-size:0.9rem;">${hero.heartbond_partner}</div>
      </div>
    </div>
  ` : `
    <div style="
      background:#ffffff08; border:1px solid #44444455;
      border-radius:6px; padding:8px 12px; margin-bottom:12px;
      color:#666; font-size:0.8rem; font-style:italic;
    ">
      💔 Unit ini tidak memiliki pasangan karena jumlah hero Heartbond ganjil.
      Hanya mendapat buff separuh dan tidak mendapat Heal.
    </div>
  `;
 
  return `
    <div style="
      margin-bottom: 14px;
      padding: 12px 14px;
      background: ${bgGradient};
      border: 1px solid ${accentColor}55;
      border-left: 3px solid ${accentColor};
      border-radius: 8px;
      font-family: 'Share Tech Mono', monospace;
      font-size: 0.8rem;
    ">
      <!-- Header -->
      <div style="color:${accentColor}; font-size:0.95rem; font-weight:bold; margin-bottom:10px; letter-spacing:1px;">
        💞 HEARTBOND MECHANIC
      </div>
 
      <!-- Badge status paired / jomblo -->
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
 
      <!-- Skor simulasi unit ini -->
      <div style="color:#aaa; margin-bottom:12px;">
        📊 Skor Simulasi 40s: <b style="color:#fff;">${fmt(hero.heartbond_total_skor ?? 0)}</b>
        <span style="color:#555; font-size:0.72rem;">(rank #${hero.heartbond_rank} di antara unit Heartbond)</span>
      </div>
 
      <!-- Info pasangan -->
      ${partnerSection}
 
      <!-- Divider -->
      <div style="border-top:1px solid ${accentColor}22; margin-bottom:10px;"></div>
 
      <!-- Buff yang diterima -->
      <div style="color:#d4af37; margin-bottom:5px;">📥 Buff Heartbond diterima</div>
      <table style="width:100%; border-collapse:collapse; font-size:0.78rem;">
        <tbody>${rowsBuff}</tbody>
      </table>
    </div>
  `;
}




// ── EXPORT ────────────────────────────────────────────────────
export default {
  key:          'Heartbond',
  targetFraksi: 'Heartbond',
  tiers:         3,
  thresholds:   [2, 4, 6],
  global:       {},
  role_bonus:   {},
  handler,
  renderPanel: (hero) => renderHeartbondPanel(hero), // ← tambah ini
};