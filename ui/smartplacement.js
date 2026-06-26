// ════════════════════════════════════════════════════════
// SMART PLACEMENT — UI row, modal slot, run, dan
//                   feedback dari server (log, progress, hasil)
//
// Dipicu lewat WebSocket saat user klik "🚀 Jalankan" di baris
// Smart Placement inline (lihat runSmartPlacement() di bawah,
// dan handler pesan di script "TERIMA DATA DARI PYTHON" di
// index.html).
// ════════════════════════════════════════════════════════

// ── State Smart Placement row ──
const SMART_PLACEMENT_SLOT_COUNT = 14;
const spSlots = []; // array of {name, minStar, requireKristal, kristalNama} or null

function buildSmartPlacementRow() {
  const slotsDiv = document.getElementById('smart-placement-slots');
  if (!slotsDiv) return;
  slotsDiv.innerHTML = '';

// Baris 1: slot 0-6 + tombol Kosong
  const row1 = document.createElement('div');
  row1.style.cssText = 'display:flex; gap:10px; justify-content:center;';
  for (let i = 0; i < 7; i++) {
    spSlots[i] = spSlots[i] || null;
    const slot = document.createElement('div');
    slot.className = 'grid-slot-placeholder';
    slot.id = `sp-slot-${i}`;
    slot.style.cssText = 'border-color:rgba(52,152,219,0.3); position:relative; overflow:hidden;';
    slot.onclick = () => openSpSlotModal(i);
    row1.appendChild(slot);
  }
  const btnKosong = document.createElement('div');
  btnKosong.className = 'grid-slot-placeholder';
  btnKosong.style.cssText = 'border-color:#e74c3c; background:rgba(231,76,60,0.08); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:0.6rem; color:#e74c3c; font-weight:bold; text-align:center; padding:4px;';
  btnKosong.innerHTML = '🗑<br>Kosong';
  btnKosong.onclick = () => {
    for (let i = 0; i < SMART_PLACEMENT_SLOT_COUNT; i++) spSlots[i] = null;
    buildSmartPlacementRow();
  };
  row1.appendChild(btnKosong);
  slotsDiv.appendChild(row1);
  // Render konten slot SETELAH row1 masuk DOM
  for (let i = 0; i < 7; i++) renderSpSlot(i);

  // Baris 2: slot 7-13 + tombol Jalankan
  const row2 = document.createElement('div');
  row2.style.cssText = 'display:flex; gap:10px; justify-content:center;';
  for (let i = 7; i < 14; i++) {
    spSlots[i] = spSlots[i] || null;
    const slot = document.createElement('div');
    slot.className = 'grid-slot-placeholder';
    slot.id = `sp-slot-${i}`;
    slot.style.cssText = 'border-color:rgba(52,152,219,0.3); position:relative; overflow:hidden;';
    slot.onclick = () => openSpSlotModal(i);
    row2.appendChild(slot);
  }
  const btnJalan = document.createElement('div');
  btnJalan.className = 'grid-slot-placeholder';
  btnJalan.style.cssText = 'border-color:#27ae60; background:rgba(39,174,96,0.08); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:0.6rem; color:#27ae60; font-weight:bold; text-align:center; padding:4px;';
  btnJalan.innerHTML = '🚀<br>Jalankan';
  btnJalan.onclick = () => runSmartPlacement();
  row2.appendChild(btnJalan);
  slotsDiv.appendChild(row2);
  // Render konten slot SETELAH row2 masuk DOM
  for (let i = 7; i < 14; i++) renderSpSlot(i);
}

function renderSpSlot(i) {
  const slot = document.getElementById(`sp-slot-${i}`);
  if (!slot) return;
  const entry = spSlots[i];
  if (!entry) {
    slot.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:rgba(52,152,219,0.3);font-size:1.2rem;">+</div>`;
    slot.classList.remove('sp-slot-filled');
  } else {
    const stars = '★'.repeat(entry.minStar) + '☆'.repeat(3 - entry.minStar);
    slot.classList.add('sp-slot-filled');
    slot.innerHTML = `
      <img src="${window.heroImagePath(entry.name)}" alt="${entry.name}"
           onerror="this.style.display='none'; this.parentElement.insertAdjacentHTML('afterbegin','<div style=&quot;display:flex;align-items:center;justify-content:center;height:calc(100% - 16px);font-size:.55rem;font-weight:bold;color:#3498db;padding:2px;&quot;>${entry.name}</div>')">
      <div class="sp-slot-stars">${stars}</div>`;
  }
}

// Tambah hero ke slot smart pertama yang kosong
window.addHeroToSmart = function(name) {
  const idx = spSlots.findIndex(s => s === null);
  if (idx === -1) return alert('Smart Placement row penuh!');
  spSlots[idx] = { name, minStar: 1, requireKristal: '', kristalNama: '' };
  renderSpSlot(idx);
};

