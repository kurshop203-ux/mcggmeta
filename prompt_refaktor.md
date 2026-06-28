# PROMPT REFAKTOR: score_utils.js & render_simulation.js

## KONTEKS SISTEM

Kamu sedang merefaktor dua file dalam game engine berbasis JavaScript ES Module:

- `engine/score_utils.js` — menghitung `damageTotal` & `sustainTotal` untuk **worker** (background thread, tanpa DOM)
- `ui/render_simulation.js` — menghitung hal yang sama LAGI secara duplikat, lalu merender hasilnya jadi **HTML** untuk ditampilkan ke user

**Masalah utama:**
Rumus scoring ada di dua tempat (`calcDmgSplit` dan `calcSkor`/`replicateCalcSkor`). Kalau ada buff baru atau perubahan rumus, harus update dua file — rawan lupa dan hasilnya bisa beda antara yang ditampilkan UI vs yang dipakai engine untuk ranking.

**Tujuan refaktor:**
`render_simulation.js` harus **murni render only** — tidak ada kalkulasi apapun di dalamnya. Semua angka datang dari `score_utils.js`. Satu fungsi `calcSkorLengkap(sim)` mengembalikan semua yang dibutuhkan panel-panel UI.

---

## ATURAN WAJIB (JANGAN DILANGGAR)

1. **Jangan ubah logika/rumus apapun** — hanya pindahkan dan restrukturisasi
2. **Jangan hardcode nama fraksi, stat, atau tipe event** — semua harus data-driven
3. **Semua export yang sudah ada tetap ada** — tidak boleh hapus export yang sudah dipakai file lain
4. **Worker-safe** — `score_utils.js` tidak boleh mengandung apapun yang butuh DOM (tidak ada `document`, `window`, string HTML)
5. **Setiap tahap harus bisa jalan sendiri** — jangan lanjut ke tahap berikutnya sebelum tahap sebelumnya tidak error
6. **`render_simulation.js` harus 100% murni render** — tidak boleh ada fungsi kalkulasi apapun tersisa di dalamnya setelah refaktor selesai

---

## FILE YANG TERLIBAT

```
engine/
  score_utils.js         ← TARGET utama refaktor
  simulate_battle.js     ← jangan diubah (hanya baca)

ui/
  render_simulation.js   ← TARGET kedua refaktor
```

---

## TAHAP 1 — Perluas `score_utils.js`

**Tujuan:** Tambah satu fungsi `calcSkorLengkap(sim)` yang mengembalikan SEMUA data yang dibutuhkan panel-panel UI di `render_simulation.js` — termasuk dmg splits, breakdown arrays, detail lifesteal, mana, phantom, dll.

### 1a. Tambah export `resolveVal` di `score_utils.js`

Fungsi ini duplikat di kedua file. Jadikan satu di `score_utils.js`:

```js
// score_utils.js — ubah dari private menjadi export
export function resolveVal(v, si) {
  return Array.isArray(v) ? v[Math.min(si, v.length - 1)] : v;
}
```

### 1b. Tambah fungsi `calcSkorLengkap` di `score_utils.js`

Tambah fungsi baru ini. Fungsi ini menggabungkan `calcDmgSplit` + `calcSkor` dari `render_simulation.js` menjadi satu, dan mengembalikan SEMUA property yang dibutuhkan panel [5]–[14]:

