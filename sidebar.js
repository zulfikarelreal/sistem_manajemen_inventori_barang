/**
 * sidebar.js — StokMaster Inventory System
 * Usage: <script src="sidebar.js" defer></script>
 *
 * Depends on these HTML class/id hooks:
 *   .nav-item       — top-level nav links
 *   .nav-sub        — sub-menu links (inside Linked Data)
 *   #linkedToggle   — collapse/expand button for Linked Data
 *   #linkedChildren — collapsible children wrapper
 *   #sidebar        — the <aside> sidebar element
 *   #overlay        — mobile dark overlay
 *   .main__heading  — page heading text (updated on sub-nav click)
 */

(function () {
  'use strict';

  /* ── Helpers ── */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  /* ── Active state: top-level nav items ── */
  function setActive(el) {
    $$('.nav-item').forEach((i) => i.classList.remove('active'));
    el.classList.add('active');

    // Also clear any active sub-items when a top nav is clicked
    $$('.nav-sub').forEach((i) => i.classList.remove('active'));

    // Update page heading
    const label = el.textContent.trim().replace(/\d+/g, '').trim(); // strip badge number
    const heading = $('.main__heading');
    if (heading) heading.textContent = label;

    // Close sidebar on mobile
    if (window.innerWidth <= 768) closeSidebar();
  }

  /* ── Active state: sub-menu items (Linked Data) ── */
  function setSubActive(el) {
    $$('.nav-sub').forEach((i) => i.classList.remove('active'));
    el.classList.add('active');

    // Clear top-level active
    $$('.nav-item').forEach((i) => i.classList.remove('active'));

    // Update page heading
    const heading = $('.main__heading');
    if (heading) heading.textContent = el.textContent.trim();

    // Close sidebar on mobile
    if (window.innerWidth <= 768) closeSidebar();
  }

  /* ── Toggle Linked Data group open/close ── */
  function toggleGroup() {
    const toggle = $('#linkedToggle');
    const children = $('#linkedChildren');
    if (!toggle || !children) return;

    toggle.classList.toggle('open');
    children.classList.toggle('open');
  }

  /* ── Mobile sidebar open/close ── */
  function toggleSidebar() {
    $('#sidebar').classList.toggle('mobile-open');
    $('#overlay').classList.toggle('active');
  }

  function closeSidebar() {
    $('#sidebar').classList.remove('mobile-open');
    $('#overlay').classList.remove('active');
  }

  /* ── Bind events after DOM ready ── */
  document.addEventListener('DOMContentLoaded', function () {

    // Top-level nav items
    $$('.nav-item').forEach((item) => {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        setActive(this);
      });
    });

    // Sub-menu items
    $$('.nav-sub').forEach((item) => {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        setSubActive(this);
      });
    });

    // Linked Data toggle button
    const linkedToggle = $('#linkedToggle');
    if (linkedToggle) {
      linkedToggle.addEventListener('click', toggleGroup);
    }

    // Mobile hamburger button
    const hamburger = document.querySelector('.hamburger');
    if (hamburger) {
      hamburger.addEventListener('click', toggleSidebar);
    }

    // Mobile overlay click to close
    const overlay = $('#overlay');
    if (overlay) {
      overlay.addEventListener('click', closeSidebar);
    }

    // Close sidebar on Escape key (accessibility)
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeSidebar();
    });

    // Re-close on resize if switching to desktop
    window.addEventListener('resize', function () {
      if (window.innerWidth > 768) closeSidebar();
    });
  });

  /* ── Expose public API (optional, for external use) ── */
  window.Sidebar = {
    toggle: toggleSidebar,
    open: function () {
      $('#sidebar').classList.add('mobile-open');
      $('#overlay').classList.add('active');
    },
    close: closeSidebar,
    toggleGroup: toggleGroup,
  };

})();
