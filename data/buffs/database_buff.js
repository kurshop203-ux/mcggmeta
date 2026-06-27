// ════════════════════════════════════════════════════════════════
// database_buff.js
// Kumpulan semua data buff sinergi dari folder DAFTAR BUFF.
//
// Export:
//   DATABASE_BUFF → object { key: dataBuff, ... }
//
// Untuk tambah buff baru:
//   1. import NamaBuff from './DAFTAR BUFF/NamaBuff.js';
//   2. Tambah ke array BUFF_LIST di bawah.
// ════════════════════════════════════════════════════════════════


// ── IMPORT BUFF (urut alfabet) ────────────────────────────────────

import AstroPower      from './AstroPower.js';
import Bruiser         from './Bruiser.js';
import Dauntless       from './Dauntless.js';
import Defender        from './Defender.js';
import Dragoncaller    from './Dragoncaller.js';
import Emberlord       from './Emberlord.js';
import Enchanted_Tales from './Enchanted_Tales.js';
import Exorcist        from './Exorcist.js';
import Heartbond       from './Heartbond.js';
import Kishin          from './Kishin.js';
import Mage            from './Mage.js';
import Marksman        from './Marksman.js';
import Neobeasts       from './Neobeasts.js';
import Phasewarper     from './Phasewarper.js';
import Scavenger       from './Scavenger.js';
import Stargazer       from './Stargazer.js';
import Swiftblade      from './Swiftblade.js';
import Weapon_Master   from './Weapon_Master.js';
import Northern_Vale   from './Northern_Vale.js';


// ── EXPORT ───────────────────────────────────────────────────────

const BUFF_LIST = [
  AstroPower, Exorcist, Northern_Vale, Bruiser, Dauntless, Defender, Dragoncaller, Enchanted_Tales, Kishin,
  Mage, Marksman, Neobeasts, Phasewarper, Scavenger, Stargazer, Swiftblade, Weapon_Master, Heartbond, Emberlord
];

export const DATABASE_BUFF = {};
BUFF_LIST.forEach(buff => { DATABASE_BUFF[buff.key] = buff; });