```js
// score_utils.js — TAMBAH fungsi baru ini (jangan hapus replicateCalcSkor yang lama)
export function calcSkorLengkap(sim) {
  const fs  = sim.finalStats;
  const si  = (sim.hero.stars || 1) - 1;

  // ── DMG SPLIT (phys/mag per tipe event) ──
  let basicPhysTotal = 0, basicMagTotal = 0;
  let ghostPhysTotal = 0, ghostMagTotal = 0;
  let skillPhysTotal = 0, skillMagTotal = 0;

  sim.timeline
    .filter(e => ['basic', 'double', 'ghost'].includes(e.type))
    .forEach(e => {
      if (!e.breakdown) return;
      const b     = e.breakdown;
      const ratio = b.raw !== 0 ? b.final / b.raw : 0;
      let phys = 0, mag = 0;
      b.parts.forEach(p => {
        const v = p.value * ratio;
        if      (p.ref.startsWith('Physical')) phys += v;
        else if (p.ref.startsWith('Magic'))    mag  += v;
      });
      const rawTotal = phys + mag;
      if (rawTotal === 0) return;
      if (e.type === 'ghost') {
        ghostPhysTotal += e.dmg * (phys / rawTotal);
        ghostMagTotal  += e.dmg * (mag  / rawTotal);
      } else {
        basicPhysTotal += e.dmg * (phys / rawTotal);
        basicMagTotal  += e.dmg * (mag  / rawTotal);
      }
    });

  sim.timeline
    .filter(e => e.type === 'skill')
    .forEach(e => {
      if (!e.breakdown) return;
      const b     = e.breakdown;
      const ratio = b.raw !== 0 ? b.final / b.raw : 0;
      let phys = 0, mag = 0;
      b.parts.forEach(p => {
        const v = p.value * ratio;
        if      (p.ref.startsWith('Physical')) phys += v;
        else if (p.ref.startsWith('Magic'))    mag  += v;
      });
      const rawTotal = phys + mag;
      if (rawTotal === 0) return;
      skillPhysTotal += e.dmg * (phys / rawTotal);
      skillMagTotal  += e.dmg * (mag  / rawTotal);
    });

  basicPhysTotal = round2(basicPhysTotal);
  basicMagTotal  = round2(basicMagTotal);
  ghostPhysTotal = round2(ghostPhysTotal);
  ghostMagTotal  = round2(ghostMagTotal);
  skillPhysTotal = round2(skillPhysTotal);
  skillMagTotal  = round2(skillMagTotal);

  // ── TOTALS PER KATEGORI ──
  const basicTotalDmg = round2(basicPhysTotal + basicMagTotal);
  const skillTotalDmg = round2(skillPhysTotal + skillMagTotal);
  const ghostDmgTotal = round2(ghostPhysTotal + ghostMagTotal);

  // ── LIFESTEAL ──
  const baseLifesteal = fs.Lifesteal || 0;
  const lsHealBase    = round2(baseLifesteal * basicTotalDmg);
  const buffLsEvents  = sim.timeline.filter(e => ['basic', 'double'].includes(e.type) && e.buffActive);
  const buffLsDmg     = round2(buffLsEvents.reduce((s, e) => s + e.dmg, 0));
  const buffBasicHits = buffLsEvents.length;
  const lsHealBuff    = round2((sim.buffLifesteal || 0) * buffLsDmg);
  const lsHealTotal   = round2(lsHealBase + lsHealBuff);

  // ── SPELL VAMP ──
  const svHealTotal = round2((fs.Spell_Vamp || 0) * skillTotalDmg);

  // ── MANA ──
  const manaTotal = round2(
    fs.Mana_Regen_Per_Detik * sim.duration
    + sim.basicAtk.hits * sim.skill.manaPerBasic
    + sim.skill.casts  * sim.skill.manaPerSkill
  );

  // ── SHIELD & HEAL ──
  const shieldVal         = round2((fs.Shield_Percent_HP || 0) * fs.HP);
  const rawHeal           = fs.Heal_Percent_HP || 0;
  const emberFlat         = Math.floor(rawHeal);
  const heartbondPersen   = rawHeal - emberFlat;
  const passiveHeal       = round2((heartbondPersen * fs.HP) + emberFlat);
  const rawPassiveShield  = sim.baseData.passive_shield_flat || 0;
  const passiveShieldFlat = resolveVal(rawPassiveShield, si);

  // ── PHANTOM (Exorcist) ──
  const phantom     = sim.hero.exorcist_phantom;
  const isTemplate  = phantom && (sim.hero.label ?? sim.hero.name) === phantom.dari_hero;
  const phantomSkor = isTemplate
    ? round2(phantom.phantom_hp + phantom.phantom_phys_dmg + phantom.phantom_mag_dmg)
    : 0;
  const phantomDmg  = isTemplate ? round2(phantom.phantom_phys_dmg + phantom.phantom_mag_dmg) : 0;
  const phantomHp   = isTemplate ? round2(phantom.phantom_hp) : 0;

  // ── DEF / PEN ──
  const totalDef = round2((fs.Physical_Def || 0) + (fs.Magic_Def || 0));
  const totalPen = round2((fs.Physical_Penetration || 0) + (fs.Magic_Penetration || 0));

  // ── SUMMON ──
  const summonDmg = round2(sim.summon?.totalDmg || 0);

  // ── DAMAGE BREAKDOWN (data-driven, tidak hardcode kondisi fraksi) ──
  const damageBreakdown = [
    { label: 'Basic ATK (Phys+Mag)', value: basicTotalDmg },
    { label: 'Skill DMG (Phys+Mag)', value: skillTotalDmg },
    { label: 'Ghost Phase',          value: ghostDmgTotal },
    { label: 'Phantom (Exorcist)',   value: phantomDmg },
    { label: 'Dragon DMG Flat',      value: fs.Dragon_DMG || 0 },
    { label: 'Total PEN',            value: totalPen },
    { label: 'Summon DMG',           value: summonDmg },
  ];
  const damageTotal = round2(damageBreakdown.reduce((s, r) => s + r.value, 0));

  // ── SUSTAIN BREAKDOWN (data-driven) ──
  const sustainBreakdown = [
    { label: 'Lifesteal Heal',      value: lsHealTotal },
    { label: 'Spell Vamp Heal',     value: svHealTotal },
    { label: 'Passive Heal',        value: passiveHeal },
    { label: 'Shield (buff+pasif)', value: round2(shieldVal + passiveShieldFlat) },
    { label: 'Skill Heal',          value: sim.skill.totalHealNow   || 0 },
    { label: 'Skill Shield',        value: sim.skill.totalShieldNow || 0 },
    { label: 'HP',                  value: fs.HP },
    { label: 'Phantom HP',          value: phantomHp },
  ];
  const sustainTotal = round2(sustainBreakdown.reduce((s, r) => s + r.value, 0));

  return {
    // dmg splits — dibutuhkan buildDmgSplitPanel
    basicPhysTotal, basicMagTotal,
    ghostPhysTotal, ghostMagTotal,
    skillPhysTotal, skillMagTotal,
    // totals per kategori — dibutuhkan buildDmgSplitPanel & buildUtilPanel
    basicTotalDmg, skillTotalDmg, ghostDmgTotal,
    // lifesteal detail — dibutuhkan buildUtilPanel
    baseLifesteal, lsHealBase, buffLsDmg, buffBasicHits, lsHealBuff, lsHealTotal,
    // sustain detail — dibutuhkan buildUtilPanel
    svHealTotal, manaTotal,
    shieldVal, passiveHeal, passiveShieldFlat,
    // phantom — dibutuhkan buildUtilPanel & buildTotalsPanel
    phantom, isTemplate, phantomSkor, phantomDmg, phantomHp,
    // def/pen — dibutuhkan buildUtilPanel
    totalDef, totalPen,
    // summon
    summonDmg,
    // breakdown arrays — dibutuhkan buildTotalsPanel (bar chart)
    damageBreakdown, damageTotal,
    sustainBreakdown, sustainTotal,
  };
}
```

