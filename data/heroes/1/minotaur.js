export const MINOTAUR = {
  "fraksi": "Astro Power", "role": "Defender", "gold": 1, "bonus_power_pasif": 1000, "bonus_power_meta": 2000,
  "HP": [2030, 3654, 6575], "Physical_ATK": [105, 160, 210], "Magic_ATK": [105, 160, 210], "Jangkauan_ATK": 1,
  "Batas_Mana_Awal": [60, 60, 60], "Batas_Mana": [80, 80, 80], "Mana_Regen_Per_Detik": 0, "Lifesteal": 0, "Spell_Vamp": 0,
  "Physical_Penetration": 0, "Magic_Penetration": 0, "Magic_Def": [36, 36, 36], "Physical_Def": [36, 36, 36],
  "ATK_Speed": [0.65, 0.65, 0.65],
  "BASIC_ATK": { "formula": [ { "ref": "Magic_ATK", "multiplier": [0,0,0] }, { "ref": "Physical_ATK", "multiplier": [1, 1, 1] } ] },
  "DMG_skill": { "formula": [ { "ref": "Magic_ATK", "multiplier": [0,0,0] }, { "ref": "Physical_ATK", "multiplier": [0,0,0] } ], "skill_handler": { "type": "buff", "label": "Minotaur Heal", "heal_now": [0.20, 0.20, 0.30] } },
  "passive_shield_flat": [350, 630, 1880]
};