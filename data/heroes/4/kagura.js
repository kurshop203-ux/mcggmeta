export const KAGURA = {
  "fraksi": "Exorcist",                 // Nama faction/grup hero, dipakai untuk hitung bonus synergy tim
  "role": "Mage",                       // Role/kelas hero, dipakai untuk hitung bonus synergy berbasis role
  "gold": 4,                            // Harga/cost hero saat direkrut di game
  "HP": [3100, 5580, 13795],            // HP di bintang 1 / 2 / 3
  "Physical_ATK": [130, 200, 295],      // Physical ATK di bintang 1 / 2 / 3
  "Magic_ATK": [130, 200, 295],         // Magic ATK di bintang 1 / 2 / 3
  "Jangkauan_ATK": 4,                   // Jarak serang (4 = ranged/jarak jauh, 1 = melee/jarak dekat)
  "Batas_Mana_Awal": [40, 40, 40],      // Mana yang dibutuhkan untuk cast skill PERTAMA kali (per bintang 1/2/3)
  "Batas_Mana": [60, 60, 60],           // Mana yang dibutuhkan untuk cast skill SETELAH cast pertama (per bintang 1/2/3)
  "Mana_Regen_Per_Detik": 0,            // Mana regen otomatis per detik (0 = tidak ada regen pasif)
  "Lifesteal": 0,                       // Persentase lifesteal dari basic attack (0 = tidak ada)
  "Spell_Vamp": 0,                      // Persentase spell vamp / heal dari damage skill (0 = tidak ada)
  "Physical_Penetration": 0,            // Pengurang Physical_Def musuh secara flat (0 = tidak ada penetrasi)
  "Magic_Penetration": 0,               // Pengurang Magic_Def musuh secara flat (0 = tidak ada penetrasi)
  "Magic_Def": [36, 36, 36],            // Magic defense di bintang 1 / 2 / 3
  "Physical_Def": [36, 36, 36],         // Physical defense di bintang 1 / 2 / 3
  "ATK_Speed": [0.75, 0.75, 0.75],      // Attack speed (jumlah basic attack per detik) di bintang 1 / 2 / 3

  "BASIC_ATK": {                        // Definisi formula damage basic attack Kagura
    "formula": [                        // Daftar komponen damage yang dijumlahkan saat basic attack
      { "ref": "Physical_ATK", "multiplier": [1, 1, 1] }    // Komponen Physical_ATK dengan multiplier 1x di bintang 1/2/3
    ]
  },

  // Skill: Kagura melakukan Yin Yang Overturn — melepaskan payung sakura ke musuh
  // memberikan Magic DMG besar sekaligus mendapatkan Shield flat selama 4 detik.
  // Bintang 3 memiliki multiplier damage (1810%) dan shield (1300) yang jauh lebih besar.
  "DMG_skill": {                        // Definisi formula damage skill + efek tambahan skill Kagura

    "formula": [                        // Formula damage utama skill (Yin Yang Overturn)
      { "ref": "Magic_ATK", "multiplier": [7.70, 7.70, 18.10] } // 770%/770%/1810% Magic ATK di bintang 1/2/3
    ],

    "skill_handler": {                  // Konfigurasi efek buff/shield saat skill di-cast (dibaca oleh skill_handler.js)
      "type": "buff",                   // Tipe handler: memberikan buff/efek sementara saat skill aktif
      "shield_flat": [350, 500, 1300],  // Shield flat (nilai HP absolut, bukan persentase) di bintang 1/2/3
      "duration": 4,                    // Durasi shield berlangsung selama 4 detik
      "label": "Yin Yang Overturn"      // Label yang ditampilkan di timeline simulasi
    }
  }
};