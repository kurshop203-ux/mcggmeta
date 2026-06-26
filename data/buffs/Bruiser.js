// ════════════════════════════════════════════════════════════════
// Bruiser.js
// Data sinergi role Bruiser.
//
// Threshold : 2 / 4 / 6 hero Bruiser berbeda di grid
// Bonus     : hanya ke hero Bruiser (role_bonus)
//
//   Tier 1 (2 hero) → Basic_ATK_DMG_Bonus +15%, Double_ATK_Chance +10%
//   Tier 2 (4 hero) → Basic_ATK_DMG_Bonus +35%, Double_ATK_Chance +30%
//   Tier 3 (6 hero) → Basic_ATK_DMG_Bonus +60%, Double_ATK_Chance +50%
// ════════════════════════════════════════════════════════════════
export default {
  key: "Bruiser",
  targetRole: 'Bruiser',
  tiers: 3,
  thresholds: [2, 4, 6],
  global: {},
  role_bonus: {
    Basic_ATK_DMG_Bonus: [0.15, 0.35, 0.6],
    Double_ATK_Chance:   [0.1,  0.3,  0.5],
  },
};