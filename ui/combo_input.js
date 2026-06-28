import { get_the_hero_list_from_the_merged_grid } from '../engine/capture.js';
import { runComboEngine, cancelComboEngine, verifyCacheIntegrity } from '../engine/comboengine.js';
import { DATABASE_BUFF }                           from '../data/buffs/database_buff.js';
import { initCache }                               from '../cache/cache_manager.js';
import {
  showWorkerDetailButton,
  startWorkerDetailLive,
  stopWorkerDetailLive,
  updateLiveProgress,
  refreshWorkerDetailModal,
  showProgressBar,
  updateProgressBar,
  hideProgressBar,
  showCancelButton,
  hideCancelButton,
} from './Progres_Worker.js';
import {
  renderScoreList,
  highlightComboSlots,
  notifyCacheIntegrityIssue,
  showCacheKeyDebug,
} from './combo_result.js';

window.__cancelComboEngine = cancelComboEngine;
window.bukaModalCari       = bukaModalCari;

// ── HELPER FUNCTIONS (copy dari utils.js) ────────────────────
function toArray(v) {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}
function buffImagePath(name) {
  return `./data/buffs/images/${name}.webp`;
}
function renderIcons(arr, opts = {}) {
  const { size = 20, dimmed = false } = opts;
  return toArray(arr).map(name => `
    <img src="${buffImagePath(name)}" alt="${name}" title="${name}"
      style="width:${size}px;height:${size}px;object-fit:cover;border-radius:3px;
        ${dimmed ? 'opacity:0.4;' : ''}vertical-align:middle;"
      onerror="this.outerHTML='<span style=&quot;font-size:0.7rem;color:#888;&quot;>${name}</span>'"
    />
  `).join('');
}

// ── STATE ─────────────────────────────────────────────────────
let heroWajibDipilih = [];

// ── INIT CACHE ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (window.ALL_HEROES) {
      await initCache(DATABASE_BUFF, window.ALL_HEROES);
    }
  } catch (err) {
    // Cache tidak tersedia, scoring akan selalu simulasi ulang
  }
});

// ── UI: UPDATE HERO (dipanggil dari luar) ─────────────────────
export function updateHeroUI(slotAssignments, gridRows, ALL_HEROES) {
  const heroList = get_the_hero_list_from_the_merged_grid(slotAssignments, gridRows, ALL_HEROES);
  renderHeroTable(heroList);
  renderHeroWajibPicker(heroList);
}

