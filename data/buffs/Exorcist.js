// ════════════════════════════════════════════════════════════════
// Exorcist.js
// Buff sinergi fraksi Exorcist — mechanic Phantom dari hero pilihan user.
//
// THRESHOLD : 2 / 4 / 6 nama unik hero fraksi Exorcist di grid
//
// TIER BONUS (ke semua hero Exorcist):
//   Tier 1 (2 nama unik) → DMG_Bonus: 0%,  MAX_HP_Percent_Bonus: 0%
//   Tier 2 (4 nama unik) → DMG_Bonus: 10%, MAX_HP_Percent_Bonus: 10%
//   Tier 3 (6 nama unik) → DMG_Bonus: 20%, MAX_HP_Percent_Bonus: 20%
//
// CARA KERJA PHANTOM:
// 1. Saat CARI diklik, user memilih 1 hero Exorcist sebagai Phantom template.
// 2. Handler membaca pilihan dari window.exorcistTemplateLabel.
// 3. Dari hero template itu (pakai simulateBattle):
//    - Phantom HP  = MAX_HP × 15% × jumlahUnit
//    - Phantom Phys DMG = Skill_Phys_TOTAL × multiplier[tier] × jumlahUnit
//    - Phantom Mag  DMG = Skill_Mag_TOTAL  × multiplier[tier] × jumlahUnit
// 4. Data Phantom disimpan ke semua hero Exorcist sebagai `exorcist_phantom`.
// ════════════════════════════════════════════════════════════════

import { simulateBattle, splitEventsDmg } from '../../engine/simulate_battle.js';

// ── KONFIGURASI (PATCHABLE) ───────────────────────────────────
const DMG_BONUS              = [0.00, 0.10, 0.20];
const MAX_HP_PERCENT_BONUS   = [0.00, 0.10, 0.20];
const PHANTOM_DMG_MULTIPLIER = [0.30, 0.60, 1.25];
const PHANTOM_HP_PERSEN      = 0.15;
const DURASI_BATTLE          = 40;
const THRESHOLDS             = [2, 4, 6];

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
  const dmgBonus             = DMG_BONUS[tierIndex];
  const maxHpBonus           = MAX_HP_PERCENT_BONUS[tierIndex];
  const phantomDmgMultiplier = PHANTOM_DMG_MULTIPLIER[tierIndex];
  const jumlahUnit           = qualifying.length;

  // ── 1. Terapkan buff ke semua hero Exorcist ──
  qualifying.forEach(hero => {
    if (hero.buffs.DMG_Bonus === undefined) hero.buffs.DMG_Bonus = 0;
    hero.buffs.DMG_Bonus += dmgBonus;
    hero.buffLog.push({ source: 'Exorcist', scope: 'handler', stat: 'DMG_Bonus', value: dmgBonus });

    if (hero.buffs.MAX_HP_Percent_Bonus === undefined) hero.buffs.MAX_HP_Percent_Bonus = 0;
    hero.buffs.MAX_HP_Percent_Bonus += maxHpBonus;
    hero.buffLog.push({ source: 'Exorcist', scope: 'handler', stat: 'MAX_HP_Percent_Bonus', value: maxHpBonus });
  });

  // ── 2. Cari hero template dari pilihan user ──
  const pilihanLabel = window.exorcistTemplateLabel;
  let heroTemplate = qualifying.find(h => (h.label ?? h.name) === pilihanLabel);

  // Fallback: kalau pilihan tidak ditemukan, pakai hero pertama
  if (!heroTemplate) heroTemplate = qualifying[0];
  if (!heroTemplate) return;

// ── 3. Simulasi hero template → hitung Phantom stat ──
const baseData = window.ALL_HEROES?.[heroTemplate.name];
if (!baseData) return;

const sim = simulateBattle(heroTemplate, baseData, DURASI_BATTLE);
heroTemplate.exorcist_total_skor = (sim.basicAtk?.totalDmg || 0) + (sim.skill?.totalDmg || 0) + (sim.finalStats?.HP || 0);

