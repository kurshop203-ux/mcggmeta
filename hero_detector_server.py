import asyncio
import json
import os
import sys
import time
import threading
import mss
import numpy as np
import webview
import websockets
import keyboard
import pydirectinput

# pydirectinput butuh FAILSAFE off untuk kontrol presisi area kecil,
# dan PAUSE 0 supaya tidak ada delay bawaan antar panggilan
pydirectinput.FAILSAFE = False
pydirectinput.PAUSE = 0

# ============================================================
# COLOR SETTINGS & THRESHOLDS
# ============================================================
COLORS = {
    # ── Fraksi (type F) ──────────────────────────────────────
    "Kishin":        {"rgb": [90,  22,  43],  "type": "F"},  # deep crimson
    "Northern Val":  {"rgb": [49,  52,  63],  "type": "F"},  # steel blue-grey
    "Heartbond":     {"rgb": [134, 45,  173], "type": "F"},  # vivid purple
    "Exorcist":      {"rgb": [126, 62,  8],   "type": "F"},  # orange-brown
    "Astro Power":   {"rgb": [93,  110, 167], "type": "F"},  # muted periwinkle
    "Mystic Bureau": {"rgb": [29,  107, 74],  "type": "F"},  # forest green
    "Dragon Altar":  {"rgb": [129, 107, 0],   "type": "F"},  # olive gold
    "Neo Beast":     {"rgb": [60,  35,  130], "type": "F"},  # deep indigo
    "Emberlord":     {"rgb": [160, 28,  5],   "type": "F"},  # bright ember red
    "Elementalizer": {"rgb": [100, 35,  115], "type": "F"},  # mid purple

    # ── Role (type R) ────────────────────────────────────────
    "Phasewaver":    {"rgb": [19,  88,  77],  "type": "R"},  # teal
    "Defender":      {"rgb": [55,  22,  4],   "type": "R"},  # very dark brown
    "Scavanger":     {"rgb": [115, 72,  20],  "type": "R"},  # warm tan-brown
    "Dauntless":     {"rgb": [108, 25,  8],   "type": "R"},  # brick red-brown
    "Mage":          {"rgb": [5,   18,  115], "type": "R"},  # pure deep navy
    "Marksman":      {"rgb": [16,  52,  130], "type": "R"},  # bright navy-blue
    "Bruiser":       {"rgb": [80,  64,  4],   "type": "R"},  # olive-gold brown
    "Assassin":      {"rgb": [90,  18,  95],  "type": "R"},  # reddish-purple
    "Stargazer":     {"rgb": [55,  30,  118], "type": "R"},  # periwinkle-blue
    "Weapon Master": {"rgb": [100, 42,  42],  "type": "R"},  # muted dark red
}

STAR_COLOR     = [255, 215, 93]  # kuning emas — sesuaikan dengan warna nyata di game
THRESHOLD      = 5               # toleransi warna sinergi
STAR_THRESHOLD = 15              # toleransi warna bintang

# ── BUG 2 FIX: anti false-positive untuk slot kosong ──────────
# Warna latar slot kosong (terkonfirmasi dari log: [37,37,36] / [44,44,42]
# dan variannya). Pixel yang berjarak <= EMPTY_BG_THRESHOLD dari salah satu
# warna ini langsung ditolak SEBELUM dicocokkan ke COLORS — supaya slot
# kosong tidak pernah dianggap "ada hero".
EMPTY_BG_COLORS    = [[37, 37, 36], [44, 44, 42]]
EMPTY_BG_THRESHOLD = 10

# Selain itu, suatu match HANYA diterima kalau warna terdekat (best) jelas
# lebih dekat dibanding kandidat terdekat ke-2 (margin minimum). Ini mencegah
# pixel "abu-abu gelap" yang kebetulan jaraknya pas-pasan ke beberapa warna
# sinergi sekaligus (ambigu) ikut ke-detect sebagai salah satu hero.
NEAREST_MARGIN = 4

# Set True kalau perlu debug detail warna per-pixel bintang (sangat verbose —
# dipanggil berkali-kali tiap smart placement: sebelum drag, tiap retry,
# dan verifikasi pasca-drag). Default False supaya log gampang dibaca.
VERBOSE_STAR_LOG = False

# Sama seperti di atas, tapi untuk dump RGB per-pixel tiap slot di
# capture_and_detect()/capture_and_detect_shop() (dipanggil saat tombol
# Capture/hotkey J/K ditekan). Default False — hanya tampilkan hasil akhir
# (hero terdeteksi / tidak) per slot, bukan rincian tiap titik sample.
VERBOSE_SLOT_LOG = False

# ============================================================
# DATABASE HERO
# ============================================================
HEROES = {
    # --- Gold 5 ---
    "LANCELOT":  {"fraksi1": "Kishin",        "role1": "Phasewaver",                      "gold": 5, "pos": "front"},
    "BANE":      {"fraksi1": "Northern Val",  "role1": "Defender",                        "gold": 5, "pos": "front"},
    "CLAUDE":    {"fraksi1": "Heartbond",     "role1": "Scavanger",                       "gold": 5, "pos": "back"},
    "RUBY":      {"fraksi1": "Exorcist",      "role1": "Dauntless",                       "gold": 5, "pos": "front"},
    "ODETTE":    {"fraksi1": "Astro Power",   "role1": "Mage",                            "gold": 5, "pos": "back"},
    "LESLEY":    {"fraksi1": "Mystic Bureau", "role1": "Marksman",                        "gold": 5, "pos": "back"},
    "BADANG":    {"fraksi1": "Dragon Altar",  "role1": "Bruiser",                         "gold": 5, "pos": "front"},
    "LING":      {"fraksi1": "Neo Beast",     "role1": "Assassin",                        "gold": 5, "pos": "back"},
    "ALPHA":     {"fraksi1": "Emberlord",     "role1": "Weapon Master",                   "gold": 5, "pos": "front"},
    
    # --- Gold 4 ---
    "KAGURA":    {"fraksi1": "Exorcist",      "role1": "Mage",                            "gold": 4, "pos": "back"},
    "ESMERALDA": {"fraksi1": "Heartbond",     "role1": "Dauntless",                       "gold": 4, "pos": "front"},
    "VEXANA":    {"fraksi1": "Elementalizer", "role1": "Mage",                            "gold": 4, "pos": "back"},
    "IRITHEL":   {"fraksi1": "Emberlord",     "role1": "Marksman",                        "gold": 4, "pos": "back"},
    "GUSION":    {"fraksi1": "Dragon Altar",  "role1": "Assassin",                        "gold": 4, "pos": "back"},
    "LUNOX":     {"fraksi1": "Kishin",        "role1": "Stargazer",                       "gold": 4, "pos": "back"},
    "TERIZLA":   {"fraksi1": "Dragon Altar",  "role1": "Defender",                        "gold": 4, "pos": "front"},
    "AURORA":    {"fraksi1": "Astro Power",   "role1": "Stargazer",                       "gold": 4, "pos": "back"},
    "PHARSA":    {"fraksi1": "Neo Beast",     "role1": "Stargazer",                       "gold": 4, "pos": "back"},
    "KARRIE":    {"fraksi1": "Kishin",        "role1": "Marksman",                        "gold": 4, "pos": "back"},
    "LEOMORD":   {"fraksi1": "Elementalizer", "role1": "Weapon Master",                   "gold": 4, "pos": "front"},
    "YU ZHONG":  {"fraksi1": "Exorcist",      "role1": "Bruiser",                         "gold": 4, "pos": "front"},
    
    # --- Gold 3 ---
    "MIYA":      {"fraksi1": "Heartbond",     "role1": "Marksman",                        "gold": 3, "pos": "back"},
    "TIGREAL":   {"fraksi1": "Emberlord",     "role1": "Defender",                        "gold": 3, "pos": "front"},
    "CLINT":     {"fraksi1": "Dragon Altar",  "role1": "Phasewaver",                      "gold": 3, "pos": "back"},
    "HELCURT":   {"fraksi1": "Astro Power",   "role1": "Assassin",                        "gold": 3, "pos": "back"},
    "MASHA":     {"fraksi1": "Emberlord",     "role1": "Bruiser",                         "gold": 3, "pos": "front"},
    "JULIAN":    {"fraksi1": "Mystic Bureau", "role1": "Mage",          "role2": "Phasewaver", "gold": 3, "pos": "back"},
    "SABER":     {"fraksi1": "Exorcist",      "role1": "Assassin",                        "gold": 3, "pos": "back"},
    "FRANGKO":   {"fraksi1": "Kishin",        "role1": "Dauntless",     "role2": "Weapon Master", "gold": 3, "pos": "front"},
    "HILDA":     {"fraksi1": "Astro Power",   "role1": "Dauntless",                       "gold": 3, "pos": "front"},
    "KUFRA":     {"fraksi1": "Heartbond",     "role1": "Defender",                        "gold": 3, "pos": "front"},
    "LOUYI":     {"fraksi1": "Northern Val",  "role1": "Stargazer",                       "gold": 3, "pos": "back"},
    "FREDRIN":   {"fraksi1": "Neo Beast",     "role1": "Weapon Master",                   "gold": 3, "pos": "front"},
    
    # --- Gold 2 ---
    "BALMOD":    {"fraksi1": "Dragon Altar",  "role1": "Dauntless",                       "gold": 2, "pos": "front"},
    "GATOTKACA": {"fraksi1": "Neo Beast",     "role1": "Bruiser",       "role2": "Defender",   "gold": 2, "pos": "front"},
    "MARTIS":    {"fraksi1": "Astro Power",   "role1": "Weapon Master",                   "gold": 2, "pos": "front"},
    "HANZO":     {"fraksi1": "Emberlord",     "role1": "Assassin",                        "gold": 2, "pos": "back"},
    "GRANGER":   {"fraksi1": "Exorcist",      "role1": "Marksman",                        "gold": 2, "pos": "back"},
    "JOY":       {"fraksi1": "Northern Val",  "role1": "Assassin",                        "gold": 2, "pos": "back"},
    "FANNY":     {"fraksi1": "Heartbond",     "role1": "Phasewaver",                      "gold": 2, "pos": "back"},
    "ANGELA":    {"fraksi1": "Kishin",        "role1": "Scavanger",                       "gold": 2, "pos": "back"},
    "SELENA":    {"fraksi1": "Elementalizer", "role1": "Stargazer",                       "gold": 2, "pos": "back"},
    "BELERICK":  {"fraksi1": "Elementalizer", "role1": "Bruiser",                         "gold": 2, "pos": "front"},
    "LYLIIA":    {"fraksi1": "Neo Beast",     "role1": "Mage",                            "gold": 2, "pos": "back"},
    
    # --- Gold 1 ---
    "MINOTAUR":  {"fraksi1": "Astro Power",   "role1": "Defender",                        "gold": 1, "pos": "front"},
    "CECILION":  {"fraksi1": "Emberlord",     "role1": "Mage",                            "gold": 1, "pos": "back"},
    "ALUCARD":   {"fraksi1": "Heartbond",     "role1": "Weapon Master",                   "gold": 1, "pos": "front"},
    "DYROTH":    {"fraksi1": "Kishin",        "role1": "Bruiser",                         "gold": 1, "pos": "front"},
    "EUDORA":    {"fraksi1": "Dragon Altar",  "role1": "Stargazer",                       "gold": 1, "pos": "back"},
    "PHOVEUS":   {"fraksi1": "Exorcist",      "role1": "Scavanger",                       "gold": 1, "pos": "front"},
    "BRODY":     {"fraksi1": "Neo Beast",     "role1": "Marksman",                        "gold": 1, "pos": "back"},
    "SILVANNA":  {"fraksi1": "Mystic Bureau", "role1": "Dauntless",                       "gold": 1, "pos": "front"},
}

