// ===== AUTH =====
if (!localStorage.getItem("isLoggedIn")) window.location.href = "login.html";

const loggedUser = localStorage.getItem("loggedUser") || "Admin";
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

// ===== TAB SWITCHING =====
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.tab;
    document
      .querySelectorAll(".tab-btn")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    document
      .querySelector(`[data-content="${target}"]`)
      .classList.add("active");
  });
});

// ===== STORAGE =====
const STORAGE_KEY = "linkedData";

function getLinkedData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      kategori: parsed.kategori || [],
      merk: parsed.merk || [],
      supplier: parsed.supplier || [],
      barang: parsed.barang || [],
      lokasi: parsed.lokasi || [],
      penerima: parsed.penerima || [],
      sku: parsed.sku || [],
    };
  } catch {
    return {
      kategori: [],
      merk: [],
      supplier: [],
      barang: [],
      lokasi: [],
      penerima: [],
      sku: [],
    };
  }
}

function saveLinkedData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ===== STATE =====
let currentType = null;
let editIndex = null;
let deleteIndex = null;
let deleteType = null;
let editBarangIdx = null; // untuk edit barang

// ===== ELEMEN MODAL UMUM =====
const modalOverlay = document.getElementById("modalOverlay");
const confirmOverlay = document.getElementById("confirmOverlay");
const modalTitle = document.getElementById("modalTitle");
const modalForm = document.getElementById("modalForm");
const errorMsg = document.getElementById("errorMsg");

// ===== FORM TEMPLATES (non-barang) =====
const formTemplates = {
  kategori: () => `
    <label>Nama Kategori *</label>
    <input type="text" id="f_nama" placeholder="Contoh: Elektronik">
  `,
  merk: () => `
    <label>Nama Merk *</label>
    <input type="text" id="f_nama" placeholder="Contoh: Samsung">
  `,
  supplier: () => `
    <label>Nama Supplier *</label>
    <input type="text" id="f_nama" placeholder="Contoh: PT. ABC">
    <label>Kontak</label>
    <input type="text" id="f_kontak" placeholder="Nomor telepon atau email">
    <label>Alamat</label>
    <textarea id="f_alamat" placeholder="Alamat lengkap supplier"></textarea>
    <label>Keterangan</label>
    <textarea id="f_keterangan" placeholder="Keterangan tambahan"></textarea>
  `,
  lokasi: () => `
    <label>Nama Lokasi Inventori *</label>
    <input type="text" id="f_nama" placeholder="Contoh: Gudang A">
  `,
  penerima: () => `
    <label>Nama Penerima/Tujuan *</label>
    <input type="text" id="f_nama" placeholder="Contoh: Divisi IT">
    <label>Keterangan</label>
    <textarea id="f_keterangan" placeholder="Keterangan tambahan"></textarea>
  `,
};

const modalTitles = {
  kategori: ["Tambah Kategori", "Edit Kategori"],
  merk: ["Tambah Merk", "Edit Merk"],
  supplier: ["Tambah Supplier", "Edit Supplier"],
  lokasi: ["Tambah Lokasi Inventori", "Edit Lokasi Inventori"],
  penerima: ["Tambah Penerima/Tujuan", "Edit Penerima/Tujuan"],
};

// ===== OPEN MODAL UMUM =====
function openModal(type, mode = "add", index = null) {
  currentType = type;
  editIndex = mode === "edit" ? index : null;
  modalTitle.textContent = modalTitles[type][mode === "edit" ? 1 : 0];
  modalForm.innerHTML = formTemplates[type]();
  errorMsg.textContent = "";

  if (mode === "edit") {
    const item = getLinkedData()[type][index];
    document.getElementById("f_nama").value = item.nama || "";
    if (type === "supplier") {
      document.getElementById("f_kontak").value = item.kontak || "";
      document.getElementById("f_alamat").value = item.alamat || "";
      document.getElementById("f_keterangan").value = item.keterangan || "";
    }
    if (type === "penerima") {
      document.getElementById("f_keterangan").value = item.keterangan || "";
    }
  }

  modalOverlay.classList.add("active");
  setTimeout(() => {
    const first = modalForm.querySelector("input, textarea");
    if (first) first.focus();
  }, 50);
}

