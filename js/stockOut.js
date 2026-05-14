

const SO_KEY = 'invenz_stockout';   // daftar invoice keluar
// Data stok barang dibaca dari: invenz_invoices (dikelola inputBarang.js)

// ════════════════════════════════════════════════════════════
//  HELPERS STORAGE
// ════════════════════════════════════════════════════════════
function getInvoiceKeluar() {
    try { return JSON.parse(localStorage.getItem(SO_KEY)) || []; }
    catch { return []; }
}
function simpanInvoiceKeluar(list) {
    localStorage.setItem(SO_KEY, JSON.stringify(list));
}

// Ambil payment aktif — pakai API dari linkedData_payment.js kalau tersedia
function getPaymentAktif() {
    if (window.InvenzPayment) return window.InvenzPayment.getAktif();
    // Fallback: baca langsung dari localStorage
    const PAYMENT_KEY = 'invenz_payment';
    const defaults = [
        { id: 'default_cash', nama: 'Cash',  keterangan: 'Pembayaran tunai', aktif: true },
        { id: 'default_qris', nama: 'QRIS',  keterangan: 'QR Code Indonesian Standard', aktif: true },
    ];
    try {
        const custom = JSON.parse(localStorage.getItem(PAYMENT_KEY)) || [];
        return [...defaults, ...custom.filter(p => !p.isDefault)].filter(p => p.aktif);
    } catch { return defaults; }
}

