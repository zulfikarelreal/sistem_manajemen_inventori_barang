// ===== AUTH =====
const loggedUser =
  (typeof window.loggedUser !== "undefined" && window.loggedUser) ||
  localStorage.getItem("loggedUser") ||
  "Admin";

if (!localStorage.getItem("isLoggedIn")) {
  window.location.href = "login.html";
}

// ===== AMBIL ID INVOICE DARI URL =====
const params    = new URLSearchParams(window.location.search);
const invoiceId = params.get("id");

if (!invoiceId) window.location.href = "stockOut.html";

// ===== LOAD DATA INVOICE KELUAR =====
const stockOuts  = JSON.parse(localStorage.getItem("stockOuts") || "{}");
const invoiceData = stockOuts[invoiceId];

if (!invoiceData) window.location.href = "stockOut.html";

// ===== USER INFO =====
document.getElementById("sidebarUsername").textContent = loggedUser;
document.getElementById("sidebarAvatar").textContent   = loggedUser.charAt(0).toUpperCase();

// ===== ISI INFO CHIP =====
document.getElementById("chipInvoice").textContent  = invoiceData.invoice;
document.getElementById("chipTanggal").textContent  = invoiceData.tanggal;
document.getElementById("chipPenerima").textContent = "📦 " + invoiceData.penerima;

// ===== SIDEBAR =====
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("sidebarOverlay");
document.getElementById("hamburger").addEventListener("click", () => {
  sidebar.classList.add("open");
  overlay.classList.add("active");
});
document.getElementById("sidebarClose").addEventListener("click", closeSidebar);
overlay.addEventListener("click", closeSidebar);
function closeSidebar() {
  sidebar.classList.remove("open");
  overlay.classList.remove("active");
}

// ===== LOGOUT =====
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("loggedUser");
  window.location.href = "login.html";
});

// ===== ELEMEN DOM =====
const tableBody      = document.getElementById("tableBody");
const summaryTotal   = document.getElementById("summaryTotal");
const modalOverlay   = document.getElementById("modalOverlay");
const jumlahOverlay  = document.getElementById("jumlahOverlay");
const confirmOverlay = document.getElementById("confirmOverlay");
const stokList       = document.getElementById("stokList");
const searchBarang   = document.getElementById("searchBarang");
const inputJumlah    = document.getElementById("inputJumlah");
const barangPreview  = document.getElementById("barangPreview");
const stokInfo       = document.getElementById("stokInfo");
const errorMsgJumlah = document.getElementById("errorMsgJumlah");

let selectedBarang = null;  // barang yang sedang dipilih di modal jumlah
let rowToDelete    = null;  // baris yang akan dihapus
let allGlobalStok  = [];    // cache semua barang dari global stok

// ===== BUKA MODAL PILIH BARANG =====
document.getElementById("btnAddItem").addEventListener("click", () => {
  buildGlobalStokList();
  searchBarang.value = "";
  modalOverlay.classList.add("active");
});

document.getElementById("batalBtn").addEventListener("click", () => {
  modalOverlay.classList.remove("active");
});
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) modalOverlay.classList.remove("active");
});

// ===== SEARCH BARANG =====
searchBarang.addEventListener("input", function () {
  const kw = this.value.toLowerCase();
  const filtered = kw
    ? allGlobalStok.filter(
        (b) =>
          b.nama.toLowerCase().includes(kw) ||
          b.kategori.toLowerCase().includes(kw) ||
          b.merk.toLowerCase().includes(kw) ||
          b.invoiceAsal.toLowerCase().includes(kw) ||
          b.lokasi.toLowerCase().includes(kw)
      )
    : allGlobalStok;
  renderStokList(filtered);
});

// ===== BUILD GLOBAL STOK LIST =====
function buildGlobalStokList() {
  const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
  allGlobalStok = [];

  Object.values(invoices).forEach((inv) => {
    if (!inv.items) return;
    inv.items.forEach((item) => {
      allGlobalStok.push({
        invoiceAsal : inv.invoice,
        tanggal     : inv.tanggal,
        nama        : item.nama,
        kategori    : item.kategori,
        merk        : item.merk,
        lokasi      : item.lokasi,
        stok        : parseInt(item.stok) || 0,
      });
    });
  });

  renderStokList(allGlobalStok);
}

