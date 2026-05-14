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

// ===== STORAGE KEY (sama dengan stockOut.js) =====
const STOCKOUT_KEY = "stockOuts_v2";

// ===== LOAD DATA INVOICE INI =====
function loadStockOuts() {
  try {
    return JSON.parse(localStorage.getItem(STOCKOUT_KEY) || "[]");
  } catch {
    return [];
  }
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
  const bulan = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  return `${parseInt(d)} ${bulan[parseInt(m) - 1]} ${y}`;
}

// ===== PAYMENT BADGE =====
function paymentBadgeHtml(paymentId, paymentNama) {
  const map = {
    pay_default_cash: { icon: "💵", cls: "pay-cash" },
    pay_default_qris: { icon: "📱", cls: "pay-qris" },
  };
  const cfg = map[paymentId] || { icon: "💰", cls: "pay-other" };
  return `<span class="info-payment-badge ${cfg.cls}">${cfg.icon} ${paymentNama || "—"}</span>`;
}

// ===== RENDER INFO BAR =====
function renderInfo() {
  const data = getThisInvoice();
  if (!data) return;

  document.getElementById("navTitle").textContent = data.invoice;

  const totalItem = (data.items || []).reduce(
    (s, i) => s + (parseInt(i.jumlahKeluar) || 0),
    0,
  );
  const totalHarga = (data.items || []).reduce(
    (s, i) =>
      s +
      parseFloat(i.hargaJual || i.hargaHPP || 0) *
        (parseInt(i.jumlahKeluar) || 0),
    0,
  );

  document.getElementById("invoiceInfo").innerHTML = `
        <div class="info-item">
            <span class="info-label">Invoice</span>
            <span class="info-val"><strong>${data.invoice}</strong></span>
        </div>
        <div class="info-item">
            <span class="info-label">Tanggal</span>
            <span class="info-val">${formatDate(data.tanggal)}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Customer</span>
            <span class="info-val"><strong>${data.penerima || "—"}</strong></span>
        </div>
        <div class="info-item">
            <span class="info-label">No. Telepon</span>
            <span class="info-val">${data.telepon || '<span style="color:#bbb">—</span>'}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Metode Bayar</span>
            <span class="info-val">${paymentBadgeHtml(data.paymentId, data.paymentNama)}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Total Barang</span>
            <span class="info-val" id="infoTotal"><strong>${totalItem}</strong> item</span>
        </div>
        <div class="info-item">
            <span class="info-label">Total Nilai</span>
            <span class="info-val" id="infoHarga" style="color:#1a6b2a;font-weight:700">${formatRp(totalHarga)}</span>
        </div>
    `;
}

// ===== UPDATE SUMMARY BAR BAWAH =====
function updateSummaryBar() {
  const data = getThisInvoice();
  if (!data) return;
  const totalItem = (data.items || []).reduce(
    (s, i) => s + (parseInt(i.jumlahKeluar) || 0),
    0,
  );
  const totalHarga = (data.items || []).reduce(
    (s, i) =>
      s +
      parseFloat(i.hargaJual || i.hargaHPP || 0) *
        (parseInt(i.jumlahKeluar) || 0),
    0,
  );
  document.getElementById("summaryTotal").textContent = totalItem;
  document.getElementById("summaryHarga").textContent = formatRp(totalHarga);
}

// ============================================================
// ===== TABEL ITEMS ==========================================
// ============================================================
const tableBody = document.getElementById("tableBody");
let rowCount = 0;
let rowToDelete = null;
let selectedBarang = null;

function renderTableItems() {
  tableBody.innerHTML = "";
  rowCount = 0;
  const data = getThisInvoice();
  if (!data || !data.items || !data.items.length) {
    tableBody.innerHTML = `<tr class="empty-row">
            <td colspan="11">Belum ada barang — klik "Stock Out Barang" untuk memilih barang dari stok</td>
        </tr>`;
    return;
  }
  data.items.forEach((item, idx) => {
    rowCount++;
    tambahBarisTabel(item, idx, false);
  });
}

