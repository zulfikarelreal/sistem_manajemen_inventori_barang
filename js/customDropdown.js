/* ============================================================
   CUSTOM DROPDOWN — customDropdown.js
   Taruh di: js/customDropdown.js
   
   Cara pakai:
     const dd = new CustomDropdown("cdSupplier", "supplier");
     dd.getValue();   // ambil nilai yang diketik / dipilih
     dd.setValue("PT ABC"); // set nilai dari luar
     dd.clear();      // reset
     dd.refresh();    // reload opsi dari linkedData

   linkedData helper (getLinkedData / autoAddToLinkedData)
   juga diexport dari sini supaya tidak perlu duplikat di tiap halaman.
   ============================================================ */

// ===== LINKED DATA HELPERS (shared) =====

function getLinkedData() {
  try {
    const raw = localStorage.getItem("linkedData");
    const d = raw ? JSON.parse(raw) : {};
    return {
      kategori: d.kategori || [],
      merk: d.merk || [],
      supplier: d.supplier || [],
      barang: d.barang || [],
      lokasi: d.lokasi || [],
      penerima: d.penerima || [],
    };
  } catch {
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
  localStorage.setItem("linkedData", JSON.stringify(data));
}

/**
 * Tambahkan item ke linkedData[type] jika belum ada (case-insensitive).
 * @param {string} type  - "supplier" | "barang" | "kategori" | "merk" | "lokasi"
 * @param {string} nama
 */
function autoAddToLinkedData(type, nama) {
  if (!nama || !nama.trim()) return;
  const all = getLinkedData();
  if (!all[type]) return;
  const exists = all[type].some(
    (item) => item.nama.toLowerCase() === nama.trim().toLowerCase(),
  );
  if (!exists) {
    all[type].push({ nama: nama.trim() });
    saveLinkedData(all);
  }
}

// ===== CUSTOM DROPDOWN CLASS =====

/**
 * @param {string} wrapperId  - id dari .cd-wrapper element
 * @param {string} linkedType - key di linkedData: "supplier"|"barang"|"kategori"|"merk"|"lokasi"
 * @param {object} [opts]
 * @param {string} [opts.icon] - boxicon class untuk tiap item (contoh: "bx-store")
 */
class CustomDropdown {
  constructor(wrapperId, linkedType, opts = {}) {
    this.wrapper = document.getElementById(wrapperId);
    this.linkedType = linkedType;
    this.icon = opts.icon || "bx-circle";

    if (!this.wrapper) {
      console.warn(`CustomDropdown: wrapper #${wrapperId} tidak ditemukan`);
      return;
    }

    this.inputRow = this.wrapper.querySelector(".cd-input-row");
    this.mainInput = this.wrapper.querySelector(".cd-input");
    this.arrow = this.wrapper.querySelector(".cd-arrow");
    this.dropdown = this.wrapper.querySelector(".cd-dropdown");
    this.searchEl = this.wrapper.querySelector(".cd-search");
    this.list = this.wrapper.querySelector(".cd-list");
    this.emptyEl = this.wrapper.querySelector(".cd-empty");

    this._allOptions = [];
    this._open = false;

    this._bindEvents();
    this.refresh();
  }

  // ===== PUBLIC =====

  getValue() {
    return this.mainInput ? this.mainInput.value.trim() : "";
  }

  setValue(val) {
    if (this.mainInput) this.mainInput.value = val;
    this._highlightSelected(val);
  }

  clear() {
    if (this.mainInput) this.mainInput.value = "";
    if (this.searchEl) this.searchEl.value = "";
    this._renderList(this._allOptions);
    this.close();
  }

  refresh() {
    const data = getLinkedData()[this.linkedType] || [];
    this._allOptions = data.map((item) => item.nama);
    this._renderList(this._allOptions);
  }

  open() {
    this.refresh(); // selalu load terbaru
    this.wrapper.classList.add("open");
    this._open = true;
    if (this.searchEl) {
      this.searchEl.value = "";
      this._renderList(this._allOptions);
      setTimeout(() => this.searchEl.focus(), 50);
    }
  }

  close() {
    this.wrapper.classList.remove("open");
    this._open = false;
    if (this.searchEl) this.searchEl.value = "";
  }

  // ===== PRIVATE =====

  _bindEvents() {
    // Klik input row atau arrow → toggle dropdown
    this.inputRow.addEventListener("click", (e) => {
      // Kalau klik di dalam main input text — biarkan cursor; toggle saat klik arrow atau padding
      if (e.target === this.mainInput) {
        if (!this._open) this.open();
        return;
      }
      this._open ? this.close() : this.open();
    });

    // Ketik di main input → filter dropdown real-time
    this.mainInput.addEventListener("input", () => {
      const q = this.mainInput.value.trim().toLowerCase();
      const filtered = this._allOptions.filter((o) =>
        o.toLowerCase().includes(q),
      );
      if (!this._open) this.open();
      this._renderList(filtered, q);
    });

    // Cari di search box dalam dropdown
    this.searchEl.addEventListener("input", () => {
      const q = this.searchEl.value.trim().toLowerCase();
      const filtered = this._allOptions.filter((o) =>
        o.toLowerCase().includes(q),
      );
      this._renderList(filtered, q);
    });

    // Tutup kalau klik di luar
    document.addEventListener("click", (e) => {
      if (this._open && !this.wrapper.contains(e.target)) {
        this.close();
      }
    });

    // Keyboard: Escape
    this.mainInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
    });
  }

  _renderList(options, highlight = "") {
    this.list.innerHTML = "";

    if (options.length === 0) {
      // Tampilkan pesan sesuai kondisi
      if (this._allOptions.length === 0) {
        // Belum ada data sama sekali
        this.emptyEl.style.display = "block";
      } else {
        // Ada data tapi tidak cocok filter
        this.emptyEl.style.display = "none";
        const noResult = document.createElement("li");
        noResult.className = "cd-no-result";
        noResult.textContent = `Tidak ditemukan. Ketik manual lalu simpan.`;
        this.list.appendChild(noResult);
      }
      return;
    }

    this.emptyEl.style.display = "none";

    const currentVal = this.mainInput.value.trim().toLowerCase();
    options.forEach((opt) => {
      const li = document.createElement("li");

      // Highlight teks yang cocok
      if (highlight) {
        const idx = opt.toLowerCase().indexOf(highlight);
        if (idx >= 0) {
          const before = opt.slice(0, idx);
          const match = opt.slice(idx, idx + highlight.length);
          const after = opt.slice(idx + highlight.length);
          li.innerHTML = `<i class='bx ${this.icon}'></i>${before}<strong>${match}</strong>${after}`;
        } else {
          li.innerHTML = `<i class='bx ${this.icon}'></i>${opt}`;
        }
      } else {
        li.innerHTML = `<i class='bx ${this.icon}'></i>${opt}`;
      }

      if (opt.toLowerCase() === currentVal) {
        li.classList.add("selected");
      }

      li.addEventListener("click", () => {
        this.mainInput.value = opt;
        this._highlightSelected(opt);
        this.close();
        // Trigger input event supaya validasi di luar bisa dengar
        this.mainInput.dispatchEvent(new Event("change", { bubbles: true }));
      });

      this.list.appendChild(li);
    });
  }

  _highlightSelected(val) {
    this.list.querySelectorAll("li").forEach((li) => {
      li.classList.toggle(
        "selected",
        li.textContent.trim().toLowerCase() === val.toLowerCase(),
      );
    });
  }
}
