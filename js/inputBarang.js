// ===== AUTH =====
const loggedUser =
  (typeof window.loggedUser !== "undefined" && window.loggedUser) ||
  localStorage.getItem("loggedUser") ||
  "Admin";

if (!localStorage.getItem("isLoggedIn")) {
  window.location.href = "login.html";
}

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

// ===== STATE =====
let allInvoices = {}; // cache semua invoices
let rowToDelete = null;
let cameraStream = null;
let currentTab = "manual";

// ===== ELEMEN =====
const modalOverlay = document.getElementById("modalOverlay");
const confirmOverlay = document.getElementById("confirmOverlay");
const tableBody = document.getElementById("tableBody");
const errorMsg = document.getElementById("errorMsg");
const filterWaktu = document.getElementById("filterWaktu");

// ===== CUSTOM DROPDOWN =====
const ddSupplier = new CustomDropdown("cdSupplier", "supplier", {
  icon: "bx-store",
});
const ddSupplierScan = new CustomDropdown("cdSupplierScan", "supplier", {
  icon: "bx-store",
});

// ===== FORMAT RUPIAH =====
function formatRp(num) {
  if (!num || num === 0) return "Rp 0";
  return "Rp " + parseInt(num).toLocaleString("id-ID");
}

// ===== LINKED DATA HELPERS (sudah ada di customDropdown.js tapi kita reuse) =====
function getLinkedData() {
  try {
    const raw = localStorage.getItem("linkedData");
    const d = raw ? JSON.parse(raw) : {};
    return {
      supplier: d.supplier || [],
      barang: d.barang || [],
      kategori: d.kategori || [],
      merk: d.merk || [],
      lokasi: d.lokasi || [],
      penerima: d.penerima || [],
    };
  } catch {
    return {
      supplier: [],
      barang: [],
      kategori: [],
      merk: [],
      lokasi: [],
      penerima: [],
    };
  }
}

// ===== DATE FILTER LOGIC =====
function getDateRange(filter) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (filter) {
    case "today":
      return { from: today, to: new Date() };
    case "7d":
      return { from: new Date(today - 6 * 864e5), to: new Date() };
    case "thismonth":
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: new Date(),
      };
    case "30d":
      return { from: new Date(today - 29 * 864e5), to: new Date() };
    case "lastmonth": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: start, to: end };
    }
    case "3m":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()),
        to: new Date(),
      };
    case "6m":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()),
        to: new Date(),
      };
    case "ytd":
      return { from: new Date(now.getFullYear(), 0, 1), to: new Date() };
    case "1y":
      return {
        from: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
        to: new Date(),
      };
    default: // all
      return null;
  }
}

function isInRange(tanggalStr, range) {
  if (!range) return true;
  const d = new Date(tanggalStr);
  return d >= range.from && d <= range.to;
}

// ===== HITUNG TOTAL HARGA INVOICE =====
// Harga diambil dari item.harga * item.stok pada invoice.items
function hitungTotalHarga(invoiceId) {
  const inv = allInvoices[invoiceId];
  if (!inv || !inv.items) return 0;
  return inv.items.reduce((sum, item) => {
    const harga = parseFloat(item.harga) || 0;
    const stok = parseInt(item.stok) || 0;
    return sum + harga * stok;
  }, 0);
}

// ===== RENDER TABLE =====
function renderTable() {
  const filter = filterWaktu.value;
  const range = getDateRange(filter);
  const list = Object.values(allInvoices);
  const filtered = list.filter((inv) => isInRange(inv.tanggal, range));

  // Summary
  const totalTransaksi = filtered.length;
  const totalBarang = filtered.reduce(
    (s, inv) => s + (parseInt(inv.total) || 0),
    0,
  );
  const totalHarga = filtered.reduce(
    (s, inv) => s + hitungTotalHarga(inv.invoice),
    0,
  );

  document.getElementById("sumTransaksi").textContent = totalTransaksi;
  document.getElementById("sumBarang").textContent = totalBarang;
  document.getElementById("sumHarga").textContent = formatRp(totalHarga);

  // Table
  tableBody.innerHTML = "";
  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr class="empty-row"><td colspan="7">Tidak ada data untuk periode ini</td></tr>`;
    return;
  }

  filtered.forEach((data, idx) => {
    const tr = document.createElement("tr");
    tr.dataset.invoiceId = data.invoice;
    const totalH = hitungTotalHarga(data.invoice);
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td><a class="invoice-link" href="invoice.html?id=${encodeURIComponent(data.invoice)}">${data.invoice}</a></td>
      <td>${data.tanggal}</td>
      <td>${data.supplier}</td>
      <td class="col-total">${data.total || 0}</td>
      <td class="col-harga">${formatRp(totalH)}</td>
      <td><button class="btn-hapus"><i class="bx bx-trash"></i> Hapus</button></td>
    `;
    tr.querySelector(".btn-hapus").addEventListener("click", () => {
      rowToDelete = tr;
      confirmOverlay.classList.add("active");
    });
    tableBody.appendChild(tr);
  });
}

// ===== FILTER CHANGE =====
filterWaktu.addEventListener("change", renderTable);

