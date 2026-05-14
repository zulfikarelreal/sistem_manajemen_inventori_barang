// ===== INVOICE.JS — REVISI: + Stat Jenis Barang, + Edit Item, + Fix Sync GlobalStok =====

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
const inputHargaHPP = document.getElementById("inputHargaHPP");
const inputHargaJual = document.getElementById("inputHargaJual");
const subtotalVal = document.getElementById("subtotalVal");
const totalHargaDisplay = document.getElementById("totalHargaDisplay");
const autofillNotice = document.getElementById("autofillNotice");

let rowCount = 0;
let rowToDelete = null;
let editRowIndex = null; // ✅ index item yang sedang diedit (-1 = mode tambah baru)

// ========================================================
// ===== SCANNER STATE ====================================
// ========================================================
const SKU_SCAN = { stream: null, reader: null, active: false, done: false };

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

function stopSKUScanner() {
  SKU_SCAN.active = false;
  SKU_SCAN.done = false;
  if (SKU_SCAN.reader) {
    try {
      SKU_SCAN.reader.reset();
    } catch (_) {}
    SKU_SCAN.reader = null;
  }
  if (SKU_SCAN.stream) {
    try {
      SKU_SCAN.stream.getTracks().forEach((t) => t.stop());
    } catch (_) {}
    SKU_SCAN.stream = null;
  }
  const video = document.getElementById("cameraStreamSKU");
  if (video) {
    try {
      video.pause();
      video.srcObject = null;
    } catch (_) {}
  }
  const ph = document.getElementById("scanPlaceholderSKU");
  if (ph) ph.style.display = "flex";
  setSKUScanStatus("");
}

function closeSKUPanel() {
  stopSKUScanner();
  document.getElementById("scannerSKUPanel")?.classList.add("hidden");
  document.getElementById("scanResultSKU")?.classList.add("hidden");
}

function setSKUScanStatus(state, msg = "") {
  let el = document.getElementById("skuScanStatus");
  if (!el) {
    el = document.createElement("div");
    el.id = "skuScanStatus";
    el.className = "scan-status";
    const panel = document.getElementById("scannerSKUPanel");
    if (panel) panel.appendChild(el);
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
        ? `<i class="bx bx-scan"></i><span>${msg}</span>`
        : `<i class="bx bx-error-circle"></i><span>${msg}</span>`;
}

// ========================================================
// ===== CUSTOM DROPDOWNS =================================
// ========================================================
const ddNama = new CustomDropdown("cdNama", "barang", { icon: "bx-package" });
const ddKategori = new CustomDropdown("cdKategori", "kategori", {
  icon: "bx-category",
});
const ddMerk = new CustomDropdown("cdMerk", "merk", {
  icon: "bx-purchase-tag",
});
const ddLokasi = new CustomDropdown("cdLokasi", "lokasi", { icon: "bx-map" });

// ========================================================
// ===== HELPERS ==========================================
// ========================================================
function formatRp(num) {
  if (!num || num === 0) return "Rp 0";
  return "Rp " + parseInt(num).toLocaleString("id-ID");
}

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
      sku: d.sku || [],
    };
  } catch {
    return {
      supplier: [],
      barang: [],
      kategori: [],
      merk: [],
      lokasi: [],
      penerima: [],
      sku: [],
    };
  }
}