function closeModal() {
  modalOverlay.classList.remove("active");
  modalForm.innerHTML = "";
  errorMsg.textContent = "";
  currentType = null;
  editIndex = null;
}

function doSimpan() {
  if (!currentType) return;
  const namaEl = document.getElementById("f_nama");
  if (!namaEl) {
    errorMsg.textContent = "Form tidak valid.";
    return;
  }
  const nama = namaEl.value.trim();
  if (!nama) {
    errorMsg.textContent = "Nama harus diisi!";
    return;
  }

  const allData = getLinkedData();
  const item = { nama };
  if (currentType === "supplier") {
    item.kontak = (document.getElementById("f_kontak")?.value || "").trim();
    item.alamat = (document.getElementById("f_alamat")?.value || "").trim();
    item.keterangan = (
      document.getElementById("f_keterangan")?.value || ""
    ).trim();
  }
  if (currentType === "penerima") {
    item.keterangan = (
      document.getElementById("f_keterangan")?.value || ""
    ).trim();
  }

  if (editIndex !== null) allData[currentType][editIndex] = item;
  else allData[currentType].push(item);

  saveLinkedData(allData);
  renderTable(currentType);
  closeModal();
}

document.getElementById("btnBatal").addEventListener("click", closeModal);
document.getElementById("btnSimpan").addEventListener("click", doSimpan);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && modalOverlay.classList.contains("active")) {
    e.preventDefault();
    doSimpan();
  }
  if (e.key === "Escape" && modalOverlay.classList.contains("active"))
    closeModal();
});

// ============================================================
// ===== MODAL BARANG (khusus) ================================
// ============================================================

const modalBarangOverlay = document.getElementById("modalBarangOverlay");
const errorMsgBarang = document.getElementById("errorMsgBarang");

function populateSelects() {
  const data = getLinkedData();
  const merkSel = document.getElementById("fBarangMerk");
  const katSel = document.getElementById("fBarangKategori");

  const prevMerk = merkSel.value;
  const prevKat = katSel.value;

  merkSel.innerHTML = '<option value="">-- Pilih Merk --</option>';
  katSel.innerHTML = '<option value="">-- Pilih Kategori --</option>';

  data.merk.forEach((m) => {
    const o = document.createElement("option");
    o.value = m.nama;
    o.textContent = m.nama;
    merkSel.appendChild(o);
  });
  data.kategori.forEach((k) => {
    const o = document.createElement("option");
    o.value = k.nama;
    o.textContent = k.nama;
    katSel.appendChild(o);
  });

  // Kembalikan pilihan sebelumnya jika masih ada
  if (prevMerk) merkSel.value = prevMerk;
  if (prevKat) katSel.value = prevKat;

  // Hint jika merk/kategori kosong
  const hint = document.getElementById("hintMerkKategori");
  if (data.merk.length === 0 || data.kategori.length === 0)
    hint.style.display = "flex";
  else hint.style.display = "none";
}

function openModalBarang(mode = "add", index = null) {
  editBarangIdx = mode === "edit" ? index : null;
  document.getElementById("modalBarangTitle").innerHTML =
    mode === "edit"
      ? '<i class="bx bx-edit"></i> Edit Barang'
      : '<i class="bx bx-package"></i> Tambah Barang';

  populateSelects();
  errorMsgBarang.textContent = "";

  // Reset form
  document.getElementById("fBarangSKU").value = "";
  document.getElementById("fBarangNama").value = "";
  document.getElementById("fBarangMerk").value = "";
  document.getElementById("fBarangKategori").value = "";
  closeScannerBarang();

  if (mode === "edit") {
    const item = getLinkedData().barang[index];
    document.getElementById("fBarangSKU").value = item.sku || "";
    document.getElementById("fBarangNama").value = item.nama || "";
    document.getElementById("fBarangMerk").value = item.merk || "";
    document.getElementById("fBarangKategori").value = item.kategori || "";
  }

  modalBarangOverlay.classList.add("active");
  setTimeout(() => document.getElementById("fBarangSKU").focus(), 50);
}

function closeModalBarang() {
  closeScannerBarang();
  modalBarangOverlay.classList.remove("active");
  errorMsgBarang.textContent = "";
  editBarangIdx = null;
}

