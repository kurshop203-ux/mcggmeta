export const KUFRA = {
  "fraksi": "Heartbond",                // Nama faction/grup hero, dipakai untuk hitung bonus synergy tim
  "role": "Defender",                   // Role/kelas hero, dipakai untuk hitung bonus synergy berbasis role
  "gold": 3,                            // Harga/cost hero saat direkrut di game
  "HP": [2842, 5116, 9663],             // HP di bintang 1 / 2 / 3
  "Physical_ATK": [135, 205, 275],      // Physical ATK di bintang 1 / 2 / 3
  "Magic_ATK": [135, 205, 275],         // Magic ATK di bintang 1 / 2 / 3
  "Jangkauan_ATK": 1,                   // Jarak serang (1 = melee/jarak dekat, 4 = ranged/jarak jauh)
  "Batas_Mana_Awal": [50, 50, 50],      // Mana yang dibutuhkan untuk cast skill PERTAMA kali (per bintang 1/2/3)
  "Batas_Mana": [70, 70, 70],           // Mana yang dibutuhkan untuk cast skill SETELAH cast pertama (per bintang 1/2/3)
  "Mana_Regen_Per_Detik": 0,            // Mana regen otomatis per detik (0 = tidak ada regen pasif)
  "Lifesteal": 0,                       // Persentase lifesteal dari basic attack (0 = tidak ada)
  "Spell_Vamp": 0,                      // Persentase spell vamp / heal dari damage skill (0 = tidak ada)
  "Physical_Penetration": 0,            // Pengurang Physical_Def musuh secara flat (0 = tidak ada penetrasi)
  "Magic_Penetration": 0,               // Pengurang Magic_Def musuh secara flat (0 = tidak ada penetrasi)
  "Magic_Def": [36, 36, 36],            // Magic defense di bintang 1 / 2 / 3
  "Physical_Def": [36, 36, 36],         // Physical defense di bintang 1 / 2 / 3
  "ATK_Speed": [0.65, 0.65, 0.65],      // Attack speed (jumlah basic attack per detik) di bintang 1 / 2 / 3

  "BASIC_ATK": {                        // Definisi formula damage basic attack Kufra
    "formula": [                        // Daftar komponen damage yang dijumlahkan saat basic attack
      { "ref": "Magic_ATK",    "multiplier": [0, 0, 0] },   // Komponen Magic_ATK tidak dipakai (multiplier 0 di semua bintang)
      { "ref": "Physical_ATK", "multiplier": [1, 1, 1] }    // Komponen Physical_ATK dengan multiplier 1x di bintang 1/2/3
    ]
  },

  // Skill: Khufra mendapatkan 300 Shield selama 4 detik dan menyapu target dalam jangkauan di depannya,
  // memberikan (+510% Total Physical ATK) Physical DMG (DMG berkurang seiring jumlah lawan yang terkena)
  // dan menyebabkan stun selama 1 detik.
  "DMG_skill": {                        // Definisi formula damage skill + efek tambahan skill Kufra

    "formula": [                        // Formula damage utama skill (sweep/sapu)
      { "ref": "Magic_ATK",    "multiplier": [0,    0,    0    ] }, // Komponen Magic_ATK tidak dipakai di skill ini
      { "ref": "Physical_ATK", "multiplier": [5.10, 5.10, 9.70] }  // 510% Physical ATK di bintang 1/2, 970% di bintang 3
    ],

    "skill_handler": {                  // Konfigurasi efek tambahan skill (dibaca oleh skill_handler.js)
      "type": "buff",                   // Tipe handler: memberikan buff/efek sementara saat skill di-cast
      "label": "Kufra Shield",          // Label yang ditampilkan di timeline simulasi
      "shield_flat": [300, 500, 800]    // Shield flat (nilai HP absolut, bukan persentase) di bintang 1 / 2 / 3
    }
  }
};