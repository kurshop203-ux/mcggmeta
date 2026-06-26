// ════════════════════════════════════════════════════════
// HERO LIST & FILTER — load database, render daftar hero,
//                      dan filter gold/role/fraksi
// ════════════════════════════════════════════════════════
import { ALL_HEROES }    from '../data/heroes/database_hero.js';
import { DATABASE_BUFF } from '../data/buffs/database_buff.js';

window.ALL_HEROES    = ALL_HEROES;
window.DATABASE_BUFF = DATABASE_BUFF;
window.heroImagePath = name => `./data/heroes/images/${name.toLowerCase()}.webp`;

function toArray(v) {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}
window.toArray = toArray;

function renderHeroList() {
  const listEl      = document.getElementById('hero-list');
  const filterGold  = document.getElementById('filter-gold').value;
  const filterRole  = document.getElementById('filter-role').value;
  const filterFraksi = document.getElementById('filter-fraksi').value;
  listEl.innerHTML  = '';

  Object.entries(ALL_HEROES).forEach(([name, data]) => {
    if (filterGold   && String(data.gold) !== filterGold)              return;
    if (filterRole   && !toArray(data.role).includes(filterRole))      return;
    if (filterFraksi && !toArray(data.fraksi).includes(filterFraksi))  return;

    const card = document.createElement('div');
    card.className  = 'hero-card';
    card.innerHTML  = `
      <div class="hero-card-icon">
        <img src="${window.heroImagePath(name)}" alt="${name}"
             onerror="this.parentElement.textContent='${name.substring(0,2).toUpperCase()}'; this.remove();">
      </div>
      <div class="hero-card-info" style="flex:1;">
        <div class="hero-card-name">${name}</div>
        <div class="hero-card-meta">${toArray(data.role).join(', ')} • ${toArray(data.fraksi).join(', ')}</div>
        <div class="hero-card-btns">
          <button class="hc-btn hc-btn-grid" onclick="window.placeHeroInGrid('${name}')">+ Grid</button>
          <button class="hc-btn hc-btn-smart" onclick="window.addHeroToSmart('${name}')">+ Smart</button>
        </div>
      </div>`;
    listEl.appendChild(card);
  });
}

function populateFilterOptions() {
  const roles = new Set(), fraksis = new Set();
  Object.values(ALL_HEROES).forEach(d => {
    toArray(d.role).forEach(r => roles.add(r));
    toArray(d.fraksi).forEach(f => fraksis.add(f));
  });

  const roleSelect   = document.getElementById('filter-role');
  const fraksiSelect = document.getElementById('filter-fraksi');
  [...roles].sort().forEach(r   => { const o = document.createElement('option'); o.value = r; o.textContent = r; roleSelect.appendChild(o); });
  [...fraksis].sort().forEach(f => { const o = document.createElement('option'); o.value = f; o.textContent = f; fraksiSelect.appendChild(o); });
}

window.renderHeroList = renderHeroList;
window.applyFilters   = renderHeroList;

window.addEventListener('DOMContentLoaded', () => {
  populateFilterOptions();
  renderHeroList();
});
