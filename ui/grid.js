// ════════════════════════════════════════════════════════
// GRID & MODAL — build grid arena, render slot, edit modal
// ════════════════════════════════════════════════════════

const GRID_ROWS = [
  { zone: 'arena', count: 7, rowClass: 'row-arena', label: '◈ ARENA' },
  { zone: 'arena', count: 7, rowClass: 'row-arena', label: '' },
  { zone: 'arena', count: 7, rowClass: 'row-arena', label: '' },
  { zone: 'arena', count: 8, rowClass: 'row-arena', label: '' },
//  { zone: 'arena', count: 9, rowClass: 'row-arena', label: '' },
//  { zone: 'arena', count: 9, rowClass: 'row-arena', label: '' },
  { zone: 'arena', count: 5, rowClass: 'row-arena', label: '' },
];
window.GRID_ROWS = GRID_ROWS;

const slotAssignments = {};
window.slotAssignments = slotAssignments;

function buildGlobalGrid() {
  const wrap = document.getElementById('global-grid-wrap');
  if (!wrap) return;
  wrap.innerHTML = '';

  GRID_ROWS.forEach((rowInfo, rowIndex) => {
    const rowDiv   = document.createElement('div');
    rowDiv.className = rowInfo.rowClass;

    const labelDiv = document.createElement('div');
    labelDiv.className   = 'row-label';
    labelDiv.textContent = rowInfo.label;

    const slotsDiv = document.createElement('div');
    slotsDiv.className = 'row-slots';
    for (let i = 0; i < rowInfo.count; i++) {
      const slot    = document.createElement('div');
      slot.className = 'grid-slot-placeholder';
      slot.id        = `slot-${rowIndex}-${i}`;
      slot.onclick   = () => handleSlotClick(rowIndex, i);
      slotsDiv.appendChild(slot);
    }

    rowDiv.appendChild(labelDiv);
    rowDiv.appendChild(slotsDiv);
    wrap.appendChild(rowDiv);
  });
}

function renderSlot(rowIndex, colIndex) {
  const slot  = document.getElementById(`slot-${rowIndex}-${colIndex}`);
  if (!slot) return;
  const entry = slotAssignments[`${rowIndex}-${colIndex}`];

  if (!entry) {
    slot.className = 'grid-slot-placeholder';
    slot.innerHTML = '';
    return;
  }

  const stars    = '★'.repeat(entry.stars) + '☆'.repeat(3 - entry.stars);
  slot.className = 'grid-slot-placeholder filled';
  slot.innerHTML = `
    <img src="${window.heroImagePath(entry.name)}" alt="${entry.name}"
         onerror="this.style.display='none'; this.parentElement.insertAdjacentHTML('afterbegin','<div style=&quot;display:flex;align-items:center;justify-content:center;height:100%;font-size:.65rem;font-weight:bold;color:var(--accent);&quot;>${entry.name}</div>')">
    <div class="grid-slot-stars">${stars}</div>`;
}
window.renderSlot = renderSlot;

window.placeHeroInGrid = function(name) {
  for (let r = 0; r < GRID_ROWS.length; r++) {
    for (let c = 0; c < GRID_ROWS[r].count; c++) {
      const key = `${r}-${c}`;
      if (!slotAssignments[key]) {
        // extraFraksi/extraRole: tambahan sinergi manual yang dipilih
        // user lewat modal edit. Default kosong (belum ada tambahan).
        slotAssignments[key] = { name, stars: 1, extraFraksi: [], extraRole: [] };
        renderSlot(r, c);
        if (typeof window.updateHeroUI === 'function') {
          window.updateHeroUI(slotAssignments, window.GRID_ROWS, window.ALL_HEROES);
        }
        return;
      }
    }
  }
  alert('Grid penuh!');
};

function handleSlotClick(rowIndex, colIndex) {
  const entry = slotAssignments[`${rowIndex}-${colIndex}`];
  if (!entry) return;
  editHeroModal(rowIndex, colIndex, entry);
}