function autoAddToLinkedData(key, value) {
  if (!value || value === "-") return;
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

function autoAddSKUToLinkedData(obj) {
  const ex = JSON.parse(localStorage.getItem("linkedData") || "{}");
  if (!ex.sku) ex.sku = [];
  const idx = ex.sku.findIndex((s) => s.sku === obj.sku);
  if (idx === -1) ex.sku.push(obj);
  else ex.sku[idx] = obj;
  localStorage.setItem("linkedData", JSON.stringify(ex));
}

function findSKUInLinkedData(sku) {
  return (getLinkedData().sku || []).find((s) => s.sku === sku) || null;
}

// ========================================================
// ===== GLOBAL STOCK SYNC ================================
// ========================================================

/**
 * ✅ Rebuild seluruh globalStock dari semua invoices yang ada.
 * Ini adalah cara paling akurat — menghindari drift saat edit/hapus item.
 */
function rebuildGlobalStock() {
  const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
  const gs = {};

  Object.values(invoices).forEach((inv) => {
    if (!inv.items) return;
    inv.items.forEach((item) => {
      const key = item.sku || item.nama;
      if (!gs[key]) {
        gs[key] = {
          sku: item.sku || "",
          nama: item.nama,
          merk: item.merk,
          kategori: item.kategori,
          lokasi: item.lokasi || "-",
          hargaHPP: item.hargaHPP,
          hargaJual: item.hargaJual,
          totalStok: parseInt(item.stok) || 0,
        };
      } else {
        // Update harga & lokasi dengan yang paling baru, akumulasi stok
        gs[key].hargaHPP = item.hargaHPP;
        gs[key].hargaJual = item.hargaJual;
        gs[key].lokasi = item.lokasi || gs[key].lokasi || "-";
        gs[key].totalStok =
          (parseInt(gs[key].totalStok) || 0) + (parseInt(item.stok) || 0);
      }
    });
  });

  localStorage.setItem("globalStock", JSON.stringify(gs));
}

// ========================================================
// ===== SUBTOTAL PREVIEW =================================
// ========================================================
function updateSubtotalPreview() {
  subtotalVal.textContent = formatRp(
    (parseInt(inputStok.value) || 0) * (parseFloat(inputHargaHPP.value) || 0),
  );
}
inputStok.addEventListener("input", updateSubtotalPreview);
inputHargaHPP.addEventListener("input", updateSubtotalPreview);

// ========================================================
// ===== SKU AUTOFILL =====================================
// ========================================================
function handleSKULookup(sku) {
  if (!sku) return;
  const found = findSKUInLinkedData(sku);
  if (found) {
    ddNama.setValue(found.nama || "");
    ddMerk.setValue(found.merk || "");
    ddKategori.setValue(found.kategori || "");
    autofillNotice.classList.remove("hidden");
    inputStok.focus();
  } else {
    autofillNotice.classList.add("hidden");
  }
}

document.getElementById("inputSKU").addEventListener("blur", function () {
  handleSKULookup(this.value.trim());
});
document.getElementById("inputSKU").addEventListener("keydown", function (e) {
  if (e.key === "Enter") handleSKULookup(this.value.trim());
});

// ========================================================
// ===== SCANNER EVENTS ===================================
// ========================================================
document.getElementById("btnScanSKU").addEventListener("click", () => {
  const panel = document.getElementById("scannerSKUPanel");
  panel.classList.contains("hidden")
    ? panel.classList.remove("hidden")
    : closeSKUPanel();
});
document
  .getElementById("btnCloseScannerSKU")
  .addEventListener("click", closeSKUPanel);

document.getElementById("btnOpenCamSKU").addEventListener("click", async () => {
  stopSKUScanner();
  setSKUScanStatus("loading", "Memuat scanner...");
  try {
    await loadZXing();
    const reader = new ZXing.BrowserMultiFormatReader();
    SKU_SCAN.reader = reader;
    SKU_SCAN.done = false;
    const video = document.getElementById("cameraStreamSKU");
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    SKU_SCAN.stream = stream;
    SKU_SCAN.active = true;
    video.srcObject = stream;
    document.getElementById("scanPlaceholderSKU").style.display = "none";
    setSKUScanStatus("scanning", "Arahkan ke barcode SKU produk...");
    reader.decodeFromStream(stream, video, (result) => {
      if (SKU_SCAN.done || !SKU_SCAN.active) return;
      if (result) {
        SKU_SCAN.done = true;
        const text = result.getText();
        document.getElementById("scanResultValSKU").textContent = text;
        document.getElementById("scanResultSKU").classList.remove("hidden");
        setSKUScanStatus("");
        stopSKUScanner();
      }
    });
  } catch (err) {
    stopSKUScanner();
    setSKUScanStatus(
      "error",
      err.message.includes("getUserMedia") || err.message.includes("Permission")
        ? "Izin kamera ditolak."
        : "Kamera gagal: " + err.message,
    );
  }
});

document
  .getElementById("galleryInputSKU")
  .addEventListener("change", async function (e) {
    const file = e.target.files[0];
    if (!file) return;
    this.value = "";
    setSKUScanStatus("loading", "Membaca barcode dari gambar...");
    try {
      await loadZXing();
      const reader = new ZXing.BrowserMultiFormatReader();
      const url = URL.createObjectURL(file);
      try {
        const result = await reader.decodeFromImageUrl(url);
        document.getElementById("scanResultValSKU").textContent =
          result.getText();
        document.getElementById("scanResultSKU").classList.remove("hidden");
        setSKUScanStatus("");
      } catch (_) {
        setSKUScanStatus(
          "error",
          "Barcode tidak terbaca. Coba foto lebih dekat & kontras.",
        );
      } finally {
        try {
          reader.reset();
        } catch (_) {}
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setSKUScanStatus("error", "Error: " + err.message);
    }
  });

document.getElementById("btnUseScanSKU").addEventListener("click", () => {
  const val = document.getElementById("scanResultValSKU").textContent;
  document.getElementById("inputSKU").value = val;
  document.getElementById("scanResultSKU").classList.add("hidden");
  closeSKUPanel();
  handleSKULookup(val);
});

// ========================================================
// ===== INIT =============================================
// ========================================================
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
    if (data.items?.length) {
      itemTableBody.querySelector(".empty-row")?.remove();
      data.items.forEach((item, idx) => tambahBaris(item, false, idx));
    }
  } else {
    invoiceInfo.innerHTML = `<div class="info-item"><span class="info-label">Invoice</span><span class="info-value">${invoiceId}</span></div>`;
  }
  updateTotalHargaDisplay();
  updateStatJenis(); // ✅ Render stat jenis
}

