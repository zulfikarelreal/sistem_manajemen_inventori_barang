/**
 * =====================================================================
 *  INVENZ — js/stockOut.js
 *  Versi: dengan integrasi Metode Pembayaran (Payment)
 * =====================================================================
 *
 *  Dependensi localStorage:
 *    invenz_stockouts        — daftar invoice keluar
 *    invenz_payment_methods  — master payment dari linkedData
 *    invenz_linked_penerima  — master penerima dari linkedData
 *    invenz_global_stok      — stok barang (dibaca invoiceKeluar.js)
 * =====================================================================
 */

'use strict';

/* ─────────────────────────────────────────────
   STORAGE KEYS
   ───────────────────────────────────────────── */
const STOCKOUT_KEY  = 'invenz_stockouts';
const PAYMENT_KEY   = 'invenz_payment_methods';
const PENERIMA_KEY  = 'invenz_linked_penerima'; // sesuaikan dengan key di linkedData.js

/* ─────────────────────────────────────────────
   DEFAULT PAYMENT (fallback jika belum ada data)
   ───────────────────────────────────────────── */
const DEFAULT_PAYMENTS = [
    { id: 'pay_default_cash', nama: 'Cash',  aktif: true, isDefault: true },
    { id: 'pay_default_qris', nama: 'QRIS',  aktif: true, isDefault: true }
];

/* ─────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────── */
function loadStockOuts() {
    try { return JSON.parse(localStorage.getItem(STOCKOUT_KEY) || '[]'); } catch { return []; }
}
function saveStockOuts(list) {
    localStorage.setItem(STOCKOUT_KEY, JSON.stringify(list));
}
function loadPayments() {
    try {
        const raw = localStorage.getItem(PAYMENT_KEY);
        return raw ? JSON.parse(raw) : DEFAULT_PAYMENTS;
    } catch { return DEFAULT_PAYMENTS; }
}
function getActivePayments() {
    return loadPayments().filter(p => p.aktif);
}
function loadPenerima() {
    try { return JSON.parse(localStorage.getItem(PENERIMA_KEY) || '[]'); } catch { return []; }
}
function formatDate(dateStr) {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    const bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    return `${parseInt(d)} ${bulan[parseInt(m) - 1]} ${y}`;
}

/* ─────────────────────────────────────────────
   STATE
   ───────────────────────────────────────────── */
let pendingDeleteId = null;

/* ─────────────────────────────────────────────
   RENDER TABEL STOCK OUT
   ───────────────────────────────────────────── */
function renderTable() {
    const tbody   = document.getElementById('tableBody');
    const list    = loadStockOuts();

    if (!list.length) {
        tbody.innerHTML = `<tr class="empty-row">
            <td colspan="7">Belum ada data — klik "Stock Out" untuk membuat invoice keluar</td>
        </tr>`;
        return;
    }

    tbody.innerHTML = list.map((so, i) => {
        const totalItem = (so.items || []).reduce((s, it) => s + (it.jumlah || 0), 0);
        const paymentNama = so.paymentNama || '—';

        // Badge warna per metode
        const badgeClass = getBadgeClass(so.paymentId);

        return `<tr class="invoice-row" data-id="${so.id}" style="cursor:pointer">
            <td>${i + 1}</td>
            <td><strong>${so.invoice}</strong></td>
            <td>${formatDate(so.tanggal)}</td>
            <td>${so.penerima || '—'}</td>
            <td><span class="payment-chip ${badgeClass}">${paymentNama}</span></td>
            <td>${totalItem} item</td>
            <td class="actions-cell" onclick="event.stopPropagation()">
                <button class="btn-action btn-delete" onclick="confirmDelete('${so.id}')" title="Hapus">
                    <i class="bx bx-trash"></i>
                </button>
            </td>
        </tr>`;
    }).join('');

    // Klik baris → buka invoiceKeluar
    tbody.querySelectorAll('.invoice-row').forEach(row => {
        row.addEventListener('click', function() {
            const id = this.dataset.id;
            window.location.href = `invoiceKeluar.html?id=${id}`;
        });
    });
}

function getBadgeClass(paymentId) {
    if (!paymentId) return 'chip-default';
    if (paymentId === 'pay_default_cash') return 'chip-cash';
    if (paymentId === 'pay_default_qris') return 'chip-qris';
    return 'chip-other';
}

/* ─────────────────────────────────────────────
   RENDER PAYMENT OPTIONS (radio pill di modal)
   ───────────────────────────────────────────── */