// Format Rupiah
function fmtRp(n) {
    return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

// Format tanggal → "12 Mei 2025"
function fmtTgl(str) {
    if (!str) return '—';
    const d = new Date(str);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ════════════════════════════════════════════════════════════
//  RENDER TABEL UTAMA STOCK OUT
// ════════════════════════════════════════════════════════════
function renderTabelStockOut() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    const list = getInvoiceKeluar();

    if (!list.length) {
        tbody.innerHTML = `<tr class="empty-row">
            <td colspan="7">Belum ada data — klik "Stock Out" untuk membuat invoice keluar</td>
        </tr>`;
        return;
    }

    // Urutkan terbaru di atas
    const sorted = [...list].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    tbody.innerHTML = sorted.map((inv, i) => {
        const totalItem = (inv.items || []).reduce((s, it) => s + (it.jumlah || 0), 0);
        return `<tr class="inv-row" data-id="${inv.id}" style="cursor:pointer">
            <td>${i + 1}</td>
            <td><strong>${inv.id}</strong></td>
            <td>${fmtTgl(inv.tanggal)}</td>
            <td>${inv.penerima || '—'}</td>
            <td>
                <span class="badge-payment">${inv.paymentNama || '—'}</span>
            </td>
            <td>${totalItem} item</td>
            <td onclick="event.stopPropagation()">
                <div class="action-btns">
                    <button class="btn-action btn-view" data-id="${inv.id}" title="Lihat Detail">
                        <i class="bx bx-show"></i>
                    </button>
                    <button class="btn-action btn-del" data-id="${inv.id}" title="Hapus">
                        <i class="bx bx-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');

    // Klik baris → ke halaman detail
    tbody.querySelectorAll('.inv-row').forEach(row => {
        row.addEventListener('click', () => {
            window.location.href = `invoiceKeluar.html?id=${row.dataset.id}`;
        });
    });

    // Tombol lihat
    tbody.querySelectorAll('.btn-view[data-id]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.href = `invoiceKeluar.html?id=${btn.dataset.id}`;
        });
    });

    // Tombol hapus
    tbody.querySelectorAll('.btn-del[data-id]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            confirmHapus(btn.dataset.id);
        });
    });
}

// ════════════════════════════════════════════════════════════
//  MODAL BUAT INVOICE KELUAR — OPEN / CLOSE
// ════════════════════════════════════════════════════════════
function bukaModal() {
    const overlay = document.getElementById('modalOverlay');
    if (!overlay) return;

    // Reset field
    const inputInv  = document.getElementById('inputInvoice');
    const inputTgl  = document.getElementById('inputTanggal');
    const inputPen  = document.getElementById('inputPenerima');
    const errMsg    = document.getElementById('errorMsg');

    if (inputInv)  inputInv.value  = '';
    if (inputTgl)  inputTgl.value  = new Date().toISOString().split('T')[0];
    if (inputPen)  inputPen.value  = '';
    if (errMsg)    errMsg.textContent = '';

    // Reset pilihan payment
    resetPilihanPayment();

    // Populate payment options
    renderPaymentOptions();

    // Populate penerima dropdown (dari linkedData)
    isiDropdownPenerima();

    overlay.classList.add('active');
    setTimeout(() => inputInv?.focus(), 80);
}

function tutupModal() {
    document.getElementById('modalOverlay')?.classList.remove('active');
}

// ════════════════════════════════════════════════════════════
//  PAYMENT OPTIONS — render pill/chip di dalam modal
// ════════════════════════════════════════════════════════════
let _selectedPayment = null; // { id, nama }

function renderPaymentOptions() {
    const container = document.getElementById('paymentOptions');
    const emptyHint = document.getElementById('paymentEmptyHint');
    if (!container) return;

    const methods = getPaymentAktif();

    if (!methods.length) {
        container.innerHTML = '';
        if (emptyHint) emptyHint.style.display = 'flex';
        return;
    }
    if (emptyHint) emptyHint.style.display = 'none';

    container.innerHTML = methods.map(m => `
        <button type="button" class="payment-chip" data-id="${m.id}" data-nama="${m.nama}">
            ${m.nama === 'Cash'  ? '<i class="bx bx-money"></i>' : ''}
            ${m.nama === 'QRIS'  ? '<i class="bx bx-qr"></i>' : ''}
            ${m.nama !== 'Cash' && m.nama !== 'QRIS' ? '<i class="bx bx-credit-card"></i>' : ''}
            ${m.nama}
        </button>
    `).join('');

    // Pilih Cash secara default jika ada
    const cashChip = container.querySelector('[data-nama="Cash"]');
    if (cashChip) pilihPaymentChip(cashChip);

    // Bind klik
    container.querySelectorAll('.payment-chip').forEach(chip => {
        chip.addEventListener('click', () => pilihPaymentChip(chip));
    });
}

function pilihPaymentChip(chip) {
    document.querySelectorAll('#paymentOptions .payment-chip')
        .forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected');
    _selectedPayment = { id: chip.dataset.id, nama: chip.dataset.nama };
}

function resetPilihanPayment() {
    _selectedPayment = null;
    document.querySelectorAll('#paymentOptions .payment-chip')
        .forEach(c => c.classList.remove('selected'));
}

// ════════════════════════════════════════════════════════════
//  ISI DROPDOWN PENERIMA (dari linkedData)
// ════════════════════════════════════════════════════════════
function isiDropdownPenerima() {
    try {
        const linkedData = JSON.parse(localStorage.getItem('linkedData')) || {};
        const penerima   = linkedData.penerima || [];
        const cdList     = document.querySelector('#cdPenerima .cd-list');
        const cdEmpty    = document.querySelector('#cdPenerima .cd-empty');
        if (!cdList) return;

        if (!penerima.length) {
            cdList.innerHTML = '';
            if (cdEmpty) cdEmpty.style.display = 'block';
            return;
        }
        if (cdEmpty) cdEmpty.style.display = 'none';

        cdList.innerHTML = penerima.map(p =>
            `<li data-value="${p.nama || p}">${p.nama || p}</li>`
        ).join('');

        const inputPen = document.getElementById('inputPenerima');
        cdList.querySelectorAll('li').forEach(li => {
            li.addEventListener('click', () => {
                if (inputPen) inputPen.value = li.dataset.value;
                document.querySelector('#cdPenerima .cd-dropdown')?.classList.remove('open');
            });
        });
    } catch (e) {
        console.warn('Gagal load penerima:', e);
    }
}

// ════════════════════════════════════════════════════════════
//  SIMPAN INVOICE KELUAR
// ════════════════════════════════════════════════════════════
function simpanStockOut() {
    const inputInv = document.getElementById('inputInvoice');
    const inputTgl = document.getElementById('inputTanggal');
    const inputPen = document.getElementById('inputPenerima');
    const errMsg   = document.getElementById('errorMsg');

    const idInvoice = inputInv?.value.trim();
    const tanggal   = inputTgl?.value;
    const penerima  = inputPen?.value.trim();

    // Validasi
    if (!idInvoice) {
        errMsg.textContent = 'No. invoice tidak boleh kosong.';
        inputInv?.focus();
        return;
    }
    if (!tanggal) {
        errMsg.textContent = 'Tanggal keluar wajib diisi.';
        inputTgl?.focus();
        return;
    }
    if (!penerima) {
        errMsg.textContent = 'Penerima wajib diisi.';
        inputPen?.focus();
        return;
    }
    if (!_selectedPayment) {
        errMsg.textContent = 'Pilih metode pembayaran terlebih dahulu.';
        return;
    }

    const list = getInvoiceKeluar();

    // Cek duplikat ID invoice
    if (list.some(inv => inv.id === idInvoice)) {
        errMsg.textContent = `Invoice "${idInvoice}" sudah ada.`;
        inputInv?.focus();
        return;
    }

    const newInvoice = {
        id:          idInvoice,
        tanggal:     tanggal,
        penerima:    penerima,
        paymentId:   _selectedPayment.id,
        paymentNama: _selectedPayment.nama,
        items:       [],
        createdAt:   new Date().toISOString(),
    };

    list.push(newInvoice);
    simpanInvoiceKeluar(list);
    renderTabelStockOut();
    tutupModal();

    // Langsung buka halaman detail invoice keluar
    window.location.href = `invoiceKeluar.html?id=${idInvoice}`;
}

// ════════════════════════════════════════════════════════════
//  HAPUS INVOICE KELUAR
// ════════════════════════════════════════════════════════════
let _hapusId = null;

function confirmHapus(id) {
    _hapusId = id;
    const overlay = document.getElementById('confirmOverlay');
    overlay?.classList.add('active');
}

function eksekusiHapus() {
    if (!_hapusId) return;

    const list  = getInvoiceKeluar();
    const inv   = list.find(i => i.id === _hapusId);

    if (inv && inv.items?.length) {
        // Kembalikan stok
        kembalikanStok(inv.items);
    }

    const baru = list.filter(i => i.id !== _hapusId);
    simpanInvoiceKeluar(baru);
    renderTabelStockOut();
    tutupConfirmSO();
    _hapusId = null;
}

function tutupConfirmSO() {
    document.getElementById('confirmOverlay')?.classList.remove('active');
}

// Kembalikan stok ke invenz_invoices saat invoice keluar dihapus
function kembalikanStok(items) {
    try {
        const invoices = JSON.parse(localStorage.getItem('invenz_invoices')) || [];
        items.forEach(item => {
            // Cari barang berdasarkan SKU di semua invoice masuk
            for (const inv of invoices) {
                const barang = (inv.items || []).find(b => b.sku === item.sku);
                if (barang) {
                    barang.stok = (barang.stok || 0) + (item.jumlah || 0);
                    break;
                }
            }
        });
        localStorage.setItem('invenz_invoices', JSON.stringify(invoices));
    } catch (e) {
        console.warn('Gagal kembalikan stok:', e);
    }
}

// ════════════════════════════════════════════════════════════
//  AUTH CHECK
// ════════════════════════════════════════════════════════════
function cekAuth() {
    if (!localStorage.getItem('isLoggedIn')) {
        window.location.href = 'login.html';
    }
    // Isi nama user di sidebar
    const user = localStorage.getItem('loggedUser') || 'Admin';
    const avatar = user.charAt(0).toUpperCase();
    document.querySelectorAll('#sidebarUsername').forEach(el => el.textContent = user);
    document.querySelectorAll('#sidebarAvatar').forEach(el => el.textContent = avatar);
}

// ════════════════════════════════════════════════════════════
//  SIDEBAR & HAMBURGER
// ════════════════════════════════════════════════════════════
function initSidebar() {
    const sidebar        = document.getElementById('sidebar');
    const overlay        = document.getElementById('sidebarOverlay');
    const hamburger      = document.getElementById('hamburger');
    const closeBtn       = document.getElementById('sidebarClose');
    const logoutBtn      = document.getElementById('logoutBtn');

    hamburger?.addEventListener('click', () => {
        sidebar?.classList.add('open');
        overlay?.classList.add('active');
    });
    closeBtn?.addEventListener('click', () => {
        sidebar?.classList.remove('open');
        overlay?.classList.remove('active');
    });
    overlay?.addEventListener('click', () => {
        sidebar?.classList.remove('open');
        overlay?.classList.remove('active');
    });
    logoutBtn?.addEventListener('click', () => {
        localStorage.removeItem('isLoggedIn');
        window.location.href = 'login.html';
    });
}

// ════════════════════════════════════════════════════════════
//  INIT UTAMA
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    cekAuth();
    initSidebar();
    renderTabelStockOut();

    // Tombol buka modal
    document.getElementById('openModalBtn')
        ?.addEventListener('click', bukaModal);

    // Tombol tutup modal
    document.getElementById('modalCloseX')
        ?.addEventListener('click', tutupModal);
    document.getElementById('batalBtn')
        ?.addEventListener('click', tutupModal);

    // Klik luar modal
    document.getElementById('modalOverlay')
        ?.addEventListener('click', function (e) {
            if (e.target === this) tutupModal();
        });

    // Simpan
    document.getElementById('simpanBtn')
        ?.addEventListener('click', simpanStockOut);

    // Enter di input invoice
    document.getElementById('inputInvoice')
        ?.addEventListener('keydown', e => { if (e.key === 'Enter') simpanStockOut(); });

    // Konfirmasi hapus
    document.getElementById('confirmYes')
        ?.addEventListener('click', eksekusiHapus);
    document.getElementById('confirmNo')
        ?.addEventListener('click', tutupConfirmSO);
});

