// ════════════════════════════════════════════════════════════════
// badang.js
// Data hero Badang — Dragoncaller Bruiser, kost 5 gold.
// Skill utama: Fist Crack — delayed multihit 8x dengan jeda 0.15s tiap hit.
// ════════════════════════════════════════════════════════════════

export const BADANG = {

  // ── IDENTITAS HERO ───────────────────────────────────────────
  "fraksi": "Dragoncaller",  // Sinergi buff yang diterima hero ini
  "role":   "Bruiser",       // Role dalam tim (berpengaruh ke buff role)
  "gold":   5,               // Biaya deploy hero di papan

  // ── STAT DASAR (array per bintang: [★1, ★2, ★3]) ────────────
  "HP":           [4075, 7335, 50535],  // Total darah hero
  "Physical_ATK": [240,  365,  680],    // Serangan fisik dasar
  "Magic_ATK":    [240,  365,  680],    // Serangan magic dasar (sama dengan Physical_ATK)
  "Jangkauan_ATK": 1,                   // Jangkauan serangan (1 = melee)

  // ── MANA & REGEN ─────────────────────────────────────────────
  "Batas_Mana_Awal":    [50, 50, 20],  // Mana awal saat battle dimulai
  "Batas_Mana":         [70, 70, 70],  // Mana maksimum untuk cast skill
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
  // Badang memukul menggunakan Physical_ATK murni (x1).
  // Magic_ATK multiplier 0 = tidak berkontribusi ke damage basic attack.
  "BASIC_ATK": {
    "formula": [
      { "ref": "Magic_ATK",    "multiplier": [0, 0, 0] },  // Tidak dipakai
      { "ref": "Physical_ATK", "multiplier": [1, 1, 1] }   // 100% Physical ATK
    ]
  },

  // ── SKILL DAMAGE ─────────────────────────────────────────────
  // Fist Crack: Badang menghantam 8 kali dengan jeda 0.15s per hit.
  // Hit pertama langsung, sisanya masuk pendingHits dan diproses di simulate_battle.
  // Formula dasar menunjukkan damage 1 hit [★1, ★2, ★3].
  "DMG_skill": {
    "formula": [
      { "ref": "Magic_ATK",    "multiplier": [0,    0,    0   ] },  // Tidak dipakai
      { "ref": "Physical_ATK", "multiplier": [0.50, 0.50, 2.25] }   // 50%/50%/225% Physical ATK per hit
    ],

    // ── SKILL HANDLER ─────────────────────────────────────────
    "skill_handler": {
      "type": "delayed_multihit",  // Hit pertama langsung; sisanya pending dengan delay
      "label": "Badang Fist Crack",

      "hit_count": 8,    // Total jumlah hit per cast
      "hit_delay":  0.15 // Jeda antar hit dalam detik (hit ke-2 di t+0.15, ke-3 di t+0.30, dst)
    }
  }
};
