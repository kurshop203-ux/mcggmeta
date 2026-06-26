export const KARRIE = {
  "fraksi": "Kishin",                   // Nama faction/grup hero, dipakai untuk hitung bonus synergy tim
  "role": "Marksman",                   // Role/kelas hero, dipakai untuk hitung bonus synergy berbasis role
  "gold": 4,                            // Harga/cost hero saat direkrut di game
  "HP": [3100, 5580, 13795],            // HP di bintang 1 / 2 / 3
  "Physical_ATK": [155, 235, 405],      // Physical ATK di bintang 1 / 2 / 3
  "Magic_ATK": [155, 235, 405],         // Magic ATK di bintang 1 / 2 / 3
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
  "ATK_Speed": [0.8, 0.8, 0.8],         // Attack speed (jumlah basic attack per detik) di bintang 1 / 2 / 3

  "BASIC_ATK": {                        // Definisi formula damage basic attack Karrie
    "formula": [                        // Daftar komponen damage yang dijumlahkan saat basic attack
      { "ref": "Physical_ATK", "multiplier": [1, 1, 1] }    // Komponen Physical_ATK dengan multiplier 1x di bintang 1/2/3
    ]
  },

  // Pasif: Setiap basic attack menumpuk Lightwheel Mark. Saat terkumpul 5 stack,
  // mark meledak memberikan bonus damage berdasarkan Physical_ATK.
  // Stack tidak hilang karena duration = Infinity (bertahan sampai meledak).
  "passive_basic_stack": {              // Definisi sistem stack pasif Karrie (Lightwheel Mark)
    "max_stacks": 5,                    // Jumlah maksimal stack sebelum trigger efek ledakan
    "duration": Infinity,               // Durasi stack (Infinity = stack tidak kedaluwarsa, bertahan sampai penuh)
    "bonus_per_stack": [0, 0, 0],       // Bonus damage tambahan per stack sebelum trigger (0 = tidak ada bonus bertahap)
    "bonus_ref": "Physical_ATK",        // Referensi stat yang dipakai untuk hitung bonus damage saat trigger
    "trigger_at_max": true,             // Efek ledakan hanya aktif saat stack mencapai max_stacks (5 stack)
    "trigger_multiplier": [1.30, 1.30, 5.00], // Multiplier Physical_ATK saat mark meledak di bintang 1/2/3
    "label": "Lightwheel Mark"          // Label yang ditampilkan di timeline simulasi
  },

  // Skill: Karrie mengaktifkan Speedy Lightwheel — meningkatkan ATK Speed dan menembakkan
  // 2 panah cahaya tambahan per basic attack selama 6 detik.
  // Tiap panah tambahan memberikan 70%/210% damage dari basic attack normal.
  "DMG_skill": {                        // Definisi formula damage skill + efek tambahan skill Karrie

    "formula": [                        // Formula damage langsung saat skill cast (kosong, skill ini murni buff)
      { "ref": "Physical_ATK", "multiplier": [0, 0, 0] }    // Tidak ada damage langsung saat skill di-cast
    ],

    "skill_handler": {                  // Konfigurasi efek buff sementara (dibaca oleh skill_handler.js)
      "type": "buff",                   // Tipe handler: memberikan buff stat sementara saat skill aktif
      "duration": 6,                    // Durasi buff berlangsung selama 6 detik
      "buffs": {                        // Daftar stat yang di-buff selama durasi aktif
        "ATK_Speed_Bonus": [0.80, 0.80, 1.20],       // Bonus ATK Speed +80% di bintang 1/2, +120% di bintang 3
        "extra_hits": 2,                              // Jumlah panah cahaya tambahan per basic attack (flat, semua bintang)
        "extra_hits_dmg_ratio": [0.70, 0.70, 2.10]   // Rasio damage tiap panah tambahan vs basic attack normal di bintang 1/2/3
      },
      "label": "Speedy Lightwheel"      // Label yang ditampilkan di timeline simulasi
    }
  }
};