// Modal edit slot smart (bintang & kristal)
function openSpSlotModal(i) {
  const entry = spSlots[i];
  if (!entry) return; // slot kosong, skip
  const { fraksi: fraksiOpts, role: roleOpts } = getKristalOptions();

  const overlay = document.getElementById('detail-modal');
  const content = document.getElementById('detail-modal-content');

  const starBtns = [1,2,3].map(s =>
    `<button data-star="${s}" class="star-picker-btn ${entry.minStar===s?'active':''}"
      style="background:var(--bg-dark);border:1px solid var(--border);color:${entry.minStar===s?'var(--accent)':'var(--text-dim)'};padding:8px 14px;border-radius:6px;cursor:pointer;font-weight:bold;">
      ${'★'.repeat(s)} ${s}</button>`).join('');

  const kristalSel = [
    `<option value="">— kristal —</option>`,
    `<option value="fraksi" ${entry.requireKristal==='fraksi'?'selected':''}>Fraksi</option>`,
    `<option value="role"   ${entry.requireKristal==='role'  ?'selected':''}>Role</option>`,
  ].join('');

  const namaList = entry.requireKristal==='fraksi' ? fraksiOpts : entry.requireKristal==='role' ? roleOpts : [];
  const namaSel  = [`<option value="">— nama —</option>`,
    ...namaList.map(n => `<option value="${n}" ${entry.kristalNama===n?'selected':''}>${n}</option>`)
  ].join('');

  content.innerHTML = `
    <h3 style="margin-top:0; color:#3498db;">${entry.name} <span style="font-size:0.7rem;color:var(--text-dim);">(Smart Slot ${i+1})</span></h3>
    <div>Min Bintang:</div>
    <div class="star-picker" id="sp-star-picker" style="display:flex;gap:8px;margin:10px 0;">${starBtns}</div>
    <div style="display:flex;gap:8px;margin-top:10px;">
      <select id="sp-slot-kristal" style="background:#1a1f29;color:#ccc;border:1px solid #444;border-radius:4px;padding:6px;flex:1;">${kristalSel}</select>
      <select id="sp-slot-nama"    style="background:#1a1f29;color:#ccc;border:1px solid #444;border-radius:4px;padding:6px;flex:1;">${namaSel}</select>
    </div>
    <button class="modal-remove-btn" id="sp-slot-remove" style="margin-top:14px;">🗑 Hapus dari Smart Row</button>`;

  content.querySelectorAll('#sp-star-picker button').forEach(btn => {
    btn.onclick = () => {
      spSlots[i].minStar = parseInt(btn.dataset.star);
      renderSpSlot(i);
      openSpSlotModal(i);
    };
  });
  content.querySelector('#sp-slot-kristal').onchange = function() {
    spSlots[i].requireKristal = this.value;
    spSlots[i].kristalNama = '';
    openSpSlotModal(i);
  };
  content.querySelector('#sp-slot-nama').onchange = function() {
    spSlots[i].kristalNama = this.value;
  };
  content.querySelector('#sp-slot-remove').onclick = () => {
    spSlots[i] = null;
    renderSpSlot(i);
    closeDetailModal();
  };

  overlay.style.display = 'flex';
}

// Jalankan Smart Placement via WebSocket
function runSmartPlacement() {
  const heroes = spSlots.filter(Boolean).map(item => {
    const entry = { name: item.name };
    if (item.minStar > 1)    entry.minStar       = item.minStar;
    if (item.requireKristal) entry.requireKristal = item.requireKristal;
    if (item.kristalNama)    entry.kristalNama    = item.kristalNama;
    return entry;
  });
  if (!heroes.length) return alert('Smart row kosong, tambah hero dulu!');
  const ws = window._ws;
  if (!ws || ws.readyState !== WebSocket.OPEN)
    return alert('WebSocket belum terhubung ke server Python.');
  ws.send(JSON.stringify({ action: 'smart_placement', heroes }));
}

// Expose getKristalOptions untuk dipakai openSpSlotModal
function getKristalOptions() {
  if (window.DATABASE_BUFF) {
    const fraksi = new Set(), role = new Set();
    Object.values(window.DATABASE_BUFF).forEach(b => {
      if (b.targetFraksi) fraksi.add(b.targetFraksi);
      if (b.targetRole)   role.add(b.targetRole);
    });
    return { fraksi: [...fraksi].sort(), role: [...role].sort() };
  }
  return { fraksi: [], role: [] };
}

