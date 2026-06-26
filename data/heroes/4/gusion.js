export const GUSION = {
  "fraksi": "Dragoncaller",             // Nama faction/grup hero, dipakai untuk hitung bonus synergy tim
  "role": "Swiftblade",                 // Role/kelas hero, dipakai untuk hitung bonus synergy berbasis role
  "gold": 4,                            // Harga/cost hero saat direkrut di game
  "HP": [3545, 6380, 15770],            // HP di bintang 1 / 2 / 3
  "Physical_ATK": [170, 255, 370],      // Physical ATK di bintang 1 / 2 / 3
  "Magic_ATK": [170, 255, 370],         // Magic ATK di bintang 1 / 2 / 3
  "Jangkauan_ATK": 1,                   // Jarak serang (1 = melee/jarak dekat, 4 = ranged/jarak jauh)
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

  "BASIC_ATK": {                        // Definisi formula damage basic attack Gusion
    "formula": [                        // Daftar komponen damage yang dijumlahkan saat basic attack
      { "ref": "Physical_ATK", "multiplier": [1, 1, 1] }    // Komponen Physical_ATK dengan multiplier 1x di bintang 1/2/3
    ]
  },

  // Skill: Gusion melepaskan 10 bilah bayangan secara beruntun ke target,
  // masing-masing memberikan Magic DMG dengan jeda 0.2 detik antar hit.
  // Total durasi serangan ±2 detik (10 hit × 0.2 detik).
  "DMG_skill": {                        // Definisi formula damage skill + efek tambahan skill Gusion

    "formula": [                        // Formula damage per hit bilah bayangan
      { "ref": "Magic_ATK", "multiplier": [0.90, 0.90, 2.35] } // 90%/90%/235% Magic ATK per hit di bintang 1/2/3
    ],

    "skill_handler": {                  // Konfigurasi multi-hit beruntun (dibaca oleh skill_handler.js)
      "type": "delayed_multihit",       // Tipe handler: beberapa hit identik dengan jeda tetap antar hit
      "hit_count": 10,                  // Total jumlah hit bilah bayangan yang dilepaskan
      "hit_delay": 0.2,                 // Jeda waktu antar hit dalam detik (0.2 detik per bilah)
      "label": "Shadowblade Slaughter"  // Label yang ditampilkan di timeline simulasi
    }
  }
};