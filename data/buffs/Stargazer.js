// Threshold : 2 / 4 / 6 hero Stargazer berbeda di grid
// Global    : Mana_Regen_Flat +2 / +4 / +6 → semua hero
// Role      : Mana_Regen_Flat +6 / +12 / +16 → hero Stargazer
export default {
  key: 'Stargazer', targetRole: 'Stargazer', tiers: 3, thresholds: [2, 4, 6],
  global:     { Mana_Regen_Flat: [2, 4, 6] },
  role_bonus: { Mana_Regen_Flat: [6, 12, 16] },
};