document.addEventListener('DOMContentLoaded', () => {
    // ... kode existing lainnya ...
 
    initPayments();   // <── tambahkan ini
});

document
  .getElementById("btnCloseBarang")
  .addEventListener("click", closeModalBarang);
document
  .getElementById("btnBatalBarang")
  .addEventListener("click", closeModalBarang);
modalBarangOverlay.addEventListener("click", (e) => {
  if (e.target === modalBarangOverlay) closeModalBarang();
});

document.getElementById("btnSimpanBarang").addEventListener("click", () => {
  const sku = document.getElementById("fBarangSKU").value.trim();
  const nama = document.getElementById("fBarangNama").value.trim();
  const merk = document.getElementById("fBarangMerk").value;
  const kategori = document.getElementById("fBarangKategori").value;

  if (!sku || !nama || !merk || !kategori) {
    errorMsgBarang.textContent = "Semua field wajib diisi!";
    return;
  }

  const allData = getLinkedData();

  // Cek duplikat SKU (saat tambah baru)
  if (editBarangIdx === null) {
    const dupSKU = allData.barang.some((b) => b.sku === sku);
    if (dupSKU) {
      errorMsgBarang.textContent = "SKU sudah ada!";
      return;
    }
  }

  const item = { sku, nama, merk, kategori };

  if (editBarangIdx !== null) {
    allData.barang[editBarangIdx] = item;
  } else {
    allData.barang.push(item);
  }

  // Sync ke linkedData.sku
  if (!allData.sku) allData.sku = [];
  const skuIdx = allData.sku.findIndex((s) => s.sku === sku);
  if (skuIdx === -1) allData.sku.push({ sku, nama, merk, kategori });
  else allData.sku[skuIdx] = { sku, nama, merk, kategori };

  saveLinkedData(allData);
  renderTable("barang");
  closeModalBarang();
});

// ============================================================
// ===== SCANNER BARANG (ZXing) ===============================
// ============================================================

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

const BARANG_SCAN = { stream: null, reader: null, active: false, done: false };

function stopScannerBarang() {
  BARANG_SCAN.active = false;
  BARANG_SCAN.done = false;
  if (BARANG_SCAN.reader) {
    try {
      BARANG_SCAN.reader.reset();
    } catch (_) {}
    BARANG_SCAN.reader = null;
  }
  if (BARANG_SCAN.stream) {
    try {
      BARANG_SCAN.stream.getTracks().forEach((t) => t.stop());
    } catch (_) {}
    BARANG_SCAN.stream = null;
  }
  const video = document.getElementById("cameraStreamBarang");
  if (video) {
    try {
      video.pause();
      video.srcObject = null;
    } catch (_) {}
  }
  const ph = document.getElementById("scanPlaceholderBarang");
  if (ph) ph.style.display = "flex";
  setScanStatusBarang("");
}

function closeScannerBarang() {
  stopScannerBarang();
  document.getElementById("scannerBarangPanel").classList.add("hidden");
  document.getElementById("scanResultBarang").classList.add("hidden");
}

