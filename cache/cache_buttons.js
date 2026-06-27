// cache_buttons.js — handler tombol cache (Export, Import)
// Di-load oleh index.html via <script type="module" src="./cache_buttons.js">

import { exportCacheFiles, importScores, clearCache } from './cache_manager.js';

// ── EXPORT ────────────────────────────────────────────────────────
document.getElementById('btn-export-cache').addEventListener('click', async () => {
  const { scoreCount } = await exportCacheFiles();
  alert(`✅ Export selesai — ${scoreCount} entry`);
});

// ── IMPORT ────────────────────────────────────────────────────────
document.getElementById('btn-import-cache').addEventListener('click', () => {
  document.getElementById('input-import-cache').click();
});

document.getElementById('btn-clear-cache').addEventListener('click', async () => {
  if (!confirm('Yakin mau clear semua cache?')) return;
  await clearCache();
  alert('✅ Cache berhasil dihapus');
});

document.getElementById('input-import-cache').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const entries = JSON.parse(await file.text());
  await importScores(entries);
  alert(`✅ Import selesai — ${entries.length} entry dimuat ke cache.`);
  e.target.value = '';
});