// Threshold : 2 / 4 / 6 hero Mage berbeda di grid
// Global    : Magic_ATK_Bonus +10% / +20% / +30% → semua hero
// Role      : Magic_ATK_Bonus +40% / +80% / +120% → hero Mage
export default {
  key: 'Mage', targetRole: 'Mage', tiers: 3, thresholds: [2, 4, 6],
  global:     { Magic_ATK_Bonus: [0.1, 0.2, 0.3] },
  role_bonus: { Magic_ATK_Bonus: [0.4, 0.8, 1.2] },
};
