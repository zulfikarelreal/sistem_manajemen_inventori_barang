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
let cameraStreamSKU = null;
let cameraStreamExpired = null;

// ===== DROPDOWNS =====
const ddNama = new CustomDropdown("cdNama", "barang", { icon: "bx-package" });
const ddKategori = new CustomDropdown("cdKategori", "kategori", {
  icon: "bx-category",
});
const ddMerk = new CustomDropdown("cdMerk", "merk", {
  icon: "bx-purchase-tag",
});

// ===== FORMAT RP =====
function formatRp(num) {
  if (!num || num === 0) return "Rp 0";
  return "Rp " + parseInt(num).toLocaleString("id-ID");
}

// ===== LINKED DATA HELPERS =====
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
      sku: d.sku || [], // { sku, nama, merk, kategori }
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
  const d = getLinkedData();
  if (!d[key]) d[key] = [];
  if (!d[key].includes(value)) {
    d[key].push(value);
    const raw = localStorage.getItem("linkedData");
    const existing = raw ? JSON.parse(raw) : {};
    existing[key] = d[key];
    localStorage.setItem("linkedData", JSON.stringify(existing));
  }
}

function autoAddSKUToLinkedData(skuObj) {
  // skuObj: { sku, nama, merk, kategori }
  const raw = localStorage.getItem("linkedData");
  const existing = raw ? JSON.parse(raw) : {};
  if (!existing.sku) existing.sku = [];
  const idx = existing.sku.findIndex((s) => s.sku === skuObj.sku);
  if (idx === -1) {
    existing.sku.push(skuObj);
  } else {
    existing.sku[idx] = skuObj; // update
  }
  localStorage.setItem("linkedData", JSON.stringify(existing));
}

function findSKUInLinkedData(sku) {
  const d = getLinkedData();
  return (d.sku || []).find((s) => s.sku === sku) || null;
}

// ===== GLOBAL STOCK SYNC =====
function syncToGlobalStock(item) {
  // globalStock: { [sku]: { sku, nama, merk, kategori, hargaHPP, hargaJual, totalStok } }
  const raw = localStorage.getItem("globalStock");
  const gs = raw ? JSON.parse(raw) : {};
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
    // Update harga and increment stock
    gs[key].hargaHPP = item.hargaHPP;
    gs[key].hargaJual = item.hargaJual;
    gs[key].totalStok =
      (parseInt(gs[key].totalStok) || 0) + (parseInt(item.stok) || 0);
  }
  localStorage.setItem("globalStock", JSON.stringify(gs));
}

function removeFromGlobalStock(item) {
  const raw = localStorage.getItem("globalStock");
  if (!raw) return;
  const gs = JSON.parse(raw);
  const key = item.sku || item.nama;
  if (gs[key]) {
    gs[key].totalStok = Math.max(
      0,
      (parseInt(gs[key].totalStok) || 0) - (parseInt(item.stok) || 0),
    );
    localStorage.setItem("globalStock", JSON.stringify(gs));
  }
}

// ===== PREVIEW SUBTOTAL =====
function updateSubtotalPreview() {
  const stok = parseInt(inputStok.value) || 0;
  const harga = parseFloat(inputHargaHPP.value) || 0;
  subtotalVal.textContent = formatRp(stok * harga);
}
inputStok.addEventListener("input", updateSubtotalPreview);
inputHargaHPP.addEventListener("input", updateSubtotalPreview);

// ===== SKU AUTOFILL =====
document.getElementById("inputSKU").addEventListener("blur", function () {
  handleSKULookup(this.value.trim());
});
document.getElementById("inputSKU").addEventListener("keydown", function (e) {
  if (e.key === "Enter") handleSKULookup(this.value.trim());
});

function handleSKULookup(sku) {
  if (!sku) return;
  const found = findSKUInLinkedData(sku);
  if (found) {
    // Autofill fields
    document.getElementById("inputNama").value = found.nama || "";
    document.getElementById("inputMerk").value = found.merk || "";
    document.getElementById("inputKategori").value = found.kategori || "";
    // Also set dropdown values if possible
    if (ddNama.setValue) ddNama.setValue(found.nama || "");
    if (ddMerk.setValue) ddMerk.setValue(found.merk || "");
    if (ddKategori.setValue) ddKategori.setValue(found.kategori || "");
    autofillNotice.classList.remove("hidden");
    // Focus qty
    inputStok.focus();
  } else {
    autofillNotice.classList.add("hidden");
  }
}

// ===== SCANNER SKU =====
document.getElementById("btnScanSKU").addEventListener("click", () => {
  const panel = document.getElementById("scannerSKUPanel");
  panel.classList.toggle("hidden");
});

