"use strict";

// ===== AUTH =====
if (!localStorage.getItem("isLoggedIn")) window.location.href = "login.html";

// ===== USER INFO =====
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

// ============================================================
// ===== STORAGE KEYS =========================================
// ============================================================
const STOCKOUT_KEY = "stockOuts_v2"; // key baru agar tidak konflik dengan versi lama

// ============================================================
// ===== HELPERS — baca linkedData ============================
// ============================================================

/** Ambil semua penerima/customer dari linkedData */
function getPenerima() {
  try {
    const d = JSON.parse(localStorage.getItem("linkedData") || "{}");
    return d.penerima || [];
  } catch {
    return [];
  }
}

/**
 * Ambil detail penerima (termasuk telepon) berdasarkan nama.
 * Format item di linkedData.penerima: { nama, keterangan, telepon? }
 */
function getPenerimaByNama(nama) {
  return getPenerima().find((p) => p.nama === nama) || null;
}

/** Ambil metode payment aktif dari linkedData (invenz_payment_methods) */
function getPayments() {
  const DEFAULT = [
    { id: "pay_default_cash", nama: "Cash", aktif: true, isDefault: true },
    { id: "pay_default_qris", nama: "QRIS", aktif: true, isDefault: true },
  ];
  try {
    const raw = localStorage.getItem("invenz_payment_methods");
    const list = raw ? JSON.parse(raw) : DEFAULT;
    return list.filter((p) => p.aktif);
  } catch {
    return DEFAULT;
  }
}

// ============================================================
// ===== AUTO INVOICE NUMBER ==================================
// ============================================================

/**
 * Generate nomor invoice berikutnya dengan format INV-OUT-N.
 * Membaca semua stockOut yang ada, ambil nomor tertinggi, +1.
 */
function generateInvoiceNumber() {
  const list = loadStockOuts();
  let max = 0;
  list.forEach((so) => {
    // Cocokkan format INV-OUT-N
    const m = (so.invoice || "").match(/^INV-OUT-(\d+)$/i);
    if (m) max = Math.max(max, parseInt(m[1]));
  });
  return `INV-OUT-${max + 1}`;
}

// ============================================================
// ===== STORAGE HELPERS ======================================
// ============================================================
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

// ============================================================
// ===== FORMAT HELPERS =======================================
// ============================================================
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

// ============================================================
// ===== RENDER TABEL =========================================
// ============================================================
function renderTable() {
  const tbody = document.getElementById("tableBody");
  const list = loadStockOuts();

  if (!list.length) {
    tbody.innerHTML = `<tr class="empty-row">
            <td colspan="9">Belum ada data — klik "Stock Out" untuk membuat invoice keluar</td>
        </tr>`;
    return;
  }

  tbody.innerHTML = "";
  list.forEach((so, i) => {
    const totalItem = (so.items || []).reduce(
      (s, it) => s + (parseInt(it.jumlahKeluar) || 0),
      0,
    );
    const totalHarga = (so.items || []).reduce(
      (s, it) =>
        s +
        parseFloat(it.hargaJual || it.hargaHPP || 0) *
          (parseInt(it.jumlahKeluar) || 0),
      0,
    );
    const badgeClass = getPaymentBadgeClass(so.paymentId);

    const tr = document.createElement("tr");
    tr.className = "clickable-row";
    tr.dataset.id = so.id;
    tr.innerHTML = `
            <td>${i + 1}</td>
            <td><span class="invoice-link">${so.invoice}</span></td>
            <td>${formatDate(so.tanggal)}</td>
            <td><strong>${so.penerima || "—"}</strong></td>
            <td>${so.telepon || '<span style="color:#bbb">—</span>'}</td>
            <td><span class="payment-chip ${badgeClass}">${getPaymentIcon(so.paymentId)} ${so.paymentNama || "—"}</span></td>
            <td>${totalItem} item</td>
            <td class="col-harga">${formatRp(totalHarga)}</td>
            <td>
                <button class="btn-hapus btn-hapus-so" data-id="${so.id}">
                    <i class="bx bx-trash"></i> Hapus
                </button>
            </td>
        `;

    // Klik baris → ke halaman detail invoice keluar
    tr.addEventListener("click", (e) => {
      if (e.target.closest(".btn-hapus-so")) return; // jangan navigate saat klik hapus
      window.location.href = `invoiceKeluar.html?id=${so.id}`;
    });

    // Klik hapus
    tr.querySelector(".btn-hapus-so").addEventListener("click", (e) => {
      e.stopPropagation();
      openConfirmDelete(so.id);
    });

    tbody.appendChild(tr);
  });
}

