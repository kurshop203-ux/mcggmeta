import { get_the_hero_list_from_the_merged_grid } from '../engine/capture.js';
import { simulateBattle }                          from '../engine/simulate_battle.js';
import { renderSimulationHTML }                    from './render_simulation.js';
import { runComboEngine, verifyCacheIntegrity, cancelComboEngine } from '../engine/comboengine.js';
import { DATABASE_BUFF }                           from '../data/buffs/database_buff.js';
import { initCache, buildCacheKey }                from '../cache/cache_manager.js';
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

// Expose cancelComboEngine ke window supaya tombol batal
// di Progres_Worker.js bisa panggil tanpa import comboengine.js lagi
window.__cancelComboEngine = cancelComboEngine;


export function updateHeroUI(slotAssignments, gridRows, ALL_HEROES) {
  const heroList = get_the_hero_list_from_the_merged_grid(slotAssignments, gridRows, ALL_HEROES);
  renderHeroTable(heroList);
  renderHeroWajibPicker(heroList);
}
export function renderHeroTable(heroList) {
  let container = document.getElementById('hero-table-wrap');
  if (!container) {
    container = document.createElement('div');
    container.id = 'hero-table-wrap';
    container.style.cssText = `
  width: 100%; max-width: 800px;
  margin-top: 24px;
  font-family: 'Share Tech Mono', monospace;
`;
container.style.display = 'none';
    const gridWrap = document.getElementById('global-grid-wrap');
if (gridWrap) gridWrap.insertAdjacentElement('beforebegin', container);
  }

  if (heroList.length === 0) { container.innerHTML = ''; return; }

  const starsStr = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);

  const rows = heroList.map((h, i) => `
    <tr style="background: ${i % 2 === 0 ? '#1a1f29' : '#141820'}">
      <td style="padding:6px 12px; color:#999;">${h.slot ?? '-'}</td>
      <td style="padding:6px 12px; font-weight:bold;">${h.label ?? h.name}</td>
      <td style="padding:6px 12px; color:#d4af37;">${starsStr(h.stars)}</td>
      <td style="padding:6px 12px; font-size:0.78rem; color:#bbb;">
        ${toArray(h.role).join(', ') || '-'} • ${toArray(h.fraksi).join(', ') || '-'}
      </td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div style="font-family:'Cinzel Decorative',serif; color:#d4af37; font-size:1rem; margin-bottom:10px;">
      ◈ DAFTAR HERO DI GRID
    </div>
    <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
      <thead>
        <tr style="background:#0f1218; color:#d4af37; text-align:left; border-bottom: 1px solid #333;">
          <th style="padding:8px 12px;">Slot</th>
          <th style="padding:8px 12px;">Hero</th>
          <th style="padding:8px 12px;">Bintang</th>
          <th style="padding:8px 12px;">Role • Fraksi</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}
let heroWajibDipilih = []; 
export function renderHeroWajibPicker(heroList) {
  heroWajibDipilih = [];

  const container = document.getElementById('hero-wajib-picker');
  if (!container) return;

  container.innerHTML = `
    <div style="font-size:0.8rem; color:#d4af37; margin-bottom:6px;">
      ◈ HERO WAJIB (opsional)
    </div>
  `;

  if (heroList.length === 0) {
    container.innerHTML += `
      <div style="font-size:0.75rem; color:#666;">— isi grid dulu —</div>
    `;
    return;
  }

  // ── Search box ────────────────────────────────────────────
  const searchBox = document.createElement('input');
  searchBox.type = 'text';
  searchBox.placeholder = '🔍 cari nama / role / fraksi...';
  searchBox.style.cssText = `
    width:100%; box-sizing:border-box; margin-bottom:8px;
    background:#1a1f29; color:#d4af37; border:1px solid #333;
    border-radius:4px; padding:5px 8px;
    font-family:'Share Tech Mono',monospace; font-size:0.78rem;
  `;
  container.appendChild(searchBox);

  // ── Wrapper list (biar gampang di-filter terpisah dari search box) ──
  const listWrap = document.createElement('div');
  container.appendChild(listWrap);

  // Sort alfabetis biar predictable
  const sorted = [...heroList].sort((a, b) =>
    (a.label ?? a.name).localeCompare(b.label ?? b.name)
  );

  sorted.forEach(hero => {
    const stars = '★'.repeat(hero.stars) + '☆'.repeat(3 - hero.stars);
    const roleStr  = toArray(hero.role).join(', ');
    const fraksiStr = toArray(hero.fraksi).join(', ');
    const searchKey = `${hero.label ?? hero.name} ${roleStr} ${fraksiStr}`.toLowerCase();

    const row = document.createElement('label');
    row.dataset.searchKey = searchKey;
    row.style.cssText = `
      display:flex; align-items:center; gap:8px;
      padding:4px 6px; cursor:pointer; font-size:0.8rem;
      border-radius:4px; margin-bottom:2px;
    `;
    row.innerHTML = `
      <input type="checkbox" style="accent-color:#d4af37;">
      <span>${hero.label ?? hero.name}</span>
      <span style="color:#d4af37; font-size:0.7rem;">${stars}</span>
      <span style="color:#666; font-size:0.7rem;">${roleStr} • ${fraksiStr}</span>
    `;

    row.querySelector('input').addEventListener('change', (e) => {
      row.style.background = e.target.checked ? '#2a2510' : '';
      if (e.target.checked) {
        heroWajibDipilih.push(hero);
      } else {
        heroWajibDipilih = heroWajibDipilih.filter(
          h => `${h.name}|${h.stars}|${h.label}` !== `${hero.name}|${hero.stars}|${hero.label}`
        );
      }
      const el = document.getElementById('wajib-count');
      if (el) el.textContent = `${heroWajibDipilih.length} hero wajib dipilih`;
    });

    listWrap.appendChild(row);
  });

  // ── Filter logic ──────────────────────────────────────────
  searchBox.addEventListener('input', () => {
    const q = searchBox.value.trim().toLowerCase();
    listWrap.querySelectorAll('label').forEach(row => {
      row.style.display = row.dataset.searchKey.includes(q) ? 'flex' : 'none';
    });
  });
}
function bukaModalCari() {
  // Buat modal kalau belum ada
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
  padding:10px; max-height:220px; overflow-y:auto;
  flex-shrink:0;
">
            <div style="font-size:0.8rem; color:#d4af37; margin-bottom:6px;">◈ HERO WAJIB (opsional)</div>
            <div style="font-size:0.75rem; color:#666;">— isi grid dulu —</div>
          </div>
          <div id="wajib-count" style="font-size:0.75rem; color:#888;">0 hero wajib dipilih</div>
          <div id="cari-modal-queue-area"></div>
        </div>
        <div style="padding:12px 18px; border-top:1px solid #333;
          display:flex; justify-content:flex-end; gap:8px;">
          <button onclick="tutupModalCari()" style="
            background:transparent; color:#888; border:1px solid #444;
            border-radius:4px; padding:6px 16px; cursor:pointer;
            font-family:'Share Tech Mono',monospace; font-size:0.85rem;
          ">Tutup</button>
          <button onclick="jalankanCari()" style="
            background:#d4af37; color:#0f1218; border:none;
            border-radius:4px; padding:6px 16px; cursor:pointer;
            font-family:'Share Tech Mono',monospace; font-size:0.85rem; font-weight:bold;
          ">🔍 Jalankan</button>
        </div>
      </div>
    `;
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
  // Kumpulkan semua input buff, validasi
  let valid = true;
  Object.values(DATABASE_BUFF).forEach(buff => {
    if (typeof buff.collectInput === 'function') {
      if (!buff.collectInput()) valid = false;
    }
  });
  if (!valid) return; // ada input wajib yang belum diisi

  tutupModalCari();
  CARI();
}

