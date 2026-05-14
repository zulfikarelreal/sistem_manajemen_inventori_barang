// ===== INPUTBARANG.JS — REVISI: + sumJenis, + fix sync globalStok =====

const loggedUser =
  (typeof window.loggedUser !== "undefined" && window.loggedUser) ||
  localStorage.getItem("loggedUser") ||
  "Admin";

if (!localStorage.getItem("isLoggedIn")) window.location.href = "login.html";

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
let allInvoices = {};
let rowToDelete = null;
let currentTab = "manual";

// ===== CUSTOM RANGE STATE =====
let customRangeActive = false;
let customRangeFrom = null;
let customRangeTo = null;

// ===== ELEMEN CUSTOM RANGE =====
const filterWaktu = document.getElementById("filterWaktu");
const customRangePanel = document.getElementById("customRangePanel");
const customFromEl = document.getElementById("customFrom");
const customToEl = document.getElementById("customTo");
const btnApplyRange = document.getElementById("btnApplyRange");
const rangeBadge = document.getElementById("rangeBadge");
const rangeBadgeText = document.getElementById("rangeBadgeText");

// ========================================================
// ===== SCANNER STATE ====================================
// ========================================================
const INV_SCAN = { stream: null, reader: null, active: false, done: false };

let zxingLoadPromise = null;
function loadZXing() {
  if (window.ZXing) return Promise.resolve();
  if (zxingLoadPromise) return zxingLoadPromise;
  zxingLoadPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src =
      "https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js";
    s.onload = resolve;
    s.onerror = () => {
      zxingLoadPromise = null;
      reject(new Error("ZXing gagal dimuat"));
    };
    document.head.appendChild(s);
  });
  return zxingLoadPromise;
}

function stopInvScanner() {
  INV_SCAN.active = false;
  INV_SCAN.done = false;
  if (INV_SCAN.reader) {
    try {
      INV_SCAN.reader.reset();
    } catch (_) {}
    INV_SCAN.reader = null;
  }
  if (INV_SCAN.stream) {
    try {
      INV_SCAN.stream.getTracks().forEach((t) => t.stop());
    } catch (_) {}
    INV_SCAN.stream = null;
  }
  const video = document.getElementById("cameraStream");
  if (video) {
    try {
      video.pause();
      video.srcObject = null;
    } catch (_) {}
  }
  const ph = document.getElementById("scanPlaceholder");
  if (ph) ph.style.display = "flex";
  setScanStatus("");
}

// ===== ELEMEN =====
const modalOverlay = document.getElementById("modalOverlay");
const confirmOverlay = document.getElementById("confirmOverlay");
const tableBody = document.getElementById("tableBody");
const errorMsg = document.getElementById("errorMsg");

// ===== CUSTOM DROPDOWN =====
const ddSupplier = new CustomDropdown("cdSupplier", "supplier", {
  icon: "bx-store",
});
const ddSupplierScan = new CustomDropdown("cdSupplierScan", "supplier", {
  icon: "bx-store",
});

// ===== FORMAT =====
function formatRp(num) {
  if (!num || num === 0) return "Rp 0";
  return "Rp " + parseInt(num).toLocaleString("id-ID");
}

// ===== LINKED DATA =====
function getLinkedData() {
  try {
    const d = JSON.parse(localStorage.getItem("linkedData") || "{}");
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

function autoAddToLinkedData(key, value) {
  if (!value) return;
  const ex = JSON.parse(localStorage.getItem("linkedData") || "{}");
  if (!ex[key]) ex[key] = [];
  const exists = ex[key].some(
    (i) => (typeof i === "string" ? i : i.nama) === value,
  );
  if (!exists) {
    ex[key].push({ nama: value });
    localStorage.setItem("linkedData", JSON.stringify(ex));
  }
}

// ========================================================
// ===== DATE FILTER ======================================
// ========================================================
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
    case "lastmonth":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 0),
      };
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
    case "lastyear":
      return {
        from: new Date(now.getFullYear() - 1, 0, 1),
        to: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59),
      };
    case "custom":
      if (customRangeActive && customRangeFrom && customRangeTo)
        return { from: customRangeFrom, to: customRangeTo };
      return null;
    default:
      return null;
  }
}

function isInRange(tanggalStr, range) {
  if (!range) return true;
  const d = new Date(tanggalStr);
  return d >= range.from && d <= range.to;
}

