// ===== AUTH =====
if (!localStorage.getItem('isLoggedIn')) {
    window.location.href = 'login.html';
}
 
// ===== AMBIL ID INVOICE DARI URL =====
const params    = new URLSearchParams(window.location.search);
const invoiceId = params.get('id');
if (!invoiceId) window.location.href = 'stockOut.html';
 
// ===== HELPERS STORAGE =====
const SO_KEY = 'invenz_stockout';   // HARUS sama dengan stockOut.js
 
function getAllStockOut() {
    try { return JSON.parse(localStorage.getItem(SO_KEY)) || []; }
    catch { return []; }
}
function saveAllStockOut(list) {
    localStorage.setItem(SO_KEY, JSON.stringify(list));
}
function getThisInvoice() {
    return getAllStockOut().find(inv => inv.id === invoiceId) || null;
}
 
// ===== VALIDASI — redirect jika invoice tidak ada =====
const invoiceData = getThisInvoice();
if (!invoiceData) window.location.href = 'stockOut.html';
 
// ===== USER INFO =====
const loggedUser = localStorage.getItem('loggedUser') || 'Admin';
document.getElementById('sidebarUsername').textContent = loggedUser;
document.getElementById('sidebarAvatar').textContent   = loggedUser.charAt(0).toUpperCase();
 
// ===== SIDEBAR =====
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');
document.getElementById('hamburger')?.addEventListener('click', () => {
    sidebar.classList.add('open');
    overlay.classList.add('active');
});
document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
overlay.addEventListener('click', closeSidebar);
function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
}
 
// ===== LOGOUT =====
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('loggedUser');
    window.location.href = 'login.html';
});
 
// ===== BACK BUTTON =====
document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = 'stockOut.html';
});
 
// ===== FORMAT HELPERS =====
function fmtTgl(str) {
    if (!str) return '—';
    const d = new Date(str);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}
 
function paymentBadgeHTML(paymentId, paymentNama) {
    const iconMap = { default_cash: '💵', default_qris: '📱' };
    const clsMap  = { default_cash: 'pay-cash', default_qris: 'pay-qris' };
    const icon = iconMap[paymentId] || '💰';
    const cls  = clsMap[paymentId]  || 'pay-other';
    return `<span class="info-payment-badge ${cls}">${icon} ${paymentNama || '—'}</span>`;
}
 
// ===== RENDER INFO BAR =====
function renderInvoiceInfo() {
    const inv = getThisInvoice();
    const el  = document.getElementById('invoiceInfo');
    if (!el || !inv) return;
 
    el.innerHTML = `
        <div class="info-item">
            <span class="info-label">Invoice</span>
            <span class="info-val"><strong>${inv.id}</strong></span>
        </div>
        <div class="info-item">
            <span class="info-label">Tanggal</span>
            <span class="info-val">${fmtTgl(inv.tanggal)}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Penerima</span>
            <span class="info-val">${inv.penerima || '—'}</span>
        </div>
        <div class="info-item">
            <span class="info-label"><i class="bx bx-credit-card" style="vertical-align:-2px"></i> Metode Bayar</span>
            <span class="info-val">${paymentBadgeHTML(inv.paymentId, inv.paymentNama)}</span>
        </div>
    `;
 
    // Update judul navbar
    const navTitle = document.getElementById('navTitle');
    if (navTitle) navTitle.textContent = inv.id;
}
 
// ===== DOM REFS =====
const tableBody      = document.getElementById('tableBody');
const summaryTotal   = document.getElementById('summaryTotal');
const modalOverlay   = document.getElementById('modalOverlay');
const jumlahOverlay  = document.getElementById('jumlahOverlay');
const confirmOverlay = document.getElementById('confirmOverlay');
const stokList       = document.getElementById('stokList');
const searchBarang   = document.getElementById('searchBarang');
const inputJumlah    = document.getElementById('inputJumlah');
const barangPreview  = document.getElementById('barangPreview');
const stokInfo       = document.getElementById('stokInfo');
const errorMsgJumlah = document.getElementById('errorMsgJumlah');
 
let selectedBarang = null;
let rowToDelete    = null;
let allGlobalStok  = [];
let rowCount       = 0;
 
// ===== MODAL PILIH BARANG — BUKA =====
document.getElementById('btnAddItem').addEventListener('click', () => {
    buildGlobalStokList();
    searchBarang.value = '';
    modalOverlay.classList.add('active');
});
 
document.getElementById('batalBtn').addEventListener('click', () => {
    modalOverlay.classList.remove('active');
});
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) modalOverlay.classList.remove('active');
});
 
// ===== SEARCH =====
searchBarang.addEventListener('input', function () {
    const kw = this.value.toLowerCase();
    const filtered = kw
        ? allGlobalStok.filter(b =>
            b.nama.toLowerCase().includes(kw) ||
            b.kategori.toLowerCase().includes(kw) ||
            b.merk.toLowerCase().includes(kw) ||
            b.invoiceAsal.toLowerCase().includes(kw) ||
            b.lokasi.toLowerCase().includes(kw)
        )
        : allGlobalStok;
    renderStokList(filtered);
});
 