function renderStokList(list) {
  stokList.innerHTML = "";

  if (list.length === 0) {
    stokList.innerHTML = `<div class="stok-empty-msg">Tidak ada barang yang ditemukan</div>`;
    return;
  }

  list.forEach((barang) => {
    const isEmpty = barang.stok <= 0;
    const isLow   = barang.stok > 0 && barang.stok <= 5;

    const badgeClass = isEmpty ? "stok-badge-empty" : isLow ? "stok-badge-low" : "stok-badge-ok";
    const badgeLabel = isEmpty ? "Habis" : isLow ? `Stok: ${barang.stok} (menipis)` : `Stok: ${barang.stok}`;

    const div = document.createElement("div");
    div.className = "stok-item";
    div.innerHTML = `
      <div class="stok-item-info">
        <div class="stok-item-name">${barang.nama}</div>
        <div class="stok-item-meta">
          <span>📂 ${barang.kategori}</span>
          <span>🏷️ ${barang.merk}</span>
          <span>📍 ${barang.lokasi}</span>
          <span>🧾 ${barang.invoiceAsal}</span>
        </div>
      </div>
      <div class="stok-item-right">
        <span class="stok-badge ${badgeClass}">${badgeLabel}</span>
        <button class="btn-pilih" ${isEmpty ? "disabled" : ""}>Pilih</button>
      </div>
    `;

    if (!isEmpty) {
      div.querySelector(".btn-pilih").addEventListener("click", () => {
        bukaModalJumlah(barang);
      });
    }

    stokList.appendChild(div);
  });
}

// ===== BUKA MODAL JUMLAH =====
function bukaModalJumlah(barang) {
  selectedBarang = barang;
  inputJumlah.value = 1;
  inputJumlah.max   = barang.stok;
  errorMsgJumlah.textContent = "";

  barangPreview.innerHTML = `
    <strong>${barang.nama}</strong><br>
    Kategori: ${barang.kategori} &nbsp;|&nbsp; Merk: ${barang.merk}<br>
    Lokasi: ${barang.lokasi} &nbsp;|&nbsp; Invoice Asal: ${barang.invoiceAsal}
  `;
  stokInfo.textContent = `Stok tersedia: ${barang.stok} item`;

  modalOverlay.classList.remove("active");
  jumlahOverlay.classList.add("active");
}

// ===== QTY CONTROL =====
document.getElementById("qtyMinus").addEventListener("click", () => {
  const val = parseInt(inputJumlah.value) || 1;
  if (val > 1) inputJumlah.value = val - 1;
});
document.getElementById("qtyPlus").addEventListener("click", () => {
  const val = parseInt(inputJumlah.value) || 1;
  if (selectedBarang && val < selectedBarang.stok) inputJumlah.value = val + 1;
});

// ===== BATAL MODAL JUMLAH =====
document.getElementById("batalJumlahBtn").addEventListener("click", () => {
  jumlahOverlay.classList.remove("active");
  selectedBarang = null;
  // Kembali ke modal pilih barang
  modalOverlay.classList.add("active");
});
jumlahOverlay.addEventListener("click", (e) => {
  if (e.target === jumlahOverlay) {
    jumlahOverlay.classList.remove("active");
    selectedBarang = null;
  }
});

// ===== KONFIRMASI OUT =====
document.getElementById("konfirmasiOutBtn").addEventListener("click", () => {
  const jumlah = parseInt(inputJumlah.value);

  if (!jumlah || jumlah < 1) {
    errorMsgJumlah.textContent = "Jumlah harus minimal 1!";
    return;
  }
  if (jumlah > selectedBarang.stok) {
    errorMsgJumlah.textContent = `Jumlah melebihi stok tersedia (${selectedBarang.stok})!`;
    return;
  }

  // 1. Kurangi stok di invoices (global stok)
  kurangiStok(selectedBarang.invoiceAsal, selectedBarang.nama, selectedBarang.kategori, jumlah);

  // 2. Tambah item ke stockOuts invoice ini
  const item = {
    invoiceAsal  : selectedBarang.invoiceAsal,
    nama         : selectedBarang.nama,
    kategori     : selectedBarang.kategori,
    merk         : selectedBarang.merk,
    lokasi       : selectedBarang.lokasi,
    jumlahKeluar : jumlah,
    sisaStok     : selectedBarang.stok - jumlah,
  };

  const stockOutsNow = JSON.parse(localStorage.getItem("stockOuts") || "{}");
  if (!stockOutsNow[invoiceId].items) stockOutsNow[invoiceId].items = [];
  stockOutsNow[invoiceId].items.push(item);
  stockOutsNow[invoiceId].total = stockOutsNow[invoiceId].items.length;
  localStorage.setItem("stockOuts", JSON.stringify(stockOutsNow));

  // 3. Tambah baris tabel
  tambahBarisTabel(item);
  updateSummary();

  jumlahOverlay.classList.remove("active");
  selectedBarang = null;
});

// ===== KURANGI STOK DI INVOICES =====
function kurangiStok(invoiceAsal, namaBarang, kategori, jumlah) {
  const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
  if (!invoices[invoiceAsal]) return;

  const inv   = invoices[invoiceAsal];
  const found = inv.items.find(
    (i) => i.nama === namaBarang && i.kategori === kategori
  );
  if (found) {
    found.stok = Math.max(0, parseInt(found.stok) - jumlah);
  }
  localStorage.setItem("invoices", JSON.stringify(invoices));
}

// ===== TAMBAH BARIS KE TABEL =====
let rowCount = 0;