function renderPaymentOptions() {
    const container  = document.getElementById('paymentOptions');
    const emptyHint  = document.getElementById('paymentEmptyHint');
    const payments   = getActivePayments();

    if (!payments.length) {
        container.innerHTML  = '';
        if (emptyHint) emptyHint.style.display = 'flex';
        return;
    }

    if (emptyHint) emptyHint.style.display = 'none';

    container.innerHTML = payments.map((p, i) => `
        <label class="payment-pill ${i === 0 ? 'selected' : ''}" for="pay_${p.id}">
            <input
                type="radio"
                name="paymentMethod"
                id="pay_${p.id}"
                value="${p.id}"
                data-nama="${p.nama}"
                ${i === 0 ? 'checked' : ''}
            >
            <span class="pill-icon">${getPaymentIcon(p.id, p.nama)}</span>
            <span class="pill-label">${p.nama}</span>
        </label>
    `).join('');

    // Update selected style on change
    container.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', () => {
            container.querySelectorAll('.payment-pill').forEach(lbl => lbl.classList.remove('selected'));
            radio.closest('.payment-pill').classList.add('selected');
        });
    });
}

function getPaymentIcon(id, nama) {
    const n = nama.toLowerCase();
    if (id === 'pay_default_cash'  || n === 'cash')   return '💵';
    if (id === 'pay_default_qris'  || n === 'qris')   return '📱';
    if (n.includes('transfer') || n.includes('bank')) return '🏦';
    if (n.includes('debit') || n.includes('kartu'))   return '💳';
    if (n.includes('gopay') || n.includes('ovo') || n.includes('dana')) return '📲';
    return '💰';
}

/* ─────────────────────────────────────────────
   BUKA / TUTUP MODAL
   ───────────────────────────────────────────── */
function openModal() {
    // Reset form
    document.getElementById('inputInvoice').value = '';
    document.getElementById('inputTanggal').value  = '';
    document.getElementById('inputPenerima').value = '';
    document.getElementById('errorMsg').textContent = '';

    // Set tanggal hari ini sebagai default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('inputTanggal').value = today;

    // Populate payment pills
    renderPaymentOptions();

    // Populate penerima dropdown (custom dropdown)
    if (typeof populatePenerimaDropdown === 'function') {
        populatePenerimaDropdown();
    } else {
        // Fallback: isi manual jika customDropdown.js belum handle
        _populatePenerimaFallback();
    }

    document.getElementById('modalOverlay').classList.add('active');
    setTimeout(() => document.getElementById('inputInvoice').focus(), 100);
}