function tambahBarisTabel(item, idx, prepend = false) {
  const hargaJual = parseFloat(item.hargaJual || item.hargaHPP || 0);
  const jumlah = parseInt(item.jumlahKeluar) || 0;
  const subtotal = hargaJual * jumlah;
  const sisaClass = item.sisaStok <= 5 ? "stok-sisa-low" : "stok-sisa-ok";

  if (prepend) {
    // Hapus empty row jika ada
    const emptyRow = tableBody.querySelector(".empty-row");
    if (emptyRow) emptyRow.remove();
    rowCount++;
  }

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

// Search
document.getElementById("searchBarang").addEventListener("input", function () {
  const kw = this.value.toLowerCase();
  const filtered = kw
    ? allGlobalStok.filter(
        (b) =>
          b.nama.toLowerCase().includes(kw) ||
          (b.kategori || "").toLowerCase().includes(kw) ||
          (b.merk || "").toLowerCase().includes(kw) ||
          (b.invoiceAsal || "").toLowerCase().includes(kw) ||
          (b.lokasi || "").toLowerCase().includes(kw),
      )
    : allGlobalStok;
  renderStokList(filtered);
});

function buildStokList() {
  const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
  allGlobalStok = [];
  Object.values(invoices).forEach((inv) => {
    if (!inv.items) return;
    inv.items.forEach((item) => {
      allGlobalStok.push({
        invoiceAsal: inv.invoice,
        nama: item.nama,
        kategori: item.kategori || "—",
        merk: item.merk || "—",
        lokasi: item.lokasi || "—",
        sku: item.sku || "—",
        hargaHPP: item.hargaHPP || 0,
        hargaJual: item.hargaJual || 0,
        stok: parseInt(item.stok) || 0,
      });
    });
  });
  renderStokList(allGlobalStok);
}

function renderStokList(list) {
  const stokList = document.getElementById("stokList");
  stokList.innerHTML = "";
  if (!list.length) {
    stokList.innerHTML = `<div class="stok-empty-msg">Tidak ada barang yang ditemukan</div>`;
    return;
  }
  list.forEach((barang) => {
    const isEmpty = barang.stok <= 0;
    const isLow = barang.stok > 0 && barang.stok <= 5;
    const badgeClass = isEmpty
      ? "stok-badge-empty"
      : isLow
        ? "stok-badge-low"
        : "stok-badge-ok";
    const badgeLabel = isEmpty
      ? "Habis"
      : isLow
        ? `Stok: ${barang.stok} ⚠️`
        : `Stok: ${barang.stok}`;

    const div = document.createElement("div");
    div.className = "stok-item";
    div.innerHTML = `
            <div class="stok-item-info">
                <div class="stok-item-name">${barang.nama}</div>
                <div class="stok-item-meta">
                    <span>📂 ${barang.kategori}</span>
                    <span>🏷️ ${barang.merk}</span>
                    <span>📍 ${barang.lokasi}</span>
                    <span>🧾 ${barang.invoiceAsal}</span>
                    <span style="color:#1a6b2a;font-weight:600">💰 ${formatRp(barang.hargaJual || barang.hargaHPP)}</span>
                </div>
            </div>
            <div class="stok-item-right">
                <span class="stok-badge ${badgeClass}">${badgeLabel}</span>
                <button class="btn-pilih" ${isEmpty ? "disabled" : ""}>Pilih</button>
            </div>
        `;
    if (!isEmpty) {
      div
        .querySelector(".btn-pilih")
        .addEventListener("click", () => bukaModalJumlah(barang));
    }
    stokList.appendChild(div);
  });
}

// ============================================================
// ===== MODAL JUMLAH =========================================
// ============================================================
function bukaModalJumlah(barang) {
  selectedBarang = barang;
  document.getElementById("inputJumlah").value = 1;
  document.getElementById("inputJumlah").max = barang.stok;
  document.getElementById("errorMsgJumlah").textContent = "";
  document.getElementById("barangPreview").innerHTML = `
        <strong>${barang.nama}</strong><br>
        Kategori: ${barang.kategori} &nbsp;|&nbsp; Merk: ${barang.merk}<br>
        Lokasi: ${barang.lokasi} &nbsp;|&nbsp; Invoice Asal: ${barang.invoiceAsal}<br>
        <span style="color:#1a6b2a;font-weight:700">Harga Jual: ${formatRp(barang.hargaJual || barang.hargaHPP)}</span>
    `;
  document.getElementById("stokInfo").textContent =
    `Stok tersedia: ${barang.stok} item`;

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
  const errEl = document.getElementById("errorMsgJumlah");

  if (!jumlah || jumlah < 1) {
    errEl.textContent = "Jumlah harus minimal 1!";
    return;
  }
  if (jumlah > selectedBarang.stok) {
    errEl.textContent = `Melebihi stok tersedia (${selectedBarang.stok})!`;
    return;
  }

  // Kurangi stok di invoices
  kurangiStokInvoice(
    selectedBarang.invoiceAsal,
    selectedBarang.nama,
    selectedBarang.kategori,
    jumlah,
  );

  const newItem = {
    invoiceAsal: selectedBarang.invoiceAsal,
    nama: selectedBarang.nama,
    kategori: selectedBarang.kategori,
    merk: selectedBarang.merk,
    lokasi: selectedBarang.lokasi,
    sku: selectedBarang.sku,
    hargaHPP: selectedBarang.hargaHPP,
    hargaJual: selectedBarang.hargaJual || selectedBarang.hargaHPP,
    jumlahKeluar: jumlah,
    sisaStok: selectedBarang.stok - jumlah,
  };

  // Simpan ke stockOuts_v2
  const list = loadStockOuts();
  const soIdx = list.findIndex((s) => s.id === invoiceId);
  if (soIdx === -1) {
    window.location.href = "stockOut.html";
    return;
  }
  if (!list[soIdx].items) list[soIdx].items = [];
  list[soIdx].items.push(newItem);
  saveStockOuts(list);

  // Render ulang semua
  renderTableItems();
  renderInfo();
  updateSummaryBar();

  document.getElementById("jumlahOverlay").classList.remove("active");
  selectedBarang = null;
});