const maxHPTerkuat = sim.finalStats?.HP || 0;

// Kumpulkan semua hit dari cast pertama saja
const skillEvents = sim.timeline.filter(e => e.type === 'skill');
const cast1Events = [];
let firstHitSeen  = false;
let cast1Time     = -1;

// Ambil cast_duration dari baseData (0 kalau tidak ada)
const castDuration = baseData.DMG_skill?.skill_handler?.cast_duration ?? 0;

for (const e of skillEvents) {
  const isFirstHit = (e.hitIndex === 1 || !e.hitIndex);

  if (!firstHitSeen && isFirstHit) {
    // Cast pertama dimulai
    firstHitSeen = true;
    cast1Time    = e.time;
  }

  if (!firstHitSeen) continue;

  if (castDuration > 0) {
    // Pakai cast_duration sebagai batas cast pertama
    if (e.time <= cast1Time + castDuration + 0.001) {
      cast1Events.push(e);
    } else {
      break; // sudah lewat durasi cast pertama
    }
  } else {
    // Tidak ada cast_duration → pakai logika hitIndex seperti sebelumnya
    if (isFirstHit && e.time > cast1Time) break;
    cast1Events.push(e);
  }
}

const skillPhysTotal = splitEventsDmg(cast1Events, 'Physical');
const skillMagTotal  = splitEventsDmg(cast1Events, 'Magic');

const phantomHP      = maxHPTerkuat * PHANTOM_HP_PERSEN * jumlahUnit;
const phantomPhysDmg = skillPhysTotal * phantomDmgMultiplier * jumlahUnit;
const phantomMagDmg  = skillMagTotal  * phantomDmgMultiplier * jumlahUnit;

  // ── 4. Simpan data Phantom ke semua hero Exorcist ──
  const phantomData = {
    dari_hero:        heroTemplate.label ?? heroTemplate.name,
    total_skor:       heroTemplate.exorcist_total_skor,
    tier:             tierIndex + 1,
    jumlah_unit:      jumlahUnit,
    max_hp_terkuat:   maxHPTerkuat,
    skill_phys_total: skillPhysTotal,
    skill_mag_total:  skillMagTotal,
    phantom_hp:       phantomHP,
    phantom_phys_dmg: phantomPhysDmg,
    phantom_mag_dmg:  phantomMagDmg,
    phantom_dmg_multiplier: phantomDmgMultiplier,
  };

  qualifying.forEach(hero => {
    hero.exorcist_phantom = phantomData;
    // Inisialisasi skor untuk hero non-template (tidak disimulasi)
    if (hero.exorcist_total_skor === undefined) hero.exorcist_total_skor = 0;
  });
}