**Verifikasi Tahap 1:**
- `score_utils.js` tidak mengandung HTML, `document`, atau `window` sama sekali
- Semua export lama (`computeScoreTotals`, `getScoreValue`, `shouldSkipCache`) masih ada dan tidak diubah
- Export baru yang ditambah: `calcSkorLengkap`, `resolveVal`
- `replicateCalcSkor` dan `calcDmgSplit` (private) tetap ada, tidak dihapus

---

## TAHAP 2 — Update `render_simulation.js` menjadi murni render

**Tujuan:** Hapus SEMUA kalkulasi dari `render_simulation.js`. Setelah tahap ini selesai, `render_simulation.js` tidak boleh punya fungsi kalkulasi apapun — hanya fungsi yang menghasilkan HTML.

### 2a. Update bagian [1] IMPORTS

```js
// render_simulation.js — SEBELUM
import { round2, splitEventsDmg } from '../engine/simulate_battle.js';

// render_simulation.js — SESUDAH
import { round2 }                            from '../engine/simulate_battle.js';
import { calcSkorLengkap, resolveVal }       from '../engine/score_utils.js';
```

> ⚠️ `splitEventsDmg` dihapus — dead import, tidak dipakai di render_simulation.js
> ⚠️ Tidak perlu import `calcDmgSplit` — sudah tergabung di dalam `calcSkorLengkap`

