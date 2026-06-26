// ════════════════════════════════════════════════════════════════
// database_hero.js
// Kumpulan semua data hero dari folder DATA HERO.
//
// Export:
//   ALL_HEROES → object { "NamaHero": dataHero, ... }
//
// Untuk tambah hero baru:
//   1. import { NAMA } from './DATA HERO/X/nama.js';
//   2. Tambah "Nama": NAMA ke object ALL_HEROES di bawah.
// ════════════════════════════════════════════════════════════════


// ── IMPORT HERO (urut alfabet) ────────────────────────────────────

import { ALPHA }     from './5/alpha.js';
import { ALUCARD }   from './1/alucard.js';
import { ANGELA }    from './2/angela.js';
import { AURORA }    from './4/aurora.js';
import { BADANG }    from './5/badang.js';
import { BALMOND }   from './2/balmond.js';
import { BANE }      from './5/bane.js';
import { BELERICK }  from './2/belerick.js';
import { BRODY }     from './1/brody.js';
import { CECILION }  from './1/cecilion.js';
import { CLAUDE }    from './5/claude.js';
import { CLINT }     from './3/clint.js';
import { DYROTH }    from './1/dyroth.js';
import { ESMERALDA } from './4/esmeralda.js';
import { EUDORA }    from './1/eudora.js';
import { FANNY }     from './2/fanny.js';
import { FRANGKO }   from './3/frangko.js';
import { FREDRIN }   from './3/fredrin.js';
import { GATOTKACA } from './2/gatotkaca.js';
import { GRANGER }   from './2/granger.js';
import { GUSION }    from './4/gusion.js';
import { HANZO }     from './2/hanzo.js';
import { HELCURT }   from './3/helcurt.js';
import { HILDA }     from './3/hilda.js';
import { IRITHEL }   from './4/irithel.js';
import { JOY }       from './2/joy.js';
import { JULIAN }    from './3/julian.js';
import { KAGURA }    from './4/kagura.js';
import { KARRIE }    from './4/karrie.js';
import { KUFRA }     from './3/kufra.js';
import { LANCELOT }  from './5/lancelot.js';
import { LEOMORD }   from './4/leomord.js';
import { LESLEY }    from './5/lesley.js';
import { LING }      from './5/ling.js';
import { LOUYI }     from './3/louyi.js';
import { LUNOX }     from './4/lunox.js';
import { LYLIIA }    from './2/lyliia.js';
import { MARTIS }    from './2/martis.js';
import { MASHA }     from './3/masha.js';
import { MINOTAUR }  from './1/minotaur.js';
import { MIYA }      from './3/miya.js';
import { ODETTE }    from './5/odette.js';
import { PHARSA }    from './4/pharsa.js';
import { PHOVEUS }   from './1/phoveus.js';
import { RUBY }      from './5/ruby.js';
import { SABER }     from './3/saber.js';
import { SELENA }    from './2/selena.js';
import { SILVANNA }  from './1/silvanna.js';
import { TERIZLA }   from './4/terizla.js';
import { TIGREAL }   from './3/tigreal.js';
import { VEXANA }    from './4/vexana.js';
import { YU_ZHONG }  from './4/yuzhong.js';


// ── EXPORT ───────────────────────────────────────────────────────

export const ALL_HEROES = {
  "Alpha":     ALPHA,     "Alucard":   ALUCARD,   "Angela":    ANGELA,
  "Aurora":    AURORA,    "Badang":    BADANG,     "Balmond":   BALMOND,
  "Bane":      BANE,      "Belerick":  BELERICK,   "Brody":     BRODY,
  "Cecilion":  CECILION,  "Claude":    CLAUDE,     "Clint":     CLINT,
  "Dyroth":    DYROTH,    "Esmeralda": ESMERALDA,  "Eudora":    EUDORA,
  "Fanny":     FANNY,     "Frangko":   FRANGKO,    "Fredrin":   FREDRIN,
  "Gatotkaca": GATOTKACA, "Granger":   GRANGER,    "Gusion":    GUSION,
  "Hanzo":     HANZO,     "Helcurt":   HELCURT,    "Hilda":     HILDA,
  "Irithel":   IRITHEL,   "Joy":       JOY,        "Julian":    JULIAN,
  "Kagura":    KAGURA,    "Karrie":    KARRIE,     "Kufra":     KUFRA,
  "Lancelot":  LANCELOT,  "Leomord":   LEOMORD,    "Lesley":    LESLEY,
  "Ling":      LING,      "Louyi":     LOUYI,      "Lunox":     LUNOX,
  "Lyliia":    LYLIIA,    "Martis":    MARTIS,     "Masha":     MASHA,
  "Minotaur":  MINOTAUR,  "Miya":      MIYA,       "Odette":    ODETTE,
  "Pharsa":    PHARSA,    "Phoveus":   PHOVEUS,    "Ruby":      RUBY,
  "Saber":     SABER,     "Selena":    SELENA,     "Silvanna":  SILVANNA,
  "Terizla":   TERIZLA,   "Tigreal":   TIGREAL,    "Vexana":    VEXANA,
  "Yu Zhong":  YU_ZHONG,
};