# ============================================================
# LAYOUTS CONFIG
# ============================================================
LAYOUTS = [
    {"id": "1F1R",    "heroType": "1F1R", "kristal": "none",   "xpos": [3, 5],       "slots": ["F", "R"]},
    {"id": "1F1R_KF", "heroType": "1F1R", "kristal": "fraksi", "xpos": [2, 4, 6],    "slots": ["F", "KF", "R"]},
    {"id": "1F1R_KR", "heroType": "1F1R", "kristal": "role",   "xpos": [2, 4, 6],    "slots": ["F", "R", "KR"]},
    {"id": "1F2R",    "heroType": "1F2R", "kristal": "none",   "xpos": [2, 4, 6],    "slots": ["F", "R", "R"]},
    {"id": "1F2R_KF", "heroType": "1F2R", "kristal": "fraksi", "xpos": [1, 3, 5, 7], "slots": ["F", "KF", "R", "R"]},
    {"id": "1F2R_KR", "heroType": "1F2R", "kristal": "role",   "xpos": [1, 3, 5, 7], "slots": ["F", "R", "R", "KR"]},
    {"id": "2F1R",    "heroType": "2F1R", "kristal": "none",   "xpos": [2, 4, 6],    "slots": ["F", "F", "R"]},
    {"id": "2F1R_KF", "heroType": "2F1R", "kristal": "fraksi", "xpos": [1, 3, 5, 7], "slots": ["F", "F", "KF", "R"]},
    {"id": "2F1R_KR", "heroType": "2F1R", "kristal": "role",   "xpos": [1, 3, 5, 7], "slots": ["F", "F", "R", "KR"]},
]

# ============================================================
# SCAN REGIONS
# ============================================================
SHOP_SCAN_REGION = {"top": 555, "left": 320, "width": 1300, "height": 5}
BOARD_ROI        = {"top": 490, "left": 300, "width": 1350, "height": 480}

# ============================================================
# HELPER: ZERO COORD GENERATORS
# ============================================================
def make_zero_xpoints():
    return {i: (0, 0) for i in range(1, 8)}  # x1..x7 semua (0,0)

def make_zero_starpoints():
    return {i: (0, 0) for i in range(1, 6)}  # xpos 1..5 semua (0,0)

# ============================================================
# ARENA COORDINATES
# ============================================================
ARENA_COORDS = {col: {row: make_zero_xpoints() for row in range(1, 4)} for col in range(1, 8)}

# --- ROW 1 (Y = 526) ---
ARENA_COORDS[1][1] = {1: (419,  526), 2: (441,  526), 3: (463,  526), 4: (486,  526), 5: (508,  526), 6: (531,  526), 7: (553,  526)}
ARENA_COORDS[2][1] = {1: (577,  526), 2: (599,  526), 3: (621,  526), 4: (644,  526), 5: (666,  526), 6: (689,  526), 7: (711,  526)}
ARENA_COORDS[3][1] = {1: (735,  526), 2: (757,  526), 3: (779,  526), 4: (802,  526), 5: (824,  526), 6: (847,  526), 7: (869,  526)}
ARENA_COORDS[4][1] = {1: (893,  526), 2: (915,  526), 3: (937,  526), 4: (960,  526), 5: (982,  526), 6: (1005, 526), 7: (1027, 526)}
ARENA_COORDS[5][1] = {1: (1051, 526), 2: (1073, 526), 3: (1095, 526), 4: (1118, 526), 5: (1140, 526), 6: (1163, 526), 7: (1185, 526)}
ARENA_COORDS[6][1] = {1: (1209, 526), 2: (1231, 526), 3: (1253, 526), 4: (1276, 526), 5: (1298, 526), 6: (1321, 526), 7: (1343, 526)}
ARENA_COORDS[7][1] = {1: (1367, 526), 2: (1389, 526), 3: (1411, 526), 4: (1434, 526), 5: (1456, 526), 6: (1479, 526), 7: (1501, 526)}

# --- ROW 2 (Y = 640) ---
ARENA_COORDS[1][2] = {1: (395,  640), 2: (417,  640), 3: (440,  640), 4: (462,  640), 5: (485,  640), 6: (507,  640), 7: (530,  640)}
ARENA_COORDS[2][2] = {1: (561,  640), 2: (583,  640), 3: (606,  640), 4: (628,  640), 5: (651,  640), 6: (673,  640), 7: (696,  640)}
ARENA_COORDS[3][2] = {1: (727,  640), 2: (749,  640), 3: (772,  640), 4: (794,  640), 5: (817,  640), 6: (839,  640), 7: (862,  640)}
ARENA_COORDS[4][2] = {1: (893,  640), 2: (915,  640), 3: (938,  640), 4: (960,  640), 5: (983,  640), 6: (1005, 640), 7: (1028, 640)}
ARENA_COORDS[5][2] = {1: (1059, 640), 2: (1081, 640), 3: (1104, 640), 4: (1126, 640), 5: (1149, 640), 6: (1171, 640), 7: (1194, 640)}
ARENA_COORDS[6][2] = {1: (1225, 640), 2: (1247, 640), 3: (1270, 640), 4: (1292, 640), 5: (1315, 640), 6: (1337, 640), 7: (1360, 640)}
ARENA_COORDS[7][2] = {1: (1391, 640), 2: (1413, 640), 3: (1436, 640), 4: (1458, 640), 5: (1481, 640), 6: (1503, 640), 7: (1526, 640)}

# --- ROW 3 (Y = 764) ---
ARENA_COORDS[1][3] = {1: (368,  764), 2: (390,  764), 3: (413,  764), 4: (435,  764), 5: (458,  764), 6: (480,  764), 7: (503,  764)}
ARENA_COORDS[2][3] = {1: (543,  764), 2: (565,  764), 3: (588,  764), 4: (610,  764), 5: (633,  764), 6: (655,  764), 7: (678,  764)}
ARENA_COORDS[3][3] = {1: (718,  764), 2: (740,  764), 3: (763,  764), 4: (785,  764), 5: (808,  764), 6: (830,  764), 7: (853,  764)}
ARENA_COORDS[4][3] = {1: (893,  764), 2: (915,  764), 3: (938,  764), 4: (960,  764), 5: (983,  764), 6: (1005, 764), 7: (1028, 764)}
ARENA_COORDS[5][3] = {1: (1068, 764), 2: (1090, 764), 3: (1113,  764), 4: (1135, 764), 5: (1158, 764), 6: (1180, 764), 7: (1203, 764)}
ARENA_COORDS[6][3] = {1: (1243, 764), 2: (1265, 764), 3: (1288,  764), 4: (1310, 764), 5: (1333, 764), 6: (1355, 764), 7: (1378, 764)}
ARENA_COORDS[7][3] = {1: (1418, 764), 2: (1440, 764), 3: (1463,  764), 4: (1485, 764), 5: (1508, 764), 6: (1530, 764), 7: (1553, 764)}

# ============================================================
# BENCH COORDINATES
# ============================================================
BENCH_COORDS = {slot: make_zero_xpoints() for slot in range(1, 9)}

# --- BENCH (Y = 968) ---
BENCH_COORDS[1] = {1: (310,  968), 2: (333,  968), 3: (356,  968), 4: (378,  968), 5: (401,  968), 6: (423,  968), 7: (446,  968)}
BENCH_COORDS[2] = {1: (478,  968), 2: (501,  968), 3: (524,  968), 4: (546,  968), 5: (569,  968), 6: (591,  968), 7: (614,  968)}
BENCH_COORDS[3] = {1: (646,  968), 2: (669,  968), 3: (692,  968), 4: (714,  968), 5: (737,  968), 6: (759,  968), 7: (782,  968)}
BENCH_COORDS[4] = {1: (814,  968), 2: (837,  968), 3: (860,  968), 4: (882,  968), 5: (905,  968), 6: (927,  968), 7: (950,  968)}
BENCH_COORDS[5] = {1: (982,  968), 2: (1005, 968), 3: (1028, 968), 4: (1050, 968), 5: (1073, 968), 6: (1095, 968), 7: (1118, 968)}
BENCH_COORDS[6] = {1: (1150, 968), 2: (1173, 968), 3: (1196, 968), 4: (1218, 968), 5: (1241, 968), 6: (1263, 968), 7: (1286, 968)}
BENCH_COORDS[7] = {1: (1318, 968), 2: (1341, 968), 3: (1364, 968), 4: (1386, 968), 5: (1409, 968), 6: (1431, 968), 7: (1454, 968)}
BENCH_COORDS[8] = {1: (1487, 968), 2: (1510, 968), 3: (1532, 968), 4: (1555, 968), 5: (1577, 968), 6: (1600, 968), 7: (1622, 968)}

# ============================================================
# SHOP COORDINATES
# ============================================================
SHOP_COORDS = {slot: make_zero_xpoints() for slot in range(1, 6)}

# --- SHOP (Y = 2) ---
SHOP_COORDS[1] = {2: (5,    2), 3: (36,   2), 4: (65,   2), 5: (96,   2), 6: (125,  2)}
SHOP_COORDS[2] = {2: (290,  2), 3: (321,  2), 4: (350,  2), 5: (381,  2), 6: (410,  2)}
SHOP_COORDS[3] = {2: (575,  2), 3: (606,  2), 4: (635,  2), 5: (666,  2), 6: (695,  2)}
SHOP_COORDS[4] = {2: (860,  2), 3: (891,  2), 4: (920,  2), 5: (951,  2), 6: (980,  2)}
SHOP_COORDS[5] = {2: (1145, 2), 3: (1176, 2), 4: (1205, 2), 5: (1236, 2), 6: (1265, 2)}

# ============================================================
# STAR COORDINATES
# ============================================================
ARENA_STAR = {col: {row: make_zero_starpoints() for row in range(1, 4)} for col in range(1, 8)}

# --- ROW 1 STAR (Y = 495) ---
ARENA_STAR[1][1] = {1: (458,  495), 2: (472,  495), 3: (486,  495), 4: (500,  495), 5: (514,  495)}
ARENA_STAR[2][1] = {1: (616,  495), 2: (630,  495), 3: (644,  495), 4: (658,  495), 5: (672,  495)}
ARENA_STAR[3][1] = {1: (774,  495), 2: (788,  495), 3: (802,  495), 4: (816,  495), 5: (830,  495)}
ARENA_STAR[4][1] = {1: (932,  495), 2: (946,  495), 3: (960,  495), 4: (974,  495), 5: (988,  495)}
ARENA_STAR[5][1] = {1: (1090, 495), 2: (1104, 495), 3: (1118, 495), 4: (1132, 495), 5: (1146, 495)}
ARENA_STAR[6][1] = {1: (1248, 495), 2: (1262, 495), 3: (1276, 495), 4: (1290, 495), 5: (1304, 495)}
ARENA_STAR[7][1] = {1: (1406, 495), 2: (1420, 495), 3: (1434, 495), 4: (1448, 495), 5: (1462, 495)}