function renderInfo(data) {
  invoiceInfo.innerHTML = `
    <div class="info-item"><span class="info-label">Invoice</span><span class="info-value">${data.invoice}</span></div>
    <div class="info-item"><span class="info-label">Tanggal Masuk</span><span class="info-value">${data.tanggal}</span></div>
    <div class="info-item"><span class="info-label">Nama Supplier</span><span class="info-value">${data.supplier}</span></div>
    <div class="info-item"><span class="info-label">Total Qty</span><span class="info-value" id="infoTotal">${data.total || 0}</span></div>
    <div class="info-item"><span class="info-label">Jenis Barang</span><span class="info-value" id="infoJenis">0</span></div>
    <div class="info-item"><span class="info-label">Total Harga</span><span class="info-value" id="infoHarga" style="color:#1a6b2a">${formatRp(data.totalHarga || 0)}</span></div>
  `;
}

// ✅ Update stat Jenis Barang di info bar
function updateStatJenis() {
  const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
  const inv = invoices[invoiceId];
  const namaSet = new Set();
  if (inv && inv.items)
    inv.items.forEach((item) => {
      if (item.nama) namaSet.add(item.nama.toLowerCase());
    });
  const el = document.getElementById("infoJenis");
  if (el) el.textContent = namaSet.size;
}

function updateTotal() {
  const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
  if (!invoices[invoiceId]) return;
  const items = invoices[invoiceId].items;
  const total = items.reduce((s, i) => s + (parseInt(i.stok) || 0), 0);
  const totalH = items.reduce(
    (s, i) => s + (parseFloat(i.hargaHPP) || 0) * (parseInt(i.stok) || 0),
    0,
  );
  invoices[invoiceId].total = total;
  invoices[invoiceId].totalHarga = totalH;
  localStorage.setItem("invoices", JSON.stringify(invoices));
  const t = document.getElementById("infoTotal");
  if (t) t.textContent = total;
  const h = document.getElementById("infoHarga");
  if (h) h.textContent = formatRp(totalH);
  updateTotalHargaDisplay();
  updateStatJenis(); // ✅ refresh jenis setiap kali total diupdate
  rebuildGlobalStock(); // ✅ sync ke globalStock
}

function updateTotalHargaDisplay() {
  const data = (JSON.parse(localStorage.getItem("invoices") || "{}") || {})[
    invoiceId
  ];
  if (!data) return;
  totalHargaDisplay.textContent = formatRp(
    (data.items || []).reduce(
      (s, i) => s + (parseFloat(i.hargaHPP) || 0) * (parseInt(i.stok) || 0),
      0,
    ),
  );
}

