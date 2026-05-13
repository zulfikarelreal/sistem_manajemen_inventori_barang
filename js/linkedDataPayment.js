// ===== AUTH =====
const loggedUser =
  (typeof window.loggedUser !== "undefined" && window.loggedUser) ||
  localStorage.getItem("loggedUser") ||
  "Admin";

if (!localStorage.getItem("isLoggedIn")) {
  window.location.href = "login.html";
}

document.getElementById("sidebarUsername").textContent = loggedUser;
document.getElementById("sidebarAvatar").textContent   = loggedUser.charAt(0).toUpperCase();

// ===== SIDEBAR =====
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("sidebarOverlay");
document.getElementById("hamburger").addEventListener("click", () => {
  sidebar.classList.add("open"); overlay.classList.add("active");
});
document.getElementById("sidebarClose").addEventListener("click", closeSidebar);
overlay.addEventListener("click", closeSidebar);
function closeSidebar() {
  sidebar.classList.remove("open"); overlay.classList.remove("active");
}

// ===== LOGOUT =====
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("loggedUser");
  window.location.href = "login.html";
});

// ===== STORAGE KEY =====
const STORAGE_KEY = "paymentMethods";

// ===== DEFAULT PAYMENTS (selalu ada, tidak bisa dihapus) =====
const DEFAULTS = {
  cash: {
    id: "cash", nama: "Cash", desc: "Pembayaran tunai langsung",
    icon: "bx-money", aktif: true, isDefault: true
  },
  qris: {
    id: "qris", nama: "QRIS", desc: "Scan QR Code pembayaran",
    icon: "bx-qr", aktif: true, isDefault: true
  }
};

