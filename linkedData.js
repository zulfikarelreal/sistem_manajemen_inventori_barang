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
const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.tab;

    // Remove active dari semua tab
    tabBtns.forEach((b) => b.classList.remove("active"));
    tabContents.forEach((c) => c.classList.remove("active"));

    // Set active ke tab yang diklik
    btn.classList.add("active");
    document
      .querySelector(`[data-content="${target}"]`)
      .classList.add("active");
  });
});

// ===== DATA STRUCTURE =====
const STORAGE_KEY = "linkedData";

function getLinkedData() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data
    ? JSON.parse(data)
    : {
        kategori: [],
        merk: [],
        supplier: [],
        lokasi: [],
        penerima: [],
      };
}

function saveLinkedData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ===== MODAL CONTROL =====
const modalOverlay = document.getElementById("modalOverlay");
const confirmOverlay = document.getElementById("confirmOverlay");
const modalTitle = document.getElementById("modalTitle");
const modalForm = document.getElementById("modalForm");
const errorMsg = document.getElementById("errorMsg");
const btnBatal = document.getElementById("btnBatal");
const btnSimpan = document.getElementById("btnSimpan");
const confirmYes = document.getElementById("confirmYes");
const confirmNo = document.getElementById("confirmNo");

let currentType = null;
let editIndex = null;
let deleteIndex = null;

// ===== FORM TEMPLATES =====
const formTemplates = {
  kategori: `
        <label>Nama Kategori *</label>
        <input type="text" id="inputNama" placeholder="Contoh: Elektronik" required>
    `,
  merk: `
        <label>Nama Merk *</label>
        <input type="text" id="inputNama" placeholder="Contoh: Samsung" required>
    `,
  supplier: `
        <label>Nama Supplier *</label>
        <input type="text" id="inputNama" placeholder="Contoh: PT. ABC" required>
        <label>Kontak</label>
        <input type="text" id="inputKontak" placeholder="Nomor telepon atau email">
        <label>Alamat</label>
        <textarea id="inputAlamat" placeholder="Alamat lengkap supplier"></textarea>
        <label>Keterangan</label>
        <textarea id="inputKeterangan" placeholder="Keterangan tambahan"></textarea>
    `,
  lokasi: `
        <label>Nama Lokasi Inventori *</label>
        <input type="text" id="inputNama" placeholder="Contoh: Gudang A" required>
    `,
  penerima: `
        <label>Nama Penerima/Tujuan *</label>
        <input type="text" id="inputNama" placeholder="Contoh: Divisi IT" required>
        <label>Keterangan</label>
        <textarea id="inputKeterangan" placeholder="Keterangan tambahan"></textarea>
    `,
};

// ===== OPEN MODAL =====
function openModal(type, mode = "add", index = null) {
  currentType = type;
  editIndex = mode === "edit" ? index : null;

  const titles = {
    kategori: mode === "add" ? "Tambah Kategori" : "Edit Kategori",
    merk: mode === "add" ? "Tambah Merk" : "Edit Merk",
    supplier: mode === "add" ? "Tambah Supplier" : "Edit Supplier",
    lokasi:
      mode === "add" ? "Tambah Lokasi Inventori" : "Edit Lokasi Inventori",
    penerima:
      mode === "add" ? "Tambah Penerima/Tujuan" : "Edit Penerima/Tujuan",
  };

  modalTitle.textContent = titles[type];
  modalForm.innerHTML = formTemplates[type];
  errorMsg.textContent = "";

  // Fill form jika edit mode
  if (mode === "edit") {
    const data = getLinkedData()[type][index];
    document.getElementById("inputNama").value = data.nama;

    if (type === "supplier") {
      document.getElementById("inputKontak").value = data.kontak || "";
      document.getElementById("inputAlamat").value = data.alamat || "";
      document.getElementById("inputKeterangan").value = data.keterangan || "";
    } else if (type === "penerima") {
      document.getElementById("inputKeterangan").value = data.keterangan || "";
    }
  }

  modalOverlay.classList.add("active");
}

function closeModal() {
  modalOverlay.classList.remove("active");
  currentType = null;
  editIndex = null;
  modalForm.innerHTML = "";
  errorMsg.textContent = "";
}

btnBatal.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});