// Hitung jumlah hero unik di grid per fraksi/role tertentu.
// "Unik" di sini per SLOT (bukan per nama), karena dipakai untuk
// preview cepat saat modal edit dibuka — perhitungan resmi untuk
// tier sinergi tetap dilakukan di find_combo.js setelah merge.
function calcSynergy(rowIndex, colIndex, entry) {
  const data = window.ALL_HEROES[entry.name];
  const counts = { fraksi: {}, role: {} };

  Object.values(slotAssignments).forEach(e => {
    const d = window.ALL_HEROES[e.name];
    if (!d) return;
    // gabungkan fraksi/role dasar dari database + tambahan manual slot ini
    const fraksiList = [...toArray(d.fraksi), ...toArray(e.extraFraksi)];
    const roleList   = [...toArray(d.role),   ...toArray(e.extraRole)];
    fraksiList.forEach(f => { counts.fraksi[f] = (counts.fraksi[f] || 0) + 1; });
    roleList.forEach(r   => { counts.role[r]   = (counts.role[r]   || 0) + 1; });
  });

  // Fraksi/role milik hero yang sedang diedit (dasar + tambahan slot ini)
  const myFraksi = [...toArray(data.fraksi), ...toArray(entry.extraFraksi)];
  const myRole   = [...toArray(data.role),   ...toArray(entry.extraRole)];

  return {
    fraksi: myFraksi.map(f => ({ name: f, count: counts.fraksi[f] || 0 })),
    role:   myRole.map(r   => ({ name: r, count: counts.role[r]   || 0 })),
  };
}

// Daftar semua fraksi/role yang ada di database, dipakai sebagai
// opsi tambahan di modal edit. Dihitung sekali saat dipanggil
// (murah karena jumlah hero terbatas).
function getAllFraksiRoleOptions() {
  const roles = new Set(), fraksis = new Set();
  Object.values(window.ALL_HEROES).forEach(d => {
    toArray(d.role).forEach(r => roles.add(r));
    toArray(d.fraksi).forEach(f => fraksis.add(f));
  });
  return { roles: [...roles].sort(), fraksis: [...fraksis].sort() };
}