document.getElementById("btnCloseScannerSKU").addEventListener("click", () => {
  closeScanner("SKU");
});

document.getElementById("btnOpenCamSKU").addEventListener("click", async () => {
  await openCamera("SKU");
});

document
  .getElementById("galleryInputSKU")
  .addEventListener("change", function (e) {
    handleGalleryUpload(e, "SKU");
  });

document.getElementById("btnUseScanSKU").addEventListener("click", () => {
  const val = document.getElementById("scanResultValSKU").textContent;
  document.getElementById("inputSKU").value = val;
  document.getElementById("scanResultSKU").classList.add("hidden");
  closeScanner("SKU");
  handleSKULookup(val);
});

// ===== SCANNER EXPIRED =====
document.getElementById("btnScanExpired").addEventListener("click", () => {
  const panel = document.getElementById("scannerExpiredPanel");
  panel.classList.toggle("hidden");
});

document
  .getElementById("btnCloseScannerExpired")
  .addEventListener("click", () => {
    closeScanner("Expired");
  });

document
  .getElementById("btnOpenCamExpired")
  .addEventListener("click", async () => {
    await openCamera("Expired");
  });

document
  .getElementById("galleryInputExpired")
  .addEventListener("change", function (e) {
    handleGalleryUpload(e, "Expired");
  });

document.getElementById("btnUseScanExpired").addEventListener("click", () => {
  const val = document.getElementById("scanResultValExpired").textContent;
  // Try to parse date from scan (format: DDMMYYYY or similar)
  const parsed = parseExpiredFromScan(val);
  if (parsed) {
    document.getElementById("inputExpired").value = parsed;
  }
  document.getElementById("scanResultExpired").classList.add("hidden");
  closeScanner("Expired");
});

function parseExpiredFromScan(val) {
  // Try common formats: DDMMYYYY, MMYYYY, YYYY-MM-DD
  val = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  if (/^\d{8}$/.test(val)) {
    // DDMMYYYY
    const d = val.substring(0, 2),
      m = val.substring(2, 4),
      y = val.substring(4);
    return `${y}-${m}-${d}`;
  }
  if (/^\d{6}$/.test(val)) {
    // MMYYYY
    const m = val.substring(0, 2),
      y = val.substring(2);
    return `${y}-${m}-01`;
  }
  return null;
}

// ===== CAMERA HELPERS =====
async function openCamera(type) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    const video = document.getElementById(`cameraStream${type}`);
    video.srcObject = stream;
    document.getElementById(`scanPlaceholder${type}`).style.display = "none";
    if (type === "SKU") cameraStreamSKU = stream;
    else cameraStreamExpired = stream;

    // Simulate scan after 3s
    setTimeout(() => simulateScan(type), 3000);
  } catch (err) {
    alert("Tidak bisa mengakses kamera: " + err.message);
  }
}

function closeScanner(type) {
  const panel = document.getElementById(`scanner${type}Panel`);
  panel.classList.add("hidden");
  const stream = type === "SKU" ? cameraStreamSKU : cameraStreamExpired;
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    if (type === "SKU") cameraStreamSKU = null;
    else cameraStreamExpired = null;
    const video = document.getElementById(`cameraStream${type}`);
    if (video) video.srcObject = null;
  }
  document.getElementById(`scanPlaceholder${type}`).style.display = "flex";
}

function simulateScan(type) {
  const val =
    type === "SKU"
      ? "SKU-" + Date.now().toString().slice(-6)
      : new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0];
  showScanResult(type, val);
  const stream = type === "SKU" ? cameraStreamSKU : cameraStreamExpired;
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    if (type === "SKU") cameraStreamSKU = null;
    else cameraStreamExpired = null;
  }
}

function showScanResult(type, value) {
  document.getElementById(`scanResultVal${type}`).textContent = value;
  document.getElementById(`scanResult${type}`).classList.remove("hidden");
  const video = document.getElementById(`cameraStream${type}`);
  if (video) video.srcObject = null;
  document.getElementById(`scanPlaceholder${type}`).style.display = "flex";
}

function handleGalleryUpload(e, type) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    // Simulate: in production use ZXing/Quagga for real barcode decode
    const fakeScan =
      type === "SKU"
        ? "SKU-" + Date.now().toString().slice(-6)
        : new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0];
    showScanResult(type, fakeScan);
  };
  reader.readAsDataURL(file);
}

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

