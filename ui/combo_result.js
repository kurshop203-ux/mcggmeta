import { simulateBattle }                           from '../engine/simulate_battle.js';
import { renderSimulationHTML }                     from './render_simulation.js';
import { DATABASE_BUFF }                            from '../data/buffs/database_buff.js';
import { verifyCacheIntegrity, getCacheComparison } from '../engine/comboengine.js';

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
function getHeroImagePath(name) {
  return window.heroImagePath(name);
}

// ── UI: SCORE LIST ────────────────────────────────────────────
export function renderScoreList(heroes, simResults = {}) {
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
    const sim          = simResults[hero.label ?? hero.name];
    const damageTotal  = sim?.damageTotal  ?? 0;
    const sustainTotal = sim?.sustainTotal ?? 0;

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
      <div style="font-size:0.7rem; color:#999; font-family:'Share Tech Mono',monospace; display:flex; align-items:center; gap:4px; flex-wrap:wrap;">
        ${stars} · ${renderIcons(hero.role, { size: 16 }) || '-'}
        <span style="color:#444;">•</span>
        ${renderIcons(hero.fraksi, { size: 16 }) || '-'}
      </div>
      ${(toArray(hero.roleExtra).length || toArray(hero.fraksiExtra).length) ? `
      <div style="display:flex; align-items:center; gap:3px; flex-wrap:wrap; margin-top:2px;">
        <span style="font-size:0.65rem; color:#555;">+</span>
        ${renderIcons(hero.roleExtra, { size: 14 })}
        ${renderIcons(hero.fraksiExtra, { size: 14 })}
      </div>` : ''}
      ${(toArray(hero.blessingRole).length || toArray(hero.blessingFraksi).length) ? `
      <div style="display:flex; align-items:center; gap:3px; flex-wrap:wrap; margin-top:2px;">
        <span style="font-size:0.65rem; color:#e91e8c;">✦</span>
        ${renderIcons(hero.blessingRole, { size: 14 })}
        ${renderIcons(hero.blessingFraksi, { size: 14 })}
      </div>` : ''}
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

    card.addEventListener('mouseenter', () => card.style.borderColor = '#d4af37');
    card.addEventListener('mouseleave', () => card.style.borderColor = '#333');
    card.addEventListener('click', () => {
      const s = simResults[hero.label ?? hero.name];
      showBuffDetail(s?.hero ?? hero, s);
    });

    container.appendChild(card);
  });

  sidebar.appendChild(container);
}

// ── UI: MODAL DETAIL ──────────────────────────────────────────
export function showBuffDetail(hero, simCached = null) {
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

// ── UI: HIGHLIGHT SLOT ────────────────────────────────────────
export function highlightComboSlots(selectedHeroes) {
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

// ── NOTIFIKASI INTEGRITAS CACHE ───────────────────────────────
export function notifyCacheIntegrityIssue(mismatches) {
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
    banner.addEventListener('click', () => banner.remove());
    document.body.appendChild(banner);
  }
  banner.innerHTML = `
    ⚠ Cache tidak akurat untuk ${mismatches.length} hero.<br>
    Kemungkinan ada bug di buildCacheKey / profil buff.<br>
    Detail lengkap ada di console (F12).
  `;
}

// ── DEBUG: CACHE KEY ──────────────────────────────────────────
export async function showCacheKeyDebug() {
  const lastResult = window.__lastComboResult;
  if (!lastResult) {
    alert('Belum ada hasil combo. Jalankan 🔍 Cari dulu, baru cek cache key-nya.');
    return;
  }

  const comparison = await getCacheComparison(lastResult.selectedHeroes, lastResult.simResults);
  if (comparison.length === 0) {
    alert('Tidak ada hero untuk dibandingkan.');
    return;
  }

  console.log('[Cache VS Debug]', comparison);
  renderCacheKeyDebugBanner(comparison);
}

function renderCacheKeyDebugBanner(comparison) {
  let banner = document.getElementById('cache-key-debug-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'cache-key-debug-banner';
    banner.style.cssText = `
      position: fixed; bottom: 16px; right: 16px; z-index: 9999;
      background: #14202a; border: 1px solid #3498db; border-radius: 6px;
      color: #aed6f1; font-family: 'Share Tech Mono', monospace;
      font-size: 0.72rem; padding: 10px 14px; max-width: 420px;
      max-height: 320px; overflow-y: auto;
      box-shadow: 0 2px 10px rgba(0,0,0,0.4); cursor: pointer;
    `;
    banner.title = 'Klik untuk tutup';
    banner.addEventListener('click', () => banner.remove());
    document.body.appendChild(banner);
  }

  const STATUS_COLOR = {
    MATCH:    '#27ae60',
    MISMATCH: '#e74c3c',
    MISS:     '#e67e22',
    SKIP:     '#666',
  };
  const fmt = n => Math.round(n).toLocaleString('id-ID');

  const matchCount = comparison.filter(c => c.status === 'MATCH').length;

  banner.innerHTML = `
    <div style="color:#3498db; margin-bottom:8px;">
      🔑 VS Cache: Saat Cari Kombo ↔ Final Resim (${matchCount}/${comparison.length} match)
    </div>
    ${comparison.map(({ label, cacheKey, cached, final, status, phases }) => `
      <div style="margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid #233;">
        <div>
          <span style="color:${STATUS_COLOR[status]};">●</span>
          <span style="color:#fff; font-weight:bold;">${label}</span>
          <span style="color:${STATUS_COLOR[status]};">[${status}]</span>
        </div>
        ${phases && phases.length > 0
          ? phases.map(({ phase, cacheKey: pKey, cached: pCached }) => `
            <div style="margin-top:4px; padding-left:8px; border-left:2px solid #2c3e50;">
              <div style="color:#f39c12; font-size:0.66rem;">[${phase}]</div>
              <div style="color:#85c1e9; word-break:break-all; font-size:0.68rem;">${pKey}</div>
              <div style="color:#bbb; font-size:0.72rem;">
                ⚔ ${pCached ? fmt(pCached.damageTotal) : '-'} · 🛡 ${pCached ? fmt(pCached.sustainTotal) : '-'}
              </div>
            </div>
          `).join('')
          : `<div style="color:#85c1e9; word-break:break-all; font-size:0.68rem; margin:2px 0;">${cacheKey ?? '— (skip cache)'}</div>`
        }
        <div style="color:#bbb; margin-top:4px;">
          Final resim: ⚔ ${fmt(final.damageTotal)} · 🛡 ${fmt(final.sustainTotal)}
        </div>
      </div>
    `).join('')}
  `;
}
