export const SILVANNA = {
  "fraksi": "Mystic Meow", "role": "Dauntless", "gold": 1,
  "HP": [1840, 3312, 5960], "Physical_ATK": [110, 165, 220], "Magic_ATK": [110, 165, 220], "Jangkauan_ATK": 1,
  "Batas_Mana_Awal": [50, 50, 50], "Batas_Mana": [70, 70, 70], "Mana_Regen_Per_Detik": 0, "Lifesteal": 0, "Spell_Vamp": 0,
  "Physical_Penetration": 0, "Magic_Penetration": 0, "Magic_Def": [36, 36, 36], "Physical_Def": [36, 36, 36],
  "ATK_Speed": [0.75, 0.75, 0.75],
  "BASIC_ATK": { "formula": [ { "ref": "Magic_ATK", "multiplier": [0,0,0] }, { "ref": "Physical_ATK", "multiplier": [1, 1, 1] } ] },
  "DMG_skill": { "formula": [ { "ref": "Magic_ATK", "multiplier": [0,0,0] }, { "ref": "Physical_ATK", "multiplier": [0,0,0] } ], "skill_handler": { "type": "buff", "label": "Silvanna Shield + ATK Speed", "shield_flat": [250,360,430], "duration": 3, "buffs": { "ATK_Speed_Bonus": [0.30, 0.40, 0.60 ] } } }
};