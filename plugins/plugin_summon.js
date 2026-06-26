// ════════════════════════════════════════════════════════════════
// plugin_summon.js
// Plugin summon permanen (Claude + Dexter, dll).
// Aktif hanya kalau baseData.summon ada.
//
// Cara kerja:
// - createSummonPlugin() → return null kalau hero tidak punya summon
// - onTick()             → cek interval ATK Speed summon, push ke timeline
//
// Untuk menambah summon baru: cukup tambah field "summon" di data hero.
// Tidak perlu ubah file ini maupun simulate_battle.js.
// ════════════════════════════════════════════════════════════════

export function createSummonPlugin(baseData, starIndex, fs, round2, resolveVal) {
  const cfg = baseData.summon || null;
  if (!cfg) return null;

  let progress = 0;
  let dmgTotal = 0;

  return {
    key: 'summon',

    // ── Getter untuk agregasi hasil di akhir simulasi ──
    getDmgTotal: () => dmgTotal,
    getHits: (timeline) => timeline.filter(e => e.type === 'summon_basic').length,

    // ── Dipanggil tiap tick di loop simulasi ──
    onTick({ t, dt, dmgSoFar, setDmgSoFar, mana, timeline }) {
      const speed = resolveVal(cfg.ATK_Speed, starIndex);
      progress += dt;
      if (progress < 1 / speed) return;
      progress -= 1 / speed;

      let dexDmg = 0;
      const parts = [];
      (cfg.BASIC_ATK.formula || []).forEach(part => {
        const statVal = fs[part.ref] || 0;
        const mult    = resolveVal(part.multiplier, starIndex);
        const val     = round2(statVal * mult);
        dexDmg += val;
        parts.push({ ref: part.ref, statValue: round2(statVal), multiplier: mult, value: val });
      });
      dexDmg = round2(dexDmg);
      dmgTotal += dexDmg;

      const newDmgSoFar = dmgSoFar + dexDmg;
      setDmgSoFar(newDmgSoFar);

      timeline.push({
        time: round2(t), type: 'summon_basic',
        dmg: dexDmg, dmgSoFar: round2(newDmgSoFar),
        mana: round2(mana), effAtkSpeed: round2(speed),
        buff: cfg.id, activeBuffs: {},
        breakdown: { parts, raw: dexDmg, dmgBonusMultiplier: 1, final: dexDmg },
      });
    },
  };
}