function formatDateShort(date) {
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ===== CUSTOM RANGE PANEL =====
filterWaktu.addEventListener("change", () => {
  if (filterWaktu.value === "custom") {
    customRangePanel.classList.add("visible");
    if (!customFromEl.value) {
      const now = new Date();
      customFromEl.value = new Date(now.getFullYear(), 0, 1)
        .toISOString()
        .split("T")[0];
      customToEl.value = now.toISOString().split("T")[0];
    }
  } else {
    customRangePanel.classList.remove("visible");
    customRangeActive = false;
    rangeBadge.classList.remove("visible");
    renderTable();
  }
});

btnApplyRange.addEventListener("click", () => {
  const fromVal = customFromEl.value;
  const toVal = customToEl.value;
  if (!fromVal || !toVal) {
    alert("Pilih tanggal dari dan sampai terlebih dahulu.");
    return;
  }
  const fromDate = new Date(fromVal + "T00:00:00");
  const toDate = new Date(toVal + "T23:59:59");
  if (fromDate > toDate) {
    alert("Tanggal 'Dari' tidak boleh lebih besar dari 'Sampai'.");
    return;
  }
  customRangeFrom = fromDate;
  customRangeTo = toDate;
  customRangeActive = true;
  rangeBadgeText.textContent = `${formatDateShort(fromDate)} – ${formatDateShort(toDate)}`;
  rangeBadge.classList.add("visible");
  customRangePanel.classList.remove("visible");
  renderTable();
});

rangeBadge.addEventListener("click", () => {
  customRangeActive = false;
  customRangeFrom = null;
  customRangeTo = null;
  rangeBadge.classList.remove("visible");
  filterWaktu.value = "all";
  renderTable();
});

// ========================================================
// ===== HITUNG TOTAL HARGA & JENIS =======================
// ========================================================
function hitungTotalHarga(id) {
  const inv = allInvoices[id];
  if (!inv || !inv.items) return 0;
  return inv.items.reduce(
    (sum, item) =>
      sum +
      (parseFloat(item.hargaHPP || item.harga) || 0) *
        (parseInt(item.stok) || 0),
    0,
  );
}

// ===== RENDER TABLE =====
function renderTable() {
  const range = getDateRange(filterWaktu.value);
  const filtered = Object.values(allInvoices).filter((inv) =>
    isInRange(inv.tanggal, range),
  );

  // ✅ Hitung Total Jenis Barang (nama unik dari semua item di invoice yang terfilter)
  const namaSet = new Set();
  filtered.forEach((inv) => {
    if (inv.items && Array.isArray(inv.items)) {
      inv.items.forEach((item) => {
        if (item.nama) namaSet.add(item.nama.toLowerCase());
      });
    }
  });

  document.getElementById("sumTransaksi").textContent = filtered.length;
  document.getElementById("sumBarang").textContent = filtered.reduce(
    (s, inv) => s + (parseInt(inv.total) || 0),
    0,
  );
  document.getElementById("sumJenis").textContent = namaSet.size; // ✅ BARU
  document.getElementById("sumHarga").textContent = formatRp(
    filtered.reduce((s, inv) => s + hitungTotalHarga(inv.invoice), 0),
  );

  tableBody.innerHTML = "";
  if (!filtered.length) {
    tableBody.innerHTML = `<tr class="empty-row"><td colspan="7">Tidak ada data untuk periode ini</td></tr>`;
    return;
  }
  filtered.forEach((data, idx) => {
    const tr = document.createElement("tr");
    tr.dataset.invoiceId = data.invoice;
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td><a class="invoice-link" href="invoice.html?id=${encodeURIComponent(data.invoice)}">${data.invoice}</a></td>
      <td>${data.tanggal}</td>
      <td>${data.supplier}</td>
      <td class="col-total">${data.total || 0}</td>
      <td class="col-harga">${formatRp(hitungTotalHarga(data.invoice))}</td>
      <td><button class="btn-hapus"><i class="bx bx-trash"></i> Hapus</button></td>
    `;
    tr.querySelector(".btn-hapus").addEventListener("click", () => {
      rowToDelete = tr;
      confirmOverlay.classList.add("active");
    });
    tableBody.appendChild(tr);
  });
}

// ===== BUKA MODAL =====
document.getElementById("openModalBtn").addEventListener("click", () => {
  ddSupplier.refresh();
  ddSupplierScan.refresh();
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("inputTanggal").value = today;
  document.getElementById("inputTanggalScan").value = today;
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
  if (tab !== "scan") stopInvScanner();
};

// ===== KAMERA — ZXing =====
document.getElementById("btnOpenCam").addEventListener("click", async () => {
  stopInvScanner();
  setScanStatus("loading", "Memuat scanner...");
  try {
    await loadZXing();
    const reader = new ZXing.BrowserMultiFormatReader();
    INV_SCAN.reader = reader;
    INV_SCAN.done = false;
    const video = document.getElementById("cameraStream");
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    INV_SCAN.stream = stream;
    INV_SCAN.active = true;
    video.srcObject = stream;
    document.getElementById("scanPlaceholder").style.display = "none";
    setScanStatus("scanning", "Arahkan ke barcode invoice...");
    reader.decodeFromStream(stream, video, (result) => {
      if (INV_SCAN.done || !INV_SCAN.active) return;
      if (result) {
        INV_SCAN.done = true;
        showScanResult(result.getText());
        stopInvScanner();
      }
    });
  } catch (err) {
    stopInvScanner();
    const msg =
      err.message.includes("Permission") || err.message.includes("getUserMedia")
        ? "Izin kamera ditolak."
        : "Kamera gagal: " + err.message;
    setScanStatus("error", msg);
  }
});

document
  .getElementById("galleryInput")
  .addEventListener("change", async function (e) {
    const file = e.target.files[0];
    if (!file) return;
    this.value = "";
    setScanStatus("loading", "Membaca barcode dari gambar...");
    try {
      await loadZXing();
      const reader = new ZXing.BrowserMultiFormatReader();
      const url = URL.createObjectURL(file);
      try {
        const result = await reader.decodeFromImageUrl(url);
        showScanResult(result.getText());
        setScanStatus("");
      } catch (_) {
        setScanStatus(
          "error",
          "Barcode tidak terbaca. Coba gambar lebih jelas.",
        );
      } finally {
        try {
          reader.reset();
        } catch (_) {}
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setScanStatus("error", "Error: " + err.message);
    }
  });

function showScanResult(value) {
  document.getElementById("scanResultVal").textContent = value;
  document.getElementById("scanResult").style.display = "flex";
}

document.getElementById("btnUseScan").addEventListener("click", () => {
  const val = document.getElementById("scanResultVal").textContent;
  document.getElementById("inputInvoiceScan").value = val;
  document.getElementById("scanResult").style.display = "none";
  setScanStatus("");
});

function setScanStatus(state, msg = "") {
  let el = document.getElementById("scanStatusInvoice");
  if (!el) {
    el = document.createElement("div");
    el.id = "scanStatusInvoice";
    el.className = "scan-status-bar";
    const scanActions = document.querySelector("#panelScan .scan-actions");
    if (scanActions) scanActions.insertAdjacentElement("afterend", el);
    else return;
  }
  if (!state) {
    el.style.display = "none";
    return;
  }
  el.style.display = "flex";
  el.setAttribute("data-state", state);
  el.innerHTML =
    state === "loading"
      ? `<span class="spin"></span><span>${msg}</span>`
      : state === "scanning"
        ? `<i class="bx bx-barcode-reader"></i><span>${msg}</span>`
        : `<i class="bx bx-error-circle"></i><span>${msg}</span>`;
}

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
    // ✅ Saat hapus invoice: bersihkan juga globalStock terkait
    hapusInvoiceDariGlobalStok(id);
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

// ✅ Hapus entri globalStock yang berasal dari invoice tertentu
function hapusInvoiceDariGlobalStok(invoiceId) {
  const gs = JSON.parse(localStorage.getItem("globalStock") || "{}");
  // Ambil item dari invoice ini
  const inv = allInvoices[invoiceId];
  if (!inv || !inv.items) return;
  inv.items.forEach((item) => {
    const key = item.sku || item.nama;
    if (gs[key]) {
      gs[key].totalStok = Math.max(
        0,
        (parseInt(gs[key].totalStok) || 0) - (parseInt(item.stok) || 0),
      );
      if (gs[key].totalStok <= 0) delete gs[key];
    }
  });
  localStorage.setItem("globalStock", JSON.stringify(gs));
}

// ===== TUTUP MODAL =====
function tutupModal() {
  stopInvScanner();
  modalOverlay.classList.remove("active");
  errorMsg.textContent = "";
  document.getElementById("inputInvoice").value = "";
  document.getElementById("inputTanggal").value = "";
  document.getElementById("inputInvoiceScan").value = "";
  document.getElementById("inputTanggalScan").value = "";
  document.getElementById("scanResult").style.display = "none";
  ddSupplier.clear();
  ddSupplierScan.clear();
}

// ===== SYNC =====
window.addEventListener("focus", () => {
  allInvoices = JSON.parse(localStorage.getItem("invoices") || "{}");
  renderTable();
});

// ===== SAFETY NET =====
window.addEventListener("beforeunload", () => stopInvScanner());
window.addEventListener("pagehide", () => stopInvScanner());
window.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") stopInvScanner();
});

// ===== INIT =====
allInvoices = JSON.parse(localStorage.getItem("invoices") || "{}");
renderTable();
