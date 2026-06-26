// ════════════════════════════════════════════════════════════════
// lancelot.js
// Data hero Lancelot — Kishin Phasewarper, kost 5 gold.
// Skill utama: Phantom Execution — multihit dengan jumlah hit
// yang bertambah tiap cast (1 hit → 2 hit → 4 hit dst).
// Punya bonus power pasif dan meta sebagai hero khusus.
// ════════════════════════════════════════════════════════════════

export const LANCELOT = {

  // ── IDENTITAS HERO ───────────────────────────────────────────
  "fraksi": "Kishin",       // Sinergi buff yang diterima hero ini
  "role":   "Phasewarper",  // Role dalam tim (berpengaruh ke buff role)
  "gold":   5,              // Biaya deploy hero di papan

  // ── BONUS POWER KHUSUS ───────────────────────────────────────
  "bonus_power_pasif": 1000,  // Bonus power pasif bawaan hero (tidak dari buff)
  "bonus_power_meta":  2000,  // Bonus power meta (dihitung terpisah di power formula)

  // ── STAT DASAR (array per bintang: [★1, ★2, ★3]) ────────────
  "HP":           [4075, 7335, 50535],  // Total darah hero
  "Physical_ATK": [240,  365,  775],    // Serangan fisik dasar
  "Magic_ATK":    [240,  365,  775],    // Serangan magic dasar (sama dengan Physical_ATK)
  "Jangkauan_ATK": 1,                   // Jangkauan serangan (1 = melee)

  // ── MANA & REGEN ─────────────────────────────────────────────
  "Batas_Mana_Awal":    [50, 50, 20],  // Mana awal saat battle dimulai
  "Batas_Mana":         [70, 70, 70],  // Mana maksimum untuk cast skill
  "Mana_Regen_Per_Detik": 0,           // Regen mana per detik (0 = tidak ada regen pasif)

  // ── LIFESTEAL & SPELL VAMP ───────────────────────────────────
  "Lifesteal":  0,  // 10% lifesteal dari basic attack
  "Spell_Vamp": 0,  // 10% spell vamp dari skill

  // ── PENETRASI ─────────────────────────────────────────────────
  "Physical_Penetration": 0,  // Penetrasi armor fisik musuh
  "Magic_Penetration":    0,  // Penetrasi magic resist musuh

  // ── PERTAHANAN ───────────────────────────────────────────────
  "Magic_Def":    [36, 36, 36],  // Ketahanan terhadap serangan magic (tinggi untuk Phasewarper)
  "Physical_Def": [36, 36, 36],  // Ketahanan terhadap serangan fisik (tinggi untuk Phasewarper)

  // ── KECEPATAN SERANGAN ────────────────────────────────────────
  "ATK_Speed": [0.75, 0.75, 0.75],  // Serangan per detik

  // ── BASIC ATTACK ─────────────────────────────────────────────
  // Lancelot memukul menggunakan Physical_ATK murni (x1).
  // Magic_ATK multiplier 0 = tidak berkontribusi ke damage basic attack.
  "BASIC_ATK": {
    "formula": [
      { "ref": "Magic_ATK",    "multiplier": [0, 0, 0] },  // Tidak dipakai
      { "ref": "Physical_ATK", "multiplier": [1, 1, 1] }   // 100% Physical ATK
    ]
  },

  // ── SKILL DAMAGE ─────────────────────────────────────────────
  // Phantom Execution: Physical_ATK based, jumlah hit bertambah tiap cast.
  // Formula dasar = damage 1 hit untuk preview stat.
  // simulate_battle pakai hits_by_cast untuk jumlah hit yang tepat per cast.
  "DMG_skill": {
    "formula": [
      { "ref": "Magic_ATK",    "multiplier": [0,   0,    0  ] },  // Tidak dipakai
      { "ref": "Physical_ATK", "multiplier": [1.7, 1.95, 4.5] }   // 170%/195%/450% Physical ATK per hit
    ],

    // ── SKILL HANDLER ─────────────────────────────────────────
    "skill_handler": {
      "type": "multihit",  // Skill menyerang beberapa kali per cast

      // Jumlah hit default (dipakai jika cast melebihi panjang hits_by_cast)
      "hits": 1,

      // Jumlah hit berbeda-beda tiap cast (cast ke-1, ke-2, ke-3, dst):
      //   Cast ke-1 : 1 hit
      //   Cast ke-2 : 2 hit
      //   Cast ke-3 : 4 hit
      //   Cast ke-4+ : tetap 4 hit (nilai terakhir dipakai)
      "hits_by_cast": [1, 2, 4],

      "label": "Phantom Execution"
    }
  }
};
