"use strict";

// ===== AUTH =====
if (!localStorage.getItem("isLoggedIn")) window.location.href = "login.html";

const loggedUser = localStorage.getItem("loggedUser") || "Admin";
document.getElementById("sidebarUsername").textContent = loggedUser;
document.getElementById("sidebarAvatar").textContent = loggedUser
  .charAt(0)
  .toUpperCase();

// ===== AMBIL ID DARI URL =====
const params = new URLSearchParams(window.location.search);
const invoiceId = params.get("id");
if (!invoiceId) window.location.href = "stockOut.html";

// ===== STORAGE KEY =====
const STOCKOUT_KEY = "stockOuts_v2";

// ===== LOAD / SAVE =====
function loadStockOuts() {
  try { return JSON.parse(localStorage.getItem(STOCKOUT_KEY) || "[]"); }
  catch { return []; }
}
function saveStockOuts(list) {
  localStorage.setItem(STOCKOUT_KEY, JSON.stringify(list));
}
function getThisInvoice() {
  return loadStockOuts().find((s) => s.id === invoiceId) || null;
}

const invoiceData = getThisInvoice();
if (!invoiceData) window.location.href = "stockOut.html";

// ===== SIDEBAR =====
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
document.getElementById("sidebarClose").addEventListener("click", closeSidebar);
sidebarOverlay.addEventListener("click", closeSidebar);
function closeSidebar() {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("active");
}

// ===== LOGOUT =====
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("loggedUser");
  window.location.href = "login.html";
});

// ===== BACK =====
document.getElementById("backBtn").addEventListener("click", () => {
  stopSKUScanner();
  window.location.href = "stockOut.html";
});

// ===== FORMAT HELPERS =====
function formatRp(num) {
  if (!num || num === 0) return "Rp 0";
  return "Rp " + parseInt(num).toLocaleString("id-ID");
}
function formatDate(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  const bulan = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  return `${parseInt(d)} ${bulan[parseInt(m) - 1]} ${y}`;
}

function paymentBadgeHtml(paymentId, paymentNama) {
  const map = {
    pay_default_cash: { icon: "💵", cls: "pay-cash" },
    pay_default_qris: { icon: "📱", cls: "pay-qris" },
  };
  const cfg = map[paymentId] || { icon: "💰", cls: "pay-other" };
  return `<span class="info-payment-badge ${cfg.cls}">${cfg.icon} ${paymentNama || "—"}</span>`;
}

// ============================================================
// ===== RENDER INFO BAR ======================================
// ============================================================
function renderInfo() {
  const data = getThisInvoice();
  if (!data) return;
  document.getElementById("navTitle").textContent = data.invoice;
  const totalItem  = (data.items || []).reduce((s, i) => s + (parseInt(i.jumlahKeluar) || 0), 0);
  const totalHarga = (data.items || []).reduce(
    (s, i) => s + parseFloat(i.hargaJual || i.hargaHPP || 0) * (parseInt(i.jumlahKeluar) || 0), 0
  );
  document.getElementById("invoiceInfo").innerHTML = `
    <div class="info-item"><span class="info-label">Invoice</span><span class="info-val"><strong>${data.invoice}</strong></span></div>
    <div class="info-item"><span class="info-label">Tanggal</span><span class="info-val">${formatDate(data.tanggal)}</span></div>
    <div class="info-item"><span class="info-label">Customer</span><span class="info-val"><strong>${data.penerima || "—"}</strong></span></div>
    <div class="info-item"><span class="info-label">No. Telepon</span><span class="info-val">${data.telepon || '<span style="color:#bbb">—</span>'}</span></div>
    <div class="info-item"><span class="info-label">Metode Bayar</span><span class="info-val">${paymentBadgeHtml(data.paymentId, data.paymentNama)}</span></div>
    <div class="info-item"><span class="info-label">Total Barang</span><span class="info-val" id="infoTotal"><strong>${totalItem}</strong> item</span></div>
    <div class="info-item"><span class="info-label">Total Nilai</span><span class="info-val" id="infoHarga" style="color:#1a6b2a;font-weight:700">${formatRp(totalHarga)}</span></div>
  `;
}