// ===== BUILD STOK LIST =====
function buildGlobalStokList() {
    // invoices disimpan sebagai object {invoiceId: {...}} oleh inputBarang.js
    const invoices = JSON.parse(localStorage.getItem('invoices') || '{}');
    allGlobalStok  = [];
    Object.values(invoices).forEach(inv => {
        if (!inv.items) return;
        inv.items.forEach(item => {
            allGlobalStok.push({
                invoiceAsal: inv.invoice,
                sku:         item.sku      || '',
                nama:        item.nama     || '—',
                kategori:    item.kategori || '—',
                merk:        item.merk     || '—',
                lokasi:      item.lokasi   || '—',
                stok:        parseInt(item.stok) || 0,
            });
        });
    });
    renderStokList(allGlobalStok);
}
 
function renderStokList(list) {
    stokList.innerHTML = '';
    if (!list.length) {
        stokList.innerHTML = `<div class="stok-empty-msg">Tidak ada barang yang ditemukan</div>`;
        return;
    }
    list.forEach(barang => {
        const isEmpty = barang.stok <= 0;
        const isLow   = barang.stok > 0 && barang.stok <= 5;
        const badgeClass = isEmpty ? 'stok-badge-empty' : isLow ? 'stok-badge-low' : 'stok-badge-ok';
        const badgeLabel = isEmpty ? 'Habis' : isLow ? `Stok: ${barang.stok} (menipis)` : `Stok: ${barang.stok}`;
 
        const div = document.createElement('div');
        div.className = 'stok-item';
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
                <button class="btn-pilih" ${isEmpty ? 'disabled' : ''}>Pilih</button>
            </div>
        `;
        if (!isEmpty) {
            div.querySelector('.btn-pilih').addEventListener('click', () => bukaModalJumlah(barang));
        }
        stokList.appendChild(div);
    });
}
 
// ===== MODAL JUMLAH =====
function bukaModalJumlah(barang) {
    selectedBarang       = barang;
    inputJumlah.value    = 1;
    inputJumlah.max      = barang.stok;
    errorMsgJumlah.textContent = '';
    barangPreview.innerHTML = `
        <strong>${barang.nama}</strong><br>
        Kategori: ${barang.kategori} &nbsp;|&nbsp; Merk: ${barang.merk}<br>
        Lokasi: ${barang.lokasi} &nbsp;|&nbsp; Invoice Asal: ${barang.invoiceAsal}
    `;
    stokInfo.textContent = `Stok tersedia: ${barang.stok} item`;
    modalOverlay.classList.remove('active');
    jumlahOverlay.classList.add('active');
}
 
document.getElementById('qtyMinus').addEventListener('click', () => {
    const val = parseInt(inputJumlah.value) || 1;
    if (val > 1) inputJumlah.value = val - 1;
});
document.getElementById('qtyPlus').addEventListener('click', () => {
    const val = parseInt(inputJumlah.value) || 1;
    if (selectedBarang && val < selectedBarang.stok) inputJumlah.value = val + 1;
});
 
document.getElementById('batalJumlahBtn').addEventListener('click', () => {
    jumlahOverlay.classList.remove('active');
    selectedBarang = null;
    modalOverlay.classList.add('active');
});
jumlahOverlay.addEventListener('click', (e) => {
    if (e.target === jumlahOverlay) {
        jumlahOverlay.classList.remove('active');
        selectedBarang = null;
    }
});
 
// ===== KONFIRMASI OUT =====
document.getElementById('konfirmasiOutBtn').addEventListener('click', () => {
    const jumlah = parseInt(inputJumlah.value);
    if (!jumlah || jumlah < 1) {
        errorMsgJumlah.textContent = 'Jumlah harus minimal 1!';
        return;
    }
    if (jumlah > selectedBarang.stok) {
        errorMsgJumlah.textContent = `Melebihi stok tersedia (${selectedBarang.stok})!`;
        return;
    }
 
    // Kurangi stok di invoices
    kurangiStok(selectedBarang.invoiceAsal, selectedBarang.nama, selectedBarang.kategori, jumlah);
 
    const item = {
        sku:         selectedBarang.sku,
        invoiceAsal: selectedBarang.invoiceAsal,
        nama:        selectedBarang.nama,
        kategori:    selectedBarang.kategori,
        merk:        selectedBarang.merk,
        lokasi:      selectedBarang.lokasi,
        jumlah:      jumlah,                            // field nama: jumlah (konsisten stockOut.js)
        jumlahKeluar: jumlah,                           // compat lama
        sisaStok:    selectedBarang.stok - jumlah,
    };
 
    // Simpan ke invenz_stockout (array) — format yang dipakai stockOut.js
    const list = getAllStockOut();
    const idx  = list.findIndex(inv => inv.id === invoiceId);
    if (idx === -1) { window.location.href = 'stockOut.html'; return; }
    if (!list[idx].items) list[idx].items = [];
    list[idx].items.push(item);
    saveAllStockOut(list);
 
    tambahBarisTabel(item);
    updateSummary();
    jumlahOverlay.classList.remove('active');
    selectedBarang = null;
});
 
// ===== KURANGI STOK DI invoices =====
function kurangiStok(invoiceAsal, namaBarang, kategori, jumlah) {
    try {
        const invoices = JSON.parse(localStorage.getItem('invoices') || '{}');
        if (!invoices[invoiceAsal]) return;
        const found = invoices[invoiceAsal].items.find(
            i => i.nama === namaBarang && i.kategori === kategori
        );
        if (found) found.stok = Math.max(0, parseInt(found.stok) - jumlah);
        localStorage.setItem('invoices', JSON.stringify(invoices));
    } catch (e) {
        console.warn('Gagal kurangi stok:', e);
    }
}
 
// ===== TAMBAH BARIS TABEL =====
function tambahBarisTabel(item) {
    const emptyRow = tableBody.querySelector('.empty-row');
    if (emptyRow) emptyRow.remove();
    rowCount++;
    const sisaClass = item.sisaStok <= 5 ? 'stok-sisa-low' : 'stok-sisa-ok';
    const tr = document.createElement('tr');
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
    tr.querySelector('.btn-hapus').addEventListener('click', () => {
        rowToDelete = tr;
        confirmOverlay.classList.add('active');
    });
    tableBody.appendChild(tr);
}
 
// ===== KONFIRMASI KEMBALIKAN =====
document.getElementById('confirmYes').addEventListener('click', () => {
    if (!rowToDelete) return;
    const idx   = parseInt(rowToDelete.dataset.idx);
    const list  = getAllStockOut();
    const invIdx = list.findIndex(inv => inv.id === invoiceId);
    if (invIdx === -1) return;
 
    const items = list[invIdx].items || [];
    const item  = items[idx];
 
    if (item) {
        // Kembalikan stok
        try {
            const invoices = JSON.parse(localStorage.getItem('invoices') || '{}');
            if (invoices[item.invoiceAsal]) {
                const found = invoices[item.invoiceAsal].items.find(
                    i => i.nama === item.nama && i.kategori === item.kategori
                );
                if (found) found.stok = parseInt(found.stok) + parseInt(item.jumlahKeluar || item.jumlah || 0);
                localStorage.setItem('invoices', JSON.stringify(invoices));
            }
        } catch (e) { console.warn('Gagal kembalikan stok:', e); }
 
        items.splice(idx, 1);
        list[invIdx].items = items;
        saveAllStockOut(list);
    }
 
    rowToDelete.remove();
    reindexRows();
    updateSummary();
    rowToDelete = null;
    confirmOverlay.classList.remove('active');
});
 
document.getElementById('confirmNo').addEventListener('click', () => {
    rowToDelete = null;
    confirmOverlay.classList.remove('active');
});
confirmOverlay.addEventListener('click', (e) => {
    if (e.target === confirmOverlay) {
        rowToDelete = null;
        confirmOverlay.classList.remove('active');
    }
});
 
// ===== REINDEX ROWS =====
function reindexRows() {
    const rows = tableBody.querySelectorAll('tr:not(.empty-row)');
    if (!rows.length) {
        const emptyTr = document.createElement('tr');
        emptyTr.className = 'empty-row';
        emptyTr.innerHTML = '<td colspan="9">Belum ada barang — klik "Stock Out Barang" untuk memilih barang dari stok</td>';
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
 
// ===== UPDATE SUMMARY =====
function updateSummary() {
    const inv = getThisInvoice();
    const total = (inv?.items || []).reduce((s, it) => s + (it.jumlah || it.jumlahKeluar || 0), 0);
    if (summaryTotal) summaryTotal.textContent = total;
}
 
// ===== INIT — load existing items =====
function init() {
    renderInvoiceInfo();
 
    const inv = getThisInvoice();
    if (!inv || !inv.items || !inv.items.length) return;
 
    const emptyRow = tableBody.querySelector('.empty-row');
    if (emptyRow) emptyRow.remove();
 
    inv.items.forEach((item, i) => {
        rowCount++;
        const sisaClass = item.sisaStok <= 5 ? 'stok-sisa-low' : 'stok-sisa-ok';
        const tr = document.createElement('tr');
        tr.dataset.idx = i;
        tr.innerHTML = `
            <td>${rowCount}</td>
            <td>${item.nama}</td>
            <td><span class="badge badge-blue">${item.kategori}</span></td>
            <td>${item.merk}</td>
            <td>${item.lokasi}</td>
            <td><span class="badge badge-orange">${item.invoiceAsal}</span></td>
            <td><strong>${item.jumlahKeluar || item.jumlah}</strong></td>
            <td class="${sisaClass}">${item.sisaStok}</td>
            <td><button class="btn-hapus"><i class="bx bx-undo"></i> Kembalikan</button></td>
        `;
        tr.querySelector('.btn-hapus').addEventListener('click', () => {
            rowToDelete = tr;
            confirmOverlay.classList.add('active');
        });
        tableBody.appendChild(tr);
    });
 
    updateSummary();
}
 
init();
