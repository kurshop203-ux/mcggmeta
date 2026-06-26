export const TERIZLA = {
  "fraksi": "Dragoncaller",             // Nama faction/grup hero, dipakai untuk hitung bonus synergy tim
  "role": "Defender",                   // Role/kelas hero, dipakai untuk hitung bonus synergy berbasis role
  "gold": 4,                            // Harga/cost hero saat direkrut di game
  "HP": [3770, 6785, 16775],            // HP di bintang 1 / 2 / 3
  "Physical_ATK": [175, 260, 390],      // Physical ATK di bintang 1 / 2 / 3
  "Magic_ATK": [175, 260, 390],         // Magic ATK di bintang 1 / 2 / 3
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

  "BASIC_ATK": {                        // Definisi formula damage basic attack Terizla
    "formula": [                        // Daftar komponen damage yang dijumlahkan saat basic attack
      { "ref": "Physical_ATK", "multiplier": [1, 1, 1] }    // Komponen Physical_ATK dengan multiplier 1x di bintang 1/2/3
    ]
  },

  // Skill: Terizla mengaktifkan Penalty Zone — mendapatkan Shield dari Max HP
  // lalu menghantam area sekitar dengan Physical DMG besar.
  // Bintang 3 memiliki damage (1100%) dan shield (20%) yang jauh lebih besar.
  "DMG_skill": {                        // Definisi formula damage skill + efek tambahan skill Terizla

    "formula": [                        // Formula damage utama skill (hammer slam area)
      { "ref": "Physical_ATK", "multiplier": [3.00, 3.00, 11.00] } // 300%/300%/1100% Physical ATK di bintang 1/2/3
    ],

    "skill_handler": {                  // Konfigurasi efek buff/shield saat skill di-cast (dibaca oleh skill_handler.js)
      "type": "buff",                   // Tipe handler: memberikan buff/efek sementara saat skill di-cast
      "shield_now": [0.12, 0.15, 0.20], // Shield langsung aktif saat cast: 12%/15%/20% dari Max HP di bintang 1/2/3
      "duration": 4,                    // Durasi shield berlangsung selama 4 detik
      "label": "Penalty Zone"           // Label yang ditampilkan di timeline simulasi
    }
  }
};