window.bukaModalCari  = bukaModalCari;
window.tutupModalCari = tutupModalCari;
window.jalankanCari   = jalankanCari;
window.updateHeroUI = updateHeroUI;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (window.ALL_HEROES) {
      await initCache(DATABASE_BUFF, window.ALL_HEROES);
    }
  } catch (err) {
    // Cache tidak tersedia, scoring akan selalu simulasi ulang
  }
});
// ════════════════════════════════════════════════════════════════
// CARI — Entry point utama saat user klik "🔍 Cari Combo"
//
// Alur:
//   1. Validasi input (slotLevel, scoreMode, heroList)
//   2. Sinkronisasi hero wajib dengan heroList terbaru dari grid
//   3. Dispatch event agar modul lain bisa daftarkan modal konfirmasi
//   4. Batalkan run engine sebelumnya (jika masih berjalan)
//   5. Kumpulkan input buff (collectInput), lalu:
//      a. Reset state live progress
//      b. Jalankan engine (runComboEngine) di background worker
//      c. Tiap progress callback → update UI sementara
//      d. Setelah selesai → render hasil final + verifikasi cache
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
 
  // Ambil heroList dari grid (sudah di-merge oleh capture.js)
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

    // Tampilkan progress bar & tombol detail worker
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
window.CARI = CARI;

