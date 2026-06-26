// Threshold : 2 / 4 / 6 hero Swiftblade berbeda di grid
// Global    : Hybrid_Pen_Flat +10 / +15 / +25 → semua hero
// Role      : Hybrid_Pen_Flat +30 / +60 / +120 → hero Swiftblade
export default {
  key: 'Swiftblade', targetRole: 'Swiftblade', tiers: 3, thresholds: [2, 4, 6],
  global:     { Hybrid_Pen_Flat: [10, 15, 25] },
  role_bonus: { Hybrid_Pen_Flat: [30, 60, 120] },
};
