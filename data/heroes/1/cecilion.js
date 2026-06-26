export const CECILION = {
  "fraksi": "Emberlord", "role": "Mage", "gold": 1,
  "HP": [1550, 2790, 4650], "Physical_ATK": [80, 120, 160], "Magic_ATK": [80, 120, 160], "Jangkauan_ATK": 4,
  "Batas_Mana_Awal": [20, 20, 20], "Batas_Mana": [40, 40, 40], "Mana_Regen_Per_Detik": 0, "Lifesteal": 0, "Spell_Vamp": 0,
  "Physical_Penetration": 0, "Magic_Penetration": 0, "Magic_Def": [36, 36, 36], "Physical_Def": [36, 36, 36],
  "ATK_Speed": [0.75, 0.75, 0.75],
  "BASIC_ATK": { "formula": [ { "ref": "Magic_ATK", "multiplier": [0,0,0] }, { "ref": "Physical_ATK", "multiplier": [1, 1, 1] } ] },
  "DMG_skill": { "formula": [ { "ref": "Magic_ATK", "multiplier": [7.35,7.35,8.85] }, { "ref": "Physical_ATK", "multiplier": [0,0,0] } ] },
  "passive_mana_flat": [10, 10, 10]
};