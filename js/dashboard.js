// ===== AUTH CHECK =====
if (!localStorage.getItem("isLoggedIn")) {
  window.location.href = "login.html";
}

// ===== USER INFO =====
const loggedUser = localStorage.getItem("loggedUser") || "Admin";
document.getElementById("welcomeUser").textContent = loggedUser;
document.getElementById("sidebarUsername").textContent = loggedUser;
document.getElementById("sidebarAvatar").textContent = loggedUser
  .charAt(0)
  .toUpperCase();

// Tampilkan nama user di tooltip icon navbar
const navUser = document.getElementById("navUser");
if (navUser) navUser.setAttribute("title", loggedUser);

// ===== CLOCK =====
function updateClock() {
  const now = new Date();
  document.getElementById("clockDisplay").textContent = now.toLocaleTimeString(
    "id-ID",
    { hour: "2-digit", minute: "2-digit" },
  );
  document.getElementById("dateDisplay").textContent = now.toLocaleDateString(
    "id-ID",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  );
}
updateClock();
setInterval(updateClock, 1000);

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
function doLogout() {
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("loggedUser");
  window.location.href = "login.html";
}
document.getElementById("logoutBtn").addEventListener("click", doLogout);
// document.getElementById("logoutQuick").addEventListener("click", doLogout);

// ===== LOAD DATA =====
const invoices = JSON.parse(localStorage.getItem("invoices") || "{}");
const invoiceList = Object.values(invoices);
const allItems = [];
invoiceList.forEach((inv) => {
  if (inv.items && Array.isArray(inv.items)) allItems.push(...inv.items);
});

// ===== STATS =====
const totalStok = allItems.reduce((s, i) => s + (parseInt(i.stok) || 0), 0);
const uniqueKategori = new Set(
  allItems.map((i) => (i.kategori || "Lainnya").toLowerCase()),
);
const uniqueNama = new Set(allItems.map((i) => i.nama.toLowerCase()));

document.getElementById("statTotalStok").textContent = totalStok;
document.getElementById("statKategori").textContent = uniqueKategori.size;
document.getElementById("statJenis").textContent = uniqueNama.size;
document.getElementById("statInvoice").textContent = invoiceList.length;

// ===== PIE CHART (Barang per Kategori) =====
const kategoriMap = {};
allItems.forEach((item) => {
  const k = item.kategori || "Lainnya";
  kategoriMap[k] = (kategoriMap[k] || 0) + (parseInt(item.stok) || 0);
});
const pieLabels = Object.keys(kategoriMap);
const pieData = Object.values(kategoriMap);
const pieColors = [
  "#16A085",
  "#2980B9",
  "#8E44AD",
  "#F39C12",
  "#E74C3C",
  "#27AE60",
  "#D35400",
  "#2C3E50",
];

if (pieLabels.length > 0) {
  new Chart(document.getElementById("pieChart"), {
    type: "doughnut",
    data: {
      labels: pieLabels,
      datasets: [
        {
          data: pieData,
          backgroundColor: pieColors,
          borderWidth: 2,
          borderColor: "#111",
          hoverOffset: 20,
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          position: "bottom",
          labels: { font: { family: "Poppins", size: 11 }, boxWidth: 12 },
        },
        title: {
          display: true,
          text: "Distribusi Barang per Kategori",
          font: { size: 14, weight: "bold", family: "Poppins" },
        },
      },
    },
  });
} else {
  document.getElementById("pieChart").style.display = "none";
  document.getElementById("pieEmpty").style.display = "block";
}

// ===== BAR CHART (Stok per Merk) =====
const merkMap = {};
allItems.forEach((item) => {
  const m = item.merk || "Lainnya";
  merkMap[m] = (merkMap[m] || 0) + (parseInt(item.stok) || 0);
});
const barLabels = Object.keys(merkMap);
const barData = Object.values(merkMap);

if (barLabels.length > 0) {
  new Chart(document.getElementById("barChart"), {
    type: "bar",
    data: {
      labels: barLabels,
      datasets: [
        {
          label: "Stok",
          data: barData,
          backgroundColor: "#a8c4ff",
          borderColor: "#111",
          borderWidth: 1.5,
          borderRadius: 6,
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { font: { family: "Poppins", size: 11 } },
        },
        x: { ticks: { font: { family: "Poppins", size: 11 } } },
      },
    },
  });
} else {
  document.getElementById("barChart").style.display = "none";
  document.getElementById("barEmpty").style.display = "block";
}

// ===== RECENT INVOICES TABLE =====
const tbody = document.getElementById("recentTableBody");
if (invoiceList.length === 0) {
  tbody.innerHTML =
    '<tr><td colspan="6" class="empty-state">Belum ada invoice</td></tr>';
} else {
  tbody.innerHTML = "";
  invoiceList
    .slice()
    .reverse()
    .forEach((inv, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
            <td>${idx + 1}</td>
            <td><a href="invoice.html?id=${encodeURIComponent(inv.invoice)}"
                style="color:rgb(16,44,168);font-weight:600;text-decoration:underline">
                ${inv.invoice}</a></td>
            <td>${inv.supplier}</td>
            <td>${inv.tanggal}</td>
            <td>${inv.total} unit</td>
            <td><span class="badge badge-green">Masuk</span></td>
        `;
      tbody.appendChild(tr);
    });
}