// ── UI: TABEL HERO (debug capture) ───────────────────────────
export function renderHeroTable(heroList) {
  let modal = document.getElementById('hero-table-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'hero-table-modal';
    modal.style.cssText = `
      display:none; position:fixed; inset:0; z-index:9999;
      background:rgba(0,0,0,0.75); align-items:center; justify-content:center;
    `;
    modal.innerHTML = `
      <div style="
        background:#0f1218; border:1px solid #d4af37; border-radius:10px;
        width:min(600px,95vw); max-height:80vh; display:flex; flex-direction:column;
        font-family:'Share Tech Mono',monospace;
        box-shadow:0 4px 32px rgba(0,0,0,0.6);
      ">
        <div style="padding:14px 18px; border-bottom:1px solid #333;
          display:flex; justify-content:space-between; align-items:center;">
          <span style="font-family:'Cinzel Decorative',serif; color:#d4af37; font-size:1rem;">◈ DAFTAR HERO DI GRID</span>
          <button id="hero-table-close-btn"
            style="background:transparent; color:#888; border:1px solid #444; border-radius:4px;
            padding:4px 12px; cursor:pointer; font-family:'Share Tech Mono',monospace;">✕ Tutup</button>
        </div>
        <div id="hero-table-body" style="overflow-y:auto; flex:1; padding:8px 0;"></div>
      </div>
    `;
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
    modal.querySelector('#hero-table-close-btn').addEventListener('click', () => {
      modal.style.display = 'none';
    });
    document.body.appendChild(modal);
  }

  const body = document.getElementById('hero-table-body');
  if (heroList.length === 0) { body.innerHTML = ''; return; }

  const starsStr = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
  const rows = heroList.map((h, i) => {
    return `
      <tr style="background: ${i % 2 === 0 ? '#1a1f29' : '#141820'}">
        <td style="padding:6px 12px; color:#999;">${h.slot ?? '-'}</td>
        <td style="padding:6px 12px; font-weight:bold;">${h.label ?? h.name}</td>
        <td style="padding:6px 12px; color:#d4af37;">${starsStr(h.stars)}</td>
        <td style="padding:6px 12px; font-size:0.78rem; color:#bbb;">
          <div style="display:flex;flex-wrap:wrap;gap:3px;align-items:center;">
            ${renderIcons(h.role)}
            <span style="color:#444;margin:0 2px;">•</span>
            ${renderIcons(h.fraksi)}
          </div>
        </td>
        <td style="padding:6px 12px; font-size:0.78rem; color:#e91e8c;">
          <div style="display:flex;flex-wrap:wrap;gap:3px;align-items:center;">
            ${[...toArray(h.blessingRole), ...toArray(h.blessingFraksi)].length
              ? renderIcons([...toArray(h.blessingRole), ...toArray(h.blessingFraksi)])
              : '<span style="color:#444;">-</span>'}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  body.innerHTML = `
    <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
      <thead>
        <tr style="background:#0f1218; color:#d4af37; text-align:left; border-bottom:1px solid #333;">
          <th style="padding:8px 12px;">Slot</th>
          <th style="padding:8px 12px;">Hero</th>
          <th style="padding:8px 12px;">Bintang</th>
          <th style="padding:8px 12px;">Role • Fraksi</th>
          <th style="padding:8px 12px;">Blessing</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// ── UI: HERO WAJIB PICKER ─────────────────────────────────────
function renderHeroWajibPicker(heroList) {
  heroWajibDipilih = [];

  const container = document.getElementById('hero-wajib-picker');
  if (!container) return;

  container.innerHTML = `<div style="font-size:0.8rem; color:#d4af37; margin-bottom:6px;">◈ HERO WAJIB (opsional)</div>`;

  if (heroList.length === 0) {
    container.innerHTML += `<div style="font-size:0.75rem; color:#666;">— isi grid dulu —</div>`;
    return;
  }

  const grid = document.createElement('div');
  grid.style.cssText = 'display:flex; flex-wrap:wrap; gap:6px;';
  container.appendChild(grid);

  const sorted = [...heroList].sort((a, b) =>
    (a.label ?? a.name).localeCompare(b.label ?? b.name)
  );

  sorted.forEach(hero => {
    const stars      = '★'.repeat(hero.stars) + '☆'.repeat(3 - hero.stars);
    const roleStr    = toArray(hero.role).join(', ')       || '-';
    const fraksiStr  = toArray(hero.fraksi).join(', ')     || '-';
    const extraRole  = toArray(hero.roleExtra).join(', ');
    const extraFraksi = toArray(hero.fraksiExtra).join(', ');
    const blessRole  = toArray(hero.blessingRole).join(', ');
    const blessFraksi = toArray(hero.blessingFraksi).join(', ');

    const card = document.createElement('div');
    card.style.cssText = `
      width:52px; height:52px; border-radius:6px; cursor:pointer;
      border:2px dashed rgba(255,255,255,0.15); position:relative;
      overflow:hidden; transition:all 0.2s; flex-shrink:0;
    `;
    card.title = [
      `${hero.label ?? hero.name} ${stars}`,
      `Role: ${roleStr}`,
      `Fraksi: ${fraksiStr}`,
      extraRole   ? `Extra Role: ${extraRole}`       : '',
      extraFraksi ? `Extra Fraksi: ${extraFraksi}`   : '',
      blessRole   ? `Blessing Role: ${blessRole}`     : '',
      blessFraksi ? `Blessing Fraksi: ${blessFraksi}` : '',
    ].filter(v => v).join('\n');

    card.innerHTML = `
      <img src="${window.heroImagePath(hero.name)}" 
           style="width:100%;height:100%;object-fit:cover;display:block;"
           onerror="this.style.display='none'">
      <div style="position:absolute;bottom:0;left:0;right:0;
        background:rgba(0,0,0,0.6);font-size:0.5rem;color:#d4af37;
        text-align:center;padding:1px 0;">${stars}</div>
    `;

    let selected = false;
    card.addEventListener('click', () => {
      selected = !selected;
      card.style.border = selected ? '2px solid #d4af37' : '2px dashed rgba(255,255,255,0.15)';
      card.style.boxShadow = selected ? '0 0 8px rgba(212,175,55,0.5)' : '';
      if (selected) {
        heroWajibDipilih.push(hero);
      } else {
        heroWajibDipilih = heroWajibDipilih.filter(
          h => `${h.name}|${h.stars}|${h.label}` !== `${hero.name}|${hero.stars}|${hero.label}`
        );
      }
      const el = document.getElementById('wajib-count');
      if (el) el.textContent = `${heroWajibDipilih.length} hero wajib dipilih`;
    });

    grid.appendChild(card);
  });
}

// ── UI: MODAL CARI ────────────────────────────────────────────
export function bukaModalCari() {
  let modal = document.getElementById('cari-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'cari-modal';
    modal.style.cssText = `
      display:none; position:fixed; inset:0; z-index:9999;
      background:rgba(0,0,0,0.75);
      align-items:center; justify-content:center;
    `;
    modal.innerHTML = `
      <div style="
        background:#0f1218; border:1px solid #d4af37; border-radius:10px;
        width:min(480px, 95vw); max-height:90vh;
        display:flex; flex-direction:column;
        font-family:'Share Tech Mono',monospace;
        box-shadow:0 4px 32px rgba(0,0,0,0.6);
      ">
        <div style="padding:14px 18px; border-bottom:1px solid #333;
          font-family:'Cinzel Decorative',serif; color:#d4af37; font-size:1rem;">
          ◈ CARI COMBO
        </div>
        <div id="cari-modal-body" style="
          padding:16px 18px; overflow-y:auto; flex:1;
          display:flex; flex-direction:column; gap:10px;
        ">
          <select id="user-slot-level" style="
            background:#1a1f29; color:#d4af37; border:1px solid #333;
            border-radius:4px; padding:6px 10px;
            font-family:'Share Tech Mono',monospace; font-size:0.85rem; cursor:pointer;
          ">
            ${Array.from({ length: 12 }, (_, i) =>
              `<option value="${i + 1}">${i + 1} Slot</option>`
            ).join('')}
          </select>
          <select id="user-score-mode" style="
            background:#1a1f29; color:#d4af37; border:1px solid #333;
            border-radius:4px; padding:6px 10px;
            font-family:'Share Tech Mono',monospace; font-size:0.85rem; cursor:pointer;
          ">
            <option value="combined">Damage + Sustain</option>
            <option value="damage">Damage Only</option>
            <option value="sustain">Sustain Only</option>
          </select>
          <div id="hero-wajib-picker" style="
            background:#0f1218; border:1px solid #333; border-radius:6px;
            padding:10px; max-height:220px; overflow-y:auto; flex-shrink:0;
          ">
            <div style="font-size:0.8rem; color:#d4af37; margin-bottom:6px;">◈ HERO WAJIB (opsional)</div>
            <div style="font-size:0.75rem; color:#666;">— isi grid dulu —</div>
          </div>
          <div id="wajib-count" style="font-size:0.75rem; color:#888;">0 hero wajib dipilih</div>
          <div id="cari-modal-queue-area"></div>
        </div>
        <div style="padding:12px 18px; border-top:1px solid #333;
          display:flex; justify-content:flex-end; gap:8px;">
          <button id="btn-tutup-cari" style="
            background:transparent; color:#888; border:1px solid #444;
            border-radius:4px; padding:6px 16px; cursor:pointer;
            font-family:'Share Tech Mono',monospace; font-size:0.85rem;
          ">Tutup</button>
          <button id="btn-cek-cache" style="
            background:transparent; color:#3498db; border:1px solid #3498db;
            border-radius:4px; padding:6px 14px; cursor:pointer;
            font-family:'Share Tech Mono',monospace; font-size:0.85rem;
          ">🔑 Cek Cache Key</button>
          <button id="btn-jalankan-cari" style="
            background:#d4af37; color:#0f1218; border:none;
            border-radius:4px; padding:6px 16px; cursor:pointer;
            font-family:'Share Tech Mono',monospace; font-size:0.85rem; font-weight:bold;
          ">🔍 Jalankan</button>
        </div>
      </div>
    `;

    // Event listener tombol — tidak ada onclick hardcode
    modal.querySelector('#btn-tutup-cari').addEventListener('click', tutupModalCari);
    modal.querySelector('#btn-cek-cache').addEventListener('click', showCacheKeyDebug);
    modal.querySelector('#btn-jalankan-cari').addEventListener('click', jalankanCari);
    modal.addEventListener('click', (e) => { if (e.target === modal) tutupModalCari(); });

    document.body.appendChild(modal);
  }

  // Ambil heroList dari grid
  const heroList = get_the_hero_list_from_the_merged_grid(
    window.slotAssignments,
    window.GRID_ROWS,
    window.ALL_HEROES
  );

  renderHeroWajibPicker(heroList);

  // Render input buff aktif ke dalam #cari-modal-queue-area
  const queueArea = document.getElementById('cari-modal-queue-area');
  if (queueArea) {
    queueArea.innerHTML = '';
    Object.values(DATABASE_BUFF).forEach(buff => {
      if (typeof buff.renderInputUI === 'function') {
        buff.renderInputUI(queueArea, heroList);
      }
    });
  }

  modal.style.display = 'flex';
}

function tutupModalCari() {
  const modal = document.getElementById('cari-modal');
  if (modal) modal.style.display = 'none';
}

function jalankanCari() {
  let valid = true;
  Object.values(DATABASE_BUFF).forEach(buff => {
    if (typeof buff.collectInput === 'function') {
      if (!buff.collectInput()) valid = false;
    }
  });
  if (!valid) return;

  tutupModalCari();
  CARI();
}

// ════════════════════════════════════════════════════════════════
// CARI — Entry point utama saat user klik "🔍 Cari Combo"
//
// Alur:
//   1. Validasi input (slotLevel, scoreMode, heroList)
//   2. Sinkronisasi hero wajib dengan heroList terbaru dari grid
//   3. Batalkan run engine sebelumnya (jika masih berjalan)
//   4. Jalankan engine (runComboEngine) di background worker
//      a. Reset state live progress
//      b. Tiap progress callback → update UI sementara
//      c. Setelah selesai → render hasil final + verifikasi cache
// ════════════════════════════════════════════════════════════════
async function CARI() {

  // ── 1. Baca & validasi input user ───────────────────────────
  const selectSlot = document.getElementById('user-slot-level');
  const slotLevel  = selectSlot ? parseInt(selectSlot.value) : null;
  if (!slotLevel || slotLevel < 1) {
    alert('Pilih level slot yang valid');
    return;
  }

  const selectScore = document.getElementById('user-score-mode');
  const scoreMode   = selectScore ? selectScore.value : 'combined';

  const heroList = get_the_hero_list_from_the_merged_grid(
    window.slotAssignments,
    window.GRID_ROWS,
    window.ALL_HEROES
  );

  if (heroList.length === 0) {
    alert('Grid kosong! Tambahkan hero dulu.');
    return;
  }

  if (heroList.length < slotLevel) {
    alert('Pool tidak cukup untuk level yang dipilih');
    return;
  }

  // ── 2. Sinkronisasi hero wajib ───────────────────────────────
  const wajibKeys  = new Set(heroWajibDipilih.map(h => `${h.name}|${h.stars}|${h.label}`));
  heroWajibDipilih = heroList.filter(h => wajibKeys.has(`${h.name}|${h.stars}|${h.label}`));

  if (heroWajibDipilih.length >= slotLevel) {
    alert(`Hero wajib (${heroWajibDipilih.length}) sudah memenuhi atau melebihi slotLevel (${slotLevel})`);
    return;
  }

  // ── 3. Batalkan run engine sebelumnya ────────────────────────
  cancelComboEngine();

  // ── 4. Jalankan engine ───────────────────────────────────────
  try {

    // 4a. Reset state live progress setiap run baru
    window.__liveProgress = {
      slotTersisa:    slotLevel - heroWajibDipilih.length,
      poolSize:       heroList.length - heroWajibDipilih.length,
      heroWajibCount: heroWajibDipilih.length,
      totalKombinasi: 0,
      workerCount:    navigator.hardwareConcurrency ?? 4,
      evaluated:      0,
      pct:            0,
      bestSkor:       null,
      scoreMode,
      entryBaru:      0,
      stats:          { hit: 0, miss: 0, skip: 0 },
    };
    window.__lastRunSummary = null;
    window.__progressLog    = [];

    showProgressBar();
    showCancelButton();
    showWorkerDetailButton();
    startWorkerDetailLive();

    // 4b. Jalankan engine di background worker
    const comboResult = await runComboEngine(
      heroList,
      slotLevel,
      scoreMode,
      window.ALL_HEROES,
      heroWajibDipilih,

      // 4c. Progress callback — dipanggil tiap worker kirim update
      ({ pct, bestSkor, evaluated, selectedHeroes, simResults }) => {
        updateLiveProgress({ pct, bestSkor, evaluated, scoreMode });
        updateProgressBar(pct, bestSkor);

        if (selectedHeroes) {
          renderScoreList(selectedHeroes, simResults);
          highlightComboSlots(selectedHeroes);
          if (typeof window.autoFillSmartPlacementPreview === 'function') {
            window.autoFillSmartPlacementPreview(selectedHeroes);
          }
        }
      }
    );

    // 4d. Engine selesai — render hasil final
    stopWorkerDetailLive();
    hideProgressBar();
    hideCancelButton();
    renderScoreList(comboResult.selectedHeroes, comboResult.simResults);
    highlightComboSlots(comboResult.selectedHeroes);

    // Simpan supaya showCacheKeyDebug() bisa bandingin cache saat cari vs final
    window.__lastComboResult = comboResult;

    verifyCacheIntegrity(comboResult.selectedHeroes, comboResult.simResults)
      .then(mismatches => {
        if (mismatches.length === 0) return;
        notifyCacheIntegrityIssue(mismatches);
      })
      .catch(() => {});

    if (typeof window.autoFillSmartPlacementPreview === 'function') {
      window.autoFillSmartPlacementPreview(comboResult.selectedHeroes);
    }

    showWorkerDetailButton();
    refreshWorkerDetailModal();

  } catch (err) {
    stopWorkerDetailLive();
    hideProgressBar();
    hideCancelButton();

    if (err.name !== 'AbortError') {
      alert(`Combo Engine Error: ${err.message}`);
    }

    refreshWorkerDetailModal();
  }
}
