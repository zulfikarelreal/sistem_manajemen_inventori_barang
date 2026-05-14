// ===== AUTH =====
const loggedUser =
  (typeof window.loggedUser !== "undefined" && window.loggedUser) ||
  localStorage.getItem("loggedUser") ||
  "Admin";

if (!localStorage.getItem("isLoggedIn")) {
  window.location.href = "login.html";
}

// ===== AMBIL ID INVOICE DARI URL =====
const params = new URLSearchParams(window.location.search);
const invoiceId = params.get("id");

if (!invoiceId) window.location.href = "stockOut.html";

const stockOuts = JSON.parse(localStorage.getItem("stockOuts") || "{}");
const invoiceData = stockOuts[invoiceId];

if (!invoiceData) window.location.href = "stockOut.html";

// ===== USER INFO =====
document.getElementById("sidebarUsername").textContent = loggedUser;
document.getElementById("sidebarAvatar").textContent = loggedUser
  .charAt(0)
  .toUpperCase();

// ===== RENDER INFO (sama seperti invoice masuk) =====
function renderInfo(data) {
  const invoiceInfo = document.getElementById("invoiceInfo");
  if (!invoiceInfo) return;
  invoiceInfo.innerHTML = `
    <div class="info-item">
      <span class="info-label">Invoice</span>
      <span class="info-value">${data.invoice}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Tanggal Keluar</span>
      <span class="info-value">${data.tanggal}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Penerima / Tujuan</span>
      <span class="info-value">${data.penerima}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Total Barang Keluar</span>
      <span class="info-value" id="infoTotal">${data.total || 0}</span>
    </div>
  `;
}

renderInfo(invoiceData);

// Update navTitle
const navTitle = document.getElementById("navTitle");
if (navTitle) navTitle.textContent = invoiceData.invoice;

// ===== BACK BUTTON =====
document.getElementById("backBtn").addEventListener("click", () => {
  window.location.href = "stockOut.html";
});

// ===== SIDEBAR =====
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("sidebarOverlay");
document.getElementById("hamburger") &&
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

// ===== ELEMEN DOM =====
const tableBody = document.getElementById("tableBody");
const summaryTotal = document.getElementById("summaryTotal");
const modalOverlay = document.getElementById("modalOverlay");
const jumlahOverlay = document.getElementById("jumlahOverlay");
const confirmOverlay = document.getElementById("confirmOverlay");
const stokList = document.getElementById("stokList");
const searchBarang = document.getElementById("searchBarang");
const inputJumlah = document.getElementById("inputJumlah");
const barangPreview = document.getElementById("barangPreview");
const stokInfo = document.getElementById("stokInfo");
const errorMsgJumlah = document.getElementById("errorMsgJumlah");

let selectedBarang = null;
let rowToDelete = null;
let allGlobalStok = [];
let rowCount = 0;

// ===== BUKA MODAL PILIH BARANG =====
document.getElementById("btnAddItem").addEventListener("click", () => {
  buildGlobalStokList();
  searchBarang.value = "";
  modalOverlay.classList.add("active");
});

document.getElementById("batalBtn").addEventListener("click", () => {
  modalOverlay.classList.remove("active");
});
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) modalOverlay.classList.remove("active");
});

// ===== SEARCH =====
searchBarang.addEventListener("input", function () {
  const kw = this.value.toLowerCase();
  const filtered = kw
    ? allGlobalStok.filter(
        (b) =>
          b.nama.toLowerCase().includes(kw) ||
          b.kategori.toLowerCase().includes(kw) ||
          b.merk.toLowerCase().includes(kw) ||
          b.invoiceAsal.toLowerCase().includes(kw) ||
          b.lokasi.toLowerCase().includes(kw),
      )
    : allGlobalStok;
  renderStokList(filtered);
});

