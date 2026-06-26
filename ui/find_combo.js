import { get_the_hero_list_from_the_merged_grid } from '../engine/capture.js';
import { simulateBattle }                          from '../engine/simulate_battle.js';
import { renderSimulationHTML }                    from './render_simulation.js';
import { runComboEngine, verifyCacheIntegrity, cancelComboEngine } from '../engine/comboengine.js';
import { DATABASE_BUFF }                           from '../data/buffs/database_buff.js';
import { initCache, buildCacheKey }                from '../cache/cache_manager.js';
// Ambil daftar hero hasil merge Ini panggil fungsi dari capture.js
export function updateHeroUI(slotAssignments, gridRows, ALL_HEROES) {
  const heroList = get_the_hero_list_from_the_merged_grid(slotAssignments, gridRows, ALL_HEROES);
  renderHeroTable(heroList);
  renderHeroWajibPicker(heroList);
}
// Menampilkan tabel di #hero-table-wrap berisi kolom Slot, Hero, Bintang (★), dan Role • Fraksi untuk setiap hero yang ada di grid.
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
//  variabel global di file ini, nyimpen hero yang dicentang user
let heroWajibDipilih = []; 
// Membuat checkbox list di #hero-wajib-picker supaya user bisa menandai hero mana yang wajib ikut dalam kombo nanti (dipakai di tahap pencarian kombo selanjutnya, lewat comboengine.js)
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

  heroList.forEach(hero => {
    const stars = '★'.repeat(hero.stars) + '☆'.repeat(3 - hero.stars);
    const row   = document.createElement('label');
    row.style.cssText = `
      display:flex; align-items:center; gap:8px;
      padding:4px 6px; cursor:pointer; font-size:0.8rem;
      border-radius:4px; margin-bottom:2px;
    `;
    row.innerHTML = `
      <input type="checkbox" style="accent-color:#d4af37;">
      <span>${hero.label ?? hero.name}</span>
      <span style="color:#d4af37; font-size:0.7rem;">${stars}</span>
      <span style="color:#666; font-size:0.7rem;">${toArray(hero.role).join('/')}</span>
    `;

    row.querySelector('input').addEventListener('change', (e) => {
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

    container.appendChild(row);
  });
}
// Bagian ini ngurusin input dari user — hero mana yang wajib masuk, berapa slot, dan mode scoring — sebelum tombol CARI ditekan.
function renderComboUI() {
  // Cari sidebar kanan sebagai container
  const sidebar = document.querySelector('.sidebar-right');
  if (!sidebar) return;

  // Buat wrapper utama
  const wrap = document.createElement('div');
  wrap.id = 'combo-ui-wrap';
  wrap.style.cssText = `display:flex; flex-direction:column; gap:8px;`;

  wrap.innerHTML = `
    <!-- Slot Level -->
    <select id="user-slot-level" style="
      background:#1a1f29; color:#d4af37;
      border:1px solid #333; border-radius:4px;
      padding:6px 10px;
      font-family:'Share Tech Mono',monospace;
      font-size:0.85rem; cursor:pointer;
    ">
      ${Array.from({length:12}, (_,i) =>
        `<option value="${i+1}">${i+1} Slot</option>`
      ).join('')}
    </select>

    <!-- Score Mode -->
    <select id="user-score-mode" style="
      background:#1a1f29; color:#d4af37;
      border:1px solid #333; border-radius:4px;
      padding:6px 10px;
      font-family:'Share Tech Mono',monospace;
      font-size:0.85rem; cursor:pointer;
    ">
      <option value="combined">Damage + Sustain</option>
      <option value="damage">Damage Only</option>
      <option value="sustain">Sustain Only</option>
    </select>

    <!-- Hero Wajib Picker -->
    <div id="hero-wajib-picker" style="
      background:#0f1218;
      border:1px solid #333; border-radius:6px;
      padding:10px; max-height:200px; overflow-y:auto;
    ">
      <div style="font-size:0.8rem; color:#d4af37; margin-bottom:6px;">
        ◈ HERO WAJIB (opsional)
      </div>
      <div style="font-size:0.75rem; color:#666;">
        — isi grid dulu —
      </div>
    </div>

    <!-- Counter hero wajib -->
    <div id="wajib-count" style="font-size:0.75rem; color:#888;">
      0 hero wajib dipilih
    </div>
  `;

  // Taruh di paling atas sidebar kanan, sebelum elemen lain
  sidebar.insertBefore(wrap, sidebar.firstChild);
}
// dipanggil otomatis begitu halaman selesai load.
document.addEventListener('DOMContentLoaded', async () => {
  renderComboUI();

  try {
    if (window.ALL_HEROES) {
      await initCache(DATABASE_BUFF, window.ALL_HEROES);
    }
  } catch (err) {
    // Cache tidak tersedia, scoring akan selalu simulasi ulang
  }

});
// Baca Input User -  Jalankan Engine (di dalam callback)
async function CARI() {
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
    alert('pool tidak cukup untuk level yang dipilih');
    return;
  }
const wajibKeys = new Set(heroWajibDipilih.map(h => `${h.name}|${h.stars}|${h.label}`));
heroWajibDipilih = heroList.filter(h => wajibKeys.has(`${h.name}|${h.stars}|${h.label}`));
  // Validasi hero wajib
  if (heroWajibDipilih.length >= slotLevel) {
    alert(`Hero wajib (${heroWajibDipilih.length}) sudah memenuhi atau melebihi slotLevel (${slotLevel})`);
    return;
  }

  window.__modalQueue       = [];
  window.__heroListForModal = heroList;
  document.dispatchEvent(new CustomEvent('cari:register-modals', { detail: { heroList } }));

  // Batalkan run sebelumnya jika masih berjalan
  cancelComboEngine();

  runModalQueue(heroList, async () => {
    try {
      // Reset state live & final setiap run baru
      window.__liveProgress  = {
        slotTersisa:     slotLevel - heroWajibDipilih.length,
        poolSize:        heroList.length - heroWajibDipilih.length,
        heroWajibCount:  heroWajibDipilih.length,
        totalKombinasi:  0,
        workerCount:     navigator.hardwareConcurrency ?? 4,
        evaluated:       0,
        pct:             0,
        bestSkor:        null,
        scoreMode,
        entryBaru:       0,
        stats:           { hit: 0, miss: 0, skip: 0 },
      };
      window.__lastRunSummary = null;
      window.__progressLog    = [];

      showProgressBar();
      showWorkerDetailButton();   // tombol muncul sejak awal
      _startWorkerDetailLive();   // interval refresh modal tiap 1 detik

      const comboResult = await runComboEngine(
        heroList,
        slotLevel,
        scoreMode,
        window.ALL_HEROES,
        heroWajibDipilih,
        ({ pct, bestSkor, evaluated, selectedHeroes, simResults }) => {
          // Simpan state live supaya modal bisa dibaca kapan saja
          _updateLiveProgress({ pct, bestSkor, evaluated, scoreMode });
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

      _stopWorkerDetailLive();
      hideProgressBar();
      renderScoreList(comboResult.selectedHeroes, comboResult.simResults);
      highlightComboSlots(comboResult.selectedHeroes);

      // ── CEK INTEGRITAS CACHE ──────────────────────────────────
      // Bandingkan hasil simulasi final vs nilai yang tersimpan di
      // cache. Kalau beda, berarti ada bug di pembuatan cache key
      // (buildCacheKey) atau di profil buff — perlu dilacak.
      verifyCacheIntegrity(comboResult.selectedHeroes, comboResult.simResults)
        .then(mismatches => {
          if (mismatches.length === 0) return;
          notifyCacheIntegrityIssue(mismatches);
        })
        .catch(() => {});

      // Auto-fill preview Smart Placement dari hasil combo
      if (typeof window.autoFillSmartPlacementPreview === 'function') {
        window.autoFillSmartPlacementPreview(comboResult.selectedHeroes);
      }

      // Tampilkan tombol detail & refresh modal ke state final
      showWorkerDetailButton();
      _refreshWorkerDetailModal();

    } catch (err) {
      _stopWorkerDetailLive();
      hideProgressBar();
      if (err.name !== 'AbortError') {
        alert(`Combo Engine Error: ${err.message}`);
      }
      // Refresh modal sekali lagi untuk tampilkan status final (DIBATALKAN)
      _refreshWorkerDetailModal();
    }
  });
}
window.CARI = CARI;

// ════════════════════════════════════════════════════════════════
// PROGRESS BAR & TOMBOL BATAL
// ════════════════════════════════════════════════════════════════
function showProgressBar() {
  const bar = document.getElementById('sp-progress-bar');
  if (bar) {
    bar.style.display = 'block';
    bar.style.width   = '0%';
  }
  // Sembunyikan tombol CARI, tampilkan BATAL
  const btnCari  = document.getElementById('btn-cari');
  const btnBatal = document.getElementById('btn-batal');
  if (btnCari)  btnCari.style.display  = 'none';
  if (btnBatal) btnBatal.style.display = 'inline-block';
}

function updateProgressBar(pct, bestSkor) {
  const bar = document.getElementById('sp-progress-bar');
  if (bar) bar.style.width = `${Math.round(pct)}%`;

  const info = document.getElementById('sp-progress-info');
  if (info) {
    info.textContent = bestSkor > -Infinity
      ? `${Math.round(pct)}% — sementara: ${bestSkor.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`
      : `${Math.round(pct)}%`;
  }
}

function hideProgressBar() {
  const bar = document.getElementById('sp-progress-bar');
  if (bar) { bar.style.display = 'none'; bar.style.width = '0%'; }

  const info = document.getElementById('sp-progress-info');
  if (info) info.textContent = '';

  const btnCari  = document.getElementById('btn-cari');
  const btnBatal = document.getElementById('btn-batal');
  if (btnCari)  btnCari.style.display  = 'inline-block';
  if (btnBatal) btnBatal.style.display = 'none';
}

// Pasang handler tombol BATAL — cukup sekali waktu DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  const btnBatal = document.getElementById('btn-batal');
  if (btnBatal) {
    btnBatal.style.display = 'none';
    btnBatal.addEventListener('click', () => {
      cancelComboEngine();
      hideProgressBar();
    });
  }
});

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
// ════════════════════════════════════════════════════════════════
// SISTEM MODAL QUEUE
// File buff mendaftarkan modal mereka sendiri via:
//   window.__registerModalQueue(fn)
// fn = (heroList, next) => void  — panggil next() kalau selesai / skip
//
// find_combo.js cukup jalankan antrian ini sebelum applyAllBuffs.
// Kalau buff dihapus, tidak ada yang perlu diubah di sini.
// ════════════════════════════════════════════════════════════════
window.__modalQueue = [];
window.__registerModalQueue = function(fn) {
  window.__modalQueue.push(fn);
};
function runModalQueue(heroList, onDone) {
  const queue = [...window.__modalQueue];
  function next() {
    if (queue.length === 0) { onDone(); return; }
    const fn = queue.shift();
    fn(heroList, next);
  }
  next();
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
// ════════════════════════════════════════════════════════════════
// UI: WORKER DETAIL PROGRESS PANEL  (live-update tiap 1 detik)
// ════════════════════════════════════════════════════════════════

function _fmt(n) {
  if (n == null || n === -Infinity) return '—';
  return Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 });
}
function _fmtPct(n) {
  return n != null ? `${parseFloat(n).toFixed(1)}%` : '—';
}
function _modeLabel(m) {
  if (m === 'damage')  return 'damage';
  if (m === 'sustain') return 'sustain';
  return 'combined';
}

