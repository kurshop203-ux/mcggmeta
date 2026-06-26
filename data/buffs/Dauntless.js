// Threshold : 2 / 4 / 6 hero Dauntless berbeda di grid
// Global    : Shield_Percent_HP +5% / +10% / +20% → semua hero
// Role      : Shield_Percent_HP +25% / +45% / +90% → hero Dauntless
export default {
  key: 'Dauntless', targetRole: 'Dauntless', tiers: 3, thresholds: [2, 4, 6],
  global:     { Shield_Percent_HP: [0.05, 0.1, 0.2] },
  role_bonus: { Shield_Percent_HP: [0.25, 0.45, 0.9] },
};
