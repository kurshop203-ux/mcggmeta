export const IRITHEL = {
  "fraksi": "Emberlord",                // Nama faction/grup hero, dipakai untuk hitung bonus synergy tim
  "role": "Marksman",                   // Role/kelas hero, dipakai untuk hitung bonus synergy berbasis role
  "gold": 4,                            // Harga/cost hero saat direkrut di game
  "HP": [3100, 5580, 13795],            // HP di bintang 1 / 2 / 3
  "Physical_ATK": [150, 230, 340],      // Physical ATK di bintang 1 / 2 / 3
  "Magic_ATK": [150, 230, 340],         // Magic ATK di bintang 1 / 2 / 3
  "Jangkauan_ATK": 4,                   // Jarak serang (4 = ranged/jarak jauh, 1 = melee/jarak dekat)
  "Batas_Mana_Awal": [75, 75, 75],      // Mana yang dibutuhkan untuk cast skill PERTAMA kali (per bintang 1/2/3)
  "Batas_Mana": [100, 100, 100],        // Mana yang dibutuhkan untuk cast skill SETELAH cast pertama (per bintang 1/2/3)
  "Mana_Regen_Per_Detik": 0,            // Mana regen otomatis per detik (0 = tidak ada regen pasif)
  "Lifesteal": 0,                       // Persentase lifesteal dari basic attack (0 = tidak ada)
  "Spell_Vamp": 0,                      // Persentase spell vamp / heal dari damage skill (0 = tidak ada)
  "Physical_Penetration": 0,            // Pengurang Physical_Def musuh secara flat (0 = tidak ada penetrasi)
  "Magic_Penetration": 0,               // Pengurang Magic_Def musuh secara flat (0 = tidak ada penetrasi)
  "Magic_Def": [36, 36, 36],            // Magic defense di bintang 1 / 2 / 3
  "Physical_Def": [36, 36, 36],         // Physical defense di bintang 1 / 2 / 3
  "ATK_Speed": [0.8, 0.8, 0.8],         // Attack speed (jumlah basic attack per detik) di bintang 1 / 2 / 3

  "BASIC_ATK": {                        // Definisi formula damage basic attack Irithel
    "formula": [                        // Daftar komponen damage yang dijumlahkan saat basic attack
      { "ref": "Magic_ATK",    "multiplier": [0, 0, 0]          }, // Komponen Magic_ATK tidak dipakai (multiplier 0)
      { "ref": "Physical_ATK", "multiplier": [1.05, 1.05, 1.05] }  // Komponen Physical_ATK 105% di semua bintang (Heavy Arrow)
    ]
  },

  // Skill: Irithel mengaktifkan mode Jungle Heart, melepaskan 1 panah besar langsung
  // (+135% Physical ATK), lalu basic attack berikutnya menjadi empowered selama 3 hit
  // dengan damage yang jauh lebih besar (320%/850% Physical ATK per hit empowered).
  "DMG_skill": {                        // Definisi formula damage skill + efek tambahan skill Irithel

    "formula": [                        // Formula damage hit langsung saat skill di-cast
      { "ref": "Magic_ATK",    "multiplier": [0,    0,    0  ] }, // Komponen Magic_ATK tidak dipakai di skill ini
      { "ref": "Physical_ATK", "multiplier": [1.35, 1.35, 4.0] }  // 135%/135%/400% Physical ATK hit langsung di bintang 1/2/3
    ],

    "skill_handler": {                  // Konfigurasi efek buff empowered basic attack (dibaca oleh skill_handler.js)
      "type": "buff",                   // Tipe handler: memberikan buff sementara setelah skill di-cast
      "empowered_basic_count": 3,       // Jumlah basic attack berikutnya yang menjadi empowered (3 hit)
      "empowered_basic_multiplier": [3.2, 3.2, 8.5], // Multiplier Physical ATK per hit empowered di bintang 1/2/3
      "duration": 0                     // Durasi buff (0 = hanya berlaku sampai semua empowered_basic_count terpakai)
    }
  }
};