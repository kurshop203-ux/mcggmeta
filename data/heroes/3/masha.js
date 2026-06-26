export const MASHA = {
  "fraksi": "Emberlord",                // Nama faction/grup hero, dipakai untuk hitung bonus synergy tim
  "role": "Bruiser",                    // Role/kelas hero, dipakai untuk hitung bonus synergy berbasis role
  "gold": 3,                            // Harga/cost hero saat direkrut di game
  "HP": [2576, 4637, 8758],             // HP di bintang 1 / 2 / 3
  "Physical_ATK": [115, 170, 230],      // Physical ATK di bintang 1 / 2 / 3
  "Magic_ATK": [115, 170, 230],         // Magic ATK di bintang 1 / 2 / 3
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
  "ATK_Speed": [0.75, 0.75, 0.75],      // Attack speed (jumlah basic attack per detik) di bintang 1 / 2 / 3

  "BASIC_ATK": {                        // Definisi formula damage basic attack Masha
    "formula": [                        // Daftar komponen damage yang dijumlahkan saat basic attack
      { "ref": "Magic_ATK",    "multiplier": [0, 0, 0] },   // Komponen Magic_ATK tidak dipakai (multiplier 0 di semua bintang)
      { "ref": "Physical_ATK", "multiplier": [1, 1, 1] }    // Komponen Physical_ATK dengan multiplier 1x di bintang 1/2/3
    ]
  },

  // Skill: Masha memberikan (+330% Total Physical ATK) Physical DMG Basic ATK ke target saat ini
  // dan lawan yang bersebelahan (DMG berkurang seiring jumlah lawan yang terkena),
  // lalu mendapatkan 70% ATK Speed dan 15% Lifesteal selama 3 detik.
  "DMG_skill": {                        // Definisi formula damage skill + efek tambahan skill Masha

    "formula": [                        // Formula damage utama skill (smash/serangan besar)
      { "ref": "Magic_ATK",    "multiplier": [0,   0,   0  ] }, // Komponen Magic_ATK tidak dipakai di skill ini
      { "ref": "Physical_ATK", "multiplier": [1.5, 1.8, 2.1] }  // 150%/180%/210% Physical ATK di bintang 1/2/3
    ],

    "skill_handler": {                  // Konfigurasi efek buff sementara setelah skill di-cast (dibaca oleh skill_handler.js)
      "type": "buff",                   // Tipe handler: memberikan buff stat sementara saat skill aktif
      "duration": 3,                    // Durasi buff berlangsung selama 3 detik
      "buffs": {                        // Daftar stat yang di-buff selama durasi aktif
        "ATK_Speed_Bonus": 0.70,        // Bonus ATK Speed +70% selama buff aktif
        "Lifesteal_Bonus": 0.15         // Bonus Lifesteal +15% selama buff aktif
      },
      "label": "+70% ATK Speed & +15% Lifesteal selama 3s" // Label yang ditampilkan di timeline simulasi
    }
  }
};