

const PAYMENT_KEY = 'invenz_payment';

const DEFAULT_PAYMENTS = [
    { id: 'default_cash', nama: 'Cash',  keterangan: 'Pembayaran tunai', aktif: true, isDefault: true },
    { id: 'default_qris', nama: 'QRIS',  keterangan: 'QR Code Indonesian Standard', aktif: true, isDefault: true },
];

// ── Helper escape HTML ──────────────────────────────────────
function escP(str) {
    return String(str || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Ambil semua payment (default + custom) ──────────────────
function getPayments() {
    try {
        const raw = localStorage.getItem(PAYMENT_KEY);
        const custom = raw ? JSON.parse(raw) : [];
        return [...DEFAULT_PAYMENTS, ...custom.filter(p => !p.isDefault)];
    } catch {
        return [...DEFAULT_PAYMENTS];
    }
}

// ── Simpan (hanya yang custom) ──────────────────────────────
function savePaymentsToStorage(list) {
    const custom = list.filter(p => !p.isDefault);
    localStorage.setItem(PAYMENT_KEY, JSON.stringify(custom));
}

function genId() {
    return 'pay_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
}

// ════════════════════════════════════════════════════════════
//  RENDER TABEL PAYMENT
// ════════════════════════════════════════════════════════════
function renderPaymentTable() {
    const tbody = document.getElementById('tablePayment');
    if (!tbody) return;

    const list = getPayments();

    if (!list.length) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="5">Belum ada metode pembayaran</td></tr>';
        return;
    }

    tbody.innerHTML = list.map((p, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>
                <span class="payment-nama">${escP(p.nama)}</span>
                ${p.isDefault ? '<span class="badge-default">Default</span>' : ''}
            </td>
            <td>${escP(p.keterangan) || '<span style="color:#94a3b8">—</span>'}</td>
            <td>
                <span class="badge-status ${p.aktif ? 'aktif' : 'nonaktif'}">
                    ${p.aktif ? '● Aktif' : '○ Nonaktif'}
                </span>
            </td>
            <td>
                <div class="action-btns">
                    <button class="btn-action btn-edit" data-id="${p.id}" title="Edit">
                        <i class="bx bx-edit"></i>
                    </button>
                    ${p.isDefault
                        ? `<button class="btn-action btn-lock" title="Metode default tidak bisa dihapus" disabled>
                               <i class="bx bx-lock-alt"></i>
                           </button>`
                        : `<button class="btn-action btn-del" data-id="${p.id}" title="Hapus">
                               <i class="bx bx-trash"></i>
                           </button>`
                    }
                </div>
            </td>
        </tr>
    `).join('');

    // Bind tombol edit
    tbody.querySelectorAll('.btn-edit[data-id]').forEach(btn => {
        btn.addEventListener('click', () => openPaymentModal(btn.dataset.id));
    });

    // Bind tombol hapus
    tbody.querySelectorAll('.btn-del[data-id]').forEach(btn => {
        btn.addEventListener('click', () => confirmHapusPayment(btn.dataset.id));
    });
}

// ════════════════════════════════════════════════════════════
//  MODAL PAYMENT — BUKA / TUTUP
// ════════════════════════════════════════════════════════════
let _editPaymentId = null;

function openPaymentModal(editId = null) {
    _editPaymentId = editId;

    const overlay  = document.getElementById('modalPaymentOverlay');
    const title    = document.getElementById('modalPaymentTitle');
    const fNama    = document.getElementById('fPaymentNama');
    const fKet     = document.getElementById('fPaymentKeterangan');
    const fAktif   = document.getElementById('fPaymentAktif');
    const togLabel = document.getElementById('toggleLabel');
    const errMsg   = document.getElementById('errorMsgPayment');

    if (!overlay) return;
    errMsg.textContent = '';

    if (editId) {
        const p = getPayments().find(x => x.id === editId);
        if (!p) return;
        title.innerHTML = '<i class="bx bx-edit"></i> Edit Metode Pembayaran';
        fNama.value        = p.nama;
        fKet.value         = p.keterangan || '';
        fAktif.checked     = p.aktif;
        togLabel.textContent = p.aktif ? 'Aktif' : 'Nonaktif';
        fNama.disabled     = !!p.isDefault; // default: nama tidak bisa diubah
    } else {
        title.innerHTML = '<i class="bx bx-credit-card"></i> Tambah Metode Pembayaran';
        fNama.value        = '';
        fKet.value         = '';
        fAktif.checked     = true;
        togLabel.textContent = 'Aktif';
        fNama.disabled     = false;
    }

    overlay.classList.add('active');
    if (!fNama.disabled) setTimeout(() => fNama.focus(), 80);
}

function closePaymentModal() {
    document.getElementById('modalPaymentOverlay')?.classList.remove('active');
    const fNama = document.getElementById('fPaymentNama');
    if (fNama) fNama.disabled = false;
    _editPaymentId = null;
}

// ════════════════════════════════════════════════════════════
//  SIMPAN PAYMENT
// ════════════════════════════════════════════════════════════
function simpanPayment() {
    const fNama  = document.getElementById('fPaymentNama');
    const fKet   = document.getElementById('fPaymentKeterangan');
    const fAktif = document.getElementById('fPaymentAktif');
    const errMsg = document.getElementById('errorMsgPayment');

    const nama  = fNama.value.trim();
    const ket   = fKet.value.trim();
    const aktif = fAktif.checked;

    // Validasi: nama wajib kecuali field di-disable (edit default)
    if (!fNama.disabled && !nama) {
        errMsg.textContent = 'Nama metode tidak boleh kosong.';
        fNama.focus();
        return;
    }

    const list = getPayments();

    if (_editPaymentId) {
        // Mode edit
        const idx = list.findIndex(p => p.id === _editPaymentId);
        if (idx === -1) return;
        if (!list[idx].isDefault) list[idx].nama = nama;
        list[idx].keterangan = ket;
        list[idx].aktif      = aktif;
        savePaymentsToStorage(list);
        renderPaymentTable();
        closePaymentModal();
        tampilToast('Metode pembayaran berhasil diperbarui.');
    } else {
        // Cek duplikat
        if (list.some(p => p.nama.toLowerCase() === nama.toLowerCase())) {
            errMsg.textContent = `Metode "${nama}" sudah ada.`;
            fNama.focus();
            return;
        }
        list.push({ id: genId(), nama, keterangan: ket, aktif, isDefault: false });
        savePaymentsToStorage(list);
        renderPaymentTable();
        closePaymentModal();
        tampilToast('Metode pembayaran berhasil ditambahkan.');
    }
}

// ════════════════════════════════════════════════════════════
//  HAPUS PAYMENT
// ════════════════════════════════════════════════════════════
let _hapusPaymentId = null;

function confirmHapusPayment(id) {
    _hapusPaymentId = id;
    const p = getPayments().find(x => x.id === id);
    const overlay = document.getElementById('confirmOverlay');
    const desc    = overlay?.querySelector('.confirm-desc');
    if (desc && p) desc.textContent = `Metode "${p.nama}" akan dihapus permanen.`;
    overlay?.classList.add('active');
}

function eksekusiHapusPayment() {
    if (!_hapusPaymentId) return;
    const list = getPayments().filter(p => p.id !== _hapusPaymentId);
    savePaymentsToStorage(list);
    renderPaymentTable();
    tutupConfirm();
    tampilToast('Metode pembayaran dihapus.');
    _hapusPaymentId = null;
}

function tutupConfirm() {
    document.getElementById('confirmOverlay')?.classList.remove('active');
}

// ════════════════════════════════════════════════════════════
//  TOGGLE LABEL STATUS
// ════════════════════════════════════════════════════════════
function initToggleLabel() {
    const cb    = document.getElementById('fPaymentAktif');
    const label = document.getElementById('toggleLabel');
    if (!cb || !label) return;
    cb.addEventListener('change', () => {
        label.textContent = cb.checked ? 'Aktif' : 'Nonaktif';
    });
}

// ════════════════════════════════════════════════════════════
//  TOAST NOTIFIKASI
// ════════════════════════════════════════════════════════════
function tampilToast(pesan) {
    let toast = document.getElementById('invenzToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'invenzToast';
        Object.assign(toast.style, {
            position: 'fixed', bottom: '24px', left: '50%',
            transform: 'translateX(-50%) translateY(16px)',
            background: '#1e293b', color: '#fff',
            padding: '10px 20px', borderRadius: '8px',
            fontSize: '13px', fontFamily: 'Poppins, sans-serif',
            zIndex: '99999', opacity: '0',
            transition: 'opacity .2s, transform .2s',
            pointerEvents: 'none', whiteSpace: 'nowrap',
            boxShadow: '0 4px 16px rgba(0,0,0,.25)'
        });
        document.body.appendChild(toast);
    }
    toast.textContent = pesan;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(toast._tid);
    toast._tid = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(16px)';
    }, 2600);
}

// ════════════════════════════════════════════════════════════
//  PUBLIC API — dipakai stockOut.js & dashboard.js
// ════════════════════════════════════════════════════════════
window.InvenzPayment = {
    getAll:   getPayments,
    getAktif: () => getPayments().filter(p => p.aktif),
};

// ════════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════════
function initPayment() {
    // Tombol tambah
    document.getElementById('btnAddPayment')
        ?.addEventListener('click', () => openPaymentModal());

    // Tutup modal
    document.getElementById('btnClosePayment')
        ?.addEventListener('click', closePaymentModal);
    document.getElementById('btnBatalPayment')
        ?.addEventListener('click', closePaymentModal);

    // Klik luar modal → tutup
    document.getElementById('modalPaymentOverlay')
        ?.addEventListener('click', function (e) {
            if (e.target === this) closePaymentModal();
        });

    // Simpan
    document.getElementById('btnSimpanPayment')
        ?.addEventListener('click', simpanPayment);

    // Enter di input
    ['fPaymentNama', 'fPaymentKeterangan'].forEach(id => {
        document.getElementById(id)
            ?.addEventListener('keydown', e => { if (e.key === 'Enter') simpanPayment(); });
    });

    // Toggle label
    initToggleLabel();

    // Konfirmasi hapus — dikaitkan ke tombol confirmYes yang sudah ada di HTML
    // Pakai event delegation supaya tidak konflik dengan section lain di linkedData.js
    document.getElementById('confirmYes')?.addEventListener('click', () => {
        if (_hapusPaymentId) eksekusiHapusPayment();
    });
    document.getElementById('confirmNo')?.addEventListener('click', () => {
        _hapusPaymentId = null;
        tutupConfirm();
    });

    // Render awal tabel
    renderPaymentTable();
}

// Jalankan setelah DOM siap
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPayment);
} else {
    initPayment();
}