// ── INLINE INPUT UI ───────────────────────────────────────────
export function renderInputUI(container, heroList) {
  const qualifying  = heroList.filter(h => toArray(h.fraksi).includes('Exorcist'));
  const uniqueCount = new Set(qualifying.map(h => h.name)).size;
  const tierIndex   = getActiveTierIndex(uniqueCount, THRESHOLDS);
  if (tierIndex === -1) return;

  const accentColor    = '#4a90d9';
  const currentPilihan = window.exorcistTemplateLabel ?? '';
  const starsStr       = n => '★'.repeat(n) + '☆'.repeat(3 - n);

  const section = document.createElement('div');
  section.id = 'exorcist-input-section';
  section.style.cssText = `
    border:1px solid ${accentColor}44;
    border-left:3px solid ${accentColor};
    border-radius:6px; padding:10px 12px; margin-top:8px;
    background:${accentColor}08;
  `;

  // Auto-select kalau hanya 1 hero
  if (qualifying.length === 1) {
    const label = qualifying[0].label ?? qualifying[0].name;
    section.innerHTML = `
      <div style="color:${accentColor}; font-size:0.8rem; font-weight:bold; margin-bottom:6px;">
        👻 Exorcist Tier ${tierIndex + 1} — Phantom Template
      </div>
      <div style="font-size:0.78rem; color:#aaa;">
        ⭐ <b style="color:#fff;">${label}</b> otomatis dipilih sebagai Phantom Template.
      </div>
      <input type="hidden" id="exorcist-template-input" value="${label}">
    `;
    container.appendChild(section);
    return;
  }

  const optionCards = qualifying.map(h => {
    const label      = h.label ?? h.name;
    const isSelected = label === currentPilihan;
    return `
      <div class="exorcist-option-card" data-label="${label}" style="
        padding:8px 12px; margin-bottom:6px; cursor:pointer;
        background:${isSelected ? accentColor + '22' : '#ffffff08'};
        border:2px solid ${isSelected ? accentColor : '#333'};
        border-radius:6px; transition:border-color 0.15s;
      ">
        <div style="font-weight:bold; color:${isSelected ? accentColor : '#fff'}; font-size:0.82rem;">${label}</div>
        <div style="font-size:0.72rem; color:#999; margin-top:2px;">
          ${starsStr(h.stars)} · ${toArray(h.role).join(', ') || '-'}
        </div>
      </div>
    `;
  }).join('');

  section.innerHTML = `
    <div style="color:${accentColor}; font-size:0.8rem; font-weight:bold; margin-bottom:8px;">
      👻 Pilih Phantom Template — Exorcist Tier ${tierIndex + 1}
    </div>
    <div id="exorcist-option-list">${optionCards}</div>
  `;

  container.appendChild(section);

  // Tracking state lokal via data attribute agar bisa dibaca collectInput
  let selected = currentPilihan;

  section.querySelector('#exorcist-option-list').addEventListener('click', e => {
    const card = e.target.closest('.exorcist-option-card');
    if (!card) return;
    selected = card.dataset.label;

    section.querySelectorAll('.exorcist-option-card').forEach(c => {
      const isThis = c.dataset.label === selected;
      c.style.background  = isThis ? accentColor + '22' : '#ffffff08';
      c.style.borderColor = isThis ? accentColor : '#333';
      c.querySelector('div').style.color = isThis ? accentColor : '#fff';
    });

    // Tandai card terpilih dengan data attribute supaya collectInput bisa baca
    section.querySelectorAll('.exorcist-option-card').forEach(c => c.removeAttribute('data-selected'));
    card.setAttribute('data-selected', 'true');
  });

  // Tandai pre-selected (jika ada)
  if (currentPilihan) {
    const preCard = section.querySelector(`.exorcist-option-card[data-label="${CSS.escape(currentPilihan)}"]`);
    if (preCard) preCard.setAttribute('data-selected', 'true');
  }
}

export function collectInput() {
  const section = document.getElementById('exorcist-input-section');
  if (!section) return true; // buff tidak aktif

  // Kasus auto-select (hidden input)
  const hidden = section.querySelector('#exorcist-template-input');
  if (hidden) {
    window.exorcistTemplateLabel = hidden.value;
    return true;
  }

  // Baca dari card bertanda data-selected
  const selectedCard = section.querySelector('.exorcist-option-card[data-selected="true"]');
  if (!selectedCard) return false; // wajib pilih

  window.exorcistTemplateLabel = selectedCard.dataset.label;
  return true;
}

