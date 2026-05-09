// ===== INVOICE.JS — REVISI: Scanner stabil, no hang =====

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

// ========================================================
// ===== SCANNER STATE — satu tempat, strict lifecycle ====
// ========================================================
const SKU_SCAN = {
  stream: null,
  reader: null,
  active: false, // flag: apakah sedang decode
  done: false, // flag: sudah dapat hasil, abaikan callback lanjutan
};

// ===== ZXING LOADER — load sekali, cache di window =====
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

// ===== STOP SCANNER — paksa bersih =====
function stopSKUScanner() {
  SKU_SCAN.active = false;
  SKU_SCAN.done = false;

  // 1. Reset reader (tangkap error)
  if (SKU_SCAN.reader) {
    try {
      SKU_SCAN.reader.reset();
    } catch (_) {}
    SKU_SCAN.reader = null;
  }

  // 2. Stop semua track kamera
  if (SKU_SCAN.stream) {
    try {
      SKU_SCAN.stream.getTracks().forEach((t) => t.stop());
    } catch (_) {}
    SKU_SCAN.stream = null;
  }

  // 3. Bersihkan video
  const video = document.getElementById("cameraStreamSKU");
  if (video) {
    try {
      video.pause();
      video.srcObject = null;
    } catch (_) {}
  }

  // 4. Kembalikan placeholder
  const ph = document.getElementById("scanPlaceholderSKU");
  if (ph) ph.style.display = "flex";

  setSKUScanStatus("");
}

function closeSKUPanel() {
  stopSKUScanner();
  const panel = document.getElementById("scannerSKUPanel");
  if (panel) panel.classList.add("hidden");
  const resultEl = document.getElementById("scanResultSKU");
  if (resultEl) resultEl.classList.add("hidden");
}

// ===== STATUS INDICATOR =====
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

