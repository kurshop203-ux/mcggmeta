// ════════════════════════════════════════════════════════════════
// odette.js
// Data hero Odette — Astro Power Mage, kost 5 gold.
// Skill utama: Swan Song — delayed multihit 10x tick @0.5s,
// berbasis Magic_ATK. Memberikan shield flat saat cast.
// ════════════════════════════════════════════════════════════════

export const ODETTE = {

  // ── IDENTITAS HERO ───────────────────────────────────────────
  "fraksi": "Astro Power",  // Sinergi buff yang diterima hero ini
  "role":   "Mage",         // Role dalam tim (berpengaruh ke buff role)
  "gold":   5,              // Biaya deploy hero di papan

  // ── STAT DASAR (array per bintang: [★1, ★2, ★3]) ────────────
  "HP":           [3565, 6417, 44206],  // Total darah hero
  "Physical_ATK": [175,  265,  565],    // Serangan fisik dasar (tidak dipakai skill)
  "Magic_ATK":    [175,  265,  565],    // Serangan magic dasar (dipakai skill)
  "Jangkauan_ATK": 4,                   // Jangkauan serangan (4 = ranged)

  // ── MANA & REGEN ─────────────────────────────────────────────
  "Batas_Mana_Awal":    [60, 60, 20],  // Mana awal saat battle dimulai
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
  // Odette memukul menggunakan Physical_ATK murni (x1).
  // Magic_ATK multiplier 0 = tidak berkontribusi ke damage basic attack.
  "BASIC_ATK": {
    "formula": [
      { "ref": "Magic_ATK",    "multiplier": [0, 0, 0] },  // Tidak dipakai
      { "ref": "Physical_ATK", "multiplier": [1, 1, 1] }   // 100% Physical ATK
    ]
  },

  // ── SKILL DAMAGE ─────────────────────────────────────────────
  // Swan Song: Odette memancarkan 10 tick damage berbasis Magic_ATK.
  // Tiap tick terjadi setiap 0.5s. Saat cast juga memberikan shield flat.
  // Hit pertama langsung, hit ke-2 sampai ke-10 masuk pendingHits.
  "DMG_skill": {
    "formula": [
      { "ref": "Magic_ATK",    "multiplier": [0.95, 1.0, 3.5] },  // 95%/100%/350% Magic ATK per tick
      { "ref": "Physical_ATK", "multiplier": [0,    0,   0  ] }   // Tidak dipakai
    ],

    // ── SKILL HANDLER ─────────────────────────────────────────
    "skill_handler": {
      "type": "delayed_multihit",  // Hit pertama langsung; sisanya pending dengan delay

      "hit_count": 10,   // Total jumlah tick per cast
      "hit_delay":  0.5, // Jeda antar tick dalam detik (tick ke-2 di t+0.5, ke-3 di t+1.0, dst)

      // Shield flat diberikan saat cast (sebelum tick pertama):
      // [★1, ★2, ★3]: 500 / 900 / 9685 shield point
      "shield_flat": [500, 900, 9685],

      "label": "Swan Song (10x tick @0.5s, Shield flat)"
    }
  }
};
