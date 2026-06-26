// ════════════════════════════════════════════════════════════════
// simulate_battle.js — VERSI BERKOMENTAR (untuk orang non-programmer)
// simulate_battle.js all harcoded
// ════════════════════════════════════════════════════════════════
//
// 📖 GAMBARAN BESAR (baca ini dulu sebelum lihat kode):
//
// File ini adalah "mesin simulasi pertempuran". Bayangkan kita punya
// 1 karakter game (hero) yang ditaruh di arena, lalu kita PUTAR WAKTU
// maju sedikit demi sedikit (per 0.01 detik) selama beberapa puluh
// detik (default 40 detik). Di setiap "tick" waktu itu, program ini
// mengecek:
//   - Apakah hero sudah cukup mana untuk pakai skill? → kalau iya, cast skill.
//   - Apakah waktu serang dasar (basic attack) sudah tiba? → kalau iya, pukul.
//   - Apakah ada efek pasif/buff yang sedang aktif atau baru habis?
//   - Apakah hero sudah mati (kalau ada plugin "death")?
//
// Setiap kejadian (pukulan, cast skill, dapat shield, dst) DICATAT ke
// dalam sebuah daftar bernama `timeline` — semacam "log kejadian" yang
// nanti bisa dipakai untuk menggambar grafik damage per waktu, atau
// menjumlah total damage di akhir.
//
// Di akhir simulasi, semua angka di `timeline` dijumlahkan dan
// dikembalikan sebagai hasil akhir (total damage, breakdown per jenis
// serangan, dll).
// ════════════════════════════════════════════════════════════════


// 📦 Mengambil "alat bantu" dari file lain.
// - stat_utils.js   → cara menghitung stat akhir hero (HP, ATK, dst) dan damage basic/skill mentah
// - skill_handler.js→ cara menerapkan efek skill (buff, heal, shield, dst) ke "state" simulasi
// - plugin_summon.js → fitur tambahan: hero yang bisa memanggil "summon" (anak buah)
// - plugin_death.js  → fitur tambahan: apa yang terjadi kalau hero mati di tengah simulasi
import { getBaseValue, calculateFinalStats }                  from './stat_utils.js';
import { applySkillHandlerConfig, resolveVal }                from './skill_handler.js';
import { createSummonPlugin }                                 from '../plugins/plugin_summon.js';
import { createDeathPlugin  }                                 from '../plugins/plugin_death.js';

// 🔢 round2: alat bantu kecil untuk membulatkan angka ke 2 angka desimal.
// Contoh: round2(3.14159) → 3.14. Dipakai di mana-mana supaya angka
// damage yang ditampilkan rapi, tidak panjang seperti 3.14159265358979.
export function round2(n) {
  return Math.round(n * 100) / 100;
}

// 🧮 getSkillDmgMultiplier: menghitung "pengali damage skill saat ini".
// Analoginya: skill punya damage dasar (misal 100), tapi kalau hero
// sedang kena buff "+20% damage skill", maka damage jadi 120.
// Fungsi ini menggabungkan:
//   - pengali dasar yang sudah dihitung sebelumnya (baseMultiplier)
//   - tambahan dari buff yang sedang aktif saat ini (stateBonus)
// lalu hasilnya dibulatkan 2 desimal.
function getSkillDmgMultiplier(dmgObj, state) {
  const baseMultiplier = dmgObj?.breakdown?.skillDmg?.dmgBonusMultiplier ?? 1;
  const stateBonus = (state.activeBuffs?.DMG_Bonus || 0) + (state.activeBuffs?.Skill_DMG_Bonus || 0);
  return round2(baseMultiplier + stateBonus);
}

