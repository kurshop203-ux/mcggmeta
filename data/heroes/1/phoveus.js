export const PHOVEUS = {
  "fraksi": "Exorcist", "role": "Scavenger", "gold": 1,
  "HP": [2030, 3654, 6575], "Physical_ATK": [105, 160, 210], "Magic_ATK": [105, 160, 210], "Jangkauan_ATK": 1,
  "Batas_Mana_Awal": [30, 30, 30], "Batas_Mana": [50, 50, 50], "Mana_Regen_Per_Detik": 0, "Lifesteal": 0, "Spell_Vamp": 0,
  "Physical_Penetration": 0, "Magic_Penetration": 0, "Magic_Def": [36, 36, 36], "Physical_Def": [36, 36, 36],
  "ATK_Speed": [0.65, 0.65, 0.65],
  "BASIC_ATK": { "formula": [ { "ref": "Magic_ATK", "multiplier": [1, 1, 1] }, { "ref": "Physical_ATK", "multiplier": [1, 1, 1] } ] },
  "DMG_skill": { "formula": [ { "ref": "Magic_ATK", "multiplier": [2.0, 2.4, 2.8] }, { "ref": "Physical_ATK", "multiplier": [2.50, 2.50, 3.40] } ], "skill_handler": { "type": "buff", "label": "Shield", "shield_now": [0.08, 0.08, 0.10] } }
};