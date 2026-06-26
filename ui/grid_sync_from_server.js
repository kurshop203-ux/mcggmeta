// ════════════════════════════════════════════════════════
// GRID SYNC FROM SERVER — WebSocket client, terima data
//                         dari Python dan apply ke grid
//
// J kirim type="arena_bench" → hapus SEMUA row 0-3, isi ulang
// K kirim type="shop"        → hapus SEMUA row 4, isi ulang
// Keduanya tidak saling hapus satu sama lain
// ════════════════════════════════════════════════════════

function _doApplySlots(slots, clearRows) {
  // 1. Hapus semua slot pada baris yang ditentukan
  Object.keys(window.slotAssignments).forEach(key => {
    const row = parseInt(key.split('-')[0]);
    if (clearRows.includes(row)) {
      delete window.slotAssignments[key];
      const [r, c] = key.split('-').map(Number);
      renderSlot(r, c);
    }
  });

  // 2. Isi slot baru
  let isi = 0, skip = 0;
  Object.entries(slots).forEach(([key, entry]) => {
    if (window.ALL_HEROES && !window.ALL_HEROES[entry.name]) {
      console.warn('[applySlots] Nama tidak dikenal:', entry.name);
      skip++;
    }
    window.slotAssignments[key] = {
      name: entry.name, stars: entry.stars,
      extraFraksi: entry.extraFraksi || [],
      extraRole:   entry.extraRole   || [],
    };
    const [r, c] = key.split('-').map(Number);
    renderSlot(r, c);
    isi++;
  });

  console.log(`[applySlots] ${isi} slot diisi, ${skip} tidak dikenal`);
}

window._applySlots = function(slots, type) {
  // type: "arena_bench" (J) → bersihkan row 0,1,2,3
  //       "shop"        (K) → bersihkan row 4
  const clearRows = (type === 'shop') ? [4] : [0, 1, 2, 3];

  if (window.ALL_HEROES && window.slotAssignments !== undefined) {
    _doApplySlots(slots, clearRows);
  } else {
    console.warn('[applySlots] ALL_HEROES belum siap, menunggu...');
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (window.ALL_HEROES && window.slotAssignments !== undefined) {
        clearInterval(timer);
        _doApplySlots(slots, clearRows);
      } else if (tries >= 30) {
        clearInterval(timer);
        console.error('[applySlots] Timeout — ALL_HEROES tidak siap setelah 3 detik');
      }
    }, 100);
  }
};

// WebSocket client — terima data dari Python server
(function() {
  const ws = new WebSocket('ws://localhost:8765');
  ws.onopen    = () => console.log('[WS] Terhubung ke Python');
  ws.onclose   = () => console.warn('[WS] Terputus dari Python');
  ws.onerror   = (e) => console.error('[WS] Error:', e);
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'apply_slots') {
      window._applySlots(msg.slots, msg.slotType);
    }
  };
  window._ws = ws;

  // ── Terima response smart_placement dari server ──
  const _origOnMessage = ws.onmessage;
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'smart_placement_log') {
      spAppendLog(msg.level, msg.msg);
    } else if (msg.type === 'smart_placement_status') {
      spHandleStatus(msg);
    } else if (_origOnMessage) {
      _origOnMessage(event);
    }
  };

})();
