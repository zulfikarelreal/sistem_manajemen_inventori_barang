# TODO - Input Barang (Revisi)

## Progress
- [x] Update `inputBarang.html`: tambah tombol scan barcode invoice di modal
- [x] Update `inputBarang.html`: tambah kolom **Total Harga Transaksi** di tabel
- [x] Update `inputBarang.js`: perhitungan **Total Harga Transaksi** dari `items[*].harga * items[*].stok`
- [x] Update `inputBarang.js`: tambah filter rentang waktu (Hari ini, 7 hari terakhir, dst) dengan dropdown custom
- [x] Update `inputBarang.js`: implementasi handler scan (fallback via prompt)

## Remaining / Notes
- [ ] Pastikan halaman `invoice.html` (modal Tambah Barang) menyimpan `items[*].harga`.
      Saat ini `js/invoice.js` hanya menyimpan: { nama, kategori, merk, stok, lokasi }.
      Akibatnya kolom total harga bisa bernilai 0.
- [ ] UI kamera scan barcode belum dibuat; saat ini menggunakan fallback `prompt`.