// ── AUTO-FILL Smart Placement dari hasil comboengine (preview only, tidak kirim WS) ──
// Dipanggil find_combo.js setelah runComboEngine selesai.
// Mapping: name→name, stars→minStar, fraksiExtra[0]→kristal (prioritas), roleExtra[0]→fallback.
window.autoFillSmartPlacementPreview = function(selectedHeroes) {
  if (!Array.isArray(selectedHeroes) || selectedHeroes.length === 0) return;

  // Kosongkan slot lama
  for (let i = 0; i < SMART_PLACEMENT_SLOT_COUNT; i++) spSlots[i] = null;

  selectedHeroes.slice(0, SMART_PLACEMENT_SLOT_COUNT).forEach((hero, i) => {
    let requireKristal = '';
    let kristalNama    = '';

    // Prioritaskan extra fraksi (dipilih manual user), fallback ke extra role
    if (hero.fraksiExtra && hero.fraksiExtra.length > 0) {
      requireKristal = 'fraksi';
      kristalNama    = hero.fraksiExtra[0];
    } else if (hero.roleExtra && hero.roleExtra.length > 0) {
      requireKristal = 'role';
      kristalNama    = hero.roleExtra[0];
    }

    spSlots[i] = {
      name:           hero.name,
      minStar:        hero.stars || 1,
      requireKristal,
      kristalNama,
    };
  });

  buildSmartPlacementRow(); // re-render UI slot, TIDAK kirim WebSocket
};

// ════════════════════════════════════════════════════════
// FEEDBACK DARI SERVER — log, progress, hasil
// ════════════════════════════════════════════════════════

// ── Append 1 baris log ──
window.spAppendLog = function(level, msg) {
  const logEl = document.getElementById('sp-log');
  if (!logEl) return;

  // Map level → icon + css class
  const MAP = {
    info:  { icon: '›',  cls: 'sp-log-info'  },
    ok:    { icon: '✓',  cls: 'sp-log-ok'    },
    warn:  { icon: '⚠',  cls: 'sp-log-warn'  },
    error: { icon: '✕',  cls: 'sp-log-error' },
  };
  const { icon, cls } = MAP[level] || MAP.info;

  const now  = new Date();
  const time = `${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

  const line = document.createElement('div');
  line.className = 'sp-log-line';
  line.innerHTML = `
    <span class="sp-log-time">${time}</span>
    <span class="${cls}">${icon} ${msg}</span>`;
  logEl.appendChild(line);
  logEl.classList.add('open');
  logEl.scrollTop = logEl.scrollHeight;
};

// ── Handle status event dari server ──
window.spHandleStatus = function(msg) {
  const bar  = document.getElementById('sp-progress-bar');
  const prog = document.getElementById('sp-progress');
  prog.style.display = 'block';

  if (msg.status === 'started') {
    bar.style.width = '15%';
    spAppendLog('info', `Server mulai — ${msg.total} hero diproses`);

  } else if (msg.status === 'done') {
    bar.style.width  = '100%';
    setTimeout(() => { prog.style.display = 'none'; bar.style.width = '0%'; }, 600);
    spAppendLog('ok', 'Selesai!');
    spShowResult(msg.result);

  } else if (msg.status === 'error') {
    bar.style.width = '100%';
    bar.style.background = '#e74c3c';
    setTimeout(() => {
      prog.style.display   = 'none';
      bar.style.width      = '0%';
      bar.style.background = '';
    }, 800);
    spAppendLog('error', `Error: ${msg.message}`);
  }
};

// ── Tampilkan hasil dari server ──
window.spShowResult = function(result) {
  const res = document.getElementById('sp-result');
  if (!res) return;
  res.style.display = 'block';

  const section = (label, items, cls, fn) => {
    if (!items?.length) return '';
    return `<div class="sp-r-section">
      <div class="sp-r-label">${label}</div>
      ${items.map(fn).map(t => `<div class="${cls}">  ${t}</div>`).join('')}
    </div>`;
  };

  res.innerHTML = [
    section('✓ Berhasil dipindah', result.moved, 'sp-r-ok',
      i => `${i.name} → col ${i.to[0]} row ${i.to[1]}`),
    section('⚠ Dilewati', result.skipped, 'sp-r-warn',
      i => `${i.name}: ${i.reason}`),
    section('✕ Gagal', result.failed, 'sp-r-err',
      i => `${i.name}: ${i.reason}`),
    section('⚠ Kristal tidak cocok', result.kristalMismatch, 'sp-r-warn',
      i => `${i.name}: diminta ${i.requireKristal}/${i.kristalNama||'*'}, dapat ${i.actualKristal}/${i.actualNama||'-'}`),
    section('← Dikeluarkan ke bench', result.movedToBench, 'sp-r-warn',
      i => `${i.name} → bench slot ${i.benchSlot}`),
  ].join('') || `<div class="sp-r-warn">Tidak ada hasil.</div>`;
};

// ── Init on load ──
window.addEventListener('DOMContentLoaded', () => {
  buildSmartPlacementRow();
});