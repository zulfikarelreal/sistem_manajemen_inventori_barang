// ===== GUARD =====
const loggedUser =
  (typeof window.loggedUser !== "undefined" && window.loggedUser) ||
  localStorage.getItem("loggedUser") ||
  "Admin";

if (!localStorage.getItem("isLoggedIn")) {
  window.location.href = "login.html";
}

// ===== VARIABEL =====
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
const scanInvoiceBtn = document.getElementById("scanInvoiceBtn");
const inputRange = document.getElementById("inputRange");
const cdRangeWrapper = document.getElementById("cdRange");
const cdRangeList = cdRangeWrapper?.querySelector(".cd-list");
const cdRangeSearch = cdRangeWrapper?.querySelector(".cd-search");

const RANGE_OPTIONS = [
  "All time",
  "Hari ini",
  "7 hari terakhir",
  "Bulan ini",
  "30 hari terakhir",
  "Bulan kemarin",
  "3 bulan terakhir",
  "6 bulan terakhir",
  "YTD",
  "12 bulan / 1 tahun terakhir",
];

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

// ===== CUSTOM DROPDOWN =====
const ddSupplier = new CustomDropdown("cdSupplier", "supplier", {
  icon: "bx-store",
});

// ===== HELPER: parse tanggal yyyy-mm-dd =====
function parseTanggal(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

// ===== HELPER: hitung jenis, stok, total harga =====
function hitungStatInvoice(invoiceData) {
  const items = invoiceData.items || [];
  const namaSet = new Set();
  let totalStok = 0;
  let totalHarga = 0;

  items.forEach((item) => {
    if (item.nama) namaSet.add(item.nama.toLowerCase().trim());
    const stok = parseInt(item.stok) || 0;
    totalStok += stok;

    // Harga per unit disimpan sebagai item.harga (sesuai revisi fitur)
    const harga = parseInt(item.harga) || 0;
    totalHarga += harga * stok;
  });

  return { jenis: namaSet.size, stok: totalStok, totalHarga };
}

function formatRupiah(n) {
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `Rp ${n.toLocaleString("id-ID")}`;
  }
}

// ===== MODAL =====
openModalBtn.addEventListener("click", () => {
  ddSupplier.refresh();
  modalOverlay.classList.add("active");
});