function getPaymentBadgeClass(paymentId) {
  if (!paymentId) return "chip-default";
  if (paymentId === "pay_default_cash") return "chip-cash";
  if (paymentId === "pay_default_qris") return "chip-qris";
  return "chip-other";
}
function getPaymentIcon(paymentId) {
  if (paymentId === "pay_default_cash") return "💵";
  if (paymentId === "pay_default_qris") return "📱";
  return "💰";
}

// ============================================================
// ===== MODAL — BUKA =========================================
// ============================================================

let ddPenerima = null; // Custom dropdown instance

function openModal() {
  // Generate nomor invoice otomatis
  const autoInv = generateInvoiceNumber();
  document.getElementById("invoiceAutoPreview").textContent = autoInv;

  // Set tanggal hari ini
  document.getElementById("inputTanggal").value = new Date()
    .toISOString()
    .split("T")[0];

  // Reset field
  document.getElementById("inputTelepon").value = "";
  document.getElementById("phonAutofillHint").style.display = "none";
  document.getElementById("errorMsg").textContent = "";

  // Init custom dropdown penerima (destroy lama jika ada)
  if (ddPenerima) {
    // Reset manual karena class tidak punya destroy()
    const wrapper = document.getElementById("cdPenerima");
    wrapper.classList.remove("open");
  }
  // Re-init dropdown agar data terbaru dari linkedData termuat
  ddPenerima = new CustomDropdown("cdPenerima", "penerima", {
    icon: "bx-user",
  });

  // Listen perubahan penerima → auto-fill telepon
  const penerimaInput = document.getElementById("inputPenerima");
  penerimaInput.addEventListener("change", onPenerimaChange);

  // Render payment options
  renderPaymentOptions();

  document.getElementById("modalOverlay").classList.add("active");
  setTimeout(() => penerimaInput.focus(), 100);
}

/** Dipanggil saat nilai penerima berubah (pilih dari dropdown atau ketik manual) */
function onPenerimaChange(e) {
  const nama = e.target.value.trim();
  const found = getPenerimaByNama(nama);
  const hintEl = document.getElementById("phonAutofillHint");
  const telEl = document.getElementById("inputTelepon");

  if (found && found.telepon) {
    telEl.value = found.telepon;
    hintEl.style.display = "flex";
  } else {
    // Jangan clear kalau user sudah ketik manual
    hintEl.style.display = "none";
  }
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("active");
  // Hapus listener change agar tidak double-bind saat re-open
  const inp = document.getElementById("inputPenerima");
  inp.removeEventListener("change", onPenerimaChange);
}

// ============================================================
// ===== RENDER PAYMENT PILLS =================================
// ============================================================
function renderPaymentOptions() {
  const container = document.getElementById("paymentOptions");
  const emptyHint = document.getElementById("paymentEmptyHint");
  const payments = getPayments();

  if (!payments.length) {
    container.innerHTML = "";
    emptyHint.style.display = "flex";
    return;
  }
  emptyHint.style.display = "none";

  container.innerHTML = payments
    .map(
      (p, i) => `
        <label class="payment-pill ${i === 0 ? "selected" : ""}" for="pay_${p.id}">
            <input
                type="radio"
                name="paymentMethod"
                id="pay_${p.id}"
                value="${p.id}"
                data-nama="${p.nama}"
                ${i === 0 ? "checked" : ""}
            >
            <span class="pill-icon">${getPaymentIcon(p.id)}</span>
            <span class="pill-label">${p.nama}</span>
        </label>
    `,
    )
    .join("");

  // Toggle visual selected class
  container.querySelectorAll('input[name="paymentMethod"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      container
        .querySelectorAll(".payment-pill")
        .forEach((l) => l.classList.remove("selected"));
      radio.closest(".payment-pill").classList.add("selected");
    });
  });
}

