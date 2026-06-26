export const GATOTKACA = {
  "fraksi": "Neobeasts",                // Nama faction/grup hero, dipakai untuk hitung bonus synergy tim
  "role": ["Bruiser", "Defender"] ,                  // Role/kelas hero, dipakai untuk hitung bonus synergy berbasis role
  "gold": 2,                            // Harga/cost hero saat direkrut di game
  "HP": [2233, 4019, 7235],             // HP di bintang 1 / 2 / 3
  "Physical_ATK": [115, 175, 230],       // Physical ATK di bintang 1 / 2 / 3
  "Magic_ATK": [115, 175, 230],          // Magic ATK di bintang 1 / 2 / 3
  "Jangkauan_ATK": 1,                   // Jarak serang (4 = ranged/jarak jauh, 1 = melee/jarak dekat)
  "Batas_Mana_Awal": [60, 60, 60],       // Mana yang dibutuhkan untuk cast skill PERTAMA kali (per bintang)
  "Batas_Mana": [80, 80, 80],            // Mana yang dibutuhkan untuk cast skill SETELAH cast pertama (per bintang)
  "Mana_Regen_Per_Detik": 0,             // Mana regen otomatis per detik (diubah dari 2 → 0 sesuai permintaan)
  "Lifesteal": 0,                       // Persentase lifesteal (heal dari basic attack)
  "Spell_Vamp": 0,                      // Persentase spell vamp (heal dari damage skill)
  "Physical_Penetration": 0,             // Pengurang Physical_Def musuh secara flat
  "Magic_Penetration": 0,                // Pengurang Magic_Def musuh secara flat
  "Magic_Def": [36, 36, 36],             // Magic defense di bintang 1 / 2 / 3
  "Physical_Def": [36, 36, 36],          // Physical defense di bintang 1 / 2 / 3
  "ATK_Speed": [0.65, 0.65, 0.65],       // Attack speed (basic attack per detik) di bintang 1 / 2 / 3
  "BASIC_ATK": {                         // Definisi formula damage basic attack
    "formula": [                         // Daftar komponen damage yang dijumlahkan
      { "ref": "Magic_ATK", "multiplier": [0,0,0] },        // Komponen dari Magic_ATK, multiplier 0 = tidak dipakai
      { "ref": "Physical_ATK", "multiplier": [1, 1, 1] }    // Komponen dari Physical_ATK, multiplier 1x di semua bintang
    ]
  },
  "DMG_skill": {                                            // Definisi formula damage skill + efek skill
    "formula": [                                            // Daftar komponen damage skill yang dijumlahkan
      { "ref": "Magic_ATK", "multiplier": [4,4,5.5] },          // Komponen dari Magic_ATK, multiplier per bintang
      { "ref": "Physical_ATK", "multiplier": [0,0,0] }          // Komponen dari Physical_ATK, multiplier 0 = tidak dipakai
    ],
    "skill_handler": {                  // Konfigurasi efek tambahan skill (dibaca oleh skill_handler.js)
      "type": "buff",                   // Tipe handler: buff stat/efek sementara saat cast
      "label": "Gatotkaca Heal",        // Label yang ditampilkan di timeline simulasi
      "heal_flat": [400, 700, 1500]     // Heal sebesar nilai flat (bukan persentase) saat skill di-cast, per bintang
    }
  }
};