// ════════════════════════════════════════════════════════════════
// alpha.js
// Data hero Alpha — Emberlord Weapon Master, kost 5 gold.
// Skill utama: multihit dengan jumlah hit berbeda tiap cast.
// Cast ke-1 & ke-2: 2 hit. Cast ke-3+: 3 hit bonus dengan multiplier lebih besar.
// ════════════════════════════════════════════════════════════════

export const ALPHA = {

  // ── IDENTITAS HERO ───────────────────────────────────────────
  "fraksi": "Emberlord",     // Sinergi buff yang diterima hero ini
  "role":   "Weapon Master", // Role dalam tim (berpengaruh ke buff role)
  "gold":   5,               // Biaya deploy hero di papan

  // ── STAT DASAR (array per bintang: [★1, ★2, ★3]) ────────────
  "HP":           [4075, 7335, 50535],  // Total darah hero
  "Physical_ATK": [255,  385,  820],    // Serangan fisik dasar
  "Magic_ATK":    [255,  385,  820],    // Serangan magic dasar (sama dengan Physical_ATK)
  "Jangkauan_ATK": 1,                   // Jangkauan serangan (1 = melee)

  // ── MANA & REGEN ─────────────────────────────────────────────
  "Batas_Mana_Awal":    [20, 20, 20],  // Mana awal saat battle dimulai
  "Batas_Mana":         [60, 60, 60],  // Mana maksimum untuk cast skill
  "Mana_Regen_Per_Detik": 0,           // Regen mana per detik (0 = tidak ada regen pasif)

  // ── LIFESTEAL & SPELL VAMP ───────────────────────────────────
  "Lifesteal":  0,  // Lifesteal dari basic attack (0 = tidak ada)
  "Spell_Vamp": 0,  // Spell vamp dari skill (0 = tidak ada)

  // ── PENETRASI ─────────────────────────────────────────────────
  "Physical_Penetration": 0,  // Penetrasi armor fisik musuh
  "Magic_Penetration":    0,  // Penetrasi magic resist musuh

  // ── PERTAHANAN ───────────────────────────────────────────────
  "Magic_Def":    [36, 36, 36],  // Ketahanan terhadap serangan magic
  "Physical_Def": [36, 36, 36],  // Ketahanan terhadap serangan fisik

  // ── KECEPATAN SERANGAN ────────────────────────────────────────
  "ATK_Speed": [0.65, 0.65, 0.65],  // Serangan per detik

  // ── BASIC ATTACK ─────────────────────────────────────────────
  // Alpha memukul menggunakan Physical_ATK murni (x1).
  // Magic_ATK multiplier 0 = tidak berkontribusi ke damage basic attack.
  "BASIC_ATK": {
    "formula": [
      { "ref": "Magic_ATK",    "multiplier": [0, 0, 0] },  // Tidak dipakai
      { "ref": "Physical_ATK", "multiplier": [1, 1, 1] }   // 100% Physical ATK
    ]
  },

  // ── SKILL DAMAGE ─────────────────────────────────────────────
  // Skill Alpha berbasis Physical_ATK dengan jumlah hit yang berubah tiap cast.
  // Formula dasar = damage 1 hit untuk preview; simulate_battle hitung ulang per hit.
  "DMG_skill": {
    "formula": [
      { "ref": "Physical_ATK", "multiplier": [2, 2.2, 9] }  // 200%/220%/900% Physical ATK per hit
    ],

    // ── SKILL HANDLER ─────────────────────────────────────────
    "skill_handler": {
      "type": "multihit",  // Skill menyerang beberapa kali per cast

      // Jumlah hit untuk cast ke-1 dan ke-2
      "hits": 1,

      // Jumlah hit untuk cast ke-3 dan seterusnya (mode bonus aktif)
      "bonus_hits": 3,

      // Multiplier Physical_ATK khusus untuk hit bonus [★1, ★2, ★3]:
      // 110% / 115% / 470% Physical ATK per hit bonus
      "bonus_hits_multiplier": [1.1, 1.15, 4.7],

      // Hit bonus mulai berlaku ab cast ke berapa (cast ke-3 dst)
      "bonus_hits_from_cast": 3
    }
  }
};