// ========================================================
// ===== MODAL TAMBAH / EDIT BARANG =======================
// ========================================================
openTambahBtn.addEventListener("click", () => {
  editRowIndex = null; // mode tambah baru
  bukaModal();
});

function bukaModal(item = null) {
  ddNama.refresh();
  ddKategori.refresh();
  ddMerk.refresh();
  ddLokasi.refresh();
  subtotalVal.textContent = "Rp 0";
  autofillNotice.classList.add("hidden");
  errorMsg.textContent = "";

  // ✅ Update judul modal sesuai mode
  const modalTitle = document.querySelector(".modal-top-bar h3");
  if (modalTitle) {
    modalTitle.innerHTML = item
      ? '<i class="bx bx-edit"></i> Edit Barang'
      : '<i class="bx bx-package"></i> Tambah Barang';
  }
  const btnLabel = document.getElementById("simpanBtn");
  if (btnLabel)
    btnLabel.innerHTML = item
      ? '<i class="bx bx-save"></i> Update'
      : '<i class="bx bx-save"></i> Simpan';

  if (item) {
    // Isi form dengan data item yang diedit
    document.getElementById("inputSKU").value = item.sku || "";
    ddNama.setValue(item.nama || "");
    ddMerk.setValue(item.merk || "");
    ddKategori.setValue(item.kategori || "");
    ddLokasi.setValue(item.lokasi || "");
    document.getElementById("inputExpired").value =
      item.expired !== "-" ? item.expired || "" : "";
    inputHargaHPP.value = item.hargaHPP || "";
    inputHargaJual.value = item.hargaJual || "";
    inputStok.value = item.stok || "";
    updateSubtotalPreview();
  }

  modalOverlay.classList.add("active");
}

document.getElementById("modalCloseX").addEventListener("click", tutupModal);
batalBtn.addEventListener("click", tutupModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) tutupModal();
});
simpanBtn.addEventListener("click", simpanItem);

function tutupModal() {
  closeSKUPanel();
  modalOverlay.classList.remove("active");
  editRowIndex = null;
  clearForm();
}

function clearForm() {
  ["inputSKU", "inputExpired", "inputHargaHPP", "inputHargaJual"].forEach(
    (id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    },
  );
  inputStok.value = "";
  subtotalVal.textContent = "Rp 0";
  errorMsg.textContent = "";
  autofillNotice.classList.add("hidden");
  ddNama.clear();
  ddKategori.clear();
  ddMerk.clear();
  ddLokasi.clear();
}

function simpanItem() {
  const sku = document.getElementById("inputSKU").value.trim();
  const nama = ddNama.getValue();
  const merk = ddMerk.getValue();
  const kategori = ddKategori.getValue();
  const lokasi = ddLokasi.getValue();
  const expired = document.getElementById("inputExpired").value || "-";
  const hargaHPP = inputHargaHPP.value.trim();
  const hargaJual = inputHargaJual.value.trim() || "0";
  const stok = inputStok.value.trim();

  if (!sku || !nama || !merk || !kategori || !lokasi || !stok || !hargaHPP) {
    errorMsg.textContent =
      "Semua field bertanda * wajib diisi, termasuk Lokasi Inventori!";
    return;
  }
  if (parseInt(stok) < 1) {
    errorMsg.textContent = "Stok minimal 1!";
    return;
  }

  // Auto-add ke linkedData
  autoAddToLinkedData("barang", nama);
  autoAddToLinkedData("kategori", kategori);
  autoAddToLinkedData("merk", merk);
  autoAddToLinkedData("lokasi", lokasi);
  autoAddSKUToLinkedData({ sku, nama, merk, kategori });

  const item = {
    sku,
    nama,
    merk,
    kategori,
    lokasi,
    expired,
    hargaHPP,
    hargaJual,
    stok,
  };

  const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
  if (!invoices[invoiceId])
    invoices[invoiceId] = { invoice: invoiceId, items: [] };

  if (editRowIndex !== null) {
    // ✅ MODE EDIT: ganti item di index yang ada
    invoices[invoiceId].items[editRowIndex] = item;
    localStorage.setItem("invoices", JSON.stringify(invoices));
    updateTotal();

    // Rebuild seluruh tabel dari data
    renderSemuaBaris();
  } else {
    // MODE TAMBAH BARU
    invoices[invoiceId].items.push(item);
    localStorage.setItem("invoices", JSON.stringify(invoices));
    updateTotal();
    tambahBaris(item, true, invoices[invoiceId].items.length - 1);
  }

  tutupModal();
}