function tambahBarisTabel(item) {
  const emptyRow = tableBody.querySelector(".empty-row");
  if (emptyRow) emptyRow.remove();

  rowCount++;
  const sisaClass = item.sisaStok <= 5 ? "stok-sisa-low" : "stok-sisa-ok";

  const tr = document.createElement("tr");
  tr.dataset.idx = rowCount - 1;
  tr.innerHTML = `
    <td>${rowCount}</td>
    <td>${item.nama}</td>
    <td><span class="badge badge-blue">${item.kategori}</span></td>
    <td>${item.merk}</td>
    <td>${item.lokasi}</td>
    <td><span class="badge badge-orange">${item.invoiceAsal}</span></td>
    <td><strong>${item.jumlahKeluar}</strong></td>
    <td class="${sisaClass}">${item.sisaStok}</td>
    <td><button class="btn-hapus"><i class="bx bx-undo"></i> Kembalikan</button></td>
  `;

  tr.querySelector(".btn-hapus").addEventListener("click", () => {
    rowToDelete = tr;
    confirmOverlay.classList.add("active");
  });

  tableBody.appendChild(tr);
}

// ===== HAPUS ITEM (kembalikan stok) =====
document.getElementById("confirmYes").addEventListener("click", () => {
  if (!rowToDelete) return;

  const idx = parseInt(rowToDelete.dataset.idx);
  const stockOutsNow = JSON.parse(localStorage.getItem("stockOuts") || "{}");
  const items = stockOutsNow[invoiceId].items || [];
  const item  = items[idx];

  if (item) {
    // Kembalikan stok ke invoice asal
    const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
    if (invoices[item.invoiceAsal]) {
      const found = invoices[item.invoiceAsal].items.find(
        (i) => i.nama === item.nama && i.kategori === item.kategori
      );
      if (found) {
        found.stok = parseInt(found.stok) + parseInt(item.jumlahKeluar);
      }
      localStorage.setItem("invoices", JSON.stringify(invoices));
    }

    // Hapus dari array items
    items.splice(idx, 1);
    stockOutsNow[invoiceId].items = items;
    stockOutsNow[invoiceId].total = items.length;
    localStorage.setItem("stockOuts", JSON.stringify(stockOutsNow));
  }

  rowToDelete.remove();
  reindexRows();
  updateSummary();

  rowToDelete = null;
  confirmOverlay.classList.remove("active");
});

document.getElementById("confirmNo").addEventListener("click", () => {
  rowToDelete = null;
  confirmOverlay.classList.remove("active");
});
confirmOverlay.addEventListener("click", (e) => {
  if (e.target === confirmOverlay) {
    rowToDelete = null;
    confirmOverlay.classList.remove("active");
  }
});

// ===== REINDEX BARIS =====
function reindexRows() {
  const rows = tableBody.querySelectorAll("tr:not(.empty-row)");
  if (rows.length === 0) {
    const emptyTr = document.createElement("tr");
    emptyTr.className = "empty-row";
    emptyTr.innerHTML = '<td colspan="9">Belum ada barang — klik "Stock Out Barang" untuk memilih barang dari stok</td>';
    tableBody.appendChild(emptyTr);
    rowCount = 0;
  } else {
    rows.forEach((r, i) => {
      r.cells[0].textContent = i + 1;
      r.dataset.idx = i;
    });
    rowCount = rows.length;
  }
}

// ===== UPDATE SUMMARY =====
function updateSummary() {
  const stockOutsNow = JSON.parse(localStorage.getItem("stockOuts") || "{}");
  const total = stockOutsNow[invoiceId]?.total || 0;
  summaryTotal.textContent = total;
}

// ===== INIT: render items yang sudah ada =====
function init() {
  const data = JSON.parse(localStorage.getItem("stockOuts") || "{}")[invoiceId];
  if (!data || !data.items || data.items.length === 0) return;

  const emptyRow = tableBody.querySelector(".empty-row");
  if (emptyRow) emptyRow.remove();

  data.items.forEach((item, i) => {
    rowCount++;
    const sisaClass = item.sisaStok <= 5 ? "stok-sisa-low" : "stok-sisa-ok";
    const tr = document.createElement("tr");
    tr.dataset.idx = i;
    tr.innerHTML = `
      <td>${rowCount}</td>
      <td>${item.nama}</td>
      <td><span class="badge badge-blue">${item.kategori}</span></td>
      <td>${item.merk}</td>
      <td>${item.lokasi}</td>
      <td><span class="badge badge-orange">${item.invoiceAsal}</span></td>
      <td><strong>${item.jumlahKeluar}</strong></td>
      <td class="${sisaClass}">${item.sisaStok}</td>
      <td><button class="btn-hapus"><i class="bx bx-undo"></i> Kembalikan</button></td>
    `;
    tr.querySelector(".btn-hapus").addEventListener("click", () => {
      rowToDelete = tr;
      confirmOverlay.classList.add("active");
    });
    tableBody.appendChild(tr);
  });

  updateSummary();
}

init();