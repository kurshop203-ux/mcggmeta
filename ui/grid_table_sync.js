import { captureGridToClipboard, get_the_hero_list_from_the_merged_grid } from '../engine/capture.js';
import { updateHeroUI }  from './find_combo.js';
import { applyAllBuffs } from '../engine/buff_engine.js';

function refreshTable() {
  updateHeroUI(
    window.slotAssignments,
    window.GRID_ROWS,
    window.ALL_HEROES
  );
}

// ── Auto-refresh tabel saat hero ditaruh ke grid ──
const _origPlace = window.placeHeroInGrid;
window.placeHeroInGrid = function (name) {
  _origPlace(name);
  refreshTable();
};

// ── Jaring pengaman: refresh tabel kalau grid berubah lewat jalur lain ──
new MutationObserver(() => refreshTable()).observe(
  document.getElementById('global-grid-wrap'),
  { subtree: true, childList: true, characterData: true, attributes: true }
);



// ── Tombol: Capture Grid ──
document.getElementById('btn-capture-grid').addEventListener('click', async () => {
  const result = await captureGridToClipboard(window.slotAssignments, window.GRID_ROWS);
  alert(result.success
    ? 'Data grid disalin ke clipboard:\n\n' + result.json
    : 'Gagal menyalin ke clipboard. Data:\n\n' + result.json
  );
});

// ── Tombol: Copy Buffs ──
document.getElementById('btn-copy-buffs').addEventListener('click', async () => {
  const heroList = get_the_hero_list_from_the_merged_grid(
    window.slotAssignments,
    window.GRID_ROWS,
    window.ALL_HEROES
  );

  if (heroList.length === 0) {
    alert('Grid kosong.');
    return;
  }

  applyAllBuffs(heroList);

  // Buang fungsi/property yang tidak bisa di-JSON-kan
  const output = heroList.map(h => ({
    name:    h.name,
    label:   h.label,
    stars:   h.stars,
    role:    h.role,
    fraksi:  h.fraksi,
    buffs:   h.buffs,
    buffLog: h.buffLog,
  }));

  const json = JSON.stringify(output, null, 2);
  try {
    await navigator.clipboard.writeText(json);
    alert('Buff berhasil disalin ke clipboard!');
  } catch {
    alert('Gagal salin. Data:\n\n' + json);
  }
});

// ── Tombol: Toggle Hero Table ──
document.getElementById('btn-toggle-hero-table').addEventListener('click', () => {
  const modal = document.getElementById('hero-table-modal');
  if (!modal) return;
  modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
});
