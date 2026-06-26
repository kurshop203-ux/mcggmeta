export const EUDORA = {
  "fraksi": "Dragoncaller", "role": "Stargazer", "gold": 1,
  "HP": [1550, 2790, 5020], "Physical_ATK": [80, 120, 160], "Magic_ATK": [80, 120, 160], "Jangkauan_ATK": 4,
  "Batas_Mana_Awal": [30, 30, 30], "Batas_Mana": [30, 30, 30], "Mana_Regen_Per_Detik": 0, "Lifesteal": 0, "Spell_Vamp": 0,
  "Physical_Penetration": 0, "Magic_Penetration": 0, "Magic_Def": [36, 36, 36], "Physical_Def": [36, 36, 36],
  "ATK_Speed": [0.75, 0.75, 0.75],
  "BASIC_ATK": { "formula": [ { "ref": "Magic_ATK", "multiplier": [0,0,0] }, { "ref": "Physical_ATK", "multiplier": [1, 1, 1] } ] },
  "DMG_skill": { "formula": [ { "ref": "Magic_ATK", "multiplier": [4.3,4.3,5.2] }, { "ref": "Physical_ATK", "multiplier": [0,0,0] } ] }
};