# --- ROW 2 STAR (Y = 605) ---
ARENA_STAR[1][2] = {1: (434,  605), 2: (448,  605), 3: (462,  605), 4: (476,  605), 5: (490,  605)}
ARENA_STAR[2][2] = {1: (600,  605), 2: (614,  605), 3: (628,  605), 4: (642,  605), 5: (656,  605)}
ARENA_STAR[3][2] = {1: (766,  605), 2: (780,  605), 3: (794,  605), 4: (808,  605), 5: (822,  605)}
ARENA_STAR[4][2] = {1: (932,  605), 2: (946,  605), 3: (960,  605), 4: (974,  605), 5: (988,  605)}
ARENA_STAR[5][2] = {1: (1098, 605), 2: (1112, 605), 3: (1126, 605), 4: (1140, 605), 5: (1154, 605)}
ARENA_STAR[6][2] = {1: (1264, 605), 2: (1278, 605), 3: (1292, 605), 4: (1306, 605), 5: (1320, 605)}
ARENA_STAR[7][2] = {1: (1430, 605), 2: (1444, 605), 3: (1458, 605), 4: (1472, 605), 5: (1486, 605)}

# --- ROW 3 STAR (Y = 730) ---
ARENA_STAR[1][3] = {1: (407,  730), 2: (421,  730), 3: (435,  730), 4: (449,  730), 5: (463,  730)}
ARENA_STAR[2][3] = {1: (582,  730), 2: (596,  730), 3: (610,  730), 4: (624,  730), 5: (638,  730)}
ARENA_STAR[3][3] = {1: (757,  730), 2: (771,  730), 3: (785,  730), 4: (799,  730), 5: (813,  730)}
ARENA_STAR[4][3] = {1: (932,  730), 2: (946,  730), 3: (960,  730), 4: (974,  730), 5: (988,  730)}
ARENA_STAR[5][3] = {1: (1107, 730), 2: (1121, 730), 3: (1135, 730), 4: (1149, 730), 5: (1163, 730)}
ARENA_STAR[6][3] = {1: (1282, 730), 2: (1296, 730), 3: (1310, 730), 4: (1324, 730), 5: (1338, 730)}
ARENA_STAR[7][3] = {1: (1457, 730), 2: (1471, 730), 3: (1485, 730), 4: (1499, 730), 5: (1513, 730)}

BENCH_STAR = {slot: make_zero_starpoints() for slot in range(1, 9)}

# --- BENCH STAR (Y = 935) ---
BENCH_STAR[1] = {1: (350,  935), 2: (364,  935), 3: (378,  935), 4: (392,  935), 5: (406,  935)}
BENCH_STAR[2] = {1: (518,  935), 2: (532,  935), 3: (546,  935), 4: (560,  935), 5: (574,  935)}
BENCH_STAR[3] = {1: (686,  935), 2: (700,  935), 3: (714,  935), 4: (728,  935), 5: (742,  935)}
BENCH_STAR[4] = {1: (854,  935), 2: (868,  935), 3: (882,  935), 4: (896,  935), 5: (910,  935)}
BENCH_STAR[5] = {1: (1022, 935), 2: (1036, 935), 3: (1050, 935), 4: (1064, 935), 5: (1078, 935)}
BENCH_STAR[6] = {1: (1190, 935), 2: (1204, 935), 3: (1218, 935), 4: (1232, 935), 5: (1246, 935)}
BENCH_STAR[7] = {1: (1358, 935), 2: (1372, 935), 3: (1386, 935), 4: (1400, 935), 5: (1414, 935)}
BENCH_STAR[8] = {1: (1527, 935), 2: (1541, 935), 3: (1555, 935), 4: (1569, 935), 5: (1583, 935)}
def detect_star(screenshot, star_xpoints, verbose=False):
    if not star_xpoints:
        return 1
    lit = set()
    for xpos, (px, py) in star_xpoints.items():
        if px == 0 and py == 0:
            continue
        rgb = sample_pixel(screenshot, px, py)
        if rgb is None:
            continue
        dist = ((rgb[0]-STAR_COLOR[0])**2 + (rgb[1]-STAR_COLOR[1])**2 + (rgb[2]-STAR_COLOR[2])**2) ** 0.5
        if VERBOSE_STAR_LOG or verbose:
            print(f"      xpos={xpos} ({px},{py}) → rgb={rgb} dist={dist:.1f} {'✓ LIT' if dist <= STAR_THRESHOLD else '✗'}")
        if dist <= STAR_THRESHOLD:
            lit.add(xpos)
    if {1, 3, 5}.issubset(lit):
        return 3
    if {2, 4}.issubset(lit):
        return 2
    return 1

