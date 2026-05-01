// ===== AUTH =====
const loggedUser =
  (typeof window.loggedUser !== "undefined" && window.loggedUser) ||
  localStorage.getItem("loggedUser") ||
  "Admin";

if (!localStorage.getItem("isLoggedIn")) {
  window.location.href = "login.html";
}

// ===== INIT =====
let rowCount = 0;
let rowToDelete = null;

const modalOverlay   = document.getElementById("modalOverlay");
const confirmOverlay = document.getElementById("confirmOverlay");
const tableBody      = document.getElementById("tableBody");
const errorMsg       = document.getElementById("errorMsg");
const openModalBtn   = document.getElementById("openModalBtn");
const batalBtn       = document.getElementById("batalBtn");
const simpanBtn      = document.getElementById("simpanBtn");
const confirmYes     = document.getElementById("confirmYes");
const confirmNo      = document.getElementById("confirmNo");

const inputInvoice   = document.getElementById("inputInvoice");
const inputTanggal   = document.getElementById("inputTanggal");
const inputPenerima  = document.getElementById("inputPenerima");

// ===== USER INFO =====
document.getElementById("sidebarUsername").textContent = loggedUser;
document.getElementById("sidebarAvatar").textContent = loggedUser.charAt(0).toUpperCase();

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

// ===== ISI DATALIST PENERIMA dari linkedData =====
function loadPenerimaList() {
  const penerima = JSON.parse(localStorage.getItem("penerima") || "[]");
  const datalist = document.getElementById("penerimaList");
  datalist.innerHTML = "";
  penerima.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.nama;
    datalist.appendChild(opt);
  });
}

// ===== MODAL INPUT STOCK OUT =====
openModalBtn.addEventListener("click", () => {
  loadPenerimaList();
  // Set default tanggal hari ini
  const today = new Date().toISOString().split("T")[0];
  inputTanggal.value = today;
  modalOverlay.classList.add("active");
});

batalBtn.addEventListener("click", tutupModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) tutupModal();
});

simpanBtn.addEventListener("click", simpanData);

// ===== MODAL KONFIRMASI HAPUS =====
confirmYes.addEventListener("click", () => {
  if (rowToDelete) {
    const invoiceId = rowToDelete.dataset.invoiceId;

    // Kembalikan stok ke globalStok sebelum hapus
    restoreStok(invoiceId);

    rowToDelete.remove();
    updateNomor();

    const stockOuts = JSON.parse(localStorage.getItem("stockOuts") || "{}");
    delete stockOuts[invoiceId];
    localStorage.setItem("stockOuts", JSON.stringify(stockOuts));

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

// ===== RESTORE STOK SAAT INVOICE KELUAR DIHAPUS =====
function restoreStok(invoiceId) {
  const stockOuts = JSON.parse(localStorage.getItem("stockOuts") || "{}");
  const invoiceData = stockOuts[invoiceId];
  if (!invoiceData || !invoiceData.items) return;

  const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");

  invoiceData.items.forEach(outItem => {
    // Cari item di invoice asal dan kembalikan stoknya
    if (invoices[outItem.invoiceAsal]) {
      const inv = invoices[outItem.invoiceAsal];
      const found = inv.items.find(i => i.nama === outItem.nama && i.kategori === outItem.kategori);
      if (found) {
        found.stok = parseInt(found.stok) + parseInt(outItem.jumlahKeluar);
      }
    }
  });

  localStorage.setItem("invoices", JSON.stringify(invoices));
}

// ===== SIMPAN INVOICE KELUAR BARU =====
function simpanData() {
  const invoice  = inputInvoice.value.trim();
  const tanggal  = inputTanggal.value;
  const penerima = inputPenerima.value.trim();

  if (!invoice || !tanggal || !penerima) {
    errorMsg.textContent = "Semua field harus diisi!";
    return;
  }

  const stockOuts = JSON.parse(localStorage.getItem("stockOuts") || "{}");
  if (stockOuts[invoice]) {
    errorMsg.textContent = "Invoice keluar sudah ada!";
    return;
  }

  stockOuts[invoice] = { invoice, tanggal, penerima, total: 0, items: [] };
  localStorage.setItem("stockOuts", JSON.stringify(stockOuts));

  // Auto-tambah penerima ke linkedData jika belum ada
  autoTambahPenerima(penerima);

  const emptyRow = tableBody.querySelector(".empty-row");
  if (emptyRow) emptyRow.remove();

  rowCount++;
  buatBaris({ invoice, tanggal, penerima, total: 0 });
  tutupModal();
}

function autoTambahPenerima(namaPenerima) {
  const penerima = JSON.parse(localStorage.getItem("penerima") || "[]");
  const sudahAda = penerima.some(p => p.nama.toLowerCase() === namaPenerima.toLowerCase());
  if (!sudahAda) {
    penerima.push({ nama: namaPenerima, keterangan: "Ditambahkan otomatis dari Stock Out" });
    localStorage.setItem("penerima", JSON.stringify(penerima));
  }
}

// ===== BUAT BARIS TABEL =====
function buatBaris(data) {
  const tr = document.createElement("tr");
  tr.dataset.invoiceId = data.invoice;
  tr.innerHTML = `
    <td>${rowCount}</td>
    <td><a class="invoice-link" href="invoiceKeluar.html?id=${encodeURIComponent(data.invoice)}">${data.invoice}</a></td>
    <td>${data.tanggal}</td>
    <td>${data.penerima}</td>
    <td class="col-total">${data.total}</td>
    <td><button class="btn-hapus"><i class="bx bx-trash"></i> Hapus</button></td>
  `;

  tr.querySelector(".btn-hapus").addEventListener("click", () => {
    rowToDelete = tr;
    confirmOverlay.classList.add("active");
  });

  tableBody.appendChild(tr);
}

// ===== UPDATE NOMOR URUT =====
function updateNomor() {
  const rows = tableBody.querySelectorAll("tr:not(.empty-row)");
  if (rows.length === 0) {
    const emptyTr = document.createElement("tr");
    emptyTr.className = "empty-row";
    emptyTr.innerHTML = '<td colspan="6">Belum ada data — klik "Stock Out" untuk membuat invoice keluar</td>';
    tableBody.appendChild(emptyTr);
    rowCount = 0;
  } else {
    rows.forEach((r, i) => { r.cells[0].textContent = i + 1; });
    rowCount = rows.length;
  }
}

// ===== TUTUP MODAL =====
function tutupModal() {
  modalOverlay.classList.remove("active");
  inputInvoice.value = "";
  inputTanggal.value = "";
  inputPenerima.value = "";
  errorMsg.textContent = "";
}

// ===== INIT: render dari localStorage =====
function init() {
  const stockOuts = JSON.parse(localStorage.getItem("stockOuts") || "{}");
  const list = Object.values(stockOuts);
  if (list.length === 0) return;

  const emptyRow = tableBody.querySelector(".empty-row");
  if (emptyRow) emptyRow.remove();

  list.forEach(data => {
    rowCount++;
    buatBaris(data);
  });
}

// ===== SYNC total saat kembali ke halaman ini =====
window.addEventListener("focus", syncTotals);
function syncTotals() {
  const stockOuts = JSON.parse(localStorage.getItem("stockOuts") || "{}");
  const rows = tableBody.querySelectorAll("tr:not(.empty-row)");
  rows.forEach(tr => {
    const id = tr.dataset.invoiceId;
    if (stockOuts[id]) {
      tr.querySelector(".col-total").textContent = stockOuts[id].total;
    }
  });
}

init();