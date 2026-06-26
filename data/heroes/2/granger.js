export const GRANGER = {
  "fraksi": "Exorcist",                 // Nama faction/grup hero, dipakai untuk hitung bonus synergy tim
  "role": "Marksman",                   // Role/kelas hero, dipakai untuk hitung bonus synergy berbasis role
  "gold": 2,                            // Harga/cost hero saat direkrut di game
  "HP": [1705, 3069, 5524],             // HP di bintang 1 / 2 / 3
  "Physical_ATK": [110, 165, 220],       // Physical ATK di bintang 1 / 2 / 3
  "Magic_ATK": [110, 165, 220],          // Magic ATK di bintang 1 / 2 / 3
  "Jangkauan_ATK": 4,                   // Jarak serang (4 = ranged/jarak jauh, 1 = melee/jarak dekat)
  "Batas_Mana_Awal": [30, 30, 30],       // Mana yang dibutuhkan untuk cast skill PERTAMA kali (per bintang)
  "Batas_Mana": [50, 50, 50],            // Mana yang dibutuhkan untuk cast skill SETELAH cast pertama (per bintang)
  "Mana_Regen_Per_Detik": 0,             // Mana regen otomatis per detik (diubah dari 2 → 0 sesuai permintaan)
  "Lifesteal": 0,                       // Persentase lifesteal (heal dari basic attack)
  "Spell_Vamp": 0,                      // Persentase spell vamp (heal dari damage skill)
  "Physical_Penetration": 0,             // Pengurang Physical_Def musuh secara flat
  "Magic_Penetration": 0,                // Pengurang Magic_Def musuh secara flat
  "Magic_Def": [36, 36, 36],             // Magic defense di bintang 1 / 2 / 3
  "Physical_Def": [36, 36, 36],          // Physical defense di bintang 1 / 2 / 3
  "ATK_Speed": [0.8, 0.8, 0.8],          // Attack speed (basic attack per detik) di bintang 1 / 2 / 3
  "BASIC_ATK": {                         // Definisi formula damage basic attack
    "formula": [                         // Daftar komponen damage yang dijumlahkan
      { "ref": "Magic_ATK", "multiplier": [0,0,0] },        // Komponen dari Magic_ATK, multiplier 0 = tidak dipakai
      { "ref": "Physical_ATK", "multiplier": [1, 1, 1] }    // Komponen dari Physical_ATK, multiplier 1x di semua bintang
    ]
  },
  "DMG_skill": {                                            // Definisi formula damage skill + efek skill
    "formula": [                                            // Daftar komponen damage skill yang dijumlahkan
      { "ref": "Magic_ATK", "multiplier": [0,0,0] },            // Komponen dari Magic_ATK, multiplier 0 = tidak dipakai
      { "ref": "Physical_ATK", "multiplier": [2, 2, 2.75] }     // Komponen dari Physical_ATK, multiplier per bintang
    ],
    "skill_handler": {                  // Konfigurasi efek tambahan skill (dibaca oleh skill_handler.js)
      "type": "delayed_multihit",       // Tipe handler: hit pertama langsung, sisanya tertunda (pending)
      "label": "Granger Burst Fire",    // Label yang ditampilkan di timeline simulasi
      "hit_count": 3,                   // Total jumlah hit dalam satu cast skill (termasuk hit pertama)
      "hit_delay": 0.5                  // Jarak waktu (detik) antar hit setelah hit pertama
    }
  }
};