// ===== UPDATE TOTAL =====
function updateTotal() {
  const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
  if (!invoices[invoiceId]) return;
  const total = invoices[invoiceId].items.reduce(
    (s, i) => s + (parseInt(i.stok) || 0),
    0,
  );
  const totalH = invoices[invoiceId].items.reduce(
    (s, i) => s + (parseFloat(i.hargaHPP) || 0) * (parseInt(i.stok) || 0),
    0,
  );
  invoices[invoiceId].total = total;
  invoices[invoiceId].totalHarga = totalH;
  localStorage.setItem("invoices", JSON.stringify(invoices));
  const infoTotal = document.getElementById("infoTotal");
  const infoHarga = document.getElementById("infoHarga");
  if (infoTotal) infoTotal.textContent = total;
  if (infoHarga) infoHarga.textContent = formatRp(totalH);
  updateTotalHargaDisplay();
}

function updateTotalHargaDisplay() {
  const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
  const data = invoices[invoiceId];
  if (!data) return;
  const totalH = data.items
    ? data.items.reduce(
        (s, i) => s + (parseFloat(i.hargaHPP) || 0) * (parseInt(i.stok) || 0),
        0,
      )
    : 0;
  totalHargaDisplay.textContent = formatRp(totalH);
}

// ===== MODAL =====
openTambahBtn.addEventListener("click", () => {
  ddNama.refresh();
  ddKategori.refresh();
  ddMerk.refresh();
  subtotalVal.textContent = "Rp 0";
  autofillNotice.classList.add("hidden");
  modalOverlay.classList.add("active");
});

document.getElementById("modalCloseX").addEventListener("click", tutupModal);
batalBtn.addEventListener("click", tutupModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) tutupModal();
});
simpanBtn.addEventListener("click", simpanItem);

function tutupModal() {
  modalOverlay.classList.remove("active");
  clearForm();
  closeScanner("SKU");
  closeScanner("Expired");
}

function clearForm() {
  document.getElementById("inputSKU").value = "";
  document.getElementById("inputExpired").value = "";
  document.getElementById("inputHargaHPP").value = "";
  document.getElementById("inputHargaJual").value = "";
  inputStok.value = "";
  subtotalVal.textContent = "Rp 0";
  errorMsg.textContent = "";
  autofillNotice.classList.add("hidden");
  ddNama.clear();
  ddKategori.clear();
  ddMerk.clear();
  document.getElementById("scanResultSKU").classList.add("hidden");
  document.getElementById("scanResultExpired").classList.add("hidden");
  document.getElementById("scannerSKUPanel").classList.add("hidden");
  document.getElementById("scannerExpiredPanel").classList.add("hidden");
}

function simpanItem() {
  const sku = document.getElementById("inputSKU").value.trim();
  const nama =
    ddNama.getValue() || document.getElementById("inputNama").value.trim();
  const merk =
    ddMerk.getValue() || document.getElementById("inputMerk").value.trim();
  const kategori =
    ddKategori.getValue() ||
    document.getElementById("inputKategori").value.trim();
  const expired = document.getElementById("inputExpired").value || "-";
  const hargaHPP = document.getElementById("inputHargaHPP").value.trim();
  const hargaJual =
    document.getElementById("inputHargaJual").value.trim() || "0";
  const stok = inputStok.value.trim();

  if (!sku || !nama || !merk || !kategori || !stok || !hargaHPP) {
    errorMsg.textContent = "Field bertanda * wajib diisi!";
    return;
  }

  // Auto-add to Linked Data
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

  // Save to invoice
  const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
  if (!invoices[invoiceId])
    invoices[invoiceId] = { invoice: invoiceId, items: [] };
  invoices[invoiceId].items.push(item);
  localStorage.setItem("invoices", JSON.stringify(invoices));

  // Sync to Global Stock
  syncToGlobalStock(item);

  updateTotal();
  tambahBaris(item, true);
  tutupModal();
}

// ===== TAMBAH BARIS =====
function tambahBaris(item, removeEmpty = true) {
  if (removeEmpty) {
    const emptyRow = itemTableBody.querySelector(".empty-row");
    if (emptyRow) emptyRow.remove();
  }
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
    const rowIndex = rows.indexOf(rowToDelete);
    const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
    if (invoices[invoiceId]?.items && invoices[invoiceId].items[rowIndex]) {
      removeFromGlobalStock(invoices[invoiceId].items[rowIndex]);
      invoices[invoiceId].items.splice(rowIndex, 1);
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
    const emptyTr = document.createElement("tr");
    emptyTr.className = "empty-row";
    emptyTr.innerHTML =
      '<td colspan="11">Belum ada barang — klik "+ Tambah Barang" untuk menambah</td>';
    itemTableBody.appendChild(emptyTr);
    rowCount = 0;
  } else {
    rows.forEach((r, i) => {
      r.cells[0].textContent = i + 1;
    });
    rowCount = rows.length;
  }
}

backBtn.addEventListener("click", () => {
  window.location.href = "inputBarang.html";
});

init();