// ===== LOAD CUSTOM METHODS =====
function loadCustom() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}
function saveCustom(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

// ===== GET ALL METHODS (default + custom) =====
function getAllMethods() {
  const customs = loadCustom();
  const defaultsArr = Object.values(DEFAULTS);
  // Override default desc/aktif dari localStorage jika pernah diedit
  const defaultOverrides = JSON.parse(localStorage.getItem("paymentDefaultOverrides") || "{}");
  defaultsArr.forEach(d => {
    if (defaultOverrides[d.id]) {
      d.desc  = defaultOverrides[d.id].desc  ?? d.desc;
      d.aktif = defaultOverrides[d.id].aktif ?? d.aktif;
    }
  });
  return [...defaultsArr, ...customs];
}

// ===== GENERATE ID =====
function genId() {
  return "pay_" + Date.now() + "_" + Math.random().toString(36).slice(2,6);
}

// ===== RENDER TABEL =====
function renderTable() {
  const tbody = document.getElementById("tableBody");
  const all   = getAllMethods();
  tbody.innerHTML = "";

  all.forEach((m, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>
        <span style="display:inline-flex;align-items:center;gap:6px;">
          <i class="bx ${m.icon}" style="font-size:16px;"></i>
          <strong>${m.nama}</strong>
        </span>
      </td>
      <td>${m.desc || "—"}</td>
      <td>
        <span class="pill ${m.isDefault ? "pill-default" : "pill-custom"}">
          ${m.isDefault ? "Default" : "Kustom"}
        </span>
      </td>
      <td>
        <span class="pill ${m.aktif ? "pill-aktif" : "pill-nonaktif"}">
          ${m.aktif ? "Aktif" : "Nonaktif"}
        </span>
      </td>
      <td>
        <button class="btn-tbl btn-edit" data-id="${m.id}">
          <i class="bx bx-edit"></i> Edit
        </button>
        <button class="btn-tbl btn-toggle" data-id="${m.id}" data-aktif="${m.aktif}">
          <i class="bx ${m.aktif ? "bx-pause" : "bx-play"}"></i>
          ${m.aktif ? "Nonaktifkan" : "Aktifkan"}
        </button>
        ${m.isDefault ? `
          <button class="btn-tbl" style="background:#eee;color:#aaa;cursor:not-allowed;box-shadow:none;" title="Tidak dapat dihapus" disabled>
            <i class="bx bx-lock"></i> Hapus
          </button>` : `
          <button class="btn-tbl btn-hapus" data-id="${m.id}" data-nama="${m.nama}">
            <i class="bx bx-trash"></i> Hapus
          </button>`
        }
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Bind table buttons
  tbody.querySelectorAll(".btn-edit").forEach(btn => {
    btn.addEventListener("click", () => bukaEdit(btn.dataset.id));
  });
  tbody.querySelectorAll(".btn-toggle").forEach(btn => {
    btn.addEventListener("click", () => toggleAktif(btn.dataset.id, btn.dataset.aktif === "true"));
  });
  tbody.querySelectorAll(".btn-hapus").forEach(btn => {
    btn.addEventListener("click", () => bukaConfirmHapus(btn.dataset.id, btn.dataset.nama));
  });
}

// ===== RENDER CARDS (hanya default + custom, update icon) =====
function renderCards() {
  // Update default cards dari override
  const defaultOverrides = JSON.parse(localStorage.getItem("paymentDefaultOverrides") || "{}");

  ["cash", "qris"].forEach(id => {
    const card = document.querySelector(`.payment-card[data-id="${id}"]`);
    if (!card) return;
    const ov = defaultOverrides[id] || {};
    const aktif = ov.aktif !== undefined ? ov.aktif : true;
    card.classList.toggle("card-inactive", !aktif);

    const descEl = card.querySelector(".card-desc");
    if (descEl && ov.desc) descEl.textContent = ov.desc;

    const badgeEl = card.querySelector(".badge-default");
    if (badgeEl) {
      // Tetap tampil Default
    }
  });

  // Custom cards: remove existing custom cards first
  document.querySelectorAll(".payment-card.custom-card").forEach(c => c.remove());

  const customs = loadCustom();
  const container = document.getElementById("cardsContainer");
  const customLabel = document.getElementById("customLabel");

  if (customs.length > 0) {
    customLabel.style.display = "flex";
    customs.forEach(m => {
      const div = document.createElement("div");
      div.className = `payment-card custom-card${m.aktif ? "" : " card-inactive"}`;
      div.dataset.id = m.id;
      div.innerHTML = `
        <div class="card-icon">
          <i class="bx ${m.icon}"></i>
        </div>
        <div class="card-body">
          <div class="card-name">${m.nama}</div>
          <div class="card-desc">${m.desc || "—"}</div>
          <span class="${m.aktif ? "badge-custom" : "badge-inactive"}">${m.aktif ? "Aktif" : "Nonaktif"}</span>
        </div>
        <div class="card-actions">
          <button class="btn-card-edit" data-id="${m.id}"><i class="bx bx-edit"></i></button>
          <button class="btn-card-delete" data-id="${m.id}" data-nama="${m.nama}"><i class="bx bx-trash"></i></button>
        </div>
      `;

      div.querySelector(".btn-card-edit").addEventListener("click", () => bukaEdit(m.id));
      div.querySelector(".btn-card-delete").addEventListener("click", () => bukaConfirmHapus(m.id, m.nama));

      container.appendChild(div);
    });
  } else {
    customLabel.style.display = "none";
  }
}

function renderAll() {
  renderCards();
  renderTable();
}

// ===== TOGGLE AKTIF =====
function toggleAktif(id, currentAktif) {
  if (id === "cash" || id === "qris") {
    // Default override
    const overrides = JSON.parse(localStorage.getItem("paymentDefaultOverrides") || "{}");
    if (!overrides[id]) overrides[id] = {};
    overrides[id].aktif = !currentAktif;
    localStorage.setItem("paymentDefaultOverrides", JSON.stringify(overrides));
  } else {
    const customs = loadCustom();
    const found = customs.find(m => m.id === id);
    if (found) found.aktif = !currentAktif;
    saveCustom(customs);
  }
  syncToStockOut();
  renderAll();
}

// ===== SYNC KE STOCKOUT (expose daftar aktif) =====
function syncToStockOut() {
  const all = getAllMethods().filter(m => m.aktif);
  localStorage.setItem("paymentMethodsActive", JSON.stringify(all));
}

// ===== ICON PICKER =====
let selectedIcon = "bx-credit-card";
document.querySelectorAll(".icon-option").forEach(opt => {
  opt.addEventListener("click", () => {
    document.querySelectorAll(".icon-option").forEach(o => o.classList.remove("selected"));
    opt.classList.add("selected");
    selectedIcon = opt.dataset.icon;
  });
});

// ===== TOGGLE LABEL =====
const toggleAktifInput = document.getElementById("toggleAktif");
const toggleLabel      = document.getElementById("toggleLabel");
toggleAktifInput.addEventListener("change", () => {
  toggleLabel.textContent = toggleAktifInput.checked ? "Aktif" : "Nonaktif";
});

// ===== MODAL TAMBAH / EDIT =====
const modalOverlay = document.getElementById("modalOverlay");
const modalTitle   = document.getElementById("modalTitle");
const inputNama    = document.getElementById("inputNama");
const inputDesc    = document.getElementById("inputDesc");
const errorMsg     = document.getElementById("errorMsg");

let editId = null; // null = tambah baru, string = edit

document.getElementById("openModalBtn").addEventListener("click", () => {
  editId = null;
  modalTitle.innerHTML = '<i class="bx bx-credit-card"></i> Tambah Metode Payment';
  inputNama.value  = "";
  inputDesc.value  = "";
  errorMsg.textContent = "";
  toggleAktifInput.checked = true;
  toggleLabel.textContent  = "Aktif";
  setSelectedIcon("bx-credit-card");
  modalOverlay.classList.add("active");
});

document.getElementById("batalBtn").addEventListener("click", () => {
  modalOverlay.classList.remove("active");
});
modalOverlay.addEventListener("click", e => {
  if (e.target === modalOverlay) modalOverlay.classList.remove("active");
});

function setSelectedIcon(icon) {
  selectedIcon = icon;
  document.querySelectorAll(".icon-option").forEach(opt => {
    opt.classList.toggle("selected", opt.dataset.icon === icon);
  });
}

function bukaEdit(id) {
  // Default edit lewat modal terpisah
  if (id === "cash" || id === "qris") {
    bukaEditDefault(id);
    return;
  }

  const customs = loadCustom();
  const found   = customs.find(m => m.id === id);
  if (!found) return;

  editId = id;
  modalTitle.innerHTML = '<i class="bx bx-edit"></i> Edit Metode Payment';
  inputNama.value  = found.nama;
  inputDesc.value  = found.desc || "";
  errorMsg.textContent = "";
  toggleAktifInput.checked = found.aktif;
  toggleLabel.textContent  = found.aktif ? "Aktif" : "Nonaktif";
  setSelectedIcon(found.icon || "bx-credit-card");
  modalOverlay.classList.add("active");
});

document.getElementById("simpanBtn").addEventListener("click", () => {
  const nama = inputNama.value.trim();
  const desc = inputDesc.value.trim();
  const aktif = toggleAktifInput.checked;

  if (!nama) {
    errorMsg.textContent = "Nama metode wajib diisi!";
    return;
  }

  const customs = loadCustom();

  if (editId) {
    // Edit existing
    const idx = customs.findIndex(m => m.id === editId);
    if (idx > -1) {
      // Cek duplikat (kecuali diri sendiri)
      const dup = customs.find(m => m.nama.toLowerCase() === nama.toLowerCase() && m.id !== editId);
      const dupDefault = Object.values(DEFAULTS).find(d => d.nama.toLowerCase() === nama.toLowerCase());
      if (dup || dupDefault) {
        errorMsg.textContent = "Nama metode sudah ada!";
        return;
      }
      customs[idx] = { ...customs[idx], nama, desc, icon: selectedIcon, aktif };
    }
  } else {
    // Tambah baru
    const dup = customs.find(m => m.nama.toLowerCase() === nama.toLowerCase());
    const dupDefault = Object.values(DEFAULTS).find(d => d.nama.toLowerCase() === nama.toLowerCase());
    if (dup || dupDefault) {
      errorMsg.textContent = "Nama metode sudah ada!";
      return;
    }
    customs.push({ id: genId(), nama, desc, icon: selectedIcon, aktif, isDefault: false });
  }

  saveCustom(customs);
  syncToStockOut();
  renderAll();
  modalOverlay.classList.remove("active");
});

// ===== EDIT DEFAULT =====
const editDefaultOverlay     = document.getElementById("editDefaultOverlay");
const editDefaultTitle       = document.getElementById("editDefaultTitle");
const editDefaultDesc        = document.getElementById("editDefaultDesc");
const editDefaultToggle      = document.getElementById("editDefaultToggle");
const editDefaultToggleLabel = document.getElementById("editDefaultToggleLabel");
const errorMsgDefault        = document.getElementById("errorMsgDefault");
let editDefaultId = null;

editDefaultToggle.addEventListener("change", () => {
  editDefaultToggleLabel.textContent = editDefaultToggle.checked ? "Aktif" : "Nonaktif";
});

function bukaEditDefault(id) {
  editDefaultId = id;
  const overrides = JSON.parse(localStorage.getItem("paymentDefaultOverrides") || "{}");
  const base = DEFAULTS[id];
  const ov   = overrides[id] || {};

  editDefaultTitle.innerHTML = `<i class="bx bx-edit"></i> Edit ${base.nama}`;
  editDefaultDesc.value        = ov.desc  !== undefined ? ov.desc  : base.desc;
  editDefaultToggle.checked    = ov.aktif !== undefined ? ov.aktif : true;
  editDefaultToggleLabel.textContent = editDefaultToggle.checked ? "Aktif" : "Nonaktif";
  errorMsgDefault.textContent = "";
  editDefaultOverlay.classList.add("active");
}

document.getElementById("editDefaultBatal").addEventListener("click", () => {
  editDefaultOverlay.classList.remove("active");
});
editDefaultOverlay.addEventListener("click", e => {
  if (e.target === editDefaultOverlay) editDefaultOverlay.classList.remove("active");
});

document.getElementById("editDefaultSimpan").addEventListener("click", () => {
  const overrides = JSON.parse(localStorage.getItem("paymentDefaultOverrides") || "{}");
  if (!overrides[editDefaultId]) overrides[editDefaultId] = {};
  overrides[editDefaultId].desc  = editDefaultDesc.value.trim();
  overrides[editDefaultId].aktif = editDefaultToggle.checked;
  localStorage.setItem("paymentDefaultOverrides", JSON.stringify(overrides));

  // Sync edit button on card
  const card = document.querySelector(`.payment-card[data-id="${editDefaultId}"]`);
  if (card) {
    const editBtn = card.querySelector(".btn-card-edit");
    if (editBtn) editBtn.dataset.desc = editDefaultDesc.value.trim();
  }

  syncToStockOut();
  renderAll();
  editDefaultOverlay.classList.remove("active");
});

// ===== KONFIRMASI HAPUS =====
const confirmOverlay = document.getElementById("confirmOverlay");
const confirmDesc    = document.getElementById("confirmDesc");
let deleteId = null;

function bukaConfirmHapus(id, nama) {
  deleteId = id;
  confirmDesc.textContent = `Metode "${nama}" akan dihapus permanen dan tidak dapat digunakan di transaksi baru.`;
  confirmOverlay.classList.add("active");
}

document.getElementById("confirmNo").addEventListener("click", () => {
  deleteId = null;
  confirmOverlay.classList.remove("active");
});
confirmOverlay.addEventListener("click", e => {
  if (e.target === confirmOverlay) {
    deleteId = null;
    confirmOverlay.classList.remove("active");
  }
});
document.getElementById("confirmYes").addEventListener("click", () => {
  if (!deleteId) return;
  const customs = loadCustom().filter(m => m.id !== deleteId);
  saveCustom(customs);
  syncToStockOut();
  renderAll();
  deleteId = null;
  confirmOverlay.classList.remove("active");
});

// ===== BIND EDIT BUTTONS PADA DEFAULT CARDS (HTML) =====
document.querySelectorAll(".btn-card-edit").forEach(btn => {
  btn.addEventListener("click", () => bukaEdit(btn.dataset.id));
});

// ===== INIT =====
function init() {
  // Pastikan default selalu ada di active list
  syncToStockOut();
  renderAll();
}

init();
