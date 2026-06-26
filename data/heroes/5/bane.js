// ════════════════════════════════════════════════════════════════
// bane.js
// Data hero Bane — Northern Vale Defender, kost 5 gold.
// Skill utama: serangan magic tunggal berbasis Magic_ATK.
// Tidak ada skill_handler khusus (single hit langsung).
// ════════════════════════════════════════════════════════════════

export const BANE = {

  // ── IDENTITAS HERO ───────────────────────────────────────────
  "fraksi": "Northern Vale",  // Sinergi buff yang diterima hero ini
  "role":   "Defender",       // Role dalam tim (berpengaruh ke buff role)
  "gold":   5,                // Biaya deploy hero di papan

  // ── STAT DASAR (array per bintang: [★1, ★2, ★3]) ────────────
  "HP":           [4335, 7805, 53760],  // Total darah hero
  "Physical_ATK": [230,  345,  740],    // Serangan fisik dasar (tidak dipakai skill)
  "Magic_ATK":    [230,  345,  740],    // Serangan magic dasar (dipakai skill)
  "Jangkauan_ATK": 1,                   // Jangkauan serangan (1 = melee)

  // ── MANA & REGEN ─────────────────────────────────────────────
  "Batas_Mana_Awal":    [80, 80, 20],    // Mana awal saat battle dimulai
  "Batas_Mana":         [100, 100, 100], // Mana maksimum untuk cast skill
  "Mana_Regen_Per_Detik": 0,             // Regen mana per detik (0 = tidak ada regen pasif)

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
  // Bane memukul menggunakan Physical_ATK murni (x1).
  // Magic_ATK multiplier 0 = tidak berkontribusi ke damage basic attack.
  "BASIC_ATK": {
    "formula": [
      { "ref": "Magic_ATK",    "multiplier": [0, 0, 0] },  // Tidak dipakai
      { "ref": "Physical_ATK", "multiplier": [1, 1, 1] }   // 100% Physical ATK
    ]
  },

  // ── SKILL DAMAGE ─────────────────────────────────────────────
  // Skill Bane adalah single hit magic — menggunakan Magic_ATK sebagai basis damage.
  // Physical_ATK multiplier 0 = tidak berkontribusi ke skill damage.
  // Tidak ada skill_handler → damage langsung dihitung sekali saat cast.
  "DMG_skill": {
    "formula": [
      { "ref": "Magic_ATK",    "multiplier": [2.4, 2.6, 11.0] },  // 240%/260%/1100% Magic ATK
      { "ref": "Physical_ATK", "multiplier": [0,   0,   0   ] }   // Tidak dipakai
    ]
  }
};
