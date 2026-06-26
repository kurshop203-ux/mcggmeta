export const JULIAN = {
  "fraksi": "Mystic Meow",              // Nama faction/grup hero, dipakai untuk hitung bonus synergy tim
  "role": ["Mage", "Phasewarper"],               // Role/kelas hero, dipakai untuk hitung bonus synergy berbasis role
  "gold": 3,                            // Harga/cost hero saat direkrut di game
  "HP": [2840, 5115, 9665],             // HP di bintang 1 / 2 / 3
  "Physical_ATK": [135, 205, 275],       // Physical ATK di bintang 1 / 2 / 3
  "Magic_ATK": [135, 205, 275],          // Magic ATK di bintang 1 / 2 / 3
  "Jangkauan_ATK": 1,                   // Jarak serang (4 = ranged/jarak jauh, 1 = melee/jarak dekat)
  "Batas_Mana_Awal": [40, 40, 40],       // Mana yang dibutuhkan untuk cast skill PERTAMA kali (per bintang)
  "Batas_Mana": [60, 60, 60],            // Mana yang dibutuhkan untuk cast skill SETELAH cast pertama (per bintang)
  "Mana_Regen_Per_Detik": 0,             // Mana regen otomatis per detik (diubah dari 2 → 0 sesuai permintaan)
  "Lifesteal": 0,                       // Persentase lifesteal (heal dari basic attack)
  "Spell_Vamp": 0,                      // Persentase spell vamp (heal dari damage skill)
 "Physical_Penetration": 0,              // Pengurang Physical_Def musuh secara flat
  "Magic_Penetration": 0,                // Pengurang Magic_Def musuh secara flat
  "Magic_Def": [36, 36, 36],             // Magic defense di bintang 1 / 2 / 3
  "Physical_Def": [36, 36, 36],          // Physical defense di bintang 1 / 2 / 3
  "ATK_Speed": [0.75, 0.75, 0.75],       // Attack speed (basic attack per detik) di bintang 1 / 2 / 3
  "BASIC_ATK": {                         // Definisi formula damage basic attack
    "formula": [                         // Daftar komponen damage yang dijumlahkan
      { "ref": "Magic_ATK", "multiplier": [0,0,0] },        // Komponen dari Magic_ATK, multiplier 0 = tidak dipakai
      { "ref": "Physical_ATK", "multiplier": [1, 1, 1] }    // Komponen dari Physical_ATK, multiplier 1x di semua bintang
    ]
  },
  
//Julian melemparkan sabit yang kuat ke depan, memberikan (+200% Total Magic ATK) Magic DMG ke lawan pertama yang terkena. Sabit tersebut bertahan di tempat, memberikan (+30% Total Magic ATK) Magic DMG ke unit di sekitar setiap 0.25 detik selama 2 detik. Saat skill digunakan, Julian juga mendapatkan Shield sebesar 15% Max HP selama 4 detik
  "DMG_skill": {                                              // Definisi formula damage skill + efek skill
  "formula": [ { "ref": "Magic_ATK", "multiplier": [2,2,3.5] }, { "ref": "Physical_ATK", "multiplier": [0,0,0] } ],  // Komponen damage skill (hit pertama, Magic per bintang, Physical 0)
  "skill_handler": {                       // Konfigurasi efek tambahan skill (dibaca oleh skill_handler.js)
    "type": "sequence",                    // Tipe handler: efek bertahap, tiap step punya delay sendiri
    "label": "Julian Scythe",              // Label yang ditampilkan di timeline simulasi
    "sequence": [                          // Daftar step yang dijalankan berurutan sesuai delay masing-masing
      { "delay": 0.01, "shield_now": [0.15, 0.15, 0.15] },                                            // Step shield, 0.01 detik setelah cast, per bintang
{ "delay": 0.25, "formula": [ { "ref": "Magic_ATK", "multiplier": [0.30, 0.30, 0.50] } ] },             // Tick damage sabit ke-1, 0.25 detik setelah cast
{ "delay": 0.50, "formula": [ { "ref": "Magic_ATK", "multiplier": [0.30, 0.30, 0.50] } ] },             // Tick damage sabit ke-2, 0.50 detik setelah cast
{ "delay": 0.75, "formula": [ { "ref": "Magic_ATK", "multiplier": [0.30, 0.30, 0.50] } ] },             // Tick damage sabit ke-3, 0.75 detik setelah cast
{ "delay": 1.00, "formula": [ { "ref": "Magic_ATK", "multiplier": [0.30, 0.30, 0.50] } ] },             // Tick damage sabit ke-4, 1.00 detik setelah cast
{ "delay": 1.25, "formula": [ { "ref": "Magic_ATK", "multiplier": [0.30, 0.30, 0.50] } ] },             // Tick damage sabit ke-5, 1.25 detik setelah cast
{ "delay": 1.50, "formula": [ { "ref": "Magic_ATK", "multiplier": [0.30, 0.30, 0.50] } ] },             // Tick damage sabit ke-6, 1.50 detik setelah cast
{ "delay": 1.75, "formula": [ { "ref": "Magic_ATK", "multiplier": [0.30, 0.30, 0.50] } ] },             // Tick damage sabit ke-7, 1.75 detik setelah cast
{ "delay": 2.00, "formula": [ { "ref": "Magic_ATK", "multiplier": [0.30, 0.30, 0.50] } ] }              // Tick damage sabit ke-8, 2.00 detik setelah cast
    ]
  }
}
};