function kurangiStokInvoice(invoiceAsal, namaBarang, kategori, jumlah) {
  try {
    const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
    if (!invoices[invoiceAsal]) return;
    const found = invoices[invoiceAsal].items.find(
      (i) => i.nama === namaBarang && i.kategori === kategori,
    );
    if (found) found.stok = Math.max(0, parseInt(found.stok) - jumlah);
    localStorage.setItem("invoices", JSON.stringify(invoices));
  } catch (e) {
    /* ignore */
  }
}

// ============================================================
// ===== KEMBALIKAN (Hapus Item) ==============================
// ============================================================
document.getElementById("confirmYes").addEventListener("click", () => {
  if (rowToDelete === null) return;

  const list = loadStockOuts();
  const soIdx = list.findIndex((s) => s.id === invoiceId);
  if (soIdx === -1) {
    window.location.href = "stockOut.html";
    return;
  }

  const items = list[soIdx].items || [];
  const item = items[rowToDelete];

  if (item) {
    // Kembalikan stok
    try {
      const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
      if (invoices[item.invoiceAsal]) {
        const found = invoices[item.invoiceAsal].items.find(
          (i) => i.nama === item.nama && i.kategori === item.kategori,
        );
        if (found)
          found.stok =
            (parseInt(found.stok) || 0) + (parseInt(item.jumlahKeluar) || 0);
        localStorage.setItem("invoices", JSON.stringify(invoices));
      }
    } catch (e) {
      /* ignore */
    }

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
// ===== INIT =================================================
// ============================================================
renderInfo();
renderTableItems();
updateSummaryBar();