// ===== DROPDOWNS =====
const ddNama = new CustomDropdown("cdNama", "barang", { icon: "bx-package" });
const ddKategori = new CustomDropdown("cdKategori", "kategori", {
  icon: "bx-category",
});
const ddMerk = new CustomDropdown("cdMerk", "merk", {
  icon: "bx-purchase-tag",
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
  // support both array-of-strings and array-of-objects
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

// ===== GLOBAL STOCK =====
function syncToGlobalStock(item) {
  const gs = JSON.parse(localStorage.getItem("globalStock") || "{}");
  const key = item.sku || item.nama;
  if (!gs[key]) {
    gs[key] = {
      sku: item.sku || "",
      nama: item.nama,
      merk: item.merk,
      kategori: item.kategori,
      hargaHPP: item.hargaHPP,
      hargaJual: item.hargaJual,
      totalStok: parseInt(item.stok) || 0,
    };
  } else {
    gs[key].hargaHPP = item.hargaHPP;
    gs[key].hargaJual = item.hargaJual;
    gs[key].totalStok =
      (parseInt(gs[key].totalStok) || 0) + (parseInt(item.stok) || 0);
  }
  localStorage.setItem("globalStock", JSON.stringify(gs));
}

function removeFromGlobalStock(item) {
  const gs = JSON.parse(localStorage.getItem("globalStock") || "{}");
  const key = item.sku || item.nama;
  if (gs[key]) {
    gs[key].totalStok = Math.max(
      0,
      (parseInt(gs[key].totalStok) || 0) - (parseInt(item.stok) || 0),
    );
    localStorage.setItem("globalStock", JSON.stringify(gs));
  }
}

// ===== SUBTOTAL PREVIEW =====
function updateSubtotalPreview() {
  subtotalVal.textContent = formatRp(
    (parseInt(inputStok.value) || 0) * (parseFloat(inputHargaHPP.value) || 0),
  );
}
inputStok.addEventListener("input", updateSubtotalPreview);
inputHargaHPP.addEventListener("input", updateSubtotalPreview);

// ===== SKU AUTOFILL =====
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

// ===== TOGGLE SCANNER PANEL =====
document.getElementById("btnScanSKU").addEventListener("click", () => {
  const panel = document.getElementById("scannerSKUPanel");
  if (panel.classList.contains("hidden")) {
    panel.classList.remove("hidden");
  } else {
    closeSKUPanel();
  }
});

document.getElementById("btnCloseScannerSKU").addEventListener("click", () => {
  closeSKUPanel();
});

// ===== BUKA KAMERA — ZXing =====
document.getElementById("btnOpenCamSKU").addEventListener("click", async () => {
  // Stop sesi lama dulu, selalu
  stopSKUScanner();
  setSKUScanStatus("loading", "Memuat scanner...");

  try {
    await loadZXing();

    // Buat reader BARU setiap kali
    const reader = new ZXing.BrowserMultiFormatReader();
    SKU_SCAN.reader = reader;
    SKU_SCAN.done = false;

    const video = document.getElementById("cameraStreamSKU");

    // Minta stream kamera
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

    // decodeFromStream — callback terus sampai di-reset
    reader.decodeFromStream(stream, video, (result, err) => {
      // Abaikan callback setelah done atau tidak aktif
      if (SKU_SCAN.done || !SKU_SCAN.active) return;

      if (result) {
        SKU_SCAN.done = true; // tandai agar callback berikutnya diabaikan
        const text = result.getText();

        // Tampilkan hasil
        document.getElementById("scanResultValSKU").textContent = text;
        document.getElementById("scanResultSKU").classList.remove("hidden");
        setSKUScanStatus("");

        // Stop kamera setelah dapat hasil
        stopSKUScanner();
      }
      // err NotFoundException — normal, abaikan
    });
  } catch (err) {
    stopSKUScanner();
    const msg =
      err.message.includes("getUserMedia") || err.message.includes("Permission")
        ? "Izin kamera ditolak. Izinkan akses kamera di browser."
        : err.message.includes("ZXing") || err.message.includes("dimuat")
          ? "Gagal memuat library scanner. Cek koneksi internet."
          : "Kamera gagal: " + err.message;
    setSKUScanStatus("error", msg);
  }
});

// ===== UPLOAD GAMBAR — ZXing decode dari file =====
document
  .getElementById("galleryInputSKU")
  .addEventListener("change", async function (e) {
    const file = e.target.files[0];
    if (!file) return;
    this.value = ""; // reset input agar bisa upload ulang file yang sama
    setSKUScanStatus("loading", "Membaca barcode dari gambar...");

    try {
      await loadZXing();

      // Buat reader baru khusus untuk decode gambar
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
        // Selalu cleanup
        try {
          reader.reset();
        } catch (_) {}
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setSKUScanStatus("error", "Error: " + err.message);
    }
  });

// ===== GUNAKAN HASIL SCAN =====
document.getElementById("btnUseScanSKU").addEventListener("click", () => {
  const val = document.getElementById("scanResultValSKU").textContent;
  document.getElementById("inputSKU").value = val;
  document.getElementById("scanResultSKU").classList.add("hidden");
  closeSKUPanel();
  handleSKULookup(val);
});

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
    if (data.items?.length) {
      itemTableBody.querySelector(".empty-row")?.remove();
      data.items.forEach((item) => tambahBaris(item, false));
    }
  } else {
    invoiceInfo.innerHTML = `<div class="info-item"><span class="info-label">Invoice</span><span class="info-value">${invoiceId}</span></div>`;
  }
  updateTotalHargaDisplay();
}

function renderInfo(data) {
  invoiceInfo.innerHTML = `
    <div class="info-item"><span class="info-label">Invoice</span><span class="info-value">${data.invoice}</span></div>
    <div class="info-item"><span class="info-label">Tanggal Masuk</span><span class="info-value">${data.tanggal}</span></div>
    <div class="info-item"><span class="info-label">Nama Supplier</span><span class="info-value">${data.supplier}</span></div>
    <div class="info-item"><span class="info-label">Total Qty</span><span class="info-value" id="infoTotal">${data.total || 0}</span></div>
    <div class="info-item"><span class="info-label">Total Harga</span><span class="info-value" id="infoHarga" style="color:#1a6b2a">${formatRp(data.totalHarga || 0)}</span></div>
  `;
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

// ===== MODAL =====
openTambahBtn.addEventListener("click", () => {
  ddNama.refresh();
  ddKategori.refresh();
  ddMerk.refresh();
  subtotalVal.textContent = "Rp 0";
  autofillNotice.classList.add("hidden");
  errorMsg.textContent = "";
  modalOverlay.classList.add("active");
});

document.getElementById("modalCloseX").addEventListener("click", tutupModal);
batalBtn.addEventListener("click", tutupModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) tutupModal();
});
simpanBtn.addEventListener("click", simpanItem);

