export const FRANGKO = {
  "fraksi": "Kishin",                   // Nama faction/grup hero, dipakai untuk hitung bonus synergy tim
  "role": ["Dauntless" ,"Weapon Master"] ,          // Role/kelas hero, dipakai untuk hitung bonus synergy berbasis role
  "gold": 3,                            // Harga/cost hero saat direkrut di game
  "HP": [2842, 5116, 9663],             // HP di bintang 1 / 2 / 3
  "Physical_ATK": [135, 205, 275],       // Physical ATK di bintang 1 / 2 / 3
  "Magic_ATK": [135, 205, 275],          // Magic ATK di bintang 1 / 2 / 3
  "Jangkauan_ATK": 1,                   // Jarak serang (4 = ranged/jarak jauh, 1 = melee/jarak dekat)
  "Batas_Mana_Awal": [80, 80, 80],       // Mana yang dibutuhkan untuk cast skill PERTAMA kali (per bintang)
  "Batas_Mana": [100, 100, 100],         // Mana yang dibutuhkan untuk cast skill SETELAH cast pertama (per bintang)
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
  // 
//Franco melemparkan kait besi ke arah lawan terjauh, memberikan (+55% Total Physical ATK) Physical DMG. Dia kemudian menarik lawan kembali dan mendapatkan Shield sebesar 10% Max HP-nya. Setelah itu, dia memberikan (+230% Total Physical ATK) Physical DMG ke lawan di sekitar (DMG berkurang seiring dengan jumlah lawan yang terkena).
"DMG_skill": {                                                  // Definisi formula damage skill utama + efek skill (damage asli ada di tiap step "sequence")
  "formula": [ { "ref": "Physical_ATK", "multiplier": [0,0,0] } ],  // ← dummy (formula utama tidak dipakai, hanya placeholder)
  "skill_handler": {                     // Konfigurasi efek tambahan skill (dibaca oleh skill_handler.js)
    "type": "sequence",                  // Tipe handler: efek bertahap, tiap step punya delay sendiri
    "label": "Frangko Combo",            // Label yang ditampilkan di timeline simulasi
    "sequence": [                        // Daftar step yang dijalankan berurutan sesuai delay masing-masing
      { 
        "delay": 0.1,                                                 // Step 1 terjadi 0.1 detik setelah skill di-cast
        "formula": [ { "ref": "Physical_ATK", "multiplier": [0.55, 0.55, 0.85] } ]  // Damage step 1, multiplier per bintang
      },
      { 
        "delay": 0.5,                       // Step 2 terjadi 0.5 detik setelah step sebelumnya
        "shield_now": [0.10, 0.10, 0.12]    // Shield sebesar (multiplier × HP) pada step 2, per bintang
      },
      { 
        "delay": 0.5,                                                 // Step 3 terjadi 0.5 detik setelah step sebelumnya
        "formula": [ { "ref": "Physical_ATK", "multiplier": [2.30, 2.30, 3.50] } ]  // Damage step 3, multiplier per bintang
      }
    ]
  }
}
};