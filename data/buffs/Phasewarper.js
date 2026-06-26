// Threshold : 2 / 3 hero Phasewarper berbeda di grid
// Role      : DMG_Bonus +10% / +20% → hero Phasewarper
//             Heal_Percent_HP +35% / +55% → hero Phasewarper
export default {
  key: "Phasewarper",
  targetRole: 'Phasewarper',
  tiers: 2,
  thresholds: [2, 3],
  role_bonus: {
    DMG_Bonus: [0.1, 0.2],
    Heal_Percent_HP: [0.35, 0.55],
  },
};