# Prompt: Perbaiki Duplikasi di score_utils.js

## OUTPUT YANG DIHARAPKAN (baca ini dulu)

Kerjakan langsung, jangan cuma menjelaskan rencana. Yang harus dihasilkan di
akhir adalah:

1. **Kode lengkap `score_utils.js` versi sudah diperbaiki** (seluruh file,
   bukan cuma potongan diff) — siap copy-paste langsung menggantikan file lama.
2. **Komentar detail di SETIAP bagian yang diubah**, ditulis dengan gaya yang
   sama seperti komentar yang sudah ada di file asli (bahasa Indonesia,
   menjelaskan ALASAN/KONTEKS, bukan cuma mengulang nama variabel). Komentar
   wajib ada di:
   - Fungsi `calcDmgSplit` setelah di-export: jelaskan bahwa fungsi ini
     sekarang dipakai DUA tempat (computeScoreTotals untuk ranking,
     calcSkorLengkap untuk render UI), supaya programmer berikutnya tidak
     menduplikasi lagi.
   - Bagian awal `calcSkorLengkap` yang sekarang memanggil `calcDmgSplit`:
     jelaskan bahwa sebelumnya bagian ini menghitung ulang dari nol, dan
     sekarang diganti untuk reuse, supaya histori perubahan ini tidak hilang.
   - (Kalau poin 4 di Tugas dikerjakan) Fungsi helper baru untuk
     Heal_Percent_HP: jelaskan persis apa itu "ember flat" vs "heartbond
     persen" dengan bahasa yang bisa dipahami non-programmer juga.
3. **Bukti tidak ada perubahan perilaku** (poin 5 di Tugas) — tulis ini
   sebagai bagian dari output, bukan cuma "saya yakin hasilnya sama".
4. Penjelasan ringkas (boleh di luar kode, sebagai teks biasa) tentang file
   apa saja yang TIDAK perlu diubah meski mereka mengimpor dari
   `score_utils.js`, dan kenapa aman.

Jangan berhenti di tahap "berikut rencana saya" atau "berikut adalah
langkah-langkahnya" — langsung tulis kode final lengkap dengan komentar di
respons pertama.

## Konteks

Proyek ini punya engine simulasi battle game (hero combo). File `score_utils.js`
adalah satu-satunya tempat yang seharusnya menghitung `damageTotal` dan
`sustainTotal` dari hasil `simulateBattle()`. Tapi saat ini ada duplikasi logika
di dalam file itu sendiri.

## Masalah yang harus diperbaiki

Di `score_utils.js`, ada dua fungsi yang menghitung hal SAMA dengan kode YANG
IDENTIK (sudah diverifikasi via diff, bukan sekadar mirip):

1. `calcDmgSplit(sim)` — fungsi privat, dipakai oleh `computeScoreTotals(sim)`.
   Hasilnya dipakai oleh `combo_worker.js` dan `comboengine.js` untuk ranking
   kombinasi hero & validasi cache (cuma butuh angka total, tanpa rincian).

2. Bagian "DMG SPLIT" di dalam `calcSkorLengkap(sim)` (baris dengan komentar
   `// ── DMG SPLIT (phys/mag per tipe event) ──`) — fungsi ini dipakai
   `render_simulation.js` untuk menampilkan modal detail hero (perlu rincian
   breakdown lengkap, bukan cuma total).

Bagian yang menghitung `basicPhysTotal`, `basicMagTotal`, `ghostPhysTotal`,
`ghostMagTotal`, `skillPhysTotal`, `skillMagTotal` dari `sim.timeline` di kedua
fungsi tersebut IDENTIK karakter per karakter. `calcSkorLengkap` menghitung
ulang dari nol alih-alih memanggil `calcDmgSplit` yang sudah ada.

Field `Heal_Percent_HP` juga dipecah dengan trik `Math.floor`/sisa desimal
(`emberFlat` vs `heartbondPersen`) yang muncul identik di `replicateCalcSkor`
DAN di `calcSkorLengkap` — sama-sama harus dirujuk ke satu tempat saja.

## Yang HARUS dipertahankan (jangan diubah perilakunya)

- `computeScoreTotals(sim)` harus tetap mengembalikan `{ damageTotal, sustainTotal }`
  dengan nilai numerik yang SAMA seperti sebelum refactor (untuk hero & sim
  yang sama, hasil sebelum dan sesudah refactor harus identik).
- `calcSkorLengkap(sim)` harus tetap mengembalikan SEMUA field yang sama
  seperti sekarang (lihat return object di akhir fungsi) dengan nilai yang
  identik — UI (`render_simulation.js`) tidak boleh berubah tampilannya.
