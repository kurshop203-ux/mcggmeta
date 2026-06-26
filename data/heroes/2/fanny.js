export const FANNY = {
  "fraksi": "Heartbond",                // Nama faction/grup hero, dipakai untuk hitung bonus synergy tim
  "role": "Phasewarper",                // Role/kelas hero, dipakai untuk hitung bonus synergy berbasis role
  "gold": 2,                            // Harga/cost hero saat direkrut di game
  "HP": [2024, 3643, 6558],             // HP di bintang 1 / 2 / 3
  "Physical_ATK": [120, 180, 240],       // Physical ATK di bintang 1 / 2 / 3
  "Magic_ATK": [120, 180, 240],          // Magic ATK di bintang 1 / 2 / 3
  "Jangkauan_ATK": 1,                   // Jarak serang (4 = ranged/jarak jauh, 1 = melee/jarak dekat)
  "Batas_Mana_Awal": [60, 60, 60],       // Mana yang dibutuhkan untuk cast skill PERTAMA kali (per bintang)
  "Batas_Mana": [80, 80, 80],            // Mana yang dibutuhkan untuk cast skill SETELAH cast pertama (per bintang)
  "Mana_Regen_Per_Detik": 0,             // Mana regen otomatis per detik (diubah dari 2 → 0 sesuai permintaan)
  "Lifesteal": 0,                    // Persentase lifesteal (heal dari basic attack)
  "Spell_Vamp": 0,                   // Persentase spell vamp (heal dari damage skill)
  "Physical_Penetration": 10,            // Pengurang Physical_Def musuh secara flat
  "Magic_Penetration": 10,               // Pengurang Magic_Def musuh secara flat
  "Magic_Def": [100, 200, 300],          // Magic defense di bintang 1 / 2 / 3
  "Physical_Def": [100, 200, 300],       // Physical defense di bintang 1 / 2 / 3
  "ATK_Speed": [0.75, 0.75, 0.75],       // Attack speed (basic attack per detik) di bintang 1 / 2 / 3
  "BASIC_ATK": {                         // Definisi formula damage basic attack
    "formula": [                         // Daftar komponen damage yang dijumlahkan
      { "ref": "Magic_ATK", "multiplier": [0,0,0] },        // Komponen dari Magic_ATK, multiplier 0 = tidak dipakai
      { "ref": "Physical_ATK", "multiplier": [1, 1, 1] }    // Komponen dari Physical_ATK, multiplier 1x di semua bintang
    ]
  },
  "DMG_skill": {                                                // Definisi formula damage skill (Fanny tidak punya skill_handler/efek tambahan)
    "formula": [                                                // Daftar komponen damage skill yang dijumlahkan
      { "ref": "Magic_ATK", "multiplier": [0,0,0] },                // Komponen dari Magic_ATK, multiplier 0 = tidak dipakai
      { "ref": "Physical_ATK", "multiplier": [5.50,5.50,6.95] }     // Komponen dari Physical_ATK, multiplier per bintang
    ]
  }
};