// State live — diisi oleh onProgress callback di CARI()
window.__liveProgress = null;   // { pct, bestSkor, evaluated, scoreMode, totalKombinasi, ... }
let _workerDetailInterval = null;

// Panggil ini setiap kali onProgress tiba dari engine
function _updateLiveProgress(data) {
  window.__liveProgress = { ...window.__liveProgress, ...data };
}

// Mulai interval refresh saat engine jalan
function _startWorkerDetailLive() {
  _stopWorkerDetailLive();
  _workerDetailInterval = setInterval(() => {
    _refreshWorkerDetailModal();
  }, 1000);
}

// Stop interval saat engine selesai/batal
function _stopWorkerDetailLive() {
  if (_workerDetailInterval) {
    clearInterval(_workerDetailInterval);
    _workerDetailInterval = null;
  }
}

// ── Tombol "📊 Detail Progres Worker" ────────────────────────
function showWorkerDetailButton() {
  let btn = document.getElementById('btn-worker-detail');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'btn-worker-detail';
    btn.textContent = '📊 Detail Progres Worker';
    btn.style.cssText = `
      background: #1a1f29; color: #d4af37;
      border: 1px solid #d4af37; border-radius: 4px;
      padding: 6px 12px; font-family: 'Share Tech Mono', monospace;
      font-size: 0.78rem; cursor: pointer; margin-top: 6px; width: 100%;
    `;
    btn.onmouseenter = () => btn.style.background = '#252d3d';
    btn.onmouseleave = () => btn.style.background = '#1a1f29';
    btn.onclick = () => {
      const modal = document.getElementById('worker-detail-modal');
      if (modal) { modal.remove(); return; }  // toggle tutup kalau sudah buka
      _openWorkerDetailModal();
    };
    const wrap = document.getElementById('combo-ui-wrap');
    if (wrap) wrap.appendChild(btn);
  }
  btn.style.display = 'block';
}

