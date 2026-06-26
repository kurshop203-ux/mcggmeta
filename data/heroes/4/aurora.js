export const AURORA = {
  "fraksi": "Astro Power",              // Nama faction/grup hero, dipakai untuk hitung bonus synergy tim
  "role": "Stargazer",                  // Role/kelas hero, dipakai untuk hitung bonus synergy berbasis role
  "gold": 4,                            // Harga/cost hero saat direkrut di game
  "HP": [3100, 5580, 13795],            // HP di bintang 1 / 2 / 3
  "Physical_ATK": [130, 200, 295],      // Physical ATK di bintang 1 / 2 / 3
  "Magic_ATK": [130, 200, 295],         // Magic ATK di bintang 1 / 2 / 3
  "Jangkauan_ATK": 4,                   // Jarak serang (4 = ranged/jarak jauh, 1 = melee/jarak dekat)
  "Batas_Mana_Awal": [30, 30, 30],      // Mana yang dibutuhkan untuk cast skill PERTAMA kali (per bintang 1/2/3)
  "Batas_Mana": [30, 30, 30],           // Mana yang dibutuhkan untuk cast skill SETELAH cast pertama (per bintang 1/2/3)
  "Mana_Regen_Per_Detik": 0,            // Mana regen otomatis per detik (0 = tidak ada regen pasif)
  "Lifesteal": 0,                       // Persentase lifesteal dari basic attack (0 = tidak ada)
  "Spell_Vamp": 0,                      // Persentase spell vamp / heal dari damage skill (0 = tidak ada)
  "Physical_Penetration": 0,            // Pengurang Physical_Def musuh secara flat (0 = tidak ada penetrasi)
  "Magic_Penetration": 0,               // Pengurang Magic_Def musuh secara flat (0 = tidak ada penetrasi)
  "Magic_Def": [36, 36, 36],            // Magic defense di bintang 1 / 2 / 3
  "Physical_Def": [36, 36, 36],         // Physical defense di bintang 1 / 2 / 3
  "ATK_Speed": [0.75, 0.75, 0.75],      // Attack speed (jumlah basic attack per detik) di bintang 1 / 2 / 3

  "BASIC_ATK": {                        // Definisi formula damage basic attack Aurora
    "formula": [                        // Daftar komponen damage yang dijumlahkan saat basic attack
      { "ref": "Physical_ATK", "multiplier": [1, 1, 1] }    // Komponen Physical_ATK dengan multiplier 1x di bintang 1/2/3
    ]
  },

  // Skill: Aurora melepaskan es beku ke area musuh, memberikan hit pertama besar diikuti
  // 5 hailstone tambahan setiap 0.5 detik. Total durasi skill ~2.5 detik + 0.5s buffer.
  // Bintang 3 memiliki multiplier jauh lebih besar di setiap hit.
  "DMG_skill": {                        // Definisi formula damage skill + efek tambahan skill Aurora

    "formula": [                        // Formula placeholder (damage nyata ada di sequence)
      { "ref": "Magic_ATK", "multiplier": [0, 0, 0] }       // Tidak ada damage langsung di level ini, semua di sequence
    ],

    "skill_handler": {                  // Konfigurasi efek bertahap skill (dibaca oleh skill_handler.js)
      "type": "sequence",               // Tipe handler: efek dijalankan berurutan, tiap step punya delay sendiri
      "label": "Hailstone Blast",       // Label yang ditampilkan di timeline simulasi
      "cast_duration": 3.0,             // Total durasi cast skill dalam detik (0.5s buffer setelah hit terakhir)

      "sequence": [                     // Daftar step hit yang dijalankan berurutan setelah skill di-cast

        // Hit 1: ledakan utama es langsung saat cast
        { "delay": 0.0, "formula": [ { "ref": "Magic_ATK", "multiplier": [2.00, 2.10, 5.00] } ] },   // 200%/210%/500% Magic ATK di bintang 1/2/3

        // Hit 2–6: hailstone tambahan setiap 0.5 detik (total 5 batu es susulan)
        { "delay": 0.5, "formula": [ { "ref": "Magic_ATK", "multiplier": [0.75, 0.75, 1.90] } ] },   // Hailstone 1 – 0.5 detik setelah cast
        { "delay": 1.0, "formula": [ { "ref": "Magic_ATK", "multiplier": [0.75, 0.75, 1.90] } ] },   // Hailstone 2 – 1.0 detik setelah cast
        { "delay": 1.5, "formula": [ { "ref": "Magic_ATK", "multiplier": [0.75, 0.75, 1.90] } ] },   // Hailstone 3 – 1.5 detik setelah cast
        { "delay": 2.0, "formula": [ { "ref": "Magic_ATK", "multiplier": [0.75, 0.75, 1.90] } ] },   // Hailstone 4 – 2.0 detik setelah cast
        { "delay": 2.5, "formula": [ { "ref": "Magic_ATK", "multiplier": [0.75, 0.75, 1.90] } ] }    // Hailstone 5 – 2.5 detik setelah cast (terakhir)
      ]
    }
  }
};