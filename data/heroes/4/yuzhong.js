// ════════════════════════════════════════════════════════════════
// yuzhong.js
// Data hero Yu Zhong — Exorcist Bruiser, kost 4 gold.
// Skill utama: Dragon Soul ATK (multihit, 3 hit serentak).
// ════════════════════════════════════════════════════════════════

export const YU_ZHONG = {

  // ── IDENTITAS HERO ───────────────────────────────────────────
  "fraksi": "Exorcist",   // Sinergi buff yang diterima hero ini
  "role":   "Bruiser",    // Role dalam tim (berpengaruh ke buff role)
  "gold":   4,            // Biaya deploy hero di papan

  // ── STAT DASAR (array per bintang: [★1, ★2, ★3]) ────────────
  "HP":           [3545, 6380, 15770],  // Total darah hero
  "Physical_ATK": [180,  275,  395],    // Serangan fisik dasar
  "Magic_ATK":    [180,  275,  395],    // Serangan magic dasar (sama dengan Physical_ATK)
  "Jangkauan_ATK": 1,                   // Jangkauan serangan (1 = melee)

  // ── MANA & REGEN ─────────────────────────────────────────────
  "Batas_Mana_Awal":    [60, 60, 60],  // Mana awal saat battle dimulai
  "Batas_Mana":         [80, 80, 80],  // Mana maksimum untuk cast skill
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
  "ATK_Speed": [0.75, 0.75, 0.75],  // Serangan per detik

  // ── BASIC ATTACK ─────────────────────────────────────────────
  // Yu Zhong memukul menggunakan Physical_ATK murni (x1).
  // Magic_ATK multiplier 0 = tidak berkontribusi ke damage basic attack.
  "BASIC_ATK": {
    "formula": [
      { "ref": "Magic_ATK",    "multiplier": [0, 0, 0] },  // Tidak dipakai
      { "ref": "Physical_ATK", "multiplier": [1, 1, 1] }   // 100% Physical ATK
    ]
  },

  // ── SKILL DAMAGE ─────────────────────────────────────────────
  // Dragon Soul ATK: serangan skill berbasis Physical_ATK.
  // Formula dasar dipakai untuk preview stat; damage aktual per hit
  // dihitung ulang di simulate_battle via formula_by_cast.
  "DMG_skill": {
    "formula": [
      { "ref": "Magic_ATK",    "multiplier": [0,   0,   0  ] },  // Tidak dipakai
      { "ref": "Physical_ATK", "multiplier": [2.1, 2.1, 5.8] }   // 210%/210%/580% Physical ATK
    ],

    // ── SKILL HANDLER ─────────────────────────────────────────
    "skill_handler": {
      "type": "multihit",  // Skill menyerang beberapa kali per cast

      // Jumlah hit per cast (default, sebelum cast ke-3)
      "hits": 3,

      // Multiplier Physical_ATK per hit, berbeda tiap cast [★1, ★2, ★3]:
      //   Cast ke-1 & ke-2 : masing-masing 210% / 210% / 580%
      //   Cast ke-3+       : masing-masing 290% / 290% / 770%
      "formula_by_cast": [
        [2.1, 2.1, 5.8],  // Multiplier cast ke-1
        [2.1, 2.1, 5.8],  // Multiplier cast ke-2
        [2.9, 2.9, 7.7]   // Multiplier cast ke-3+ (Dragon Soul aktif)
      ],

      "label": "Dragon Soul ATK (3x serentak, cast 3+ pakai 290%)"
    }
  }
};
