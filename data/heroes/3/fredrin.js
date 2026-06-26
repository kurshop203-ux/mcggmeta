export const FREDRIN = {
  "fraksi": "Neobeasts",                // Nama faction/grup hero, dipakai untuk hitung bonus synergy tim
  "role": "Weapon Master",              // Role/kelas hero, dipakai untuk hitung bonus synergy berbasis role
  "gold": 3,                            // Harga/cost hero saat direkrut di game
  "HP": [2576, 4637, 8758],             // HP di bintang 1 / 2 / 3
  "Physical_ATK": [145, 215, 285],       // Physical ATK di bintang 1 / 2 / 3
  "Magic_ATK": [145, 215, 285],          // Magic ATK di bintang 1 / 2 / 3
  "Jangkauan_ATK": 1,                   // Jarak serang (4 = ranged/jarak jauh, 1 = melee/jarak dekat)
  "Batas_Mana_Awal": [50, 50, 50],       // Mana yang dibutuhkan untuk cast skill PERTAMA kali (per bintang)
  "Batas_Mana": [70, 70, 70],            // Mana yang dibutuhkan untuk cast skill SETELAH cast pertama (per bintang)
  "Mana_Regen_Per_Detik": 0,             // Mana regen otomatis per detik (diubah dari 2 → 0 sesuai permintaan)
  "Lifesteal": 0,                       // Persentase lifesteal (heal dari basic attack)
  "Spell_Vamp": 0,                      // Persentase spell vamp (heal dari damage skill)
  "Physical_Penetration": 0,             // Pengurang Physical_Def musuh secara flat
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
//Fredrinn menusukkan pedangnya ke depan, memberikan (+280% Total Physical ATK) Physical DMG (DMG berkurang seiring dengan jumlah lawan yang terkena) dan mendapatkan Shield sebesar 10% Max HP-nya selama 4 detik. Fredrinn juga memperkuat Basic ATK berikutnya, meningkatkan jangkauannya dan memberikan (+420% Total Physical ATK) Physical DMG.
  "DMG_skill": {                                              // Definisi formula damage skill + efek skill
  "formula": [ { "ref": "Magic_ATK", "multiplier": [0,0,0] }, { "ref": "Physical_ATK", "multiplier": [2.8, 2.8, 4.1] } ],  // Komponen damage skill (Magic 0, Physical per bintang)
"skill_handler": {                       // Konfigurasi efek tambahan skill (dibaca oleh skill_handler.js)
  "type": "buff",                        // Tipe handler: buff stat/efek sementara saat cast
  "label": "Fredrin Empowered Basic",    // Label yang ditampilkan di timeline simulasi
  "shield_now": [0.10, 0.10, 0.12],      // Shield sebesar (multiplier × HP) saat skill di-cast, per bintang
  "empowered_basic": [4.20, 4.20, 5.75]   // ← ganti dari buffs (multiplier basic attack berikutnya setelah cast, per bintang)
}
}
};