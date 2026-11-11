/* Baytak Noor Admin — persistent demo store */
(() => {
  "use strict";

  window.Admin = window.Admin || {};

  const STORAGE_KEY = "baytakNoorAdminClone.v1";

  const store = {
    data: null,

    init() {
      let saved = null;
      try {
        saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      } catch {
        saved = null;
      }
      const seed = Admin.deepClone(Admin.seed);
      if (saved && typeof saved === "object") {
        this.data = { ...seed, ...saved };
        ["settings", "ai", "profile", "abandoned"].forEach((key) => {
          if (saved[key] && typeof saved[key] === "object") {
            this.data[key] = { ...seed[key], ...saved[key] };
          }
        });
        this.data.settings = {
          ...seed.settings,
          ...(saved.settings || {}),
          theme: { ...seed.settings.theme, ...(saved.settings?.theme || {}) },
          shipping: { ...seed.settings.shipping, ...(saved.settings?.shipping || {}) },
          payments: { ...seed.settings.payments, ...(saved.settings?.payments || {}) },
          couriers: { ...seed.settings.couriers, ...(saved.settings?.couriers || {}) },
          emailSettings: { ...seed.settings.emailSettings, ...(saved.settings?.emailSettings || {}) },
          tracking: { ...seed.settings.tracking, ...(saved.settings?.tracking || {}) },
          social: { ...seed.settings.social, ...(saved.settings?.social || {}) },
          seo: { ...seed.settings.seo, ...(saved.settings?.seo || {}) },
        };
        this.data.ai = {
          ...seed.ai,
          ...(saved.ai || {}),
          areas: { ...seed.ai.areas, ...(saved.ai?.areas || {}) },
        };
      } else {
        this.data = seed;
      }
      this.save();
      return this.data;
    },

    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch {
        /* Storage can be unavailable or full; the UI still works in memory. */
      }
    },

    get(key) {
      return this.data[key];
    },

    set(key, value) {
      this.data[key] = value;
      this.save();
      return value;
    },

    list(key) {
      const value = this.data[key];
      return Array.isArray(value) ? value : [];
    },

    byId(key, id) {
      return this.list(key).find((row) => row.id === id) || null;
    },

    add(key, item) {
      const row = { id: Admin.uid(key.slice(0, 3)), ...item };
      this.data[key] = Array.isArray(this.data[key]) ? this.data[key] : [];
      this.data[key].unshift(row);
      this.save();
      return row;
    },

    update(key, id, patch) {
      const row = this.byId(key, id);
      if (!row) return null;
      Object.assign(row, patch);
      this.save();
      return row;
    },

    remove(key, id) {
      const list = this.list(key);
      const index = list.findIndex((row) => row.id === id);
      if (index === -1) return null;
      const [removed] = list.splice(index, 1);
      this.save();
      return removed;
    },

    archiveItem(collection, entity, label, payload) {
      this.add("archive", {
        collection,
        entity,
        label,
        payload: Admin.deepClone(payload),
        deletedAt: new Date().toISOString(),
      });
    },

    restoreArchive(id) {
      const entry = this.byId("archive", id);
      if (!entry) return null;
      if (entry.collection === "parts") {
        const product = this.byId("products", entry.payload.productId);
        if (product) {
          product.variants = product.variants || [];
          product.variants.push({ ...entry.payload, id: Admin.uid("var") });
          product.stock = product.variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
        }
      } else {
        const list = this.list(entry.collection);
        const payload = { ...entry.payload, id: Admin.uid(entry.collection.slice(0, 3)) };
        if (entry.collection === "products" && !payload.variants) payload.variants = [];
        list.unshift(payload);
      }
      this.remove("archive", id);
      this.save();
      return entry;
    },

    purgeArchive(id) {
      return this.remove("archive", id);
    },

    productById(id) {
      return this.byId("products", id);
    },

    productName(id) {
      return this.byId("products", id)?.name || "Deleted product";
    },

    variants() {
      const rows = [];
      this.list("products").forEach((product) => {
        (product.variants || []).forEach((variant) => {
          rows.push({ ...variant, productId: product.id, productName: product.name, category: product.category, status: product.status });
        });
      });
      return rows;
    },

    reset() {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      this.data = Admin.deepClone(Admin.seed);
      this.save();
    },

    applyTheme() {
      const theme = this.data.settings?.theme || {};
      const root = document.documentElement;
      if (theme.primary) root.style.setProperty("--primary", theme.primary);
      if (theme.accent) root.style.setProperty("--accent", theme.accent);
      if (theme.radius) root.style.setProperty("--radius", theme.radius);
      if (theme.font) root.style.setProperty("--font-sans", `"${theme.font}", system-ui, sans-serif`);
    },
  };

  Admin.store = store;
})();