// ── RENDER PANEL ──────────────────────────────────────────────
export function renderExorcistPanel(hero) {
  if (!toArray(hero.fraksi).includes('Exorcist')) return '';
  if (!hero.exorcist_phantom) return '';

  const p   = hero.exorcist_phantom;
  const fmt = n => Math.round(n).toLocaleString('id-ID');
  const pct = n => `${Math.round(n * 100)}%`;

  const isTemplate = (hero.label ?? hero.name) === p.dari_hero;

  const rowsBuffExorcist = `
    <tr style="border-bottom:1px solid #1a1f28;">
      <td style="padding:3px 10px; color:#4a90d9; white-space:nowrap;">DMG_Bonus</td>
      <td style="padding:3px 10px; color:#27ae60; font-weight:bold;">+${pct(hero.buffs?.DMG_Bonus ?? 0)}</td>
    </tr>
    <tr style="border-bottom:1px solid #1a1f28;">
      <td style="padding:3px 10px; color:#4a90d9; white-space:nowrap;">MAX_HP_Percent_Bonus</td>
      <td style="padding:3px 10px; color:#27ae60; font-weight:bold;">+${pct(hero.buffs?.MAX_HP_Percent_Bonus ?? 0)}</td>
    </tr>
  `;

  return `
    <div style="
      margin-bottom: 14px; padding: 12px 14px;
      background: linear-gradient(135deg, #001a2e, #0f1218);
      border: 1px solid #4a90d955; border-left: 3px solid #4a90d9;
      border-radius: 8px; font-family: 'Share Tech Mono', monospace; font-size: 0.8rem;
    ">
      <div style="color:#4a90d9; font-size:0.95rem; font-weight:bold; margin-bottom:10px; letter-spacing:1px;">
        👻 EXORCIST · TIER ${p.tier}
      </div>
      <div style="
        display:inline-block;
        background: ${isTemplate ? '#4a90d922' : '#ffffff11'};
        border: 1px solid ${isTemplate ? '#4a90d9' : '#444'};
        border-radius:4px; padding:4px 10px;
        color:${isTemplate ? '#4a90d9' : '#888'};
        font-weight:bold; margin-bottom:10px;
      ">${isTemplate ? '⭐ HERO INI PHANTOM TEMPLATE' : `Template: ${p.dari_hero}`}</div>

      <div style="color:#d4af37; margin-bottom:5px;">📥 Buff Exorcist diterima</div>
      <table style="width:100%; border-collapse:collapse; margin-bottom:12px; font-size:0.78rem;">
        <tbody>${rowsBuffExorcist}</tbody>
      </table>

      <div style="border-top:1px solid #1a2a3a; margin-bottom:10px;"></div>

      <div style="color:#d4af37; margin-bottom:5px;">
        👻 PHANTOM STAT
        <span style="color:#555; font-size:0.72rem;">
          (× ${p.jumlah_unit} unit · DMG × ${pct(p.phantom_dmg_multiplier)})
        </span>
      </div>
      <table style="width:100%; border-collapse:collapse; font-size:0.78rem;">
        <tbody>
          <tr style="border-bottom:1px solid #1a1f28;">
            <td style="padding:3px 10px; color:#999;">👻 Phantom HP</td>
            <td style="padding:3px 10px; color:#27ae60; font-weight:bold;">${fmt(p.phantom_hp)}</td>
            <td style="padding:3px 10px; color:#555; font-size:0.72rem;">${fmt(p.max_hp_terkuat)} × 15% × ${p.jumlah_unit}</td>
          </tr>
          <tr style="border-bottom:1px solid #1a1f28;">
            <td style="padding:3px 10px; color:#999;">⚔ Phantom Phys DMG</td>
            <td style="padding:3px 10px; color:#e74c3c; font-weight:bold;">${fmt(p.phantom_phys_dmg)}</td>
            <td style="padding:3px 10px; color:#555; font-size:0.72rem;">${fmt(p.skill_phys_total)} × ${pct(p.phantom_dmg_multiplier)} × ${p.jumlah_unit}</td>
          </tr>
          <tr>
            <td style="padding:3px 10px; color:#999;">✨ Phantom Mag DMG</td>
            <td style="padding:3px 10px; color:#9b59b6; font-weight:bold;">${fmt(p.phantom_mag_dmg)}</td>
            <td style="padding:3px 10px; color:#555; font-size:0.72rem;">${fmt(p.skill_mag_total)} × ${pct(p.phantom_dmg_multiplier)} × ${p.jumlah_unit}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

// ── EXPORT ────────────────────────────────────────────────────
export default {
  key:          'Exorcist',
  targetFraksi: 'Exorcist',
  tiers:         3,
  thresholds:   THRESHOLDS,
  global:       {},
  role_bonus:   {},
  handler,
  renderPanel:   (hero) => renderExorcistPanel(hero),
  renderInputUI: (container, heroList) => renderInputUI(container, heroList),
  collectInput:  () => collectInput(),
};
