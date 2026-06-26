function toArray(v) {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}
function unionArrays(...arrays) {
  const set = new Set();
  arrays.forEach(arr => toArray(arr).forEach(v => set.add(v)));
  return [...set];
}
//memproses raw slot assignments jadi daftar hero yang sudah dimerge.
export function combine_heroes_then_prepare_a_list_of_heroes_that_have_been_merged(slotAssignments, gridRows) {
  // Kumpulkan semua slot terisi dengan urutan global 1..N
  const filled = [];
  if (gridRows) {
    let globalIndex = 0;
    gridRows.forEach((rowInfo, rowIndex) => {
      for (let c = 0; c < rowInfo.count; c++) {
        globalIndex++;
        const key = `${rowIndex}-${c}`;
        const entry = slotAssignments[key];
        if (entry) filled.push({
          slot: globalIndex, name: entry.name, stars: entry.stars,
          extraFraksi: entry.extraFraksi || [],
          extraRole:   entry.extraRole   || [],
        });
      }
    });
  } else {
    Object.entries(slotAssignments).forEach(([key, entry]) => {
      const [row, col] = key.split('-').map(Number);
      filled.push({
        slot: `${row}-${col}`, name: entry.name, stars: entry.stars,
        extraFraksi: entry.extraFraksi || [],
        extraRole:   entry.extraRole   || [],
      });
    });
  }

  // Kelompokkan per nama hero, simpan stars asli + slot tiap unit
  const byName = {};
  filled.forEach(item => {
    if (!byName[item.name]) byName[item.name] = [];
    byName[item.name].push({
      slot: item.slot, stars: item.stars,
      extraFraksi: item.extraFraksi, extraRole: item.extraRole,
    });
  });

  const result = [];

  Object.entries(byName).forEach(([name, entries]) => {
    // Map slot → extras, untuk lookup balik saat slot sudah diringkas
    // jadi angka saja di b1s/realB2s/realB3s.
    const extrasBySlot = {};
    entries.forEach(e => {
      extrasBySlot[e.slot] = { extraFraksi: e.extraFraksi, extraRole: e.extraRole };
    });
    const getExtras = slots => ({
      extraFraksi: unionArrays(...slots.map(s => extrasBySlot[s]?.extraFraksi)),
      extraRole:   unionArrays(...slots.map(s => extrasBySlot[s]?.extraRole)),
    });

    const b1s = entries.filter(e => e.stars === 1).map(e => e.slot);
    const realB2s = entries.filter(e => e.stars === 2).map(e => e.slot);
    const realB3s = entries.filter(e => e.stars === 3).map(e => e.slot);

    // Tahap 1: tiap 3x ★1 -> 1 sim ★2
    const simB2Groups = []; // each: array of source slots
    let b1Queue = [...b1s];
    while (b1Queue.length >= 3) {
      simB2Groups.push(b1Queue.splice(0, 3));
    }
    const leftoverB1 = b1Queue; // sisa ★1 yang tidak cukup untuk merge

    // Tahap 2: gabungkan real ★2 + sim ★2 (dari tahap 1), tiap 3 -> 1 ★3
    const allB2Slots = [
      ...realB2s.map(slot => [slot]),       // real ★2: sourceSlots = [slot sendiri]
      ...simB2Groups,                        // sim ★2: sourceSlots = 3 slot ★1 asal
    ];
    let b2Queue = [...allB2Slots];
    while (b2Queue.length >= 3) {
      const group = b2Queue.splice(0, 3);
      const allSources = group.flat();
      const memberUnit = {};
      allSources.forEach((slot, i) => {
        memberUnit[`SLOT ${slot}`] = `A${i + 1}`;
      });
      result.push({ slot: allSources.join('/'), name, stars: 3, member_unit: memberUnit, ...getExtras(allSources) });
    }
    const leftoverB2Groups = b2Queue; // sisa kelompok ★2 (real atau sim) yang tidak cukup utk ★3

    // Sisa ★2 (real/sim) yang belum sempat jadi ★3
    leftoverB2Groups.forEach(group => {
      let memberUnit = null;
      if (group.length > 1) {
        memberUnit = {};
        group.forEach((slot, i) => {
          memberUnit[`SLOT ${slot}`] = `A${i + 1}`;
        });
      }
      result.push({ slot: group.join('/'), name, stars: 2, member_unit: memberUnit, ...getExtras(group) });
    });

    // Real ★3 yang sudah ada sejak awal
    realB3s.forEach(slot => {
      result.push({ slot: String(slot), name, stars: 3, member_unit: null, ...getExtras([slot]) });
    });

    // Sisa ★1 yang tidak cukup untuk digabung
    leftoverB1.forEach(slot => {
      result.push({ slot: String(slot), name, stars: 1, member_unit: null, ...getExtras([slot]) });
    });
  });

  // Setiap entry unit_count = 1
  result.forEach(item => {
    item.unit_count = 1;
  });

  // Total unit per nama, dimasukkan sebagai entry tersendiri di akhir array
  const totalUnitByName = {};
  result.forEach(item => {
    totalUnitByName[item.name] = (totalUnitByName[item.name] || 0) + 1;
  });

  // ── computeDuplicateLabels ─────────────────────────────────
  // Assign label a1/a2/a3, b1, c1 dst per grup hero duplikat.
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const byNameForLabel = {};
  result.forEach((item, idx) => {
    if (!byNameForLabel[item.name]) byNameForLabel[item.name] = [];
    byNameForLabel[item.name].push(idx);
  });

  Object.entries(byNameForLabel).forEach(([name, indices]) => {
    if (indices.length <= 1) {
      indices.forEach(idx => {
        result[idx].label = `${name} a`;
      });
      return;
    }

    // Urutkan berdasarkan stars descending
    const sorted = [...indices].sort((a, b) => result[b].stars - result[a].stars);
    const b2plus = sorted.filter(idx => result[idx].stars >= 2);
    const b1s = sorted.filter(idx => result[idx].stars === 1);
    let letterIdx = 0;

    b2plus.forEach(idx => {
      const letter = LETTERS[letterIdx++] || `G${letterIdx}`;
      result[idx].label = `${name} ${letter.toLowerCase()}`;
    });

    let b1Queue = [...b1s];
    while (b1Queue.length > 0) {
      const letter = LETTERS[letterIdx++] || `G${letterIdx}`;
      if (b1Queue.length >= 3) {
        const group = b1Queue.splice(0, 3);
        group.forEach((idx) => {
          result[idx].label = `${name} ${letter.toLowerCase()}`;
        });
      } else {
        const idx = b1Queue.splice(0, 1)[0];
        result[idx].label = `${name} ${letter.toLowerCase()}`;
      }
    }
  });

  Object.entries(totalUnitByName).forEach(([name, total]) => {
    result.push({ name, total_unit: total });
  });

  return result;
}
//  convert hasilnya ke JSON → salin ke clipboard
export async function captureGridToClipboard(slotAssignments, gridRows) {
  const data = combine_heroes_then_prepare_a_list_of_heroes_that_have_been_merged(slotAssignments, gridRows);
  const json = JSON.stringify(data, null, 2);
  try {
    await navigator.clipboard.writeText(json);
    return { success: true, data, json };
  } catch (err) {
    return { success: false, error: err, data, json };
  }
}
// gabungkan fraksi/role dasar + extra pilihan user → hasilnya array bersih siap dipakai engine.
export function get_the_hero_list_from_the_merged_grid(slotAssignments, gridRows, ALL_HEROES) {
  const full = combine_heroes_then_prepare_a_list_of_heroes_that_have_been_merged(slotAssignments, gridRows);
  return full
    .filter(item => item.stars !== undefined) // buang entry { name, total_unit }
    .map(item => {
      const base = ALL_HEROES?.[item.name];
      // Gabungkan fraksi/role DASAR (dari database_hero.js) dengan
      // EXTRA (dipilih manual user, sudah di-union sesuai unit hasil merge).
      // Hasilnya array gabungan — find_combo.js cukup baca array ini,
      // tidak perlu tahu mana yang dasar mana yang tambahan.
      const fraksi = unionArrays(base?.fraksi, item.extraFraksi);
      const role   = unionArrays(base?.role,   item.extraRole);
      // Simpan extra terpisah supaya autoFillSmartPlacement bisa tahu mana yang dipilih user
      const fraksiExtra = toArray(item.extraFraksi);
      const roleExtra   = toArray(item.extraRole);
      return {
        name:   item.name,
        stars:  item.stars,
        label:  item.label,
        slot:   item.slot,  // dibutuhkan highlightComboSlots
        fraksi: fraksi.length ? fraksi : null,
        role:   role.length ? role : null,
        fraksiExtra: fraksiExtra.length ? fraksiExtra : null,  // null kalau tidak ada extra
        roleExtra:   roleExtra.length   ? roleExtra   : null,  // null kalau tidak ada extra
      };
    });
}