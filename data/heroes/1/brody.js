export const BRODY = {
  "fraksi": "Neobeasts", "role": "Marksman", "gold": 1,
  "HP": [1550, 2790, 5020], "Physical_ATK": [100, 150, 200], "Magic_ATK": [100, 150, 200], "Jangkauan_ATK": 4,
  "Batas_Mana_Awal": [0], "Batas_Mana": [0], "Mana_Regen_Per_Detik": 0, "Lifesteal": 0, "Spell_Vamp": 0,
  "Physical_Penetration": 0, "Magic_Penetration": 0, "Magic_Def": [36, 36, 36], "Physical_Def": [36, 36, 36],
  "ATK_Speed": [0.8, 0.8, 0.8],
  "BASIC_ATK": { "formula": [ { "ref": "Magic_ATK", "multiplier": [0,0,0] }, { "ref": "Physical_ATK", "multiplier": [1,1,1] } ] },
  "passive_atkspeed_flat": 0.10,
  "passive_basic_stack": { "max_stacks": 5, "duration": 4, "bonus_per_stack": [0.20, 0.25, 0.30], "bonus_ref": "Physical_ATK", "label": "Abyss Corrosion" },
  "DMG_skill": { "formula": [ { "ref": "Magic_ATK", "multiplier": [0,0,0] }, { "ref": "Physical_ATK", "multiplier": [0,0,0] } ] }
};