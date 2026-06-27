const AUTOROLL_ROWS = [2, 2, 2, 2, 2]; // sejajar arena row 1-5
const arSlots = [];

function buildAutoRollGrid() {
  const wrap = document.getElementById('autoroll-grid');
  if (!wrap) return;
  wrap.innerHTML = '';
 wrap.style.cssText = 'display:flex; flex-direction:column; gap:8px;';

  let idx = 0;
  AUTOROLL_ROWS.forEach((count, rowIndex) => {
    const rowDiv = document.createElement('div');
    rowDiv.style.cssText = 'display:flex; gap:10px; justify-content:center; height:52px; align-items:center;';
    for (let c = 0; c < count; c++) {
      const slot = document.createElement('div');
      slot.className = 'grid-slot-placeholder';
      slot.id = `ar-slot-${idx}`;
      arSlots[idx] = null;
      idx++;
      rowDiv.appendChild(slot);
    }
    wrap.appendChild(rowDiv);
  });

  // Baris aksi: 1 kosongkan + 2 jalankan
  const actionRow = document.createElement('div');
  actionRow.style.cssText = 'display:flex; gap:10px; justify-content:center;';

  const btnKosong = document.createElement('div');
  btnKosong.className = 'grid-slot-placeholder';
  btnKosong.style.cssText = 'border-color:#e74c3c; background:rgba(231,76,60,0.08); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:0.6rem; color:#e74c3c; font-weight:bold; text-align:center; padding:4px;';
  btnKosong.innerHTML = '🗑<br>Kosong';
  btnKosong.onclick = () => {
    arSlots.fill(null);
    buildAutoRollGrid();
  };

  const btnJalan1 = document.createElement('div');
  btnJalan1.className = 'grid-slot-placeholder';
  btnJalan1.style.cssText = 'border-color:#27ae60; background:rgba(39,174,96,0.08); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:0.6rem; color:#27ae60; font-weight:bold; text-align:center; padding:4px;';
  btnJalan1.innerHTML = '🚀<br>Run';


  actionRow.appendChild(btnKosong);
  actionRow.appendChild(btnJalan1);

  wrap.appendChild(actionRow);
}

window.addEventListener('DOMContentLoaded', () => {
  buildAutoRollGrid();
});