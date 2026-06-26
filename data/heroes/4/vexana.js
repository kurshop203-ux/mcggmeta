export const VEXANA = {
  "fraksi": "Enchanted Tales",          // Nama faction/grup hero, dipakai untuk hitung bonus synergy tim
  "role": "Mage",                       // Role/kelas hero, dipakai untuk hitung bonus synergy berbasis role
  "gold": 4,                            // Harga/cost hero saat direkrut di game
  "HP": [3100, 5580, 13795],            // HP di bintang 1 / 2 / 3
  "Physical_ATK": [145, 220, 325],      // Physical ATK di bintang 1 / 2 / 3
  "Magic_ATK": [145, 220, 325],         // Magic ATK di bintang 1 / 2 / 3
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

  "BASIC_ATK": {                        // Definisi formula damage basic attack Vexana
    "formula": [                        // Daftar komponen damage yang dijumlahkan saat basic attack
      { "ref": "Magic_ATK",    "multiplier": [0, 0, 0] },   // Komponen Magic_ATK tidak dipakai (multiplier 0)
      { "ref": "Physical_ATK", "multiplier": [1, 1, 1] }    // Komponen Physical_ATK dengan multiplier 1x di bintang 1/2/3
    ]
  },

  // Skill: Vexana memanggil Charm Specter — melepaskan kutukan ke musuh target
  // memberikan Magic DMG murni tanpa komponen Physical.
  // Bintang 3 memiliki multiplier lebih besar (280% vs 200%/240%).
  "DMG_skill": {                        // Definisi formula damage skill Vexana (tidak ada skill_handler, murni damage)

    "formula": [                        // Formula damage utama skill (kutukan Charm Specter)
      { "ref": "Magic_ATK",    "multiplier": [2.1, 2.1, 5.45] }, // 200%/240%/280% Magic ATK di bintang 1/2/3
      { "ref": "Physical_ATK", "multiplier": [0,   0,   0  ] }  // Komponen Physical_ATK tidak dipakai di skill ini
    ]
  }
};