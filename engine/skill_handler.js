// ════════════════════════════════════════════════════════════════
// skill_handler.js — VERSI BERKOMENTAR (untuk orang non-programmer)
// ════════════════════════════════════════════════════════════════
//
// 📖 GAMBARAN BESAR:
// File ini adalah "buku resep" yang menerjemahkan konfigurasi skill
// (yang ditulis di data hero, berupa angka & teks) menjadi EFEK NYATA
// di simulasi pertempuran (file simulate_battle.js).
//
// Analoginya: simulate_battle.js itu seperti "panggung pertunjukan",
// sedangkan skill_handler.js ini adalah "instruksi sutradara" — kalau
// skill-nya tipe A, lakukan ini; kalau tipe B, lakukan itu.
//
// Setiap skill punya `config.type` yang menentukan PERILAKUNYA:
//   'buff'             → kasih buff stat sementara (paling umum, default)
//   'multihit'         → skill pukul berkali-kali (jumlah hit-nya diatur
//                         di simulate_battle.js, bukan di sini)
//   'stack'            → buff-nya BERTAMBAH tiap kali skill di-cast lagi
//                         (numpuk), ada batas maksimalnya
//   'cooldown'         → skill jalan otomatis tiap X detik (timer),
//                         bukan menunggu mana penuh
//   'sequence'         → efek terjadi BERTAHAP dengan jeda waktu antar
//                         tahap (misal: ledakan 1 di detik+0, ledakan 2
//                         di detik+1, dst)
//   'delayed_multihit' → hit PERTAMA terjadi langsung saat di-cast,
//                         sisanya menyusul belakangan dengan jeda
//
// Field-field opsional (boleh ada atau tidak ada di konfigurasi skill,
// kalau tidak ada dianggap 0/false/kosong):
//   hits                    → berapa kali skill memukul per cast (default 1)
//   heal_now                → langsung heal sekian % dari HP saat cast
//   heal_flat               → langsung heal sejumlah angka tetap saat cast
//   heal_magic_atk          → langsung heal sekian % dari Magic ATK saat cast
//   heal_missing_hp         → heal berdasarkan seberapa banyak HP yang hilang
//   shield_now              → langsung dapat shield sekian % dari HP saat cast
//   shield_flat             → langsung dapat shield sejumlah angka tetap
//   empowered_basic         → basic attack berikutnya dikuatkan (pengali tetap)
//   empowered_basic_count   → sejumlah basic attack berikutnya dikuatkan
//   buff_additive           → true = buff baru DITAMBAHKAN ke buff lama;
//                              false = buff baru MENGGANTI buff lama
//   cooldown                → jeda waktu antar cast (khusus type 'cooldown')
//   ignore_mana             → true = skill ini tidak butuh mana sama sekali
//                              (khusus type 'cooldown')
//   max_stacks              → batas maksimal stack (khusus type 'stack')
//   buff_per_stack          → besar buff PER stack (khusus type 'stack')
// ════════════════════════════════════════════════════════════════


// ── 🧰 FUNGSI BANTU ──────────────────────────────────────────────

/**
 * resolveVal: "membaca" nilai dari konfigurasi yang BISA berbentuk dua macam:
 *   1. Angka tunggal (flat) → langsung dipakai apa adanya untuk semua bintang
 *   2. Daftar angka (array) → tiap bintang punya angkanya sendiri-sendiri,
 *      misal [10, 15, 20, 25, 30] untuk bintang 1 sampai 5
 *
 * Analoginya seperti tabel harga: kalau harganya SAMA untuk semua orang,
 * cukup 1 angka. Tapi kalau harganya beda-beda per "level member"
 * (starIndex), kita pakai daftar dan ambil sesuai levelnya.
 *
 * Kalau starIndex melebihi panjang daftar (misal hero baru bintang 3
 * tapi datanya cuma sampai bintang 2), otomatis dibatasi (clamp) ke
 * angka TERAKHIR yang tersedia di daftar — supaya tidak error.
 */
export function resolveVal(val, starIndex) {
  return Array.isArray(val) ? val[Math.min(starIndex, val.length - 1)] : val;
}


// ── 🎛️ HANDLER PER TYPE ──────────────────────────────────────────
// (Tiap fungsi di bawah ini menangani SATU jenis perilaku skill.
//  Dipanggil oleh "dispatcher" applySkillHandlerConfig di paling
//  bawah file, sesuai config.type apa yang dipakai skill tersebut.)

