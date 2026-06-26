export const HELCURT = {
  "fraksi": 0,                          // Placeholder — belum diisi, seharusnya nama faction (string)
  "role": 0,                            // Placeholder — belum diisi, seharusnya nama role (string)
  "gold": 0,                            // Placeholder — belum diisi, seharusnya harga/cost hero
  "HP": [0, 0, 0],                      // Placeholder — belum diisi, seharusnya HP per bintang 1 / 2 / 3
  "Physical_ATK": [0, 0, 0],            // Placeholder — belum diisi, seharusnya Physical ATK per bintang
  "Magic_ATK": [0, 0, 0],               // Placeholder — belum diisi, seharusnya Magic ATK per bintang
  "Jangkauan_ATK": 0,                   // Placeholder — belum diisi, seharusnya jarak serang (4 = ranged, 1 = melee)
  "Batas_Mana_Awal": [0, 0, 0],         // Placeholder — belum diisi, seharusnya mana untuk cast skill pertama
  "Batas_Mana": [0, 0, 0],              // Placeholder — belum diisi, seharusnya mana untuk cast skill setelah cast pertama
  "Mana_Regen_Per_Detik": 0,            // Mana regen otomatis per detik (sudah 0, tidak diubah dari aslinya)
  "Lifesteal": 0,                       // Persentase lifesteal (heal dari basic attack)
  "Spell_Vamp": 0,                      // Persentase spell vamp (heal dari damage skill)
  "Physical_Penetration": 0,            // Pengurang Physical_Def musuh secara flat
  "Magic_Penetration": 0,               // Pengurang Magic_Def musuh secara flat
  "Magic_Def": [0, 0, 0],               // Placeholder — belum diisi, seharusnya Magic defense per bintang
  "Physical_Def": [0, 0, 0],            // Placeholder — belum diisi, seharusnya Physical defense per bintang
  "ATK_Speed": [0, 0, 0],               // Placeholder — belum diisi, seharusnya attack speed per bintang
  "BASIC_ATK": {                        // Definisi formula damage basic attack (placeholder, ref belum diisi)
    "formula": [                        // Daftar komponen damage yang dijumlahkan
      { "ref": 0, "multiplier": [0, 0, 0] },        // Placeholder — ref seharusnya string seperti "Physical_ATK"/"Magic_ATK"
      { "ref": 0, "multiplier": [0, 0, 0] }         // Placeholder — ref seharusnya string seperti "Physical_ATK"/"Magic_ATK"
    ] 
  },
  //Helcurt mendapatkan 50% Peningkatan ATK Speed selama 4 detik, dan menembakkan 5 Deadly Stinger ke depan,
//masing-masing memberikan (+75% Total Physical ATK) Physical DMG ke lawan. Saat penggunaan skill pertama, Helcurt berpindah ke lawan terjauh dalam jarak 3 petak (memprioritaskan Hero jarak jauh).
   "DMG_skill": {                       // Kosong — formula damage skill dan skill_handler belum diisi sama sekali
}
};