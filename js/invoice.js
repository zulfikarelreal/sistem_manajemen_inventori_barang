const params = new URLSearchParams(window.location.search);
const invoiceId = params.get("id");

const backBtn = document.getElementById("backBtn");
const navInvoiceId = document.getElementById("navInvoiceId");
const invoiceInfo = document.getElementById("invoiceInfo");
const itemTableBody = document.getElementById("itemTableBody");
const openTambahBtn = document.getElementById("openTambahBtn");
const modalOverlay = document.getElementById("modalOverlay");
const confirmOverlay = document.getElementById("confirmOverlay");
const batalBtn = document.getElementById("batalBtn");
const simpanBtn = document.getElementById("simpanBtn");
const confirmYes = document.getElementById("confirmYes");
const confirmNo = document.getElementById("confirmNo");
const errorMsg = document.getElementById("errorMsg");
const inputStok = document.getElementById("inputStok");
const inputHarga = document.getElementById("inputHarga");

let rowCount = 0;
let rowToDelete = null;

// ===== CUSTOM DROPDOWNS =====
const ddNama = new CustomDropdown("cdNama", "barang", { icon: "bx-package" });
const ddKategori = new CustomDropdown("cdKategori", "kategori", {
  icon: "bx-category",
});
const ddMerk = new CustomDropdown("cdMerk", "merk", {
  icon: "bx-purchase-tag",
});
const ddLokasi = new CustomDropdown("cdLokasi", "lokasi", {
  icon: "bx-map-pin",
});

// ===== HELPER: stok saat ini =====
// Stok awal (di invoice) dikurangi semua pengeluaran di stockOuts yang cocok
function hitungStokSaatIni(nama, kategori) {
  const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
  const stockOuts = JSON.parse(localStorage.getItem("stockOuts") || "{}");

  const inv = invoices[invoiceId];
  const itemData = inv?.items?.find(
    (i) => i.nama === nama && i.kategori === kategori,
  );
  const stokAwal = parseInt(itemData?.stok) || 0;

  let totalKeluar = 0;
  Object.values(stockOuts).forEach((so) => {
    (so.items || []).forEach((outItem) => {
      if (
        outItem.invoiceAsal === invoiceId &&
        outItem.nama === nama &&
        outItem.kategori === kategori
      ) {
        totalKeluar += parseInt(outItem.jumlahKeluar) || 0;
      }
    });
  });

  return Math.max(0, stokAwal - totalKeluar);
}

// ===== HELPER: hitung jenis & total stok masuk invoice ini =====
function hitungStatInvoice() {
  const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
  const items = invoices[invoiceId]?.items || [];
  const namaSet = new Set();
  let totalStok = 0;
  items.forEach((item) => {
    if (item.nama) namaSet.add(item.nama.toLowerCase().trim());
    totalStok += parseInt(item.stok) || 0;
  });
  return { jenis: namaSet.size, stok: totalStok };
}

// ===== RENDER INFO BOX (5 item) =====
function renderInfo(data) {
  const stat = hitungStatInvoice();
  invoiceInfo.innerHTML = `
    <div class="info-item">
      <span class="info-label">Invoice</span>
      <span class="info-value">${data.invoice}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Tanggal Masuk</span>
      <span class="info-value">${data.tanggal}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Nama Supplier</span>
      <span class="info-value">${data.supplier}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Jenis Barang</span>
      <span class="info-value" id="infoJenis">${stat.jenis}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Total Stok Masuk</span>
      <span class="info-value" id="infoTotal">${stat.stok}</span>
    </div>
  `;
}

// ===== UPDATE INFO BOX (angka jenis & stok saja) =====
function updateInfoStats() {
  const stat = hitungStatInvoice();
  const jenisEl = document.getElementById("infoJenis");
  const totalEl = document.getElementById("infoTotal");
  if (jenisEl) jenisEl.textContent = stat.jenis;
  if (totalEl) totalEl.textContent = stat.stok;
}

// ===== INIT =====
function init() {
  if (!invoiceId) {
    invoiceInfo.innerHTML = '<p style="color:red">Invoice tidak ditemukan.</p>';
    return;
  }

  navInvoiceId.textContent = invoiceId;
  const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
  const data = invoices[invoiceId];

  if (data) {
    renderInfo(data);
    if (data.items && data.items.length > 0) {
      const emptyRow = itemTableBody.querySelector(".empty-row");
      if (emptyRow) emptyRow.remove();
      data.items.forEach((item) => tambahBaris(item, false));
    }
  } else {
    invoiceInfo.innerHTML = `
      <div class="info-item">
        <span class="info-label">Invoice</span>
        <span class="info-value">${invoiceId}</span>
      </div>`;
  }
}

// ===== UPDATE TOTAL localStorage =====
function updateTotal() {
  const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
  if (!invoices[invoiceId]) return;
  // total: total stok masuk (dipakai fitur sebelumnya)
  const total = invoices[invoiceId].items.reduce(
    (sum, item) => sum + (parseInt(item.stok) || 0),
    0,
  );
  invoices[invoiceId].total = total;
  localStorage.setItem("invoices", JSON.stringify(invoices));
}

// ===== MODAL =====
openTambahBtn.addEventListener("click", () => {
  ddNama.refresh();
  ddKategori.refresh();
  ddMerk.refresh();
  ddLokasi.refresh();
  modalOverlay.classList.add("active");
});
batalBtn.addEventListener("click", tutupModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) tutupModal();
});
simpanBtn.addEventListener("click", simpanItem);

