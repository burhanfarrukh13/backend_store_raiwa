/* Baytak Noor Admin — Catalog pages */
(() => {
  "use strict";

  window.Admin = window.Admin || {};
  Admin.pages = Admin.pages || {};

  const { svg, esc, badge } = Admin;

  /* ---------------------------------------------------------------------
     Products
     --------------------------------------------------------------------- */

  function productVariantRow(variant) {
    return `<div class="variant-row" data-vid="${esc(variant.id || "")}">
      <input class="input" data-v="size" placeholder="Size" value="${esc(variant.size || "")}">
      <input class="input" data-v="color" placeholder="Colour" value="${esc(variant.color || "")}">
      <input class="input" data-v="sku" placeholder="Variant SKU" value="${esc(variant.sku || "")}">
      <input class="input" data-v="price" type="number" min="0" placeholder="Price" value="${esc(variant.price ?? 0)}">
      <input class="input" data-v="stock" type="number" min="0" placeholder="Stock" value="${esc(variant.stock ?? 0)}">
      <button type="button" class="icon-btn danger" data-remove-variant title="Remove variant">${svg("trash")}</button>
    </div>`;
  }

  function openProductForm(row, after) {
    const categories = Admin.store.list("categories").map((category) => category.name);
    const suppliers = Admin.store.list("suppliers").map((supplier) => supplier.name);
    const product = row
      ? Admin.deepClone(row)
      : {
          name: "", sku: "", category: categories[0] || "Bed Sheets", supplier: suppliers[0] || "",
          price: 0, compareAt: 0, cost: 0, status: "Active", description: "", image: "", variants: [],
        };
    let variants = Admin.deepClone(product.variants || []);
    let image = product.image || Admin.placeholder(product.name || "New product", "#e9dfd1");

    const variantsMarkup = () =>
      variants.length
        ? variants.map(productVariantRow).join("")
        : `<p class="muted small">No variants yet. Add at least one size or colour.</p>`;

    const fields = [
      { name: "name", label: "Product name", required: true, full: true, placeholder: "e.g. Sateen Sheet Set — Ivory" },
      { name: "sku", label: "Product SKU", required: true, placeholder: "BN-SAT-IVR" },
      {
        name: "status", label: "Status", type: "select",
        options: ["Active", "Draft", "Archived"],
      },
      {
        name: "category", label: "Category", type: "select",
        options: categories.length ? categories : ["Uncategorized"],
      },
      {
        name: "supplier", label: "Supplier", type: "select",
        options: suppliers.length ? suppliers : ["Unassigned"],
      },
      { name: "price", label: "Price (Rs.)", type: "number", min: 0, required: true },
      { name: "compareAt", label: "Compare-at price (Rs.)", type: "number", min: 0 },
      { name: "cost", label: "Cost per unit (Rs.)", type: "number", min: 0, help: "Used for profit reports." },
      { name: "description", label: "Description", type: "textarea", full: true, rows: 3 },
    ].map((field) => Admin.fieldHTML(field, product)).join("");

    const body = `<form id="productForm" class="form-grid" novalidate>
      ${fields}
      <div class="field full">
        <label>Product image</label>
        <div class="image-picker">
          <img id="productImagePreview" src="${esc(image)}" alt="">
          <div class="image-picker-actions">
            <label class="btn btn-secondary btn-sm" for="productImageFile">${svg("upload")}Upload image</label>
            <input id="productImageFile" type="file" accept="image/*" hidden>
            <button type="button" class="btn btn-secondary btn-sm" data-clear-image>Use generated image</button>
            <span class="hint">JPG or PNG, under 800 KB.</span>
          </div>
        </div>
      </div>
      <div class="field full">
        <div class="subhead-row"><label>Variants</label><span class="muted small">${variants.length} variant(s)</span></div>
        <div class="variant-list" id="variantRows">${variantsMarkup()}</div>
        <button type="button" class="btn btn-secondary btn-sm" data-add-variant>${svg("plus")}Add variant</button>
      </div>
    </form>`;

    const collect = (scope) => {
      variants = [...scope.querySelectorAll(".variant-row")].map((rowEl) => ({
        id: rowEl.dataset.vid || Admin.uid("var"),
        size: rowEl.querySelector('[data-v="size"]').value.trim(),
        color: rowEl.querySelector('[data-v="color"]').value.trim(),
        sku: rowEl.querySelector('[data-v="sku"]').value.trim(),
        price: Number(rowEl.querySelector('[data-v="price"]').value) || 0,
        stock: Number(rowEl.querySelector('[data-v="stock"]').value) || 0,
      }));
    };

    const api = Admin.openModal({
      title: row ? "Edit product" : "Create product",
      size: "lg",
      body,
      footer: `<button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>
        <button type="submit" class="btn btn-primary" form="productForm">${row ? "Save changes" : "Create product"}</button>`,
      onMount(api) {
        const form = api.el.querySelector("#productForm");
        const preview = api.el.querySelector("#productImagePreview");
        const file = api.el.querySelector("#productImageFile");
        const variantRows = api.el.querySelector("#variantRows");
        const redrawVariants = () => {
          variantRows.innerHTML = variantsMarkup();
          const countNode = api.el.querySelector(".subhead-row .muted");
          if (countNode) countNode.textContent = `${variants.length} variant(s)`;
        };

        api.el.addEventListener("click", (event) => {
          if (event.target.closest("[data-add-variant]")) {
            collect(api.el);
            variants.push({ id: Admin.uid("var"), size: "", color: "", sku: `${product.sku || "SKU"}-`, price: product.price || 0, stock: 0 });
            redrawVariants();
          }
          if (event.target.closest("[data-remove-variant]")) {
            collect(api.el);
            const index = [...api.el.querySelectorAll(".variant-row")].indexOf(event.target.closest(".variant-row"));
            variants.splice(index, 1);
            redrawVariants();
          }
          if (event.target.closest("[data-clear-image]")) {
            image = Admin.placeholder(form.querySelector('[name="name"]')?.value || "New product", "#e9dfd1");
            preview.src = image;
          }
        });

        file.addEventListener("change", () => {
          const selected = file.files?.[0];
          if (!selected) return;
          if (selected.size > 800 * 1024) {
            Admin.toast("Please choose an image under 800 KB.", "error");
            file.value = "";
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            image = String(reader.result);
            preview.src = image;
          };
          reader.readAsDataURL(selected);
        });

        form.addEventListener("submit", (event) => {
          event.preventDefault();
          if (!form.reportValidity()) return;
          collect(api.el);
          if (!variants.length) {
            Admin.toast("Add at least one variant before saving.", "error");
            return;
          }
          const values = Admin.formValues(form);
          const payload = {
            ...values,
            price: Number(values.price) || 0,
            compareAt: Number(values.compareAt) || 0,
            cost: Number(values.cost) || 0,
            image: image || Admin.placeholder(values.name, "#e9dfd1"),
            stock: variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0),
            variants,
          };
          if (row) Admin.store.update("products", row.id, payload);
          else Admin.store.add("products", payload);
          Admin.closeModal();
          Admin.toast(`Product ${row ? "updated" : "created"}`, "success");
          after?.();
          Admin.rerender();
        });
      },
    });
    return api;
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
        searchKeys: ["name", "sku", "category", "supplier"],
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
              <div><strong>${esc(row.name)}</strong><span>${esc(row.sku)} · ${row.variants?.length || 0} variants</span></div></div>`,
          },
          { label: "Category", render: (row) => `<span class="muted">${esc(row.category)}</span>` },
          {
            label: "Price",
            render: (row) => `<div class="price-cell"><strong>${Admin.money(row.price)}</strong>${
              row.compareAt ? `<span>${Admin.money(row.compareAt)}</span>` : ""
            }</div>`,
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
          copy.status = "Draft";
          copy.createdAt = Admin.DEMO_TODAY;
          copy.variants = (row.variants || []).map((variant) => ({
            ...variant,
            id: Admin.uid("var"),
            sku: `${variant.sku}-C`,
          }));
          Admin.store.add("products", copy);
          Admin.toast("Product duplicated as a draft", "success");
          Admin.rerender();
        },
      });
    },
  };

  /* ---------------------------------------------------------------------
     Inventory
     --------------------------------------------------------------------- */

  Admin.pages.inventory = {
    render(container) {
      const state = Admin.uiState.inventory || (Admin.uiState.inventory = { q: "", stock: "all" });
      const draw = () => {
        const variants = Admin.store.variants().filter((variant) => {
          if (state.stock === "out" && Number(variant.stock) !== 0) return false;
          if (state.stock === "low" && Number(variant.stock) > 5) return false;
          if (state.stock === "in" && Number(variant.stock) <= 5) return false;
          if (state.q) {
            const haystack = `${variant.productName} ${variant.sku} ${variant.size} ${variant.color}`.toLowerCase();
            if (!haystack.includes(state.q.toLowerCase())) return false;
          }
          return true;
        });

        container.innerHTML = `${Admin.pageHead({
          group: "Catalog",
          title: "Inventory Management",
          subtitle: "Track and adjust stock levels across all product variants.",
          actions: `<button class="btn btn-secondary" data-inv="export">${svg("download")}Export CSV</button>
            <button class="btn btn-secondary" data-inv="refresh">${svg("refresh")}Refresh</button>`,
        })}
          <div class="panel">
            <div class="table-toolbar">
              <div class="toolbar-left">
                <span class="table-search">${svg("search")}<input class="input" id="invSearch" placeholder="Search product or SKU" value="${esc(state.q)}"></span>
                <label class="select-wrap"><span class="sr-only">Stock level</span>
                  <select class="select" id="invFilter">
                    <option value="all"${state.stock === "all" ? " selected" : ""}>All stock levels</option>
                    <option value="low"${state.stock === "low" ? " selected" : ""}>Low stock (5 or fewer)</option>
                    <option value="out"${state.stock === "out" ? " selected" : ""}>Out of stock</option>
                    <option value="in"${state.stock === "in" ? " selected" : ""}>In stock</option>
                  </select>
                </label>
              </div>
              <div class="toolbar-right"><span class="result-count">${variants.length} variants</span></div>
            </div>
            ${variants.length
              ? `<div class="table-wrap"><table class="data-table">
                  <thead><tr><th>Product</th><th>SKU</th><th>Variant</th><th>Stock</th><th>Status</th><th class="th-actions">Adjust</th></tr></thead>
                  <tbody>${variants
                    .map(
                      (variant) => `<tr data-id="${esc(variant.productId)}|${esc(variant.id)}">
                        <td><strong>${esc(variant.productName)}</strong></td>
                        <td class="mono small">${esc(variant.sku)}</td>
                        <td>${esc(variant.size)} · ${esc(variant.color)}</td>
                        <td><span class="stock-value${Number(variant.stock) === 0 ? " out" : Number(variant.stock) <= 5 ? " low" : ""}">${variant.stock}</span></td>
                        <td>${badge(Number(variant.stock) === 0 ? "Out of stock" : Number(variant.stock) <= 5 ? "Low" : "In stock")}</td>
                        <td class="table-actions"><button type="button" class="btn btn-secondary btn-sm" data-adjust="${esc(variant.productId)}|${esc(variant.id)}">Adjust stock</button></td>
                      </tr>`
                    )
                    .join("")}</tbody>
                </table></div>`
              : Admin.emptyState({ icon: "layers", title: "No variants found", text: "Try a different search or stock filter." })}
          </div>
        </div>`;

        container.querySelector("#invSearch").addEventListener("input", Admin.debounce((event) => {
          state.q = event.target.value;
          draw();
          const input = container.querySelector("#invSearch");
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }));
        container.querySelector("#invFilter").addEventListener("change", (event) => {
          state.stock = event.target.value;
          draw();
        });
        container.querySelectorAll("[data-adjust]").forEach((button) => {
          button.addEventListener("click", () => {
            const [productId, variantId] = button.dataset.adjust.split("|");
            const product = Admin.store.productById(productId);
            const variant = product?.variants?.find((item) => item.id === variantId);
            if (!variant) return;
            Admin.formModal({
              title: "Adjust stock",
              intro: `<p class="modal-text">${esc(product.name)} · ${esc(variant.size)} / ${esc(variant.color)}</p>`,
              fields: [
                { name: "stock", label: "New stock level", type: "number", min: 0, required: true, value: variant.stock },
              ],
              submitLabel: "Update stock",
              onSubmit(values) {
                variant.stock = Number(values.stock) || 0;
                product.stock = (product.variants || []).reduce((sum, item) => sum + Number(item.stock || 0), 0);
                Admin.store.save();
                Admin.toast("Stock updated", "success");
                Admin.rerender();
              },
            });
          });
        });
        container.querySelectorAll('[data-inv="export"]').forEach((button) => {
          button.addEventListener("click", () => {
            Admin.exportCSV("inventory.csv", [
              ["Product", "SKU", "Variant", "Stock"],
              ...Admin.store.variants().map((variant) => [variant.productName, variant.sku, `${variant.size} / ${variant.color}`, variant.stock]),
            ]);
          });
        });
        container.querySelectorAll('[data-inv="refresh"]').forEach((button) => {
          button.addEventListener("click", () => {
            Admin.toast("Inventory refreshed", "success");
            draw();
          });
        });
      };
      draw();
    },
  };

  /* ---------------------------------------------------------------------
     Suppliers
     --------------------------------------------------------------------- */

  Admin.pages.suppliers = {
    render(container) {
      Admin.listPage(container, {
        slug: "suppliers",
        key: "suppliers",
        singular: "supplier",
        plural: "suppliers",
        entity: "Supplier",
        title: "Suppliers",
        subtitle: "Record who you buy each product from and message them on WhatsApp.",
        newLabel: "Add supplier",
        searchKeys: ["name", "phone", "notes"],
        label: (row) => row.name,
        columns: [
          {
            label: "Supplier",
            render: (row) => `<div><strong>${esc(row.name)}</strong><span class="cell-sub">${esc(row.notes || "No notes")}</span></div>`,
          },
          { label: "WhatsApp / phone", render: (row) => `<span class="mono small">${esc(row.phone || "—")}</span>` },
          {
            label: "Products",
            render: (row) => `<span class="muted">${Admin.store.list("products").filter((product) => product.supplier === row.name).length}</span>`,
          },
        ],
        fields: [
          { name: "name", label: "Name", required: true, full: true },
          { name: "phone", label: "WhatsApp / phone", placeholder: "+92 300 0000000" },
          { name: "notes", label: "Notes", type: "textarea", full: true, rows: 3 },
        ],
        rowActions: (row) => `<button type="button" class="icon-btn" data-act="message" data-id="${esc(row.id)}" title="Message">${svg("whatsapp")}</button>
          <button type="button" class="icon-btn" data-edit title="Edit">${svg("edit")}</button>
          <button type="button" class="icon-btn danger" data-delete title="Delete">${svg("trash")}</button>`,
        onAction(act, row) {
          if (act !== "message" || !row) return;
          Admin.formModal({
            title: `Message ${row.name}`,
            fields: [{ name: "message", label: "WhatsApp message", type: "textarea", rows: 4, full: true, value: "Assalam o Alaikum, could you confirm the lead time for our next order?" }],
            submitLabel: "Send message",
            onSubmit() {
              Admin.toast("Supplier message queued in WhatsApp", "success");
            },
          });
        },
      });
    },
  };

  /* ---------------------------------------------------------------------
     Categories
     --------------------------------------------------------------------- */

  Admin.pages.categories = {
    render(container) {
      const state = Admin.uiState.categories || (Admin.uiState.categories = { q: "" });

      const openForm = (row) => {
        const categories = Admin.store.list("categories");
        Admin.formModal({
          title: row ? "Edit category" : "New category",
          fields: [
            { name: "name", label: "Category name", required: true, full: true },
            { name: "slug", label: "URL slug", placeholder: "generated-from-name" },
            { name: "status", label: "Status", type: "select", options: ["Active", "Draft"] },
            {
              name: "parent", label: "Parent category", type: "select",
              options: [{ value: "", label: "No parent (top level)" }, ...categories.filter((category) => category.id !== row?.id).map((category) => ({ value: category.name, label: category.name }))],
            },
            { name: "description", label: "Description", type: "textarea", full: true, rows: 3 },
          ],
          values: row || { name: "", slug: "", status: "Active", parent: "", description: "" },
          submitLabel: row ? "Save changes" : "Create category",
          onSubmit(values) {
            const payload = {
              ...values,
              slug: values.slug || String(values.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
            };
            if (row) Admin.store.update("categories", row.id, payload);
            else Admin.store.add("categories", payload);
            Admin.toast(`Category ${row ? "updated" : "created"}`, "success");
            Admin.rerender();
          },
        });
      };

      const draw = () => {
        const all = Admin.store.list("categories");
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
                    .map(
                      (category) => `<tr data-id="${esc(category.id)}">
                        <td><span class="tree-name${category.parent ? " child" : ""}">${esc(category.name)}</span><span class="cell-sub">${esc(category.description || "")}</span></td>
                        <td class="mono small">/collections/${esc(category.slug)}</td>
                        <td class="muted">${esc(category.parent || "Top level")}</td>
                        <td>${Admin.store.list("products").filter((product) => product.category === category.name).length}</td>
                        <td>${badge(category.status)}</td>
                        <td class="table-actions">
                          <button class="icon-btn" data-cat-edit="${esc(category.id)}" title="Edit">${svg("edit")}</button>
                          <button class="icon-btn danger" data-cat-delete="${esc(category.id)}" title="Delete">${svg("trash")}</button>
                        </td>
                      </tr>`
                    )
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
        container.querySelector("[data-cat-new]").addEventListener("click", () => openForm(null));
        container.querySelectorAll("[data-cat-edit]").forEach((button) => {
          button.addEventListener("click", () => openForm(all.find((category) => category.id === button.dataset.catEdit)));
        });
        container.querySelectorAll("[data-cat-delete]").forEach((button) => {
          button.addEventListener("click", () => {
            const category = all.find((item) => item.id === button.dataset.catDelete);
            if (!category) return;
            Admin.confirm({
              title: "Delete category?",
              message: `“${esc(category.name)}” will be removed. Products stay in the catalog and become uncategorized.`,
              confirmLabel: "Delete",
              danger: true,
              onConfirm() {
                all.filter((item) => item.parent === category.name).forEach((child) => {
                  child.parent = "";
                });
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
     Collections
     --------------------------------------------------------------------- */

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
        searchKeys: ["name", "rule", "description", "type"],
        label: (row) => row.name,
        columns: [
          { label: "Collection", render: (row) => `<div><strong>${esc(row.name)}</strong><span class="cell-sub">${esc(row.description || "")}</span></div>` },
          { label: "Type", render: (row) => badge(row.type, row.type === "Smart" ? "blue" : "gray") },
          { label: "Rule", render: (row) => `<span class="muted small">${esc(row.rule)}</span>` },
          { label: "Products", render: (row) => row.products },
          { label: "Status", render: (row) => badge(row.status) },
        ],
        fields: [
          { name: "name", label: "Collection name", required: true, full: true },
          { name: "type", label: "Collection type", type: "select", options: ["Manual", "Smart"] },
          { name: "status", label: "Status", type: "select", options: ["Active", "Draft"] },
          { name: "rule", label: "Rule / hand-picked note", full: true, placeholder: "e.g. Price is less than 10000" },
          { name: "products", label: "Product count", type: "number", min: 0 },
          { name: "description", label: "Description", type: "textarea", full: true, rows: 3 },
        ],
        defaults: { type: "Manual", status: "Active", rule: "Hand-picked", products: 0 },
      });
    },
  };

  /* ---------------------------------------------------------------------
     Media
     --------------------------------------------------------------------- */

  Admin.pages.media = {
    render(container) {
      const state = Admin.uiState.media || (Admin.uiState.media = { q: "" });
      const draw = () => {
        const all = Admin.store.list("media");
        const rows = all.filter((asset) => `${asset.name} ${asset.alt}`.toLowerCase().includes(state.q.toLowerCase()));
        container.innerHTML = `${Admin.pageHead({
          group: "Catalog",
          title: "Media Library",
          subtitle: "Store and manage product photography, banners, and marketing assets.",
          actions: `<label class="btn btn-primary" for="mediaUpload">${svg("upload")}Upload Media</label>
            <input id="mediaUpload" type="file" accept="image/*" multiple hidden>`,
        })}
          <div class="panel">
            <div class="table-toolbar">
              <div class="toolbar-left"><span class="table-search">${svg("search")}<input class="input" id="mediaSearch" placeholder="Search assets or alt text" value="${esc(state.q)}"></span></div>
              <div class="toolbar-right"><span class="result-count">${all.length} assets</span></div>
            </div>
            ${rows.length
              ? `<div class="media-grid">${rows
                  .map(
                    (asset) => `<article class="media-card">
                      <div class="media-thumb"><img src="${esc(asset.url)}" alt="${esc(asset.alt)}"></div>
                      <div class="media-body">
                        <div class="media-title"><strong>${esc(asset.name)}</strong><span>${esc(asset.size)}</span></div>
                        <p>${esc(asset.alt)}</p>
                        <div class="media-actions">
                          <button class="btn btn-secondary btn-sm" data-media-alt="${esc(asset.id)}">${svg("edit")}Alt text</button>
                          <button class="icon-btn" data-media-copy="${esc(asset.id)}" title="Copy URL">${svg("copy")}</button>
                          <button class="icon-btn danger" data-media-delete="${esc(asset.id)}" title="Delete">${svg("trash")}</button>
                        </div>
                      </div>
                    </article>`
                  )
                  .join("")}</div>`
              : Admin.emptyState({ icon: "media", title: "No media found", text: "Upload an image or clear the search.", action: `<label class="btn btn-primary" for="mediaUpload">${svg("upload")}Upload Media</label>` })}
          </div>
        </div>`;

        const input = container.querySelector("#mediaSearch");
        input.addEventListener("input", Admin.debounce((event) => {
          state.q = event.target.value;
          draw();
          const next = container.querySelector("#mediaSearch");
          next.focus();
          next.setSelectionRange(next.value.length, next.value.length);
        }));

        container.querySelectorAll("[data-media-alt]").forEach((button) => {
          button.addEventListener("click", () => {
            const asset = all.find((item) => item.id === button.dataset.mediaAlt);
            if (!asset) return;
            Admin.formModal({
              title: "Edit alt text",
              fields: [{ name: "alt", label: "Alt text", type: "textarea", rows: 3, full: true, value: asset.alt }],
              onSubmit(values) {
                asset.alt = values.alt;
                Admin.store.save();
                Admin.toast("Alt text saved", "success");
                Admin.rerender();
              },
            });
          });
        });
        container.querySelectorAll("[data-media-copy]").forEach((button) => {
          button.addEventListener("click", () => {
            const asset = all.find((item) => item.id === button.dataset.mediaCopy);
            if (asset) Admin.copyText(asset.url, "Image URL copied");
          });
        });
        container.querySelectorAll("[data-media-delete]").forEach((button) => {
          button.addEventListener("click", () => {
            const asset = all.find((item) => item.id === button.dataset.mediaDelete);
            if (!asset) return;
            Admin.confirm({
              title: "Delete asset?",
              message: `“${esc(asset.name)}” will be moved to the Archive.`,
              confirmLabel: "Delete",
              danger: true,
              onConfirm() {
                Admin.store.remove("media", asset.id);
                Admin.store.archiveItem("media", "Media asset", asset.name, asset);
                Admin.toast("Asset moved to Archive", "success");
                Admin.rerender();
              },
            });
          });
        });

        const fileInput = container.querySelector("#mediaUpload");
        fileInput.addEventListener("change", async () => {
          const files = [...(fileInput.files || [])];
          for (const file of files) {
            if (file.size > 5 * 1024 * 1024) {
              Admin.toast(`${file.name} is over 5 MB and was skipped.`, "error");
              continue;
            }
            const reader = new FileReader();
            reader.onload = async () => {
              const base64Data = String(reader.result);
              const cleanName = file.name.replace(/\.[^.]+$/, "");
              const alt = cleanName.replace(/[-_]/g, " ");

              // Optimistically update admin UI
              const tempItem = Admin.store.add("media", {
                name: cleanName,
                url: base64Data,
                alt: alt,
                size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
                uploadedAt: new Date().toISOString().split("T")[0],
              });
              Admin.toast(`Uploading ${file.name}…`, "info");
              Admin.rerender();

              // Direct API call to upload to Cloudinary / Supabase Storage
              try {
                const res = await Admin.api.uploadMedia(base64Data, cleanName, alt);
                if (res.data?.url) {
                  tempItem.url = res.data.url;
                  tempItem.id = res.data.id || tempItem.id;
                  Admin.store.save();
                  Admin.toast(`✓ ${file.name} saved to Cloud Storage!`, "success");
                  Admin.rerender();
                }
              } catch (err) {
                console.error("Cloud storage upload failed:", err);
                Admin.toast(`Cloud upload failed for ${file.name}`, "error");
              }
            };
            reader.readAsDataURL(file);
          }
          fileInput.value = "";
        });
      };
      draw();
    },
  };
})();