// ── NOTIFIKASI INTEGRITAS CACHE ───────────────────────────────
function notifyCacheIntegrityIssue(mismatches) {
  let banner = document.getElementById('cache-integrity-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'cache-integrity-banner';
    banner.style.cssText = `
      position: fixed; bottom: 16px; right: 16px; z-index: 9999;
      background: #2a1414; border: 1px solid #e74c3c; border-radius: 6px;
      color: #f5b7b1; font-family: 'Share Tech Mono', monospace;
      font-size: 0.78rem; padding: 10px 14px; max-width: 320px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.4); cursor: pointer;
    `;
    banner.title = 'Klik untuk tutup';
    banner.onclick = () => banner.remove();
    document.body.appendChild(banner);
  }
  banner.innerHTML = `
    ⚠ Cache tidak akurat untuk ${mismatches.length} hero.<br>
    Kemungkinan ada bug di buildCacheKey / profil buff.<br>
    Detail lengkap ada di console (F12).
  `;
}
function toArray(v) {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}
// ── UI: SIDEBAR ───────────────────────────────────────────────
function getHeroImagePath(name) {
  return window.heroImagePath(name);
}
function renderScoreList(heroes, simResults = {}) {
  const sidebar = document.querySelector('.sidebar-right');
  if (!sidebar) return;

  const old = document.getElementById('score-list');
  if (old) old.remove();

  if (heroes.length === 0) return;

  const container = document.createElement('div');
  container.id = 'score-list';
  container.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
    flex: 1;
    margin-top: 8px;
  `;

  heroes.forEach(hero => {
  const sim          = simResults[hero.label ?? hero.name]; // ← tambah
  const damageTotal  = sim?.damageTotal  ?? 0;              // ← tambah
  const sustainTotal = sim?.sustainTotal ?? 0;              // ← tambah

  const buffCount = Object.keys(hero.buffs || {}).length;
const hasSinergy = [
  'neobeasts_tier',
  'enchantedtales_tier',
  'astropower_tier',
  'dragoncaller_tier',
  'heartbond_status',
  'exorcist_phantom',
  'emberlord_urutan',
].some(key => hero[key] !== undefined);
    const stars        = '★'.repeat(hero.stars) + '☆'.repeat(3 - hero.stars);
    const isEmberlord  = toArray(hero.fraksi).includes('Emberlord') && hero.emberlord_urutan !== undefined;
    const isSelamat    = isEmberlord && hero.emberlord_waktu_mati >= 40;
    const emberlordBadge = isEmberlord
      ? isSelamat
        ? `<div style="font-size:0.7rem; color:#27ae60; margin-top:2px;">🛡 Selamat (ke-${hero.emberlord_urutan}/${hero.emberlord_jumlah_unit})</div>`
        : `<div style="font-size:0.7rem; color:#e74c3c; margin-top:2px;">💀 Mati ke-${hero.emberlord_urutan}/${hero.emberlord_jumlah_unit} · ${Math.round(hero.emberlord_waktu_mati * 100) / 100}s</div>`
      : '';

    const card = document.createElement('div');
    card.style.cssText = `
      background: #1a1f29;
      border: 1px solid ${isEmberlord ? '#b7410e66' : '#333'};
      border-radius: 6px;
      padding: 8px 10px;
      cursor: pointer;
      transition: border-color 0.2s;
    `;
    card.innerHTML = `
  <div style="display:flex; gap:8px; align-items:center; margin-bottom:6px;">
    <img 
      src="${getHeroImagePath(hero.name)}" 
      style="width:40px; height:40px; border-radius:6px; object-fit:cover; flex-shrink:0;"
      onerror="this.style.display='none'"
    />
    <div style="flex:1; min-width:0;">
      <div style="font-weight:bold; font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
        ${hero.label ?? hero.name}
      </div>
      <div style="font-size:0.7rem; color:#999; font-family:'Share Tech Mono',monospace;">
        ${stars} · ${toArray(hero.role).join(', ') || '-'}
      </div>
    </div>
    <div style="font-size:0.7rem; color:#d4af37;">▶</div>
  </div>
  <div style="display:flex; gap:10px; margin-bottom:4px;">
    <div style="font-size:0.7rem; color:#e74c3c;">⚔ ${Math.round(damageTotal).toLocaleString('id-ID')}</div>
    <div style="font-size:0.7rem; color:#27ae60;">🛡 ${Math.round(sustainTotal).toLocaleString('id-ID')}</div>
  </div>
  <div style="font-size:0.7rem; color:${buffCount > 0 ? '#27ae60' : '#666'};">
    ${(buffCount > 0 || hasSinergy) ? `✦ ${buffCount} buff aktif` : '— tidak ada buff'}
  </div>
  ${emberlordBadge}
`;

    card.onmouseenter = () => card.style.borderColor = '#d4af37';
    card.onmouseleave = () => card.style.borderColor = '#333';
    card.onclick = () => {
  const sim = simResults[hero.label ?? hero.name];
  showBuffDetail(sim?.hero ?? hero, sim);
};

    container.appendChild(card);
  });

  sidebar.appendChild(container);
}
// ── UI: MODAL DETAIL ──────────────────────────────────────────
function showBuffDetail(hero, simCached = null) {
  const modal = document.getElementById('detail-modal');
  const content = document.getElementById('detail-modal-content');
  if (!modal || !content) return;

  content.style.maxHeight = '80vh';
  content.style.overflowY = 'auto';
  content.style.paddingRight = '6px';

  const stars = '★'.repeat(hero.stars) + '☆'.repeat(3 - hero.stars);

  // Normalisasi fraksi/role jadi array supaya semua panel bisa .includes()
  hero.fraksi = toArray(hero.fraksi);
  hero.role   = toArray(hero.role);

  content.innerHTML = `
    <h3 style="margin-top:0;">${hero.label ?? hero.name}</h3>
    <div style="font-size:0.8rem; color:#999; margin-bottom:12px;">
      ${stars} · ${hero.role.join(', ') || '-'} · ${hero.fraksi.join(', ') || '-'}
    </div>
  `;

  const baseData = window.ALL_HEROES?.[hero.name];
  if (baseData) {
    // SESUDAH — hapus baris const durasi saja, sisanya tidak berubah
Object.values(DATABASE_BUFF).forEach(buff => {
  if (typeof buff.renderPanel === 'function') {
    const html = buff.renderPanel(hero);
    content.innerHTML += html;
  }
});
    // Pakai sim cache dari comboengine kalau ada, hindari simulate ulang
    const sim = simCached ?? simulateBattle(hero, baseData);
    content.innerHTML += renderSimulationHTML(sim);
  } else {
    content.innerHTML += `<div style="color:#666; font-size:0.8rem; margin-top:10px;">⚠ Data base stat untuk "${hero.name}" tidak ditemukan di ALL_HEROES.</div>`;
  }

  modal.style.display = 'flex';
}
function highlightComboSlots(selectedHeroes) {
  // Ambil semua slot dari hero terpilih langsung dari slotnya
  const slotNumbers = new Set();
  selectedHeroes.forEach(hero => {
    String(hero.slot).split('/').forEach(s => slotNumbers.add(Number(s)));
  });

  // Reset semua slot
  document.querySelectorAll('.grid-slot-placeholder').forEach(el => {
    el.style.opacity = '1';
  });

  // Redup slot yang tidak masuk kombo
  let globalIndex = 0;
  window.GRID_ROWS.forEach((rowInfo, rowIndex) => {
    for (let c = 0; c < rowInfo.count; c++) {
      globalIndex++;
      const el = document.getElementById(`slot-${rowIndex}-${c}`);
      if (!el) continue;
      el.style.opacity = slotNumbers.has(globalIndex) ? '1' : '0.3';
    }
  });
}