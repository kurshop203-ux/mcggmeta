// ════════════════════════════════════════════════════════════════
// ling.js
// Data hero Ling — Neobeasts Swiftblade, kost 5 gold.
// Mekanisme unik: dua fase berbeda dalam 1 battle.
//   Fase 1 (0–25s): di atas Skyscraper, mana regen sangat cepat (40/s),
//                   tidak bisa basic attack, skill = Skyscraper Strike.
//   Tepat t=25s  : Soaring Plume — hit tunggal damage besar.
//   Fase 2 (>25s): turun, basic attack normal, skill = tusukan.
// ════════════════════════════════════════════════════════════════

export const LING = {

  // ── IDENTITAS HERO ───────────────────────────────────────────
  "fraksi": "Neobeasts",   // Sinergi buff yang diterima hero ini
  "role":   "Swiftblade",  // Role dalam tim (berpengaruh ke buff role)
  "gold":   5,             // Biaya deploy hero di papan

  // ── STAT DASAR (array per bintang: [★1, ★2, ★3]) ────────────
  "HP":           [3670, 6600, 45480],  // Total darah hero
  "Physical_ATK": [240,  365,  580],    // Serangan fisik dasar
  "Magic_ATK":    [240,  365,  580],    // Serangan magic dasar (tidak dipakai skill)
  "Jangkauan_ATK": 1,                   // Jangkauan serangan (1 = melee)

  // ── MANA & REGEN ─────────────────────────────────────────────
  // Catatan: mana regen normal tidak relevan di fase 1 karena
  // simulate_battle menggunakan mana_regen_override dari passive_skyscraper.
  "Batas_Mana_Awal":    [70, 70, 70],  // Mana awal (sekaligus = Batas_Mana di fase 1, langsung penuh)
  "Batas_Mana":         [70, 70, 70],  // Mana maksimum untuk cast skill
  "Mana_Regen_Per_Detik": 0,           // Regen mana per detik (0 = tidak ada regen pasif; fase 1 pakai override)

  // ── LIFESTEAL & SPELL VAMP ───────────────────────────────────
  "Lifesteal":  0,  // 10% lifesteal dari basic attack
  "Spell_Vamp": 0,  // 10% spell vamp dari skill

  // ── PENETRASI ─────────────────────────────────────────────────
  "Physical_Penetration": 0,  // Penetrasi armor fisik musuh
  "Magic_Penetration":    0,  // Penetrasi magic resist musuh

  // ── PERTAHANAN ───────────────────────────────────────────────
  "Magic_Def":    [36, 36, 36],  // Ketahanan terhadap serangan magic
  "Physical_Def": [36, 36, 36],  // Ketahanan terhadap serangan fisik

  // ── KECEPATAN SERANGAN ────────────────────────────────────────
  "ATK_Speed": [0.75, 0.75, 0.75],  // Serangan per detik (aktif di fase 2 saja)

  // ── BASIC ATTACK ─────────────────────────────────────────────
  // Ling memukul menggunakan Physical_ATK murni (x1).
  // Hanya aktif di fase 2 (setelah t=25s); di fase 1 no_basic = true.
  "BASIC_ATK": {
    "formula": [
      { "ref": "Physical_ATK", "multiplier": [1, 1, 1] }  // 100% Physical ATK
    ]
  },

  // ── SKILL FASE 1: Skyscraper Strike (0–25s) ──────────────────
  // Skill Ling di atas Skyscraper — single hit berbasis Physical_ATK.
  // Multiplier [★1, ★2, ★3]: 150% / 160% / 230%
  "DMG_skill": {
    "formula": [
      { "ref": "Physical_ATK", "multiplier": [1.5, 1.6, 2.3] }  // 150%/160%/230% Physical ATK
    ]
  },

  // ── PASSIVE SKYSCRAPER ────────────────────────────────────────
  // Mekanisme khusus Ling: fase 1 berlangsung selama duration detik.
  // simulate_battle membaca blok ini untuk mengatur perilaku Ling.
  "passive_skyscraper": {
    "duration": 25,            // Durasi fase 1 dalam detik (0–25s)
    "mana_regen_override": 40, // Mana regen di fase 1 (sangat cepat, menggantikan Mana_Regen_Per_Detik)
    "no_basic": true,          // Di fase 1, Ling tidak bisa basic attack

    // ── Soaring Plume (tepat t=25s) ─────────────────────────────
    // Serangan transisi saat Ling turun dari Skyscraper.
    // Hanya terjadi sekali, tepat di momen pergantian fase.
    "soaring_plume": {
      "formula": [
        { "ref": "Physical_ATK", "multiplier": [3.8, 4.2, 12.25] }  // 380%/420%/1225% Physical ATK
      ]
    },

    // ── Skill Fase 2: Tusukan (>25s) ─────────────────────────────
    // Setelah Soaring Plume, skill Ling berubah menjadi tusukan.
    // Menggantikan DMG_skill di atas setelah fase 1 berakhir.
    "skill_phase2": {
      "formula": [
        { "ref": "Physical_ATK", "multiplier": [4.6, 5.0, 5.0] }  // 460%/500%/500% Physical ATK
      ]
    }
  }
};
