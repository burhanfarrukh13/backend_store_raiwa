/* Baytak Noor Admin — shared list page engine */
(() => {
  "use strict";

  window.Admin = window.Admin || {};
  Admin.pages = Admin.pages || {};

  const { svg, esc } = Admin;

  function tabsMarkup(tabs, active) {
    return `<div class="tabbar" role="tablist">${tabs
      .map((tab) => {
        const value = String(tab.value);
        const isActive = String(active) === value;
        return `<button type="button" role="tab" class="tab${isActive ? " active" : ""}" aria-selected="${isActive}" data-tabval="${esc(value)}">
          <span>${tab.label}</span>${tab.count !== undefined ? `<span class="count">${tab.count}</span>` : ""}
        </button>`;
      })
      .join("")}</div>`;
  }

  function tableMarkup(columns, rows, rowActions, rowClass) {
    return `<div class="table-wrap"><table class="data-table">
      <thead><tr>
        ${columns.map((column) => `<th${column.className ? ` class="${column.className}"` : ""}>${column.label}</th>`).join("")}
        ${rowActions ? '<th class="th-actions">Actions</th>' : ""}
      </tr></thead>
      <tbody>${rows
        .map(
          (row) => `<tr data-id="${esc(row.id)}"${rowClass ? ` class="${rowClass(row)}"` : ""}>
            ${columns.map((column) => `<td${column.className ? ` class="${column.className}"` : ""}>${column.render(row)}</td>`).join("")}
            ${rowActions ? `<td class="table-actions">${rowActions(row)}</td>` : ""}
          </tr>`
        )
        .join("")}</tbody>
    </table></div>`;
  }

  const editButton = `<button type="button" class="icon-btn" data-edit title="Edit">${svg("edit")}</button>`;
  const deleteButton = `<button type="button" class="icon-btn danger" data-delete title="Delete">${svg("trash")}</button>`;

  Admin.listPage = function listPage(container, config) {
    const slug = config.slug;
    const state =
      Admin.uiState[slug] ||
      (Admin.uiState[slug] = { q: "", tab: "", filters: {}, focus: false });
    const getRows = () => (config.rows ? config.rows() : Admin.store.list(config.key)).slice();
    const group = Admin.groupOf(slug).name;
    const singular = config.singular || "item";
    const plural = config.plural || `${singular}s`;

    const tabsFor = (rows) => (typeof config.tabs === "function" ? config.tabs(rows) : config.tabs || []);
    const rowActions =
      config.rowActions || (() => `${config.editable === false ? "" : editButton}${config.deletable === false ? "" : deleteButton}`);

    function matches(row) {
      if (state.tab) {
        if (config.tabFilter) {
          if (!config.tabFilter(row, state.tab)) return false;
        } else if (String(row.status || "").toLowerCase() !== String(state.tab).toLowerCase()) {
          return false;
        }
      }
      for (const filter of config.filters || []) {
        const value = state.filters[filter.key];
        if (value === undefined || value === "all" || value === "") continue;
        if (filter.match) {
          if (!filter.match(row, value)) return false;
        } else if (String(row[filter.key] ?? "").toLowerCase() !== String(value).toLowerCase()) {
          return false;
        }
      }
      if (state.q) {
        const q = state.q.toLowerCase();
        const haystack = (config.searchKeys || ["name"])
          .map((key) => key.split(".").reduce((value, part) => value?.[part], row) ?? "")
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    }

    function openForm(row) {
      if (config.customForm) {
        config.customForm(row, draw);
        return;
      }
      const editing = Boolean(row);
      const fields = typeof config.fields === "function" ? config.fields(row) : config.fields || [];
      Admin.formModal({
        title: config.formTitle ? config.formTitle(row) : `${editing ? "Edit" : "New"} ${singular}`,
        fields,
        values: row || config.defaults || {},
        submitLabel: editing ? "Save changes" : config.createLabel || `Create ${singular}`,
        size: config.formSize || "md",
        intro: config.formIntro || "",
        onSubmit(values) {
          const prepared = config.onSave ? config.onSave(values, row) : values;
          if (prepared === false) return false;
          if (editing) Admin.store.update(config.key, row.id, prepared);
          else Admin.store.add(config.key, { ...(config.defaults || {}), ...prepared });
          Admin.toast(`${singular.charAt(0).toUpperCase() + singular.slice(1)} ${editing ? "updated" : "created"}`, "success");
          Admin.rerender();
        },
      });
    }

    function requestDelete(row) {
      if (config.onDelete) {
        config.onDelete(row);
        return;
      }
      const label = config.label ? config.label(row) : row.name || row.title || row.code || row.email || "this item";
      Admin.confirm({
        title: `Delete ${singular.toLowerCase()}?`,
        message: config.deleteMessage?.(row) || `“${esc(label)}” will be moved to the Archive and can be restored later.`,
        confirmLabel: "Delete",
        danger: true,
        onConfirm() {
          Admin.store.remove(config.key, row.id);
          if (config.archive !== false) {
            Admin.store.archiveItem(config.key, config.entity || singular, label, row);
          }
          Admin.toast(`${singular.charAt(0).toUpperCase() + singular.slice(1)} moved to Archive`, "success");
          Admin.rerender();
        },
      });
    }

    function findRow(button) {
      const id = button.dataset.id || button.closest("[data-id]")?.dataset.id;
      return getRows().find((row) => row.id === id) || null;
    }

    function draw() {
      const rows = getRows();
      const tabs = tabsFor(rows);
      if (tabs.length && !tabs.some((tab) => String(tab.value) === String(state.tab))) {
        state.tab = tabs[0].value;
      }
      for (const filter of config.filters || []) {
        if (state.filters[filter.key] === undefined) {
          state.filters[filter.key] = filter.options?.[0]?.value ?? "all";
        }
      }
      const visible = rows.filter(matches);
      const actions = [
        ...(config.actions || []),
        ...(config.hideNew
          ? []
          : [{ label: config.newLabel || `New ${singular}`, icon: "plus", variant: "primary", act: "new" }]),
      ];
      const newAction = actions.find((action) => action.act === "new");

      const search =
        config.search === false
          ? ""
          : `<span class="table-search">${svg("search")}
              <input class="input" type="search" value="${esc(state.q)}" placeholder="${esc(
                config.searchPlaceholder || `Search ${plural.toLowerCase()}`
              )}" aria-label="Search ${esc(plural)}">
            </span>`;

      const filters = (config.filters || [])
        .map(
          (filter) => `<label class="select-wrap"><span class="sr-only">${esc(filter.label)}</span>
            <select class="select" data-filter="${esc(filter.key)}" aria-label="${esc(filter.label)}">
              ${filter.options
                .map((option) => {
                  const opt = typeof option === "object" ? option : { value: option, label: option };
                  return `<option value="${esc(opt.value)}"${
                    String(state.filters[filter.key]) === String(opt.value) ? " selected" : ""
                  }>${esc(opt.label)}</option>`;
                })
                .join("")}
            </select></label>`
        )
        .join("");

      const empty = Admin.emptyState({
        icon: config.icon || Admin.tabOf(slug).icon,
        title: config.emptyTitle || `No ${plural.toLowerCase()} yet`,
        text: config.emptyText || "Create your first record or change the filters above.",
        action: newAction
          ? `<button type="button" class="btn btn-primary" data-act="new">${svg("plus")}${esc(newAction.label)}</button>`
          : "",
      });

      container.innerHTML = `${Admin.pageHead({
        group,
        title: config.title || Admin.tabOf(slug).pageTitle,
        subtitle: config.subtitle || Admin.tabOf(slug).subtitle,
        pill: config.pill || "",
        actions: Admin.pageActions(actions),
      })}
        ${tabs.length ? tabsMarkup(tabs, state.tab) : ""}
        ${config.intro || ""}
        <div class="panel">
          <div class="table-toolbar">
            <div class="toolbar-left">${search}${filters}</div>
            <div class="toolbar-right"><span class="result-count">${visible.length} of ${rows.length}</span></div>
          </div>
          ${
            visible.length
              ? config.renderBody
                ? config.renderBody(visible)
                : tableMarkup(config.columns, visible, rowActions, config.rowClass)
              : empty
          }
        </div>
        ${config.after || ""}
      </div>`;

      if (state.focus && config.search !== false) {
        const input = container.querySelector(".table-search input");
        if (input) {
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }
        state.focus = false;
      }

      bind();
    }

    function bind() {
      const searchInput = container.querySelector(".table-search input");
      if (searchInput) {
        searchInput.addEventListener(
          "input",
          Admin.debounce((event) => {
            state.q = event.target.value;
            state.focus = true;
            draw();
          })
        );
      }
      container.querySelectorAll("[data-filter]").forEach((select) => {
        select.addEventListener("change", () => {
          state.filters[select.dataset.filter] = select.value;
          draw();
        });
      });
      container.querySelectorAll("[data-tabval]").forEach((button) => {
        button.addEventListener("click", () => {
          state.tab = button.dataset.tabval;
          draw();
        });
      });
      container.querySelectorAll('[data-act="new"]').forEach((button) => {
        button.addEventListener("click", () => openForm(null));
      });
      container.querySelectorAll("[data-edit]").forEach((button) => {
        button.addEventListener("click", () => {
          const row = findRow(button);
          if (row) openForm(row);
        });
      });
      container.querySelectorAll("[data-delete]").forEach((button) => {
        button.addEventListener("click", () => {
          const row = findRow(button);
          if (row) requestDelete(row);
        });
      });
      container.querySelectorAll("[data-act]").forEach((button) => {
        const act = button.dataset.act;
        if (act === "new") return;
        button.addEventListener("click", () => config.onAction?.(act, findRow(button), draw, button));
      });
      config.onMount?.(container, draw);
    }

    draw();
  };

  Admin.table = tableMarkup;
  Admin.editButton = editButton;
  Admin.deleteButton = deleteButton;
  Admin.tabsMarkup = tabsMarkup;
})();
