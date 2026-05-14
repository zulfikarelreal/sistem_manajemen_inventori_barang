// ===== AUTH CHECK =====
if (!localStorage.getItem("isLoggedIn")) {
  window.location.href = "login.html";
}

// ===== USER INFO =====
const loggedUser = localStorage.getItem("loggedUser") || "Admin";
document.getElementById("welcomeUser").textContent = loggedUser;
document.getElementById("sidebarUsername").textContent = loggedUser;
document.getElementById("sidebarAvatar").textContent = loggedUser.charAt(0).toUpperCase();
const navUser = document.getElementById("navUser");
if (navUser) navUser.setAttribute("title", loggedUser);

// ===== CLOCK =====
function updateClock() {
  const now = new Date();
  document.getElementById("clockDisplay").textContent = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  document.getElementById("dateDisplay").textContent  = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
updateClock();
setInterval(updateClock, 1000);

// ===== SIDEBAR =====
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("sidebarOverlay");
document.getElementById("hamburger").addEventListener("click", () => { sidebar.classList.add("open"); overlay.classList.add("active"); });
document.getElementById("sidebarClose").addEventListener("click", closeSidebar);
overlay.addEventListener("click", closeSidebar);
function closeSidebar() { sidebar.classList.remove("open"); overlay.classList.remove("active"); }

// ===== LOGOUT =====
function doLogout() {
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("loggedUser");
  window.location.href = "login.html";
}
document.getElementById("logoutBtn").addEventListener("click", doLogout);

// ===== FORMAT HELPERS =====
function fmtTgl(str) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

// ============================================================
//  LOAD DATA STOK MASUK
// ============================================================
const invoices    = JSON.parse(localStorage.getItem("invoices") || "{}");
const invoiceList = Object.values(invoices);
const allItems    = [];
invoiceList.forEach(inv => { if (inv.items && Array.isArray(inv.items)) allItems.push(...inv.items); });

// ===== STATS STOK =====
const totalStok     = allItems.reduce((s, i) => s + (parseInt(i.stok) || 0), 0);
const uniqueKategori = new Set(allItems.map(i => (i.kategori || "Lainnya").toLowerCase()));
const uniqueNama     = new Set(allItems.map(i => i.nama.toLowerCase()));

document.getElementById("statTotalStok").textContent = totalStok;
document.getElementById("statKategori").textContent  = uniqueKategori.size;
document.getElementById("statJenis").textContent     = uniqueNama.size;
document.getElementById("statInvoice").textContent   = invoiceList.length;

// ============================================================
//  LOAD DATA STOCK OUT  (key: invenz_stockout, format: array)
// ============================================================
const stockOutList = JSON.parse(localStorage.getItem("invenz_stockout") || "[]");

// ── Stats Stock Out ──
const totalOut  = stockOutList.length;
const totalItemOut = stockOutList.reduce((s, inv) => {
  return s + (inv.items || []).reduce((ss, it) => ss + (it.jumlah || it.jumlahKeluar || 0), 0);
}, 0);

// Metode terbanyak
const paymentCount = {};
stockOutList.forEach(inv => {
  const nama = inv.paymentNama || "—";
  paymentCount[nama] = (paymentCount[nama] || 0) + 1;
});
const topPayment = Object.keys(paymentCount).sort((a, b) => paymentCount[b] - paymentCount[a])[0] || "—";

document.getElementById("statTotalOut").textContent  = totalOut;
document.getElementById("statItemOut").textContent   = totalItemOut;
document.getElementById("statTopPayment").textContent = topPayment;

// ============================================================
//  PIE CHART — Barang per Kategori
// ============================================================
const kategoriMap = {};
allItems.forEach(item => {
  const k = item.kategori || "Lainnya";
  kategoriMap[k] = (kategoriMap[k] || 0) + (parseInt(item.stok) || 0);
});
const pieLabels = Object.keys(kategoriMap);
const pieData   = Object.values(kategoriMap);
const pieColors = ["#16A085","#2980B9","#8E44AD","#F39C12","#E74C3C","#27AE60","#D35400","#2C3E50"];

if (pieLabels.length > 0) {
  new Chart(document.getElementById("pieChart"), {
    type: "doughnut",
    data: { labels: pieLabels, datasets: [{ data: pieData, backgroundColor: pieColors, borderWidth: 2, borderColor: "#111", hoverOffset: 20 }] },
    options: { plugins: { legend: { position: "bottom", labels: { font: { family: "Poppins", size: 11 }, boxWidth: 12 } } } },
  });
} else {
  document.getElementById("pieChart").style.display = "none";
  document.getElementById("pieEmpty").style.display = "block";
}

// ============================================================
//  BAR CHART — Stok per Merk
// ============================================================
const merkMap = {};
allItems.forEach(item => {
  const m = item.merk || "Lainnya";
  merkMap[m] = (merkMap[m] || 0) + (parseInt(item.stok) || 0);
});
const barLabels = Object.keys(merkMap);
const barData   = Object.values(merkMap);

if (barLabels.length > 0) {
  new Chart(document.getElementById("barChart"), {
    type: "bar",
    data: { labels: barLabels, datasets: [{ label: "Stok", data: barData, backgroundColor: "#a8c4ff", borderColor: "#111", borderWidth: 1.5, borderRadius: 6 }] },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { font: { family: "Poppins", size: 11 } } }, x: { ticks: { font: { family: "Poppins", size: 11 } } } } },
  });
} else {
  document.getElementById("barChart").style.display = "none";
  document.getElementById("barEmpty").style.display = "block";
}