/**
 * applyBuff: dipakai untuk type 'buff', 'multihit', DAN 'cooldown'.
 * (Ketiga type ini sama-sama cuma "kasih buff stat sementara" — bedanya
 *  ada di tempat lain, yaitu BAGAIMANA skill ini DIPICU/dipukulkan,
 *  yang diatur di simulate_battle.js, bukan di sini.)
 *
 * Cara kerjanya: catat sampai detik berapa buff ini berlaku
 * (buffEndTime), lalu simpan daftar buff-nya ke state.activeBuffs.
 */
function applyBuff(config, state, t, starIndex) {
  // Tentukan sampai detik berapa buff ini berlaku: waktu sekarang + durasi buff
  state.buffEndTime = t + (config.duration || 0);

  // Ambil semua buff yang didefinisikan di config.buffs, dan "resolve"
  // nilainya sesuai bintang hero (lihat fungsi resolveVal di atas).
  const resolvedBuffs = {};
  Object.entries(config.buffs || {}).forEach(([k, v]) => {
    resolvedBuffs[k] = resolveVal(v, starIndex);
  });

  // 'extra_hits' itu BUKAN buff stat biasa — ini adalah aturan KHUSUS:
  // "ganti basic attack jadi sejumlah pukulan tambahan". Karena itu,
  // nilainya disimpan TERPISAH di state (bukan ikut ke activeBuffs),
  // lalu dihapus dari daftar buff biasa supaya tidak tercampur.
  state.extraHits         = resolvedBuffs.extra_hits          || 0;
  state.extraHitsDmgRatio = resolvedBuffs.extra_hits_dmg_ratio || 1.0;
  delete resolvedBuffs.extra_hits;
  delete resolvedBuffs.extra_hits_dmg_ratio;

  // buff_additive menentukan cara buff baru "bertemu" dengan buff lama:
  if (config.buff_additive) {
    // true → TAMBAHKAN ke buff yang sudah ada (numpuk), jangan dihapus
    Object.entries(resolvedBuffs).forEach(([k, v]) => {
      state.activeBuffs[k] = (state.activeBuffs[k] || 0) + v;
    });
  } else {
    // false (default) → GANTI total buff lama dengan buff baru ini
    state.activeBuffs = resolvedBuffs;
  }
}

/**
 * applyStack: dipakai untuk type 'stack'.
 * Setiap kali skill ini di-cast (dipakai lagi), "stack"-nya bertambah 1,
 * sampai batas max_stacks. Buff yang didapat hero BERTAMBAH BESAR sesuai
 * jumlah stack saat ini (misal stack 3 → buff 3x lipat dari buff per stack).
 *
 * Analoginya seperti stempel loyalitas kafe: tiap beli kopi dapat 1 stempel,
 * makin banyak stempel makin besar diskonnya, sampai batas maksimal.
 */
function applyStack(config, state, starIndex) {
  // Tambah 1 stack, tapi jangan sampai lebih dari max_stacks (default 99)
  state.stackCount = Math.min(
    (state.stackCount || 0) + 1,
    config.max_stacks || 99
  );

  // Hitung buff aktual = (buff per 1 stack) × (jumlah stack sekarang)
  const stacked = {};
  Object.entries(config.buff_per_stack || {}).forEach(([k, v]) => {
    stacked[k] = resolveVal(v, starIndex) * state.stackCount;
  });

  state.activeBuffs = stacked;
  state.buffEndTime = Infinity; // buff stack TIDAK ADA habisnya (selama tidak direset di tempat lain)

  // Label ini akan tampil di laporan, misal "Stack (stack 3/5)"
  state.buffLabel   = `${config.label || 'Stack'} (stack ${state.stackCount}/${config.max_stacks || 99})`;
}

/**
 * applySequence: dipakai untuk type 'sequence'.
 * Skill ini TIDAK langsung memberi semua efeknya sekaligus — efeknya
 * dibagi jadi beberapa "tahap" (config.sequence), dan tiap tahap punya
 * jeda waktu (delay) sendiri-sendiri sebelum terjadi.
 *
 * Analoginya seperti kembang api berseri: pencet tombol sekali, tapi
 * ledakannya muncul satu-satu dengan jeda — bukan langsung semua meledak.
 *
 * Tahap-tahap ini disimpan ke state.pendingEffects (daftar "antrian
 * efek yang akan terjadi nanti"), dan simulate_battle.js akan
 * mengeceknya tiap detik untuk tahu kapan harus dieksekusi.
 */
