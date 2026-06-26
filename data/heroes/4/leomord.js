export const LEOMORD = {
  "fraksi": "Enchanted Tales",          // Nama faction/grup hero, dipakai untuk hitung bonus synergy tim
  "role": "Weapon Master",              // Role/kelas hero, dipakai untuk hitung bonus synergy berbasis role
  "gold": 4,                            // Harga/cost hero saat direkrut di game
  "HP": [3545, 6380, 15770],            // HP di bintang 1 / 2 / 3
  "Physical_ATK": [180, 275, 410],      // Physical ATK di bintang 1 / 2 / 3
  "Magic_ATK": [180, 275, 410],         // Magic ATK di bintang 1 / 2 / 3
  "Jangkauan_ATK": 1,                   // Jarak serang (1 = melee/jarak dekat, 4 = ranged/jarak jauh)
  "Batas_Mana_Awal": [50, 50, 50],      // Mana yang dibutuhkan untuk cast skill PERTAMA kali (per bintang 1/2/3)
  "Batas_Mana": [70, 70, 70],           // Mana yang dibutuhkan untuk cast skill SETELAH cast pertama (per bintang 1/2/3)
  "Mana_Regen_Per_Detik": 0,            // Mana regen otomatis per detik (0 = tidak ada regen pasif)
  "Lifesteal": 0,                    // Persentase lifesteal dari basic attack (10% dari damage basic attack)
  "Spell_Vamp": 0,                   // Persentase spell vamp / heal dari damage skill (10% dari damage skill)
  "Physical_Penetration": 0,           // Pengurang Physical_Def musuh secara flat sebesar 10 poin
  "Magic_Penetration": 0,              // Pengurang Magic_Def musuh secara flat sebesar 10 poin
  "Magic_Def": [36, 36, 36],         // Magic defense di bintang 1 / 2 / 3 (lebih tinggi dari hero standar)
  "Physical_Def": [36, 36, 36],      // Physical defense di bintang 1 / 2 / 3 (lebih tinggi dari hero standar)
  "ATK_Speed": [0.75, 0.75, 0.75],      // Attack speed (jumlah basic attack per detik) di bintang 1 / 2 / 3

  "BASIC_ATK": {                        // Definisi formula damage basic attack Leomord
    "formula": [                        // Daftar komponen damage yang dijumlahkan saat basic attack
      { "ref": "Magic_ATK",    "multiplier": [0,0,0] },   // Komponen Magic_ATK dengan multiplier 1x di bintang 1/2/3
      { "ref": "Physical_ATK", "multiplier": [1, 1, 1] }    // Komponen Physical_ATK dengan multiplier 1x di bintang 1/2/3
    ]
  },

  // Skill: Leomord menghantam musuh dengan serangan penuh amarah, memberikan
  // gabungan Magic DMG dan Physical DMG dalam satu hit.
  // Bintang 3 memiliki multiplier lebih besar di kedua komponen damage.
  "DMG_skill": {                        // Definisi formula damage skill Leomord (tidak ada skill_handler, murni damage)

    "formula": [                        // Formula damage utama skill (satu hit gabungan)
      { "ref": "Magic_ATK",    "multiplier": [0,0,0] }, // 200%/240%/280% Magic ATK di bintang 1/2/3
      { "ref": "Physical_ATK", "multiplier": [4.8,4.8,10.425] }  // 150%/180%/210% Physical ATK di bintang 1/2/3
    ]
  }
};