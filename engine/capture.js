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
          extraFraksi:    entry.extraFraksi    || [],
          extraRole:      entry.extraRole      || [],
          blessingFraksi: entry.blessingFraksi || [],
          blessingRole:   entry.blessingRole   || [],
        });
      }
    });
  } else {
    Object.entries(slotAssignments).forEach(([key, entry]) => {
      const [row, col] = key.split('-').map(Number);
      filled.push({
        slot: `${row}-${col}`, name: entry.name, stars: entry.stars,
        extraFraksi:    entry.extraFraksi    || [],
        extraRole:      entry.extraRole      || [],
        blessingFraksi: entry.blessingFraksi || [],
        blessingRole:   entry.blessingRole   || [],
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
      blessingFraksi: item.blessingFraksi, blessingRole: item.blessingRole,
    });
  });

  const result = [];

  Object.entries(byName).forEach(([name, entries]) => {
    // Map slot → extras & blessings, untuk lookup balik saat slot sudah diringkas
    const extrasBySlot    = {};
    const blessingsBySlot = {};
    entries.forEach(e => {
  extrasBySlot[e.slot] = { extraFraksi: e.extraFraksi, extraRole: e.extraRole };
  if (e.stars === 1) {
    // ★1 tidak bisa punya blessing — dikosongkan paksa
    // tapi kalau dia merge jadi ★2/★3, blessing dari slot ★2 tetap ikut via getExtras
    blessingsBySlot[e.slot] = { blessingFraksi: [], blessingRole: [] };
  } else {
    // ★2/★3: ambil blessing dari slot, fallback ke storage kalau kosong
    const stored = window.__blessingStorage?.[name] ?? {};
    blessingsBySlot[e.slot] = {
      blessingFraksi: e.blessingFraksi?.length ? e.blessingFraksi : (stored.blessingFraksi ?? []),
      blessingRole:   e.blessingRole?.length   ? e.blessingRole   : (stored.blessingRole   ?? []),
    };
  }
});
const getExtras = slots => {
  const sortedSlots = [...slots].sort((a, b) => a - b);
  const firstSlot   = sortedSlots[0];
  return {
    extraFraksi:    unionArrays(...slots.map(s => extrasBySlot[s]?.extraFraksi)),
    extraRole:      unionArrays(...slots.map(s => extrasBySlot[s]?.extraRole)),
    blessingFraksi: toArray(blessingsBySlot[firstSlot]?.blessingFraksi),
    blessingRole:   toArray(blessingsBySlot[firstSlot]?.blessingRole),
  };
};

    // Pisahkan slot clean vs extra
    const hasExtra = slot => {
      const e = extrasBySlot[slot];
      return (e?.extraFraksi?.length > 0) || (e?.extraRole?.length > 0);
    };

    // Helper: ambil group 3 dari 2 antrian (clean & extra), max 1 extra per group
    function drainGroups(cleanQ, extraQ) {
      const groups = [];
      while (true) {
        const total = cleanQ.length + extraQ.length;
        if (total < 3) break;
        if (cleanQ.length < 2) break; // butuh min 2 clean agar max 1 extra per group
        // Ambil 2 clean dulu
        const group = [cleanQ.shift(), cleanQ.shift()];
        // Slot ke-3: utamakan extra dulu, baru clean
        if (extraQ.length > 0) {
          group.push(extraQ.shift());
        } else if (cleanQ.length > 0) {
          group.push(cleanQ.shift());
        } else {
          // tidak ada slot ke-3 (harusnya tidak terjadi karena total >= 3)
          cleanQ.unshift(group[1]); cleanQ.unshift(group[0]);
          break;
        }
        groups.push(group);
      }
      return groups;
    }

    const b1s_clean = entries.filter(e => e.stars === 1 && !hasExtra(e.slot)).map(e => e.slot);
    const b1s_extra = entries.filter(e => e.stars === 1 &&  hasExtra(e.slot)).map(e => e.slot);
    const realB2s_clean = entries.filter(e => e.stars === 2 && !hasExtra(e.slot)).map(e => e.slot);
    const realB2s_extra = entries.filter(e => e.stars === 2 &&  hasExtra(e.slot)).map(e => e.slot);
    const realB3s = entries.filter(e => e.stars === 3).map(e => e.slot);

    // Tahap 1: tiap 3x ★1 (max 1 extra per group) -> 1 sim ★2
    let b1_clean_q = [...b1s_clean];
    let b1_extra_q = [...b1s_extra];
    const simB2Groups = drainGroups(b1_clean_q, b1_extra_q);

    // Pisahkan sim ★2 yang mengandung extra vs pure clean
    const simB2_clean = simB2Groups.filter(g => !g.some(s => hasExtra(s)));
    const simB2_extra = simB2Groups.filter(g =>  g.some(s => hasExtra(s)));

    // Tahap 2: gabungkan real ★2 + sim ★2, tiap 3 (max 1 extra per group) -> 1 ★3
    const b2_clean_q = [
      ...realB2s_clean.map(slot => [slot]),
      ...simB2_clean,
    ];
    const b2_extra_q = [
      ...realB2s_extra.map(slot => [slot]),
      ...simB2_extra,
    ];

    // drainGroups bekerja pada array of slots, bungkus agar kompatibel
    // (tiap elemen di queue adalah array of source slots, bukan slot tunggal)
    function drainB2Groups(cleanQ, extraQ) {
      const groups = [];
      while (true) {
        const total = cleanQ.length + extraQ.length;
        if (total < 3) break;
        if (cleanQ.length < 2) break;
        const group = [cleanQ.shift(), cleanQ.shift()];
        if (extraQ.length > 0) {
          group.push(extraQ.shift());
        } else if (cleanQ.length > 0) {
          group.push(cleanQ.shift());
        } else {
          cleanQ.unshift(group[1]); cleanQ.unshift(group[0]);
          break;
        }
        groups.push(group);
      }
      return groups;
    }

    const b2MergeGroups = drainB2Groups(b2_clean_q, b2_extra_q);

    b2MergeGroups.forEach(group => {
      const allSources = group.flat().sort((a, b) => a - b);
      const memberUnit = {};
      allSources.forEach((slot, i) => {
        memberUnit[`SLOT ${slot}`] = `A${i + 1}`;
      });
      result.push({ slot: allSources.join('/'), name, stars: 3, member_unit: memberUnit, ...getExtras(allSources) });
    });

    // Sisa ★2 (clean/sim) yang tidak cukup untuk merge jadi ★3
    b2_clean_q.forEach(group => {
      const allSources = group.flat().sort((a, b) => a - b);
      let memberUnit = null;
      if (allSources.length > 1) {
        memberUnit = {};
        allSources.forEach((slot, i) => { memberUnit[`SLOT ${slot}`] = `A${i + 1}`; });
      }
      result.push({ slot: allSources.join('/'), name, stars: 2, member_unit: memberUnit, ...getExtras(allSources) });
    });

    // Sisa ★2 extra yang tidak sempat merge
    b2_extra_q.forEach(group => {
      const allSources = group.flat().sort((a, b) => a - b);
      let memberUnit = null;
      if (allSources.length > 1) {
        memberUnit = {};
        allSources.forEach((slot, i) => { memberUnit[`SLOT ${slot}`] = `A${i + 1}`; });
      }
      result.push({ slot: allSources.join('/'), name, stars: 2, member_unit: memberUnit, ...getExtras(allSources) });
    });

    // Real ★3 yang sudah ada sejak awal
    realB3s.forEach(slot => {
      result.push({ slot: String(slot), name, stars: 3, member_unit: null, ...getExtras([slot]) });
    });

    // Sisa ★1 clean yang tidak cukup untuk merge
    b1_clean_q.forEach(slot => {
      result.push({ slot: String(slot), name, stars: 1, member_unit: null, ...getExtras([slot]) });
    });

    // Sisa ★1 extra yang tidak sempat merge
    b1_extra_q.forEach(slot => {
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

  // ── DEBUG: intermediate merge state per nama hero ──
  const debug = {};
  const filled = [];
  if (gridRows) {
    let globalIndex = 0;
    gridRows.forEach((rowInfo, rowIndex) => {
      for (let c = 0; c < rowInfo.count; c++) {
        globalIndex++;
        const key = `${rowIndex}-${c}`;
        const entry = slotAssignments[key];
        if (entry) filled.push({ slot: globalIndex, name: entry.name, stars: entry.stars, extraFraksi: entry.extraFraksi || [], extraRole: entry.extraRole || [] });
      }
    });
  }
  const byName = {};
  filled.forEach(item => {
    if (!byName[item.name]) byName[item.name] = [];
    byName[item.name].push(item);
  });
  const hasExtra = (e) => (e.extraFraksi?.length > 0) || (e.extraRole?.length > 0);
  Object.entries(byName).forEach(([name, entries]) => {
    const b1s_clean     = entries.filter(e => e.stars === 1 && !hasExtra(e)).map(e => e.slot);
    const b1s_extra     = entries.filter(e => e.stars === 1 &&  hasExtra(e)).map(e => e.slot);
    const realB2s_clean = entries.filter(e => e.stars === 2 && !hasExtra(e)).map(e => e.slot);
    const realB2s_extra = entries.filter(e => e.stars === 2 &&  hasExtra(e)).map(e => e.slot);
    const realB3s       = entries.filter(e => e.stars === 3).map(e => e.slot);
    debug[name] = { b1s_clean, b1s_extra, realB2s_clean, realB2s_extra, realB3s };
  });

  const output = { data, __debug: debug };
  const json = JSON.stringify(output, null, 2);
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
      // Blessing: TIDAK di-union ke fraksi/role — disimpan terpisah
      // supaya buff_engine bisa hitung bonus count tersendiri.
      const blessingFraksi = toArray(item.blessingFraksi);
      const blessingRole   = toArray(item.blessingRole);
      return {
        name:   item.name,
        stars:  item.stars,
        label:  item.label,
        slot:   item.slot,
        fraksi: fraksi.length ? fraksi : null,
        role:   role.length ? role : null,
        fraksiExtra:    fraksiExtra.length    ? fraksiExtra    : null,
        roleExtra:      roleExtra.length      ? roleExtra      : null,
        blessingFraksi: blessingFraksi.length ? blessingFraksi : null,
        blessingRole:   blessingRole.length   ? blessingRole   : null,
      };
    });
}