function applySequence(config, state, t, starIndex) {
  state.pendingEffects = state.pendingEffects || [];
  (config.sequence || []).forEach(step => {
    state.pendingEffects.push({
      time:      t + (step.delay || 0), // waktu absolut kapan tahap ini akan terjadi
      formula:   step.formula    || null, // formula damage untuk tahap ini (kalau ada)
      shield_now: step.shield_now ? resolveVal(step.shield_now, starIndex) : 0,
      heal_now:   step.heal_now   ? resolveVal(step.heal_now,   starIndex) : 0,
    });
  });

  // Selama skill ini "casting" (cast_duration), hero tidak bisa basic
  // attack — supaya animasi/efek skill yang panjang terasa masuk akal.
  const castDur = config.cast_duration ?? 0;
  if (castDur > 0) state.skillCastEndTime = t + castDur;
}

/**
 * applyDelayedMultihit: dipakai untuk type 'delayed_multihit'.
 * Hit PERTAMA dari skill ini terjadi LANGSUNG (diproses di
 * simulate_battle.js, bukan di sini). Hit ke-2 dan seterusnya
 * BARU akan terjadi belakangan, dengan jeda (hit_delay) di antaranya.
 *
 * Analoginya seperti tembakan beruntun: tembakan pertama langsung
 * meletus, lalu disusul tembakan ke-2, ke-3, dst dengan jeda kecil.
 *
 * Hit susulan ini disimpan ke state.pendingHits, dan ada penanda
 * `isShadow` untuk hit TERAKHIR (biasanya dipakai untuk efek visual
 * khusus seperti "hantu/bayangan" di laporan).
 */
function applyDelayedMultihit(config, state, t) {
  state.buffLabel  = config.label || '';
  state.pendingHits = state.pendingHits || [];

  const hitCount = config.hit_count || 1;
  const delay    = config.hit_delay  || 0;

  // Mulai dari i=1 karena hit ke-0 (hit pertama) sudah ditangani di luar
  // (di simulate_battle.js), jadi di sini kita cuma menjadwalkan SISANYA.
  for (let i = 1; i < hitCount; i++) {
    state.pendingHits.push({
      time:     t + i * delay,           // waktu absolut hit ke-(i+1) akan terjadi
      hitIndex: i + 1,                    // urutan hit ini (manusiawi, mulai dari 1)
      isShadow: i === hitCount - 1,       // true kalau ini hit yang TERAKHIR
    });
  }

  // Secara default, mana TIDAK akan terisi (skillCastEndTime diperpanjang)
  // sampai hit terakhir selesai — KECUALI config.cast_duration sudah
  // ditentukan secara eksplisit (kalau begitu, ikuti nilai default dari
  // dispatcher utama di bawah, jangan ditimpa lagi di sini).
  if (config.cast_duration === undefined) {
    state.skillCastEndTime = t + (hitCount - 1) * delay;
  }
}


// ── 💉 EFEK INSTAN (heal, shield, empowered basic) ───────────────
// Fungsi ini dijalankan SEBELUM dispatcher memilih handler per type
// di bawah, dan berlaku untuk SEMUA jenis skill (buff, stack, sequence,
// dst) — karena efek seperti heal/shield/empowered basic ini bisa
// menempel ke skill APAPUN, tidak terikat ke satu type tertentu.
//
// Analoginya: ini seperti "topping tambahan" yang bisa ditambahkan ke
// skill jenis apa pun, terlepas dari "menu utama" (type) skill itu.