function tutupModal() {
  // PENTING: stop scanner sebelum tutup modal
  closeSKUPanel();
  modalOverlay.classList.remove("active");
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
}

function simpanItem() {
  const sku = document.getElementById("inputSKU").value.trim();
  const nama = ddNama.getValue();
  const merk = ddMerk.getValue();
  const kategori = ddKategori.getValue();
  const expiredEl = document.getElementById("inputExpired");
  const expired = expiredEl ? expiredEl.value || "-" : "-";
  const hargaHPP = inputHargaHPP.value.trim();
  const hargaJual = inputHargaJual.value.trim() || "0";
  const stok = inputStok.value.trim();

  if (!sku || !nama || !merk || !kategori || !stok || !hargaHPP) {
    errorMsg.textContent = "Field bertanda * wajib diisi!";
    return;
  }
  if (parseInt(stok) < 1) {
    errorMsg.textContent = "Stok minimal 1!";
    return;
  }

  autoAddToLinkedData("barang", nama);
  autoAddToLinkedData("kategori", kategori);
  autoAddToLinkedData("merk", merk);
  autoAddSKUToLinkedData({ sku, nama, merk, kategori });

  const item = {
    sku,
    nama,
    merk,
    kategori,
    expired,
    hargaHPP,
    hargaJual,
    stok,
  };

  const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
  if (!invoices[invoiceId])
    invoices[invoiceId] = { invoice: invoiceId, items: [] };
  invoices[invoiceId].items.push(item);
  localStorage.setItem("invoices", JSON.stringify(invoices));

  syncToGlobalStock(item);
  updateTotal();
  tambahBaris(item, true);
  tutupModal();
}

function tambahBaris(item, removeEmpty = true) {
  if (removeEmpty) itemTableBody.querySelector(".empty-row")?.remove();
  rowCount++;
  const subtotal =
    (parseFloat(item.hargaHPP) || 0) * (parseInt(item.stok) || 0);
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${rowCount}</td>
    <td><span class="sku-badge">${item.sku || "-"}</span></td>
    <td>${item.nama}</td>
    <td>${item.merk}</td>
    <td>${item.kategori}</td>
    <td>${item.expired && item.expired !== "-" ? item.expired : '<span class="no-expired">—</span>'}</td>
    <td>${formatRp(item.hargaHPP || 0)}</td>
    <td>${formatRp(item.hargaJual || 0)}</td>
    <td>${item.stok}</td>
    <td style="font-weight:700;color:#1a6b2a">${formatRp(subtotal)}</td>
    <td><button class="btn-hapus"><i class="bx bx-trash"></i> Hapus</button></td>
  `;
  tr.querySelector(".btn-hapus").addEventListener("click", () => {
    rowToDelete = tr;
    confirmOverlay.classList.add("active");
  });
  itemTableBody.appendChild(tr);
}

// ===== HAPUS =====
confirmYes.addEventListener("click", () => {
  if (rowToDelete) {
    const rows = Array.from(
      itemTableBody.querySelectorAll("tr:not(.empty-row)"),
    );
    const idx = rows.indexOf(rowToDelete);
    const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
    if (invoices[invoiceId]?.items?.[idx]) {
      removeFromGlobalStock(invoices[invoiceId].items[idx]);
      invoices[invoiceId].items.splice(idx, 1);
      localStorage.setItem("invoices", JSON.stringify(invoices));
    }
    rowToDelete.remove();
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
    const tr = document.createElement("tr");
    tr.className = "empty-row";
    tr.innerHTML =
      '<td colspan="11">Belum ada barang — klik "+ Tambah Barang" untuk menambah</td>';
    itemTableBody.appendChild(tr);
    rowCount = 0;
  } else {
    rows.forEach((r, i) => {
      r.cells[0].textContent = i + 1;
    });
    rowCount = rows.length;
  }
}

// ===== BACK — stop scanner sebelum pindah halaman =====
backBtn.addEventListener("click", () => {
  stopSKUScanner();
  window.location.href = "inputBarang.html";
});

// ===== SAFETY NET: stop scanner saat halaman ditinggal =====
window.addEventListener("beforeunload", () => stopSKUScanner());
window.addEventListener("pagehide", () => stopSKUScanner());
window.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") stopSKUScanner();
});

init();
