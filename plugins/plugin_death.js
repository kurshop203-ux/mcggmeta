// ════════════════════════════════════════════════════════════════
// plugin_death.js
// Plugin death mechanic — hero mati di tengah simulasi.
// Aktif hanya kalau hero.emberlord_waktu_mati < 40.
//
// Cara kerja:
// - createDeathPlugin() → return null kalau hero tidak punya waktu mati
// - onTick()            → cek apakah sudah waktunya mati, lalu:
//     · set isDead = true
//     · ganti dmg ke stat murni tanpa buff
//     · reset currentBuffs dan state.activeBuffs
//
// Field yang dibutuhkan di hero object:
//   hero.emberlord_waktu_mati → detik kapan hero mati (di-set oleh Emberlord.js handler)
//
// Tidak hardcode nama fraksi — berlaku untuk hero manapun yang
// punya emberlord_waktu_mati di-set oleh buff handler manapun.
// ════════════════════════════════════════════════════════════════

// plugin_death.js — tambah parameter duration
export function createDeathPlugin(hero, heroBase, baseData, calculateFinalStats, duration = 40) {
  const waktuMati = hero.emberlord_waktu_mati ?? Infinity;
  if (waktuMati >= duration) return null;

  // Pre-hitung dmg murni tanpa buff apapun — dipakai setelah hero mati
  const dmgBaseMurni = calculateFinalStats({ ...heroBase, buffs: {} }, baseData).damage;

  return {
    key: 'death',
    waktuMati,
    dmgBaseMurni,

    // ── Dipanggil tiap tick di loop simulasi ──
    onTick({ t, isDead, state, setIsDead, setDmg, setCurrentBuffs }) {
      if (isDead) return;
      if (t + 1e-9 < waktuMati) return;

      setIsDead(true);
      setDmg(dmgBaseMurni);
      setCurrentBuffs({});
      state.activeBuffs = {};
      state.buffEndTime = 0;
    },
  };
}