function setScanStatusBarang(state, msg = "") {
  let el = document.getElementById("scanStatusBarang");
  if (!el) {
    el = document.createElement("div");
    el.id = "scanStatusBarang";
    el.className = "scan-status";
    document.getElementById("scannerBarangPanel").appendChild(el);
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

// Toggle panel scanner
document.getElementById("btnScanBarangSKU").addEventListener("click", () => {
  const panel = document.getElementById("scannerBarangPanel");
  if (panel.classList.contains("hidden")) panel.classList.remove("hidden");
  else closeScannerBarang();
});

document
  .getElementById("btnCloseScannerBarang")
  .addEventListener("click", closeScannerBarang);

// Buka kamera
document
  .getElementById("btnOpenCamBarang")
  .addEventListener("click", async () => {
    stopScannerBarang();
    setScanStatusBarang("loading", "Memuat scanner...");
    try {
      await loadZXing();
      const reader = new ZXing.BrowserMultiFormatReader();
      BARANG_SCAN.reader = reader;
      BARANG_SCAN.done = false;
      const video = document.getElementById("cameraStreamBarang");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      BARANG_SCAN.stream = stream;
      BARANG_SCAN.active = true;
      video.srcObject = stream;
      document.getElementById("scanPlaceholderBarang").style.display = "none";
      setScanStatusBarang("scanning", "Arahkan ke barcode SKU...");
      reader.decodeFromStream(stream, video, (result) => {
        if (BARANG_SCAN.done || !BARANG_SCAN.active) return;
        if (result) {
          BARANG_SCAN.done = true;
          const val = result.getText();
          document.getElementById("scanResultValBarang").textContent = val;
          document
            .getElementById("scanResultBarang")
            .classList.remove("hidden");
          setScanStatusBarang("");
          stopScannerBarang();
          // Auto-lookup SKU dari linkedData
          handleSKULookupBarang(val);
        }
      });
    } catch (err) {
      stopScannerBarang();
      const msg =
        err.message.includes("Permission") ||
        err.message.includes("getUserMedia")
          ? "Izin kamera ditolak."
          : "Kamera gagal: " + err.message;
      setScanStatusBarang("error", msg);
    }
  });

// Upload gambar
document
  .getElementById("galleryBarang")
  .addEventListener("change", async function (e) {
    const file = e.target.files[0];
    if (!file) return;
    this.value = "";
    setScanStatusBarang("loading", "Membaca barcode...");
    try {
      await loadZXing();
      const reader = new ZXing.BrowserMultiFormatReader();
      const url = URL.createObjectURL(file);
      try {
        const result = await reader.decodeFromImageUrl(url);
        const val = result.getText();
        document.getElementById("scanResultValBarang").textContent = val;
        document.getElementById("scanResultBarang").classList.remove("hidden");
        setScanStatusBarang("");
        handleSKULookupBarang(val);
      } catch (_) {
        setScanStatusBarang("error", "Barcode tidak terbaca.");
      } finally {
        try {
          reader.reset();
        } catch (_) {}
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setScanStatusBarang("error", "Error: " + err.message);
    }
  });

// Gunakan hasil scan
document.getElementById("btnUseScanBarang").addEventListener("click", () => {
  const val = document.getElementById("scanResultValBarang").textContent;
  document.getElementById("fBarangSKU").value = val;
  document.getElementById("scanResultBarang").classList.add("hidden");
  closeScannerBarang();
  handleSKULookupBarang(val);
});

// Auto-fill dari SKU yang sudah ada di linkedData
function handleSKULookupBarang(sku) {
  if (!sku) return;
  const allData = getLinkedData();
  const found = (allData.sku || []).find((s) => s.sku === sku);
  if (found) {
    document.getElementById("fBarangNama").value = found.nama || "";
    document.getElementById("fBarangMerk").value = found.merk || "";
    document.getElementById("fBarangKategori").value = found.kategori || "";
    document.getElementById("fBarangSKU").value = sku;
  }
}

// Juga lookup saat blur input SKU
document.getElementById("fBarangSKU").addEventListener("blur", function () {
  handleSKULookupBarang(this.value.trim());
});

// ============================================================
// ===== MODAL BARCODE POPUP ==================================
// ============================================================

const barcodeOverlay = document.getElementById("barcodeOverlay");
let currentBarcodeData = null; // { sku, nama, merk, kategori }

function showBarcodePopup(item) {
  currentBarcodeData = item;

  document.getElementById("barcodeInfo").innerHTML = `
    <div class="bc-info-row"><span class="bc-label">Nama</span><span class="bc-val">${item.nama}</span></div>
    <div class="bc-info-row"><span class="bc-label">SKU</span><span class="bc-val bc-sku">${item.sku}</span></div>
    <div class="bc-info-row"><span class="bc-label">Merk</span><span class="bc-val">${item.merk || "-"}</span></div>
    <div class="bc-info-row"><span class="bc-label">Kategori</span><span class="bc-val">${item.kategori || "-"}</span></div>
  `;

  // Generate barcode via JsBarcode
  try {
    JsBarcode("#barcodeCanvas", item.sku, {
      format: "CODE128",
      width: 2,
      height: 80,
      displayValue: true,
      fontSize: 14,
      margin: 12,
      background: "#ffffff",
      lineColor: "#000000",
      fontOptions: "bold",
    });
  } catch (err) {
    document.getElementById("barcodeCanvas").innerHTML =
      `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="red" font-size="12">SKU tidak valid untuk barcode</text>`;
  }

  barcodeOverlay.classList.add("active");
}

document.getElementById("btnCloseBarcode").addEventListener("click", () => {
  barcodeOverlay.classList.remove("active");
  currentBarcodeData = null;
});
barcodeOverlay.addEventListener("click", (e) => {
  if (e.target === barcodeOverlay) {
    barcodeOverlay.classList.remove("active");
    currentBarcodeData = null;
  }
});

// Download barcode sebagai PNG
document.getElementById("btnDownloadBarcode").addEventListener("click", () => {
  if (!currentBarcodeData) return;

  const svg = document.getElementById("barcodeCanvas");
  const svgStr = new XMLSerializer().serializeToString(svg);
  const canvas = document.createElement("canvas");
  const img = new Image();
  const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    canvas.width = img.width || 300;
    canvas.height = img.height || 150;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    const link = document.createElement("a");
    link.download = `SKU_${currentBarcodeData.sku}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };
  img.src = url;
});

// Print barcode
document.getElementById("btnPrintBarcode").addEventListener("click", () => {
  if (!currentBarcodeData) return;

  const svg = document.getElementById("barcodeCanvas");
  const svgStr = new XMLSerializer().serializeToString(svg);
  const item = currentBarcodeData;

  const win = window.open("", "_blank", "width=420,height=320");
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Print Barcode — ${item.sku}</title>
      <style>
        body { margin: 0; padding: 24px; font-family: "Poppins", sans-serif; display: flex; flex-direction: column; align-items: center; }
        .print-header { text-align: center; margin-bottom: 12px; }
        .print-nama  { font-size: 15px; font-weight: 700; }
        .print-meta  { font-size: 12px; color: #555; margin-top: 2px; }
        img { max-width: 320px; }
        @media print { body { padding: 8px; } }
      </style>
    </head>
    <body>
      <div class="print-header">
        <div class="print-nama">${item.nama}</div>
        <div class="print-meta">${item.merk ? item.merk + " · " : ""}${item.kategori || ""}</div>
      </div>
      <img src="data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgStr)))}" />
      <script>
        window.onload = function() { window.print(); window.close(); }
      <\/script>
    </body>
    </html>
  `);
  win.document.close();
});

// ============================================================
// ===== HAPUS ================================================
// ============================================================

function openConfirmDelete(type, index) {
  deleteType = type;
  deleteIndex = index;
  confirmOverlay.classList.add("active");
}

document.getElementById("confirmYes").addEventListener("click", () => {
  if (deleteType !== null && deleteIndex !== null) {
    const allData = getLinkedData();
    allData[deleteType].splice(deleteIndex, 1);
    saveLinkedData(allData);
    renderTable(deleteType);
  }
  deleteType = null;
  deleteIndex = null;
  confirmOverlay.classList.remove("active");
});

document.getElementById("confirmNo").addEventListener("click", () => {
  deleteType = null;
  deleteIndex = null;
  confirmOverlay.classList.remove("active");
});

confirmOverlay.addEventListener("click", (e) => {
  if (e.target === confirmOverlay) {
    deleteType = null;
    deleteIndex = null;
    confirmOverlay.classList.remove("active");
  }
});

// ============================================================
// ===== RENDER TABLE =========================================
// ============================================================

const tableConfig = {
  kategori: { colspan: 3, cols: ["nama"] },
  merk: { colspan: 3, cols: ["nama"] },
  lokasi: { colspan: 3, cols: ["nama"] },
  supplier: { colspan: 6, cols: ["nama", "kontak", "alamat", "keterangan"] },
  penerima: { colspan: 4, cols: ["nama", "keterangan"] },
};

function renderTable(type) {
  // Barang punya render sendiri
  if (type === "barang") {
    renderTableBarang();
    return;
  }

  const config = tableConfig[type];
  const tbodyId = "table" + type.charAt(0).toUpperCase() + type.slice(1);
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  const data = getLinkedData()[type];
  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="${config.colspan}">Belum ada data ${type}</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  data.forEach((item, idx) => {
    const tr = document.createElement("tr");
    const dataCols = config.cols
      .map((col) => `<td>${item[col] || (col === "nama" ? "" : "-")}</td>`)
      .join("");
    tr.innerHTML = `
      <td>${idx + 1}</td>
      ${dataCols}
      <td>
        <div class="action-buttons">
          <button class="btn-edit"><i class="bx bx-edit"></i> Edit</button>
          <button class="btn-delete"><i class="bx bx-trash"></i> Hapus</button>
        </div>
      </td>
    `;
    tr.querySelector(".btn-edit").addEventListener("click", () =>
      openModal(type, "edit", idx),
    );
    tr.querySelector(".btn-delete").addEventListener("click", () =>
      openConfirmDelete(type, idx),
    );
    tbody.appendChild(tr);
  });
}

// ===== RENDER TABLE BARANG (khusus) =====
function renderTableBarang() {
  const tbody = document.getElementById("tableBarang");
  const data = getLinkedData().barang;

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="6">Belum ada data barang</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  data.forEach((item, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>
        <button class="sku-clickable" data-idx="${idx}">
          <i class="bx bx-barcode"></i>
          <span>${item.sku || "-"}</span>
        </button>
      </td>
      <td>${item.nama || "-"}</td>
      <td>${item.merk || "-"}</td>
      <td>${item.kategori || "-"}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-edit-barang" data-idx="${idx}"><i class="bx bx-edit"></i> Edit</button>
          <button class="btn-delete"><i class="bx bx-trash"></i> Hapus</button>
        </div>
      </td>
    `;

    // Klik SKU → popup barcode
    tr.querySelector(".sku-clickable").addEventListener("click", () => {
      showBarcodePopup(item);
    });

    tr.querySelector(".btn-edit-barang").addEventListener("click", () => {
      openModalBarang("edit", idx);
    });

    tr.querySelector(".btn-delete").addEventListener("click", () => {
      openConfirmDelete("barang", idx);
    });

    tbody.appendChild(tr);
  });
}

// ===== TOMBOL TAMBAH =====
const addBtnMap = {
  btnAddKategori: "kategori",
  btnAddMerk: "merk",
  btnAddSupplier: "supplier",
  btnAddLokasi: "lokasi",
  btnAddPenerima: "penerima",
};

Object.entries(addBtnMap).forEach(([btnId, type]) => {
  const el = document.getElementById(btnId);
  if (el) el.addEventListener("click", () => openModal(type));
});

// Tombol tambah barang → modal khusus
document
  .getElementById("btnAddBarang")
  .addEventListener("click", () => openModalBarang("add"));

// ===== INIT =====
["kategori", "merk", "supplier", "barang", "lokasi", "penerima"].forEach(
  renderTable,
);

/* ─────────────────────────────────────────────
   KONSTANTA STORAGE KEY
   ───────────────────────────────────────────── */
const PAYMENT_KEY = 'invenz_payment_methods';
 
/* ─────────────────────────────────────────────
   DEFAULT METODE (Cash & QRIS tidak bisa hapus)
   ───────────────────────────────────────────── */
const DEFAULT_PAYMENTS = [
    {
        id: 'pay_default_cash',
        nama: 'Cash',
        keterangan: 'Pembayaran tunai',
        aktif: true,
        isDefault: true
    },
    {
        id: 'pay_default_qris',
        nama: 'QRIS',
        keterangan: 'Scan QR Code (GoPay, OVO, Dana, ShopeePay, dll.)',
        aktif: true,
        isDefault: true
    }
];
 
/* ─────────────────────────────────────────────
   HELPER — baca / tulis localStorage
   ───────────────────────────────────────────── */
function loadPayments() {
    try {
        const raw = localStorage.getItem(PAYMENT_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}
 
function savePayments(list) {
    localStorage.setItem(PAYMENT_KEY, JSON.stringify(list));
}
 
/**
 * Inisialisasi: jika belum ada data, seed dengan default.
 * Dipanggil sekali saat DOMContentLoaded.
 */
function initPayments() {
    if (!loadPayments()) {
        savePayments(DEFAULT_PAYMENTS);
    }
    renderPaymentTable();
    bindPaymentEvents();
}
 
/* ─────────────────────────────────────────────
   PUBLIC — dipakai modul lain (stockOut, dll.)
   ───────────────────────────────────────────── */
/**
 * Kembalikan array metode payment yang AKTIF.
 * @returns {{ id, nama, keterangan, aktif, isDefault }[]}
 */
function getPaymentMethods() {
    const list = loadPayments() || DEFAULT_PAYMENTS;
    return list.filter(p => p.aktif);
}
 
/* ─────────────────────────────────────────────
   RENDER TABEL
   ───────────────────────────────────────────── */
function renderPaymentTable() {
    const tbody = document.getElementById('tablePayment');
    if (!tbody) return;
 
    const list = loadPayments() || DEFAULT_PAYMENTS;
 
    if (!list.length) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="5">Belum ada metode pembayaran</td></tr>';
        return;
    }
 
    tbody.innerHTML = list.map((p, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>
                ${p.nama}
                ${p.isDefault ? '<span class="badge-default">Default</span>' : ''}
            </td>
            <td>${p.keterangan || '<span class="text-muted">—</span>'}</td>
            <td>
                <span class="badge-status ${p.aktif ? 'aktif' : 'nonaktif'}">
                    ${p.aktif ? 'Aktif' : 'Non-aktif'}
                </span>
            </td>
            <td class="actions-cell">
                <button class="btn-action btn-edit" onclick="openEditPayment('${p.id}')" title="Edit">
                    <i class="bx bx-edit"></i>
                </button>
                ${p.isDefault
                    ? `<button class="btn-action btn-delete" disabled title="Metode default tidak bisa dihapus" style="opacity:.35;cursor:not-allowed">
                           <i class="bx bx-trash"></i>
                       </button>`
                    : `<button class="btn-action btn-delete" onclick="confirmDeletePayment('${p.id}')" title="Hapus">
                           <i class="bx bx-trash"></i>
                       </button>`
                }
            </td>
        </tr>
    `).join('');
}
 
/* ─────────────────────────────────────────────
   BUKA MODAL — TAMBAH
   ───────────────────────────────────────────── */
function openAddPayment() {
    document.getElementById('modalPaymentTitle').innerHTML =
        '<i class="bx bx-credit-card"></i> Tambah Metode Pembayaran';
    document.getElementById('fPaymentNama').value = '';
    document.getElementById('fPaymentKeterangan').value = '';
    document.getElementById('fPaymentAktif').checked = true;
    document.getElementById('toggleLabel').textContent = 'Aktif';
    document.getElementById('errorMsgPayment').textContent = '';
    document.getElementById('btnSimpanPayment').dataset.editId = '';
    document.getElementById('modalPaymentOverlay').classList.add('active');
    document.getElementById('fPaymentNama').focus();
}
 
/* ─────────────────────────────────────────────
   BUKA MODAL — EDIT
   ───────────────────────────────────────────── */
function openEditPayment(id) {
    const list = loadPayments() || [];
    const item = list.find(p => p.id === id);
    if (!item) return;
 
    document.getElementById('modalPaymentTitle').innerHTML =
        '<i class="bx bx-edit"></i> Edit Metode Pembayaran';
    document.getElementById('fPaymentNama').value = item.nama;
    document.getElementById('fPaymentKeterangan').value = item.keterangan || '';
    document.getElementById('fPaymentAktif').checked = item.aktif;
    document.getElementById('toggleLabel').textContent = item.aktif ? 'Aktif' : 'Non-aktif';
    document.getElementById('errorMsgPayment').textContent = '';
    document.getElementById('btnSimpanPayment').dataset.editId = id;
    document.getElementById('modalPaymentOverlay').classList.add('active');
    document.getElementById('fPaymentNama').focus();
}
 
/* ─────────────────────────────────────────────
   TUTUP MODAL PAYMENT
   ───────────────────────────────────────────── */
function closePaymentModal() {
    document.getElementById('modalPaymentOverlay').classList.remove('active');
}
 
/* ─────────────────────────────────────────────
   SIMPAN (Tambah / Edit)
   ───────────────────────────────────────────── */
function savePayment() {
    const nama = document.getElementById('fPaymentNama').value.trim();
    const keterangan = document.getElementById('fPaymentKeterangan').value.trim();
    const aktif = document.getElementById('fPaymentAktif').checked;
    const editId = document.getElementById('btnSimpanPayment').dataset.editId;
    const errEl = document.getElementById('errorMsgPayment');
 
    if (!nama) {
        errEl.textContent = 'Nama metode tidak boleh kosong.';
        return;
    }
 
    let list = loadPayments() || [];
 
    // Cek duplikat nama (case-insensitive), kecuali diri sendiri saat edit
    const duplicate = list.find(p =>
        p.nama.toLowerCase() === nama.toLowerCase() && p.id !== editId
    );
    if (duplicate) {
        errEl.textContent = 'Metode pembayaran dengan nama ini sudah ada.';
        return;
    }
 
    if (editId) {
        // Mode edit
        list = list.map(p => p.id === editId ? { ...p, nama, keterangan, aktif } : p);
    } else {
        // Mode tambah
        const newItem = {
            id: 'pay_' + Date.now(),
            nama,
            keterangan,
            aktif,
            isDefault: false
        };
        list.push(newItem);
    }
 
    savePayments(list);
    closePaymentModal();
    renderPaymentTable();
}
 
/* ─────────────────────────────────────────────
   HAPUS dengan konfirmasi modal global
   ───────────────────────────────────────────── */
let _pendingDeletePaymentId = null;
 
function confirmDeletePayment(id) {
    _pendingDeletePaymentId = id;
    // Gunakan modal konfirmasi yang sudah ada di HTML
    document.getElementById('confirmOverlay').classList.add('active');
}
 
function executeDeletePayment() {
    if (!_pendingDeletePaymentId) return;
 
    // Cek apakah payment dipakai di transaksi stockOut
    const stockOuts = JSON.parse(localStorage.getItem('invenz_stockouts') || '[]');
    const dipakai = stockOuts.some(so => so.paymentId === _pendingDeletePaymentId);
    if (dipakai) {
        alert('Metode ini sudah digunakan dalam transaksi Stock Out dan tidak dapat dihapus. Nonaktifkan saja jika tidak ingin ditampilkan.');
        _pendingDeletePaymentId = null;
        document.getElementById('confirmOverlay').classList.remove('active');
        return;
    }
 
    let list = loadPayments() || [];
    list = list.filter(p => p.id !== _pendingDeletePaymentId);
    savePayments(list);
    renderPaymentTable();
 
    _pendingDeletePaymentId = null;
    document.getElementById('confirmOverlay').classList.remove('active');
}
 
/* ─────────────────────────────────────────────
   BIND EVENTS
   ───────────────────────────────────────────── */
function bindPaymentEvents() {
    // Tombol "Tambah Metode" di tab
    const btnAdd = document.getElementById('btnAddPayment');
    if (btnAdd) btnAdd.addEventListener('click', openAddPayment);
 
    // Simpan
    const btnSimpan = document.getElementById('btnSimpanPayment');
    if (btnSimpan) btnSimpan.addEventListener('click', savePayment);
 
    // Tutup modal (X & Batal)
    const btnClose = document.getElementById('btnClosePayment');
    if (btnClose) btnClose.addEventListener('click', closePaymentModal);
 
    const btnBatal = document.getElementById('btnBatalPayment');
    if (btnBatal) btnBatal.addEventListener('click', closePaymentModal);
 
    // Overlay klik tutup
    const overlay = document.getElementById('modalPaymentOverlay');
    if (overlay) overlay.addEventListener('click', function(e) {
        if (e.target === this) closePaymentModal();
    });
 
    // Toggle label aktif/nonaktif
    const toggleInput = document.getElementById('fPaymentAktif');
    if (toggleInput) {
        toggleInput.addEventListener('change', function() {
            document.getElementById('toggleLabel').textContent = this.checked ? 'Aktif' : 'Non-aktif';
        });
    }
 
    // Enter submit
    ['fPaymentNama', 'fPaymentKeterangan'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') savePayment(); });
    });
 
    // Hook konfirmasi hapus — perlu share confirmYes dengan confirm global
    // Jika linkedData.js sudah punya handler confirmYes, tambahkan logika berikut
    // di dalam handler yang ada, atau ganti seluruhnya seperti ini:
    const confirmYes = document.getElementById('confirmYes');
    if (confirmYes) {
        // Wrapper: cek apakah pending delete adalah payment atau data lain
        const _originalConfirm = confirmYes.onclick;
        confirmYes.onclick = function() {
            if (_pendingDeletePaymentId) {
                executeDeletePayment();
            } else if (typeof _originalConfirm === 'function') {
                _originalConfirm.call(this);
            }
        };
    }
}