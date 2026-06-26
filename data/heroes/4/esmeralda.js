export const ESMERALDA = {
  "fraksi": "Heartbond",                // Nama faction/grup hero, dipakai untuk hitung bonus synergy tim
  "role": "Dauntless",                  // Role/kelas hero, dipakai untuk hitung bonus synergy berbasis role
  "gold": 4,                            // Harga/cost hero saat direkrut di game
  "HP": [3545, 6380, 15770],            // HP di bintang 1 / 2 / 3
  "Physical_ATK": [180, 275, 410],      // Physical ATK di bintang 1 / 2 / 3
  "Magic_ATK": [180, 275, 410],         // Magic ATK di bintang 1 / 2 / 3
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

  "BASIC_ATK": {                        // Definisi formula damage basic attack Esmeralda
    "formula": [                        // Daftar komponen damage yang dijumlahkan saat basic attack
      { "ref": "Physical_ATK", "multiplier": [0.5, 1, 1] }, // Komponen Physical_ATK: 50% di bintang 1, 100% di bintang 2/3
      { "ref": "Magic_ATK",    "multiplier": [0.5, 1, 1] }  // Komponen Magic_ATK: 50% di bintang 1, 100% di bintang 2/3
    ]
  },

  // Skill: Esmeralda menjatuhkan bintang jatuh ke area target, memberikan Magic DMG besar
  // sekaligus mendapatkan Shield sebesar 8% Max HP selama 4 detik.
  // Bintang 3 memiliki multiplier yang jauh lebih tinggi (1320% vs 400%).
  "DMG_skill": {                        // Definisi formula damage skill + efek tambahan skill Esmeralda

    "formula": [                        // Formula damage utama skill (falling star)
      { "ref": "Magic_ATK", "multiplier": [4.00, 4.00, 13.20] } // 400%/400%/1320% Magic ATK di bintang 1/2/3
    ],

    "skill_handler": {                  // Konfigurasi efek buff/shield saat skill di-cast (dibaca oleh skill_handler.js)
      "shield_now": [0.08, 0.08, 0.08], // Shield langsung aktif saat cast: 8% dari Max HP di bintang 1/2/3
      "duration": 4,                    // Durasi shield berlangsung selama 4 detik
      "label": "Falling Starmoon"       // Label yang ditampilkan di timeline simulasi
    }
  }
};