- Jangan ubah signature (nama fungsi, parameter, urutan parameter) dari fungsi
  yang sudah diekspor: `resolveVal`, `shouldSkipCache`, `computeScoreTotals`,
  `getScoreValue`, `calcSkorLengkap`. File lain (`combo_worker.js`,
  `comboengine.js`, `render_simulation.js`) mengimpor fungsi-fungsi ini dan
  tidak boleh perlu diubah.

## Tugas

1. Export `calcDmgSplit` dari `score_utils.js` (tambahkan `export` di depan
   `function calcDmgSplit`).
2. Di dalam `calcSkorLengkap(sim)`, HAPUS bagian "DMG SPLIT" yang menghitung
   ulang `basicPhysTotal`/`basicMagTotal`/dst dari `sim.timeline`. Ganti
   dengan memanggil `calcDmgSplit(sim)` di awal fungsi dan destructure
   hasilnya:
   ```js
   const dmg = calcDmgSplit(sim);
   const { basicPhysTotal, basicMagTotal, ghostPhysTotal, ghostMagTotal,
           skillPhysTotal, skillMagTotal } = dmg;
   ```
3. Pastikan `basicTotalDmg`, `skillTotalDmg`, `ghostDmgTotal` di
   `calcSkorLengkap` tetap dihitung dari nilai yang sama (sekarang dari hasil
   `calcDmgSplit`, bukan variabel lokal yang dihitung ulang).
4. (Opsional, kalau memungkinkan tanpa mengubah hasil) Ekstrak logika
   `Math.floor`/sisa desimal untuk `Heal_Percent_HP` (variabel `emberFlat` /
   `heartbondPersen` / `passiveHeal`) jadi satu fungsi helper kecil, dipakai
   baik oleh `replicateCalcSkor` maupun `calcSkorLengkap`. Beri nama yang
   jelas, misalnya `splitHealPercent(rawHeal, hp)`, dan tambahkan komentar
   yang menjelaskan APA arti pemisahan flat vs persen ini (siapa fraksi yang
   pakai flat, siapa yang pakai persen) — komentar ini SAAT INI TIDAK ADA di
   kode asli, jadi jelaskan berdasarkan nama variabel yang ada
   (`emberFlat` → fraksi Emberlord, `heartbondPersen` → fraksi Heartbond).
5. Setelah refactor, tulis output SEBELUM/SESUDAH dari `computeScoreTotals`
   dan `calcSkorLengkap` untuk minimal 1 contoh `sim` object, untuk
   membuktikan hasilnya tidak berubah. Kalau tidak ada data contoh `sim`
   yang valid tersedia, jelaskan secara tertulis baris demi baris kenapa
   hasil numeriknya pasti sama (karena sumber datanya — `sim.timeline` —
   dan langkah perhitungannya identik dengan sebelum refactor).

## Yang TIDAK termasuk tugas ini (jangan dikerjakan kalau tidak diminta)

- Jangan menyentuh `combo_worker.js` atau `comboengine.js` — duplikasi
  `cloneHeroList`/`countFraksi`/`buildEmberlordTeamHash` di antara dua file
  itu adalah masalah TERPISAH, bukan bagian dari tugas ini.
- Jangan menghapus field `sim.skillPhysTotal`/`sim.skillMagTotal`/
  `sim.activeBuffKeys` di `simulate_battle.js` kecuali diminta secara
  terpisah — perlu verifikasi dulu ke seluruh file `data/buffs/*.js` karena
  salah satu file di sana (`Exorcist.js`) sudah pernah ternyata memakai
  fungsi terkait (`splitEventsDmg`) padahal awalnya dikira dead code.
- Jangan ubah hardcode nama fraksi (Emberlord/Heartbond/Exorcist/Dragon/
  Summon) di `replicateCalcSkor`/`calcSkorLengkap` — itu disengaja sesuai
  arsitektur proyek (tiap fraksi punya file mekanik sendiri di
  `data/buffs/`), bukan bug.

## File yang perlu dilampirkan ke AI yang mengerjakan ini

- `score_utils.js` (wajib, file utama yang diedit)
- `simulate_battle.js` (untuk referensi struktur `sim.timeline`/`sim.finalStats`)
- `combo_worker.js` dan `comboengine.js` (untuk verifikasi import tidak rusak)
- `render_simulation.js` (untuk verifikasi `calcSkorLengkap` masih dipanggil
  dan field hasilnya masih lengkap dipakai sama seperti sebelumnya)
