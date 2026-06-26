// Threshold : 2 / 4 / 6 hero Defender berbeda di grid
// Global    : Hybrid_DEF_Flat +6 / +12 / +24 → semua hero
// Role      : Hybrid_DEF_Flat +20 / +30 / +60 → hero Defender
export default {
  key: "Defender",
  targetRole: 'Defender',
  tiers: 3,
  thresholds: [2, 4, 6],  // ← isi sesuai game
  global: {
    Hybrid_DEF_Flat: [6, 12, 24],
  },
  role_bonus: {
    Hybrid_DEF_Flat: [20, 30, 60],
  },
};