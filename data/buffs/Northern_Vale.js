export default {
  key:          'Northern_Vale',
  label:        'Northern Vale',
  targetFraksi: 'Northern Vale',
  tiers:         2,
  thresholds:   [2, 3],
  global:       {},
  role_bonus: {
    Skill_DMG_Bonus: [0.20, 0.35], // tetap di sini
  },
  handler({ qualifying, tierIndex }) {
    qualifying.forEach(hero => {
      hero.passive_mana_pct    = [0.60, 1.00][tierIndex];
      hero.northern_vale_tier  = tierIndex + 1;
    });
  },
};