// 📊 splitEventsDmg: memecah total damage skill menjadi dua kelompok,
// misalnya "berapa dari damage Fisik" vs "berapa dari damage Magic".
// Cara kerjanya seperti membagi kue berdasarkan proporsi bahan:
//   - `type` adalah kata kunci yang dicari, misal "Physical" atau "Magic"
//   - untuk tiap kejadian (event) di `events`, kita lihat rincian
//     (breakdown.parts) dari mana saja damage itu berasal
//   - kita hitung berapa proporsi yang cocok dengan `type` tadi
//   - proporsi itu dikalikan ke damage asli kejadian (e.dmg) untuk
//     mendapat porsi damage dari jenis tersebut
// Ini dipakai supaya laporan akhir bisa bilang "Total damage Fisik: X,
// Total damage Magic: Y" walau formula skill mencampur beberapa stat.
export function splitEventsDmg(events, type) {
  let total = 0;
  events.forEach(e => {
    if (!e.breakdown) return; // kejadian tanpa rincian dilewati saja

    // Rasio antara damage akhir (final, setelah bonus) dengan damage
    // mentah (raw, sebelum bonus). Misal raw=100, final=120 → ratio=1.2
    const ratio = e.breakdown.raw !== 0 ? e.breakdown.final / e.breakdown.raw : 0;

    let typeVal = 0, allVal = 0;
    e.breakdown.parts.forEach(p => {
      const val = p.value * ratio; // nilai bagian ini setelah ikut kena bonus
      allVal += val; // total semua bagian
      // kalau nama stat-nya diawali dengan `type` (misal "Physical_ATK"
      // diawali "Physical"), masukkan ke kelompok typeVal
      if (p.ref.startsWith(type)) typeVal += val;
    });

    // tambahkan porsi damage kejadian ini ke total, sesuai proporsi
    // typeVal dibanding allVal
    if (allVal > 0) total += e.dmg * (typeVal / allVal);
  });
  return total;
}
// ════════════════════════════════════════════════════════════════
// 🏟️ simulateBattle: FUNGSI UTAMA — di sinilah simulasi pertempuran
// dijalankan dari detik 0 sampai `duration` (default 40 detik).
//
// Input:
//   hero     → data karakter yang mau disimulasikan (bintang, buff, dst)
//   baseData → data dasar hero dari database (HP, ATK, formula skill, dst)
//   duration → berapa detik simulasi berjalan (default 40)
//
// Output (lihat paling bawah file): sebuah objek besar berisi semua
// hasil — total damage, daftar kejadian (timeline), rincian per jenis
// serangan, dst.
// ════════════════════════════════════════════════════════════════
export function simulateBattle(hero, baseData, duration = 40) {

  // Simpan data asli hero (sebelum kena buff apa pun) untuk referensi nanti.
  const heroBase   = hero;

  // Salin buff yang dimiliki hero saat ini (misal dari equipment/relic).
  // Ini akan berubah-ubah selama simulasi kalau ada "scheduled_events"
  // yang menambah/mengubah buff di waktu tertentu.
  let currentBuffs = { ...hero.buffs };

  // Hitung stat akhir hero (HP, ATK, dll) dan damage basic-attack/skill
  // mentahnya, berdasarkan data dasar + buff yang dimiliki sekarang.
  // (Detail rumus hitungannya ada di file stat_utils.js)
  const stats      = calculateFinalStats({ ...heroBase, buffs: currentBuffs }, baseData);
  const fs         = stats.finalStats;  // "fs" = Final Stats, stat hero yang sudah jadi
  let dmg          = stats.damage;      // info damage basic attack & skill (sebelum efek dinamis)

  // Index bintang hero (dipakai untuk ambil nilai stat yang beda-beda
  // per level bintang, misal damage skill bintang 1 vs bintang 5).
  // Bintang 1 → index 0, bintang 5 → index 4, dst.
  const starIndex = (hero.stars || 1) - 1;

  // ⏱️ dt = "delta time" = ukuran satu langkah waktu simulasi, di sini
  // 0.01 detik. Semakin kecil dt, semakin presisi simulasinya, tapi
  // makin lama prosesnya (lebih banyak langkah).
  const dt             = 0.01;

  // 📝 timeline = daftar SEMUA kejadian selama simulasi (pukulan basic,
  // cast skill, dapat shield, dst). Ini adalah "log" utama yang nanti
  // dipakai untuk membuat grafik & laporan akhir.
  const timeline       = [];

  let dmgSoFar         = 0; // akumulasi total damage dari detik 0 sampai sekarang
  let mana             = 0; // mana yang dimiliki hero saat ini
  let skillCasts       = 0; // sudah berapa kali skill di-cast
  let attackProgress   = 0; // "progress" menuju pukulan basic attack berikutnya

  // Kecepatan serang (attack speed). Kalau 0 atau negatif, dianggap
  // hero tidak bisa basic attack sama sekali.
  let atkSpeed         = fs.ATK_Speed > 0 ? fs.ATK_Speed : 0;

  // Jeda waktu antar basic attack = 1 dibagi attack speed.
  // Misal attack speed 2 (2x pukul per detik) → jeda = 0.5 detik.
  // Kalau atkSpeed 0, jedanya dianggap "tak terhingga" (tidak pernah pukul).
  const attackInterval = atkSpeed > 0 ? 1 / atkSpeed : Infinity;

  // 💧 Pengaturan mana:
  // - manaFirst    : mana yang dibutuhkan untuk CAST SKILL PERTAMA KALI
  // - manaNext     : mana yang dibutuhkan untuk cast skill selanjutnya
  // - manaRegen    : seberapa cepat mana terisi sendiri per detik
  // - manaPerBasic : mana yang didapat setiap kali basic attack kena
  // - manaPerSkill : mana yang didapat (biasanya 0) setiap kali skill di-cast
  const manaFirst    = getBaseValue(baseData, 'Batas_Mana_Awal', starIndex);
  const manaNext     = fs.Batas_Mana;
  const manaRegen    = fs.Mana_Regen_Per_Detik;
  const manaPerBasic = baseData.Mana_Per_Basic ?? 10;
  const manaPerSkill = baseData.Mana_Per_Skill ?? 0;

  // 🧠 state = "papan status" yang menyimpan KONDISI HERO SAAT INI
  // selama simulasi berjalan. Ini berubah-ubah terus setiap detik.
  // Anggap ini seperti dashboard mobil: menyimpan info seperti
  // "buff apa yang aktif", "sampai detik berapa shield masih ada",
  // dst — supaya tiap bagian kode bisa baca/tulis kondisi yang sama.
  const state = {
    activeBuffs:       {},   // buff yang sedang aktif sekarang (misal +20% ATK Speed)
    buffEndTime:       0,    // sampai detik berapa buff di atas masih berlaku
    buffLabel:         '',   // teks label buff untuk ditampilkan di laporan (misal nama skill)
    stackCount:        0,    // untuk skill bertipe "stack" (numpuk), berapa stack sekarang
    healNow:           0,    // jumlah heal yang harus diberikan saat ini
    shieldNow:         0,    // jumlah shield yang harus diberikan saat ini
    nextCastTime:      0,    // untuk skill bertipe cooldown, kapan boleh cast lagi
    skillCastEndTime: 0,     // sampai detik berapa hero "sibuk casting" (basic attack & mana regen diblokir)
    passiveLog:        [],   // catatan kejadian dari efek pasif (dipakai plugin lain)
    basicStackCount:   0,    // untuk pasif "numpuk basic attack", berapa stack sekarang
    basicStackExpire:  0,    // sampai detik berapa stack basic attack di atas masih berlaku
    skyPhase:          'climbing', // fase khusus untuk hero bertipe "skyscraper" (lihat di bawah)
    skyPhaseEnd:       0,           // sampai detik berapa fase tersebut berakhir
  };

  // 📋 Ambil "resep" konfigurasi efek skill & pasif dari data dasar hero
  // (kalau ada). Ini menentukan PERILAKU KHUSUS hero — misal apakah
  // skill-nya tipe buff biasa, multihit, stack, dst. Detail tiap tipe
  // dijelaskan di file skill_handler.js.
  const skillHandlerConfig = baseData.DMG_skill?.skill_handler || null;
  const basicStackCfg      = baseData.passive_basic_stack      || null; // pasif "numpuk basic attack"
  const skyscraperCfg      = baseData.passive_skyscraper       || null; // pasif unik "naik-turun" (skyscraper)
  let soaringPlumeFired    = false; // penanda: efek "Soaring Plume" (bagian dari skyscraper) sudah terjadi atau belum

  // 🔌 Siapkan "plugin" tambahan:
  // - deathPlugin  : mengatur apa yang terjadi kalau hero ini bisa mati
  //                  di tengah simulasi (misal lalu hero lain mengambil alih)
  // - summonPlugin : mengatur hero yang bisa memanggil "summon" (anak buah
  //                  yang ikut menyerang sendiri)
  const deathPlugin = createDeathPlugin(hero, heroBase, baseData, calculateFinalStats, duration);
  let isDead         = false; // status: apakah hero sudah "mati" dalam simulasi ini
  const summonPlugin = createSummonPlugin(baseData, starIndex, fs, round2, resolveVal);

  // 📅 scheduled_events = kejadian yang DIJADWALKAN terjadi di waktu
  // tertentu (misal "di detik ke-10, tambahkan buff X"). Diurutkan
  // dari yang paling awal ke paling akhir berdasarkan `waktu`.
  const scheduledEvents = [...(hero.scheduled_events || [])].sort((a, b) => a.waktu - b.waktu);
  let nextEventIdx = 0; // penanda: kejadian terjadwal mana yang berikutnya akan dicek

  // ════════════════════════════════════════════════════════════
  // 🎁 EFEK PASIF YANG LANGSUNG AKTIF DI DETIK 0
  // (Sebelum loop waktu dimulai, kita cek dulu: apakah hero punya
  //  pasif yang otomatis memberi bonus dari awal pertempuran?
  //  Kalau ada, terapkan sekarang dan catat ke timeline sebagai
  //  kejadian di "time: 0".)
  // ════════════════════════════════════════════════════════════

  // 🛡️ Pasif: dapat shield flat (angka tetap) sejak awal.
  if (baseData.passive_shield_flat) {
  const val = resolveVal(baseData.passive_shield_flat, starIndex);
  state.shieldNow = (state.shieldNow || 0) + val;
  timeline.push({
    time: 0, type: 'passive_shield',
    dmg: 0, dmgSoFar: 0, mana: 0,
    shieldNow: val,
    effAtkSpeed: round2(atkSpeed),
    buff: `🛡 Pasif: Shield +${val}`,
    activeBuffs: {}, breakdown: null,
  });
  // Catatan: setelah dicatat ke timeline, shieldNow dikembalikan ke 0
  // di sini karena nilainya sudah "dipakai/dicatat" — supaya tidak
  // ikut ditambahkan lagi secara tidak sengaja ke shield skill nanti.
  state.shieldNow = 0; 
}

  // ⚡ Pasif: dapat tambahan attack speed flat sejak awal.
  if (baseData.passive_atkspeed_flat) {
    const val = resolveVal(baseData.passive_atkspeed_flat, starIndex);
    atkSpeed += val;
    timeline.push({
      time: 0, type: 'passive_atkspeed',
      dmg: 0, dmgSoFar: 0, mana: round2(mana),
      effAtkSpeed: round2(atkSpeed),
      buff: `⚡ Pasif: ATK Speed +${val}`,
      activeBuffs: {}, breakdown: null,
    });
  }

  // 💧 Pasif: dapat tambahan mana flat sejak awal.
  if (baseData.passive_mana_flat) {
    const val = resolveVal(baseData.passive_mana_flat, starIndex);
    mana += val;
    timeline.push({
      time: 0, type: 'passive_mana',
      dmg: 0, dmgSoFar: 0, mana: round2(mana),
      effAtkSpeed: round2(atkSpeed),
      buff: `💧 Pasif: Mana +${val}`,
      activeBuffs: {}, breakdown: null,
    });
  }

// 💧 Pasif khusus hero (bukan dari baseData, tapi dari data hero itu
// sendiri): dapat mana dalam bentuk PERSEN dari mana awal.
// (Ini contoh pasif unik milik hero bernama "Northern Vale".)
if (hero.passive_mana_pct) {
  const val = round2(manaFirst * hero.passive_mana_pct);
  mana += val;
  timeline.push({
    time: 0, type: 'passive_mana',
    dmg: 0, dmgSoFar: 0, mana: round2(mana),
    effAtkSpeed: round2(atkSpeed),
    buff: `💧 Northern Vale: Mana +${Math.round(hero.passive_mana_pct * 100)}% (${val})`,
    activeBuffs: {}, breakdown: null,
  });
}

  // 🩸 Pasif: dapat tambahan Lifesteal (menyedot HP musuh jadi heal
  // sendiri lewat basic attack) sejak awal.
  if (baseData.passive_lifesteal_flat) {
    const val = resolveVal(baseData.passive_lifesteal_flat, starIndex);
    fs.Lifesteal = (fs.Lifesteal || 0) + val;
    timeline.push({
      time: 0, type: 'passive_lifesteal',
      dmg: 0, dmgSoFar: 0, mana: round2(mana),
      effAtkSpeed: round2(atkSpeed),
      buff: `🩸 Pasif: Lifesteal +${val * 100}%`,
      activeBuffs: {}, breakdown: null,
    });
  }

  // 💫 Pasif: dapat tambahan Spell Vamp (menyedot HP musuh jadi heal
  // sendiri lewat skill) sejak awal.
  if (baseData.passive_spellvamp_flat) {
    const val = resolveVal(baseData.passive_spellvamp_flat, starIndex);
    fs.Spell_Vamp = (fs.Spell_Vamp || 0) + val;
    timeline.push({
      time: 0, type: 'passive_spellvamp',
      dmg: 0, dmgSoFar: 0, mana: round2(mana),
      effAtkSpeed: round2(atkSpeed),
      buff: `💫 Pasif: Spell Vamp +${val * 100}%`,
      activeBuffs: {}, breakdown: null,
    });
  }


  // ════════════════════════════════════════════════════════════════
  // ⏳ LOOP UTAMA SIMULASI — "MEMUTAR WAKTU"
  //
  // Bayangkan ini seperti video yang diputar frame-by-frame, tapi
  // setiap "frame" hanya berdurasi 0.01 detik. Loop ini berjalan dari
  // t = 0.01 detik sampai t = duration detik (misal 40 detik), jadi
  // totalnya sekitar 4000 langkah.
  //
  // Di SETIAP langkah waktu (t), program mengecek banyak hal secara
  // berurutan dari atas ke bawah — seperti checklist:
  //   1. Apakah ada hit skill yang "ditunda" dan sekarang waktunya tiba?
  //   2. Apakah ada efek skill bertahap (sequence) yang waktunya tiba?
  //   3. Apakah hero sudah mati? (cek lewat deathPlugin)
  //   4. Apakah ada kejadian terjadwal (scheduled_events) yang waktunya tiba?
  //   5. Mana beregenerasi (terisi sendiri) sesuai aturan
  //   6. Buff yang aktif, apakah sudah harus habis?
  //   7. Apakah waktunya basic attack?
  //   8. Apakah hero punya summon yang perlu diproses?
  //   9. Apakah waktunya cast skill (berdasarkan cooldown ATAU mana)?
  //
  // 1e-9 yang sering muncul di kode hanyalah "angka pengaman" sangat
  // kecil untuk menghindari masalah pembulatan angka desimal komputer
  // (supaya perbandingan waktu seperti t >= someTime tidak gagal hanya
  // karena selisih super kecil seperti 0.00000000001).
  // ════════════════════════════════════════════════════════════════
  for (let t = dt; t <= duration + 1e-9; t += dt) {

    // ── 1️⃣ HIT SKILL YANG DITUNDA (delayed_multihit) ──────────────
    // Beberapa skill memukul beberapa kali dengan jeda (misal pukul
    // sekarang, lalu pukul lagi 0.3 detik kemudian, dst). Hit-hit
    // susulan itu disimpan di state.pendingHits. Di setiap langkah
    // waktu, kita cek: apakah ada hit susulan yang waktunya sudah tiba?
    if (!isDead && state.pendingHits?.length > 0) {
      state.pendingHits = state.pendingHits.filter(hit => {
        // Kalau waktunya belum tiba, biarkan tetap menunggu (tetap di daftar)
        if (t + 1e-9 < hit.time) return true;

        // Waktunya tiba → catat damage skill ini ke timeline
        const hitDmg = round2(dmg.skillDmg);
        dmgSoFar += hitDmg;
        timeline.push({
          time: round2(t), type: 'skill',
          hitIndex: hit.hitIndex,
          totalHits: skillHandlerConfig?.hit_count || 1,
          dmg: hitDmg, dmgSoFar: round2(dmgSoFar),
          mana: round2(mana), manaBefore: round2(mana), threshold: 0,
          effAtkSpeed: round2(atkSpeed),
          buff: hit.isShadow ? '👻 Shadow hit' : null,  // pilih salah satu label saja
          activeBuffs: {}, breakdown: dmg.breakdown.skillDmg,
          isShadowHit: hit.isShadow,
          healNow: 0, shieldNow: 0,
        });
        // return false → hapus hit ini dari daftar tunggu (sudah selesai diproses)
        return false;
      });
    }

    // ── 2️⃣ EFEK SKILL BERTAHAP (sequence) ─────────────────────────
    // Beberapa skill punya beberapa "langkah" efek yang masing-masing
    // punya waktu/delay sendiri (misal: langkah 1 di detik+0, langkah 2
    // di detik+1, dst). Langkah-langkah itu disimpan di state.pendingEffects.
    if (!isDead && state.pendingEffects?.length > 0) {
      state.pendingEffects = state.pendingEffects.filter(ef => {
        // Belum waktunya → tetap tunggu
        if (t + 1e-9 < ef.time) return true;

        // Hitung damage dari formula langkah ini (kalau ada)
        let efDmg = 0;
        const parts = [];
        (ef.formula || []).forEach(part => {
          const statVal = fs[part.ref] || 0;          // ambil nilai stat terkait, misal Magic_ATK
          const mult    = resolveVal(part.multiplier, starIndex); // pengali sesuai bintang
          const val     = statVal * mult;
          efDmg += val;
          parts.push({ ref: part.ref, statValue: round2(statVal), multiplier: mult, value: round2(val) });
        });
        efDmg = round2(efDmg);

        // Damage langkah ini juga ikut kena bonus damage skill yang aktif
        const efDmgMult    = getSkillDmgMultiplier(dmg, state);
        const efDmgBoosted = round2(efDmg * efDmgMult);

        // Langkah ini bisa juga memberi shield/heal sekaligus dengan damage
        const efShield = ef.shield_now ? round2(ef.shield_now * fs.HP) : 0;
        const efHeal   = ef.heal_now   ? round2(ef.heal_now   * fs.HP) : 0;

        if (efDmgBoosted > 0) dmgSoFar += efDmgBoosted;

        timeline.push({
          time: round2(t), type: 'skill',
          hitIndex: null, totalHits: null,
          dmg: efDmgBoosted, dmgSoFar: round2(dmgSoFar),
          mana: round2(mana), manaBefore: round2(mana), threshold: 0,
          effAtkSpeed: round2(atkSpeed),
          buff: state.buffLabel || null,
          activeBuffs: {},
          breakdown: { parts, raw: efDmg, dmgBonusMultiplier: efDmgMult, final: efDmgBoosted },
          healNow: efHeal, shieldNow: efShield,
        });
        // Langkah ini sudah selesai diproses → keluarkan dari daftar tunggu
        return false;
      });
    }

    // ── 3️⃣ CEK STATUS KEMATIAN HERO ────────────────────────────────
    // deathPlugin adalah "modul tambahan" yang menentukan apakah hero
    // ini bisa mati di tengah simulasi, dan apa yang terjadi setelah
    // mati (misal stat berubah, jadi hantu yang masih menyerang, dst).
    // Kita beri akses ke deathPlugin supaya dia bisa mengubah status
    // isDead, dmg (info damage), dan currentBuffs lewat fungsi "setter"
    // (setIsDead, setDmg, setCurrentBuffs) di bawah ini.
    if (deathPlugin) deathPlugin.onTick({
      t, isDead, state,
      setIsDead:       (v) => { isDead = v; },
      setDmg:          (v) => { dmg = v; },
      setCurrentBuffs: (v) => { currentBuffs = v; },
    });

    // ── 4️⃣ KEJADIAN TERJADWAL (scheduled_events) ───────────────────
    // Kalau hero punya daftar kejadian yang sudah dijadwalkan terjadi
    // di waktu tertentu (misal "di detik 15, ubah buff jadi begini"),
    // kita cek satu per satu apakah waktunya sudah tiba. Karena daftar
    // ini sudah diurutkan dari awal, kita cukup maju terus (nextEventIdx)
    // tanpa perlu mengulang dari awal setiap kali.
    if (!isDead) {
      while (nextEventIdx < scheduledEvents.length &&
             t + 1e-9 >= scheduledEvents[nextEventIdx].waktu) {
        const ev = scheduledEvents[nextEventIdx++];
        if (typeof ev.onTrigger === 'function') {
          // Jalankan fungsi kustom yang mengubah buff hero
          currentBuffs = ev.onTrigger(currentBuffs);
          // Setelah buff berubah, stat & damage hero harus dihitung ulang
          const newStats = calculateFinalStats({ ...heroBase, buffs: currentBuffs }, baseData);
          dmg = newStats.damage;
          Object.assign(fs, newStats.finalStats);
        }
      }
    }

    // ── 5️⃣ PENGISIAN MANA & FASE KHUSUS "SKYSCRAPER" ───────────────
    // Beberapa hero punya pasif unik bernama "skyscraper": selama
    // durasi tertentu, hero ini punya 3 fase berulang — "climbing"
    // (mengisi mana lebih cepat dari biasa), "descending" (turun),
    // lalu "casting" (siap cast skill fase 2). Kalau hero TIDAK punya
    // pasif ini, dia cuma mengisi mana dengan cara normal.
    if (!isDead) {
      const onSkyNow = skyscraperCfg && t < skyscraperCfg.duration;
      if (onSkyNow) {
        // Pindah fase otomatis kalau waktu fase sekarang sudah habis
        if      (state.skyPhase === 'descending' && t + 1e-9 >= state.skyPhaseEnd) state.skyPhase = 'casting';
        else if (state.skyPhase === 'ascending'  && t + 1e-9 >= state.skyPhaseEnd) state.skyPhase = 'climbing';

        // Selama fase "climbing", mana diisi pakai kecepatan khusus
        // (mana_regen_override), bukan kecepatan regen normal.
        if (state.skyPhase === 'climbing' && (manaRegen > 0 || skyscraperCfg.mana_regen_override > 0))
          mana += skyscraperCfg.mana_regen_override * dt;
      } else {
        // Cara NORMAL mengisi mana: setiap dt detik, tambah manaRegen*dt,
        // KECUALI hero sedang "sibuk casting skill" (isCastingSkill) —
        // saat itu mana tidak terisi (logikanya: hero fokus cast, bukan
        // siap-siap nyerang lagi).
        const isCastingSkill = t <= state.skillCastEndTime + 1e-9;
if (manaRegen > 0 && !isCastingSkill) mana += manaRegen * dt;
      }
    }

    // ── 6️⃣ CEK APAKAH BUFF SUDAH KEDALUWARSA ───────────────────────
    // buffActive = true kalau waktu sekarang masih dalam masa berlaku
    // buff (state.buffEndTime). Kalau sudah lewat, buff dihapus
    // (dikosongkan) — ini juga menghapus efek "extraHits" (pukulan
    // tambahan dari buff tertentu).
    const buffActive = t <= state.buffEndTime + 1e-9;
    if (!buffActive) {
      state.activeBuffs = {};
      state.extraHits   = 0;
    }

// Tiga "flag" (penanda ya/tidak) yang menentukan apakah hero BOLEH
// melakukan basic attack sekarang:
const isInDelayedCast = state.pendingHits?.length > 0;        // sedang ada hit skill susulan yang tertunda?
const onSky           = skyscraperCfg && t < skyscraperCfg.duration; // sedang dalam fase skyscraper?
const isCastingSkill  = t <= state.skillCastEndTime + 1e-9;  // ← TAMBAH   (sedang "sibuk" casting skill?)

    // ════════════════════════════════════════════════════════════
    // 🗡️ 7️⃣ BLOK BASIC ATTACK
    // Hero hanya boleh basic attack kalau:
    //   - punya attack speed > 0
    //   - TIDAK sedang menunggu hit skill susulan (isInDelayedCast)
    //   - TIDAK sedang dalam fase skyscraper (onSky)
    //   - TIDAK sedang sibuk casting skill (isCastingSkill)
    // ════════════════════════════════════════════════════════════
if (atkSpeed > 0 && !isInDelayedCast && !onSky && !isCastingSkill) {
      // Kecepatan serang efektif = kecepatan dasar + bonus dari buff
      // (kalau buff sedang aktif)
      const atkSpeedBuff = buffActive ? (state.activeBuffs.ATK_Speed_Bonus || 0) : 0;
      const effAtkSpeed  = atkSpeed + atkSpeedBuff;

      // "Mengisi" progress menuju pukulan berikutnya, seperti progress bar.
      attackProgress += dt;

      // Kalau progress sudah penuh (mencapai jeda 1/effAtkSpeed) → SAATNYA MEMUKUL!
      if (attackProgress >= 1 / effAtkSpeed) {
        attackProgress -= 1 / effAtkSpeed; // kurangi progress (sisa lebih dibawa ke pukulan berikutnya)

        // Beberapa skill membuat basic attack jadi "empowered"
        // (dikuatkan) untuk beberapa pukulan ke depan — entah dengan
        // pengali tetap (empoweredBasic) atau pengali + jumlah pukulan
        // terbatas (empoweredBasicCount).
        const empBonus     = state.empoweredBasic           || 0;
        const empCount     = state.empoweredBasicCount      || 0;
        const empCountMult = state.empoweredBasicMultiplier || 0;

        // Beberapa buff (extraHits) membuat basic attack BIASA diganti
        // dengan sejumlah "pukulan tambahan" berbasis Physical_ATK,
        // bukan damage basic attack normal.
        const skipBasicDmg = buffActive && state.extraHits > 0;
        const extraHitDmg  = skipBasicDmg
          ? round2(fs.Physical_ATK * (state.extraHitsDmgRatio || 1.0) * state.extraHits)
          : 0;

        let baseActiveDmg;
        let passiveExtraDmg = 0;

        // 🅰️ Kalau ada "empowered basic" tipe pengali tetap:
        if (empBonus > 0) {
          const empDmg = round2(fs.Physical_ATK * empBonus);
          baseActiveDmg = {
            ...dmg,
            basicAtk: empDmg,
            breakdown: { ...dmg.breakdown, basicAtk: {
              parts: [{ ref: 'Physical_ATK', statValue: round2(fs.Physical_ATK), multiplier: empBonus, value: empDmg }],
              raw: empDmg, dmgBonusMultiplier: 1, final: empDmg,
            }},
          };
        // 🅱️ Kalau ada "empowered basic" tipe jumlah pukulan terbatas:
        } else if (empCount > 0) {
          const empDmg = round2(fs.Physical_ATK * empCountMult);
          baseActiveDmg = {
            ...dmg,
            basicAtk: empDmg,
            breakdown: { ...dmg.breakdown, basicAtk: {
              parts: [{ ref: 'Physical_ATK', statValue: round2(fs.Physical_ATK), multiplier: empCountMult, value: empDmg }],
              raw: empDmg, dmgBonusMultiplier: 1, final: empDmg,
            }},
          };
        // 🅲️ Kalau tidak ada empowered apa pun → pakai damage basic attack normal,
        // tapi kalau sedang ada buff aktif, hitung ulang damage dengan buff itu
        // ikut diperhitungkan.
        } else {
          baseActiveDmg = (buffActive && Object.keys(state.activeBuffs).length > 0)
            ? calculateFinalStats({ ...heroBase, buffs: { ...currentBuffs, ...state.activeBuffs } }, baseData).damage
            : dmg;

          // Beberapa hero punya pasif "tambahan damage basic attack" yang
          // otomatis menyertai SETIAP basic attack (bukan dari buff sementara).
          const passiveRatio = resolveVal(skillHandlerConfig?.passive_basic_extra_ratio, starIndex);
          const passiveHits  = skillHandlerConfig?.passive_basic_extra_hits || 0;
          if (passiveRatio && passiveHits > 0)
            passiveExtraDmg = round2(fs.Physical_ATK * passiveRatio * passiveHits);
        }

        // Gabungkan semua sumber damage basic attack jadi satu angka final:
        // damage basic biasa (kecuali kalau diganti extraHits) + extraHitDmg + passiveExtraDmg
        const activeDmg = {
          ...baseActiveDmg,
          basicAtk: round2(skipBasicDmg ? 0 : baseActiveDmg.basicAtk) + extraHitDmg + passiveExtraDmg,
          breakdown: {
            ...baseActiveDmg.breakdown,
            basicAtk: {
              ...baseActiveDmg.breakdown.basicAtk,
              extraHitDmg, passiveExtraDmg,
              final: round2(baseActiveDmg.breakdown.basicAtk.final) + extraHitDmg + passiveExtraDmg,
            },
          },
        };

        // Kurangi "jatah" empowered setelah dipakai (supaya tidak dipakai berulang)
        if (empBonus > 0) state.empoweredBasic = 0;
        if (empCount > 0) state.empoweredBasicCount = empCount - 1;

        const isEmpoweredHit = empBonus > 0 || empCount > 0;
        dmgSoFar += activeDmg.basicAtk;

        // Basic attack yang "empowered" biasanya TIDAK menambah mana lagi
        // (karena mana sudah dipakai untuk memicu efek empowered itu).
        if (!isEmpoweredHit) mana += manaPerBasic;

        // 📝 Catat pukulan basic attack ini ke timeline.
        // type-nya 'ghost' kalau hero sudah mati (basic attack "hantu",
        // efek dari deathPlugin), atau 'basic' kalau normal.
        timeline.push({
          time: round2(t), type: isDead ? 'ghost' : 'basic',
          dmg: round2(activeDmg.basicAtk), dmgSoFar: round2(dmgSoFar),
          mana: round2(mana),
          buffActive: isDead ? false : buffActive,
          activeBuffs: isDead ? {} : (buffActive ? { ...state.activeBuffs } : {}),
          effAtkSpeed: round2(effAtkSpeed),
          breakdown: activeDmg.breakdown.basicAtk,
          isEmpowered: empBonus > 0,
        });

        // ── PASIF "NUMPUK BASIC ATTACK" (basic_stack) ────────────
        // Beberapa hero punya pasif: setiap basic attack menambah
        // 1 "stack", dan setelah stack penuh (misal 5x), terjadi efek
        // bonus (entah langsung trigger sekali yang besar, atau
        // bonus damage kecil yang bertambah sesuai jumlah stack).
        if (!isDead && basicStackCfg) {
          const maxStacks      = basicStackCfg.max_stacks || 5;
          const dur            = basicStackCfg.duration   || 4; // stack akan hilang kalau tidak nambah dalam X detik
          // Kalau basic attack ini adalah hasil dari "extraHits", stack
          // bertambah 2 sekaligus (bukan 1) — aturan khusus.
          const stackIncrement = (buffActive && state.extraHits > 0) ? 2 : 1;

          // Kalau sudah lewat waktu kadaluwarsa stack → reset ke 0 dulu
          if (t > state.basicStackExpire + 1e-9) state.basicStackCount = 0;
          state.basicStackCount  = Math.min(state.basicStackCount + stackIncrement, maxStacks);
          state.basicStackExpire = t + dur; // perpanjang lagi waktu kadaluwarsa

          const refStat = fs[basicStackCfg.bonus_ref] || 0; // stat acuan untuk hitung bonus (misal Physical_ATK)

          // Mode A: bonus besar HANYA terjadi saat stack PENUH (trigger_at_max)
          if (basicStackCfg.trigger_at_max && state.basicStackCount >= maxStacks) {
            const triggerMult = resolveVal(basicStackCfg.trigger_multiplier, starIndex) || 0;
            const bonusDmg    = round2(refStat * triggerMult);
            state.basicStackCount = 0; // reset stack setelah trigger
            dmgSoFar += bonusDmg;
            timeline.push({
              time: round2(t), type: 'passive',
              dmg: bonusDmg, dmgSoFar: round2(dmgSoFar),
              mana: round2(mana), effAtkSpeed: round2(effAtkSpeed),
              buff: `⚡ ${basicStackCfg.label || 'Stack'} (5 stack → trigger)`,
              activeBuffs: {}, breakdown: {
                parts: [{ ref: basicStackCfg.bonus_ref, statValue: round2(refStat), multiplier: triggerMult, value: round2(refStat * triggerMult) }],
                raw: round2(refStat * triggerMult), dmgBonusMultiplier: 1, final: round2(refStat * triggerMult),
              },
            });
          // Mode B: bonus damage kecil setiap pukulan, besarnya sesuai jumlah stack saat ini
          } else if (!basicStackCfg.trigger_at_max) {
            const bonusPerStack = resolveVal(basicStackCfg.bonus_per_stack, starIndex);
            const bonusDmg      = round2(refStat * bonusPerStack * state.basicStackCount);
            dmgSoFar += bonusDmg;
            timeline.push({
              time: round2(t), type: 'basic_bonus',
              dmg: bonusDmg, dmgSoFar: round2(dmgSoFar),
              mana: round2(mana), effAtkSpeed: round2(effAtkSpeed),
              buff: `${basicStackCfg.label || 'Stack'} (${state.basicStackCount}/${maxStacks})`,
              activeBuffs: {}, breakdown: null,
            });
          }
        }

        // ── KESEMPATAN "DOUBLE ATTACK" ───────────────────────────
        // Kalau hero punya chance untuk memukul 2x sekaligus
        // (doubleAtkChance), kita "lempar dadu" (Math.random()) — kalau
        // beruntung, pukulan basic attack ini terjadi SEKALI LAGI
        // (dicatat sebagai kejadian terpisah bertipe 'double').
        const doubleChance = activeDmg.breakdown.basicAtk.doubleAtkChance || 0;
        if (doubleChance > 0 && Math.random() < doubleChance) {
          dmgSoFar += activeDmg.basicAtk;
          mana     += manaPerBasic;
          timeline.push({
            time: round2(t), type: 'double',
            dmg: round2(activeDmg.basicAtk), dmgSoFar: round2(dmgSoFar),
            mana: round2(mana), buffActive,
            activeBuffs: buffActive ? { ...state.activeBuffs } : {},
            effAtkSpeed: round2(effAtkSpeed),
            breakdown: activeDmg.breakdown.basicAtk,
          });
        }
      }
    }

    // ── 8️⃣ PROSES SUMMON (anak buah panggilan) ─────────────────────
    // Kalau hero punya summon (anak buah yang ikut menyerang sendiri
    // dengan jadwalnya sendiri), kita kasih kesempatan ke summonPlugin
    // untuk memproses serangan summon di waktu t ini, dan menambah
    // damage totalnya lewat setDmgSoFar.
    if (!isDead && summonPlugin) summonPlugin.onTick({
      t, dt, dmgSoFar, mana, timeline,
      setDmgSoFar: (v) => { dmgSoFar = v; },
    });

    // Apakah skill hero ini "berbasis cooldown" (timer), bukan mana?
    // Kalau iya, skill di-cast otomatis setiap X detik, tidak perlu
    // menunggu mana penuh.
    const isCooldownBased = skillHandlerConfig?.ignore_mana === true;

    // ── FASE SKYSCRAPER: PINDAH DARI "CLIMBING" KE "DESCENDING" ────
    // Kalau hero dalam fase skyscraper dan mana sudah penuh (manaFirst)
    // saat fase "climbing" → otomatis pindah ke fase "descending".
    if (!isDead && skyscraperCfg && t < skyscraperCfg.duration &&
        state.skyPhase === 'climbing' && mana + 1e-9 >= manaFirst) {
      state.skyPhase    = 'descending';
      state.skyPhaseEnd = t + (skyscraperCfg.descend_time || 1);
    }

    // ── EFEK "SOARING PLUME" (efek satu kali setelah fase skyscraper habis) ──
    // Begitu durasi skyscraper berakhir, terjadi SATU KALI ledakan damage
    // besar bernama "Soaring Plume". soaringPlumeFired memastikan efek
    // ini cuma terjadi sekali saja per simulasi.
    if (!isDead && skyscraperCfg && !soaringPlumeFired && t + 1e-9 >= skyscraperCfg.duration) {
      soaringPlumeFired = true;
      const spFormula = skyscraperCfg.soaring_plume.formula;
      let spDmg = 0;
      const spParts = [];
      spFormula.forEach(part => {
        const statVal = fs[part.ref] || 0;
        const mult    = resolveVal(part.multiplier, starIndex);
        const val     = round2(statVal * mult);
        spDmg += val;
        spParts.push({ ref: part.ref, statValue: round2(statVal), multiplier: mult, value: val });
      });
      spDmg = round2(spDmg);
      const spDmgMult  = getSkillDmgMultiplier(dmg, state);
      const spDmgFinal = round2(spDmg * spDmgMult);
      dmgSoFar += spDmgFinal;
      skillCasts++;
      timeline.push({
        time: round2(t), type: 'skill',
        hitIndex: 1, totalHits: 1,
        dmg: spDmgFinal, dmgSoFar: round2(dmgSoFar),
        mana: round2(mana), manaBefore: round2(mana), threshold: 0,
        effAtkSpeed: round2(atkSpeed),
        buff: '🪶 Soaring Plume',
        activeBuffs: {}, breakdown: { parts: spParts, raw: spDmg, dmgBonusMultiplier: spDmgMult, final: spDmgFinal },
        healNow: 0, shieldNow: 0,
      });
    }

    // ── HITUNG DAMAGE SKILL "AKTIF" SAAT INI ────────────────────────
    // Tentukan dulu formula skill mana yang dipakai sekarang:
    // - kalau sudah lewat fase skyscraper → pakai formula skill fase 2
    // - kalau belum → pakai formula skill normal (DMG_skill)
    // Lalu hitung damage mentahnya berdasarkan stat hero saat ini.
    const usePhase2      = skyscraperCfg && t >= skyscraperCfg.duration;
    const activeFormula  = usePhase2 ? skyscraperCfg.skill_phase2 : baseData.DMG_skill;
    const activeSkillDmg = (() => {
      if (!activeFormula) return { dmg: 0, parts: [] };
      let total = 0;
      const parts = [];
      activeFormula.formula.forEach(part => {
        const statVal = fs[part.ref] || 0;
        const mult    = resolveVal(part.multiplier, starIndex);
        const val     = round2(statVal * mult);
        total += val;
        parts.push({ ref: part.ref, statValue: round2(statVal), multiplier: mult, value: val });
      });
      return { dmg: round2(total), parts };
    })();

    // ════════════════════════════════════════════════════════════
    // 9️⃣ BLOK CAST SKILL — JALUR A: BERBASIS COOLDOWN (timer)
    // (Khusus hero yang skill-nya jalan otomatis tiap X detik,
    //  bukan menunggu mana penuh.)
    // ════════════════════════════════════════════════════════════
    if (!isDead && isCooldownBased) {
      // Cast kalau sudah waktunya (nextCastTime tercapai), dan ini
      // BUKAN cast pertama kecuali skillCasts masih 0 (cast pertama
      // selalu diizinkan).
      if (t + 1e-9 >= state.nextCastTime && (state.nextCastTime > 0 || skillCasts === 0)) {
        const cd          = skillHandlerConfig?.cooldown || 0;
        state.nextCastTime = cd > 0 ? t + cd : Infinity; // jadwalkan cast berikutnya
        skillCasts++;
        const cdDmgMult  = getSkillDmgMultiplier(dmg, state);
        const cdDmgFinal = round2(activeSkillDmg.dmg * cdDmgMult);

        // Hero akan "sibuk casting" sesuai cast_duration (kalau ada),
        // selama waktu itu basic attack & mana regen diblokir.
const skillCastDuration = skillHandlerConfig?.cast_duration ?? 0;
state.skillCastEndTime = t + skillCastDuration;
        dmgSoFar += cdDmgFinal;

        // Terapkan efek tambahan skill (buff, heal, shield, dst) sesuai
        // konfigurasinya — detail logikanya ada di skill_handler.js
        applySkillHandlerConfig(skillHandlerConfig, state, t, fs, starIndex);

        const healNowVal   = state.healNow   || 0;
        const shieldNowVal = state.shieldNow || 0;
        state.healNow   = 0;
        state.shieldNow = 0;
        timeline.push({
          time: round2(t), type: 'skill',
          hitIndex: 1, totalHits: 1,
          dmg: cdDmgFinal, dmgSoFar: round2(dmgSoFar),
          mana: round2(mana), manaBefore: round2(mana), threshold: 0,
          effAtkSpeed: round2(atkSpeed + (state.activeBuffs.ATK_Speed_Bonus || 0)),
          buff: state.buffLabel || null,
          activeBuffs: { ...state.activeBuffs },
          breakdown: { parts: activeSkillDmg.parts, raw: activeSkillDmg.dmg, dmgBonusMultiplier: cdDmgMult, final: cdDmgFinal },
          healNow: healNowVal, shieldNow: shieldNowVal,
        });
      }

    // ════════════════════════════════════════════════════════════
    // 9️⃣ BLOK CAST SKILL — JALUR B: BERBASIS MANA (normal)
    // (Hero kebanyakan ada di jalur ini: skill di-cast otomatis
    //  begitu mana mencapai ambang batas (threshold) tertentu.
    //  while-loop di bawah ini supaya kalau mana cukup untuk cast
    //  beberapa kali sekaligus dalam satu tick — misalnya mana
    //  regen-nya sangat besar — semua cast itu tetap diproses.)
    // ════════════════════════════════════════════════════════════
    } else if (!isDead) {
      // Ambang mana yang dibutuhkan: cast pertama pakai manaFirst,
      // cast selanjutnya pakai manaNext.
      const threshold = skillCasts === 0 ? manaFirst : manaNext;

      while (threshold > 0 && mana + 1e-9 >= threshold) {
        const manaBefore = round2(mana);

        // Kalau hero sedang dalam fase skyscraper dan belum masuk fase
        // "casting", JANGAN cast skill normal dulu — keluar dari while-loop.
        if (skyscraperCfg && t < skyscraperCfg.duration && state.skyPhase !== 'casting') break;

        // Mana di-reset ke 0 setelah dipakai cast (lalu mungkin
        // ditambah sedikit lagi dari manaPerSkill kalau ada).
        mana = 0;
        mana += manaPerSkill;
        skillCasts++;

        // Beberapa skill punya formula damage YANG BERBEDA tergantung
        // ini cast ke berapa (formula_by_cast) — misal cast ke-1 pakai
        // pengali x2, cast ke-2 pakai pengali x3, dst. Kalau ada
        // aturan ini, kita timpa (override) pengali Physical_ATK saja.
        let activeSkillDmgForCast = activeSkillDmg;
        const formulaByCast = skillHandlerConfig?.formula_by_cast;
        if (formulaByCast) {
          const castIdx      = Math.min(skillCasts - 1, formulaByCast.length - 1);
          const overrideMult = resolveVal(formulaByCast[castIdx], starIndex);
          let total = 0;
          const parts = activeSkillDmg.parts.map(p => {
            const mult = p.ref === 'Physical_ATK' ? overrideMult : p.multiplier;
            const val  = round2(p.statValue * mult);
            total += val;
            return { ...p, multiplier: mult, value: val };
          });
          activeSkillDmgForCast = { dmg: round2(total), parts };
        }

        // Terapkan efek tambahan skill (buff/heal/shield/dst), ATAU
        // kalau hero tidak punya skillHandlerConfig sama sekali, anggap
        // skill ini "instan" (skillCastEndTime = t, tidak ada blokir waktu).
if (skillHandlerConfig) applySkillHandlerConfig(skillHandlerConfig, state, t, fs, starIndex);
        else state.skillCastEndTime = t;

        // Hitung damage skill akhir (sudah termasuk semua bonus yang aktif)
        const skillDmgMult = getSkillDmgMultiplier(dmg, state);
        const skillDmgBoosted = round2(activeSkillDmgForCast.dmg * skillDmgMult);
        const activeBreakdown = {
          parts: activeSkillDmgForCast.parts,
          raw: activeSkillDmgForCast.dmg,
          dmgBonusMultiplier: skillDmgMult,
          final: skillDmgBoosted,
        };

        // ── MODE "BONUS HITS" ────────────────────────────────────
        // Beberapa skill, SETELAH sejumlah cast tertentu (bonus_hits_from_cast),
        // berubah jadi mode bonus: bukan damage skill normal lagi,
        // tapi sejumlah pukulan tambahan berbasis Physical_ATK.
        const bonusFromCast = skillHandlerConfig?.bonus_hits_from_cast || Infinity;
        const useBonusMode  = skillCasts >= bonusFromCast;
        const effAtkSpeedAtSkill = atkSpeed + (state.activeBuffs.ATK_Speed_Bonus || 0);


if (!useBonusMode) {
  // ── MODE NORMAL: skill memukul sejumlah "hits" kali ──────
  // Jumlah hit bisa beda-beda tergantung cast ke berapa
  // (hits_by_cast), atau tetap sama (config.hits, default 1).
  const hitsByCast = skillHandlerConfig?.hits_by_cast;
  const skillHits  = hitsByCast
    ? hitsByCast[Math.min(skillCasts - 1, hitsByCast.length - 1)]
    : (skillHandlerConfig?.hits || 1);

  // Kalau tipe skill adalah 'sequence' dan damage langsungnya 0,
  // berarti damage sebenarnya akan datang dari pendingEffects (sudah
  // dijadwalkan di blok 2️⃣ tadi) — jadi JANGAN catat damage 0 di sini.
  const isSequenceTrigger = skillHandlerConfig?.type === 'sequence' && skillDmgBoosted === 0;

  if (!isSequenceTrigger) {
    for (let h = 0; h < skillHits; h++) {
      dmgSoFar += skillDmgBoosted;
      // Heal/shield dari skill hanya diberikan SEKALI, di hit pertama
      // (h === 0), supaya tidak terhitung berulang setiap hit.
      const healNowVal   = h === 0 ? (state.healNow   || 0) : 0;
      const shieldNowVal = h === 0 ? (state.shieldNow || 0) : 0;
      if (h === 0) { state.healNow = 0; state.shieldNow = 0; }
      timeline.push({
        time: round2(t), type: 'skill',
        hitIndex: h + 1, totalHits: skillHits,
        dmg: skillDmgBoosted, dmgSoFar: round2(dmgSoFar),
        mana: round2(mana), manaBefore: h === 0 ? manaBefore : round2(mana),
        threshold, effAtkSpeed: round2(effAtkSpeedAtSkill),
        buff: h === 0 ? (state.buffLabel || null) : null,
        activeBuffs: { ...state.activeBuffs },
        breakdown: activeBreakdown,
        healNow: healNowVal, shieldNow: shieldNowVal,
      });
    }
  }
} else {
          // ── MODE BONUS: skill diganti jadi sejumlah pukulan bonus ──
          // berbasis Physical_ATK * pengali bonus, bukan formula skill normal.
          const bonusHits = skillHandlerConfig?.bonus_hits || 1;
          const bonusMult = resolveVal(skillHandlerConfig?.bonus_hits_multiplier, starIndex) ?? 1;

          for (let b = 0; b < bonusHits; b++) {
            const bonusDmg     = round2(fs.Physical_ATK * bonusMult * skillDmgMult);
            dmgSoFar          += bonusDmg;
            const healNowVal   = b === 0 ? (state.healNow   || 0) : 0;
            const shieldNowVal = b === 0 ? (state.shieldNow || 0) : 0;
            if (b === 0) { state.healNow = 0; state.shieldNow = 0; }
            timeline.push({
              time: round2(t), type: 'skill',
              hitIndex: b + 1, totalHits: bonusHits,
              dmg: bonusDmg, dmgSoFar: round2(dmgSoFar),
              mana: round2(mana), manaBefore: b === 0 ? manaBefore : round2(mana),
              threshold, effAtkSpeed: round2(effAtkSpeedAtSkill),
              buff: b === 0 ? (state.buffLabel || null) : null,
              activeBuffs: { ...state.activeBuffs },
              breakdown: { parts: [{ ref: 'Physical_ATK', statValue: fs.Physical_ATK, multiplier: bonusMult, value: bonusDmg }], raw: bonusDmg, dmgBonusMultiplier: 1, final: bonusDmg },
              healNow: healNowVal, shieldNow: shieldNowVal,
            });
          }
        }

        // Kalau hero sedang dalam masa skyscraper, setiap cast skill
        // memicu pindah fase ke "ascending" (mulai naik lagi).
        if (skyscraperCfg && t < skyscraperCfg.duration) {
          state.skyPhase    = 'ascending';
          state.skyPhaseEnd = t + (skyscraperCfg.climb_time || 1);
        }

        // Cast pertama kadang butuh mana berbeda dari cast selanjutnya
        // (manaFirst !== manaNext). Kalau itu terjadi, hentikan while-loop
        // setelah cast pertama — supaya tidak langsung cast lagi pakai
        // ambang yang salah di tick yang sama.
        if (skillCasts === 1 && manaFirst !== manaNext) break;
      }
    }

  } // ⏳ akhir dari satu langkah waktu (lanjut ke t berikutnya)


  // ════════════════════════════════════════════════════════════════
  // 🏁 SETELAH LOOP WAKTU SELESAI — REKAP HASIL AKHIR
  // Sekarang kita "membaca ulang" seluruh timeline yang sudah terkumpul
  // selama simulasi, lalu menghitung berbagai total & ringkasan yang
  // akan ditampilkan ke pengguna (misal di tabel/grafik laporan).
  // ════════════════════════════════════════════════════════════════

  // Pisahkan kejadian di timeline berdasarkan jenisnya:
  const basicEvents  = timeline.filter(e => e.type === 'basic');  // basic attack normal
  const doubleEvents = timeline.filter(e => e.type === 'double'); // basic attack ke-2 (dari double chance)
  const ghostEvents  = timeline.filter(e => e.type === 'ghost');  // basic attack hero yang sudah "mati" (efek death plugin)
  const skillEvents  = timeline.filter(e => e.type === 'skill');  // semua hit dari skill
  const allBasicHits = basicEvents.length + doubleEvents.length;  // total jumlah pukulan basic (termasuk double)

  // Jumlahkan damage per kategori
  const basicTotal = [...basicEvents, ...doubleEvents].reduce((s, e) => s + e.dmg, 0);
  const ghostTotal = ghostEvents.reduce((s, e) => s + e.dmg, 0);
  const skillTotal = skillEvents.reduce((s, e) => s + e.dmg, 0);

  // Cari kejadian di mana ada buff yang sedang aktif (buffActive: true),
  // lalu cari nilai TERBESAR dari buff Lifesteal & ATK Speed yang pernah
  // tercatat — supaya laporan bisa menunjukkan "buff maksimum yang
  // pernah didapat hero selama pertarungan".
  const buffActiveEvents = timeline.filter(e => e.buffActive);
  const buffLifesteal    = Math.max(...buffActiveEvents.map(e => e.activeBuffs?.Lifesteal_Bonus || 0), 0);
  const buffAtkSpeed     = Math.max(...buffActiveEvents.map(e => e.activeBuffs?.ATK_Speed_Bonus || 0), 0);

  // Total heal & shield yang didapat hero dari skill selama pertarungan
  const totalHealNow   = round2(skillEvents.reduce((s, e) => s + (e.healNow   || 0), 0));
  const totalShieldNow = round2(
  timeline.filter(e => e.type === 'skill')
    .reduce((s, e) => s + (e.shieldNow || 0), 0)
);

  // ════════════════════════════════════════════════════════════════
  // 📦 OBJEK HASIL AKHIR — ini yang dikembalikan (return) ke pemanggil
  // fungsi simulateBattle. Berisi semua angka & data yang dibutuhkan
  // untuk menampilkan laporan/grafik di aplikasi.
  // ════════════════════════════════════════════════════════════════
  return {
    hero,                 // data hero asli yang disimulasikan
    baseData,              // data dasar hero
    duration,              // berapa detik simulasi berjalan
    finalStats:  fs,       // stat akhir hero (HP, ATK, dst)
    buffLog:     hero.buffLog || [],
    buffLifesteal,         // buff lifesteal maksimum yang pernah aktif
    buffAtkSpeed,          // buff attack speed maksimum yang pernah aktif
    // Daftar nama-nama buff yang pernah aktif saat skill di-cast
    // (diambil dari kejadian skill pertama yang punya activeBuffs)
    activeBuffKeys: Object.keys(timeline.find(e => e.type === 'skill')?.activeBuffs || {}),
    timeline,               // 📝 daftar LENGKAP semua kejadian (untuk grafik detail)
    passiveLog:  state.passiveLog,
    // Total damage keseluruhan = basic + ghost + skill + damage dari summon (kalau ada)
    totalDmg:    round2(basicTotal + ghostTotal + skillTotal + (summonPlugin?.getDmgTotal() ?? 0)),
    // Pecah total damage skill menjadi porsi Fisik vs Magic
    skillPhysTotal: round2(splitEventsDmg(skillEvents, 'Physical')),
    skillMagTotal:  round2(splitEventsDmg(skillEvents, 'Magic')),

    // Stat DASAR hero (sebelum kena buff apa pun) — untuk perbandingan
    baseStats: {
      HP:                   getBaseValue(baseData, 'HP',                   starIndex),
      Physical_ATK:         getBaseValue(baseData, 'Physical_ATK',         starIndex),
      Magic_ATK:            getBaseValue(baseData, 'Magic_ATK',            starIndex),
      Physical_Def:         getBaseValue(baseData, 'Physical_Def',         starIndex),
      Magic_Def:            getBaseValue(baseData, 'Magic_Def',            starIndex),
      ATK_Speed:            getBaseValue(baseData, 'ATK_Speed',            starIndex),
      Lifesteal:            getBaseValue(baseData, 'Lifesteal',            starIndex),
      Spell_Vamp:           getBaseValue(baseData, 'Spell_Vamp',           starIndex),
      Physical_Penetration: getBaseValue(baseData, 'Physical_Penetration', starIndex),
      Magic_Penetration:    getBaseValue(baseData, 'Magic_Penetration',    starIndex),
      Mana_Regen_Per_Detik: getBaseValue(baseData, 'Mana_Regen_Per_Detik', starIndex),
      Batas_Mana:           getBaseValue(baseData, 'Batas_Mana',           starIndex),
      Batas_Mana_Awal:      getBaseValue(baseData, 'Batas_Mana_Awal',      starIndex),
      Jangkauan_ATK:        getBaseValue(baseData, 'Jangkauan_ATK',        starIndex),
    },

    // Ringkasan khusus untuk BASIC ATTACK
    basicAtk: {
      hits:       basicEvents.length,   // jumlah basic attack normal
      doubleHits: doubleEvents.length,  // jumlah basic attack dari double chance
      ghostHits:  ghostEvents.length,   // jumlah basic attack "hantu" (setelah mati)
      totalHits:  allBasicHits,         // total semua pukulan basic
      atkSpeed,                          // attack speed final (sudah termasuk pasif flat)
      interval:   attackInterval === Infinity ? null : round2(attackInterval), // jeda antar pukulan
      dmgPerHit:  round2(dmg.basicAtk),  // damage per satu pukulan (acuan dasar)
      totalDmg:   round2(basicTotal),    // total damage dari semua basic attack
      ghostDmg:   round2(ghostTotal),    // total damage dari basic attack "hantu"
      breakdown:  dmg.breakdown.basicAtk,// rincian dari mana saja damage basic attack berasal
    },

    // Ringkasan khusus untuk SKILL
    skill: {
      // jumlah cast skill = hitung kejadian yang hitIndex-nya 1 (hit pertama dari tiap cast) atau tidak punya hitIndex
      casts:       skillEvents.filter(e => e.hitIndex === 1 || !e.hitIndex).length,
      manaFirst, manaNext, manaRegen, manaPerBasic, manaPerSkill,
      dmgPerCast:  round2(dmg.skillDmg), // damage per cast (acuan dasar, sebelum buff dinamis)
      totalDmg:    round2(skillTotal),   // total damage dari semua cast skill
      castTimes:   skillEvents.filter(e => (e.hitIndex || 1) === 1).map(e => e.time), // daftar waktu tiap kali skill di-cast
      breakdown:   dmg.breakdown.skillDmg,
      totalHealNow,    // total heal yang didapat dari skill
      totalShieldNow,  // total shield yang didapat dari skill
    },

    // Ringkasan khusus untuk SUMMON (anak buah panggilan), kalau ada
    summon: summonPlugin ? {
      id:       baseData.summon.id,
      totalDmg: round2(summonPlugin.getDmgTotal()),
      hits:     summonPlugin.getHits(timeline),
    } : null,
  };
}