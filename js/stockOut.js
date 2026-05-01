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

const modalOverlay = document.getElementById("modalOverlay");
const confirmOverlay = document.getElementById("confirmOverlay");
const tableBody = document.getElementById("tableBody");
const errorMsg = document.getElementById("errorMsg");
const openModalBtn = document.getElementById("openModalBtn");
const batalBtn = document.getElementById("batalBtn");
const simpanBtn = document.getElementById("simpanBtn");
const confirmYes = document.getElementById("confirmYes");
const confirmNo = document.getElementById("confirmNo");
const inputInvoice = document.getElementById("inputInvoice");
const inputTanggal = document.getElementById("inputTanggal");

// ===== USER INFO =====
document.getElementById("sidebarUsername").textContent = loggedUser;
document.getElementById("sidebarAvatar").textContent = loggedUser
  .charAt(0)
  .toUpperCase();

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

// ===== CUSTOM DROPDOWN PENERIMA =====
// customDropdown.js sudah di-load sebelum script ini
const ddPenerima = new CustomDropdown("cdPenerima", "penerima", {
  icon: "bx-user",
});

// ===== MODAL =====
openModalBtn.addEventListener("click", () => {
  ddPenerima.refresh(); // reload data terbaru dari linkedData
  inputTanggal.value = new Date().toISOString().split("T")[0];
  modalOverlay.classList.add("active");
});

batalBtn.addEventListener("click", tutupModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) tutupModal();
});
simpanBtn.addEventListener("click", simpanData);

// ===== KONFIRMASI HAPUS =====
confirmYes.addEventListener("click", () => {
  if (rowToDelete) {
    const invoiceId = rowToDelete.dataset.invoiceId;
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

// ===== RESTORE STOK =====
function restoreStok(invoiceId) {
  const stockOuts = JSON.parse(localStorage.getItem("stockOuts") || "{}");
  const invoiceData = stockOuts[invoiceId];
  if (!invoiceData || !invoiceData.items) return;

  const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
  invoiceData.items.forEach((outItem) => {
    if (invoices[outItem.invoiceAsal]) {
      const found = invoices[outItem.invoiceAsal].items.find(
        (i) => i.nama === outItem.nama && i.kategori === outItem.kategori,
      );
      if (found) {
        found.stok = parseInt(found.stok) + parseInt(outItem.jumlahKeluar);
      }
    }
  });
  localStorage.setItem("invoices", JSON.stringify(invoices));
}

// ===== SIMPAN =====
function simpanData() {
  const invoice = inputInvoice.value.trim();
  const tanggal = inputTanggal.value;
  const penerima = ddPenerima.getValue(); // ambil dari custom dropdown

  if (!invoice || !tanggal || !penerima) {
    errorMsg.textContent = "Semua field harus diisi!";
    return;
  }

  const stockOuts = JSON.parse(localStorage.getItem("stockOuts") || "{}");
  if (stockOuts[invoice]) {
    errorMsg.textContent = "Invoice keluar sudah ada!";
    return;
  }

  // ✅ Auto-tambah penerima ke linkedData jika input manual
  autoAddToLinkedData("penerima", penerima);

  stockOuts[invoice] = { invoice, tanggal, penerima, total: 0, items: [] };
  localStorage.setItem("stockOuts", JSON.stringify(stockOuts));

  const emptyRow = tableBody.querySelector(".empty-row");
  if (emptyRow) emptyRow.remove();

  rowCount++;
  buatBaris({ invoice, tanggal, penerima, total: 0 });
  tutupModal();
}

// ===== BUAT BARIS =====
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

// ===== UPDATE NOMOR =====
function updateNomor() {
  const rows = tableBody.querySelectorAll("tr:not(.empty-row)");
  if (rows.length === 0) {
    const emptyTr = document.createElement("tr");
    emptyTr.className = "empty-row";
    emptyTr.innerHTML =
      '<td colspan="6">Belum ada data — klik "Stock Out" untuk membuat invoice keluar</td>';
    tableBody.appendChild(emptyTr);
    rowCount = 0;
  } else {
    rows.forEach((r, i) => {
      r.cells[0].textContent = i + 1;
    });
    rowCount = rows.length;
  }
}

// ===== TUTUP MODAL =====
function tutupModal() {
  modalOverlay.classList.remove("active");
  inputInvoice.value = "";
  inputTanggal.value = "";
  ddPenerima.clear();
  errorMsg.textContent = "";
}

// ===== INIT =====
function init() {
  const stockOuts = JSON.parse(localStorage.getItem("stockOuts") || "{}");
  const list = Object.values(stockOuts);
  if (list.length === 0) return;
  const emptyRow = tableBody.querySelector(".empty-row");
  if (emptyRow) emptyRow.remove();
  list.forEach((data) => {
    rowCount++;
    buatBaris(data);
  });
}

// ===== SYNC TOTAL =====
window.addEventListener("focus", syncTotals);
function syncTotals() {
  const stockOuts = JSON.parse(localStorage.getItem("stockOuts") || "{}");
  tableBody.querySelectorAll("tr:not(.empty-row)").forEach((tr) => {
    const id = tr.dataset.invoiceId;
    if (stockOuts[id]) {
      tr.querySelector(".col-total").textContent = stockOuts[id].total;
    }
  });
}

init();