// ============================================================
//  PIE CHART — Distribusi Metode Pembayaran Stock Out
// ============================================================
const paymentLabels = Object.keys(paymentCount);
const paymentData   = Object.values(paymentCount);
const paymentColors = ["#16A085","#2980B9","#8E44AD","#F39C12","#E74C3C","#27AE60","#D35400"];

const paymentPieCanvas = document.getElementById("paymentPieChart");
const paymentPieEmpty  = document.getElementById("paymentPieEmpty");

if (paymentLabels.length > 0) {
  if (paymentPieEmpty) paymentPieEmpty.style.display = "none";
  new Chart(paymentPieCanvas, {
    type: "doughnut",
    data: { labels: paymentLabels, datasets: [{ data: paymentData, backgroundColor: paymentColors, borderWidth: 2, borderColor: "#111", hoverOffset: 16 }] },
    options: { plugins: { legend: { position: "bottom", labels: { font: { family: "Poppins", size: 11 }, boxWidth: 12 } } } },
  });
} else {
  if (paymentPieCanvas) paymentPieCanvas.style.display = "none";
  if (paymentPieEmpty)  paymentPieEmpty.style.display  = "block";
}

// ── Legend bar jumlah transaksi per metode ──
const paymentLegend      = document.getElementById("paymentLegend");
const paymentLegendEmpty = document.getElementById("paymentLegendEmpty");

if (paymentLabels.length > 0 && paymentLegend) {
  if (paymentLegendEmpty) paymentLegendEmpty.style.display = "none";
  const maxVal = Math.max(...paymentData);
  paymentLegend.innerHTML = paymentLabels.map((label, i) => `
    <div class="payment-legend-item">
      <div class="pl-label">
        <span class="pl-dot" style="background:${paymentColors[i % paymentColors.length]}"></span>
        ${label}
      </div>
      <div class="pl-bar-wrap">
        <div class="pl-bar" style="width:${Math.round((paymentData[i]/maxVal)*100)}%;background:${paymentColors[i % paymentColors.length]}"></div>
      </div>
      <span class="pl-count">${paymentData[i]}x</span>
    </div>
  `).join("");
} else {
  if (paymentLegend)      paymentLegend.innerHTML = "";
  if (paymentLegendEmpty) paymentLegendEmpty.style.display = "block";
}

// ============================================================
//  TABEL INVOICE MASUK TERBARU
// ============================================================
const tbody = document.getElementById("recentTableBody");
if (!invoiceList.length) {
  tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Belum ada invoice</td></tr>';
} else {
  tbody.innerHTML = "";
  invoiceList.slice().reverse().forEach((inv, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td><a href="invoice.html?id=${encodeURIComponent(inv.invoice)}"
          style="color:rgb(16,44,168);font-weight:600;text-decoration:underline">${inv.invoice}</a></td>
      <td>${inv.supplier}</td>
      <td>${fmtTgl(inv.tanggal)}</td>
      <td>${inv.total || 0} unit</td>
      <td><span class="badge badge-green">Masuk</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// ============================================================
//  TABEL INVOICE KELUAR TERBARU
// ============================================================
const tbodyOut = document.getElementById("recentOutTableBody");
if (!stockOutList.length) {
  tbodyOut.innerHTML = '<tr><td colspan="6" class="empty-state">Belum ada stock out</td></tr>';
} else {
  tbodyOut.innerHTML = "";
  stockOutList.slice().reverse().forEach((inv, idx) => {
    const totalItem = (inv.items || []).reduce((s, it) => s + (it.jumlah || it.jumlahKeluar || 0), 0);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td><a href="invoiceKeluar.html?id=${encodeURIComponent(inv.id)}"
          style="color:rgb(16,44,168);font-weight:600;text-decoration:underline">${inv.id}</a></td>
      <td>${inv.penerima || "—"}</td>
      <td>${fmtTgl(inv.tanggal)}</td>
      <td><span class="badge badge-purple">${inv.paymentNama || "—"}</span></td>
      <td>${totalItem} item</td>
    `;
    tbodyOut.appendChild(tr);
  });
}