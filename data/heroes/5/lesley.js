// ════════════════════════════════════════════════════════════════
// lesley.js
// Data hero Lesley — Mystic Meow Marksman, kost 5 gold.
// Skill utama: Ultimate Snipe — sequence 5 tembakan berurutan,
// tembakan pertama lebih kuat (200%/200%/1000%), sisanya lebih kecil.
// ════════════════════════════════════════════════════════════════

export const LESLEY = {

  // ── IDENTITAS HERO ───────────────────────────────────────────
  "fraksi": "Mystic Meow",  // Sinergi buff yang diterima hero ini
  "role":   "Marksman",     // Role dalam tim (berpengaruh ke buff role)
  "gold":   5,              // Biaya deploy hero di papan

  // ── STAT DASAR (array per bintang: [★1, ★2, ★3]) ────────────
  "HP":           [3565, 6417, 44206],  // Total darah hero
  "Physical_ATK": [265,  395,  850],    // Serangan fisik dasar (dipakai semua skill)
  "Magic_ATK":    [265,  395,  850],    // Serangan magic dasar (tidak dipakai)
  "Jangkauan_ATK": 18,                  // Jangkauan serangan (18 = sangat jauh, sniper)

  // ── MANA & REGEN ─────────────────────────────────────────────
  "Batas_Mana_Awal":    [20, 20, 20],  // Mana awal saat battle dimulai
  "Batas_Mana":         [40, 40, 40],  // Mana maksimum untuk cast skill
  "Mana_Regen_Per_Detik": 0,           // Regen mana per detik (0 = tidak ada regen pasif)

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
  "ATK_Speed": [0.5, 0.5, 0.5],  // Serangan per detik (lambat karena sniper)

  // ── BASIC ATTACK ─────────────────────────────────────────────
  // Lesley memukul menggunakan Physical_ATK murni (x1).
  // Magic_ATK multiplier 0 = tidak berkontribusi ke damage basic attack.
  "BASIC_ATK": {
    "formula": [
      { "ref": "Magic_ATK",    "multiplier": [0, 0, 0] },  // Tidak dipakai
      { "ref": "Physical_ATK", "multiplier": [1, 1, 1] }   // 100% Physical ATK
    ]
  },

  // ── SKILL DAMAGE ─────────────────────────────────────────────
  // Ultimate Snipe: 5 tembakan berurutan berbasis Physical_ATK.
  // Formula dasar di-set 0 karena damage dihitung seluruhnya via sequence steps.
  // Tiap step punya delay dan formula sendiri.
  "DMG_skill": {
    "formula": [
      { "ref": "Magic_ATK",    "multiplier": [0, 0, 0] },  // Tidak dipakai (damage via sequence)
      { "ref": "Physical_ATK", "multiplier": [0, 0, 0] }   // Tidak dipakai (damage via sequence)
    ],

    // ── SKILL HANDLER ─────────────────────────────────────────
    "skill_handler": {
      "type": "sequence",  // Efek bertahap, tiap step punya delay sendiri
      "label": "Lesley Ultimate Snipe",

      // 5 tembakan berurutan (semua delay 0 = serentak setelah cast):
      "sequence": [
        // Tembakan ke-1: paling kuat (delay 0.01s agar tercatat setelah trigger)
        { "delay": 0.01, "formula": [ { "ref": "Physical_ATK", "multiplier": [2.0, 2.0, 10.0] } ] },  // 200%/200%/1000%

        // Tembakan ke-2: peluru follow-up (delay 0 = serentak dengan tembakan sebelumnya)
        { "delay": 0, "formula": [ { "ref": "Physical_ATK", "multiplier": [1.0, 1.0, 2.0] } ] },      // 100%/100%/200%

        // Tembakan ke-3: peluru follow-up
        { "delay": 0, "formula": [ { "ref": "Physical_ATK", "multiplier": [1.0, 1.0, 2.0] } ] },      // 100%/100%/200%

        // Tembakan ke-4: peluru follow-up
        { "delay": 0, "formula": [ { "ref": "Physical_ATK", "multiplier": [1.0, 1.0, 2.0] } ] },      // 100%/100%/200%

        // Tembakan ke-5: peluru follow-up
        { "delay": 0, "formula": [ { "ref": "Physical_ATK", "multiplier": [1.0, 1.0, 2.0] } ] }       // 100%/100%/200%
      ]
    }
  }
};