// ========================================================
// ===== RENDER ULANG SELURUH TABEL =======================
// ========================================================
function renderSemuaBaris() {
  itemTableBody.innerHTML = "";
  rowCount = 0;
  const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
  const inv = invoices[invoiceId];
  if (!inv || !inv.items || inv.items.length === 0) {
    const tr = document.createElement("tr");
    tr.className = "empty-row";
    tr.innerHTML =
      '<td colspan="12">Belum ada barang — klik "+ Tambah Barang" untuk menambah</td>';
    itemTableBody.appendChild(tr);
    return;
  }
  inv.items.forEach((item, idx) => tambahBaris(item, false, idx));
}

// ========================================================
// ===== RENDER BARIS TABEL (12 kolom + Edit) =============
// ========================================================
function tambahBaris(item, removeEmpty = true, itemIndex) {
  if (removeEmpty) itemTableBody.querySelector(".empty-row")?.remove();
  rowCount++;
  const subtotal =
    (parseFloat(item.hargaHPP) || 0) * (parseInt(item.stok) || 0);
  const tr = document.createElement("tr");
  tr.dataset.itemIndex = itemIndex; // ✅ simpan index untuk keperluan edit
  tr.innerHTML = `
    <td>${rowCount}</td>
    <td><span class="sku-badge">${item.sku || "-"}</span></td>
    <td>${item.nama}</td>
    <td>${item.merk}</td>
    <td>${item.kategori}</td>
    <td>${item.lokasi || "-"}</td>
    <td>${item.expired && item.expired !== "-" ? item.expired : '<span class="no-expired">—</span>'}</td>
    <td>${formatRp(item.hargaHPP || 0)}</td>
    <td>${formatRp(item.hargaJual || 0)}</td>
    <td>${item.stok}</td>
    <td style="font-weight:700;color:#1a6b2a">${formatRp(subtotal)}</td>
    <td>
      <div style="display:flex;gap:4px;justify-content:center;align-items:center">
        <button class="btn-edit-item" title="Edit">
          <i class="bx bx-edit"></i>
        </button>
        <button class="btn-hapus" title="Hapus">
          <i class="bx bx-trash"></i>
        </button>
      </div>
    </td>
  `;

  // ✅ Tombol Edit
  tr.querySelector(".btn-edit-item").addEventListener("click", () => {
    editRowIndex = parseInt(tr.dataset.itemIndex);
    const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
    const currentItem = invoices[invoiceId]?.items?.[editRowIndex];
    if (currentItem) bukaModal(currentItem);
  });

  // Tombol Hapus
  tr.querySelector(".btn-hapus").addEventListener("click", () => {
    rowToDelete = tr;
    confirmOverlay.classList.add("active");
  });

  itemTableBody.appendChild(tr);
}

// ========================================================
// ===== HAPUS BARIS ======================================
// ========================================================
confirmYes.addEventListener("click", () => {
  if (rowToDelete) {
    const rows = Array.from(
      itemTableBody.querySelectorAll("tr:not(.empty-row)"),
    );
    const idx = parseInt(rowToDelete.dataset.itemIndex);
    const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
    if (invoices[invoiceId]?.items?.[idx] !== undefined) {
      invoices[invoiceId].items.splice(idx, 1);
      localStorage.setItem("invoices", JSON.stringify(invoices));
    }
    updateTotal();
    renderSemuaBaris(); // Render ulang agar index sinkron
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

// ========================================================
// ===== NAVIGASI & SAFETY NET ============================
// ========================================================
backBtn.addEventListener("click", () => {
  stopSKUScanner();
  window.location.href = "inputBarang.html";
});
window.addEventListener("beforeunload", () => stopSKUScanner());
window.addEventListener("pagehide", () => stopSKUScanner());
window.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") stopSKUScanner();
});

init();
