export const TIGREAL = {
  "fraksi": "Emberlord",                // Nama faction/grup hero, dipakai untuk hitung bonus synergy tim
  "role": "Defender",                   // Role/kelas hero, dipakai untuk hitung bonus synergy berbasis role
  "gold": 3,                            // Harga/cost hero saat direkrut di game
  "HP": [2840, 5115, 9665],             // HP di bintang 1 / 2 / 3
  "Physical_ATK": [135, 205, 275],      // Physical ATK di bintang 1 / 2 / 3
  "Magic_ATK": [135, 205, 275],         // Magic ATK di bintang 1 / 2 / 3
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

  "BASIC_ATK": {                        // Definisi formula damage basic attack Tigreal
    "formula": [                        // Daftar komponen damage yang dijumlahkan saat basic attack
      { "ref": "Magic_ATK",    "multiplier": [0, 0, 0] },   // Komponen Magic_ATK tidak dipakai (multiplier 0 di semua bintang)
      { "ref": "Physical_ATK", "multiplier": [1, 1, 1] }    // Komponen Physical_ATK dengan multiplier 1x di bintang 1/2/3
    ]
  },

  // Skill: Tigreal mengeluarkan kekuatan palunya, mendapatkan Shield sebesar 10% Max HP selama 4 detik.
  // Tigreal lalu menghantam lawan yang bersebelahan, memberikan (+315% Total Physical ATK) Physical DMG
  // dan menyebabkan stun ke mereka selama 0.6 detik.
  "DMG_skill": {                        // Definisi formula damage skill + efek tambahan skill Tigreal

    "formula": [                        // Formula damage utama skill (hammer slam)
      { "ref": "Magic_ATK",    "multiplier": [0,    0,    0   ] }, // Komponen Magic_ATK tidak dipakai di skill ini
      { "ref": "Physical_ATK", "multiplier": [3.15, 3.15, 4.60] }  // 315%/315%/460% Physical ATK di bintang 1/2/3
    ],

    "skill_handler": {                  // Konfigurasi efek tambahan skill (dibaca oleh skill_handler.js)
      "type": "buff",                   // Tipe handler: memberikan buff/efek sementara saat skill di-cast
      "label": "Tigreal Shield",        // Label yang ditampilkan di timeline simulasi
      "shield_now": [0.10, 0.12, 0.16]  // Shield langsung aktif saat cast: 10%/12%/16% dari Max HP di bintang 1/2/3
    }
  }
};