// ── Buka modal (render skeleton, lalu langsung refresh isi) ──
function _openWorkerDetailModal() {
  const old = document.getElementById('worker-detail-modal');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'worker-detail-modal';
  modal.style.cssText = `
    position: fixed; inset: 0; z-index: 10000;
    background: rgba(0,0,0,0.75);
    display: flex; align-items: center; justify-content: center;
  `;
  modal.innerHTML = `
    <div id="worker-detail-inner" style="
      background: #0f1218; border: 1px solid #333; border-radius: 8px;
      width: min(720px, 95vw); max-height: 88vh; overflow-y: auto;
      font-family: 'Share Tech Mono', monospace; color: #ccc;
      padding: 20px 22px; position: relative;
    ">
      <!-- Judul -->
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
        <div style="font-family:'Cinzel Decorative',serif; color:#d4af37; font-size:0.95rem;">
          ◈ DETAIL PROGRES WORKER
        </div>
        <button id="worker-detail-close" style="
          background:none; border:none; color:#888; font-size:1.2rem; cursor:pointer;
        ">✕</button>
      </div>
      <!-- Konten diisi oleh _refreshWorkerDetailModal() -->
      <div id="worker-detail-body">
        <div style="color:#666; font-size:0.8rem; padding:20px 0; text-align:center;">
          Menunggu data engine...
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('worker-detail-close').onclick = () => modal.remove();
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  // Langsung render isi pertama kali
  _refreshWorkerDetailModal();
}

// ── Fungsi inti: render/update isi modal dari state terbaru ──
function _refreshWorkerDetailModal() {
  const body = document.getElementById('worker-detail-body');
  if (!body) return;  // modal tidak terbuka, skip

  // Ambil data: pakai __lastRunSummary kalau sudah final, else __liveProgress
  const summary  = window.__lastRunSummary;
  const live     = window.__liveProgress;
  const isRunning = !summary && live;           // masih jalan
  const isFinal   = !!summary;                 // selesai atau dibatalkan

  const plog = window.__progressLog ?? [];

  // ── Ringkasan slot/kombinasi ─────────────────────────────
  const infoSrc = summary ?? live ?? {};
  const slotTersisa  = infoSrc.slotTersisa  ?? live?.slotTersisa  ?? '—';
  const poolSize     = infoSrc.poolSize     ?? live?.poolSize     ?? '—';
  const heroWajibCount = infoSrc.heroWajibCount ?? live?.heroWajibCount ?? '—';
  const totalKombinasi = infoSrc.totalKombinasi ?? live?.totalKombinasi ?? 0;
  const workerCount  = summary ? (summary.perWorkerLog?.length ?? '—') : (live?.workerCount ?? '—');
  const entryBaru    = summary?.totalNewEntries ?? live?.entryBaru ?? 0;

  // ── Status & progress bar ────────────────────────────────
  // pct sudah dihitung oleh engine dan disimpan di live.pct — jangan hitung ulang
  const pct        = summary?.pct ?? live?.pct ?? 0;
  const bestSkor   = summary?.bestSkor ?? live?.bestSkor ?? null;
  const evaluated  = summary?.totalEvaluated ?? live?.evaluated ?? 0;
  const scoreMode  = summary?.scoreMode ?? live?.scoreMode ?? '—';
  const waktuDetik = summary?.totalWaktuDetik ?? null;

  let statusColor, statusLabel, statusLine;
  const evalStr  = `${evaluated.toLocaleString('id-ID')} / ${Number(totalKombinasi).toLocaleString('id-ID')}`;
  if (!isFinal && !isRunning) {
    statusColor = '#888'; statusLabel = 'MENUNGGU';
    statusLine = 'Belum ada data — tekan CARI untuk mulai';
  } else if (isRunning) {
    statusColor = '#d4af37'; statusLabel = '⟳ BERJALAN';
    statusLine = `kombinasi dievaluasi: ${evalStr}`;
  } else if (summary.status === 'cancelled') {
    statusColor = '#e74c3c'; statusLabel = 'DIBATALKAN';
    statusLine = `kombinasi dievaluasi: ${evalStr} | waktu: ${waktuDetik ?? '—'}s`;
  } else {
    statusColor = '#27ae60'; statusLabel = 'SELESAI';
    statusLine = `kombinasi dievaluasi: ${evalStr} | waktu: ${waktuDetik ?? '—'}s`;
  }

  // ── Log skor per 5 detik ─────────────────────────────────
  const progressRows = plog.length
    ? plog.map((p, idx) => {
        const prev    = idx > 0 ? plog[idx - 1].bestSkor : null;
        const prevStr = prev != null ? `<span style="color:#888; margin-left:8px;">vs ${_fmt(prev)}</span>` : '';
        return `
          <div style="font-size:0.75rem; color:#bbb; padding:3px 0; border-bottom:1px solid #1e2533;">
            <span style="color:#888; min-width:90px; display:inline-block;">5 detik ke-${p.tick}</span>
            <span style="color:#d4af37; font-weight:bold;">${_fmt(p.bestSkor)}</span>
            ${prevStr}
            <span style="color:#666; margin-left:8px;">(mode: ${_modeLabel(p.scoreMode)})</span>
          </div>`;
      }).join('')
    : '<div style="color:#666; font-size:0.75rem; padding:4px 0;">— belum ada update progress —</div>';

  // ── Statistik hero/buff ──────────────────────────────────
  const stats = summary?.totalStats ?? live?.stats ?? { hit: 0, miss: 0, skip: 0 };
  const totalEvalHero = (stats.hit ?? 0) + (stats.miss ?? 0) + (stats.skip ?? 0);

  // ── Tabel per-worker ─────────────────────────────────────
  const perWorkerLog = summary?.perWorkerLog ?? live?.perWorkerLog ?? [];
  const workerTableOpen = document.getElementById('worker-table-wrap')?.style.display !== 'none';
  const workerHeader = `
    <tr style="background:#0f1218; color:#d4af37; font-size:0.72rem; text-align:left;">
      <th style="padding:5px 8px;">worker</th>
      <th style="padding:5px 8px;">evaluated</th>
      <th style="padding:5px 8px;">bestSkor</th>
      <th style="padding:5px 8px;">hit</th>
      <th style="padding:5px 8px;">miss</th>
      <th style="padding:5px 8px;">skip</th>
      <th style="padding:5px 8px;">entryBaru</th>
      <th style="padding:5px 8px;">waktuMs</th>
      <th style="padding:5px 8px;">status</th>
    </tr>`;
  const workerRows = perWorkerLog.map((w, i) => `
    <tr style="background:${i % 2 === 0 ? '#1a1f29' : '#141820'}; font-size:0.72rem;">
      <td style="padding:4px 8px; color:#888;">${w.worker}</td>
      <td style="padding:4px 8px;">${(w.evaluated ?? 0).toLocaleString('id-ID')}</td>
      <td style="padding:4px 8px; color:#d4af37;">${_fmt(w.bestSkor)}</td>
      <td style="padding:4px 8px; color:#27ae60;">${(w.hit ?? 0).toLocaleString('id-ID')}</td>
      <td style="padding:4px 8px; color:#e67e22;">${(w.miss ?? 0).toLocaleString('id-ID')}</td>
      <td style="padding:4px 8px; color:#888;">${(w.skip ?? 0).toLocaleString('id-ID')}</td>
      <td style="padding:4px 8px;">${(w.entryBaru ?? 0).toLocaleString('id-ID')}</td>
      <td style="padding:4px 8px; color:#aaa;">${(w.waktuMs ?? 0).toLocaleString('id-ID')} ms</td>
      <td style="padding:4px 8px; color:${w.cancelled ? '#e74c3c' : (isFinal && !isRunning ? '#27ae60' : '#d4af37')};">
        ${w.cancelled ? '✗ batal' : (isFinal && !isRunning ? '✓ selesai' : '⟳ jalan')}
      </td>
    </tr>`).join('') || `<tr><td colspan="9" style="padding:8px; color:#666; font-size:0.75rem;">— data worker belum tersedia —</td></tr>`;

  // ── Render ke #worker-detail-body ────────────────────────
  body.innerHTML = `
    <!-- Baris 1: Ringkasan -->
    <div style="background:#141820; border-radius:5px; padding:10px 14px; margin-bottom:10px; font-size:0.78rem; color:#bbb; line-height:1.9;">
      Slot dicari: <span style="color:#d4af37;">${slotTersisa}</span>
      dari pool <span style="color:#d4af37;">${poolSize}</span> hero
      (+ <span style="color:#d4af37;">${heroWajibCount}</span> hero wajib)
      &nbsp;|&nbsp;
      kombinasi: <span style="color:#d4af37;">${Number(totalKombinasi).toLocaleString('id-ID')}</span>
      &nbsp;|&nbsp;
      worker: <span style="color:#d4af37;">${workerCount}</span>
      &nbsp;|&nbsp;
      entry baru: <span style="color:#d4af37;">${Number(entryBaru).toLocaleString('id-ID')}</span>
    </div>

    <!-- Baris 2: Log skor per 5 detik -->
    <div style="margin-bottom:12px;">
      <div style="font-size:0.75rem; color:#d4af37; margin-bottom:6px;">▸ Skor terbaik per update (tiap 5 detik)</div>
      <div id="progress-log-wrap" style="background:#141820; border-radius:5px; padding:8px 12px; max-height:160px; overflow-y:auto;">
        ${progressRows}
      </div>
    </div>

    <!-- Baris 3: Status & progress -->
    <div style="background:#141820; border-radius:5px; padding:10px 14px; margin-bottom:10px; font-size:0.78rem; line-height:2;">
      <div style="margin-bottom:4px;">
        Skor terbaik${isFinal ? ' final' : ' sementara'}:
        <span style="color:#d4af37; font-weight:bold; font-size:0.9rem;">${bestSkor != null ? `${_fmt(bestSkor)} (mode: ${_modeLabel(scoreMode)})` : '—'}</span>
      </div>
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px;">
        <span>Progress:</span>
        <div style="flex:1; background:#1a1f29; border-radius:4px; height:8px; overflow:hidden;">
          <div style="height:100%; width:${parseFloat(pct ?? 0)}%; background:${statusColor}; transition:width 0.5s;"></div>
        </div>
        <span style="color:${statusColor}; font-size:0.75rem;">${evaluated.toLocaleString('id-ID')} / ${Number(totalKombinasi).toLocaleString('id-ID')}</span>
      </div>
      <div style="color:${statusColor}; font-weight:bold;">
        ${statusLabel} — ${statusLine}
      </div>
    </div>

    <!-- Baris 4: Statistik hero/buff -->
    <div style="background:#141820; border-radius:5px; padding:10px 14px; margin-bottom:12px; font-size:0.78rem; color:#bbb; line-height:1.9;">
      Total hero/buff dievaluasi:
      <span style="color:#d4af37;">${totalEvalHero.toLocaleString('id-ID')}</span>
      → hit: <span style="color:#27ae60;">${(stats.hit ?? 0).toLocaleString('id-ID')}</span>
      | miss: <span style="color:#e67e22;">${(stats.miss ?? 0).toLocaleString('id-ID')}</span>
      | skip: <span style="color:#888;">${(stats.skip ?? 0).toLocaleString('id-ID')}</span>
      ${waktuDetik ? `| waktu: <span style="color:#aaa;">${waktuDetik}s</span>` : ''}
    </div>

    <!-- Baris 5: Tabel per worker (collapsible) -->
    <div>
      <button id="worker-table-toggle" style="
        background:#1a1f29; color:#d4af37; border:1px solid #333;
        border-radius:4px; padding:5px 12px; font-family:'Share Tech Mono',monospace;
        font-size:0.75rem; cursor:pointer; width:100%; text-align:left; margin-bottom:6px;
      ">${workerTableOpen ? '▾' : '▸'} Detail per Worker (klik untuk buka/tutup)</button>
      <div id="worker-table-wrap" style="display:${workerTableOpen ? 'block' : 'none'}; overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; font-size:0.72rem; min-width:480px;">
          <thead>${workerHeader}</thead>
          <tbody>${workerRows}</tbody>
        </table>
      </div>
    </div>
  `;

  // Re-attach toggle handler (innerHTML diganti, event handler hilang)
  const tog = document.getElementById('worker-table-toggle');
  if (tog) tog.onclick = function() {
    const wrap = document.getElementById('worker-table-wrap');
    const isOpen = wrap.style.display !== 'none';
    wrap.style.display = isOpen ? 'none' : 'block';
    this.textContent = (isOpen ? '▸' : '▾') + ' Detail per Worker (klik untuk buka/tutup)';
  };

  // Auto-scroll log skor ke bawah saat masih running
  if (isRunning) {
    const logWrap = document.getElementById('progress-log-wrap');
    if (logWrap) logWrap.scrollTop = logWrap.scrollHeight;
  }
}