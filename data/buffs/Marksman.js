// Threshold : 2 / 4 / 6 hero Marksman berbeda di grid
// Global    : ATK_Speed_Bonus +5% / +10% / +20% → semua hero
// Role      : ATK_Speed_Bonus +20% / +45% / +90% → hero Marksman
export default {
  key: 'Marksman', targetRole: 'Marksman', tiers: 3, thresholds: [2, 4, 6],
  global:     { ATK_Speed_Bonus: [0.05, 0.1, 0.2] },
  role_bonus: { ATK_Speed_Bonus: [0.2, 0.45, 0.9] },
};
