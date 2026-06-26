// ════════════════════════════════════════════════════════════════
// claude.js
// Data hero Claude — Heartbond Scavenger, kost 5 gold.
// Skill utama: delayed multihit 15x dengan jeda 0.2s tiap hit (Physical_ATK).
// Summon permanen: Dexter — basic attack saja, mewarisi stat Claude.
// ════════════════════════════════════════════════════════════════

export const CLAUDE = {

  // ── IDENTITAS HERO ───────────────────────────────────────────
  "fraksi": "Heartbond",  // Sinergi buff yang diterima hero ini
  "role":   "Scavenger",  // Role dalam tim (berpengaruh ke buff role)
  "gold":   5,            // Biaya deploy hero di papan

  // ── STAT DASAR (array per bintang: [★1, ★2, ★3]) ────────────
  "HP":           [2496, 4492, 30944],  // Total darah hero
  "Physical_ATK": [155,  235,  565],    // Serangan fisik dasar (dipakai skill & basic)
  "Magic_ATK":    [155,  235,  565],    // Serangan magic dasar (tidak dipakai)
  "Jangkauan_ATK": 4,                   // Jangkauan serangan (4 = ranged)

  // ── MANA & REGEN ─────────────────────────────────────────────
  "Batas_Mana_Awal":    [30, 30, 20],  // Mana awal saat battle dimulai
  "Batas_Mana":         [50, 50, 50],  // Mana maksimum untuk cast skill
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
  "ATK_Speed": [0.8, 0.8, 0.8],  // Serangan per detik

  // ── BASIC ATTACK ─────────────────────────────────────────────
  // Claude memukul menggunakan Physical_ATK murni (x1).
  "BASIC_ATK": {
    "formula": [
      { "ref": "Physical_ATK", "multiplier": [1, 1, 1] }  // 100% Physical ATK
    ]
  },

  // ── SKILL DAMAGE ─────────────────────────────────────────────
  // Skill Claude adalah delayed multihit 15x — setiap hit berbasis Physical_ATK.
  // Hit pertama langsung, hit ke-2 sampai ke-15 masuk pendingHits dengan jeda 0.2s.
  // Total damage = 15 x (90%/90%/325%) Physical ATK.
  "DMG_skill": {
    "formula": [
      { "ref": "Physical_ATK", "multiplier": [0.90, 0.90, 3.25] }  // 90%/90%/325% Physical ATK per hit
    ],

    // ── SKILL HANDLER ─────────────────────────────────────────
    "skill_handler": {
      "type": "delayed_multihit",  // Hit pertama langsung; sisanya pending dengan delay
      "label": "Claude",

      "hit_count": 15,   // Total jumlah hit per cast
      "hit_delay":  0.2  // Jeda antar hit dalam detik (hit ke-2 di t+0.2, ke-3 di t+0.4, dst)
    }
  },

  // ── SUMMON: DEXTER ───────────────────────────────────────────
  // Dexter adalah summon permanen Claude yang aktif sepanjang battle.
  // Dexter hanya melakukan basic attack (tidak punya skill sendiri).
  // Stat Dexter mewarisi seluruh stat Claude termasuk buff yang aktif.
  "summon": {
    "id":            "DEXTER",  // Identifier unik summon di simulate_battle
    "inherit_stats": true,      // Pakai stat Claude (Physical_ATK, HP, dll)

    // Kecepatan serangan Dexter (independen dari Claude)
    "ATK_Speed": [0.8, 0.8, 0.8],  // Serangan per detik

    // Basic attack Dexter: 90%/90%/325% Physical ATK (sama dengan hit skill Claude)
    "BASIC_ATK": {
      "formula": [
        { "ref": "Physical_ATK", "multiplier": [0.90, 0.90, 3.25] }  // 90%/90%/325% Physical ATK
      ]
    }
  }
};
