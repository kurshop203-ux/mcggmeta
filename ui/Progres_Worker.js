// ════════════════════════════════════════════════════════════════
// Progres_Worker.js
// UI progress: progress bar utama + modal "Detail Progres Worker"
// (live-update tiap 1 detik). Dipecah keluar dari find_combo.js
// supaya logikanya terpisah dari orkestrasi CARI().
//
// Dipanggil dari find_combo.js lewat import:
//   showProgressBar()           → tampilkan progress bar sidebar
//   updateProgressBar(pct, sk)  → update isi progress bar
//   hideProgressBar()           → sembunyikan progress bar
//   showWorkerDetailButton()    → tampilkan tombol di sidebar
//   startWorkerDetailLive()     → mulai interval refresh modal
//   stopWorkerDetailLive()      → hentikan interval
//   updateLiveProgress(data)    → update state __liveProgress
//   refreshWorkerDetailModal()  → render ulang isi modal sekali
// ════════════════════════════════════════════════════════════════

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
      font-size: 0.78rem; cursor: pointer; flex: 1;
    `;
    btn.onmouseenter = () => btn.style.background = '#252d3d';
    btn.onmouseleave = () => btn.style.background = '#1a1f29';
    btn.onclick = () => {
      const modal = document.getElementById('worker-detail-modal');
      if (modal) { modal.remove(); return; }
      _openWorkerDetailModal();
    };
    _getBtnRow().appendChild(btn);
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
      ${isRunning ? `
      <button id="modal-cancel-btn" style="
        margin-top:8px; background:#2a1418; color:#e74c3c;
        border:1px solid #e74c3c; border-radius:4px;
        padding:5px 12px; font-family:'Share Tech Mono',monospace;
        font-size:0.75rem; cursor:pointer; width:100%;
      ">✕ Batalkan Pencarian</button>` : ''}
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

  // Re-attach tombol batal di dalam modal
  const cancelBtn = document.getElementById('modal-cancel-btn');
  if (cancelBtn) cancelBtn.onclick = () => window.__cancelComboEngine?.();

  // Auto-scroll log skor ke bawah saat masih running
  if (isRunning) {
    const logWrap = document.getElementById('progress-log-wrap');
    if (logWrap) logWrap.scrollTop = logWrap.scrollHeight;
  }
}

// ════════════════════════════════════════════════════════════════
// PROGRESS BAR & TOMBOL BATAL
// ════════════════════════════════════════════════════════════════
function showProgressBar() {
  const wrap = document.getElementById('combo-progress');
  const bar  = document.getElementById('combo-progress-bar');
  if (wrap) wrap.style.display = 'block';
  if (bar)  { bar.style.width = '0%'; }
}

function updateProgressBar(pct, bestSkor) {
  const bar = document.getElementById('combo-progress-bar');
  if (bar) bar.style.width = `${Math.round(pct)}%`;

  const info = document.getElementById('combo-progress-info');
  if (info) {
    info.textContent = bestSkor > -Infinity
      ? `${Math.round(pct)}% — skor sementara: ${bestSkor.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`
      : `${Math.round(pct)}%`;
  }
}

function hideProgressBar() {
  const wrap = document.getElementById('combo-progress');
  const bar  = document.getElementById('combo-progress-bar');
  const info = document.getElementById('combo-progress-info');
  if (wrap) wrap.style.display = 'none';
  if (bar)  bar.style.width = '0%';
  if (info) info.textContent = '';
}
// Helper: ambil/buat row flex buat tombol kiri-kanan
function _getBtnRow() {
  let row = document.getElementById('combo-btn-row');
  if (!row) {
    row = document.createElement('div');
    row.id = 'combo-btn-row';
    row.style.cssText = `
      display: flex; gap: 8px; margin-top: 6px;
    `;
    const wrap = document.getElementById('combo-ui-wrap');
    if (wrap) wrap.appendChild(row);
  }
  return row;
}
// ── Tombol "✕ Batalkan" ──────────────────────────────────────
function showCancelButton() {
  let btn = document.getElementById('btn-cancel-combo');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'btn-cancel-combo';
    btn.textContent = '✕ Batalkan';
    btn.style.cssText = `
      background: #2a1418; color: #e74c3c;
      border: 1px solid #e74c3c; border-radius: 4px;
      padding: 6px 12px; font-family: 'Share Tech Mono', monospace;
      font-size: 0.78rem; cursor: pointer; flex: 1;
    `;
    btn.onmouseenter = () => btn.style.background = '#3a1c22';
    btn.onmouseleave = () => btn.style.background = '#2a1418';
    btn.onclick = () => {
      window.__cancelComboEngine?.();
    };
    _getBtnRow().appendChild(btn);
  }
  btn.style.display = 'block';
}

function hideCancelButton() {
  const btn = document.getElementById('btn-cancel-combo');
  if (btn) btn.style.display = 'none';
}

// ── EXPORT ────────────────────────────────────────────────────
// Diekspor dengan nama asli (tanpa underscore) supaya jelas ini
// public API dari module, sesuai konvensi: underscore = private
// di dalam file lama, tapi begitu jadi module sendiri, fungsi yang
// dipanggil dari luar bukan lagi "private".
export {
  _updateLiveProgress       as updateLiveProgress,
  _startWorkerDetailLive    as startWorkerDetailLive,
  _stopWorkerDetailLive     as stopWorkerDetailLive,
  _refreshWorkerDetailModal as refreshWorkerDetailModal,
};
export { showWorkerDetailButton };
export { showProgressBar, updateProgressBar, hideProgressBar, showCancelButton, hideCancelButton };