### 2b. Hapus definisi lokal `resolveVal`

Hapus seluruh blok ini (sekitar baris 77–79):
```js
// HAPUS ini
function resolveVal(v, si) {
  return Array.isArray(v) ? v[Math.min(si, v.length - 1)] : v;
}
```

### 2c. Hapus bagian [3] `calcDmgSplit`

Hapus seluruh blok ini (sekitar baris 94–136):
```js
// HAPUS ini
// ── [3] KALKULASI DMG (split phys/mag per tipe event) ────────────
function calcDmgSplit(sim) {
  // ... seluruh isi fungsi
}
```

### 2d. Hapus bagian [4] `calcSkor`

Hapus seluruh blok ini (sekitar baris 139–234):
```js
// HAPUS ini
// ── [4] KALKULASI SKOR ────────────────────────────────────────────
function calcSkor(sim, fs, dmg, si) {
  // ... seluruh isi fungsi
}
```

### 2e. Update signature `buildDmgSplitPanel`

Panel ini sebelumnya menerima `dmg` terpisah. Sekarang semua sudah ada di `skor`:

```js
// SEBELUM
function buildDmgSplitPanel(sim, dmg, skor) {
  const { basicPhysTotal, basicMagTotal, ghostPhysTotal, ghostMagTotal,
          skillPhysTotal, skillMagTotal } = dmg;
  const { basicTotalDmg, skillTotalDmg, ghostDmgTotal } = skor;

// SESUDAH
function buildDmgSplitPanel(sim, skor) {
  const { basicPhysTotal, basicMagTotal, ghostPhysTotal, ghostMagTotal,
          skillPhysTotal, skillMagTotal,
          basicTotalDmg, skillTotalDmg, ghostDmgTotal } = skor;
```

### 2f. Update signature `buildUtilPanel`

```js
// SEBELUM
function buildUtilPanel(sim, fs, skor, dmg) {
  const { lsHealTotal, lsHealBase, lsHealBuff, buffLsDmg, buffBasicHits,
          svHealTotal, passiveHeal, shieldVal, passiveShieldFlat,
          manaTotal, totalDef, totalPen, phantom, isTemplate, phantomSkor } = skor;
  const { basicTotalDmg, skillTotalDmg } = skor;

// SESUDAH
function buildUtilPanel(sim, fs, skor) {
  const { lsHealTotal, lsHealBase, lsHealBuff, buffLsDmg, buffBasicHits,
          svHealTotal, passiveHeal, shieldVal, passiveShieldFlat,
          manaTotal, totalDef, totalPen, phantom, isTemplate, phantomSkor,
          basicTotalDmg, skillTotalDmg } = skor;
```

### 2g. Update bagian [15] `renderSimulationHTML`

