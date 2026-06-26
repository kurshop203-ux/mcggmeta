export const CLINT = {
  "fraksi": "Dragoncaller",              // Nama faction/grup hero, dipakai untuk hitung bonus synergy tim
  "role": "Phasewarper",                 // Role/kelas hero, dipakai untuk hitung bonus synergy berbasis role
  "gold": 3,                             // Harga/cost hero saat direkrut di game
  "bonus_power_pasif": 1000,             // Nilai power tambahan dari efek pasif (dipakai di luar simulasi damage)
  "bonus_power_meta": 2000,              // Nilai power tambahan dari meta/skor tambahan (dipakai di luar simulasi damage)
  "HP": [2170, 3905, 7380],              // HP di bintang 1 / 2 / 3
  "Physical_ATK": [130, 195, 260],        // Physical ATK di bintang 1 / 2 / 3
  "Magic_ATK": [130, 195, 260],           // Magic ATK di bintang 1 / 2 / 3
  "Jangkauan_ATK": 4,                    // Jarak serang (4 = ranged/jarak jauh, 1 = melee/jarak dekat)
  "Batas_Mana_Awal": [30, 30, 30],        // Mana yang dibutuhkan untuk cast skill PERTAMA kali (per bintang)
  "Batas_Mana": [50, 50, 50],             // Mana yang dibutuhkan untuk cast skill SETELAH cast pertama (per bintang)
  "Mana_Regen_Per_Detik": 0,              // Mana regen otomatis per detik (diubah dari 2 → 0 sesuai permintaan)
  "Lifesteal": 0,                     // Persentase lifesteal (heal dari basic attack)
  "Spell_Vamp": 0,                    // Persentase spell vamp (heal dari damage skill)
  "Physical_Penetration": 10,             // Pengurang Physical_Def musuh secara flat
  "Magic_Penetration": 10,                // Pengurang Magic_Def musuh secara flat
  "Magic_Def": [100, 200, 300],           // Magic defense di bintang 1 / 2 / 3
  "Physical_Def": [100, 200, 300],        // Physical defense di bintang 1 / 2 / 3
  "ATK_Speed": [0.8, 0.8, 0.8],           // Attack speed (basic attack per detik) di bintang 1 / 2 / 3
  "BASIC_ATK": {                          // Definisi formula damage basic attack
    "formula": [                          // Daftar komponen damage yang dijumlahkan
      { "ref": "Magic_ATK", "multiplier": [1,1,1] },        // Komponen dari Magic_ATK, multiplier 1x (basic attack hybrid)
      { "ref": "Physical_ATK", "multiplier": [1,1,1] }      // Komponen dari Physical_ATK, multiplier 1x di semua bintang
    ]
  },
  "DMG_skill": {                                             // Definisi formula damage skill + efek skill
    "formula": [                                             // Daftar komponen damage skill yang dijumlahkan
      { "ref": "Magic_ATK", "multiplier": [0,0,0] },             // Komponen dari Magic_ATK, multiplier 0 = tidak dipakai
      { "ref": "Physical_ATK", "multiplier": [1.25,1.25,2] }     // Komponen dari Physical_ATK, multiplier per bintang
    ],
    "skill_handler": {                   // Konfigurasi efek tambahan skill (dibaca oleh skill_handler.js)
      "type": "delayed_multihit",        // Tipe handler: hit pertama langsung, sisanya tertunda (pending)
      "label": "Clint Skill",            // Label yang ditampilkan di timeline simulasi
      "hit_count": 5,                    // Total jumlah hit dalam satu cast skill (termasuk hit pertama)
      "hit_delay": 0.2                   // Jarak waktu (detik) antar hit setelah hit pertama
    }
  }
};