# ============================================================
# HELPERS
# ============================================================
def color_dist(a, b):
    return ((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2) ** 0.5

def is_empty_background(rgb) -> bool:
    """True kalau rgb ini warna latar slot KOSONG, bukan warna sinergi hero.
    Dicek SEBELUM nearest_color supaya slot kosong tidak pernah lolos jadi
    'kandidat terdekat' dari salah satu warna COLORS (BUG 2)."""
    for bg in EMPTY_BG_COLORS:
        if color_dist(rgb, bg) <= EMPTY_BG_THRESHOLD:
            return True
    return False

def nearest_color(rgb):
    # 1) Tolak duluan kalau ini jelas warna latar kosong.
    if is_empty_background(rgb):
        return None

    # 2) Cari 2 kandidat terdekat, bukan cuma 1 — supaya bisa dicek ambiguitas.
    ranked = []
    for name, c in COLORS.items():
        d = color_dist(rgb, c["rgb"])
        ranked.append((d, name, c))
    ranked.sort(key=lambda x: x[0])

    best_dist, best_name, best_c = ranked[0]

    # 3) Kalau kandidat ke-2 jaraknya hampir sama dengan kandidat ke-1,
    #    match ini ambigu (biasanya terjadi pada pixel abu-abu/gelap yang
    #    "pas-pasan" dekat dengan beberapa warna sinergi) → tolak.
    if len(ranked) > 1:
        second_dist = ranked[1][0]
        if (second_dist - best_dist) < NEAREST_MARGIN:
            return None  # ambigu → jangan dianggap match sama sekali

    return {"name": best_name, "type": best_c["type"], "rgb": best_c["rgb"], "dist": best_dist}
def hero_type(hero):
    if hero.get("fraksi2"): return "2F1R"
    if hero.get("role2"):   return "1F2R"
    return "1F1R"
def sample_pixel(screenshot_np, px, py):
    """Ambil RGB dari koordinat (px, py) di screenshot numpy array."""
    if px == 0 and py == 0:
        return None  # koordinat belum diisi
    h, w = screenshot_np.shape[:2]
    px = max(0, min(px, w - 1))
    py = max(0, min(py, h - 1))
    bgr = screenshot_np[py, px]  # mss returns BGRA
    return [int(bgr[2]), int(bgr[1]), int(bgr[0])]  # → RGB
# ============================================================
# DETEKSI HERO dari dict slots {1: {name,rgb,type}, ...}
# ============================================================
def detect_hero(slots: dict):
    """
    slots: {x_pos(int): {"name":str, "rgb":[r,g,b], "type":"F"|"R"}}
    Return: hasil terbaik atau None
    """
    filled = sorted([x for x in slots if slots[x] is not None])
    if len(filled) < 2:
        return None

    matched_layouts = [
        l for l in LAYOUTS
        if l["xpos"] == filled
    ]
    if not matched_layouts:
        return None

    candidates = []

    for layout in matched_layouts:
        slot_data = [slots[x] for x in layout["xpos"]]

        # Validasi tipe warna per slot
        valid = True
        for i, s in enumerate(layout["slots"]):
            if s == "F"  and slot_data[i]["type"] != "F": valid = False; break
            if s == "R"  and slot_data[i]["type"] != "R": valid = False; break
            if s == "KF" and slot_data[i]["type"] != "F": valid = False; break
            if s == "KR" and slot_data[i]["type"] != "R": valid = False; break
        if not valid:
            continue

        f_data  = [slot_data[i] for i, s in enumerate(layout["slots"]) if s == "F"]
        r_data  = [slot_data[i] for i, s in enumerate(layout["slots"]) if s == "R"]
        kf_data = [slot_data[i] for i, s in enumerate(layout["slots"]) if s == "KF"]
        kr_data = [slot_data[i] for i, s in enumerate(layout["slots"]) if s == "KR"]

        for name, hero in HEROES.items():
            h_type = hero_type(hero)
            if h_type != layout["heroType"]:
                continue

            hF1 = COLORS[hero["fraksi1"]]["rgb"]
            hF2 = COLORS[hero["fraksi2"]]["rgb"] if hero.get("fraksi2") else None
            hR1 = COLORS[hero["role1"]]["rgb"]
            hR2 = COLORS[hero["role2"]]["rgb"] if hero.get("role2") else None

            dist_f = 0
            if h_type in ("1F1R", "1F2R"):
                d = color_dist(f_data[0]["rgb"], hF1)
                if d > THRESHOLD: continue
                dist_f += d
            elif h_type == "2F1R":
                d1 = color_dist(f_data[0]["rgb"], hF1)
                d2 = color_dist(f_data[1]["rgb"], hF2)
                if d1 > THRESHOLD or d2 > THRESHOLD: continue
                dist_f += d1 + d2

            dist_r = 0
            if h_type in ("1F1R", "2F1R"):
                d = color_dist(r_data[0]["rgb"], hR1)
                if d > THRESHOLD: continue
                dist_r += d
            elif h_type == "1F2R":
                d1 = color_dist(r_data[0]["rgb"], hR1)
                d2 = color_dist(r_data[1]["rgb"], hR2)
                if d1 > THRESHOLD or d2 > THRESHOLD: continue
                dist_r += d1 + d2

            if kf_data:
                kf_name = kf_data[0]["name"]
                if kf_name == hero["fraksi1"]: continue
                if hero.get("fraksi2") and kf_name == hero["fraksi2"]: continue

            if kr_data:
                kr_name = kr_data[0]["name"]
                if kr_name == hero["role1"]: continue
                if hero.get("role2") and kr_name == hero["role2"]: continue

            kristal_nama = kf_data[0]["name"] if kf_data else (kr_data[0]["name"] if kr_data else None)
            candidates.append({
                "name": name,
                "hero": hero,
                "layout": layout["id"],
                "kristal": layout["kristal"],
                "kristalNama": kristal_nama,
                "dist": dist_f + dist_r,
            })

    if not candidates:
        return None

    candidates.sort(key=lambda c: c["dist"])
    seen, top = set(), []
    for c in candidates:
        if c["name"] not in seen:
            seen.add(c["name"])
            top.append(c)

    best = top[0]
    return {
        "name": best["name"],
        "gold": best["hero"]["gold"],
        "pos":  best["hero"]["pos"],
        "fraksi": [best["hero"]["fraksi1"]] + ([best["hero"]["fraksi2"]] if best["hero"].get("fraksi2") else []),
        "role":   [best["hero"]["role1"]]   + ([best["hero"]["role2"]]   if best["hero"].get("role2")   else []),
        "layout": best["layout"],
        "kristal": best["kristal"],
        "kristalNama": best["kristalNama"],
        "dist": round(best["dist"], 1),
    }

    # ============================================================
# KONVERSI HASIL DETEKSI → FORMAT slotAssignments HTML
# ============================================================
# Pemetaan grid:
#   Row 0 → Arena baris 1  (7 slot)  col 1-7
#   Row 1 → Arena baris 2  (7 slot)  col 1-7
#   Row 2 → Arena baris 3  (7 slot)  col 1-7
#   Row 3 → Bench          (8 slot)  slot 1-8
#   Row 4 → Shop           (5 slot)  slot 1-5

def kristal_to_extras(hero: dict) -> tuple[list, list]:
    """
    Konversi hasil deteksi kristal (KF/KR) dari detect_hero() jadi
    extraFraksi/extraRole — format yang sama persis dengan yang
    biasanya diisi user lewat editHeroModal (tambahan sinergi manual).

    hero["kristal"]     → "fraksi" | "role" | "none"
    hero["kristalNama"] → nama fraksi/role yang match warna kristal
    """
    extraFraksi, extraRole = [], []
    kristal     = hero.get("kristal")
    kristalNama = hero.get("kristalNama")
    if kristal == "fraksi" and kristalNama:
        extraFraksi.append(kristalNama)
    elif kristal == "role" and kristalNama:
        extraRole.append(kristalNama)
    return extraFraksi, extraRole


def build_slot_assignments(arena: dict, bench: dict, shop: dict) -> dict:
    slots = {}

    # Arena: col 1-7, row 1-3
    for col in range(1, 8):
        for row in range(1, 4):
            hero = arena.get(f"{col}_{row}")
            if hero:
                nama = hero["name"].title()   # "LANCELOT" → "Lancelot"
                # Khusus "Yu Zhong" — .title() sudah benar
                extraFraksi, extraRole = kristal_to_extras(hero)
                slots[f"{row-1}-{col-1}"] = {
                    "name":  nama,
                    "stars": hero.get("star", 1),
                    "extraFraksi": extraFraksi,  # ← dari KF, isi otomatis
                    "extraRole":   extraRole,    # ← dari KR, isi otomatis
                }

    # Bench: slot 1-8 → gridRow 3
    for s in range(1, 9):
        hero = bench.get(str(s))
        if hero:
            extraFraksi, extraRole = kristal_to_extras(hero)
            slots[f"3-{s-1}"] = {
                "name":  hero["name"].title(),
                "stars": hero.get("star", 1),
                "extraFraksi": extraFraksi,
                "extraRole":   extraRole,
            }

    # Shop: slot 1-5 → gridRow 4
    # Catatan: SHOP_COORDS cuma sample xpos 2-6, tidak pernah cocok dengan
    # layout ber-KF/KR (xpos butuh 1 & 7), jadi kristal di shop memang
    # selalu kosong — bukan bug, area shop preview memang tidak menampilkan
    # slot kristal.
    for s in range(1, 6):
        hero = shop.get(str(s))
        if hero:
            slots[f"4-{s-1}"] = {
                "name":  hero["name"].title(),
                "stars": 1,  # shop selalu bintang 1
                "extraFraksi": [],
                "extraRole":   [],
            }

    return slots
def capture_and_detect_shop():
    with mss.MSS() as sct:
        screenshot = np.array(sct.grab(SHOP_SCAN_REGION))

    result = {
        "timestamp": time.time(),
        "shop": {},   # "slot" (1..5) → hero result atau null
    }

    for slot in range(1, 6):
        xpoints = SHOP_COORDS[slot]
        slots = {}
        log_lines = []
        for xpos, (px, py) in xpoints.items():
            rgb = sample_pixel(screenshot, px, py)
            if rgb is None:
                continue
            nearest = nearest_color(rgb)
            if nearest and nearest["dist"] <= THRESHOLD:
                slots[xpos] = {
                    "name": nearest["name"],
                    "rgb":  rgb,
                    "type": nearest["type"],
                }
                log_lines.append(
                    f"  x{xpos} ({px},{py}) → \033[92m{nearest['name']}\033[0m "
                    f"[{rgb[0]},{rgb[1]},{rgb[2]}] dist={nearest['dist']:.1f} ({nearest['type']})"
                )
            else:
                miss_dist = nearest['dist'] if nearest else 999
                log_lines.append(
                    f"  x{xpos} ({px},{py}) → \033[90mno match\033[0m "
                    f"[{rgb[0]},{rgb[1]},{rgb[2]}] dist={miss_dist:.1f}"
                )

        if VERBOSE_SLOT_LOG and log_lines:
            print(f"[Shop S{slot}]")
            for line in log_lines:
                print(line)

        hero = detect_hero(slots)
        if hero:
            hero["star"] = 1  # shop selalu bintang 1
            print(f"  ✓ Hero terdeteksi: \033[96m{hero['name']}\033[0m (layout={hero['layout']})\n")
        result["shop"][str(slot)] = hero
        if not hero:
            print(f"  – Tidak ada hero\n")

    return result
# ============================================================
def capture_and_detect():
    with mss.MSS() as sct:
        # Grab hanya area BOARD_ROI (arena + bench) — lebih cepat dari full monitor
        board_shot = np.array(sct.grab(BOARD_ROI))
        # Full monitor sebagai fallback jika koordinat di luar ROI
        monitor = sct.monitors[1]
        full_shot  = np.array(sct.grab(monitor))

    roi_left = BOARD_ROI["left"]
    roi_top  = BOARD_ROI["top"]
    roi_w    = BOARD_ROI["width"]
    roi_h    = BOARD_ROI["height"]

    def sample_board(px, py):
        """Sample pixel dari BOARD_ROI; fallback ke full_shot jika di luar ROI."""
        lx, ly = px - roi_left, py - roi_top
        if 0 <= lx < roi_w and 0 <= ly < roi_h:
            return sample_pixel(board_shot, lx, ly)
        return sample_pixel(full_shot, px, py)

    result = {
        "timestamp": time.time(),
        "arena": {},   # "col_row" → hero result atau null
        "bench": {},   # "slot"    → hero result atau null
    }

    # ── Arena ──
    for col in range(1, 8):
        for row in range(1, 4):
            xpoints = ARENA_COORDS[col][row]
            slots = {}
            log_lines = []
            for xpos, (px, py) in xpoints.items():
                rgb = sample_board(px, py)
                if rgb is None:
                    continue
                nearest = nearest_color(rgb)
                if nearest and nearest["dist"] <= THRESHOLD:
                    slots[xpos] = {"name": nearest["name"], "rgb": rgb, "type": nearest["type"]}
                    log_lines.append(
                        f"  x{xpos} ({px},{py}) → \033[92m{nearest['name']}\033[0m "
                        f"[{rgb[0]},{rgb[1]},{rgb[2]}] dist={nearest['dist']:.1f} ({nearest['type']})"
                    )
                else:
                    miss_dist = nearest['dist'] if nearest else 999
                    log_lines.append(
                        f"  x{xpos} ({px},{py}) → \033[90mno match\033[0m "
                        f"[{rgb[0]},{rgb[1]},{rgb[2]}] dist={miss_dist:.1f}"
                    )
            if VERBOSE_SLOT_LOG and log_lines:
                print(f"[Arena A{col}_{row}]")
                for line in log_lines: print(line)
            hero = detect_hero(slots)
            if hero:
                star = detect_star(board_shot, {k: (px - roi_left, py - roi_top) for k, (px, py) in ARENA_STAR[col][row].items()})
                hero["star"] = star
                print(f"  ✓ \033[96m{hero['name']}\033[0m (layout={hero['layout']}) ★{star}\n")
            result["arena"][f"{col}_{row}"] = hero
            if not hero:
                print(f"  – Tidak ada hero\n")

    # ── Bench ──
    for slot in range(1, 9):
        xpoints = BENCH_COORDS[slot]
        slots = {}
        log_lines = []
        for xpos, (px, py) in xpoints.items():
            rgb = sample_board(px, py)
            if rgb is None:
                continue
            nearest = nearest_color(rgb)
            if nearest and nearest["dist"] <= THRESHOLD:
                slots[xpos] = {"name": nearest["name"], "rgb": rgb, "type": nearest["type"]}
                log_lines.append(
                    f"  x{xpos} ({px},{py}) → \033[92m{nearest['name']}\033[0m "
                    f"[{rgb[0]},{rgb[1]},{rgb[2]}] dist={nearest['dist']:.1f} ({nearest['type']})"
                )
            else:
                miss_dist = nearest['dist'] if nearest else 999
                log_lines.append(
                    f"  x{xpos} ({px},{py}) → \033[90mno match\033[0m "
                    f"[{rgb[0]},{rgb[1]},{rgb[2]}] dist={miss_dist:.1f}"
                )
        if VERBOSE_SLOT_LOG and log_lines:
            print(f"[Bench B{slot}]")
            for line in log_lines: print(line)
        hero = detect_hero(slots)
        if hero:
            star = detect_star(board_shot, {k: (px - roi_left, py - roi_top) for k, (px, py) in BENCH_STAR[slot].items()})
            hero["star"] = star
            print(f"  ✓ \033[96m{hero['name']}\033[0m (layout={hero['layout']}) ★{star}\n")
        result["bench"][str(slot)] = hero
        if not hero:
            print(f"  – Tidak ada hero\n")

    return result

# ============================================================
# SMART PLACEMENT (Auto Arrangement Front/Back)
# ============================================================
# Aturan:
#   - Hero "front"  → isi ARENA row 1 dulu (7 slot). Kalau row 1 penuh
#                      DAN masih ada sisa hero front, lanjut ke row 2.
#   - Hero "back"   → isi ARENA row 3 dulu (7 slot). Kalau row 3 penuh
#                      DAN masih ada sisa hero back, lanjut ke row 2
#                      (diisi dari slot yang belum kepakai front).
#   - Row 2 TIDAK BOLEH diisi selama row 1 (front) / row 3 (back)
#     masih ada slot kosong yang bisa dipakai.
# ============================================================

DRAG_STEPS    = 0    # jumlah langkah gerak mouse saat drag (smooth, anti-anticheat sederhana)
DRAG_STEP_DELAY = 0
POST_DROP_DELAY = 0.35   # waktu tunggu setelah drop sebelum verifikasi screenshot
SMART_PLACEMENT_MAX_FULL_RETRY = 3  # batas pengaman jumlah pengulangan FULL RUN execute_smart_placement

def _slot_center(xpoints: dict) -> tuple:
    """Hitung titik tengah (px,py) dari kumpulan xpoint sebuah slot —
    dipakai sebagai titik klik/drag yang representatif untuk slot itu."""
    pts = [p for p in xpoints.values() if p != (0, 0)]
    if not pts:
        return (0, 0)
    avg_x = sum(p[0] for p in pts) // len(pts)
    avg_y = sum(p[1] for p in pts) // len(pts)
    return (avg_x, avg_y)

# Pre-compute titik tengah tiap slot arena & bench (dipakai berulang)
ARENA_SLOT_CENTER = {
    col: {row: _slot_center(ARENA_COORDS[col][row]) for row in range(1, 4)}
    for col in range(1, 8)
}
BENCH_SLOT_CENTER = {
    slot: _slot_center(BENCH_COORDS[slot]) for slot in range(1, 9)
}

def scan_current_positions(sct) -> dict:
    """
    Screenshot via `sct` (instance mss.MSS() yang di-passing dari caller)
    lalu deteksi seluruh arena+bench, dan kembalikan mapping:
        nama_hero (UPPERCASE) → {
            "area": "arena" | "bench",
            "col": int|None, "row": int|None, "slot": int|None,
            "coord": (px, py),   # titik tengah slot saat ini, buat drag asal
        }
    Hero yang ada >1 (duplikat) — yang terakhir ditemukan akan menimpa;
    biasanya tidak terjadi karena board game ini unik per hero.
    """
    board_shot = np.array(sct.grab(BOARD_ROI))
    monitor    = sct.monitors[1]
    full_shot  = np.array(sct.grab(monitor))

    roi_left, roi_top = BOARD_ROI["left"], BOARD_ROI["top"]
    roi_w, roi_h       = BOARD_ROI["width"], BOARD_ROI["height"]

    def sample_board(px, py):
        lx, ly = px - roi_left, py - roi_top
        if 0 <= lx < roi_w and 0 <= ly < roi_h:
            return sample_pixel(board_shot, lx, ly)
        return sample_pixel(full_shot, px, py)

    positions = []

    print(f"[Scan] === SCAN POSISI ===")

    # ── Arena ──
    for col in range(1, 8):
        for row in range(1, 4):
            xpoints = ARENA_COORDS[col][row]
            slots = {}
            slot_lines = []
            for xpos, (px, py) in xpoints.items():
                rgb = sample_board(px, py)
                if rgb is None:
                    continue
                nearest = nearest_color(rgb)
                if nearest and nearest["dist"] <= THRESHOLD:
                    slots[xpos] = {"name": nearest["name"], "rgb": rgb, "type": nearest["type"]}
                    slot_lines.append(f"      x{xpos} ({px},{py}) → {nearest['name']} {rgb} dist={nearest['dist']:.1f} ({nearest['type']})")
                else:
                    miss = nearest['dist'] if nearest else 999
                    slot_lines.append(f"      x{xpos} ({px},{py}) → no match {rgb} dist={miss:.1f}")
            hero = detect_hero(slots)
            if hero:
                star_xpoints_local = {k: (px - roi_left, py - roi_top) for k, (px, py) in ARENA_STAR[col][row].items()}
                print(f"  [Arena A{col}_{row}]")
                print(f"    Warna slot:")
                for line in slot_lines: print(line)
                print(f"    Hero: {hero['name']} layout={hero['layout']} kristal={hero.get('kristal','none')} kristalNama={hero.get('kristalNama') or '-'}")
                print(f"    Bintang scan:")
                star = detect_star(board_shot, star_xpoints_local, verbose=True)
                print(f"    lit → ★{star}")
                positions.append({
                    "name": hero["name"],
                    "area": "arena", "col": col, "row": row, "slot": None,
                    "coord": ARENA_SLOT_CENTER[col][row],
                    "star":        star,
                    "kristal":     hero.get("kristal",     "none"),
                    "kristalNama": hero.get("kristalNama", None),
                })
            else:
                print(f"  [Arena A{col}_{row}] kosong")

    # ── Bench ──
    for slot in range(1, 9):
        xpoints = BENCH_COORDS[slot]
        slots = {}
        slot_lines = []
        for xpos, (px, py) in xpoints.items():
            rgb = sample_board(px, py)
            if rgb is None:
                continue
            nearest = nearest_color(rgb)
            if nearest and nearest["dist"] <= THRESHOLD:
                slots[xpos] = {"name": nearest["name"], "rgb": rgb, "type": nearest["type"]}
                slot_lines.append(f"      x{xpos} ({px},{py}) → {nearest['name']} {rgb} dist={nearest['dist']:.1f} ({nearest['type']})")
            else:
                miss = nearest['dist'] if nearest else 999
                slot_lines.append(f"      x{xpos} ({px},{py}) → no match {rgb} dist={miss:.1f}")
        hero = detect_hero(slots)
        if hero:
            star_xpoints_local = {k: (px - roi_left, py - roi_top) for k, (px, py) in BENCH_STAR[slot].items()}
            print(f"  [Bench  B{slot}]")
            print(f"    Warna slot:")
            for line in slot_lines: print(line)
            print(f"    Hero: {hero['name']} layout={hero['layout']} kristal={hero.get('kristal','none')} kristalNama={hero.get('kristalNama') or '-'}")
            print(f"    Bintang scan:")
            star = detect_star(board_shot, star_xpoints_local, verbose=True)
            print(f"    lit → ★{star}")
            positions.append({
                "name": hero["name"],
                "area": "bench", "col": None, "row": None, "slot": slot,
                "coord": BENCH_SLOT_CENTER[slot],
                "star":        star,
                "kristal":     hero.get("kristal",     "none"),
                "kristalNama": hero.get("kristalNama", None),
            })
        else:
            print(f"  [Bench  B{slot}] kosong")

    print(f"[Scan] === SELESAI: {len(positions)} hero ditemukan ===")
    for p in positions:
        print(f"  {p['name']}: {p['area']} col={p['col']} row={p['row']} slot={p['slot']} ★{p['star']} kristal={p['kristal']} kristalNama={p.get('kristalNama') or '-'}")

    return positions

def parse_and_validate_targets(raw: list) -> dict:

    clean = []
    for item in raw:
        if isinstance(item, str):
            clean.append({"name": item.strip().upper(), "minStar": 1})
        elif isinstance(item, dict):
            name = str(item.get("name", "")).strip().upper()
            if not name:
                continue
            entry = {"name": name, "minStar": item.get("minStar", 1)}
            if "requireKristal" in item:
                entry["requireKristal"] = item["requireKristal"]
            if "kristalNama" in item:
                entry["kristalNama"] = item["kristalNama"]
            clean.append(entry)

    return {"clean": clean, "duplicates": [], "conflicts": []}


def _kristal_columns(kind: str) -> set:
    """
    Ekstrak kolom arena (1-7) yang berfungsi sebagai 'kolom kristal' jenis
    `kind` ("fraksi" → slot 'KF', "role" → slot 'KR'), diambil LANGSUNG dari
    LAYOUTS (xpos dipasangkan dengan slots), bukan hardcode manual — supaya
    kalau LAYOUTS berubah, kolom kristal otomatis ikut menyesuaikan.
    """
    target_slot = "KF" if kind == "fraksi" else "KR"
    cols = set()
    for layout in LAYOUTS:
        if layout["kristal"] != kind:
            continue
        for xpos, slot in zip(layout["xpos"], layout["slots"]):
            if slot == target_slot:
                cols.add(xpos)
    return cols

# Dihitung sekali saat import — kolom kristal fraksi & role di arena (1-7).
KRISTAL_COLUMNS = {
    "fraksi": _kristal_columns("fraksi"),
    "role":   _kristal_columns("role"),
}

def _assign_columns(entries: list, columns: list) -> tuple:

    available = list(columns)
    assigned  = []

    kf_entries     = [e for e in entries if e.get("requireKristal") == "fraksi"]
    kr_entries     = [e for e in entries if e.get("requireKristal") == "role"]
    normal_entries = [e for e in entries if e.get("requireKristal") not in ("fraksi", "role")]

    def take_priority(col_set, wanted):
        unplaced = []
        cols = sorted(c for c in available if c in col_set)
        for e in wanted:
            if not cols:
                unplaced.append(e)
                continue
            c = cols.pop(0)
            available.remove(c)
            assigned.append((e, c))
        return unplaced

    leftover_kf = take_priority(KRISTAL_COLUMNS["fraksi"], kf_entries)
    leftover_kr = take_priority(KRISTAL_COLUMNS["role"],   kr_entries)

    for e in leftover_kf + leftover_kr:
        print(f"[SmartPlacement] ⚠ '{e['name']}': kolom kristal "
              f"'{e.get('requireKristal')}' penuh/habis — ditempatkan di "
              f"kolom biasa, kristal TIDAK terjamin.")

    # Sisa hero (kf/kr yang gagal dapat kolom kristal + hero biasa) mengambil
    # kolom apapun yang masih tersedia, sesuai urutan kolom yang diberikan.
    rest = leftover_kf + leftover_kr + normal_entries
    leftover = []
    for e in rest:
        if not available:
            leftover.append(e)
            continue
        c = available.pop(0)
        assigned.append((e, c))

    return assigned, leftover


def compute_target_layout(target_heroes: list) -> list:

    front, back = [], []
    for item in target_heroes:
        # terima dict (dari parse_and_validate_targets) atau str (compat lama)
        if isinstance(item, dict):
            key         = item["name"]
            min_star    = item.get("minStar", 1)
            req_kristal = item.get("requireKristal")
            req_nama    = item.get("kristalNama")
        else:
            key         = str(item).strip().upper()
            min_star    = 1
            req_kristal = None
            req_nama    = None

        hero = HEROES.get(key)
        if not hero:
            print(f"[SmartPlacement] Lewati '{key}': tidak ada di database HEROES")
            continue

        entry = {"name": key, "minStar": min_star, "requireKristal": req_kristal, "kristalNama": req_nama}
        if hero["pos"] == "front":
            front.append(entry)
        else:
            back.append(entry)

    target = []
    row2_used = set()

    # ── FRONT → row 1 dulu ──
    front_r1, overflow_front = front[:7], front[7:]
    assigned_r1, _ = _assign_columns(front_r1, list(range(1, 8)))
    for entry, col in assigned_r1:
        target.append((entry, col, 1))

    if overflow_front:
        cols_r2_front = [c for c in range(1, 8) if c not in row2_used]
        assigned_r2f, leftover = _assign_columns(overflow_front[:7], cols_r2_front)
        for entry, col in assigned_r2f:
            target.append((entry, col, 2))
            row2_used.add(col)
        for e in leftover:
            print(f"[SmartPlacement] Row 2 penuh, '{e['name']}' tidak tertampung")

    # ── BACK → row 3 dulu ──
    back_r3, overflow_back = back[:7], back[7:]
    assigned_r3, _ = _assign_columns(back_r3, list(range(1, 8)))
    for entry, col in assigned_r3:
        target.append((entry, col, 3))

    if overflow_back:
        # back mengisi row2 dari col 7→1 supaya overflow front (1→7) dan
        # overflow back (7→1) bertemu di tengah secara alami (perilaku lama).
        cols_r2_back = [c for c in range(7, 0, -1) if c not in row2_used]
        assigned_r2b, leftover = _assign_columns(overflow_back[:7], cols_r2_back)
        for entry, col in assigned_r2b:
            target.append((entry, col, 2))
            row2_used.add(col)
        for e in leftover:
            print(f"[SmartPlacement] Row 2 penuh, '{e['name']}' tidak tertampung")

    return target

def _smooth_move(start, end, steps=DRAG_STEPS, step_delay=DRAG_STEP_DELAY):
    """Gerakkan mouse bertahap dari start ke end (linear interpolation)."""
    sx, sy = start
    ex, ey = end
    for i in range(1, steps + 1):
        t = i / steps
        x = int(sx + (ex - sx) * t)
        y = int(sy + (ey - sy) * t)
        pydirectinput.moveTo(x, y)
        time.sleep(step_delay)

def drag_hero(from_xy: tuple, to_xy: tuple):
    """Klik-drag dari from_xy ke to_xy memakai pydirectinput."""
    pydirectinput.moveTo(from_xy[0], from_xy[1])
    time.sleep(0.05)
    pydirectinput.mouseDown()
    time.sleep(0.08)
    pydirectinput.moveTo(to_xy[0], to_xy[1])
    time.sleep(0.05)
    pydirectinput.mouseUp()

def _execute_smart_placement_once(sct, target_heroes: list, run_no: int = 1, run_max: int = 1) -> dict:
    """Satu putaran penuh: scan sekali → assignment dari pool statis →
    eksekusi drag tanpa re-scan di tengah → SATU scan verifikasi di akhir.
    Tidak ada retry/drag-ulang internal di sini — kalau target belum cocok
    di scan verifikasi, dicatat apa adanya sebagai failed. Pengulangan
    seluruh proses ini (kalau diperlukan) jadi tanggung jawab caller
    (`execute_smart_placement`)."""

    print(f"[SmartPlacement] Run {run_no}/{run_max} — Mulai — target: {target_heroes}")

    # ── GAP 1: parse & validasi duplikat sebelum apapun diproses ──
    parsed     = parse_and_validate_targets(target_heroes)
    clean      = parsed["clean"]       # sudah bebas duplikat
    duplicates = parsed["duplicates"]  # Kasus A/B: dedupe
    conflicts  = parsed["conflicts"]   # Kasus C: syarat bertentangan

    # Log eksplisit hasil parsing — supaya kelihatan jelas minStar &
    # requireKristal/kristalNama BENAR-BENAR kebaca (termasuk yang di-default
    # ke minStar=1 / requireKristal=None kalau tidak dikirim frontend).
    print(f"[SmartPlacement] Target terparsing ({len(clean)}):")
    for e in clean:
        print(f"  - {e['name']}: minStar={e.get('minStar', 1)} "
              f"requireKristal={e.get('requireKristal') or '-'} "
              f"kristalNama={e.get('kristalNama') or '-'}")

    result = {
        "moved":         [],
        "skipped":       [],
        "failed":        [],
        "duplicates":    duplicates,
        "conflicts":     conflicts,
        "kristalMismatch": [],
        "movedToBench":  [],
    }

    target_layout = compute_target_layout(clean)
    if not target_layout:
        print("[SmartPlacement] Tidak ada target valid, dibatalkan.")
        return result

    # Log eksplisit hasil compute_target_layout — supaya kelihatan kolom
    # mana yang dipilih untuk tiap hero (termasuk apakah dia dapat kolom
    # kristal sesuai requireKristal-nya atau tidak).
    print(f"[SmartPlacement] Posisi target dihitung ({len(target_layout)}):")
    for entry, col, row in target_layout:
        kf = "KF" if col in KRISTAL_COLUMNS["fraksi"] else ("KR" if col in KRISTAL_COLUMNS["role"] else "-")
        print(f"  - {entry['name']} (minStar={entry.get('minStar',1)} kristal={entry.get('requireKristal') or '-'}/{entry.get('kristalNama') or '-'}) → arena({col},{row}) [kolom kristal: {kf}]")

    def find_hero(positions: list, name: str, min_star: int = 1, req_kristal=None, req_nama=None, prefer_col=None, prefer_row=None):
        """Cari hero di `positions` (pool kandidat) yang BENAR-BENAR cocok
        dengan input — star harus PAS sama dengan minStar (bukan minimal,
        jadi ★2 tidak akan dianggap memenuhi permintaan ★1), dan kalau
        requireKristal diminta, hero yang kristalnya tidak cocok (termasuk
        yang tanpa kristal) TIDAK boleh jadi fallback — kalau tidak ada yang
        exact, return None (skip). Tidak memutasi `positions`.
        prefer_col/prefer_row: kalau ada kandidat yang sudah di posisi target,
        prioritaskan dia supaya tidak direbut target duplikat lain."""
        candidates = [p for p in positions if p["name"] == name and p["star"] == min_star]
        if req_kristal:
            candidates = [p for p in candidates if p.get("kristal") == req_kristal and (not req_nama or p.get("kristalNama") == req_nama)]
        if not candidates:
            return None
        # Prefer instance yang sudah di posisi target — hindari rebut instance
        # yang sudah benar milik target duplikat lain.
        if prefer_col is not None and prefer_row is not None:
            already_there = [p for p in candidates if p.get("col") == prefer_col and p.get("row") == prefer_row]
            if already_there:
                return already_there[0]
        return candidates[0]

    # ── Helper: cari slot bench kosong pertama dari tracking in-memory
    # (bench_occ) — BUKAN re-scan, supaya konsisten dengan aturan "tidak ada
    # re-scan di tengah eksekusi drag tahap 3".
    def cari_bench_kosong(bench_occ: dict) -> int | None:
        for slot in range(1, 9):
            if slot not in bench_occ:
                return slot
        return None

    # ── Helper: cari slot ARENA kosong pertama dari tracking in-memory
    # (occ) — dipakai untuk "menampung sementara" hero non-target yang
    # tergusur dari slot target, supaya tidak harus langsung ke bench kalau
    # masih ada tempat kosong di arena itu sendiri. Urutan kolom/row ikuti
    # ARENA_SLOT_CENTER apa adanya (tidak prioritas khusus).
    def cari_arena_kosong(occ: dict) -> tuple | None:
        for col in ARENA_SLOT_CENTER:
            for row in ARENA_SLOT_CENTER[col]:
                if (col, row) not in occ:
                    return (col, row)
        return None

    # ── target_names: dipakai di seluruh proses (assignment, eviksi
    # kelebihan, cleanup akhir) untuk cek "apakah hero ini relevan target".
    target_names = {entry["name"] for entry, col, row in target_layout}

    # NB: Langkah "keluarkan hero non-target dari arena" TIDAK lagi
    # dijalankan di awal (lihat Langkah Akhir / cleanup di bawah, setelah
    # semua target selesai diproses). Prioritas sekarang: pasang SEMUA
    # hero target dulu, baru beres-beres non-target belakangan.

    # ── Langkah 2: SCAN SEKALI — snapshot ini jadi pool kandidat untuk
    # SELURUH proses assignment di bawah (tidak ada re-scan lagi sampai
    # verifikasi akhir tahap 4).
    pool = scan_current_positions(sct)
    print(f"[SmartPlacement] Pool kandidat diambil ({len(pool)} hero) — assignment dihitung dari snapshot ini saja.")

    def urutkan_target(layout: list, positions: list) -> list[tuple]:
        # Buat index posisi arena untuk cek "sudah di posisi final".
        arena_by_pos = {(p["col"], p["row"]): p for p in positions if p["area"] == "arena"}
        sudah_benar, kosong, terisi = [], [], []
        for entry, col, row in layout:
            name     = entry["name"]
            min_star = entry.get("minStar", 1)
            penghuni = arena_by_pos.get((col, row))
            req_kristal = entry.get("requireKristal"); req_nama = entry.get("kristalNama")
            if penghuni and penghuni["name"] == name and penghuni["star"] == min_star and penghuni.get("kristal", "none") == (req_kristal or "none") and (not req_nama or penghuni.get("kristalNama") == req_nama):
                # Hero yang tepat sudah di slot finalnya — proses PERTAMA
                # supaya dia diclaim duluan sebelum direbut target duplikat lain.
                sudah_benar.append((entry, col, row))
            elif penghuni:
                terisi.append((entry, col, row))
            else:
                kosong.append((entry, col, row))
        return sudah_benar + kosong + terisi

    urutan = urutkan_target(target_layout, pool)

    # ── Langkah 2b: hitung assignment SEMUA target ke pool SEBELUM drag
    # apapun dijalankan. Begitu satu instance hero diclaim untuk satu
    # target, dia dibuang dari pool, supaya target berikutnya dengan
    # kriteria identik tidak bisa menclaim hero fisik yang sama lagi.
    assignments = []  # list of (entry, target_col, target_row, hero_instance|None)
    for entry, target_col, target_row in urutan:
        name        = entry["name"]
        min_star    = entry.get("minStar", 1)
        req_kristal = entry.get("requireKristal")
        req_nama    = entry.get("kristalNama")

        current = find_hero(pool, name, min_star, req_kristal, req_nama, prefer_col=target_col, prefer_row=target_row)

        if not current:
            msg = f"hero tidak ditemukan (minStar={min_star}, kristal={req_kristal}, kristalNama={req_nama})"
            print(f"[SmartPlacement] ✗ {name}: {msg} → skipped")
            result["skipped"].append({"name": name, "reason": msg})
            assignments.append((entry, target_col, target_row, None))
            continue

        pool.remove(current)
        print(f"[SmartPlacement] Diclaim: {name} dari {current['area']} col={current['col']} row={current['row']} slot={current['slot']} ★{current['star']} kristal={current.get('kristal')} kristalNama={current.get('kristalNama') or '-'} → target arena({target_col},{target_row})")
        assignments.append((entry, target_col, target_row, current))

    # ── Langkah 3: eksekusi drag satu-persatu sesuai hasil assignment di
    # atas. TIDAK re-scan/re-verify di tengah loop ini — occupancy arena &
    # bench dilacak in-memory (occ/bench_occ) supaya tetap konsisten dengan
    # urutan drag yang benar-benar dieksekusi.
    full_snapshot = list(pool)  # sisa pool yang TIDAK terclaim oleh assignment manapun
    for _, _, _, hero_instance in assignments:
        if hero_instance is not None:
            full_snapshot.append(hero_instance)

    occ       = {(p["col"], p["row"]): p for p in full_snapshot if p["area"] == "arena"}
    bench_occ = {p["slot"]: p for p in full_snapshot if p["area"] == "bench"}

    # NB: eviksi hero non-target / "kelebihan" instance target TIDAK lagi
    # dijalankan di sini. Sesuai prioritas baru, semua target diproses dan
    # diusahakan masuk slotnya dulu (loop di bawah) — cleanup non-target
    # & kelebihan dijalankan di FASE AKHIR (setelah loop assignment ini
    # selesai), supaya tidak rebutan slot/bench dengan proses penempatan
    # target yang sedang berjalan.

    pending_to_verify = []  # (entry, target_col, target_row) yang perlu diverifikasi di tahap 4

    # ── FASE 1: hero target yang masih di BENCH — TUKAR TEMPAT langsung
    # dengan siapapun yang menempati slot final-nya (target lain ATAU
    # non-target). Game ini SWAP OTOMATIS kalau drag ke slot yang sudah
    # terisi — jadi cukup SATU drag_hero() (hero target → slot final),
    # penghuni lama otomatis ditukar balik ke slot bench yang baru
    # ditinggalkan kosong. TIDAK ada drag kedua, TIDAK perlu cek "bench
    # penuh" sama sekali (slot itu sudah pasti kosong begitu target keluar).
    # Hero target lain yang kena tukar di sini otomatis ikut "diselamatkan"
    # ke bench, supaya nanti di Fase 3 tidak ada 2 target-yang-sudah-di-
    # arena saling menghalangi slot final masing-masing.
    bench_target_entries = []  # (entry, target_col, target_row) — diproses lagi di Fase 4
    failed_entries = set()     # id(entry) yang sudah pasti gagal — jangan diproses ulang di fase berikutnya
    for entry, target_col, target_row, hero_instance in assignments:
        if hero_instance is None:
            continue  # sudah masuk skipped di Langkah 2b
        if hero_instance["area"] != "bench":
            continue  # bukan dari bench — ditangani Fase 3

        name = entry["name"]
        bench_slot_lama = hero_instance["slot"]   # slot bench yang akan ditinggalkan
        bench_xy_lama   = hero_instance["coord"]  # koordinat slot bench itu juga
        penghuni = occ.get((target_col, target_row))

        from_xy = hero_instance["coord"]
        to_xy   = ARENA_SLOT_CENTER[target_col][target_row]

        if penghuni is not None:
            print(f"[SmartPlacement] ⚠ slot ({target_col},{target_row}) ditempati '{penghuni['name']}' — tukar tempat (swap otomatis) dengan {name} (bench slot {bench_slot_lama}).")
        else:
            print(f"[SmartPlacement] → {name}: bench → arena({target_col},{target_row})")

        drag_hero(from_xy, to_xy)
        time.sleep(POST_DROP_DELAY)

        if penghuni is not None:
            # Game sudah otomatis menukar penghuni ke bench_xy_lama —
            # tinggal sinkronkan state in-memory, TANPA drag kedua.
            result["movedToBench"].append({"name": penghuni["name"], "benchSlot": bench_slot_lama})
            penghuni["area"], penghuni["col"], penghuni["row"] = "bench", None, None
            penghuni["slot"], penghuni["coord"] = bench_slot_lama, bench_xy_lama
            bench_occ[bench_slot_lama] = penghuni
            del occ[(target_col, target_row)]
        else:
            if bench_occ.get(bench_slot_lama) is hero_instance:
                del bench_occ[bench_slot_lama]

        hero_instance["area"], hero_instance["col"], hero_instance["row"] = "arena", target_col, target_row
        hero_instance["slot"], hero_instance["coord"] = None, to_xy
        occ[(target_col, target_row)] = hero_instance

        pending_to_verify.append((entry, target_col, target_row))


    # ── FASE 2: hero target yang sekarang ada di BENCH tapi belum berhasil
    # sampai posisi final (entah dari awal sudah di bench dan gagal masuk
    # di Fase 1, atau baru tergeser akibat tukar tempat) — TIDAK langsung
    # dipindah lagi di sini. Cukup dikumpulkan untuk diproses di Fase 4.
    for entry, target_col, target_row, hero_instance in assignments:
        if hero_instance is None:
            continue
        if id(entry) in failed_entries:
            continue  # sudah pasti gagal di Fase 1 — jangan dicoba lagi
        already_done = any(p[0] is entry for p in pending_to_verify)
        if hero_instance["area"] == "bench" and not already_done:
            bench_target_entries.append((entry, target_col, target_row))

    # ── FASE 3: hero target yang TIDAK tergeser ke bench (masih di arena,
    # area != bench) tapi posisinya masih salah — pindahkan ke slot final
    # masing-masing. Karena semua hero target yang sempat jadi penghalang
    # sudah "diselamatkan" ke bench di Fase 1, slot final di sini dijamin
    # cuma kosong ATAU diisi hero non-target — tapi tetap disediakan
    # fallback (cari bench kosong, defensif) seandainya ada kasus tepi yang
    # belum tertangkap asumsi ini, supaya tidak crash/silently wrong.
    for entry, target_col, target_row, hero_instance in assignments:
        if hero_instance is None:
            continue
        if id(entry) in failed_entries:
            continue
        if hero_instance["area"] != "arena":
            continue  # bukan dari arena — ditangani Fase 1/2/4 (bench)
        if any(p[0] is entry for p in pending_to_verify):
            continue  # sudah selesai diproses (jaga2, seharusnya tidak terjadi)

        name = entry["name"]
        if hero_instance["col"] == target_col and hero_instance["row"] == target_row:
            print(f"[SmartPlacement] = {name}: sudah di posisi target ({target_col},{target_row})")
            pending_to_verify.append((entry, target_col, target_row))
            continue

        penghuni = occ.get((target_col, target_row))
        if penghuni is not None and penghuni is not hero_instance:
            # ── Cek apakah ini kasus SWAP: penghuni adalah hero target yang
            # slot finalnya persis = posisi hero_instance sekarang. Kalau iya,
            # cukup 1 drag (hero_instance → slot final), game swap otomatis,
            # penghuni langsung ke posisi hero_instance yang ditinggalkan.
            hero_curr_col = hero_instance["col"]
            hero_curr_row = hero_instance["row"]
            penghuni_target = next(
                (
                    (e2, tc2, tr2)
                    for e2, tc2, tr2, hi2 in assignments
                    if hi2 is penghuni and tc2 == hero_curr_col and tr2 == hero_curr_row
                ),
                None,
            )
            if penghuni_target is not None:
                # SWAP CASE: drag 1x saja, penghuni otomatis ke slot hero_instance lama.
                e2, tc2, tr2 = penghuni_target
                print(f"[SmartPlacement] ↔ SWAP: {name} ({hero_curr_col},{hero_curr_row}) ↔ {penghuni['name']} ({target_col},{target_row}) — 1 drag, game swap otomatis.")
                from_xy = hero_instance["coord"]
                to_xy   = ARENA_SLOT_CENTER[target_col][target_row]
                drag_hero(from_xy, to_xy)
                time.sleep(POST_DROP_DELAY)

                # Update in-memory: penghuni pindah ke slot hero_instance lama
                swap_xy = ARENA_SLOT_CENTER[hero_curr_col][hero_curr_row]
                del occ[(target_col, target_row)]
                del occ[(hero_curr_col, hero_curr_row)]
                penghuni["col"], penghuni["row"], penghuni["coord"] = hero_curr_col, hero_curr_row, swap_xy
                occ[(hero_curr_col, hero_curr_row)] = penghuni

                hero_instance["col"], hero_instance["row"], hero_instance["coord"] = target_col, target_row, to_xy
                occ[(target_col, target_row)] = hero_instance

                pending_to_verify.append((entry, target_col, target_row))
                pending_to_verify.append((e2, tc2, tr2))
                continue  # skip sisa blok (drag sudah dieksekusi)
            else:
                # Bukan swap case — eviksi penghuni dulu (defensif).
                arena_kosong = cari_arena_kosong(occ)
                if arena_kosong is not None:
                    kosong_col, kosong_row = arena_kosong
                    to_xy_kosong = ARENA_SLOT_CENTER[kosong_col][kosong_row]
                    print(f"[SmartPlacement] ⚠ slot ({target_col},{target_row}) ternyata masih ditempati '{penghuni['name']}' — geser ke arena kosong ({kosong_col},{kosong_row}).")
                    drag_hero(penghuni["coord"], to_xy_kosong)
                    time.sleep(POST_DROP_DELAY)
                    del occ[(target_col, target_row)]
                    penghuni["area"], penghuni["col"], penghuni["row"] = "arena", kosong_col, kosong_row
                    penghuni["slot"], penghuni["coord"] = None, to_xy_kosong
                    occ[(kosong_col, kosong_row)] = penghuni
                else:
                    bench_slot = cari_bench_kosong(bench_occ)
                    if bench_slot is None:
                        msg = f"slot ({target_col},{target_row}) terisi '{penghuni['name']}' gagal dikeluarkan (arena & bench penuh)"
                        print(f"[SmartPlacement] ✗ {name}: {msg}")
                        result["failed"].append({"name": name, "reason": msg})
                        failed_entries.add(id(entry))
                        continue
                    bench_xy = BENCH_SLOT_CENTER[bench_slot]
                    print(f"[SmartPlacement] ⚠ slot ({target_col},{target_row}) ternyata masih ditempati '{penghuni['name']}' — arena penuh, ke bench slot {bench_slot}.")
                    drag_hero(penghuni["coord"], bench_xy)
                    time.sleep(POST_DROP_DELAY)
                    result["movedToBench"].append({"name": penghuni["name"], "benchSlot": bench_slot})
                    del occ[(target_col, target_row)]
                    penghuni["area"], penghuni["col"], penghuni["row"] = "bench", None, None
                    penghuni["slot"], penghuni["coord"] = bench_slot, bench_xy
                    bench_occ[bench_slot] = penghuni

        from_xy = hero_instance["coord"]
        to_xy   = ARENA_SLOT_CENTER[target_col][target_row]
        print(f"[SmartPlacement] → {name}: arena({hero_instance['col']},{hero_instance['row']}) → arena({target_col},{target_row})")
        drag_hero(from_xy, to_xy)
        time.sleep(POST_DROP_DELAY)

        del occ[(hero_instance["col"], hero_instance["row"])]
        hero_instance["area"], hero_instance["col"], hero_instance["row"] = "arena", target_col, target_row
        hero_instance["slot"], hero_instance["coord"] = None, to_xy
        occ[(target_col, target_row)] = hero_instance

        pending_to_verify.append((entry, target_col, target_row))

    # ── FASE 4: hero target yang "diparkir" di bench (akibat tukar tempat di
    # Fase 1) — sekarang pindahkan ke slot final masing-masing. Sama seperti
    # Fase 1: kalau slot final masih ditempati, TUKAR TEMPAT langsung (pakai
    # slot bench yang baru ditinggalkan hero ini) — tidak perlu cek "bench
    # penuh" sama sekali.
    for entry, target_col, target_row in bench_target_entries:
        # Re-ambil hero_instance terkini dari assignments (statusnya sudah
        # ter-update jadi "bench" sejak Fase 1).
        hero_instance = next((hi for e, tc, tr, hi in assignments if e is entry), None)
        if hero_instance is None or hero_instance["area"] != "bench":
            continue  # sudah diproses/tidak relevan lagi

        name = entry["name"]
        bench_slot_lama = hero_instance["slot"]
        bench_xy_lama   = hero_instance["coord"]
        penghuni = occ.get((target_col, target_row))

        from_xy = hero_instance["coord"]
        to_xy   = ARENA_SLOT_CENTER[target_col][target_row]

        if penghuni is not None:
            print(f"[SmartPlacement] ⚠ slot ({target_col},{target_row}) ditempati '{penghuni['name']}' — tukar tempat dengan {name} (bench slot {bench_slot_lama}) (Fase 4).")
            drag_hero(from_xy, to_xy)
            time.sleep(POST_DROP_DELAY)
            drag_hero(penghuni["coord"], bench_xy_lama)
            time.sleep(POST_DROP_DELAY)

            result["movedToBench"].append({"name": penghuni["name"], "benchSlot": bench_slot_lama})
            penghuni["area"], penghuni["col"], penghuni["row"] = "bench", None, None
            penghuni["slot"], penghuni["coord"] = bench_slot_lama, bench_xy_lama
            bench_occ[bench_slot_lama] = penghuni
            del occ[(target_col, target_row)]
        else:
            print(f"[SmartPlacement] → {name}: bench → arena({target_col},{target_row}) (dari parkiran Fase 1)")
            drag_hero(from_xy, to_xy)
            time.sleep(POST_DROP_DELAY)
            if bench_occ.get(bench_slot_lama) is hero_instance:
                del bench_occ[bench_slot_lama]

        hero_instance["area"], hero_instance["col"], hero_instance["row"] = "arena", target_col, target_row
        hero_instance["slot"], hero_instance["coord"] = None, to_xy
        occ[(target_col, target_row)] = hero_instance

        pending_to_verify.append((entry, target_col, target_row))

    # ── Langkah Akhir (cleanup): SETELAH semua target selesai diproses
    # (sukses ataupun gagal), baru sekarang beres-beres hero non-target dari
    # arena ke bench. Murni in-memory (occ/bench_occ), TIDAK ada re-scan.
    # Dua kategori yang dibersihkan di sini:
    #   1) Hero arena yang namanya SAMA SEKALI tidak ada di target manapun.
    #   2) Sisa di `pool` (tidak pernah diclaim assignment manapun) yang
    #      masih ada di arena dan namanya MATCH target — kelebihan/duplikat
    #      atau kriteria (★/kristal) yang tidak pernah cocok target manapun.
    # Begitu bench penuh, proses ini BERHENTI seketika — sisanya dibiarkan
    # apa adanya di arena, TIDAK dicatat sebagai failed (bukan permintaan
    # user), supaya konsisten dengan prioritas: target di atas segalanya,
    # cleanup non-target cuma best-effort selama bench masih ada tempat.
    non_target_di_arena = [p for p in occ.values() if p["name"] not in target_names]
    kelebihan_di_arena  = [p for p in pool if p["area"] == "arena" and p["name"] in target_names]
    untuk_dibersihkan   = non_target_di_arena + kelebihan_di_arena

    for instance in untuk_dibersihkan:
        # occ bisa saja sudah berubah (instance lain digeser ke sini) sejak
        # list di atas dibangun — pastikan instance ini masih benar-benar
        # menghuni slotnya saat ini sebelum diproses, supaya tidak drag
        # hero yang sudah pindah/tidak relevan lagi.
        col, row = instance["col"], instance["row"]
        if occ.get((col, row)) is not instance:
            continue

        name = instance["name"]
        bench_slot = cari_bench_kosong(bench_occ)
        if bench_slot is None:
            print(f"[SmartPlacement] ✗ {name}: non-target/kelebihan di arena({col},{row}) gagal dikeluarkan (bench penuh) — dibiarkan apa adanya, cleanup berhenti.")
            break  # bench penuh → hentikan seluruh proses cleanup, bukan cuma skip satu ini
        to_xy = BENCH_SLOT_CENTER[bench_slot]
        print(f"[SmartPlacement] ⚠ {name}: non-target/kelebihan di arena({col},{row}) — keluarkan ke bench slot {bench_slot}.")
        drag_hero(instance["coord"], to_xy)
        time.sleep(POST_DROP_DELAY)
        del occ[(col, row)]
        instance["area"], instance["col"], instance["row"] = "bench", None, None
        instance["slot"], instance["coord"] = bench_slot, to_xy
        bench_occ[bench_slot] = instance
        result["movedToBench"].append({"name": name, "benchSlot": bench_slot})
        print(f"[SmartPlacement] ✓ {name} berhasil ke bench slot {bench_slot}")

    # ── Langkah 4: SATU scan verifikasi ulang setelah semua drag tahap 3
    # selesai dieksekusi. TIDAK ada retry/drag-ulang apapun di sini — kalau
    # target belum cocok di scan verifikasi ini, cukup dicatat apa adanya
    # sebagai failed. Perbaikan (kalau diperlukan) ditangani oleh loop luar
    # di `execute_smart_placement` lewat full re-run dari Tahap 1.
    final_scan = scan_current_positions(sct)

    def verify_at(positions: list, name: str, col: int, row: int):
        return next(
            (p for p in positions if p["name"] == name and p["area"] == "arena" and p["col"] == col and p["row"] == row),
            None
        )

    for entry, target_col, target_row in pending_to_verify:
        name        = entry["name"]
        req_kristal = entry.get("requireKristal")
        req_nama    = entry.get("kristalNama")

        verify = verify_at(final_scan, name, target_col, target_row)

        if verify:
            print(f"[SmartPlacement] ✓ {name} berhasil di ({target_col},{target_row}) ★{verify['star']} kristal={verify.get('kristal')} kristalNama={verify.get('kristalNama') or '-'}")
            result["moved"].append({"name": name, "to": [target_col, target_row]})

            if req_kristal:
                actual_kristal = verify.get("kristal", "none")
                actual_nama    = verify.get("kristalNama", None)
                kristal_ok     = (actual_kristal == req_kristal)
                nama_ok        = (not req_nama) or (actual_nama == req_nama)
                if not (kristal_ok and nama_ok):
                    result["kristalMismatch"].append({
                        "name": name, "to": [target_col, target_row],
                        "requireKristal": req_kristal, "kristalNama": req_nama,
                        "actualKristal": actual_kristal, "actualNama": actual_nama,
                    })
                    print(f"[SmartPlacement] ⚠ {name}: kristal mismatch — diminta {req_kristal}/{req_nama}, aktual {actual_kristal}/{actual_nama}")
        else:
            still = next((p for p in final_scan if p["name"] == name), None)
            if still is None:
                diag = "tidak terdeteksi sama sekali setelah drag"
            elif still["area"] != "arena":
                diag = f"masih di {still['area']} slot={still.get('slot')}"
            else:
                diag = f"malah ada di arena({still['col']},{still['row']}), bukan ({target_col},{target_row})"
            print(f"[SmartPlacement] ✗ {name} gagal dipindah ke ({target_col},{target_row}) — {diag}")
            result["failed"].append({"name": name, "reason": "verifikasi gagal"})

    print(f"[SmartPlacement] Run {run_no}/{run_max} — Selesai — "
          f"moved={len(result['moved'])} skipped={len(result['skipped'])} "
          f"failed={len(result['failed'])} movedToBench={len(result['movedToBench'])}")
    return result


def _snapshot_for_compare(result: dict) -> tuple:
    """Bentuk hasil tiap run jadi tuple yang bisa dibandingkan langsung
    antar run, dipakai untuk mendeteksi kondisi 'tidak ada perubahan'
    (stabil)."""
    moved_set   = frozenset((m["name"], tuple(m["to"])) for m in result["moved"])
    failed_set  = frozenset(f["name"] for f in result["failed"])
    skipped_set = frozenset(s["name"] for s in result["skipped"])
    return (moved_set, failed_set, skipped_set)


def execute_smart_placement(sct, target_heroes: list) -> dict:
    """Jalankan `_execute_smart_placement_once` berulang-ulang (full re-run
    dari Tahap 1 tiap kali — bukan retry drag per-target) sampai dua run
    berturut-turut menghasilkan snapshot identik (stabil/tidak ada
    perubahan), atau sampai SMART_PLACEMENT_MAX_FULL_RETRY tercapai. Return
    value tetap satu `dict result` seperti sebelumnya — caller (websocket
    handler) tidak perlu tahu ada loop di dalamnya."""

    prev_snapshot = None
    result = None

    for run_no in range(1, SMART_PLACEMENT_MAX_FULL_RETRY + 1):
        result = _execute_smart_placement_once(sct, target_heroes, run_no=run_no, run_max=SMART_PLACEMENT_MAX_FULL_RETRY)
        snapshot = _snapshot_for_compare(result)

        if prev_snapshot is not None and snapshot == prev_snapshot:
            print(f"[SmartPlacement] Stabil setelah run {run_no}/{SMART_PLACEMENT_MAX_FULL_RETRY} — tidak ada perubahan dari run sebelumnya, loop berhenti.")
            break

        prev_snapshot = snapshot
    else:
        print(f"[SmartPlacement] Batas SMART_PLACEMENT_MAX_FULL_RETRY ({SMART_PLACEMENT_MAX_FULL_RETRY}) tercapai sebelum stabil — melaporkan hasil run terakhir apa adanya.")

    return result

# ============================================================
# WEBSOCKET SERVER
# ============================================================
connected_clients = set()

import logging
logging.getLogger("websockets").setLevel(logging.CRITICAL)

async def handler(websocket):
    connected_clients.add(websocket)
    addr = getattr(websocket, 'remote_address', '?')
    print(f"[+] Client terhubung: {addr}  (total: {len(connected_clients)})")
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
            except Exception:
                continue
            if data.get("action") == "capture":
                print("[→] Capture Arena/Bench...")
                result = capture_and_detect()
                slots  = build_slot_assignments(result["arena"], result["bench"], {})
                await websocket.send(json.dumps({
                    "type": "apply_slots",
                    "slotType": "arena_bench",
                    "slots": slots,
                }))
                print(f"[✓] Terkirim — {len(slots)} slot")
            elif data.get("action") == "capture_shop":
                print("[→] Capture Shop...")
                result = capture_and_detect_shop()
                slots  = build_slot_assignments({}, {}, result["shop"])
                await websocket.send(json.dumps({
                    "type": "apply_slots",
                    "slotType": "shop",
                    "slots": slots,
                }))
                print(f"[✓] Shop terkirim — {len(slots)} slot")
            elif data.get("action") == "smart_placement":
                target_heroes = data.get("heroes", [])
                print(f"[→] Smart Placement diminta — {len(target_heroes)} hero target")
                await websocket.send(json.dumps({
                    "type": "smart_placement_status",
                    "status": "started",
                    "total": len(target_heroes),
                }))
                try:
                    # execute_smart_placement blocking (drag mouse + sleep berkali-
                    # kali) → jalankan di thread terpisah supaya event loop
                    # websocket tidak freeze selama proses berjalan.
                    def _run():
                        with mss.MSS() as sct:
                            return execute_smart_placement(sct, target_heroes)
                    placement_result = await asyncio.to_thread(_run)
                    await websocket.send(json.dumps({
                        "type": "smart_placement_status",
                        "status": "done",
                        "result": placement_result,
                    }))
                    print(f"[✓] Smart Placement selesai — "
                          f"moved={len(placement_result['moved'])} "
                          f"skipped={len(placement_result['skipped'])} "
                          f"failed={len(placement_result['failed'])}")
                except Exception as e:
                    print(f"[!] Smart Placement error: {e}")
                    await websocket.send(json.dumps({
                        "type": "smart_placement_status",
                        "status": "error",
                        "message": str(e),
                    }))
    except Exception as e:
        if "ConnectionClosed" not in type(e).__name__:
            print(f"[!] Error: {e}")
    finally:
        connected_clients.discard(websocket)
        print(f"[-] Client disconnect (total: {len(connected_clients)})")

async def main():
    host, port = "localhost", 8765
    print("Hero Forge Detector Server")
    print(f"WebSocket: ws://{host}:{port}")
    print("Tekan Ctrl+C untuk stop")
    async with websockets.serve(handler, host, port):
        print("Server siap menerima koneksi...\n")
        await asyncio.get_event_loop().create_future()

def run_websocket_server():
    asyncio.run(main())

def run_hotkey_listener(window):


    def on_j():
        try:
            result = capture_and_detect()
            slots  = build_slot_assignments(result["arena"], result["bench"], {})
            payload = json.dumps(slots)
            window.evaluate_js(f"_applySlots({payload}, 'arena_bench')")
            print(f"[HOTKEY-J] {len(slots)} slot dikirim ke HTML")
        except Exception as e:
            print(f"[HOTKEY-J] Error: {e}")

    def on_k():
        try:
            result = capture_and_detect_shop()
            slots  = build_slot_assignments({}, {}, result["shop"])
            payload = json.dumps(slots)
            window.evaluate_js(f"_applySlots({payload}, 'shop')")
            print(f"[HOTKEY-K] {len(slots)} slot shop dikirim ke HTML")
        except Exception as e:
            print(f"[HOTKEY-K] Error: {e}")

    def on_x():
        try:
            # Tidak reimplementasi logic Smart Placement di Python — cukup
            # panggil ulang window.runSmartPlacement() yang sama dipakai
            # tombol "🚀 Jalankan" di baris Smart Placement (index.html).
            # Fungsi itu baca spSlots yang sudah disusun user lewat UI, lalu
            # kirim websocket {action:'smart_placement', heroes:[...]} ke
            # server.
            # (Catatan: spSend() — versi lama UI modal terpisah — sudah
            # dihapus sebagai dead code di index.html, makanya hotkey X
            # sempat tidak berfungsi karena memanggil fungsi JS yang tidak
            # ada lagi.)
            window.evaluate_js("runSmartPlacement()")
            print("[HOTKEY-X] Smart Placement dipicu (spSend) dari hotkey")
        except Exception as e:
            print(f"[HOTKEY-X] Error: {e}")

    keyboard.add_hotkey('j', on_j)
    keyboard.add_hotkey('k', on_k)
    keyboard.add_hotkey('x', on_x)
    print("[HOTKEY] J = Arena/Bench  |  K = Shop  |  X = Smart Placement")
    keyboard.wait()

def get_resource_path(relative_path):
    """Mendapatkan path absolut untuk file, mendukung PyInstaller."""
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.abspath("."), relative_path)

if __name__ == "__main__":
    # 1. Jalankan WebSocket server di thread terpisah (daemon)
    server_thread = threading.Thread(target=run_websocket_server, daemon=True)
    server_thread.start()

    # 2. Beri waktu sedikit agar server siap sebelum index.html mencoba connect
    time.sleep(0.5)

    # 3. Buka index.html via webview
    html_path = get_resource_path("index.html")
    if not os.path.exists(html_path):
        print(f"[ERROR] File tidak ditemukan: {html_path}")

    from pathlib import Path
    url = Path(html_path).as_uri()

    print(f"[SYSTEM] Membuka jendela: {url}")
    window = webview.create_window("Hero Forge", url, width=1600, height=1000, resizable=True)

    # 4. Jalankan global hotkey listener (J/K) di thread terpisah
    hotkey_thread = threading.Thread(target=run_hotkey_listener, args=(window,), daemon=True)
    hotkey_thread.start()

    webview.start(debug=True)  # ← ganti sementara