```js
// SEBELUM
export function renderSimulationHTML(sim) {
  const fs  = sim.finalStats;
  const bs  = sim.baseStats;
  const si  = (sim.hero.stars || 1) - 1;
  const bd  = sim.baseData;

  const dmg  = calcDmgSplit(sim);
  const skor = calcSkor(sim, fs, dmg, si);

  const heroCard      = buildHeroCard(sim);
  const statGrid      = buildStatGrid(sim, fs, bs);
  const formulaPanel  = buildFormulaPanel(sim, fs, bs);
  const buffSkillPanel = buildBuffSkillPanel(bd, si);
  const dmgSplitPanel = buildDmgSplitPanel(sim, dmg, skor);
  const utilPanel     = buildUtilPanel(sim, fs, skor, dmg);
  const skorBar       = buildTotalsPanel(sim, fs, skor);

// SESUDAH
export function renderSimulationHTML(sim) {
  const fs  = sim.finalStats;
  const bs  = sim.baseStats;
  const si  = (sim.hero.stars || 1) - 1;
  const bd  = sim.baseData;

  const skor = calcSkorLengkap(sim);   // ← satu-satunya kalkulasi, semua dari score_utils

  const heroCard      = buildHeroCard(sim);
  const statGrid      = buildStatGrid(sim, fs, bs);
  const formulaPanel  = buildFormulaPanel(sim, fs, bs);
  const buffSkillPanel = buildBuffSkillPanel(bd, si);
  const dmgSplitPanel = buildDmgSplitPanel(sim, skor);        // ← dmg dihapus
  const utilPanel     = buildUtilPanel(sim, fs, skor);         // ← dmg dihapus
  const skorBar       = buildTotalsPanel(sim, fs, skor);
```

**Verifikasi Tahap 2:**
- `render_simulation.js` tidak punya fungsi kalkulasi apapun (`calcDmgSplit`, `calcSkor`, `resolveVal` lokal sudah tidak ada)
- Satu-satunya "kalkulasi" di `render_simulation.js` adalah `const skor = calcSkorLengkap(sim)` — itu hanya pemanggilan, bukan definisi
- Semua panel [5]–[14] masih bisa akses semua property yang dibutuhkan via `skor.xxx`
- `renderSimulationHTML` masih di-export dan signature-nya tidak berubah

---

## TAHAP 3 — Verifikasi akhir

Jalankan semua perintah ini dan pastikan hasilnya sesuai:

```bash
# 1. Tidak ada duplikat rumus — hanya ada di score_utils
grep -n "Heal_Percent_HP" engine/score_utils.js ui/render_simulation.js
# Harusnya HANYA muncul di score_utils.js

# 2. Tidak ada dead import
grep -n "splitEventsDmg" ui/render_simulation.js
# Harusnya kosong

# 3. Tidak ada sisa kalkulasi di render_simulation
grep -n "^function calc" ui/render_simulation.js
# Harusnya kosong

# 4. Semua export score_utils masih ada
grep -n "^export" engine/score_utils.js
# Harus ada: shouldSkipCache, computeScoreTotals, getScoreValue, calcSkorLengkap, resolveVal

# 5. Worker tidak impor render_simulation
grep -rn "render_simulation" engine/
# Harus kosong

# 6. Tidak ada window/document/HTML di score_utils
grep -n "window\|document\|innerHTML\|style=" engine/score_utils.js
# Harus kosong

# 7. resolveVal tidak lagi didefinisikan lokal di render_simulation
grep -n "^function resolveVal" ui/render_simulation.js
# Harus kosong
```

---

## RINGKASAN PERUBAHAN

| File | Yang dihapus | Yang ditambah |
|------|-------------|---------------|
| `score_utils.js` | — | export `calcSkorLengkap`, export `resolveVal` |
| `render_simulation.js` | `calcDmgSplit`, `calcSkor`, `resolveVal` lokal, import `splitEventsDmg`, param `dmg` di 2 fungsi | import `calcSkorLengkap`, `resolveVal` dari `score_utils.js` |

**File yang TIDAK diubah:** `simulate_battle.js`, `comboengine.js`, `combo_worker.js`

---

## CATATAN PENTING

- `replicateCalcSkor` di `score_utils.js` **tetap ada dan tidak diubah** — masih dipakai `computeScoreTotals` yang dipakai worker
- `damageBreakdown` dan `sustainBreakdown` adalah array `{ label, value }` — kalau ada komponen scoring baru, tambah entry baru ke array, **jangan** tambah `if (fraksi === '...')` di dalam fungsi
- Kalau ada property di `skor` yang dibutuhkan panel tapi belum ada di return `calcSkorLengkap`, tambahkan ke return object — jangan ubah cara panel memanggilnya
- `round2` tetap diimpor di `render_simulation.js` karena masih dipakai di helper [2] seperti `diffStat`, `splitParts`, `pct`
