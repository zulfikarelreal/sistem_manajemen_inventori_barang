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
const inputSupplier = document.getElementById("inputSupplier");
const totalBarang = document.getElementById("totalBarang"); // display only

// Buka modal
openModalBtn.addEventListener("click", () => {
  modalOverlay.classList.add("active");
});

// Tutup modal
batalBtn.addEventListener("click", tutupModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) tutupModal();
});

// Simpan
simpanBtn.addEventListener("click", simpanData);

// Konfirmasi hapus
confirmYes.addEventListener("click", () => {
  if (rowToDelete) {
    const invoiceId = rowToDelete.dataset.invoiceId;
    rowToDelete.remove();
    updateNomor();

    // Hapus dari localStorage
    const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
    delete invoices[invoiceId];
    localStorage.setItem("invoices", JSON.stringify(invoices));

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

function tutupModal() {
  modalOverlay.classList.remove("active");
  clearForm();
}

function clearForm() {
  inputInvoice.value = "";
  inputTanggal.value = "";
  inputSupplier.value = "";
  errorMsg.textContent = "";
  totalBarang.textContent = "0";
}

function simpanData() {
  const invoice = inputInvoice.value.trim();
  const tanggal = inputTanggal.value;
  const supplier = inputSupplier.value.trim();

  if (!invoice || !tanggal || !supplier) {
    errorMsg.textContent = "Semua field harus diisi!";
    return;
  }

  // Cek duplikat invoice
  const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
  if (invoices[invoice]) {
    errorMsg.textContent = "Invoice sudah ada!";
    return;
  }

  // Simpan ke localStorage, total = 0 dulu (belum ada barang)
  invoices[invoice] = { invoice, tanggal, supplier, total: 0, items: [] };
  localStorage.setItem("invoices", JSON.stringify(invoices));

  // Hapus baris kosong jika ada
  const emptyRow = tableBody.querySelector(".empty-row");
  if (emptyRow) emptyRow.remove();

  rowCount++;
  buatBaris({ invoice, tanggal, supplier, total: 0 });
  tutupModal();
}

function buatBaris(data) {
  const tr = document.createElement("tr");
  tr.dataset.invoiceId = data.invoice;
  tr.innerHTML = `
        <td>${rowCount}</td>
        <td><a class="invoice-link" href="invoice.html?id=${encodeURIComponent(data.invoice)}">${data.invoice}</a></td>
        <td>${data.tanggal}</td>
        <td>${data.supplier}</td>
        <td class="col-total">${data.total}</td>
        <td><button class="btn-hapus"><i class="bx bx-trash"></i> Hapus</button></td>
    `;

  tr.querySelector(".btn-hapus").addEventListener("click", () => {
    rowToDelete = tr;
    confirmOverlay.classList.add("active");
  });

  tableBody.appendChild(tr);
}

function updateNomor() {
  const rows = tableBody.querySelectorAll("tr:not(.empty-row)");
  if (rows.length === 0) {
    const emptyTr = document.createElement("tr");
    emptyTr.className = "empty-row";
    emptyTr.innerHTML =
      '<td colspan="6">Belum ada data — klik "Input Barang" untuk menambah</td>';
    tableBody.appendChild(emptyTr);
    rowCount = 0;
  } else {
    rows.forEach((r, i) => {
      r.cells[0].textContent = i + 1;
    });
    rowCount = rows.length;
  }
}

// ===== INIT: render ulang dari localStorage saat halaman dibuka =====
function init() {
  const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
  const list = Object.values(invoices);
  if (list.length === 0) return;

  const emptyRow = tableBody.querySelector(".empty-row");
  if (emptyRow) emptyRow.remove();

  list.forEach((data) => {
    rowCount++;
    buatBaris(data);
  });
}

// ===== SYNC total dari invoice.js via localStorage =====
// Setiap kali halaman ini aktif (focus), refresh total dari localStorage
window.addEventListener("focus", syncTotals);

function syncTotals() {
  const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
  const rows = tableBody.querySelectorAll("tr:not(.empty-row)");
  rows.forEach((tr) => {
    const id = tr.dataset.invoiceId;
    if (invoices[id]) {
      tr.querySelector(".col-total").textContent = invoices[id].total;
    }
  });
}

init();
