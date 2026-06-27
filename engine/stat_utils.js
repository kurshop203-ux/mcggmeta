// ════════════════════════════════════════════════════════════════
// stat_utils.js — VERSI BERKOMENTAR (untuk orang non-programmer)
// stat_utils.js hardcoded Dragon
// ════════════════════════════════════════════════════════════════
//
// 📖 GAMBARAN BESAR:
// File ini bertugas MENGHITUNG STAT AKHIR seorang hero — yaitu
// menggabungkan:
//   1. Stat DASAR hero (dari database, tergantung jumlah bintang)
//   2. Semua BUFF yang dimiliki hero (dari equipment, relic, dll)
// menjadi satu set "Final Stats" yang siap dipakai untuk simulasi
// pertempuran (simulate_battle.js).
//
// Selain itu, file ini juga menghitung berapa DAMAGE basic attack dan
// damage skill hero, berdasarkan "formula" yang didefinisikan di data
// hero (misal: "damage skill = 150% dari Magic ATK").
//
// Analoginya: bayangkan hero seperti karakter RPG yang punya kertas
// karakter (character sheet). File ini adalah "kalkulator" yang
// mengisi kertas itu — mulai dari angka dasar, ditambah semua
// "equipment bonus", sampai menghasilkan angka akhir yang dipakai
// untuk bertarung.
// ════════════════════════════════════════════════════════════════


/**
 * getBaseValue: mengambil nilai stat DASAR (sebelum kena buff apa pun)
 * dari data hero, sesuai jumlah bintangnya.
 *
 * Beberapa stat nilainya BEDA-BEDA per bintang (disimpan sebagai
 * daftar/array, misal HP = [1000, 1200, 1500, 1800, 2200] untuk
 * bintang 1-5). Stat lain nilainya SAMA untuk semua bintang (disimpan
 * sebagai 1 angka tunggal).
 *
 * Fungsi ini otomatis mendeteksi mana yang berlaku, lalu mengembalikan
 * angka yang sesuai dengan starIndex (0 = bintang 1, 4 = bintang 5, dst).
 * Kalau stat-nya tidak ada sama sekali di data, dianggap 0.
 */
export function getBaseValue(baseData, statKey, starIndex) {
  const val = baseData[statKey];
  if (val === undefined) return 0; // stat tidak ada di data → anggap 0

  if (Array.isArray(val)) {
    // Stat berbentuk daftar per-bintang → ambil sesuai starIndex,
    // tapi dibatasi (clamp) supaya tidak keluar dari panjang daftar
    const idx = Math.min(starIndex, val.length - 1);
    return val[idx];
  }

  // Stat berbentuk angka tunggal → langsung dipakai untuk semua bintang
  return val;
}