// ===== BUILD STOK LIST =====
function buildGlobalStokList() {
  const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
  allGlobalStok = [];
  Object.values(invoices).forEach((inv) => {
    if (!inv.items) return;
    inv.items.forEach((item) => {
      allGlobalStok.push({
        invoiceAsal: inv.invoice,
        nama: item.nama,
        kategori: item.kategori,
        merk: item.merk,
        lokasi: item.lokasi,
        stok: parseInt(item.stok) || 0,
      });
    });
  });
  renderStokList(allGlobalStok);
}

function renderStokList(list) {
  stokList.innerHTML = "";
  if (list.length === 0) {
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
        ? `Stok: ${barang.stok} (menipis)`
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

// ===== MODAL JUMLAH =====
function bukaModalJumlah(barang) {
  selectedBarang = barang;
  inputJumlah.value = 1;
  inputJumlah.max = barang.stok;
  errorMsgJumlah.textContent = "";
  barangPreview.innerHTML = `
    <strong>${barang.nama}</strong><br>
    Kategori: ${barang.kategori} &nbsp;|&nbsp; Merk: ${barang.merk}<br>
    Lokasi: ${barang.lokasi} &nbsp;|&nbsp; Invoice Asal: ${barang.invoiceAsal}
  `;
  stokInfo.textContent = `Stok tersedia: ${barang.stok} item`;
  modalOverlay.classList.remove("active");
  jumlahOverlay.classList.add("active");
}

document.getElementById("qtyMinus").addEventListener("click", () => {
  const val = parseInt(inputJumlah.value) || 1;
  if (val > 1) inputJumlah.value = val - 1;
});
document.getElementById("qtyPlus").addEventListener("click", () => {
  const val = parseInt(inputJumlah.value) || 1;
  if (selectedBarang && val < selectedBarang.stok) inputJumlah.value = val + 1;
});

document.getElementById("batalJumlahBtn").addEventListener("click", () => {
  jumlahOverlay.classList.remove("active");
  selectedBarang = null;
  modalOverlay.classList.add("active");
});
jumlahOverlay.addEventListener("click", (e) => {
  if (e.target === jumlahOverlay) {
    jumlahOverlay.classList.remove("active");
    selectedBarang = null;
  }
});

// ===== KONFIRMASI OUT =====
document.getElementById("konfirmasiOutBtn").addEventListener("click", () => {
  const jumlah = parseInt(inputJumlah.value);
  if (!jumlah || jumlah < 1) {
    errorMsgJumlah.textContent = "Jumlah harus minimal 1!";
    return;
  }
  if (jumlah > selectedBarang.stok) {
    errorMsgJumlah.textContent = `Melebihi stok tersedia (${selectedBarang.stok})!`;
    return;
  }

  kurangiStok(
    selectedBarang.invoiceAsal,
    selectedBarang.nama,
    selectedBarang.kategori,
    jumlah,
  );

  const item = {
    invoiceAsal: selectedBarang.invoiceAsal,
    nama: selectedBarang.nama,
    kategori: selectedBarang.kategori,
    merk: selectedBarang.merk,
    lokasi: selectedBarang.lokasi,
    jumlahKeluar: jumlah,
    sisaStok: selectedBarang.stok - jumlah,
  };

  const so = JSON.parse(localStorage.getItem("stockOuts") || "{}");
  if (!so[invoiceId].items) so[invoiceId].items = [];
  so[invoiceId].items.push(item);
  so[invoiceId].total = so[invoiceId].items.length;
  localStorage.setItem("stockOuts", JSON.stringify(so));

  // Update info total
  const infoTotal = document.getElementById("infoTotal");
  if (infoTotal) infoTotal.textContent = so[invoiceId].total;

  tambahBarisTabel(item);
  updateSummary();
  jumlahOverlay.classList.remove("active");
  selectedBarang = null;
});

function kurangiStok(invoiceAsal, namaBarang, kategori, jumlah) {
  const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
  if (!invoices[invoiceAsal]) return;
  const found = invoices[invoiceAsal].items.find(
    (i) => i.nama === namaBarang && i.kategori === kategori,
  );
  if (found) found.stok = Math.max(0, parseInt(found.stok) - jumlah);
  localStorage.setItem("invoices", JSON.stringify(invoices));
}

// ===== TAMBAH BARIS =====
function tambahBarisTabel(item) {
  const emptyRow = tableBody.querySelector(".empty-row");
  if (emptyRow) emptyRow.remove();
  rowCount++;
  const sisaClass = item.sisaStok <= 5 ? "stok-sisa-low" : "stok-sisa-ok";
  const tr = document.createElement("tr");
  tr.dataset.idx = rowCount - 1;
  tr.innerHTML = `
    <td>${rowCount}</td>
    <td>${item.nama}</td>
    <td><span class="badge badge-blue">${item.kategori}</span></td>
    <td>${item.merk}</td>
    <td>${item.lokasi}</td>
    <td><span class="badge badge-orange">${item.invoiceAsal}</span></td>
    <td><strong>${item.jumlahKeluar}</strong></td>
    <td class="${sisaClass}">${item.sisaStok}</td>
    <td><button class="btn-hapus"><i class="bx bx-undo"></i> Kembalikan</button></td>
  `;
  tr.querySelector(".btn-hapus").addEventListener("click", () => {
    rowToDelete = tr;
    confirmOverlay.classList.add("active");
  });
  tableBody.appendChild(tr);
}

// ===== KONFIRMASI KEMBALIKAN =====
document.getElementById("confirmYes").addEventListener("click", () => {
  if (!rowToDelete) return;
  const idx = parseInt(rowToDelete.dataset.idx);
  const so = JSON.parse(localStorage.getItem("stockOuts") || "{}");
  const items = so[invoiceId].items || [];
  const item = items[idx];

  if (item) {
    const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
    if (invoices[item.invoiceAsal]) {
      const found = invoices[item.invoiceAsal].items.find(
        (i) => i.nama === item.nama && i.kategori === item.kategori,
      );
      if (found)
        found.stok = parseInt(found.stok) + parseInt(item.jumlahKeluar);
      localStorage.setItem("invoices", JSON.stringify(invoices));
    }
    items.splice(idx, 1);
    so[invoiceId].items = items;
    so[invoiceId].total = items.length;
    localStorage.setItem("stockOuts", JSON.stringify(so));

    const infoTotal = document.getElementById("infoTotal");
    if (infoTotal) infoTotal.textContent = so[invoiceId].total;
  }

  rowToDelete.remove();
  reindexRows();
  updateSummary();
  rowToDelete = null;
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

function reindexRows() {
  const rows = tableBody.querySelectorAll("tr:not(.empty-row)");
  if (rows.length === 0) {
    const emptyTr = document.createElement("tr");
    emptyTr.className = "empty-row";
    emptyTr.innerHTML =
      '<td colspan="9">Belum ada barang — klik "Stock Out Barang" untuk memilih barang dari stok</td>';
    tableBody.appendChild(emptyTr);
    rowCount = 0;
  } else {
    rows.forEach((r, i) => {
      r.cells[0].textContent = i + 1;
      r.dataset.idx = i;
    });
    rowCount = rows.length;
  }
}

function updateSummary() {
  const so = JSON.parse(localStorage.getItem("stockOuts") || "{}");
  summaryTotal.textContent = so[invoiceId]?.total || 0;
}

// ===== INIT =====
function init() {
  const data = JSON.parse(localStorage.getItem("stockOuts") || "{}")[invoiceId];
  if (!data || !data.items || data.items.length === 0) return;
  const emptyRow = tableBody.querySelector(".empty-row");
  if (emptyRow) emptyRow.remove();
  data.items.forEach((item, i) => {
    rowCount++;
    const sisaClass = item.sisaStok <= 5 ? "stok-sisa-low" : "stok-sisa-ok";
    const tr = document.createElement("tr");
    tr.dataset.idx = i;
    tr.innerHTML = `
      <td>${rowCount}</td>
      <td>${item.nama}</td>
      <td><span class="badge badge-blue">${item.kategori}</span></td>
      <td>${item.merk}</td>
      <td>${item.lokasi}</td>
      <td><span class="badge badge-orange">${item.invoiceAsal}</span></td>
      <td><strong>${item.jumlahKeluar}</strong></td>
      <td class="${sisaClass}">${item.sisaStok}</td>
      <td><button class="btn-hapus"><i class="bx bx-undo"></i> Kembalikan</button></td>
    `;
    tr.querySelector(".btn-hapus").addEventListener("click", () => {
      rowToDelete = tr;
      confirmOverlay.classList.add("active");
    });
    tableBody.appendChild(tr);
  });
  updateSummary();
}

init();

/**
 * =====================================================================
 *  INVENZ — patch invoiceKeluar.js
 *  Tambahkan / ganti fungsi renderInvoiceInfo() dengan versi ini
 *  agar metode pembayaran tampil di info bar halaman detail invoice keluar.
 * =====================================================================
 */

/**
 * Ambil data invoice keluar dari localStorage berdasarkan ?id= di URL.
 * Fungsi ini sudah ada di invoiceKeluar.js — pastikan ia membaca
 * field paymentId & paymentNama yang kini ikut tersimpan.
 */
function getInvoiceFromURL() {
    const params = new URLSearchParams(window.location.search);
    const id     = params.get('id');
    const list   = JSON.parse(localStorage.getItem('invenz_stockouts') || '[]');
    return list.find(s => s.id === id) || null;
}

/**
 * Render info bar di bagian atas halaman invoiceKeluar.
 * GANTI / TAMBAHKAN fungsi ini ke invoiceKeluar.js.
 */
function renderInvoiceInfo(invoice) {
    const el = document.getElementById('invoiceInfo');
    if (!el || !invoice) return;

    // Nama bulan Indonesia
    function formatTanggal(dateStr) {
        if (!dateStr) return '—';
        const [y, m, d] = dateStr.split('-');
        const bln = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
        return `${parseInt(d)} ${bln[parseInt(m)-1]} ${y}`;
    }

    // Icon & warna badge metode bayar
    function paymentBadge(id, nama) {
        const map = {
            pay_default_cash : { icon: '💵', cls: 'pay-cash' },
            pay_default_qris : { icon: '📱', cls: 'pay-qris' },
        };
        const cfg = map[id] || { icon: '💰', cls: 'pay-other' };
        return `<span class="info-payment-badge ${cfg.cls}">${cfg.icon} ${nama || '—'}</span>`;
    }

    el.innerHTML = `
        <div class="info-item">
            <span class="info-label">Invoice</span>
            <span class="info-val"><strong>${invoice.invoice || '—'}</strong></span>
        </div>
        <div class="info-item">
            <span class="info-label">Tanggal</span>
            <span class="info-val">${formatTanggal(invoice.tanggal)}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Penerima</span>
            <span class="info-val">${invoice.penerima || '—'}</span>
        </div>
        <div class="info-item">
            <span class="info-label"><i class="bx bx-credit-card" style="vertical-align:-2px"></i> Metode Bayar</span>
            <span class="info-val">${paymentBadge(invoice.paymentId, invoice.paymentNama)}</span>
        </div>
    `;
}

/* ─────────────────────────────────────────────
   CSS TAMBAHAN — tambahkan ke css/invoiceKeluar.css
   ─────────────────────────────────────────────

.invoice-info {
    display: flex;
    flex-wrap: wrap;
    gap: 0;
    background: #f8faff;
    border-bottom: 1px solid #e5e7eb;
    padding: 0;
}
.info-item {
    display: flex;
    flex-direction: column;
    padding: 12px 20px;
    border-right: 1px solid #e5e7eb;
    min-width: 140px;
}
.info-item:last-child { border-right: none; }
.info-label {
    font-size: 11px;
    font-weight: 600;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: .5px;
    margin-bottom: 3px;
}
.info-val { font-size: 14px; color: #111827; }

/* Payment badge */
.info-payment-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
}
.pay-cash  { background: #dcfce7; color: #166534; }
.pay-qris  { background: #ede9fe; color: #5b21b6; }
.pay-other { background: #fef3c7; color: #92400e; }

───────────────────────────────────────────────── */