// ===== BUKA MODAL =====
document.getElementById("openModalBtn").addEventListener("click", () => {
  ddSupplier.refresh();
  ddSupplierScan.refresh();
  document.getElementById("inputTanggal").value = new Date()
    .toISOString()
    .split("T")[0];
  document.getElementById("inputTanggalScan").value = new Date()
    .toISOString()
    .split("T")[0];
  errorMsg.textContent = "";
  modalOverlay.classList.add("active");
  switchTab("manual");
});

document.getElementById("modalCloseX").addEventListener("click", tutupModal);
document.getElementById("batalBtn").addEventListener("click", tutupModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) tutupModal();
});

// ===== TAB SWITCH =====
window.switchTab = function (tab) {
  currentTab = tab;
  document
    .getElementById("panelManual")
    .classList.toggle("hidden", tab !== "manual");
  document
    .getElementById("panelScan")
    .classList.toggle("hidden", tab !== "scan");
  document
    .getElementById("tabManual")
    .classList.toggle("active", tab === "manual");
  document.getElementById("tabScan").classList.toggle("active", tab === "scan");

  if (tab !== "scan" && cameraStream) {
    cameraStream.getTracks().forEach((t) => t.stop());
    cameraStream = null;
    document.getElementById("cameraStream").srcObject = null;
    document.getElementById("scanPlaceholder").style.display = "flex";
  }
};

// ===== KAMERA =====
document.getElementById("btnOpenCam").addEventListener("click", async () => {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    const video = document.getElementById("cameraStream");
    video.srcObject = cameraStream;
    document.getElementById("scanPlaceholder").style.display = "none";

    // Simulasi scan (di production gunakan library QuaggaJS atau ZXing)
    setTimeout(() => simulateScan(), 3000);
  } catch (err) {
    alert("Tidak bisa mengakses kamera: " + err.message);
  }
});

// Pilih dari galeri
document
  .getElementById("galleryInput")
  .addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (ev) {
      // Di sini normalnya kita decode barcode dari gambar
      // Simulasi: ambil nama file sebagai "barcode" untuk demo
      const fakeScan = Date.now().toString().slice(-6);
      showScanResult(fakeScan);
    };
    reader.readAsDataURL(file);
  });

function simulateScan() {
  // Simulasi hasil scan barcode — di production gunakan ZXing/Quagga
  const fakeScan = Date.now().toString().slice(-6);
  showScanResult(fakeScan);
  if (cameraStream) {
    cameraStream.getTracks().forEach((t) => t.stop());
    cameraStream = null;
  }
}

function showScanResult(value) {
  document.getElementById("scanResultVal").textContent = value;
  document.getElementById("scanResult").style.display = "flex";
  document.getElementById("cameraStream").srcObject = null;
  document.getElementById("scanPlaceholder").style.display = "flex";
}

document.getElementById("btnUseScan").addEventListener("click", () => {
  const val = document.getElementById("scanResultVal").textContent;
  document.getElementById("inputInvoiceScan").value = val;
  document.getElementById("scanResult").style.display = "none";
});

// ===== SIMPAN =====
document.getElementById("simpanBtn").addEventListener("click", simpanData);

function simpanData() {
  let invoice, tanggal, supplier;

  if (currentTab === "manual") {
    invoice = document.getElementById("inputInvoice").value.trim();
    tanggal = document.getElementById("inputTanggal").value;
    supplier = ddSupplier.getValue();
  } else {
    invoice = document.getElementById("inputInvoiceScan").value.trim();
    tanggal = document.getElementById("inputTanggalScan").value;
    supplier = ddSupplierScan.getValue();
  }

  if (!invoice || !tanggal || !supplier) {
    errorMsg.textContent = "Semua field harus diisi!";
    return;
  }

  const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
  if (invoices[invoice]) {
    errorMsg.textContent = "Invoice sudah ada!";
    return;
  }

  // Auto-add supplier ke linkedData
  autoAddToLinkedData("supplier", supplier);

  invoices[invoice] = {
    invoice,
    tanggal,
    supplier,
    total: 0,
    totalHarga: 0,
    items: [],
  };
  localStorage.setItem("invoices", JSON.stringify(invoices));

  allInvoices = invoices;
  tutupModal();
  renderTable();
}

// ===== HAPUS =====
document.getElementById("confirmYes").addEventListener("click", () => {
  if (rowToDelete) {
    const id = rowToDelete.dataset.invoiceId;
    delete allInvoices[id];
    localStorage.setItem("invoices", JSON.stringify(allInvoices));
    rowToDelete = null;
    renderTable();
  }
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

// ===== TUTUP MODAL =====
function tutupModal() {
  modalOverlay.classList.remove("active");
  errorMsg.textContent = "";
  document.getElementById("inputInvoice").value = "";
  document.getElementById("inputTanggal").value = "";
  document.getElementById("inputInvoiceScan").value = "";
  document.getElementById("inputTanggalScan").value = "";
  ddSupplier.clear();
  ddSupplierScan.clear();
  document.getElementById("scanResult").style.display = "none";
  if (cameraStream) {
    cameraStream.getTracks().forEach((t) => t.stop());
    cameraStream = null;
  }
  document.getElementById("scanPlaceholder").style.display = "flex";
}

// ===== SYNC TOTAL (dari invoice.js saat kembali) =====
window.addEventListener("focus", syncTotals);
function syncTotals() {
  allInvoices = JSON.parse(localStorage.getItem("invoices") || "{}");
  renderTable();
}

// ===== INIT =====
allInvoices = JSON.parse(localStorage.getItem("invoices") || "{}");
renderTable();