// ============================================================
// ===== SIMPAN INVOICE KELUAR BARU ===========================
// ============================================================
function simpanInvoice() {
  const invoice = document
    .getElementById("invoiceAutoPreview")
    .textContent.trim();
  const tanggal = document.getElementById("inputTanggal").value;
  const penerima = ddPenerima
    ? ddPenerima.getValue()
    : document.getElementById("inputPenerima").value.trim();
  const telepon = document.getElementById("inputTelepon").value.trim();
  const errEl = document.getElementById("errorMsg");
  const payRadio = document.querySelector(
    'input[name="paymentMethod"]:checked',
  );

  errEl.textContent = "";

  if (!invoice) {
    errEl.textContent = "Nomor invoice tidak valid.";
    return;
  }
  if (!tanggal) {
    errEl.textContent = "Tanggal keluar harus diisi.";
    return;
  }
  if (!penerima) {
    errEl.textContent = "Nama customer harus diisi.";
    return;
  }
  if (!payRadio) {
    errEl.textContent = "Pilih metode pembayaran.";
    return;
  }

  // Cek duplikat (seharusnya tidak terjadi dengan auto-generate, tapi jaga-jaga)
  const existing = loadStockOuts();
  if (existing.find((s) => s.invoice === invoice)) {
    errEl.textContent = "Nomor invoice sudah ada, coba lagi.";
    return;
  }

  // Auto-tambah penerima ke linkedData jika belum ada
  autoAddPenerima(penerima, telepon);

  const newSO = {
    id: "so_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    invoice,
    tanggal,
    penerima,
    telepon: telepon || "",
    paymentId: payRadio.value,
    paymentNama: payRadio.dataset.nama,
    items: [],
    createdAt: new Date().toISOString(),
  };

  existing.push(newSO);
  saveStockOuts(existing);
  closeModal();

  // Langsung navigate ke halaman detail invoice keluar
  window.location.href = `invoiceKeluar.html?id=${newSO.id}`;
}

/** Tambahkan penerima ke linkedData.penerima jika belum ada */
function autoAddPenerima(nama, telepon) {
  if (!nama) return;
  try {
    const ld = JSON.parse(localStorage.getItem("linkedData") || "{}");
    if (!ld.penerima) ld.penerima = [];
    const idx = ld.penerima.findIndex(
      (p) => p.nama.toLowerCase() === nama.toLowerCase(),
    );
    if (idx === -1) {
      ld.penerima.push({ nama, keterangan: "", telepon: telepon || "" });
    } else if (telepon && !ld.penerima[idx].telepon) {
      // Isi telepon jika sebelumnya kosong
      ld.penerima[idx].telepon = telepon;
    }
    localStorage.setItem("linkedData", JSON.stringify(ld));
  } catch (e) {
    /* ignore */
  }
}

// ============================================================
// ===== HAPUS INVOICE ========================================
// ============================================================
let _pendingDeleteId = null;

function openConfirmDelete(id) {
  _pendingDeleteId = id;
  document.getElementById("confirmOverlay").classList.add("active");
}

function executeDelete() {
  if (!_pendingDeleteId) return;
  let list = loadStockOuts();
  const so = list.find((s) => s.id === _pendingDeleteId);

  // Kembalikan stok ke invoices
  if (so && so.items && so.items.length) {
    kembalikanStok(so.items);
  }

  list = list.filter((s) => s.id !== _pendingDeleteId);
  saveStockOuts(list);
  _pendingDeleteId = null;
  document.getElementById("confirmOverlay").classList.remove("active");
  renderTable();
}

/** Kembalikan qty ke localStorage 'invoices' */
function kembalikanStok(items) {
  try {
    const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
    items.forEach((item) => {
      if (!item.invoiceAsal) return;
      const inv = invoices[item.invoiceAsal];
      if (!inv || !inv.items) return;
      const found = inv.items.find(
        (i) => i.nama === item.nama && i.kategori === item.kategori,
      );
      if (found) {
        found.stok =
          (parseInt(found.stok) || 0) + (parseInt(item.jumlahKeluar) || 0);
      }
    });
    localStorage.setItem("invoices", JSON.stringify(invoices));
  } catch (e) {
    /* ignore */
  }
}

// ============================================================
// ===== EVENT BINDINGS =======================================
// ============================================================
document.getElementById("openModalBtn").addEventListener("click", openModal);
document.getElementById("modalCloseX").addEventListener("click", closeModal);
document.getElementById("batalBtn").addEventListener("click", closeModal);
document.getElementById("modalOverlay").addEventListener("click", function (e) {
  if (e.target === this) closeModal();
});
document.getElementById("simpanBtn").addEventListener("click", simpanInvoice);
document.getElementById("inputTanggal").addEventListener("keydown", (e) => {
  if (e.key === "Enter") simpanInvoice();
});
document.getElementById("confirmYes").addEventListener("click", executeDelete);
document.getElementById("confirmNo").addEventListener("click", () => {
  _pendingDeleteId = null;
  document.getElementById("confirmOverlay").classList.remove("active");
});
document
  .getElementById("confirmOverlay")
  .addEventListener("click", function (e) {
    if (e.target === this) {
      _pendingDeleteId = null;
      this.classList.remove("active");
    }
  });

// ===== INIT =====
renderTable();