// ===== SCAN INVOICE (barcode) =====
scanInvoiceBtn?.addEventListener("click", async () => {
  // Fallback sederhana: Web API BarcodeDetector jika tersedia.
  // Jika tidak tersedia, minta input manual (hasil scan diisi ke inputInvoice).
  try {
    const BarcodeDetectorCtor = window.BarcodeDetector;
    if (!BarcodeDetectorCtor) {
      const hasil = window.prompt(
        "Masukkan hasil scan barcode invoice (fallback):",
      );
      if (hasil) inputInvoice.value = hasil.trim();
      return;
    }

    // UI scan kamera sederhana tidak disediakan di desain saat ini.
    // Untuk project browser-only ini: gunakan prompt sebagai placeholder.
    const hasil = window.prompt(
      "Scan barcode invoice (BarcodeDetector tidak disertakan UI kamera). Isi hasil di sini:",
    );
    if (hasil) inputInvoice.value = hasil.trim();
  } catch (e) {
    const hasil = window.prompt("Masukkan hasil scan barcode invoice:");
    if (hasil) inputInvoice.value = hasil.trim();
  }
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
    rowToDelete.remove();
    updateNomor();
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

// ===== TUTUP MODAL =====
function tutupModal() {
  modalOverlay.classList.remove("active");
  clearForm();
}
function clearForm() {
  inputInvoice.value = "";
  inputTanggal.value = "";
  ddSupplier.clear();
  errorMsg.textContent = "";
}

// ===== SIMPAN =====
function simpanData() {
  const invoice = inputInvoice.value.trim();
  const tanggal = inputTanggal.value;
  const supplier = ddSupplier.getValue();

  if (!invoice || !tanggal || !supplier) {
    errorMsg.textContent = "Semua field harus diisi!";
    return;
  }

  const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
  if (invoices[invoice]) {
    errorMsg.textContent = "Invoice sudah ada!";
    return;
  }

  autoAddToLinkedData("supplier", supplier);

  const newData = { invoice, tanggal, supplier, total: 0, items: [] };
  invoices[invoice] = newData;
  localStorage.setItem("invoices", JSON.stringify(invoices));

  const emptyRow = tableBody.querySelector(".empty-row");
  if (emptyRow) emptyRow.remove();

  rowCount++;
  buatBaris(newData);
  tutupModal();
}

// ===== BUAT BARIS =====
// Kolom: # | Invoice | Tanggal | Supplier | Jenis Barang | Total Stok Masuk | Actions
function buatBaris(data) {
  const stat = hitungStatInvoice(data);
  const tr = document.createElement("tr");
  tr.dataset.invoiceId = data.invoice;
  tr.innerHTML = `
    <td>${rowCount}</td>
    <td><a class="invoice-link" href="invoice.html?id=${encodeURIComponent(data.invoice)}">${data.invoice}</a></td>
    <td>${data.tanggal}</td>
    <td>${data.supplier}</td>
    <td class="col-jenis">${stat.jenis}</td>
    <td class="col-stok">${stat.stok}</td>
    <td class="col-harga">${formatRupiah(stat.totalHarga || 0)}</td>
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
      '<td colspan="8">Belum ada data — klik "Input Barang" untuk menambah</td>';
    tableBody.appendChild(emptyTr);
    rowCount = 0;
  } else {
    rows.forEach((r, i) => {
      r.cells[0].textContent = i + 1;
    });
    rowCount = rows.length;
  }
}

// ===== SYNC: refresh kolom jenis & stok saat tab aktif lagi =====
// (misal user baru balik dari halaman invoice setelah tambah barang)
window.addEventListener("focus", () => {
  syncStats();
  syncWithFilter();
});

// ===== FILTER RENTANG WAKTU =====
function getRangeForOption(opt) {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const startOfDay = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  const startOfMonth = (d) => {
    const x = new Date(d);
    x.setDate(1);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  const addDays = (d, days) => {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
  };

  const subMonths = (d, months) => {
    const x = new Date(d);
    x.setMonth(x.getMonth() - months);
    return x;
  };

  switch (opt) {
    case "Hari ini":
      return { start: startOfDay(now), end };
    case "7 hari terakhir":
      return { start: startOfDay(addDays(now, -6)), end };
    case "30 hari terakhir":
      return { start: startOfDay(addDays(now, -29)), end };
    case "Bulan ini":
      return { start: startOfMonth(now), end };
    case "Bulan kemarin": {
      const y = subMonths(now, 1);
      return {
        start: startOfMonth(y),
        end: new Date(startOfMonth(now).getTime() - 1),
      };
    }
    case "3 bulan terakhir":
      return { start: startOfMonth(subMonths(now, 2)), end };
    case "6 bulan terakhir":
      return { start: startOfMonth(subMonths(now, 5)), end };
    case "YTD": {
      const start = new Date(now.getFullYear(), 0, 1);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case "12 bulan / 1 tahun terakhir":
      return { start: startOfDay(addDays(now, -364)), end };
    case "All time":
      return { start: new Date(0), end: end }; // end sudah dideklarasi di atas
    default:
      return { start: null, end: null };
  }
}

function filterInvoicesByRange(option) {
  const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
  const list = Object.values(invoices);

  if (!option) return list;

  const { start, end } = getRangeForOption(option);
  if (!start || !end) return list;

  return list.filter((inv) => {
    const d = parseTanggal(inv.tanggal);
    if (!d) return false;
    return d >= start && d <= end;
  });
}

function renderTable(list) {
  // reset
  tableBody.querySelectorAll("tr:not(.empty-row)").forEach((tr) => tr.remove());
  const emptyRow = tableBody.querySelector(".empty-row");
  if (emptyRow) emptyRow.remove();

  rowCount = 0;

  if (!list || list.length === 0) {
    const emptyTr = document.createElement("tr");
    emptyTr.className = "empty-row";
    emptyTr.innerHTML =
      '<td colspan="8">Tidak ada data pada rentang waktu ini</td>';
    tableBody.appendChild(emptyTr);
    return;
  }

  list.forEach((data) => {
    rowCount++;
    buatBaris(data);
    // buatBaris sudah isi total harga
  });
}

function initRangeDropdown() {
  if (!cdRangeList) return;

  // isi opsi static (tanpa linkedData)
  cdRangeWrapper.classList.add("open");
  cdRangeList.innerHTML = "";
  cdRangeWrapper.classList.remove("open");

  cdRangeList.innerHTML = "";

  const renderOptions = (opts) => {
    cdRangeList.innerHTML = "";
    opts.forEach((opt) => {
      const li = document.createElement("li");
      li.textContent = opt;
      li.addEventListener("click", () => {
        inputRange.value = opt;
        cdRangeWrapper.classList.remove("open");
        applyFilter();
      });
      cdRangeList.appendChild(li);
    });
  };

  renderOptions(RANGE_OPTIONS);

  // simple manual open/close seperti customDropdown: kita pakai klik wrapper/input-row
  const openClose = () => {
    cdRangeWrapper.classList.toggle("open");
  };
  cdRangeWrapper
    .querySelector(".cd-input-row")
    .addEventListener("click", openClose);

  document.addEventListener("click", (e) => {
    if (!cdRangeWrapper.contains(e.target))
      cdRangeWrapper.classList.remove("open");
  });

  cdRangeSearch?.addEventListener("input", () => {
    const q = (cdRangeSearch.value || "").trim().toLowerCase();
    const filtered = RANGE_OPTIONS.filter((x) => x.toLowerCase().includes(q));
    renderOptions(filtered);
  });
}

function applyFilter() {
  const opt = inputRange.value.trim();
  const list = filterInvoicesByRange(opt);
  renderTable(list);
}

initRangeDropdown();
// default: All time
inputRange.value = inputRange.value || "All time";
applyFilter();


function syncStats() {
  const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
  tableBody.querySelectorAll("tr:not(.empty-row)").forEach((tr) => {
    const id = tr.dataset.invoiceId;
    if (!invoices[id]) return;
    const stat = hitungStatInvoice(invoices[id]);
    tr.querySelector(".col-jenis").textContent = stat.jenis;
    tr.querySelector(".col-stok").textContent = stat.stok;
    const hargaEl = tr.querySelector(".col-harga");
    if (hargaEl) hargaEl.textContent = formatRupiah(stat.totalHarga || 0);
  });
}

// Kalau ada filter aktif, re-render supaya baris yang tampil sesuai rentang waktu.
function syncWithFilter() {
  const opt = inputRange?.value?.trim?.() || "";
  const list = filterInvoicesByRange(opt);
  renderTable(list);
}

// ===== INIT =====
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

init();
