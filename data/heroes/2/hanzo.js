export const HANZO = {
  "fraksi": "Emberlord",                // Nama faction/grup hero, dipakai untuk hitung bonus synergy tim
  "role": "Swiftblade",                 // Role/kelas hero, dipakai untuk hitung bonus synergy berbasis role
  "gold": 2,                            // Harga/cost hero saat direkrut di game
  "HP": [2025, 3645, 6550],             // HP di bintang 1 / 2 / 3
  "Physical_ATK": [120, 180, 240],       // Physical ATK di bintang 1 / 2 / 3
  "Magic_ATK": [120, 180, 240],          // Magic ATK di bintang 1 / 2 / 3
  "Jangkauan_ATK": 1,                   // Jarak serang (4 = ranged/jarak jauh, 1 = melee/jarak dekat)
  "Batas_Mana_Awal": [20, 20, 20],       // Mana yang dibutuhkan untuk cast skill PERTAMA kali (per bintang)
  "Batas_Mana": [40, 40, 40],            // Mana yang dibutuhkan untuk cast skill SETELAH cast pertama (per bintang)
  "Mana_Regen_Per_Detik": 0,             // Mana regen otomatis per detik (diubah dari 2 → 0 sesuai permintaan)
  "Lifesteal": 0,                       // Persentase lifesteal (heal dari basic attack)
  "Spell_Vamp": 0,                      // Persentase spell vamp (heal dari damage skill)
  "Physical_Penetration": 0,             // Pengurang Physical_Def musuh secara flat
  "Magic_Penetration": 0,                // Pengurang Magic_Def musuh secara flat
  "Magic_Def": [36, 36, 36],             // Magic defense di bintang 1 / 2 / 3
  "Physical_Def": [36, 36, 36],          // Physical defense di bintang 1 / 2 / 3
  "ATK_Speed": [0.65, 0.65, 0.65],       // Attack speed (basic attack per detik) di bintang 1 / 2 / 3
  "BASIC_ATK": {                         // Definisi formula damage basic attack
    "formula": [                         // Daftar komponen damage yang dijumlahkan
      { "ref": "Magic_ATK", "multiplier": [0,0,0] },        // Komponen dari Magic_ATK, multiplier 0 = tidak dipakai
      { "ref": "Physical_ATK", "multiplier": [1, 1, 1] }    // Komponen dari Physical_ATK, multiplier 1x di semua bintang
    ]
  },
  "DMG_skill": {                                            // Definisi formula damage skill + efek skill
    "formula": [                                            // Daftar komponen damage skill yang dijumlahkan
      { "ref": "Magic_ATK", "multiplier": [0,0,0] },            // Komponen dari Magic_ATK, multiplier 0 = tidak dipakai
      { "ref": "Physical_ATK", "multiplier": [2.2,2.2,2.8] }    // Komponen dari Physical_ATK, multiplier per bintang
    ],
    "skill_handler": {                  // Konfigurasi efek tambahan skill (dibaca oleh skill_handler.js)
      "type": "stack",                  // Tipe handler: buff bertambah/menumpuk tiap kali skill di-cast
      "label": "Hanzo DMG Stack",       // Label yang ditampilkan di timeline simulasi
      "max_stacks": 3,                  // Batas maksimal jumlah stack yang bisa menumpuk
      "missing_hp_assume": 0.5,         // Asumsi persentase HP yang hilang, dipakai untuk hitung heal_missing_hp
      "heal_missing_hp": [0.20, 0.20, 0.20],  // Heal sebesar (multiplier × HP hilang) saat skill di-cast, per bintang
      "buff_per_stack": {               // Buff yang bertambah nilainya setiap satu stack baru terbentuk
        "Skill_DMG_Bonus": [0.20, 0.20, 0.20]  // Bonus persentase damage skill, dikali jumlah stack aktif, per bintang
      }
    }
  }
};