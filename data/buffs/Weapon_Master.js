// Threshold : 2 / 4 / 6 hero Weapon Master berbeda di grid
// Global    : Hybrid_Lifesteal_Bonus +5% / +10% / +15% → semua hero
// Role      : Hybrid_Lifesteal_Bonus +5% / +10% / +15% → hero Weapon Master
//             Physical_ATK_Bonus     +40% / +60% / +100% → hero Weapon Master
export default {
  key: 'Weapon_Master', targetRole: 'Weapon Master', tiers: 3, thresholds: [2, 4, 6],
  global:     { Hybrid_Lifesteal_Bonus: [0.05, 0.1, 0.15] },
  role_bonus: { Hybrid_Lifesteal_Bonus: [0.05, 0.1, 0.15],
                Physical_ATK_Bonus:     [0.4, 0.6, 1] },
};