function editHeroModal(rowIndex, colIndex, entry) {
  const modal   = document.getElementById('detail-modal');
  const content = document.getElementById('detail-modal-content');
  const hero    = window.ALL_HEROES[entry.name];

  // Pastikan entry lama (sebelum fitur ini ada) tetap punya field ini
  if (!entry.extraFraksi) entry.extraFraksi = [];
  if (!entry.extraRole)   entry.extraRole   = [];

  const syn = calcSynergy(rowIndex, colIndex, entry);
  const baseFraksi = toArray(hero.fraksi);
  const baseRole   = toArray(hero.role);
  const { roles: allRoles, fraksis: allFraksis } = getAllFraksiRoleOptions();

  // Opsi tambahan = semua opsi yang ada DIKURANGI yang sudah jadi fraksi/role dasar
  const fraksiOptions = allFraksis.filter(f => !baseFraksi.includes(f));
  const roleOptions   = allRoles.filter(r => !baseRole.includes(r));

  const checkboxRow = (value, checked, groupName) => `
    <label style="display:flex; align-items:center; gap:6px; font-size:0.78rem; padding:4px 0; cursor:pointer;">
      <input type="checkbox" data-group="${groupName}" value="${value}" ${checked ? 'checked' : ''} />
      ${value}
    </label>`;

  content.innerHTML = `
    <h3 style="margin-top:0;">${entry.name}</h3>
    <div style="font-size:0.8rem; color:var(--text-dim); margin-bottom:8px;">${baseRole.join(', ')} • ${baseFraksi.join(', ')}</div>
    <div>Atur Bintang:</div>
    <div class="star-picker" id="star-picker">
      <button data-star="1" class="${entry.stars===1?'active':''}">★ 1</button>
      <button data-star="2" class="${entry.stars===2?'active':''}">★★ 2</button>
      <button data-star="3" class="${entry.stars===3?'active':''}">★★★ 3</button>
    </div>

    <div class="synergy-list">
      ${syn.fraksi.map(f => `<div>🔗 Sinergi Fraksi <b>${f.name}</b>: ${f.count} hero di grid</div>`).join('')}
      ${syn.role.map(r   => `<div>🔗 Sinergi Role <b>${r.name}</b>: ${r.count} hero di grid</div>`).join('')}
    </div>

    <div style="margin-top:14px; border-top:1px solid var(--border); padding-top:10px;">
      <div style="font-size:0.85rem; color:var(--accent); margin-bottom:6px;">➕ Tambahan Fraksi</div>
      <div id="extra-fraksi-list" style="display:grid; grid-template-columns:1fr 1fr; gap:2px;">
        ${fraksiOptions.length
          ? fraksiOptions.map(f => checkboxRow(f, entry.extraFraksi.includes(f), 'fraksi')).join('')
          : '<div style="color:var(--text-dim); font-size:0.75rem;">Tidak ada opsi tambahan tersedia.</div>'}
      </div>
    </div>

    <div style="margin-top:10px;">
      <div style="font-size:0.85rem; color:var(--accent); margin-bottom:6px;">➕ Tambahan Role</div>
      <div id="extra-role-list" style="display:grid; grid-template-columns:1fr 1fr; gap:2px;">
        ${roleOptions.length
          ? roleOptions.map(r => checkboxRow(r, entry.extraRole.includes(r), 'role')).join('')
          : '<div style="color:var(--text-dim); font-size:0.75rem;">Tidak ada opsi tambahan tersedia.</div>'}
      </div>
    </div>

    <button class="modal-remove-btn" id="modal-remove-btn">🗑 Hapus Hero dari Grid</button>`;

  content.querySelectorAll('#star-picker button').forEach(btn => {
    btn.onclick = () => {
      entry.stars = parseInt(btn.dataset.star);
      renderSlot(rowIndex, colIndex);
      editHeroModal(rowIndex, colIndex, entry);
      if (typeof window.updateHeroUI === 'function') {
        window.updateHeroUI(slotAssignments, window.GRID_ROWS, window.ALL_HEROES);
      }
    };
  });

  // Checkbox tambahan fraksi/role → langsung update entry di slotAssignments.
  // Tidak perlu tombol "Simpan" terpisah karena entry adalah referensi
  // langsung ke object di slotAssignments (bukan copy).
  content.querySelectorAll('#extra-fraksi-list input[type="checkbox"]').forEach(cb => {
    cb.onchange = () => {
      entry.extraFraksi = [...content.querySelectorAll('#extra-fraksi-list input:checked')].map(el => el.value);
      editHeroModal(rowIndex, colIndex, entry); // re-render supaya angka sinergi update
      if (typeof window.updateHeroUI === 'function') {
        window.updateHeroUI(slotAssignments, window.GRID_ROWS, window.ALL_HEROES);
      }
    };
  });
  content.querySelectorAll('#extra-role-list input[type="checkbox"]').forEach(cb => {
    cb.onchange = () => {
      entry.extraRole = [...content.querySelectorAll('#extra-role-list input:checked')].map(el => el.value);
      editHeroModal(rowIndex, colIndex, entry);
      if (typeof window.updateHeroUI === 'function') {
        window.updateHeroUI(slotAssignments, window.GRID_ROWS, window.ALL_HEROES);
      }
    };
  });

  content.querySelector('#modal-remove-btn').onclick = () => {
    delete slotAssignments[`${rowIndex}-${colIndex}`];
    renderSlot(rowIndex, colIndex);
    closeDetailModal();
    if (typeof window.updateHeroUI === 'function') {
      window.updateHeroUI(slotAssignments, window.GRID_ROWS, window.ALL_HEROES);
    }
  };

  modal.style.display = 'flex';
}

window.closeDetailModal = function() {
  document.getElementById('detail-modal').style.display = 'none';
};

window.captureGrid = function() {
  return Object.entries(slotAssignments).map(([key, entry]) => {
    const [row, col] = key.split('-').map(Number);
    return {
      row, col, name: entry.name, stars: entry.stars,
      extraFraksi: entry.extraFraksi || [],
      extraRole:   entry.extraRole   || [],
    };
  });
};

// ── Init on load ──
window.addEventListener('DOMContentLoaded', () => {
  buildGlobalGrid();
});