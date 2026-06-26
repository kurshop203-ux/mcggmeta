export const ALUCARD = {
  "fraksi": ["Heartbond"], "role": ["Weapon Master"], "gold": 1,
  "HP": [1840, 3312, 5960], "Physical_ATK": [110, 165, 220], "Magic_ATK": [110, 165, 220], "Jangkauan_ATK": 1,
  "Batas_Mana_Awal": [60, 60, 60], "Batas_Mana": [80, 80, 80], "Mana_Regen_Per_Detik": 0, "Lifesteal": 0, "Spell_Vamp": 0,
  "Physical_Penetration": 0, "Magic_Penetration": 0, "Magic_Def": [36, 36, 36], "Physical_Def": [36, 36, 36], 
  "ATK_Speed": [0.75, 0.75, 0.75],
  "BASIC_ATK": { "formula": [ { "ref": "Magic_ATK", "multiplier": [0,0,0] }, { "ref": "Physical_ATK", "multiplier": [1, 1, 1] } ] },
  "DMG_skill": { "formula": [ { "ref": "Magic_ATK", "multiplier": [0,0,0] }, { "ref": "Physical_ATK", "multiplier": [5, 5, 6.5] } ] }
};