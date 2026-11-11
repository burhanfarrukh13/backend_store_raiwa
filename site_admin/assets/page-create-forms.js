/* Baytak Noor Admin — exact live-style create/edit forms for catalog records */
(() => {
  "use strict";

  window.Admin = window.Admin || {};
  Admin.pages = Admin.pages || {};

  const { svg, esc, badge } = Admin;

  const slugify = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const section = (title, description, body) => `<section class="form-section">
    <div class="form-section-head"><h3>${title}</h3>${description ? `<p>${description}</p>` : ""}</div>
    ${body}
  </section>`;

  const field = (config, values) => Admin.fieldHTML(config, values);

  const checkList = (name, options, selected, emptyText = "Nothing available yet.") => {
    if (!options.length) return `<p class="muted small">${emptyText}</p>`;
    return `<div class="check-grid">${options
      .map(
        (option) => `<label class="check-card"><input type="checkbox" name="${name}" value="${esc(option.value)}"${
          selected.includes(String(option.value)) ? " checked" : ""
        }><span class="check-card-box">${svg("check")}</span><span>${esc(option.label)}</span></label>`
      )
      .join("")}</div>`;
  };

  const galleryMarkup = (images) =>
    images.length
      ? images
          .map(
            (src, index) => `<div class="image-tile">
              <img src="${esc(src)}" alt="Product media ${index + 1}">
              ${index === 0 ? '<span class="image-cover">Cover</span>' : ""}
              <button type="button" class="image-remove" data-remove-image="${index}" title="Remove image">${svg("x")}</button>
            </div>`
          )
          .join("")
      : `<div class="image-empty">${svg("media")}<span>No media attached</span><small>Add high-resolution images for the product gallery.</small></div>`;

  const variantMarkup = (variant) => `<div class="variant-row" data-vid="${esc(variant.id || "")}">
    <input class="input" data-v="size" placeholder="Bedding size / fit" value="${esc(variant.size || "")}">
    <input class="input" data-v="color" placeholder="Colour" value="${esc(variant.color || "")}">
    <input class="input" data-v="sku" placeholder="Variant SKU" value="${esc(variant.sku || "")}">
    <input class="input" data-v="price" type="number" min="0" placeholder="Price" value="${esc(variant.price ?? 0)}">
    <input class="input" data-v="stock" type="number" min="0" placeholder="Stock" value="${esc(variant.stock ?? 0)}">
    <button type="button" class="icon-btn danger" data-remove-variant title="Remove variant">${svg("trash")}</button>
  </div>`;

  /* ---------------------------------------------------------------------
     Product form — mirrors the live Create New Product sections
     --------------------------------------------------------------------- */

  function openProductForm(row, after) {
    const suppliers = Admin.store.list("suppliers").map((supplier) => supplier.name);
    const categoryNames = Admin.store.list("categories").map((category) => category.name);
    const collectionNames = Admin.store.list("collections").map((collection) => collection.name);
    const product = row
      ? Admin.deepClone(row)
      : {
          name: "", slug: "", description: "", specSize: "", specFabric: "", specIncluded: "",
          price: 0, compareAt: 0, cost: 0, expenses: 0, sku: "", stock: 0,
          status: "Active", brand: "Baytak Noor", supplier: "", supplierCode: "", featured: false,
          seoTitle: "", seoDescription: "", categories: [], collections: [], images: [], variants: [],
        };

    let images = product.images?.length ? [...product.images] : product.image ? [product.image] : [];
    let variants = Admin.deepClone(product.variants || []);
    let selectedCategories = product.categories?.length ? product.categories : product.category ? [product.category] : [];
    let selectedCollections = product.collections || [];
    let enableVariants = variants.length > 0;
    let slugTouched = Boolean(product.slug);
    let skuTouched = Boolean(product.sku);

    const value = { ...product, categories: selectedCategories, collections: selectedCollections };

    const body = `<form id="productForm" class="create-form">
      ${section(
        "Basic Information",
        "The product name, URL handle and the long description shown on the product page.",
        `<div class="form-grid">
          ${field({ name: "name", label: "Product Name", required: true, full: true, placeholder: "e.g. Sateen Sheet Set — Ivory" }, value)}
          ${field({ name: "slug", label: "Slug (URL Handle)", required: true, placeholder: "e.g. sateen-sheet-set-ivory" }, value)}
          ${field({ name: "description", label: "Description", type: "textarea", full: true, rows: 5, required: true, placeholder: "Detailed specifications, materials, sizing, and features..." }, value)}
        </div>`
      )}
      ${section(
        "Product Specifications & Key Highlights (PDP Bullets)",
        "These three points appear directly below the price on the storefront product page.",
        `<div class="form-grid">
          ${field({ name: "specSize", label: "Bedding Size", placeholder: "Default: King (270×260cm)" }, value)}
          ${field({ name: "specFabric", label: "Fabric / Quality", placeholder: "Default: 100% Pure Cotton" }, value)}
          ${field({ name: "specIncluded", label: "Bedding Included / Items", full: true, placeholder: "Default: 1 Sheet + 2 Pillows" }, value)}
        </div>`
      )}
      ${section(
        "Pricing & Valuation",
        "Customer-facing prices. The compare price shows as a strike-through original price.",
        `<div class="form-grid">
          ${field({ name: "price", label: "Retail Price (Rs.)", type: "number", min: 0, required: true }, value)}
          ${field({ name: "compareAt", label: "Compare Price (Original / Strike-through)", type: "number", min: 0 }, value)}
        </div>`
      )}
      ${section(
        "Cost & Profit Analytics (Admin Only)",
        "Internal cost and fulfillment expenses. Used for profit & loss intelligence and never shown to customers.",
        `<div class="form-grid">
          ${field({ name: "cost", label: "Cost Price (COGS)", type: "number", min: 0, help: "What it costs you to manufacture or acquire this item." }, value)}
          ${field({ name: "expenses", label: "Expenses (Shipping & Packaging)", type: "number", min: 0, help: "Courier delivery, flyer packaging and handling costs." }, value)}
        </div>`
      )}
      ${section(
        "Inventory & Fulfillment",
        "Stock is tracked at product level for a single SKU, or through variants when enabled below.",
        `<div class="form-grid">
          <div class="field">
            <div class="subhead-row"><label for="f_sku">SKU (Stock Keeping Unit) *</label><button type="button" class="btn btn-secondary btn-sm" data-auto-sku>${svg("refresh")}Auto-Generate</button></div>
            <input class="input" id="f_sku" name="sku" required value="${esc(product.sku)}" placeholder="e.g. BN-SAT-IVR">
          </div>
          <div class="field" data-simple-stock><label for="f_stock">On-Hand Stock Quantity *</label>
            <input class="input" id="f_stock" name="stock" type="number" min="0" data-numeric="1" value="${esc(product.stock)}">
          </div>
        </div>`
      )}
      ${section(
        "Product Media Gallery",
        "Upload multiple images for the product gallery. The first image becomes the cover.",
        `<div class="field full">
          <div class="image-grid" id="productImageGrid">${galleryMarkup(images)}</div>
          <div class="row-gap-8">
            <label class="btn btn-secondary btn-sm" for="productImageInput">${svg("upload")}Add Images</label>
            <input id="productImageInput" type="file" accept="image/*" multiple hidden>
            <span class="hint">Up to 20 images, 800 KB each in this demo.</span>
          </div>
        </div>`
      )}
      ${section(
        "Variants Matrix & Option Layers",
        "Configure sizes, colours, per-variant SKUs and stock. Leave off for a single-SKU product.",
        `<label class="check-card check-card-inline"><input type="checkbox" id="enableVariants"${enableVariants ? " checked" : ""}><span class="check-card-box">${svg("check")}</span><span>Enable Variants</span></label>
        <div class="variant-section" id="variantSection"${enableVariants ? "" : " hidden"}>
          <div class="subhead-row"><span class="hint">Each row becomes a purchasable variant.</span><span class="muted small" id="variantCount">${variants.length} variant(s)</span></div>
          <div class="variant-list" id="variantRows">${variants.length ? variants.map(variantMarkup).join("") : '<p class="muted small">No variants yet.</p>'}</div>
          <button type="button" class="btn btn-secondary btn-sm" data-add-variant>${svg("plus")}Add variant</button>
        </div>`
      )}
      ${section(
        "Status & Organization",
        "Visibility, supplier attribution and homepage merchandising.",
        `<div class="form-grid">
          ${field({ name: "status", label: "Product Status", type: "select", options: ["Active", "Draft", "Archived"] }, value)}
          ${field({ name: "brand", label: "Brand / Vendor", placeholder: "Baytak Noor" }, value)}
          ${field({ name: "supplier", label: "Supplier", type: "select", options: [{ value: "", label: "— None —" }, ...suppliers] }, value)}
          ${field({ name: "supplierCode", label: "Supplier's code / link for this product", placeholder: "Supplier SKU or link" }, value)}
          <label class="check-card check-card-inline full"><input type="checkbox" name="featured"${product.featured ? " checked" : ""}><span class="check-card-box">${svg("check")}</span><span>Feature on Homepage Showcase</span></label>
        </div>`
      )}
      ${section("Categories", "Select one or more categories for storefront taxonomy.", checkList("categories", categoryNames.map((name) => ({ value: name, label: name })), selectedCategories))}
      ${section("Collections", "Assign this product to one or more manual collections.", checkList("collections", collectionNames.map((name) => ({ value: name, label: name })), selectedCollections))}
      ${section(
        "SEO Meta Tags",
        "Search metadata used in search results and social previews.",
        `<div class="form-grid">
          ${field({ name: "seoTitle", label: "SEO Page Title", full: true, placeholder: "Product SEO title (up to 60 characters)" }, value)}
          ${field({ name: "seoDescription", label: "SEO Meta Description", type: "textarea", full: true, rows: 3, placeholder: "Search engine snippet description (up to 160 characters)" }, value)}
        </div>`
      )}
    </form>`;

    Admin.openModal({
      title: row ? "Edit Product" : "Create New Product",
      size: "xl",
      body,
      footer: `<button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>
        <button type="submit" class="btn btn-primary" form="productForm">${row ? "Save Product" : "Publish Product"}</button>`,
      onMount(api) {
        const form = api.el.querySelector("#productForm");
        const imageGrid = api.el.querySelector("#productImageGrid");
        const imageInput = api.el.querySelector("#productImageInput");
        const variantSection = api.el.querySelector("#variantSection");
        const variantRows = api.el.querySelector("#variantRows");
        const simpleStock = api.el.querySelector("[data-simple-stock]");

        const redrawImages = () => {
          imageGrid.innerHTML = galleryMarkup(images);
        };
        const redrawVariants = () => {
          variantRows.innerHTML = variants.length
            ? variants.map(variantMarkup).join("")
            : '<p class="muted small">No variants yet.</p>';
          api.el.querySelector("#variantCount").textContent = `${variants.length} variant(s)`;
        };
        const collectVariants = () => {
          variants = [...form.querySelectorAll(".variant-row")].map((rowEl) => ({
            id: rowEl.dataset.vid || Admin.uid("var"),
            size: rowEl.querySelector('[data-v="size"]').value.trim(),
            color: rowEl.querySelector('[data-v="color"]').value.trim(),
            sku: rowEl.querySelector('[data-v="sku"]').value.trim(),
            price: Number(rowEl.querySelector('[data-v="price"]').value) || 0,
            stock: Number(rowEl.querySelector('[data-v="stock"]').value) || 0,
          }));
        };

        const nameInput = form.querySelector('[name="name"]');
        const slugInput = form.querySelector('[name="slug"]');
        nameInput.addEventListener("input", () => {
          if (!slugTouched) slugInput.value = slugify(nameInput.value);
        });
        slugInput.addEventListener("input", () => {
          slugTouched = true;
        });
        const skuInput = form.querySelector('[name="sku"]');
        skuInput.addEventListener("input", () => {
          skuTouched = true;
        });
        form.querySelector("[data-auto-sku]").addEventListener("click", () => {
          const base = slugify(nameInput.value || "product").toUpperCase().replace(/-/g, "-");
          skuInput.value = `${base.slice(0, 16)}-${Math.floor(100 + Math.random() * 900)}`;
          skuTouched = true;
        });

        api.el.addEventListener("click", (event) => {
          if (event.target.closest("[data-add-variant]")) {
            collectVariants();
            variants.push({
              id: Admin.uid("var"), size: "", color: "", sku: `${skuInput.value || "SKU"}-`,
              price: Number(form.querySelector('[name="price"]').value) || 0, stock: 0,
            });
            redrawVariants();
          }
          if (event.target.closest("[data-remove-variant]")) {
            collectVariants();
            const index = [...api.el.querySelectorAll(".variant-row")].indexOf(event.target.closest(".variant-row"));
            variants.splice(index, 1);
            redrawVariants();
          }
          if (event.target.closest("[data-remove-image]")) {
            images.splice(Number(event.target.closest("[data-remove-image]").dataset.removeImage), 1);
            redrawImages();
          }
        });

        api.el.querySelector("#enableVariants").addEventListener("change", (event) => {
          enableVariants = event.target.checked;
          variantSection.hidden = !enableVariants;
          simpleStock.hidden = enableVariants;
          if (!enableVariants) {
            form.querySelector('[name="stock"]').required = true;
          } else {
            form.querySelector('[name="stock"]').required = false;
          }
        });
        if (enableVariants) form.querySelector('[name="stock"]').required = false;
        if (enableVariants) simpleStock.hidden = true;

        imageInput.addEventListener("change", () => {
          const files = [...(imageInput.files || [])];
          files.forEach((file) => {
            if (images.length >= 20) return;
            if (file.size > 800 * 1024) {
              Admin.toast(`${file.name} is over 800 KB and was skipped.`, "error");
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              images.push(String(reader.result));
              redrawImages();
            };
            reader.readAsDataURL(file);
          });
          imageInput.value = "";
        });

        form.addEventListener("submit", (event) => {
          event.preventDefault();
          if (!form.reportValidity()) return;
          collectVariants();
          const values = Admin.formValues(form);
          selectedCategories = [...form.querySelectorAll('[name="categories"]:checked')].map((input) => input.value);
          selectedCollections = [...form.querySelectorAll('[name="collections"]:checked')].map((input) => input.value);
          if (enableVariants && !variants.length) {
            Admin.toast("Add at least one variant or turn off variants.", "error");
            return;
          }
          const firstImage = images[0] || Admin.placeholder(values.name, "#e9dfd1");
          const finalVariants = enableVariants
            ? variants.map((variant) => ({ ...variant, price: Number(variant.price) || Number(values.price) || 0 }))
            : [{
                id: Admin.uid("var"), size: "", color: "", sku: values.sku,
                price: Number(values.price) || 0, stock: Number(values.stock) || 0,
              }];
          const payload = {
            ...product,
            ...values,
            name: values.name,
            slug: values.slug || slugify(values.name),
            category: selectedCategories[0] || "",
            categories: selectedCategories,
            collections: selectedCollections,
            price: Number(values.price) || 0,
            compareAt: Number(values.compareAt) || 0,
            cost: Number(values.cost) || 0,
            expenses: Number(values.expenses) || 0,
            stock: enableVariants ? finalVariants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0) : Number(values.stock) || 0,
            featured: form.querySelector('[name="featured"]').checked,
            images,
            image: firstImage,
            variants: finalVariants,
            variantMode: enableVariants,
          };
          if (row) Admin.store.update("products", row.id, payload);
          else Admin.store.add("products", payload);
          Admin.closeModal();
          Admin.toast(`Product ${row ? "updated" : "published"}`, "success");
          after?.();
          Admin.rerender();
        });
      },
    });
  }

  Admin.pages.products = {
    render(container) {
      Admin.listPage(container, {
        slug: "products",
        key: "products",
        singular: "product",
        plural: "products",
        entity: "Product",
        title: "Product Catalog",
        subtitle: "Manage your store's products, variants, prices, and availability.",
        searchKeys: ["name", "sku", "category", "brand", "supplier"],
        newLabel: "Create Product",
        customForm: openProductForm,
        filters: [
          {
            key: "status", label: "Product status",
            options: [
              { value: "all", label: "All Statuses" },
              { value: "Active", label: "Active" },
              { value: "Draft", label: "Draft" },
              { value: "Archived", label: "Archived" },
            ],
            match: (row, value) => row.status === value,
          },
        ],
        columns: [
          {
            label: "Product",
            render: (row) => `<div class="product-cell"><img class="thumb" src="${esc(row.image)}" alt="">
              <div><strong>${esc(row.name)}</strong><span>${esc(row.sku)}${row.brand ? ` · ${esc(row.brand)}` : ""}</span></div></div>`,
          },
          { label: "Categories", render: (row) => `<span class="muted">${esc((row.categories || [row.category]).filter(Boolean).join(", ") || "Uncategorized")}</span>` },
          {
            label: "Price",
            render: (row) => `<div class="price-cell"><strong>${Admin.money(row.price)}</strong>${row.compareAt ? `<span>${Admin.money(row.compareAt)}</span>` : ""}</div>`,
          },
          {
            label: "Variants",
            render: (row) => (row.variants?.length > 1 ? `${row.variants.length} variations` : "Single SKU"),
          },
          {
            label: "Stock",
            render: (row) => `<span class="stock-value${Number(row.stock) === 0 ? " out" : Number(row.stock) <= 5 ? " low" : ""}">${row.stock}</span>`,
          },
          { label: "Status", render: (row) => badge(row.status) },
        ],
        rowActions: (row) => `<button type="button" class="icon-btn" data-edit title="Edit">${svg("edit")}</button>
          <button type="button" class="icon-btn" data-act="duplicate" data-id="${esc(row.id)}" title="Duplicate">${svg("copy")}</button>
          <button type="button" class="icon-btn danger" data-delete title="Delete">${svg("trash")}</button>`,
        onAction(act, row) {
          if (act !== "duplicate" || !row) return;
          const copy = Admin.deepClone(row);
          copy.id = Admin.uid("prod");
          copy.name = `${row.name} (copy)`;
          copy.sku = `${row.sku}-COPY`;
          copy.slug = `${row.slug || slugify(row.name)}-copy`;
          copy.status = "Draft";
          copy.createdAt = Admin.DEMO_TODAY;
          copy.variants = (row.variants || []).map((variant) => ({
            ...variant, id: Admin.uid("var"), sku: `${variant.sku}-C`,
          }));
          copy.images = row.images || (row.image ? [row.image] : []);
          Admin.store.add("products", copy);
          Admin.toast("Product duplicated as a draft", "success");
          Admin.rerender();
        },
      });
    },
  };

  /* ---------------------------------------------------------------------
     Category form
     --------------------------------------------------------------------- */

  function openCategoryForm(row, after) {
    const category = row || {
      name: "", slug: "", parent: "", status: "Active", description: "", alt: "",
      cardImage: "", bannerImage: "", productIds: [], seoTitle: "", seoDescription: "",
      featured: false, sort: 0,
    };
    const products = Admin.store.list("products");
    let cardImage = category.cardImage || "";
    let bannerImage = category.bannerImage || "";
    const selected = category.productIds || products.filter((product) => product.category === category.name || (product.categories || []).includes(category.name)).map((product) => product.id);
    let slugTouched = Boolean(category.slug);
    const categoryNames = Admin.store.list("categories").filter((item) => item.id !== row?.id).map((item) => item.name);

    const body = `<form id="categoryForm" class="create-form">
      ${section("General Details", "Category name, URL handle and storefront description.", `<div class="form-grid">
        ${field({ name: "name", label: "Category Name", required: true, full: true, placeholder: "e.g. Bed Sheets" }, category)}
        ${field({ name: "slug", label: "URL Slug", required: true, placeholder: "e.g. bed-sheets" }, category)}
        ${field({ name: "parent", label: "Parent Category", type: "select", options: [{ value: "", label: "No parent (top level)" }, ...categoryNames] }, category)}
        ${field({ name: "description", label: "Description", type: "textarea", full: true, rows: 4, placeholder: "Category description for the storefront..." }, category)}
      </div>`)}
      ${section("Category Imagery (Dual Format)", "Portrait cards and landscape hero banners use separate images.", `<div class="dual-image-grid">
        <div class="image-slot">
          <span class="field-label">1. Portrait / Card Image</span>
          <div class="image-slot-preview" data-slot-preview="card">${cardImage ? `<img src="${esc(cardImage)}" alt="">` : '<span>No portrait/card image</span>'}</div>
          <label class="btn btn-secondary btn-sm" for="cardImageInput">${svg("upload")}Select Card Image</label>
          <input id="cardImageInput" type="file" accept="image/*" hidden>
        </div>
        <div class="image-slot">
          <span class="field-label">2. Landscape / Wide Hero Banner</span>
          <div class="image-slot-preview" data-slot-preview="banner">${bannerImage ? `<img src="${esc(bannerImage)}" alt="">` : '<span>No landscape banner attached</span>'}</div>
          <label class="btn btn-secondary btn-sm" for="bannerImageInput">${svg("upload")}Select Banner</label>
          <input id="bannerImageInput" type="file" accept="image/*" hidden>
        </div>
      </div>
      ${field({ name: "alt", label: "Image Alt Description (Accessibility)", full: true, placeholder: "e.g. Ivory cotton bed sheet set on a styled bed" }, category)}`)}
      ${section("Assigned Products", `Select and organize which products belong to this category. <span class="pill pill-soft">${selected.length} selected</span>`, checkList("productIds", products.map((product) => ({ value: product.id, label: `${product.name} · ${Admin.money(product.price)}` })), selected, "No products yet."))}
      ${section("Search Engine Optimization (SEO)", "Search metadata for the category landing page.", `<div class="form-grid">
        ${field({ name: "seoTitle", label: "Page Title Tag", full: true, placeholder: "Category SEO Title" }, category)}
        ${field({ name: "seoDescription", label: "Meta Description", type: "textarea", full: true, rows: 3, placeholder: "Search engine snippet description..." }, category)}
      </div>`)}
      ${section("Status & Priority", "Storefront visibility and navigation order.", `<div class="form-grid">
        ${field({ name: "status", label: "Status", type: "select", options: ["Active", "Draft"] }, category)}
        ${field({ name: "sort", label: "Navigation Sort Order", type: "number", min: 0 }, category)}
        <label class="check-card check-card-inline full"><input type="checkbox" name="featured"${category.featured ? " checked" : ""}><span class="check-card-box">${svg("check")}</span><span>Feature this category in navigation</span></label>
      </div>`)}
    </form>`;

    Admin.openModal({
      title: row ? "Edit Category" : "Create Category",
      size: "xl",
      body,
      footer: `<button type="button" class="btn btn-secondary" data-modal-close>Cancel</button><button type="submit" class="btn btn-primary" form="categoryForm">${row ? "Save Category" : "Create Category"}</button>`,
      onMount(api) {
        const form = api.el.querySelector("#categoryForm");
        const name = form.querySelector('[name="name"]');
        const slug = form.querySelector('[name="slug"]');
        name.addEventListener("input", () => {
          if (!slugTouched) slug.value = slugify(name.value);
        });
        slug.addEventListener("input", () => { slugTouched = true; });

        const bindImage = (inputId, assign, slot) => {
          const input = api.el.querySelector(inputId);
          input.addEventListener("change", () => {
            const file = input.files?.[0];
            if (!file) return;
            if (file.size > 600 * 1024) {
              Admin.toast("Please choose an image under 600 KB.", "error");
              input.value = "";
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              assign(String(reader.result));
              const preview = api.el.querySelector(`[data-slot-preview="${slot}"]`);
              preview.innerHTML = `<img src="${reader.result}" alt="">`;
            };
            reader.readAsDataURL(file);
          });
        };
        bindImage("#cardImageInput", (value) => { cardImage = value; }, "card");
        bindImage("#bannerImageInput", (value) => { bannerImage = value; }, "banner");

        form.addEventListener("submit", (event) => {
          event.preventDefault();
          if (!form.reportValidity()) return;
          const values = Admin.formValues(form);
          const productIds = [...form.querySelectorAll('[name="productIds"]:checked')].map((input) => input.value);
          const payload = {
            ...category,
            ...values,
            slug: values.slug || slugify(values.name),
            productIds,
            cardImage,
            bannerImage,
            featured: form.querySelector('[name="featured"]').checked,
            sort: Number(values.sort) || 0,
          };
          if (row) Admin.store.update("categories", row.id, payload);
          else Admin.store.add("categories", payload);
          Admin.toast(`Category ${row ? "updated" : "created"}`, "success");
          after?.();
          Admin.rerender();
        });
      },
    });
  }

  Admin.pages.categories = {
    render(container) {
      const state = Admin.uiState.categories || (Admin.uiState.categories = { q: "" });
      const draw = () => {
        const all = Admin.store.list("categories");
        const products = Admin.store.list("products");
        const filtered = state.q
          ? all.filter((category) => `${category.name} ${category.slug} ${category.parent}`.toLowerCase().includes(state.q.toLowerCase()))
          : all;
        const ordered = [...filtered].sort((a, b) => {
          if (a.parent === b.parent) return a.name.localeCompare(b.name);
          if (!a.parent) return -1;
          if (!b.parent) return 1;
          return a.parent.localeCompare(b.parent);
        });
        container.innerHTML = `${Admin.pageHead({
          group: "Catalog",
          title: "Categories Management",
          subtitle: "Organize products into hierarchical storefront taxonomy.",
          actions: `<button class="btn btn-primary" data-cat-new>${svg("plus")}New Category</button>`,
        })}
          <div class="panel">
            <div class="table-toolbar">
              <div class="toolbar-left"><span class="table-search">${svg("search")}<input class="input" id="catSearch" placeholder="Search categories" value="${esc(state.q)}"></span></div>
              <div class="toolbar-right"><span class="result-count">${all.length} categories</span></div>
            </div>
            ${ordered.length
              ? `<div class="table-wrap"><table class="data-table">
                  <thead><tr><th>Category</th><th>Slug</th><th>Parent</th><th>Products</th><th>Status</th><th class="th-actions">Actions</th></tr></thead>
                  <tbody>${ordered
                    .map((category) => {
                      const count = category.productIds?.length ?? products.filter((product) => product.category === category.name || (product.categories || []).includes(category.name)).length;
                      return `<tr data-id="${esc(category.id)}">
                        <td><span class="tree-name${category.parent ? " child" : ""}">${esc(category.name)}</span><span class="cell-sub">${esc(category.description || "")}</span></td>
                        <td class="mono small">/collections/${esc(category.slug)}</td>
                        <td class="muted">${esc(category.parent || "Top level")}</td>
                        <td>${count}</td>
                        <td>${badge(category.status)}</td>
                        <td class="table-actions">
                          <button class="icon-btn" data-cat-edit="${esc(category.id)}" title="Edit">${svg("edit")}</button>
                          <button class="icon-btn danger" data-cat-delete="${esc(category.id)}" title="Delete">${svg("trash")}</button>
                        </td>
                      </tr>`;
                    })
                    .join("")}</tbody>
                </table></div>`
              : Admin.emptyState({ icon: "category", title: "No categories found", text: "Create a category or clear the search." })}
          </div>
        </div>`;

        container.querySelector("#catSearch").addEventListener("input", Admin.debounce((event) => {
          state.q = event.target.value;
          draw();
          const input = container.querySelector("#catSearch");
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }));
        container.querySelector("[data-cat-new]").addEventListener("click", () => openCategoryForm(null, draw));
        container.querySelectorAll("[data-cat-edit]").forEach((button) => {
          button.addEventListener("click", () => openCategoryForm(all.find((category) => category.id === button.dataset.catEdit), draw));
        });
        container.querySelectorAll("[data-cat-delete]").forEach((button) => {
          button.addEventListener("click", () => {
            const category = all.find((item) => item.id === button.dataset.catDelete);
            if (!category) return;
            Admin.confirm({
              title: "Delete category?",
              message: `“${esc(category.name)}” will be removed. Products stay in the catalog and become uncategorized.`,
              confirmLabel: "Delete", danger: true,
              onConfirm() {
                all.filter((item) => item.parent === category.name).forEach((child) => { child.parent = ""; });
                Admin.store.remove("categories", category.id);
                Admin.store.archiveItem("categories", "Category", category.name, category);
                Admin.toast("Category removed", "success");
                Admin.rerender();
              },
            });
          });
        });
      };
      draw();
    },
  };

  /* ---------------------------------------------------------------------
     Collection form
     --------------------------------------------------------------------- */

  function openCollectionForm(row, after) {
    const collection = row || {
      name: "", slug: "", type: "Manual", status: "Active", description: "", rule: "Hand-picked",
      productIds: [], products: 0, cardImage: "", bannerImage: "", alt: "", seoTitle: "",
      seoDescription: "", featured: false, sort: 0,
    };
    const products = Admin.store.list("products");
    let cardImage = collection.cardImage || "";
    let bannerImage = collection.bannerImage || "";
    let slugTouched = Boolean(collection.slug);
    const selected = collection.productIds || [];

    const body = `<form id="collectionForm" class="create-form">
      ${section("General Details", "Collection name, URL handle and merchandising copy.", `<div class="form-grid">
        ${field({ name: "name", label: "Collection Name", required: true, full: true, placeholder: "e.g. Winter Collection" }, collection)}
        ${field({ name: "slug", label: "URL Slug", required: true, placeholder: "e.g. winter-collection" }, collection)}
        ${field({ name: "description", label: "Description", type: "textarea", full: true, rows: 4 }, collection)}
      </div>`)}
      ${section("Collection Type & Product Inclusion", "Manual collections are hand-picked; smart collections match a rule automatically.", `<div class="form-grid">
        ${field({ name: "type", label: "Collection Type", type: "select", options: ["Manual", "Smart"] }, collection)}
        ${field({ name: "rule", label: "Smart Collection Rule", placeholder: "e.g. Price is less than 10000" }, collection)}
      </div>
      ${checkList("productIds", products.map((product) => ({ value: product.id, label: `${product.name} · ${Admin.money(product.price)}` })), selected, "No products available.")}`)}
      ${section("Collection Imagery (Dual Format)", "Portrait cards and landscape hero banners use separate images.", `<div class="dual-image-grid">
        <div class="image-slot"><span class="field-label">1. Portrait / Card Image</span><div class="image-slot-preview" data-slot-preview="card">${cardImage ? `<img src="${esc(cardImage)}" alt="">` : '<span>No portrait/card image</span>'}</div><label class="btn btn-secondary btn-sm" for="collectionCardInput">${svg("upload")}Select Card Image</label><input id="collectionCardInput" type="file" accept="image/*" hidden></div>
        <div class="image-slot"><span class="field-label">2. Landscape / Wide Hero Banner</span><div class="image-slot-preview" data-slot-preview="banner">${bannerImage ? `<img src="${esc(bannerImage)}" alt="">` : '<span>No landscape banner attached</span>'}</div><label class="btn btn-secondary btn-sm" for="collectionBannerInput">${svg("upload")}Select Banner</label><input id="collectionBannerInput" type="file" accept="image/*" hidden></div>
      </div>${field({ name: "alt", label: "Image Alt Description (Accessibility)", full: true }, collection)}`)}
      ${section("Search Engine Optimization (SEO)", "Search metadata for the collection page.", `<div class="form-grid">
        ${field({ name: "seoTitle", label: "Page Title Tag", full: true }, collection)}
        ${field({ name: "seoDescription", label: "Meta Description", type: "textarea", full: true, rows: 3 }, collection)}
      </div>`)}
      ${section("Status & Priority", "Visibility and sort order in the storefront.", `<div class="form-grid">
        ${field({ name: "status", label: "Status", type: "select", options: ["Active", "Draft"] }, collection)}
        ${field({ name: "sort", label: "Display Sort Order", type: "number", min: 0 }, collection)}
        <label class="check-card check-card-inline full"><input type="checkbox" name="featured"${collection.featured ? " checked" : ""}><span class="check-card-box">${svg("check")}</span><span>Feature this collection on the homepage</span></label>
      </div>`)}
    </form>`;

    Admin.openModal({
      title: row ? "Edit Collection" : "Create Collection",
      size: "xl",
      body,
      footer: `<button type="button" class="btn btn-secondary" data-modal-close>Cancel</button><button type="submit" class="btn btn-primary" form="collectionForm">${row ? "Save Collection" : "Create Collection"}</button>`,
      onMount(api) {
        const form = api.el.querySelector("#collectionForm");
        const name = form.querySelector('[name="name"]');
        const slug = form.querySelector('[name="slug"]');
        name.addEventListener("input", () => { if (!slugTouched) slug.value = slugify(name.value); });
        slug.addEventListener("input", () => { slugTouched = true; });

        const bindImage = (inputId, assign, slot) => {
          const input = api.el.querySelector(inputId);
          input.addEventListener("change", () => {
            const file = input.files?.[0];
            if (!file) return;
            if (file.size > 600 * 1024) {
              Admin.toast("Please choose an image under 600 KB.", "error");
              input.value = "";
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              assign(String(reader.result));
              api.el.querySelector(`[data-slot-preview="${slot}"]`).innerHTML = `<img src="${reader.result}" alt="">`;
            };
            reader.readAsDataURL(file);
          });
        };
        bindImage("#collectionCardInput", (value) => { cardImage = value; }, "card");
        bindImage("#collectionBannerInput", (value) => { bannerImage = value; }, "banner");

        form.addEventListener("submit", (event) => {
          event.preventDefault();
          if (!form.reportValidity()) return;
          const values = Admin.formValues(form);
          const productIds = [...form.querySelectorAll('[name="productIds"]:checked')].map((input) => input.value);
          const payload = {
            ...collection,
            ...values,
            slug: values.slug || slugify(values.name),
            productIds,
            products: productIds.length,
            cardImage,
            bannerImage,
            featured: form.querySelector('[name="featured"]').checked,
            sort: Number(values.sort) || 0,
          };
          if (row) Admin.store.update("collections", row.id, payload);
          else Admin.store.add("collections", payload);
          Admin.toast(`Collection ${row ? "updated" : "created"}`, "success");
          after?.();
          Admin.rerender();
        });
      },
    });
  }

  Admin.pages.collections = {
    render(container) {
      Admin.listPage(container, {
        slug: "collections",
        key: "collections",
        singular: "collection",
        plural: "collections",
        entity: "Collection",
        title: "Collections Management",
        subtitle: "Curate manual and automated smart collections for storefront merchandizing.",
        newLabel: "New Collection",
        customForm: openCollectionForm,
        searchKeys: ["name", "rule", "description", "type"],
        label: (row) => row.name,
        columns: [
          { label: "Collection", render: (row) => `<div><strong>${esc(row.name)}</strong><span class="cell-sub">${esc(row.description || "")}</span></div>` },
          { label: "Type", render: (row) => badge(row.type, row.type === "Smart" ? "blue" : "gray") },
          { label: "Rule", render: (row) => `<span class="muted small">${esc(row.rule)}</span>` },
          { label: "Products", render: (row) => row.productIds?.length ?? row.products },
          { label: "Status", render: (row) => badge(row.status) },
        ],
        rowActions: (row) => `<button type="button" class="icon-btn" data-edit title="Edit">${svg("edit")}</button>
          <button type="button" class="icon-btn" data-act="copy" data-id="${esc(row.id)}" title="Duplicate">${svg("copy")}</button>
          <button type="button" class="icon-btn danger" data-delete title="Delete">${svg("trash")}</button>`,
        onAction(act, row) {
          if (act !== "copy" || !row) return;
          const copy = Admin.deepClone(row);
          copy.id = Admin.uid("col");
          copy.name = `${row.name} (copy)`;
          copy.slug = `${row.slug || slugify(row.name)}-copy`;
          copy.status = "Draft";
          Admin.store.add("collections", copy);
          Admin.toast("Collection duplicated as a draft", "success");
          Admin.rerender();
        },
      });
    },
  };
})();
