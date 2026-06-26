export const PHARSA = {
  "fraksi": "Neobeasts",                // Nama faction/grup hero, dipakai untuk hitung bonus synergy tim
  "role": "Stargazer",                  // Role/kelas hero, dipakai untuk hitung bonus synergy berbasis role
  "gold": 4,                            // Harga/cost hero saat direkrut di game
  "HP": [3100, 5580, 13795],            // HP di bintang 1 / 2 / 3
  "Physical_ATK": [130, 200, 295],      // Physical ATK di bintang 1 / 2 / 3
  "Magic_ATK": [130, 200, 295],         // Magic ATK di bintang 1 / 2 / 3
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
  "ATK_Speed": [0.75, 0.75, 0.75],      // Attack speed (jumlah basic attack per detik) di bintang 1 / 2 / 3

  "BASIC_ATK": {                        // Definisi formula damage basic attack Pharsa
    "formula": [                        // Daftar komponen damage yang dijumlahkan saat basic attack
      { "ref": "Physical_ATK", "multiplier": [1, 1, 1] }    // Komponen Physical_ATK dengan multiplier 1x di bintang 1/2/3
    ]
  },

  // Skill: Pharsa melancarkan Feathered Air Strike — menjatuhkan 4 bom udara berurutan
  // ke area target, masing-masing dengan jeda 1.0 detik. Total durasi ±4 detik.
  // Bintang 3 memiliki multiplier per bom yang jauh lebih besar (870% vs 370%).
  "DMG_skill": {                        // Definisi formula damage skill + efek tambahan skill Pharsa

    "formula": [                        // Formula damage per bom udara
      { "ref": "Magic_ATK", "multiplier": [3.70, 3.70, 8.70] } // 370%/370%/870% Magic ATK per hit di bintang 1/2/3
    ],

    "skill_handler": {                  // Konfigurasi multi-hit berurutan (dibaca oleh skill_handler.js)
      "type": "delayed_multihit",       // Tipe handler: beberapa hit identik dengan jeda tetap antar hit
      "hit_count": 4,                   // Total jumlah bom udara yang dijatuhkan (4 hit)
      "hit_delay": 1.0,                 // Jeda waktu antar hit dalam detik (1.0 detik per bom)
      "label": "Feathered Air Strike"   // Label yang ditampilkan di timeline simulasi
    }
  }
};