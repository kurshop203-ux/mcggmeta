export const LOUYI = {
  "fraksi": "Northern Vale",            // Nama faction/grup hero, dipakai untuk hitung bonus synergy tim
  "role": "Stargazer",                  // Role/kelas hero, dipakai untuk hitung bonus synergy berbasis role
  "gold": 3,                            // Harga/cost hero saat direkrut di game
  "HP": [2170, 3905, 7380],             // HP di bintang 1 / 2 / 3
  "Physical_ATK": [105, 155, 210],      // Physical ATK di bintang 1 / 2 / 3
  "Magic_ATK": [105, 155, 210],         // Magic ATK di bintang 1 / 2 / 3
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

  "BASIC_ATK": {                        // Definisi formula damage basic attack Luo Yi
    "formula": [                        // Daftar komponen damage yang dijumlahkan saat basic attack
      { "ref": "Magic_ATK",    "multiplier": [0, 0, 0] },   // Komponen Magic_ATK tidak dipakai (multiplier 0 di semua bintang)
      { "ref": "Physical_ATK", "multiplier": [1, 1, 1] }    // Komponen Physical_ATK dengan multiplier 1x di bintang 1/2/3
    ]
  },

  // Skill: Luo Yi memanggil Energy of Yin, segera memberikan (+255% Total Magic ATK) Magic DMG Area
  // dan menyebabkan stun ke lawan selama 0.5 detik.
  // Lalu menggunakan Energy of Yang, memberikan (+125% Total Magic ATK) Magic DMG sebanyak 3 kali
  // ke lawan di sekitar posisi target. (DMG berkurang sesuai jumlah lawan yang terkena.)
  // Setiap kali Energy of Yin menghilang, mendapatkan 10% Peningkatan DMG Skill hingga 3 stack.
  "DMG_skill": {                        // Definisi formula damage skill + efek tambahan skill Luo Yi

    "formula": [                        // Formula damage langsung saat skill trigger (dikosongkan, damage ada di sequence)
      { "ref": "Magic_ATK",    "multiplier": [0, 0, 0] },   // Tidak ada damage langsung dari Magic_ATK di level ini
      { "ref": "Physical_ATK", "multiplier": [0, 0, 0] }    // Tidak ada damage langsung dari Physical_ATK di level ini
    ],

    "skill_handler": {                  // Konfigurasi efek bertahap skill (dibaca oleh skill_handler.js)
      "type": "sequence",               // Tipe handler: efek dijalankan berurutan, tiap step punya delay sendiri
      "label": "Luo Yi Yin-Yang",       // Label yang ditampilkan di timeline simulasi

      "sequence": [                     // Daftar step yang dijalankan berurutan setelah skill di-cast

        // Step 1: Energy of Yin – hit langsung area + stun 0.5 detik
        { "delay": 0.01, "formula": [ { "ref": "Magic_ATK", "multiplier": [2.55, 2.60, 3.75] } ] },   // 255%/260%/375% Magic ATK di bintang 1/2/3

        // Step 2–4: Energy of Yang – 3 hit beruntun ke area sekitar target
        { "delay": 0.50, "formula": [ { "ref": "Magic_ATK", "multiplier": [1.25, 1.30, 1.85] } ] },   // Yang hit 1 – 0.50 detik setelah cast
        { "delay": 0.75, "formula": [ { "ref": "Magic_ATK", "multiplier": [1.25, 1.30, 1.85] } ] },   // Yang hit 2 – 0.75 detik setelah cast
        { "delay": 1.00, "formula": [ { "ref": "Magic_ATK", "multiplier": [1.25, 1.30, 1.85] } ] }    // Yang hit 3 – 1.00 detik setelah cast (terakhir)
      ]
    }
  }
};