function applyInstantEffects(config, state, fs, starIndex) {
  // 💚 Heal sekian % dari HP MAKSIMAL hero
  if (config.heal_now && fs)
    state.healNow = (state.healNow || 0) + resolveVal(config.heal_now, starIndex) * fs.HP;

  // 💚 Heal sejumlah angka TETAP (tidak tergantung stat apa pun)
  if (config.heal_flat)
    state.healNow = (state.healNow || 0) + resolveVal(config.heal_flat, starIndex);

  // 💚 Heal berdasarkan seberapa banyak HP yang HILANG.
  // Karena simulasi ini tidak benar-benar melacak HP hero secara presisi
  // (hero dianggap "tidak pernah kena damage" dalam simulasi serang),
  // dipakai ASUMSI seberapa besar HP yang hilang (missing_hp_assume,
  // default 50%) sebagai dasar perhitungan heal.
  if (config.heal_missing_hp) {
    const missingHpRatio = config.missing_hp_assume || 0.5;
    state.healNow = (state.healNow || 0) + resolveVal(config.heal_missing_hp, starIndex) * fs.HP * missingHpRatio;
  }

  // 💚 Heal sekian % dari Magic ATK hero (bukan dari HP)
  if (config.heal_magic_atk && fs)
    state.healNow = (state.healNow || 0) + resolveVal(config.heal_magic_atk, starIndex) * fs.Magic_ATK;

  // 🛡️ Shield sekian % dari HP MAKSIMAL hero
  if (config.shield_now && fs)
    state.shieldNow = (state.shieldNow || 0) + resolveVal(config.shield_now, starIndex) * fs.HP;

  // 🛡️ Shield sejumlah angka TETAP
  if (config.shield_flat)
    state.shieldNow = (state.shieldNow || 0) + resolveVal(config.shield_flat, starIndex);

  // 🗡️ "Empowered basic" tipe pengali tetap: basic attack BERIKUTNYA
  // (cuma 1 kali) akan pakai pengali ini, bukan damage basic normal.
  if (config.empowered_basic)
    state.empoweredBasic = resolveVal(config.empowered_basic, starIndex);

  // 🗡️ "Empowered basic" tipe terbatas jumlah: SEJUMLAH basic attack
  // berikutnya (empowered_basic_count kali) akan pakai pengali khusus
  // (empowered_basic_multiplier).
  if (config.empowered_basic_count) {
    state.empoweredBasicCount      = config.empowered_basic_count;
    state.empoweredBasicMultiplier = resolveVal(config.empowered_basic_multiplier, starIndex);
  }
}


// ════════════════════════════════════════════════════════════════
// 🚦 DISPATCHER UTAMA — INI "PINTU MASUK" YANG DIPANGGIL DARI
// simulate_battle.js SETIAP KALI SKILL DI-CAST.
//
// Tugasnya seperti resepsionis: terima konfigurasi skill (config),
// lalu arahkan ke "ruangan" (fungsi handler) yang sesuai berdasarkan
// config.type. Sebelum itu, dia juga menjalankan efek-efek instan yang
// berlaku untuk SEMUA type (heal, shield, empowered basic — lihat fungsi
// applyInstantEffects di atas).
//
// @param {object} config     - konfigurasi skill_handler dari data skill hero
// @param {object} state      - "papan status" simulasi (lihat simulate_battle.js)
// @param {number} t          - detik kapan skill ini di-cast
// @param {object} fs         - stat akhir hero (finalStats)
// @param {number} starIndex  - indeks bintang hero (0 = bintang 1, dst)
// ════════════════════════════════════════════════════════════════
export function applySkillHandlerConfig(config, state, t, fs, starIndex = 0) {
  // Kalau skill ini tidak punya konfigurasi handler sama sekali
  // (misal skill paling sederhana tanpa efek tambahan), tidak perlu
  // dilakukan apa-apa di sini.
  if (!config) return;

  // Kalau config.type tidak ditentukan, anggap saja tipe 'buff' (paling umum)
  const type = config.type || 'buff';
  state.buffLabel = config.label || '';

  // 🕐 ATURAN DEFAULT: selama cast_duration detik, hero dianggap "sibuk
  // casting" — basic attack & pengisian mana diblokir (lihat
  // simulate_battle.js). Kalau config.cast_duration tidak ada, dianggap
  // 0 (tidak ada blokir sama sekali).
  // CATATAN: beberapa handler per-type BOLEH MENIMPA nilai ini kalau
  // mereka butuh durasi yang dihitung secara dinamis — lihat
  // applyDelayedMultihit (durasinya tergantung jumlah hit & delay) dan
  // applySequence (durasinya dari config.cast_duration juga, tapi
  // hanya diterapkan kalau > 0).
  state.skillCastEndTime = t + (config.cast_duration ?? 0);

  // Jalankan dulu efek instan (heal/shield/empowered) — berlaku untuk semua type
  applyInstantEffects(config, state, fs, starIndex);

  // Lalu arahkan ke handler yang sesuai berdasarkan type skill ini:
  if      (type === 'buff'            || type === 'multihit' || type === 'cooldown')
    applyBuff(config, state, t, starIndex);
  else if (type === 'stack')
    applyStack(config, state, starIndex);
  else if (type === 'sequence')
    applySequence(config, state, t, starIndex);
  else if (type === 'delayed_multihit')
    applyDelayedMultihit(config, state, t);
}