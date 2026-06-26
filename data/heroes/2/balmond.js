export const BALMOND = {
  "fraksi": "Dragoncaller", "role": "Dauntless", "gold": 2,
  "HP": [2233, 4019, 7235], "Physical_ATK": [115, 175, 230], "Magic_ATK": [115, 175, 230], "Jangkauan_ATK": 1,
  "Batas_Mana_Awal": [60, 60, 60], "Batas_Mana": [80, 80, 80], "Mana_Regen_Per_Detik": 0, "Lifesteal": 0, "Spell_Vamp": 0,
  "Physical_Penetration": 0, "Magic_Penetration": 0, "Magic_Def": [36, 36, 36], "Physical_Def": [36, 36, 36],
  "ATK_Speed": [0.65, 0.65, 0.65],
  "passive_buffs": {
    "Hybrid_DEF_Flat": 10
  },
  "BASIC_ATK": { "formula": [ { "ref": "Magic_ATK", "multiplier": [0,0,0] }, { "ref": "Physical_ATK", "multiplier": [1, 1, 1] } ] },
  "DMG_skill": {
    "formula": [ { "ref": "Magic_ATK", "multiplier": [0,0,0] }, { "ref": "Physical_ATK", "multiplier": [0.45, 0.55, 0.70] } ],
    "skill_handler": {
      "type": "delayed_multihit",
      "label": "Balmond Slash",
      "hit_count": 14,          
      "hit_delay": 0.2142857
    }
  }
};