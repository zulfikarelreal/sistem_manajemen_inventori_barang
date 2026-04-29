/* ============================================================
   SIDEBAR COMPONENT — sidebar.js
   Include file ini di setiap halaman yang pakai sidebar.
   Pastikan auth.js di-load SEBELUM sidebar.js.

   Cara tandai menu aktif, panggil di script halaman kamu:
       setActiveMenu("menu-dashboard");
       setActiveMenu("menu-inputBarang");
       setActiveMenu("menu-penjualan");
   ============================================================ */

(function () {
  // ===== GUARD: ambil loggedUser dengan aman =====
  const loggedUser =
    (typeof window.loggedUser !== "undefined" && window.loggedUser) ||
    localStorage.getItem("loggedUser") ||
    "Admin";

  // Redirect ke login jika belum login
  if (!localStorage.getItem("isLoggedIn")) {
    window.location.href = "login.html";
    return;
  }

  // ===== ISI INFO USER =====
  const usernameEl = document.getElementById("sidebarUsername");
  const avatarEl   = document.getElementById("sidebarAvatar");
  if (usernameEl) usernameEl.textContent = loggedUser;
  if (avatarEl)   avatarEl.textContent   = loggedUser.charAt(0).toUpperCase();

  // ===== SIDEBAR TOGGLE =====
  const sidebar   = document.getElementById("sidebar");
  const overlay   = document.getElementById("sidebarOverlay");
  const hamburger = document.getElementById("hamburger");
  const closeBtn  = document.getElementById("sidebarClose");

  function openSidebar() {
    sidebar.classList.add("open");
    overlay.classList.add("active");
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("active");
  }

  if (hamburger) hamburger.addEventListener("click", openSidebar);
  if (closeBtn)  closeBtn.addEventListener("click", closeSidebar);
  if (overlay)   overlay.addEventListener("click", closeSidebar);

  // ===== LOGOUT =====
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("loggedUser");
      window.location.href = "login.html";
    });
  }
})();

/**
 * Tandai menu aktif di sidebar.
 * Panggil fungsi ini di script masing-masing halaman.
 *
 * @param {string} menuId - ID elemen <a> menu yang aktif
 * @example
 *   setActiveMenu("menu-dashboard");
 *   setActiveMenu("menu-inputBarang");
 *   setActiveMenu("menu-penjualan");
 */
function setActiveMenu(menuId) {
  // Hapus active dari semua menu dulu
  document.querySelectorAll(".sidebar-menu li a").forEach((el) => {
    el.classList.remove("active");
  });
  // Pasang active ke menu yang sesuai
  const target = document.getElementById(menuId);
  if (target) target.classList.add("active");
}
