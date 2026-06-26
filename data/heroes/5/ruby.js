// ════════════════════════════════════════════════════════════════
// ruby.js
// Data hero Ruby — Exorcist Dauntless, kost 5 gold.
// Skill utama: multihit 2x berbasis Physical_ATK per cast.
// ════════════════════════════════════════════════════════════════

export const RUBY = {

  // ── IDENTITAS HERO ───────────────────────────────────────────
  "fraksi": "Exorcist",   // Sinergi buff yang diterima hero ini
  "role":   "Dauntless",  // Role dalam tim (berpengaruh ke buff role)
  "gold":   5,            // Biaya deploy hero di papan

  // ── STAT DASAR (array per bintang: [★1, ★2, ★3]) ────────────
  "HP":           [4335, 7805, 53760],  // Total darah hero
  "Physical_ATK": [230,  345,  740],    // Serangan fisik dasar
  "Magic_ATK":    [230,  345,  740],    // Serangan magic dasar (tidak dipakai skill)
  "Jangkauan_ATK": 1,                   // Jangkauan serangan (1 = melee)

  // ── MANA & REGEN ─────────────────────────────────────────────
  "Batas_Mana_Awal":    [80, 80, 20],   // Mana awal saat battle dimulai
  "Batas_Mana":         [100, 100, 80], // Mana maksimum untuk cast skill
  "Mana_Regen_Per_Detik": 0,            // Regen mana per detik (0 = tidak ada regen pasif)

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
  // Ruby memukul menggunakan Physical_ATK murni (x1).
  // Magic_ATK multiplier 0 = tidak berkontribusi ke damage basic attack.
  "BASIC_ATK": {
    "formula": [
      { "ref": "Magic_ATK",    "multiplier": [0, 0, 0] },  // Tidak dipakai
      { "ref": "Physical_ATK", "multiplier": [1, 1, 1] }   // 100% Physical ATK
    ]
  },

  // ── SKILL DAMAGE ─────────────────────────────────────────────
  // Skill Ruby adalah multihit 2x — menyerang dua kali per cast dengan Physical_ATK.
  // Kedua hit diproses serentak (tidak ada delay antar hit).
  // Total damage per cast = 2 x (160%/170%/500%) Physical ATK.
  "DMG_skill": {
    "formula": [
      { "ref": "Magic_ATK",    "multiplier": [0,   0,   0  ] },  // Tidak dipakai
      { "ref": "Physical_ATK", "multiplier": [1.6, 1.7, 5.0] }   // 160%/170%/500% Physical ATK per hit
    ],

    // ── SKILL HANDLER ─────────────────────────────────────────
    "skill_handler": {
      "type": "multihit",  // Skill menyerang beberapa kali per cast
      "hits": 2            // 2 hit per cast (serentak, tanpa delay)
    }
  }
};