function _populatePenerimaFallback() {
    // Isi cd-list untuk custom dropdown penerima
    const list   = loadPenerima();
    const cdList = document.querySelector('#cdPenerima .cd-list');
    if (!cdList) return;
    cdList.innerHTML = list.map(p =>
        `<li data-value="${p.nama || p}">${p.nama || p}</li>`
    ).join('');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

/* ─────────────────────────────────────────────
   SIMPAN INVOICE KELUAR BARU
   ───────────────────────────────────────────── */
function simpanInvoice() {
    const invoice   = document.getElementById('inputInvoice').value.trim();
    const tanggal   = document.getElementById('inputTanggal').value;
    const penerima  = document.getElementById('inputPenerima').value.trim();
    const errEl     = document.getElementById('errorMsg');

    // Ambil payment yang dipilih
    const paymentRadio = document.querySelector('input[name="paymentMethod"]:checked');

    errEl.textContent = '';

    if (!invoice)  { errEl.textContent = 'No. Invoice tidak boleh kosong.'; return; }
    if (!tanggal)  { errEl.textContent = 'Tanggal keluar harus diisi.'; return; }
    if (!penerima) { errEl.textContent = 'Penerima / tujuan harus diisi.'; return; }
    if (!paymentRadio) { errEl.textContent = 'Pilih metode pembayaran.'; return; }

    // Cek duplikat invoice
    const existing = loadStockOuts();
    if (existing.find(s => s.invoice.toLowerCase() === invoice.toLowerCase())) {
        errEl.textContent = 'No. Invoice ini sudah ada.';
        return;
    }

    const newSO = {
        id         : 'so_' + Date.now(),
        invoice,
        tanggal,
        penerima,
        paymentId  : paymentRadio.value,
        paymentNama: paymentRadio.dataset.nama,
        items      : [],
        createdAt  : new Date().toISOString()
    };

    existing.push(newSO);
    saveStockOuts(existing);
    closeModal();
    renderTable();

    // Langsung navigasi ke halaman detail invoice keluar
    window.location.href = `invoiceKeluar.html?id=${newSO.id}`;
}

/* ─────────────────────────────────────────────
   HAPUS INVOICE
   ───────────────────────────────────────────── */
function confirmDelete(id) {
    pendingDeleteId = id;
    document.getElementById('confirmOverlay').classList.add('active');
}

function executeDelete() {
    if (!pendingDeleteId) return;

    let list = loadStockOuts();
    const so = list.find(s => s.id === pendingDeleteId);

    // Kembalikan stok jika ada items
    if (so && so.items && so.items.length) {
        _kembalikanStok(so.items);
    }

    list = list.filter(s => s.id !== pendingDeleteId);
    saveStockOuts(list);
    pendingDeleteId = null;
    document.getElementById('confirmOverlay').classList.remove('active');
    renderTable();
}

function _kembalikanStok(items) {
    // Baca stok global dan kembalikan qty
    const STOK_KEY = 'invenz_global_stok'; // sesuaikan dengan key di globalStok.js
    try {
        let stok = JSON.parse(localStorage.getItem(STOK_KEY) || '[]');
        items.forEach(item => {
            const idx = stok.findIndex(s => s.sku === item.sku && s.invoiceAsal === item.invoiceAsal);
            if (idx !== -1) {
                stok[idx].qty = (stok[idx].qty || 0) + (item.jumlah || 0);
            }
        });
        localStorage.setItem(STOK_KEY, JSON.stringify(stok));
    } catch (e) {
        console.warn('Gagal kembalikan stok:', e);
    }
}

/* ─────────────────────────────────────────────
   BIND EVENTS & INIT
   ───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

    // Tombol buka modal
    document.getElementById('openModalBtn')
        .addEventListener('click', openModal);

    // Tutup modal (X)
    const closeX = document.getElementById('modalCloseX');
    if (closeX) closeX.addEventListener('click', closeModal);

    // Batal
    document.getElementById('batalBtn')
        .addEventListener('click', closeModal);

    // Klik overlay tutup
    document.getElementById('modalOverlay')
        .addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });

    // Simpan
    document.getElementById('simpanBtn')
        .addEventListener('click', simpanInvoice);

    // Enter di field invoice
    document.getElementById('inputInvoice')
        .addEventListener('keydown', e => { if (e.key === 'Enter') simpanInvoice(); });

    // Konfirmasi hapus
    document.getElementById('confirmYes')
        .addEventListener('click', executeDelete);
    document.getElementById('confirmNo')
        .addEventListener('click', () => {
            pendingDeleteId = null;
            document.getElementById('confirmOverlay').classList.remove('active');
        });

    // Sidebar / auth (sudah di auth.js)
    renderTable();
});

/* ─────────────────────────────────────────────
   CSS TAMBAHAN — tambahkan ke css/stockOut.css
   ─────────────────────────────────────────────

.modal-top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
}
.modal-top-bar h3 { font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.modal-close-x {
    background: none; border: none; cursor: pointer;
    font-size: 22px; color: #6b7280; padding: 2px;
}
.modal-close-x:hover { color: #111; }

.form-row { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
.form-row label { font-size: 13px; font-weight: 500; color: #374151; }
.form-row input[type="text"],
.form-row input[type="date"] {
    padding: 9px 12px; border: 1px solid #d1d5db; border-radius: 8px;
    font-family: inherit; font-size: 14px; outline: none; transition: border .2s;
}
.form-row input:focus { border-color: rgb(16,44,168); box-shadow: 0 0 0 3px rgba(16,44,168,.08); }

.req { color: #dc2626; }

/* ── Payment Pills ── */
.payment-options {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 4px;
}
.payment-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border: 1.5px solid #e5e7eb;
    border-radius: 30px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    color: #374151;
    background: #f9fafb;
    transition: all .18s;
    user-select: none;
}
.payment-pill input[type="radio"] { display: none; }
.payment-pill:hover { border-color: rgb(16,44,168); background: #eff4ff; }
.payment-pill.selected {
    border-color: rgb(16,44,168);
    background: rgb(16,44,168);
    color: #fff;
}
.pill-icon { font-size: 16px; line-height: 1; }
.payment-empty-hint {
    display: flex; align-items: center; gap: 6px;
    font-size: 12px; color: #6b7280; margin-top: 6px;
}
.payment-empty-hint a { color: rgb(16,44,168); }

/* ── Payment chip di tabel ── */
.payment-chip {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
}
.chip-cash    { background: #dcfce7; color: #166534; }
.chip-qris    { background: #ede9fe; color: #5b21b6; }
.chip-other   { background: #fef3c7; color: #92400e; }
.chip-default { background: #f3f4f6; color: #6b7280; }

───────────────────────────────────────────────── */