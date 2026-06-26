export const MIYA = {
  "Mana_Per_Skill": 0,                  // Mana yang diperoleh saat menggunakan skill (0 = tidak ada)
  "Mana_Per_Basic": 5,                  // Mana yang diperoleh setiap kali melakukan basic attack
  "fraksi": "Heartbond",                // Nama faction/grup hero, dipakai untuk hitung bonus synergy tim
  "role": "Marksman",                   // Role/kelas hero, dipakai untuk hitung bonus synergy berbasis role
  "gold": 3,                            // Harga/cost hero saat direkrut di game
  "HP": [2170, 3906, 7378],             // HP di bintang 1 / 2 / 3
  "Physical_ATK": [120, 180, 240],      // Physical ATK di bintang 1 / 2 / 3
  "Magic_ATK": [120, 180, 240],         // Magic ATK di bintang 1 / 2 / 3
  "Jangkauan_ATK": 4,                   // Jarak serang (4 = ranged/jarak jauh, 1 = melee/jarak dekat)
  "Batas_Mana_Awal": [50, 50, 50],      // Mana yang dibutuhkan untuk cast skill PERTAMA kali (per bintang 1/2/3)
  "Batas_Mana": [70, 70, 70],           // Mana yang dibutuhkan untuk cast skill SETELAH cast pertama (per bintang 1/2/3)
  "Mana_Regen_Per_Detik": 0,            // Mana regen otomatis per detik (0 = tidak ada regen pasif)
  "Lifesteal": 0,                       // Persentase lifesteal dari basic attack (0 = tidak ada)
  "Spell_Vamp": 0,                      // Persentase spell vamp / heal dari damage skill (0 = tidak ada)
  "Physical_Penetration": 0,            // Pengurang Physical_Def musuh secara flat (0 = tidak ada penetrasi)
  "Magic_Penetration": 0,               // Pengurang Magic_Def musuh secara flat (0 = tidak ada penetrasi)
  "Magic_Def": [36, 36, 36],            // Magic defense di bintang 1 / 2 / 3
  "Physical_Def": [36, 36, 36],         // Physical defense di bintang 1 / 2 / 3
  "ATK_Speed": [0.8, 0.8, 0.8],         // Attack speed (jumlah basic attack per detik) di bintang 1 / 2 / 3

  "BASIC_ATK": {                        // Definisi formula damage basic attack Miya
    "formula": [                        // Daftar komponen damage yang dijumlahkan saat basic attack
      { "ref": "Magic_ATK",    "multiplier": [0, 0, 0] },   // Komponen Magic_ATK tidak dipakai (multiplier 0 di semua bintang)
      { "ref": "Physical_ATK", "multiplier": [1, 1, 1] }    // Komponen Physical_ATK dengan multiplier 1x di bintang 1/2/3
    ]
  },

  // Skill: Miya mendapatkan 35% ATK Speed selama 5 detik.
  // Selama durasi ini, dia menembakkan 1 Split Arrow tambahan yang memberikan 50% DMG
  // dan mengaktifkan Efek Basic ATK (lifesteal, on-hit, dll).
  "DMG_skill": {                        // Definisi formula damage skill + efek tambahan skill Miya

    "formula": [                        // Formula damage langsung saat skill cast (kosong, skill ini murni buff)
      { "ref": "Magic_ATK",    "multiplier": [0, 0, 0] },   // Tidak ada damage langsung dari Magic_ATK
      { "ref": "Physical_ATK", "multiplier": [0, 0, 0] }    // Tidak ada damage langsung dari Physical_ATK
    ],

    "skill_handler": {                  // Konfigurasi efek buff sementara setelah skill di-cast (dibaca oleh skill_handler.js)
      "type": "buff",                   // Tipe handler: memberikan buff stat sementara saat skill aktif
      "label": "Miya Frenzy",           // Label yang ditampilkan di timeline simulasi
      "duration": 5,                    // Durasi buff berlangsung selama 5 detik
      "buffs": {                        // Daftar stat yang di-buff selama durasi aktif
        "ATK_Speed_Bonus":      [0.35, 0.35, 0.35], // Bonus ATK Speed +35% di bintang 1/2/3
        "extra_hits":           [1, 2, 3],           // Jumlah panah tambahan (Split Arrow) per basic attack di bintang 1/2/3
        "Basic_ATK_DMG_Bonus":  [0.5, 0.5, 0.5]     // DMG multiplier tiap panah tambahan (50% dari basic attack normal)
      }
    }
  }
};