function updateSummaryBar() {
  const data = getThisInvoice();
  if (!data) return;
  const totalItem  = (data.items || []).reduce((s, i) => s + (parseInt(i.jumlahKeluar) || 0), 0);
  const totalHarga = (data.items || []).reduce(
    (s, i) => s + parseFloat(i.hargaJual || i.hargaHPP || 0) * (parseInt(i.jumlahKeluar) || 0), 0
  );
  document.getElementById("summaryTotal").textContent = totalItem;
  document.getElementById("summaryHarga").textContent = formatRp(totalHarga);
}

// ============================================================
// ===== TABEL ITEMS ==========================================
// ============================================================
const tableBody = document.getElementById("tableBody");
let rowToDelete  = null;
let selectedBarang = null;

function renderTableItems() {
  tableBody.innerHTML = "";
  const data = getThisInvoice();
  if (!data || !data.items || !data.items.length) {
    tableBody.innerHTML = `<tr class="empty-row">
      <td colspan="11">Belum ada barang — klik "Stock Out Barang" untuk memilih barang dari stok</td>
    </tr>`;
    return;
  }
  data.items.forEach((item, idx) => {
    const hargaJual = parseFloat(item.hargaJual || item.hargaHPP || 0);
    const jumlah    = parseInt(item.jumlahKeluar) || 0;
    const subtotal  = hargaJual * jumlah;
    const sisaClass = item.sisaStok <= 5 ? "stok-sisa-low" : "stok-sisa-ok";

    const tr = document.createElement("tr");
    tr.dataset.idx = idx;
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td><strong>${item.nama}</strong></td>
      <td><span class="badge badge-blue">${item.kategori || "—"}</span></td>
      <td>${item.merk || "—"}</td>
      <td>${item.lokasi || "—"}</td>
      <td><span class="badge badge-orange">${item.invoiceAsal || "—"}</span></td>
      <td class="col-harga-item">${formatRp(hargaJual)}</td>
      <td><strong>${jumlah}</strong></td>
      <td class="col-harga-item">${formatRp(subtotal)}</td>
      <td class="${sisaClass}">${item.sisaStok}</td>
      <td>
        <button class="btn-hapus btn-kembalikan">
          <i class="bx bx-undo"></i> Kembalikan
        </button>
      </td>
    `;
    tr.querySelector(".btn-kembalikan").addEventListener("click", () => {
      rowToDelete = idx;
      document.getElementById("confirmOverlay").classList.add("active");
    });
    tableBody.appendChild(tr);
  });
}

// ============================================================
// ===== SCANNER SKU (ZXing) ==================================
// ============================================================
const SKU_SCAN = { stream: null, reader: null, active: false, done: false };
let zxingLoadPromise = null;

function loadZXing() {
  if (window.ZXing) return Promise.resolve();
  if (zxingLoadPromise) return zxingLoadPromise;
  zxingLoadPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js";
    s.onload  = resolve;
    s.onerror = () => { zxingLoadPromise = null; reject(new Error("ZXing gagal dimuat")); };
    document.head.appendChild(s);
  });
  return zxingLoadPromise;
}

function stopSKUScanner() {
  SKU_SCAN.active = false;
  SKU_SCAN.done   = false;
  if (SKU_SCAN.reader) {
    try { SKU_SCAN.reader.reset(); } catch (_) {}
    SKU_SCAN.reader = null;
  }
  if (SKU_SCAN.stream) {
    try { SKU_SCAN.stream.getTracks().forEach((t) => t.stop()); } catch (_) {}
    SKU_SCAN.stream = null;
  }
  const video = document.getElementById("cameraStreamSKU");
  if (video) { try { video.pause(); video.srcObject = null; } catch (_) {} }
  const ph = document.getElementById("scanPlaceholderSKU");
  if (ph) ph.style.display = "flex";
  setSKUScanStatus("");
}

function closeSKUPanel() {
  stopSKUScanner();
  const panel = document.getElementById("scannerSKUPanel");
  if (panel) panel.classList.add("hidden");
  const res = document.getElementById("scanResultSKU");
  if (res) res.classList.add("hidden");
}

function setSKUScanStatus(state, msg = "") {
  let el = document.getElementById("skuScanStatusIK");
  if (!el) {
    el = document.createElement("div");
    el.id = "skuScanStatusIK";
    el.className = "scan-status";
    const panel = document.getElementById("scannerSKUPanel");
    if (panel) panel.appendChild(el);
    else return;
  }
  if (!state) { el.style.display = "none"; return; }
  el.style.display = "flex";
  el.setAttribute("data-state", state);
  el.innerHTML =
    state === "loading"
      ? `<span class="spin"></span><span>${msg}</span>`
      : state === "scanning"
      ? `<i class="bx bx-barcode-reader"></i><span>${msg}</span>`
      : `<i class="bx bx-error-circle"></i><span>${msg}</span>`;
}

// Toggle scanner panel
document.getElementById("btnScanSKU").addEventListener("click", () => {
  const panel = document.getElementById("scannerSKUPanel");
  panel.classList.contains("hidden") ? panel.classList.remove("hidden") : closeSKUPanel();
});

document.getElementById("btnCloseScannerSKU").addEventListener("click", closeSKUPanel);

// Buka kamera
document.getElementById("btnOpenCamSKU").addEventListener("click", async () => {
  stopSKUScanner();
  setSKUScanStatus("loading", "Memuat scanner...");
  try {
    await loadZXing();
    const reader = new ZXing.BrowserMultiFormatReader();
    SKU_SCAN.reader = reader;
    SKU_SCAN.done   = false;
    const video  = document.getElementById("cameraStreamSKU");
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    SKU_SCAN.stream = stream;
    SKU_SCAN.active = true;
    video.srcObject = stream;
    document.getElementById("scanPlaceholderSKU").style.display = "none";
    setSKUScanStatus("scanning", "Arahkan ke barcode SKU...");
    reader.decodeFromStream(stream, video, (result) => {
      if (SKU_SCAN.done || !SKU_SCAN.active) return;
      if (result) {
        SKU_SCAN.done = true;
        const val = result.getText();
        document.getElementById("scanResultValSKU").textContent = val;
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
        : "Kamera gagal: " + err.message
    );
  }
});

// Upload gambar
document.getElementById("galleryInputSKU").addEventListener("change", async function (e) {
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
      const val = result.getText();
      document.getElementById("scanResultValSKU").textContent = val;
      document.getElementById("scanResultSKU").classList.remove("hidden");
      setSKUScanStatus("");
      // Auto-cari barang berdasarkan SKU hasil scan
      handleSKUSearch(val);
    } catch (_) {
      setSKUScanStatus("error", "Barcode tidak terbaca. Coba foto lebih jelas.");
    } finally {
      try { reader.reset(); } catch (_) {}
      URL.revokeObjectURL(url);
    }
  } catch (err) {
    setSKUScanStatus("error", "Error: " + err.message);
  }
});

// Gunakan hasil scan
document.getElementById("btnUseScanSKU").addEventListener("click", () => {
  const val = document.getElementById("scanResultValSKU").textContent;
  document.getElementById("searchBarang").value = val;
  filterStokList(val);
  document.getElementById("scanResultSKU").classList.add("hidden");
  closeSKUPanel();
  // Buka modal pilih barang agar hasil scan terlihat
  document.getElementById("modalOverlay").classList.add("active");
});

// Auto-cari & filter list berdasarkan SKU
function handleSKUSearch(sku) {
  if (!sku) return;
  document.getElementById("searchBarang").value = sku;
  filterStokList(sku);
  closeSKUPanel();
  document.getElementById("modalOverlay").classList.add("active");
}

// ============================================================
// ===== PILIH BARANG — MODAL =================================
// ============================================================
let allGlobalStok = [];

document.getElementById("btnAddItem").addEventListener("click", () => {
  buildStokList();
  document.getElementById("searchBarang").value = "";
  document.getElementById("modalOverlay").classList.add("active");
});

document.getElementById("batalBtn").addEventListener("click", () => {
  document.getElementById("modalOverlay").classList.remove("active");
});
document.getElementById("modalOverlay").addEventListener("click", (e) => {
  if (e.target === document.getElementById("modalOverlay"))
    document.getElementById("modalOverlay").classList.remove("active");
});

document.getElementById("searchBarang").addEventListener("input", function () {
  filterStokList(this.value);
});

function filterStokList(keyword) {
  const kw = (keyword || "").toLowerCase();
  const filtered = kw
    ? allGlobalStok.filter(
        (b) =>
          b.nama.toLowerCase().includes(kw) ||
          (b.sku      || "").toLowerCase().includes(kw) ||
          (b.kategori || "").toLowerCase().includes(kw) ||
          (b.merk     || "").toLowerCase().includes(kw) ||
          (b.invoiceAsal || "").toLowerCase().includes(kw) ||
          (b.lokasi   || "").toLowerCase().includes(kw)
      )
    : allGlobalStok;
  renderStokList(filtered);
}

/**
 * Membangun daftar stok dari localStorage['invoices'] secara langsung.
 * Ini memastikan stok yang tampil selalu terkini (sudah dikurangi stock-out sebelumnya).
 */
function buildStokList() {
  const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
  allGlobalStok = [];

  Object.values(invoices).forEach((inv) => {
    if (!inv.items) return;
    inv.items.forEach((item) => {
      const stokSisa = parseInt(item.stok) || 0;
      // Hanya tampilkan barang yang stoknya > 0
      if (stokSisa <= 0) return;
      allGlobalStok.push({
        invoiceAsal : inv.invoice,
        nama        : item.nama,
        kategori    : item.kategori || "—",
        merk        : item.merk     || "—",
        lokasi      : item.lokasi   || "—",
        sku         : item.sku      || "—",
        hargaHPP    : item.hargaHPP  || 0,
        hargaJual   : item.hargaJual || 0,
        stok        : stokSisa,
      });
    });
  });

  renderStokList(allGlobalStok);
}

function renderStokList(list) {
  const stokList = document.getElementById("stokList");
  stokList.innerHTML = "";
  if (!list.length) {
    stokList.innerHTML = `<div class="stok-empty-msg">Tidak ada barang yang ditemukan atau semua stok sudah habis</div>`;
    return;
  }
  list.forEach((barang) => {
    const isLow      = barang.stok > 0 && barang.stok <= 5;
    const badgeClass = isLow ? "stok-badge-low" : "stok-badge-ok";
    const badgeLabel = isLow ? `Stok: ${barang.stok} ⚠️` : `Stok: ${barang.stok}`;

    const div = document.createElement("div");
    div.className = "stok-item";
    div.innerHTML = `
      <div class="stok-item-info">
        <div class="stok-item-name">${barang.nama}</div>
        <div class="stok-item-meta">
          <span>🔖 ${barang.sku}</span>
          <span>📂 ${barang.kategori}</span>
          <span>🏷️ ${barang.merk}</span>
          <span>📍 ${barang.lokasi}</span>
          <span>🧾 ${barang.invoiceAsal}</span>
          <span style="color:#1a6b2a;font-weight:600">💰 ${formatRp(barang.hargaJual || barang.hargaHPP)}</span>
        </div>
      </div>
      <div class="stok-item-right">
        <span class="stok-badge ${badgeClass}">${badgeLabel}</span>
        <button class="btn-pilih">Pilih</button>
      </div>
    `;
    div.querySelector(".btn-pilih").addEventListener("click", () => bukaModalJumlah(barang));
    stokList.appendChild(div);
  });
}

// ============================================================
// ===== MODAL JUMLAH =========================================
// ============================================================
function bukaModalJumlah(barang) {
  selectedBarang = barang;
  document.getElementById("inputJumlah").value = 1;
  document.getElementById("inputJumlah").max   = barang.stok;
  document.getElementById("errorMsgJumlah").textContent = "";
  document.getElementById("barangPreview").innerHTML = `
    <strong>${barang.nama}</strong><br>
    Kategori: ${barang.kategori} &nbsp;|&nbsp; Merk: ${barang.merk}<br>
    Lokasi: ${barang.lokasi} &nbsp;|&nbsp; Invoice Asal: ${barang.invoiceAsal}<br>
    <span style="color:#1a6b2a;font-weight:700">Harga Jual: ${formatRp(barang.hargaJual || barang.hargaHPP)}</span>
  `;
  document.getElementById("stokInfo").textContent = `Stok tersedia: ${barang.stok} item`;
  document.getElementById("modalOverlay").classList.remove("active");
  document.getElementById("jumlahOverlay").classList.add("active");
}

document.getElementById("qtyMinus").addEventListener("click", () => {
  const val = parseInt(document.getElementById("inputJumlah").value) || 1;
  if (val > 1) document.getElementById("inputJumlah").value = val - 1;
});
document.getElementById("qtyPlus").addEventListener("click", () => {
  const val = parseInt(document.getElementById("inputJumlah").value) || 1;
  if (selectedBarang && val < selectedBarang.stok)
    document.getElementById("inputJumlah").value = val + 1;
});

document.getElementById("batalJumlahBtn").addEventListener("click", () => {
  document.getElementById("jumlahOverlay").classList.remove("active");
  selectedBarang = null;
  document.getElementById("modalOverlay").classList.add("active");
});
document.getElementById("jumlahOverlay").addEventListener("click", (e) => {
  if (e.target === document.getElementById("jumlahOverlay")) {
    document.getElementById("jumlahOverlay").classList.remove("active");
    selectedBarang = null;
  }
});

// ============================================================
// ===== KONFIRMASI OUT =======================================
// ============================================================
document.getElementById("konfirmasiOutBtn").addEventListener("click", () => {
  const jumlah = parseInt(document.getElementById("inputJumlah").value);
  const errEl  = document.getElementById("errorMsgJumlah");

  if (!jumlah || jumlah < 1) { errEl.textContent = "Jumlah harus minimal 1!"; return; }
  if (jumlah > selectedBarang.stok) {
    errEl.textContent = `Melebihi stok tersedia (${selectedBarang.stok})!`;
    return;
  }

  // Kurangi stok di invoices localStorage
  kurangiStokInvoice(selectedBarang.invoiceAsal, selectedBarang.nama, selectedBarang.sku, jumlah);

  const newItem = {
    invoiceAsal  : selectedBarang.invoiceAsal,
    nama         : selectedBarang.nama,
    kategori     : selectedBarang.kategori,
    merk         : selectedBarang.merk,
    lokasi       : selectedBarang.lokasi,
    sku          : selectedBarang.sku,
    hargaHPP     : selectedBarang.hargaHPP,
    hargaJual    : selectedBarang.hargaJual || selectedBarang.hargaHPP,
    jumlahKeluar : jumlah,
    sisaStok     : selectedBarang.stok - jumlah,
  };

  const list  = loadStockOuts();
  const soIdx = list.findIndex((s) => s.id === invoiceId);
  if (soIdx === -1) { window.location.href = "stockOut.html"; return; }
  if (!list[soIdx].items) list[soIdx].items = [];
  list[soIdx].items.push(newItem);
  saveStockOuts(list);

  renderTableItems();
  renderInfo();
  updateSummaryBar();

  document.getElementById("jumlahOverlay").classList.remove("active");
  selectedBarang = null;
});

/**
 * Kurangi stok berdasarkan invoiceAsal + nama + sku (lebih akurat dari nama+kategori)
 */
function kurangiStokInvoice(invoiceAsal, namaBarang, sku, jumlah) {
  try {
    const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
    if (!invoices[invoiceAsal]) return;
    // Cari berdasarkan SKU dulu (paling akurat), fallback ke nama
    const found = invoices[invoiceAsal].items.find(
      (i) => (sku && sku !== "—" ? i.sku === sku : i.nama === namaBarang)
    );
    if (found) found.stok = Math.max(0, parseInt(found.stok) - jumlah);
    localStorage.setItem("invoices", JSON.stringify(invoices));
  } catch (e) { /* ignore */ }
}

// ============================================================
// ===== KEMBALIKAN (Hapus Item) ==============================
// ============================================================
document.getElementById("confirmYes").addEventListener("click", () => {
  if (rowToDelete === null) return;

  const list  = loadStockOuts();
  const soIdx = list.findIndex((s) => s.id === invoiceId);
  if (soIdx === -1) { window.location.href = "stockOut.html"; return; }

  const items = list[soIdx].items || [];
  const item  = items[rowToDelete];

  if (item) {
    // Kembalikan stok ke invoices
    try {
      const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
      if (invoices[item.invoiceAsal]) {
        const found = invoices[item.invoiceAsal].items.find(
          (i) => (item.sku && item.sku !== "—" ? i.sku === item.sku : i.nama === item.nama)
        );
        if (found) found.stok = (parseInt(found.stok) || 0) + (parseInt(item.jumlahKeluar) || 0);
        localStorage.setItem("invoices", JSON.stringify(invoices));
      }
    } catch (e) { /* ignore */ }

    items.splice(rowToDelete, 1);
    list[soIdx].items = items;
    saveStockOuts(list);
  }

  rowToDelete = null;
  document.getElementById("confirmOverlay").classList.remove("active");
  renderTableItems();
  renderInfo();
  updateSummaryBar();
});

document.getElementById("confirmNo").addEventListener("click", () => {
  rowToDelete = null;
  document.getElementById("confirmOverlay").classList.remove("active");
});
document.getElementById("confirmOverlay").addEventListener("click", (e) => {
  if (e.target === document.getElementById("confirmOverlay")) {
    rowToDelete = null;
    document.getElementById("confirmOverlay").classList.remove("active");
  }
});

// ============================================================
// ===== PRINT NOTA ===========================================
// ============================================================
document.getElementById("btnPrintNota").addEventListener("click", printNota);

function printNota() {
    const data = getThisInvoice();
    if (!data) return;

    const items = data.items || [];
    const totalItem = items.reduce((s, i) => s + (parseInt(i.jumlahKeluar) || 0), 0);
    const totalHarga = items.reduce(
        (s, i) => s + parseFloat(i.hargaJual || i.hargaHPP || 0) * (parseInt(i.jumlahKeluar) || 0),
        0
    );

    const now = new Date();
    const printTime = now.toLocaleString("id-ID", {
        day: "numeric", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    });

    // Baris item tabel
    const itemRows = items.map((item, idx) => `
        <tr>
            <td style="padding:5px 8px;border-bottom:0.5px solid #ddd;">${idx + 1}</td>
            <td style="padding:5px 8px;border-bottom:0.5px solid #ddd;">${item.nama}<br>
                <span style="font-size:10px;color:#888;">${item.kategori || ""} · ${item.merk || ""}</span>
            </td>
            <td style="padding:5px 8px;border-bottom:0.5px solid #ddd;text-align:center;">${item.jumlahKeluar}</td>
            <td style="padding:5px 8px;border-bottom:0.5px solid #ddd;text-align:right;">
                Rp ${Number(item.hargaJual || item.hargaHPP || 0).toLocaleString("id-ID")}
            </td>
            <td style="padding:5px 8px;border-bottom:0.5px solid #ddd;text-align:right;font-weight:600;">
                Rp ${(parseFloat(item.hargaJual || item.hargaHPP || 0) * parseInt(item.jumlahKeluar || 0)).toLocaleString("id-ID")}
            </td>
        </tr>
    `).join("");

    const emptyRows = items.length === 0
        ? `<tr><td colspan="5" style="padding:16px;text-align:center;color:#aaa;font-style:italic;">Belum ada barang</td></tr>`
        : "";

    const payIcon = data.paymentId === "pay_default_cash" ? "💵"
                  : data.paymentId === "pay_default_qris" ? "📱" : "💰";

    const win = window.open("", "_blank", "width=420,height=640");
    win.document.write(`
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Nota — ${data.invoice}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: "Poppins", "Segoe UI", sans-serif;
    font-size: 12px;
    background: #fff;
    color: #111;
    padding: 24px;
    max-width: 380px;
    margin: 0 auto;
  }
  .header { text-align: center; margin-bottom: 16px; border-bottom: 2px dashed #111; padding-bottom: 12px; }
  .header h1 { font-size: 20px; font-weight: 800; letter-spacing: 2px; }
  .header p  { font-size: 11px; color: #555; margin-top: 3px; }
  .invoice-no {
    display: inline-block;
    background: #f0f4ff;
    color: rgb(16,44,168);
    font-size: 13px;
    font-weight: 700;
    padding: 3px 12px;
    border-radius: 20px;
    border: 1px solid #c0d0f0;
    margin: 8px 0;
    letter-spacing: 0.5px;
  }
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 12px;
    margin: 12px 0 16px;
    padding: 10px;
    background: #f8f9fc;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
  }
  .info-item { display: flex; flex-direction: column; gap: 1px; }
  .info-label { font-size: 9px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-val   { font-size: 12px; font-weight: 600; color: #111; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  thead { background: #f0f4ff; }
  th {
    padding: 6px 8px; font-size: 11px; font-weight: 700;
    border-bottom: 1.5px solid #111; text-align: left;
  }
  th:last-child, th:nth-child(3), th:nth-child(4) { text-align: right; }
  th:nth-child(3) { text-align: center; }
  .total-section {
    border-top: 2px dashed #111;
    padding-top: 10px;
    margin-top: 4px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
  }
  .total-row.grand {
    font-size: 15px;
    font-weight: 800;
    color: rgb(16,44,168);
    border-top: 1.5px solid #111;
    padding-top: 8px;
    margin-top: 4px;
  }
  .payment-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    background: #d4f7e7;
    color: #0a6640;
    border: 1px solid #aaeacc;
  }
  .footer {
    text-align: center;
    margin-top: 18px;
    padding-top: 12px;
    border-top: 1px dashed #ccc;
    font-size: 10px;
    color: #aaa;
    line-height: 1.7;
  }
  .footer strong { color: #555; font-size: 11px; }
  .print-btn {
    display: block;
    width: 100%;
    margin: 16px 0 0;
    padding: 10px;
    background: rgb(16,44,168);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
  }
  .print-btn:hover { opacity: 0.9; }
  @media print {
    .print-btn { display: none; }
    body { padding: 0; }
  }
</style>
</head>
<body>

<div class="header">
  <h1>INVENZ</h1>
  <p>Sistem Manajemen Inventori</p>
  <div class="invoice-no">${data.invoice}</div>
</div>

<div class="info-grid">
  <div class="info-item">
    <span class="info-label">Tanggal</span>
    <span class="info-val">${formatDate(data.tanggal)}</span>
  </div>
  <div class="info-item">
    <span class="info-label">Customer</span>
    <span class="info-val">${data.penerima || "—"}</span>
  </div>
  <div class="info-item">
    <span class="info-label">No. Telepon</span>
    <span class="info-val">${data.telepon || "—"}</span>
  </div>
  <div class="info-item">
    <span class="info-label">Metode Bayar</span>
    <span class="info-val">${payIcon} ${data.paymentNama || "—"}</span>
  </div>
  <div class="info-item">
    <span class="info-label">Dicetak</span>
    <span class="info-val" style="font-size:10px">${printTime}</span>
  </div>
  <div class="info-item">
    <span class="info-label">Operator</span>
    <span class="info-val">${localStorage.getItem("loggedUser") || "Admin"}</span>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th style="width:24px">#</th>
      <th>Nama Barang</th>
      <th style="width:36px;text-align:center">Qty</th>
      <th style="text-align:right">Harga</th>
      <th style="text-align:right">Subtotal</th>
    </tr>
  </thead>
  <tbody>
    ${itemRows}
    ${emptyRows}
  </tbody>
</table>

<div class="total-section">
  <div class="total-row">
    <span style="color:#555">Total item</span>
    <span style="font-weight:600">${totalItem} pcs</span>
  </div>
  <div class="total-row grand">
    <span>TOTAL</span>
    <span>Rp ${totalHarga.toLocaleString("id-ID")}</span>
  </div>
</div>

<div class="footer">
  <strong>Terima kasih atas kepercayaan Anda!</strong><br>
  Barang yang sudah dibeli tidak dapat dikembalikan<br>
  kecuali ada perjanjian sebelumnya.<br><br>
  Disimpan & dicetak via INVENZ
</div>

<button class="print-btn" onclick="window.print()">🖨️ Print Nota</button>

</body>
</html>
    `);
    win.document.close();
}

// ============================================================
// ===== SAFETY NET =====
window.addEventListener("beforeunload",     () => stopSKUScanner());
window.addEventListener("pagehide",          () => stopSKUScanner());
window.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") stopSKUScanner();
});

// ============================================================
// ===== INIT =================================================
// ============================================================
renderInfo();
renderTableItems();
updateSummaryBar();