// ════════════════════════════════════════════════════════════════
// 🧮 calculateFinalStats: FUNGSI UTAMA — menghitung stat akhir hero
// (HP, ATK, dll) + damage basic attack & skill, dengan semua buff
// yang dimiliki hero sudah diperhitungkan.
//
// Input:
//   hero     → data hero (termasuk hero.buffs = daftar buff yang dimiliki)
//   baseData → data dasar hero dari database
//
// Output: hero asli + tambahan info finalStats & damage (lihat paling
// bawah fungsi ini).
// ════════════════════════════════════════════════════════════════
export function calculateFinalStats(hero, baseData) {
  // Index bintang (bintang 1 → index 0, dst), dipakai untuk ambil
  // angka stat yang sesuai dari data per-bintang.
  const starIndex = (hero.stars || 1) - 1;

  // Daftar buff yang dimiliki hero saat ini (misal dari equipment/relic).
  // Bentuknya seperti { "Physical_ATK_Bonus": 0.2, "HP_Flat": 500, ... }
  const buffs = hero.buffs || {};

  // 1️⃣ Mulai dengan stat DASAR hero (belum kena buff apa pun),
  // diambil sesuai bintangnya lewat getBaseValue di atas.
  const finalStats = {
    HP:                   getBaseValue(baseData, 'HP', starIndex),
    Physical_ATK:         getBaseValue(baseData, 'Physical_ATK', starIndex),
    Magic_ATK:            getBaseValue(baseData, 'Magic_ATK', starIndex),
    Physical_Def:         getBaseValue(baseData, 'Physical_Def', starIndex),
    Magic_Def:            getBaseValue(baseData, 'Magic_Def', starIndex),
    ATK_Speed:            getBaseValue(baseData, 'ATK_Speed', starIndex),
    Lifesteal:            getBaseValue(baseData, 'Lifesteal', starIndex),
    Spell_Vamp:           getBaseValue(baseData, 'Spell_Vamp', starIndex),
    Physical_Penetration: getBaseValue(baseData, 'Physical_Penetration', starIndex),
    Magic_Penetration:    getBaseValue(baseData, 'Magic_Penetration', starIndex),
    Mana_Regen_Per_Detik: getBaseValue(baseData, 'Mana_Regen_Per_Detik', starIndex),
    Batas_Mana:           getBaseValue(baseData, 'Batas_Mana', starIndex),
    Dragon_DMG: 0, // stat khusus, mulai dari 0 (hanya bertambah lewat buff tertentu)
  };

  // 2️⃣ Siapkan "keranjang" kosong untuk menampung BONUS dari buff,
  // dipisah jadi 2 jenis:
  //   - pctBonus  → bonus dalam bentuk PERSEN (misal +20% Physical ATK)
  //   - flatBonus → bonus dalam bentuk ANGKA TETAP (misal +500 HP)
  // Kita kumpulkan dulu semua bonus dari semua buff, baru diterapkan
  // ke finalStats SEKALIGUS di akhir — supaya urutan buff tidak
  // mempengaruhi hasil akhir (misal +10% lalu +10% lagi = +20% total,
  // bukan dihitung berurutan/menumpuk secara salah).
  const pctBonus = {
    Physical_ATK: 0, Magic_ATK: 0, Physical_Def: 0, Magic_Def: 0,
    ATK_Speed: 0, HP: 0, Lifesteal: 0, Spell_Vamp: 0,
  };

  const flatBonus = {
    Physical_ATK: 0, Magic_ATK: 0, Physical_Def: 0, Magic_Def: 0,
    HP: 0, Mana_Regen_Per_Detik: 0, Physical_Penetration: 0, Magic_Penetration: 0,
  };

  // Variabel-variabel lain yang bukan "stat biasa", tapi tetap perlu
  // dikumpulkan dari buff:
  let basicAtkDmgBonus = 0; // bonus % damage khusus basic attack
  let doubleAtkChance  = 0; // persen kesempatan basic attack jadi 2x
  let healPercentHP    = 0; // persen heal dari HP (dipakai fitur lain)
  let shieldPercentHP  = 0; // persen shield dari HP (dipakai fitur lain)
  const extraStats     = {}; // stat "tidak baku" yang tidak ada di daftar BUFF_REGISTRY

  // ════════════════════════════════════════════════════════════
  // 📋 BUFF_REGISTRY — "KAMUS" YANG MENERJEMAHKAN NAMA BUFF
  // KE JENIS EFEKNYA.
  //
  // Setiap baris di sini berarti: "kalau ada buff bernama X, maka itu
  // adalah tipe Y, dan harus diterapkan ke stat Z."
  //
  // type yang tersedia:
  //   'pct'     → bonus PERSEN ke satu/beberapa stat (misal +20% ATK)
  //   'pct_abs' → bonus PERSEN tapi ditambahkan LANGSUNG sebagai angka
  //               absolut (khusus untuk Lifesteal & Spell Vamp, karena
  //               keduanya sendiri sudah berbentuk "persen", jadi tidak
  //               perlu dikali lagi — cukup dijumlahkan langsung)
  //   'flat'    → bonus ANGKA TETAP (misal +500 HP)
  //   'dmg'     → bonus yang berhubungan dengan damage (basic attack
  //               bonus, double attack chance, atau damage bonus umum)
  //   'utility' → bonus untuk fitur lain seperti persen heal/shield
  //
  // targets = daftar stat mana saja yang kena efek buff ini (bisa lebih
  // dari satu, misal "Hybrid_ATK_Bonus" mengenai Physical_ATK DAN Magic_ATK
  // sekaligus — buff yang menguntungkan kedua jenis attacker).
  // ════════════════════════════════════════════════════════════
  const BUFF_REGISTRY = {
    Physical_ATK_Bonus:   { type: 'pct',     targets: ['Physical_ATK'] },
    Magic_ATK_Bonus:      { type: 'pct',     targets: ['Magic_ATK'] },
    ATK_Speed_Bonus:      { type: 'pct',     targets: ['ATK_Speed'] },
    HP_Bonus:             { type: 'pct',     targets: ['HP'] },
    MAX_HP_Percent_Bonus: { type: 'pct',     targets: ['HP'] },
    Physical_Def_Bonus:   { type: 'pct',     targets: ['Physical_Def'] },
    Magic_Def_Bonus:      { type: 'pct',     targets: ['Magic_Def'] },

    Mana_Regen_Flat:      { type: 'flat',    targets: ['Mana_Regen_Per_Detik'] },
    Physical_ATK_Flat:    { type: 'flat',    targets: ['Physical_ATK'] },
    Magic_ATK_Flat:       { type: 'flat',    targets: ['Magic_ATK'] },
    HP_Flat:              { type: 'flat',    targets: ['HP'] },
    HP_Bonus: { type: 'pct', targets: ['HP'] }, // (duplikat dari atas — tetap dibiarkan sama seperti aslinya)
    Dragon_DMG_Flat:      { type: 'flat',    targets: ['Dragon_DMG'] },

    // "Hybrid" = buff yang sekaligus mengenai DUA stat sekaligus
    Hybrid_Lifesteal_Bonus: { type: 'pct_abs', targets: ['Lifesteal', 'Spell_Vamp'] },
    Hybrid_DEF_Flat:        { type: 'flat',    targets: ['Physical_Def', 'Magic_Def'] },
    Hybrid_Pen_Flat:        { type: 'flat',    targets: ['Physical_Penetration', 'Magic_Penetration'] },
    Hybrid_ATK_Bonus:       { type: 'pct',     targets: ['Physical_ATK', 'Magic_ATK'] },
    Hybrid_ATK_Flat:        { type: 'flat',    targets: ['Physical_ATK', 'Magic_ATK'] },

    Lifesteal_Bonus:      { type: 'pct_abs', targets: ['Lifesteal'] },
    Spell_Vamp_Bonus:     { type: 'pct_abs', targets: ['Spell_Vamp'] },

    Basic_ATK_DMG_Bonus:  { type: 'dmg',     targets: ['basicAtkDmgBonus'] },
    Double_ATK_Chance:    { type: 'dmg',     targets: ['doubleAtkChance'] },
    DMG_Bonus:            { type: 'dmg',     targets: ['DMG_Bonus'] },

    Shield_Percent_HP:    { type: 'utility', targets: ['shieldPercentHP'] },
    Heal_Percent_HP:      { type: 'utility', targets: ['healPercentHP'] },
    Skill_DMG_Bonus: { type: 'dmg', targets: ['Skill_DMG_Bonus'] },
  };

  // ── 🔄 TERAPKAN SETIAP BUFF YANG DIMILIKI HERO ─────────────────
  // Untuk setiap buff yang dimiliki hero, cari "aturan"nya di
  // BUFF_REGISTRY di atas, lalu masukkan nilainya ke keranjang yang
  // sesuai (pctBonus, flatBonus, basicAtkDmgBonus, dst).
  Object.entries(buffs).forEach(([stat, value]) => {
    const rule = BUFF_REGISTRY[stat];

    // Kalau nama buff-nya TIDAK DIKENALI (tidak ada di kamus di atas),
    // beri peringatan di console (untuk developer), lalu tetap simpan
    // nilainya ke extraStats supaya tidak hilang begitu saja.
    if (!rule) {
      console.warn(`[BUFF] Unknown buff type: "${stat}" — tambahkan ke BUFF_REGISTRY`);
      extraStats[stat] = (extraStats[stat] || 0) + value;
      return;
    }

    // Untuk setiap stat yang menjadi "target" buff ini, terapkan
    // sesuai jenisnya (pct/pct_abs/flat/dmg/utility):
    rule.targets.forEach(target => {
      switch (rule.type) {
        case 'pct':
          // Kumpulkan dulu persentasenya, belum dikalikan ke stat
          pctBonus[target] = (pctBonus[target] || 0) + value;
          break;
        case 'pct_abs':
          // Langsung tambahkan sebagai angka (khusus Lifesteal/Spell Vamp)
          finalStats[target] = (finalStats[target] || 0) + value;
          break;
        case 'flat':
          // Kumpulkan dulu angka tetapnya, belum ditambahkan ke stat
          flatBonus[target] = (flatBonus[target] || 0) + value;
          break;
        case 'dmg':
          // Bonus terkait damage, disimpan di variabel masing-masing
          if (target === 'basicAtkDmgBonus') basicAtkDmgBonus += value;
          else if (target === 'doubleAtkChance') doubleAtkChance += value;
          else extraStats[target] = (extraStats[target] || 0) + value; // misal DMG_Bonus, Skill_DMG_Bonus
          break;
        case 'utility':
          // Bonus untuk fitur heal/shield persen HP
          if (target === 'healPercentHP')   healPercentHP   += value;
          if (target === 'shieldPercentHP') shieldPercentHP += value;
          break;
      }
    });
  });

// ── ✅ TERAPKAN BONUS PERSEN (pctBonus) KE STAT ASLI ────────────
// Dilakukan SETELAH semua buff dikumpulkan, supaya semua bonus persen
// dari berbagai sumber buff dijumlahkan dulu sebelum dikalikan.
// Misal: dua buff "+10% ATK" akan jadi "+20% ATK" total, BUKAN
// (base × 1.1) × 1.1 (yang hasilnya beda/lebih besar).
Object.entries(pctBonus).forEach(([key, pct]) => {
  if (pct === 0) return; // tidak ada bonus, lewati saja

  // Lifesteal & Spell Vamp diperlakukan khusus: bonus % ditambahkan
  // LANGSUNG sebagai angka (bukan dikalikan), karena base-nya sendiri
  // sudah berbentuk persentase.
  if (key === 'Lifesteal') { finalStats.Lifesteal += pct; return; }
  if (key === 'Spell_Vamp') { finalStats.Spell_Vamp += pct; return; }

  // Stat lainnya: dikalikan dengan (1 + total persen bonus)
  if (finalStats[key] !== undefined) finalStats[key] = finalStats[key] * (1 + pct);
});

// ── ✅ TERAPKAN BONUS ANGKA TETAP (flatBonus) KE STAT ASLI ──────
// Ini dilakukan SETELAH bonus persen, supaya bonus flat TIDAK ikut
// dikalikan oleh persen (logikanya: "+500 HP" itu tetap +500,
// bukan ikut dikalikan 1.2x kalau ada buff +20% HP).
Object.entries(flatBonus).forEach(([key, val]) => {
  if (finalStats[key] !== undefined) finalStats[key] += val;
});

  // Simpan beberapa nilai tambahan ke finalStats supaya bisa diakses
  // dari luar (misal oleh simulate_battle.js)
  finalStats.Shield_Percent_HP = shieldPercentHP;
  finalStats.Heal_Percent_HP   = healPercentHP;
  finalStats.extra             = extraStats;

  // Pengali damage basic attack = 1 (normal) + semua bonus % yang terkumpul
  const dmgBonusMultiplier = 1 + basicAtkDmgBonus + (extraStats.DMG_Bonus || 0);

  // ════════════════════════════════════════════════════════════
  // 🧮 computeFormulaDmg: HITUNG DAMAGE DARI SEBUAH "FORMULA"
  //
  // Formula adalah daftar "bagian" (parts) yang masing-masing berisi:
  //   - ref        → nama stat acuan (misal "Physical_ATK")
  //   - multiplier → pengali untuk stat itu (misal 1.5 = 150%)
  // Lalu damage total = jumlah dari (nilai stat × pengalinya) untuk
  // SEMUA bagian dalam formula.
  //
  // Contoh sederhana: formula skill = [
  //   { ref: "Physical_ATK", multiplier: 1.2 },
  //   { ref: "Magic_ATK",    multiplier: 0.5 }
  // ]
  // Maka damage = (Physical_ATK × 1.2) + (Magic_ATK × 0.5)
  //
  // Fungsi ini dipakai untuk menghitung damage BASIC ATTACK dan
  // damage SKILL — keduanya pakai cara hitung yang sama, cuma
  // formula-nya beda (diambil dari baseData.BASIC_ATK atau
  // baseData.DMG_skill).
  // ════════════════════════════════════════════════════════════
  function computeFormulaDmg(formulaObj) {
    if (!formulaObj || !Array.isArray(formulaObj.formula)) return { total: 0, parts: [] };

    let total = 0;
    const parts = []; // rincian per bagian, untuk laporan/breakdown nanti

    formulaObj.formula.forEach(part => {
      // Ambil nilai stat acuan: utamakan dari finalStats (stat yang
      // sudah kena buff), kalau tidak ada di sana baru ambil dari
      // stat DASAR (getBaseValue) — ini supaya formula bisa merujuk
      // ke stat apa pun, baik yang sudah final maupun yang murni dasar.
      const refStat = finalStats[part.ref] !== undefined
        ? finalStats[part.ref]
        : getBaseValue(baseData, part.ref, starIndex);

      // Pengali bisa berbeda-beda per bintang (array) atau sama untuk
      // semua bintang (angka tunggal) — sama seperti getBaseValue.
      const mult = Array.isArray(part.multiplier)
        ? part.multiplier[Math.min(starIndex, part.multiplier.length - 1)]
        : part.multiplier;

      const val = refStat * mult;
      total += val;
      parts.push({ ref: part.ref, statValue: round2(refStat), multiplier: mult, value: round2(val) });
    });

    return { total, parts };
  }

  // ── 🗡️ HITUNG DAMAGE BASIC ATTACK ───────────────────────────────
  const basicAtkCalc = computeFormulaDmg(baseData.BASIC_ATK);
  const basicAtkRaw  = basicAtkCalc.total;             // damage mentah (sebelum bonus %)
  const basicAtkDmg  = basicAtkRaw * dmgBonusMultiplier; // damage akhir (sudah kena bonus %)

  // ── 🔮 HITUNG DAMAGE SKILL ───────────────────────────────────────
  const skillDmgCalc = computeFormulaDmg(baseData.DMG_skill);
  const skillDmgRaw  = skillDmgCalc.total; // damage mentah skill
  // Damage skill akhir = damage mentah × (1 + bonus damage umum + bonus damage skill khusus)
  const skillDmg     = skillDmgRaw * (1 + (extraStats.DMG_Bonus || 0) + (extraStats.Skill_DMG_Bonus || 0));

  // ════════════════════════════════════════════════════════════
  // 📦 HASIL AKHIR — dikembalikan ke pemanggil fungsi ini
  // (biasanya dipanggil dari simulate_battle.js)
  // ════════════════════════════════════════════════════════════
  return {
    ...hero,           // sertakan semua data hero asli
    finalStats,         // stat akhir hero (HP, ATK, dst, sudah kena semua buff)
    damage: {
      basicAtk: basicAtkDmg,
      skillDmg,
      totalDmg: basicAtkDmg + skillDmg,
      breakdown: {
        // Rincian damage basic attack — untuk ditampilkan di laporan,
        // supaya pengguna bisa lihat "dari mana asalnya angka ini"
        basicAtk: {
          parts: basicAtkCalc.parts,
          raw: round2(basicAtkRaw),
          dmgBonusMultiplier: round2(dmgBonusMultiplier),
          doubleAtkChance,
          final: round2(basicAtkDmg),
        },
        // Rincian damage skill, sama tujuannya seperti di atas
        skillDmg: {
  parts: skillDmgCalc.parts,
  raw: round2(skillDmgRaw),
  dmgBonusMultiplier: round2(1 + (extraStats.DMG_Bonus || 0) + (extraStats.Skill_DMG_Bonus || 0)),
  final: round2(skillDmg),
},
      },
    },
  };
}

// 🔢 round2: alat bantu kecil untuk membulatkan angka ke 2 angka
// desimal (sama seperti round2 di simulate_battle.js, tapi versi
// lokal khusus untuk file ini). Contoh: round2(3.14159) → 3.14.
function round2(n) {
  return Math.round(n * 100) / 100;
}