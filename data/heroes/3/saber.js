export const SABER = {
  "fraksi": "Exorcist",                 // Nama faction/grup hero, dipakai untuk hitung bonus synergy tim
  "role": "Swiftblade",                 // Role/kelas hero, dipakai untuk hitung bonus synergy berbasis role
  "gold": 3,                            // Harga/cost hero saat direkrut di game
  "bonus_power_pasif": 1000,            // Bonus power tambahan dari efek pasif hero (dihitung terpisah di kalkulasi power)
  "bonus_power_meta": 2000,             // Bonus power tambahan karena status meta/tier hero (dihitung terpisah di kalkulasi power)
  "HP": [2576, 4637, 8758],             // HP di bintang 1 / 2 / 3
  "Physical_ATK": [145, 215, 285],      // Physical ATK di bintang 1 / 2 / 3
  "Magic_ATK": [145, 215, 285],         // Magic ATK di bintang 1 / 2 / 3
  "Jangkauan_ATK": 1,                   // Jarak serang (1 = melee/jarak dekat, 4 = ranged/jarak jauh)
  "Batas_Mana_Awal": [60, 60, 60],      // Mana yang dibutuhkan untuk cast skill PERTAMA kali (per bintang 1/2/3)
  "Batas_Mana": [80, 80, 80],           // Mana yang dibutuhkan untuk cast skill SETELAH cast pertama (per bintang 1/2/3)
  "Mana_Regen_Per_Detik": 0,            // Mana regen otomatis per detik (0 = tidak ada regen pasif)
  "Lifesteal": 0,                    // Persentase lifesteal dari basic attack (10% dari damage basic attack)
  "Spell_Vamp": 0,                   // Persentase spell vamp / heal dari damage skill (10% dari damage skill)
  "Physical_Penetration": 0,           // Pengurang Physical_Def musuh secara flat sebesar 10 poin
  "Magic_Penetration": 0,              // Pengurang Magic_Def musuh secara flat sebesar 10 poin
  "Magic_Def": [100, 200, 300],         // Magic defense di bintang 1 / 2 / 3 (lebih tinggi dari hero lain)
  "Physical_Def": [100, 200, 300],      // Physical defense di bintang 1 / 2 / 3 (lebih tinggi dari hero lain)
  "ATK_Speed": [0.75, 0.75, 0.75],      // Attack speed (jumlah basic attack per detik) di bintang 1 / 2 / 3

  "BASIC_ATK": {                        // Definisi formula damage basic attack Saber
    "formula": [                        // Daftar komponen damage yang dijumlahkan saat basic attack
      { "ref": "Magic_ATK",    "multiplier": [1, 1, 1] },   // Komponen Magic_ATK dengan multiplier 1x di bintang 1/2/3
      { "ref": "Physical_ATK", "multiplier": [1, 1, 1] }    // Komponen Physical_ATK dengan multiplier 1x di bintang 1/2/3
    ]
  },

  // Skill: Saber melepaskan 5 pedang berputar ke target, masing-masing memberikan
  // (+130% Total Physical ATK) Physical DMG di bintang 1/2, dan (+210%) di bintang 3.
  // Semua 5 hit dilepaskan dengan jeda sangat cepat (0.01 detik antar hit).
  "DMG_skill": {                        // Definisi formula damage skill + efek tambahan skill Saber

    "formula": [                        // Formula damage per hit pedang (dikalikan hit_count di skill_handler)
      { "ref": "Magic_ATK",    "multiplier": [0,    0,    0   ] }, // Komponen Magic_ATK tidak dipakai di skill ini
      { "ref": "Physical_ATK", "multiplier": [1.30, 1.30, 2.10] }  // 130%/130%/210% Physical ATK per hit di bintang 1/2/3
    ],

    "skill_handler": {                  // Konfigurasi multi-hit cepat berurutan (dibaca oleh skill_handler.js)
      "type": "delayed_multihit",       // Tipe handler: beberapa hit identik dengan jeda tetap antar hit
      "label": "Saber Orbiting Swords", // Label yang ditampilkan di timeline simulasi
      "hit_count": 5,                   // Total jumlah hit pedang yang dilepaskan (5 pedang)
      "hit_delay": 0.01                 // Jeda waktu antar hit dalam detik (0.01 detik = sangat cepat/hampir bersamaan)
    }
  }
};