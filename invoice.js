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

const inputNama = document.getElementById("inputNama");
const inputKategori = document.getElementById("inputKategori");
const inputMerk = document.getElementById("inputMerk");
const inputStok = document.getElementById("inputStok");
const inputLokasi = document.getElementById("inputLokasi");

let rowCount = 0;
let rowToDelete = null;

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
    invoiceInfo.innerHTML = `<div class="info-item"><span class="info-label">Invoice</span><span class="info-value">${invoiceId}</span></div>`;
  }
}

function renderInfo(data) {
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
            <span class="info-label">Total Barang</span>
            <span class="info-value" id="infoTotal">${data.total}</span>
        </div>
    `;
}

// ===== HITUNG & SIMPAN TOTAL =====
function updateTotal() {
  const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
  if (!invoices[invoiceId]) return;

  const total = invoices[invoiceId].items.reduce(
    (sum, item) => sum + (parseInt(item.stok) || 0),
    0,
  );
  invoices[invoiceId].total = total;
  localStorage.setItem("invoices", JSON.stringify(invoices));

  // Update tampilan di info card
  const infoTotal = document.getElementById("infoTotal");
  if (infoTotal) infoTotal.textContent = total;
}

// ===== MODAL =====
openTambahBtn.addEventListener("click", () =>
  modalOverlay.classList.add("active"),
);
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
  inputNama.value = "";
  inputKategori.value = "";
  inputMerk.value = "";
  inputStok.value = "";
  inputLokasi.value = "";
  errorMsg.textContent = "";
}

function simpanItem() {
  const nama = inputNama.value.trim();
  const kategori = inputKategori.value.trim();
  const merk = inputMerk.value.trim();
  const stok = inputStok.value.trim();
  const lokasi = inputLokasi.value.trim();

  if (!nama || !kategori || !merk || !stok || !lokasi) {
    errorMsg.textContent = "Semua field harus diisi!";
    return;
  }

  const item = { nama, kategori, merk, stok, lokasi };

  // Simpan item ke localStorage
  const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
  if (!invoices[invoiceId])
    invoices[invoiceId] = { invoice: invoiceId, items: [] };
  invoices[invoiceId].items.push(item);
  localStorage.setItem("invoices", JSON.stringify(invoices));

  // Update total otomatis
  updateTotal();

  tambahBaris(item, true);
  tutupModal();
}

function tambahBaris(item, removeEmpty = true) {
  if (removeEmpty) {
    const emptyRow = itemTableBody.querySelector(".empty-row");
    if (emptyRow) emptyRow.remove();
  }

  rowCount++;
  const tr = document.createElement("tr");
  tr.innerHTML = `
        <td>${rowCount}</td>
        <td>${item.nama}</td>
        <td>${item.kategori}</td>
        <td>${item.merk}</td>
        <td>${item.stok}</td>
        <td>${item.lokasi}</td>
        <td><button class="btn-hapus"><i class="bx bx-trash"></i> Hapus</button></td>
    `;

  tr.querySelector(".btn-hapus").addEventListener("click", () => {
    rowToDelete = tr;
    confirmOverlay.classList.add("active");
  });

  itemTableBody.appendChild(tr);
}

// ===== KONFIRMASI HAPUS =====
confirmYes.addEventListener("click", () => {
  if (rowToDelete) {
    const rows = Array.from(
      itemTableBody.querySelectorAll("tr:not(.empty-row)"),
    );
    const rowIndex = rows.indexOf(rowToDelete);
    rowToDelete.remove();

    // Hapus dari localStorage
    const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
    if (invoices[invoiceId] && invoices[invoiceId].items) {
      invoices[invoiceId].items.splice(rowIndex, 1);
      localStorage.setItem("invoices", JSON.stringify(invoices));
    }

    // Update total otomatis setelah hapus
    updateTotal();
    updateNomor();
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

function updateNomor() {
  const rows = itemTableBody.querySelectorAll("tr:not(.empty-row)");
  if (rows.length === 0) {
    const emptyTr = document.createElement("tr");
    emptyTr.className = "empty-row";
    emptyTr.innerHTML =
      '<td colspan="7">Belum ada barang — klik "+ Tambah Barang" untuk menambah</td>';
    itemTableBody.appendChild(emptyTr);
    rowCount = 0;
  } else {
    rows.forEach((r, i) => {
      r.cells[0].textContent = i + 1;
    });
    rowCount = rows.length;
  }
}

// ===== TOMBOL BACK =====
backBtn.addEventListener("click", () => {
  window.location.href = "inputBarang.html";
});

init();