function tutupModal() {
  modalOverlay.classList.remove("active");
  clearForm();
}
function clearForm() {
  ddNama.clear();
  ddKategori.clear();
  ddMerk.clear();
  ddLokasi.clear();
  inputStok.value = "";
  inputHarga.value = "";

  errorMsg.textContent = "";
}

// ===== SIMPAN ITEM =====
function simpanItem() {
  const nama = ddNama.getValue();
  const kategori = ddKategori.getValue();
  const merk = ddMerk.getValue();
  const stok = inputStok.value.trim();
  const harga = inputHarga.value.trim();
  const lokasi = ddLokasi.getValue();

  if (!nama || !kategori || !merk || !stok || !harga || !lokasi) {
    errorMsg.textContent = "Semua field harus diisi!";
    return;
  }

  autoAddToLinkedData("barang", nama);
  autoAddToLinkedData("kategori", kategori);
  autoAddToLinkedData("merk", merk);
  autoAddToLinkedData("lokasi", lokasi);

  const item = { nama, kategori, merk, stok, harga, lokasi };

  const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
  if (!invoices[invoiceId]) {
    invoices[invoiceId] = { invoice: invoiceId, items: [] };
  }
  invoices[invoiceId].items.push(item);
  localStorage.setItem("invoices", JSON.stringify(invoices));

  updateTotal();
  tambahBaris(item, true);
  updateInfoStats();
  tutupModal();
}

// ===== TAMBAH BARIS =====
// Kolom: # | Nama | Kategori | Merk | Stok Masuk | Stok Saat Ini | Lokasi | Actions
function tambahBaris(item, removeEmpty = true) {
  if (removeEmpty) {
    const emptyRow = itemTableBody.querySelector(".empty-row");
    if (emptyRow) emptyRow.remove();
  }
  rowCount++;

  const stokMasuk = parseInt(item.stok) || 0;
  const stokSaatIni = hitungStokSaatIni(item.nama, item.kategori);

  const tr = document.createElement("tr");
  tr.dataset.nama = item.nama;
  tr.dataset.kategori = item.kategori;
  tr.innerHTML = `
    <td>${rowCount}</td>
    <td>${item.nama}</td>
    <td>${item.kategori}</td>
    <td>${item.merk}</td>
    <td>${stokMasuk}</td>
    <td class="col-stok-saat-ini">${renderStokBadge(stokSaatIni)}</td>
    <td>${item.lokasi}</td>
    <td><button class="btn-hapus"><i class="bx bx-trash"></i> Hapus</button></td>
  `;
  tr.querySelector(".btn-hapus").addEventListener("click", () => {
    rowToDelete = tr;
    confirmOverlay.classList.add("active");
  });
  itemTableBody.appendChild(tr);
}

// ===== RENDER BADGE STOK SAAT INI =====
function renderStokBadge(stok) {
  if (stok === 0) return `<span class="stok-badge stok-habis">${stok}</span>`;
  if (stok <= 5) return `<span class="stok-badge stok-menipis">${stok}</span>`;
  return `<span class="stok-badge stok-aman">${stok}</span>`;
}

// ===== KONFIRMASI HAPUS =====
confirmYes.addEventListener("click", () => {
  if (rowToDelete) {
    const rows = Array.from(
      itemTableBody.querySelectorAll("tr:not(.empty-row)"),
    );
    const rowIndex = rows.indexOf(rowToDelete);
    rowToDelete.remove();
    const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
    if (invoices[invoiceId]?.items) {
      invoices[invoiceId].items.splice(rowIndex, 1);
      localStorage.setItem("invoices", JSON.stringify(invoices));
    }
    updateTotal();
    updateNomor();
    updateInfoStats();
    rowToDelete = null;
  }
  confirmOverlay.classList.remove("active");
});

confirmNo.addEventListener("click", () => {
  rowToDelete = null;
  confirmOverlay.classList.remove("active");
});
confirmOverlay.addEventListener("click", (e) => {
  if (e.target === confirmOverlay) {
    rowToDelete = null;
    confirmOverlay.classList.remove("active");
  }
});

// ===== UPDATE NOMOR =====
function updateNomor() {
  const rows = itemTableBody.querySelectorAll("tr:not(.empty-row)");
  if (rows.length === 0) {
    const emptyTr = document.createElement("tr");
    emptyTr.className = "empty-row";
    emptyTr.innerHTML =
      '<td colspan="8">Belum ada barang — klik "+ Tambah Barang" untuk menambah</td>';
    itemTableBody.appendChild(emptyTr);
    rowCount = 0;
  } else {
    rows.forEach((r, i) => {
      r.cells[0].textContent = i + 1;
    });
    rowCount = rows.length;
  }
}

// ===== REFRESH STOK SAAT INI saat tab aktif lagi =====
window.addEventListener("focus", refreshStokSaatIni);

function refreshStokSaatIni() {
  itemTableBody.querySelectorAll("tr:not(.empty-row)").forEach((tr) => {
    const nama = tr.dataset.nama;
    const kategori = tr.dataset.kategori;
    if (!nama || !kategori) return;
    const stokSaatIni = hitungStokSaatIni(nama, kategori);
    const cell = tr.querySelector(".col-stok-saat-ini");
    if (cell) cell.innerHTML = renderStokBadge(stokSaatIni);
  });
  updateInfoStats();
}

// ===== BACK =====
backBtn.addEventListener("click", () => {
  window.location.href = "inputBarang.html";
});

init();