// ===== SAVE DATA =====
btnSimpan.addEventListener("click", () => {
  const nama = document.getElementById("inputNama").value.trim();

  if (!nama) {
    errorMsg.textContent = "Nama harus diisi!";
    return;
  }

  const allData = getLinkedData();
  const item = { nama };

  // Tambah field spesifik
  if (currentType === "supplier") {
    item.kontak = document.getElementById("inputKontak").value.trim();
    item.alamat = document.getElementById("inputAlamat").value.trim();
    item.keterangan = document.getElementById("inputKeterangan").value.trim();
  } else if (currentType === "penerima") {
    item.keterangan = document.getElementById("inputKeterangan").value.trim();
  }

  if (editIndex !== null) {
    // Edit mode
    allData[currentType][editIndex] = item;
  } else {
    // Add mode
    allData[currentType].push(item);
  }

  saveLinkedData(allData);
  renderTable(currentType);
  closeModal();
});

// ===== DELETE CONFIRMATION =====
function confirmDelete(type, index) {
  currentType = type;
  deleteIndex = index;
  confirmOverlay.classList.add("active");
}

confirmYes.addEventListener("click", () => {
  const allData = getLinkedData();
  allData[currentType].splice(deleteIndex, 1);
  saveLinkedData(allData);
  renderTable(currentType);
  confirmOverlay.classList.remove("active");
  currentType = null;
  deleteIndex = null;
});

confirmNo.addEventListener("click", () => {
  confirmOverlay.classList.remove("active");
  currentType = null;
  deleteIndex = null;
});

confirmOverlay.addEventListener("click", (e) => {
  if (e.target === confirmOverlay) {
    confirmOverlay.classList.remove("active");
    currentType = null;
    deleteIndex = null;
  }
});

// ===== RENDER TABLE =====
function renderTable(type) {
  const data = getLinkedData()[type];
  const tbody = document.getElementById(
    `table${type.charAt(0).toUpperCase() + type.slice(1)}`,
  );

  if (data.length === 0) {
    const colspans = {
      kategori: 3,
      merk: 3,
      supplier: 6,
      lokasi: 3,
      penerima: 4,
    };
    tbody.innerHTML = `<tr class="empty-row"><td colspan="${colspans[type]}">Belum ada data ${type}</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  data.forEach((item, idx) => {
    const tr = document.createElement("tr");

    if (type === "kategori" || type === "merk" || type === "lokasi") {
      tr.innerHTML = `
                <td>${idx + 1}</td>
                <td>${item.nama}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-edit"><i class="bx bx-edit"></i> Edit</button>
                        <button class="btn-delete"><i class="bx bx-trash"></i> Hapus</button>
                    </div>
                </td>
            `;
    } else if (type === "supplier") {
      tr.innerHTML = `
                <td>${idx + 1}</td>
                <td>${item.nama}</td>
                <td>${item.kontak || "-"}</td>
                <td>${item.alamat || "-"}</td>
                <td>${item.keterangan || "-"}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-edit"><i class="bx bx-edit"></i> Edit</button>
                        <button class="btn-delete"><i class="bx bx-trash"></i> Hapus</button>
                    </div>
                </td>
            `;
    } else if (type === "penerima") {
      tr.innerHTML = `
                <td>${idx + 1}</td>
                <td>${item.nama}</td>
                <td>${item.keterangan || "-"}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-edit"><i class="bx bx-edit"></i> Edit</button>
                        <button class="btn-delete"><i class="bx bx-trash"></i> Hapus</button>
                    </div>
                </td>
            `;
    }

    // Event listeners
    tr.querySelector(".btn-edit").addEventListener("click", () =>
      openModal(type, "edit", idx),
    );
    tr.querySelector(".btn-delete").addEventListener("click", () =>
      confirmDelete(type, idx),
    );

    tbody.appendChild(tr);
  });
}

// ===== BUTTON ADD LISTENERS =====
document
  .getElementById("btnAddKategori")
  .addEventListener("click", () => openModal("kategori"));
document
  .getElementById("btnAddMerk")
  .addEventListener("click", () => openModal("merk"));
document
  .getElementById("btnAddSupplier")
  .addEventListener("click", () => openModal("supplier"));
document
  .getElementById("btnAddLokasi")
  .addEventListener("click", () => openModal("lokasi"));
document
  .getElementById("btnAddPenerima")
  .addEventListener("click", () => openModal("penerima"));

// ===== INIT RENDER =====
renderTable("kategori");
renderTable("merk");
renderTable("supplier");
renderTable("lokasi");
renderTable("penerima");
