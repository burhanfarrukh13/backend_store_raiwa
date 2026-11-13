/* Baytak Noor Admin — Live API Integration & Store Bridge */
(() => {
  "use strict";

  window.Admin = window.Admin || {};

  const API_BASE = "";

  function getAuthHeader() {
    const token = localStorage.getItem("baytak_admin_token") || "session-master";
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    };
  }

  // Live API client for Admin panel
  Admin.api = {
    async get(path) {
      const res = await fetch(`${API_BASE}${path}`, {
        headers: getAuthHeader()
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },

    async post(path, body) {
      const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    },

    async put(path, body) {
      const res = await fetch(`${API_BASE}${path}`, {
        method: "PUT",
        headers: getAuthHeader(),
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    },

    async delete(path) {
      const res = await fetch(`${API_BASE}${path}`, {
        method: "DELETE",
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    },

    // Media library upload helper
    async uploadMedia(fileDataUri, fileName, altText) {
      return this.post("/api/admin/media-library", {
        file: fileDataUri,
        name: fileName,
        alt: altText
      });
    }
  };

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
      } else {
        this.data = seed;
      }
      this.save();
      this.syncLiveCatalog();
      return this.data;
    },

    // Sync real products, categories and media from backend API into admin view
    async syncLiveCatalog() {
      try {
        const [prodRes, catRes, mediaRes] = await Promise.allSettled([
          Admin.api.get("/api/admin/products"),
          Admin.api.get("/api/admin/categories"),
          Admin.api.get("/api/admin/media-library")
        ]);

        let changed = false;

        if (prodRes.status === "fulfilled" && prodRes.value?.data) {
          const apiProducts = prodRes.value.data;
          if (Array.isArray(apiProducts)) {
            this.data.products = apiProducts;
            changed = true;
          }
        }

        if (catRes.status === "fulfilled" && catRes.value?.data) {
          const apiCats = catRes.value.data;
          if (Array.isArray(apiCats)) {
            this.data.categories = apiCats.map(c => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
              status: c.status === 'active' ? 'Active' : 'Draft',
              description: c.description || ''
            }));
            changed = true;
          }
        }

        if (mediaRes.status === "fulfilled" && mediaRes.value?.data) {
          const apiMedia = mediaRes.value.data;
          if (Array.isArray(apiMedia)) {
            this.data.media = apiMedia;
            changed = true;
          }
        }

        if (changed) {
          this.save();
          if (typeof Admin.rerender === "function") Admin.rerender();
        }
      } catch (err) {
        console.warn("Live API sync notice:", err);
      }
    },

    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch {}
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

    // Creates item in local state and dispatches live API call if supported
    add(key, item) {
      const row = { id: item.id || Admin.uid(key.slice(0, 3)), ...item };
      this.data[key] = Array.isArray(this.data[key]) ? this.data[key] : [];
      this.data[key].unshift(row);
      this.save();

      // Background sync to live API
      if (key === "products") {
        Admin.api.post("/api/admin/products", item)
          .then(res => {
            if (res.data?.id) row.id = res.data.id;
            this.save();
          })
          .catch(err => console.error("API create product error:", err));
      } else if (key === "categories") {
        Admin.api.post("/api/admin/categories", {
          name: item.name,
          slug: item.slug || item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: item.description,
          status: 'active'
        }).catch(err => console.error("API create category error:", err));
      }

      return row;
    },

    update(key, id, patch) {
      const row = this.byId(key, id);
      if (!row) return null;
      Object.assign(row, patch);
      this.save();

      if (key === "products") {
        Admin.api.put(`/api/admin/products?id=${encodeURIComponent(id)}`, patch)
          .catch(err => console.error("API update product error:", err));
      } else if (key === "categories") {
        Admin.api.put(`/api/admin/categories?id=${encodeURIComponent(id)}`, patch)
          .catch(err => console.error("API update category error:", err));
      }

      return row;
    },

    remove(key, id) {
      const list = this.list(key);
      const index = list.findIndex((row) => row.id === id);
      if (index === -1) return null;
      const [removed] = list.splice(index, 1);
      this.save();

      if (key === "products") {
        Admin.api.delete(`/api/admin/products?id=${encodeURIComponent(id)}`)
          .catch(err => console.error("API delete product error:", err));
      } else if (key === "categories") {
        Admin.api.delete(`/api/admin/categories?id=${encodeURIComponent(id)}`)
          .catch(err => console.error("API delete category error:", err));
      } else if (key === "media") {
        Admin.api.delete(`/api/admin/media-library?id=${encodeURIComponent(id)}`)
          .catch(err => console.error("API delete media error:", err));
      }

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
      const list = this.list(entry.collection);
      const payload = { ...entry.payload, id: Admin.uid(entry.collection.slice(0, 3)) };
      list.unshift(payload);
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
          rows.push({
            ...variant,
            productId: product.id,
            productName: product.name,
            category: product.category,
            status: product.status
          });
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
