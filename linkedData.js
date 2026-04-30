// ===== AUTH CHECK =====
if (!localStorage.getItem("isLoggedIn")) {
  window.location.href = "login.html";
}

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
    };
  } catch (e) {
    return {
      kategori: [],
      merk: [],
      supplier: [],
      barang: [],
      lokasi: [],
      penerima: [],
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

// ===== ELEMEN MODAL =====
const modalOverlay = document.getElementById("modalOverlay");
const confirmOverlay = document.getElementById("confirmOverlay");
const modalTitle = document.getElementById("modalTitle");
const modalForm = document.getElementById("modalForm");
const errorMsg = document.getElementById("errorMsg");

// ===== FORM TEMPLATES =====
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
  barang: () => `
    <label>Nama Barang *</label>
    <input type="text" id="f_nama" placeholder="Contoh: RAM Kingston 16GB DDR4">
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
  barang: ["Tambah Barang", "Edit Barang"],
  lokasi: ["Tambah Lokasi Inventori", "Edit Lokasi Inventori"],
  penerima: ["Tambah Penerima/Tujuan", "Edit Penerima/Tujuan"],
};

// ===== OPEN MODAL =====
function openModal(type, mode = "add", index = null) {
  currentType = type;
  editIndex = mode === "edit" ? index : null;

  modalTitle.textContent = modalTitles[type][mode === "edit" ? 1 : 0];
  modalForm.innerHTML = formTemplates[type]();
  errorMsg.textContent = "";

  // Isi form saat edit
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

  // Fokus ke input pertama
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

// ===== SIMPAN =====
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

  if (editIndex !== null) {
    allData[currentType][editIndex] = item;
  } else {
    allData[currentType].push(item);
  }

  saveLinkedData(allData);
  renderTable(currentType);
  closeModal();
}

document.getElementById("btnBatal").addEventListener("click", closeModal);
document.getElementById("btnSimpan").addEventListener("click", doSimpan);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});

// Simpan juga dengan Enter
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && modalOverlay.classList.contains("active")) {
    e.preventDefault();
    doSimpan();
  }
  if (e.key === "Escape" && modalOverlay.classList.contains("active"))
    closeModal();
});

// ===== HAPUS =====
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

// ===== RENDER TABLE =====
const tableConfig = {
  kategori: { colspan: 3, cols: ["nama"] },
  merk: { colspan: 3, cols: ["nama"] },
  barang: { colspan: 3, cols: ["nama"] },
  lokasi: { colspan: 3, cols: ["nama"] },
  supplier: { colspan: 6, cols: ["nama", "kontak", "alamat", "keterangan"] },
  penerima: { colspan: 4, cols: ["nama", "keterangan"] },
};

function renderTable(type) {
  const config = tableConfig[type];
  const tbodyId = "table" + type.charAt(0).toUpperCase() + type.slice(1);
  const tbody = document.getElementById(tbodyId);
  if (!tbody) {
    console.warn("tbody tidak ditemukan:", tbodyId);
    return;
  }

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

// ===== TOMBOL TAMBAH =====
const addBtnMap = {
  btnAddKategori: "kategori",
  btnAddMerk: "merk",
  btnAddSupplier: "supplier",
  btnAddBarang: "barang",
  btnAddLokasi: "lokasi",
  btnAddPenerima: "penerima",
};

Object.entries(addBtnMap).forEach(([btnId, type]) => {
  const el = document.getElementById(btnId);
  if (el) el.addEventListener("click", () => openModal(type));
  else console.warn("Tombol tidak ditemukan:", btnId);
});

// ===== INIT =====
Object.keys(tableConfig).forEach(renderTable);
