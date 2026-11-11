/* Baytak Noor Admin — System utility pages */
(() => {
  "use strict";

  window.Admin = window.Admin || {};
  Admin.pages = Admin.pages || {};

  const { svg, esc, badge, money, num } = Admin;

  /* ---------------------------------------------------------------------
     Phone app & alerts
     --------------------------------------------------------------------- */

  Admin.pages["phone-app"] = {
    render(container) {
      const state = Admin.uiState.phone || (Admin.uiState.phone = { installed: false });
      const draw = () => {
        const devices = Admin.store.list("devices");
        const notifications = Boolean(Admin.store.get("notifications"));
        container.innerHTML = `${Admin.pageHead({
          group: "System",
          title: "Phone app & alerts",
          subtitle: "Put your store admin on your phone like an app and get a notification for every new order.",
          pill: state.installed ? "Installed" : "Not installed",
          actions: `<button class="btn btn-primary" data-phone-install>${svg("phone")}${state.installed ? "Open app" : "Install app"}</button>`,
        })}
          <div class="phone-hero">
            <div class="phone-copy">
              <span class="eyebrow">Home-screen app</span>
              <h2>Your store, one tap away</h2>
              <p>Install the admin on your phone to open it full-screen, keep your session, and receive a push notification for each new order.</p>
              <div class="phone-actions">
                <button class="btn btn-primary" data-phone-install>${svg("download")}${state.installed ? "Open installed app" : "Install on this device"}</button>
                <button class="btn btn-secondary" data-phone-test>${svg("send")}Send test alert</button>
              </div>
              <div class="alert alert-info">${svg("info")}This is a front-end demo. Installation uses your browser's install prompt when one is available.</div>
            </div>
            <div class="phone-mock">
              <div class="phone-notch"></div>
              <div class="phone-screen">
                <span class="phone-time">9:41</span>
                <div class="phone-alert"><span class="phone-alert-icon">${svg("orders")}</span><div><strong>New order · ${money(25220)}</strong><p>#BN-1044 · Zara Malik</p></div></div>
                <div class="phone-alert"><span class="phone-alert-icon">${svg("whatsapp")}</span><div><strong>New WhatsApp reply</strong><p>Bilal Ahmed · 2 min ago</p></div></div>
                <div class="phone-app-grid">
                  <span>${svg("orders")}Orders</span><span>${svg("package")}Products</span>
                  <span>${svg("analytics")}Analytics</span><span>${svg("accounting")}Accounting</span>
                </div>
              </div>
            </div>
          </div>

          <div class="split-grid">
            <div class="panel"><div class="panel-head"><div><h2>Alert preferences</h2><p>Choose what reaches your phone.</p></div></div>
              <div class="toggle-list">
                <label class="toggle-row"><input type="checkbox" data-phone-notify${notifications ? " checked" : ""}><span class="switch"><span></span></span>
                  <span class="toggle-copy"><strong>New order notifications</strong><small>Alert me as soon as an order is paid.</small></span></label>
                <label class="toggle-row"><input type="checkbox" data-phone-low${Admin.store.list("products").some((product) => product.stock <= 5) ? " checked" : ""}><span class="switch"><span></span></span>
                  <span class="toggle-copy"><strong>Low stock alerts</strong><small>Notify me when a variant drops to five or fewer.</small></span></label>
                <label class="toggle-row"><input type="checkbox" data-phone-daily><span class="switch"><span></span></span>
                  <span class="toggle-copy"><strong>Daily summary at 9pm</strong><small>Orders, revenue and anything waiting on you.</small></span></label>
              </div>
            </div>
            <div class="panel"><div class="panel-head"><div><h2>Install steps</h2><p>Works on iPhone and Android.</p></div></div>
              <ol class="steps-list">
                <li>Open this admin in Safari or Chrome.</li>
                <li>Tap the share or browser menu button.</li>
                <li>Choose <strong>Add to Home Screen</strong>.</li>
                <li>Open it from your home screen and allow notifications.</li>
              </ol>
            </div>
          </div>

          <div class="panel"><div class="panel-head"><div><h2>Devices & sessions</h2><p>Devices currently signed in to this admin.</p></div>
            <button class="btn btn-secondary btn-sm" data-phone-other-sessions>Sign out other devices</button></div>
            <div class="table-wrap"><table class="data-table">
              <thead><tr><th>Device</th><th>Type</th><th>Last seen</th><th>Status</th><th class="th-actions">Actions</th></tr></thead>
              <tbody>${devices
                .map(
                  (device) => `<tr data-id="${esc(device.id)}"><td><strong>${esc(device.name)}</strong></td><td>${esc(device.type)}</td>
                    <td class="muted small">${Admin.dateTime(device.lastSeen)}</td><td>${device.current ? badge("This device", "blue") : badge("Active")}</td>
                    <td class="table-actions">${device.current ? '<span class="muted small">Current</span>' : `<button class="icon-btn danger" data-phone-revoke="${esc(device.id)}" title="Sign out">${svg("logout")}</button>`}</td></tr>`
                )
                .join("")}</tbody>
            </table></div>
          </div>
        </div>`;

        container.querySelectorAll("[data-phone-install]").forEach((button) => {
          button.addEventListener("click", async () => {
            if (state.installed) {
              Admin.toast("The demo app is already installed on this browser.", "success");
              return;
            }
            if (Admin.installPrompt) {
              Admin.installPrompt.prompt();
              const choice = await Admin.installPrompt.userChoice;
              Admin.installPrompt = null;
              if (choice?.outcome === "accepted") {
                state.installed = true;
                Admin.toast("Admin installed to your home screen", "success");
                draw();
              } else {
                Admin.toast("Installation dismissed", "error");
              }
              return;
            }
            Admin.openModal({
              title: "Install the admin app",
              body: `<p class="modal-text">Your browser has not offered an install prompt yet. Use the browser menu:</p>
                <ol class="steps-list"><li>Open the browser menu or share sheet.</li><li>Choose <strong>Add to Home Screen</strong>.</li><li>Confirm the name <strong>Baytak Noor Admin</strong>.</li></ol>
                <div class="alert alert-warn">${svg("alert")}If you are already viewing this page inside an app preview, open it in Chrome or Safari first.</div>`,
              footer: `<button class="btn btn-secondary" data-modal-close>Got it</button>`,
            });
          });
        });
        container.querySelector("[data-phone-notify]").addEventListener("change", (event) => {
          Admin.store.set("notifications", event.target.checked);
          Admin.toast(event.target.checked ? "Order notifications enabled" : "Order notifications paused", "success");
        });
        container.querySelector("[data-phone-low]").addEventListener("change", () => Admin.toast("Low-stock alert preference saved", "success"));
        container.querySelector("[data-phone-daily]").addEventListener("change", () => Admin.toast("Daily summary preference saved", "success"));
        container.querySelector("[data-phone-test]").addEventListener("click", () => Admin.toast("Test alert sent to this device", "success"));
        container.querySelector("[data-phone-other-sessions]").addEventListener("click", () => {
          Admin.confirm({
            title: "Sign out other devices?",
            message: "Every other device will need to sign in again. This device stays signed in.",
            confirmLabel: "Sign out others", danger: true,
            onConfirm() {
              Admin.store.data.devices = devices.filter((device) => device.current);
              Admin.store.save();
              Admin.toast("Other devices signed out", "success");
              draw();
            },
          });
        });
        container.querySelectorAll("[data-phone-revoke]").forEach((button) => {
          button.addEventListener("click", () => {
            Admin.store.data.devices = devices.filter((device) => device.id !== button.dataset.phoneRevoke);
            Admin.store.save();
            Admin.toast("Device signed out", "success");
            draw();
          });
        });
      };
      draw();
    },
  };

  /* ---------------------------------------------------------------------
     Add-ons
     --------------------------------------------------------------------- */

  Admin.pages.addons = {
    render(container) {
      const state = Admin.uiState.addons || (Admin.uiState.addons = { billing: "monthly" });
      const draw = () => {
        const addons = Admin.store.list("addons");
        const active = addons.filter((addon) => addon.status === "active");
        const trials = addons.filter((addon) => addon.status === "trial");
        const monthlyTotal = active.reduce((total, addon) => total + addon.monthly, 0) + trials.reduce((total, addon) => total + addon.monthly, 0);

        container.innerHTML = `${Admin.pageHead({
          group: "System",
          title: "Add-ons",
          subtitle: "Extra features for your store. Try them free first, then keep the ones you like.",
          actions: `<button class="btn btn-secondary" data-addon-billing>${svg("creditCard")}Billing history</button>`,
        })}
          <div class="addon-summary">
            <div><span>Active add-ons</span><strong>${active.length}</strong></div>
            <div><span>On trial</span><strong>${trials.length}</strong></div>
            <div><span>Monthly total</span><strong>${money(monthlyTotal)}</strong></div>
            <div class="billing-toggle"><button class="${state.billing === "monthly" ? "active" : ""}" data-addon-cycle="monthly">Monthly</button><button class="${state.billing === "yearly" ? "active" : ""}" data-addon-cycle="yearly">Yearly <span>2 months free</span></button></div>
          </div>
          <div class="addon-grid">${addons
            .map((addon) => {
              const price = state.billing === "yearly" ? addon.yearly : addon.monthly;
              const priceLabel = addon.status === "trial" ? `Trial · ${addon.trialDays} days left` : addon.status === "active" ? "Active" : "Not enabled";
              return `<article class="addon-card${addon.status === "active" ? " enabled" : ""}">
                <div class="addon-head"><span class="addon-icon">${svg(addon.icon)}</span>${badge(addon.status === "active" ? "Active" : addon.status === "trial" ? "Trial" : "Available", addon.status === "active" ? "green" : addon.status === "trial" ? "amber" : "gray")}</div>
                <h2>${esc(addon.name)}</h2>
                <p>${esc(addon.description)}</p>
                <ul class="feature-list">${addon.features.map((feature) => `<li>${svg("check")}${esc(feature)}</li>`).join("")}</ul>
                <div class="addon-price"><strong>${money(price)}</strong><span>${state.billing === "yearly" ? "per year" : "per month"}</span><small>${priceLabel}</small></div>
                <div class="addon-actions">
                  ${addon.status === "inactive"
                    ? `<button class="btn btn-primary" data-addon-action="trial" data-id="${esc(addon.id)}">Start 14-day trial</button>`
                    : addon.status === "trial"
                      ? `<button class="btn btn-primary" data-addon-action="keep" data-id="${esc(addon.id)}">Keep for ${money(price)}</button><button class="btn btn-secondary" data-addon-action="stop" data-id="${esc(addon.id)}">Stop trial</button>`
                      : `<button class="btn btn-secondary" data-addon-action="manage" data-id="${esc(addon.id)}">Manage</button>`}
                </div>
              </article>`;
            })
            .join("")}</div>
        </div>`;

        container.querySelectorAll("[data-addon-cycle]").forEach((button) => {
          button.addEventListener("click", () => {
            state.billing = button.dataset.addonCycle;
            draw();
          });
        });
        container.querySelector("[data-addon-billing]").addEventListener("click", () => {
          Admin.openModal({
            title: "Billing history",
            body: `<div class="table-wrap"><table class="data-table compact"><thead><tr><th>Date</th><th>Item</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody><tr><td>01 Nov 2026</td><td>Advanced Reports</td><td>${money(999)}</td><td>${badge("Paid")}</td></tr>
              <tr><td>01 Nov 2026</td><td>Accounting & Ledger — trial</td><td>${money(0)}</td><td>${badge("Trial", "amber")}</td></tr>
              <tr><td>01 Oct 2026</td><td>Advanced Reports</td><td>${money(999)}</td><td>${badge("Paid")}</td></tr></tbody></table></div>`,
            footer: `<button class="btn btn-secondary" data-modal-close>Close</button>`,
          });
        });
        container.querySelectorAll("[data-addon-action]").forEach((button) => {
          button.addEventListener("click", () => {
            const addon = Admin.store.byId("addons", button.dataset.id);
            if (!addon) return;
            const action = button.dataset.addonAction;
            if (action === "trial") {
              addon.status = "trial";
              addon.trialDays = 14;
              Admin.store.save();
              Admin.toast(`${addon.name} trial started`, "success");
              draw();
            }
            if (action === "keep") {
              addon.status = "active";
              addon.trialDays = 0;
              Admin.store.save();
              Admin.toast(`${addon.name} added to your monthly bill`, "success");
              draw();
            }
            if (action === "stop") {
              Admin.confirm({
                title: "Stop the trial?",
                message: `${addon.name} will be switched off at the end of this session.`,
                confirmLabel: "Stop trial", danger: true,
                onConfirm() {
                  addon.status = "inactive";
                  addon.trialDays = 0;
                  Admin.store.save();
                  Admin.toast("Trial stopped", "success");
                  draw();
                },
              });
            }
            if (action === "manage") {
              Admin.openModal({
                title: addon.name,
                body: `<div class="addon-manage"><span class="addon-icon">${svg(addon.icon)}</span><p>${esc(addon.description)}</p>
                  <div class="detail-row"><span>Billing</span><strong>${money(addon.monthly)} / month</strong></div>
                  <div class="detail-row"><span>Status</span>${badge("Active")}</div>
                  <ul class="feature-list">${addon.features.map((feature) => `<li>${svg("check")}${esc(feature)}</li>`).join("")}</ul></div>`,
                footer: `<button class="btn btn-secondary" data-modal-close>Close</button><button class="btn btn-danger" data-addon-cancel>Cancel add-on</button>`,
                onMount(api) {
                  api.el.querySelector("[data-addon-cancel]").addEventListener("click", () => {
                    addon.status = "inactive";
                    Admin.store.save();
                    Admin.closeModal();
                    Admin.toast(`${addon.name} cancelled`, "success");
                    Admin.rerender();
                  });
                },
              });
            }
          });
        });
      };
      draw();
    },
  };

  /* ---------------------------------------------------------------------
     Staff & roles
     --------------------------------------------------------------------- */

  const PERMISSIONS = ["Dashboard", "Catalog", "Orders", "Customers", "Content", "Accounting", "Settings", "Staff", "Archive"];
  const ROLE_DEFS = [
    { role: "Owner / Admin", description: "Full access to everything, including billing.", allow: PERMISSIONS },
    { role: "Manager", description: "Runs the store day to day. No staff or billing access.", allow: ["Dashboard", "Catalog", "Orders", "Customers", "Content", "Accounting", "Archive"] },
    { role: "Support", description: "Handles orders, messages and reviews.", allow: ["Dashboard", "Orders", "Customers", "Content"] },
    { role: "Accountant", description: "Reads financial data and exports reports.", allow: ["Dashboard", "Accounting", "Archive"] },
  ];

  Admin.pages.staff = {
    render(container) {
      const state = Admin.uiState.staff || (Admin.uiState.staff = { q: "" });
      const currentAdmin = Admin.store.get("profile").email;

      const openForm = (row) => {
        Admin.formModal({
          title: row ? "Edit team member" : "Invite team member",
          fields: [
            { name: "name", label: "Full name", required: true, full: true },
            { name: "email", label: "Email", type: "email", required: true },
            { name: "role", label: "Role", type: "select", options: ROLE_DEFS.map((role) => role.role) },
            { name: "status", label: "Status", type: "select", options: ["Active", "Invited", "Suspended"] },
          ],
          values: row || { role: "Support", status: "Invited", name: "", email: "" },
          submitLabel: row ? "Save changes" : "Send invite",
          onSubmit(values) {
            if (row) Admin.store.update("staff", row.id, values);
            else Admin.store.add("staff", { ...values, lastActive: "" });
            Admin.toast(row ? "Team member updated" : `Invite sent to ${values.email}`, "success");
            Admin.rerender();
          },
        });
      };

      const draw = () => {
        const all = Admin.store.list("staff");
        const rows = all.filter((member) => `${member.name} ${member.email} ${member.role}`.toLowerCase().includes(state.q.toLowerCase()));
        container.innerHTML = `${Admin.pageHead({
          group: "System",
          title: "Staff & Roles",
          subtitle: "Give team members their own login with only the access they need.",
          actions: `<button class="btn btn-secondary" data-staff-export>${svg("download")}Export</button><button class="btn btn-primary" data-staff-invite>${svg("plus")}Invite team member</button>`,
        })}
          <div class="stat-strip">
            <div class="stat-mini"><span>Team members</span><strong>${all.length}</strong></div>
            <div class="stat-mini"><span>Active</span><strong>${all.filter((member) => member.status === "Active").length}</strong></div>
            <div class="stat-mini"><span>Pending invites</span><strong>${all.filter((member) => member.status === "Invited").length}</strong></div>
          </div>
          <div class="panel">
            <div class="table-toolbar"><div class="toolbar-left"><span class="table-search">${svg("search")}<input class="input" id="staffSearch" placeholder="Search team" value="${esc(state.q)}"></span></div><div class="toolbar-right"><span class="result-count">${rows.length} members</span></div></div>
            ${rows.length
              ? `<div class="table-wrap"><table class="data-table">
                  <thead><tr><th>Member</th><th>Role</th><th>Status</th><th>Last active</th><th class="th-actions">Actions</th></tr></thead>
                  <tbody>${rows
                    .map(
                      (member) => `<tr data-id="${esc(member.id)}"><td><div class="member-cell"><span class="avatar">${Admin.initials(member.name)}</span><div class="cell-stack"><strong>${esc(member.name)}</strong><span>${esc(member.email)}</span></div></div></td>
                        <td>${badge(member.role, member.role === "Owner / Admin" ? "blue" : "gray")}</td><td>${badge(member.status)}</td>
                        <td class="muted small">${member.lastActive ? Admin.dateTime(member.lastActive) : "Never"}</td>
                        <td class="table-actions">
                          ${member.email === currentAdmin ? '<span class="muted small">You</span>' : `<button class="icon-btn" data-staff-edit="${esc(member.id)}" title="Edit">${svg("edit")}</button>
                          <button class="icon-btn" data-staff-toggle="${esc(member.id)}" title="Suspend or activate">${svg(member.status === "Suspended" ? "checkCircle" : "xCircle")}</button>
                          <button class="icon-btn" data-staff-resend="${esc(member.id)}" title="Resend invite">${svg("send")}</button>
                          <button class="icon-btn danger" data-staff-remove="${esc(member.id)}" title="Remove">${svg("trash")}</button>`}
                        </td></tr>`
                    )
                    .join("")}</tbody>
                </table></div>`
              : Admin.emptyState({ icon: "staff", title: "No team members found", text: "Invite someone or clear the search." })}
          </div>

          <div class="panel"><div class="panel-head"><div><h2>Role permissions</h2><p>What each role can open. Role definitions are fixed in this demo.</p></div><span class="pill pill-soft">${PERMISSIONS.length} sections</span></div>
            <div class="table-wrap"><table class="data-table matrix">
              <thead><tr><th>Permission</th>${ROLE_DEFS.map((role) => `<th>${esc(role.role)}</th>`).join("")}</tr></thead>
              <tbody>${PERMISSIONS.map(
                (permission) => `<tr><td><strong>${esc(permission)}</strong></td>${ROLE_DEFS.map((role) => `<td class="${role.allow.includes(permission) ? "allowed" : "denied"}">${role.allow.includes(permission) ? svg("check") : "—"}</td>`).join("")}</tr>`
              ).join("")}</tbody>
            </table></div>
            <div class="role-notes">${ROLE_DEFS.map((role) => `<div><strong>${esc(role.role)}</strong><span>${esc(role.description)}</span></div>`).join("")}</div>
          </div>
        </div>`;

        const search = container.querySelector("#staffSearch");
        search.addEventListener("input", Admin.debounce((event) => {
          state.q = event.target.value;
          draw();
          const next = container.querySelector("#staffSearch");
          next.focus();
          next.setSelectionRange(next.value.length, next.value.length);
        }));
        container.querySelector("[data-staff-invite]").addEventListener("click", () => openForm(null));
        container.querySelector("[data-staff-export]").addEventListener("click", () => {
          Admin.exportCSV("staff.csv", [["Name", "Email", "Role", "Status"], ...all.map((member) => [member.name, member.email, member.role, member.status])]);
        });
        container.querySelectorAll("[data-staff-edit]").forEach((button) => {
          button.addEventListener("click", () => openForm(all.find((member) => member.id === button.dataset.staffEdit)));
        });
        container.querySelectorAll("[data-staff-toggle]").forEach((button) => {
          button.addEventListener("click", () => {
            const member = all.find((item) => item.id === button.dataset.staffToggle);
            if (!member) return;
            member.status = member.status === "Suspended" ? "Active" : "Suspended";
            Admin.store.save();
            Admin.toast(`Member ${member.status.toLowerCase()}`, "success");
            draw();
          });
        });
        container.querySelectorAll("[data-staff-resend]").forEach((button) => {
          button.addEventListener("click", () => {
            const member = all.find((item) => item.id === button.dataset.staffResend);
            if (!member) return;
            member.status = "Invited";
            Admin.store.save();
            Admin.toast(`Invite resent to ${member.email}`, "success");
            draw();
          });
        });
        container.querySelectorAll("[data-staff-remove]").forEach((button) => {
          button.addEventListener("click", () => {
            const member = all.find((item) => item.id === button.dataset.staffRemove);
            if (!member) return;
            if (member.email === currentAdmin) {
              Admin.toast("You cannot remove your own admin account.", "error");
              return;
            }
            Admin.confirm({
              title: "Remove team member?",
              message: `${esc(member.name)} will lose access to the admin immediately.`,
              confirmLabel: "Remove", danger: true,
              onConfirm() {
                Admin.store.remove("staff", member.id);
                Admin.store.archiveItem("staff", "Staff member", member.name, member);
                Admin.toast("Team member removed", "success");
                draw();
              },
            });
          });
        });
      };
      draw();
    },
  };

  /* ---------------------------------------------------------------------
     Archive
     --------------------------------------------------------------------- */

  Admin.pages.archive = {
    render(container) {
      const state = Admin.uiState.archive || (Admin.uiState.archive = { q: "", type: "all" });
      const draw = () => {
        const all = Admin.store.list("archive");
        const types = [...new Set(all.map((entry) => entry.entity))];
        const rows = all.filter((entry) => {
          if (state.type !== "all" && entry.entity !== state.type) return false;
          return `${entry.label} ${entry.entity} ${entry.collection}`.toLowerCase().includes(state.q.toLowerCase());
        });

        container.innerHTML = `${Admin.pageHead({
          group: "System",
          title: "Archive",
          subtitle: "Nothing in your store is ever permanently deleted. Deleted items are kept here.",
          actions: `<button class="btn btn-danger btn-ghost" data-archive-empty>${svg("trash")}Empty archive</button>`,
        })}
          <div class="panel">
            <div class="table-toolbar">
              <div class="toolbar-left"><span class="table-search">${svg("search")}<input class="input" id="archiveSearch" placeholder="Search archived items" value="${esc(state.q)}"></span>
                <select class="select" id="archiveType"><option value="all">All item types</option>${types.map((type) => `<option value="${esc(type)}"${state.type === type ? " selected" : ""}>${esc(type)}</option>`).join("")}</select>
              </div>
              <div class="toolbar-right"><span class="result-count">${rows.length} of ${all.length}</span></div>
            </div>
            ${rows.length
              ? `<div class="table-wrap"><table class="data-table">
                  <thead><tr><th>Item</th><th>Type</th><th>Deleted</th><th class="th-actions">Actions</th></tr></thead>
                  <tbody>${rows
                    .map(
                      (entry) => `<tr data-id="${esc(entry.id)}"><td><div class="cell-stack"><strong>${esc(entry.label)}</strong><span class="mono">${esc(entry.collection)}</span></div></td>
                        <td>${badge(entry.entity, "gray")}</td><td class="muted small">${Admin.dateTime(entry.deletedAt)}</td>
                        <td class="table-actions"><button class="btn btn-secondary btn-sm" data-archive-restore="${esc(entry.id)}">${svg("refresh")}Restore</button>
                        <button class="icon-btn danger" data-archive-purge="${esc(entry.id)}" title="Delete permanently">${svg("trash")}</button></td></tr>`
                    )
                    .join("")}</tbody>
                </table></div>`
              : Admin.emptyState({ icon: "archive", title: all.length ? "No matches" : "Archive is empty", text: all.length ? "Try a different search or type." : "Deleted products, pages, coupons and staff will be kept here." })}
          </div>
          <div class="alert alert-info archive-note">${svg("shield")}Restoring an item puts it back with a new ID. Permanently deleting is only available in this demo archive.</div>
        </div>`;

        container.querySelector("#archiveSearch").addEventListener("input", Admin.debounce((event) => {
          state.q = event.target.value;
          draw();
          const input = container.querySelector("#archiveSearch");
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }));
        container.querySelector("#archiveType").addEventListener("change", (event) => {
          state.type = event.target.value;
          draw();
        });
        container.querySelectorAll("[data-archive-restore]").forEach((button) => {
          button.addEventListener("click", () => {
            const entry = Admin.store.restoreArchive(button.dataset.archiveRestore);
            Admin.toast(`${entry?.label || "Item"} restored`, "success");
            draw();
          });
        });
        container.querySelectorAll("[data-archive-purge]").forEach((button) => {
          button.addEventListener("click", () => {
            const entry = all.find((item) => item.id === button.dataset.archivePurge);
            Admin.confirm({
              title: "Delete permanently?",
              message: `“${esc(entry?.label || "Item")}” cannot be restored after this.`,
              confirmLabel: "Delete forever", danger: true,
              onConfirm() {
                Admin.store.purgeArchive(button.dataset.archivePurge);
                Admin.toast("Item permanently deleted", "success");
                draw();
              },
            });
          });
        });
        container.querySelector("[data-archive-empty]").addEventListener("click", () => {
          if (!all.length) {
            Admin.toast("The archive is already empty.", "error");
            return;
          }
          Admin.confirm({
            title: "Empty the archive?",
            message: `All ${all.length} archived items will be permanently deleted. This cannot be undone.`,
            confirmLabel: "Empty archive", danger: true,
            onConfirm() {
              Admin.store.data.archive = [];
              Admin.store.save();
              Admin.toast("Archive emptied", "success");
              draw();
            },
          });
        });
      };
      draw();
    },
  };

  /* ---------------------------------------------------------------------
     Admin profile
     --------------------------------------------------------------------- */

  Admin.pages.profile = {
    render(container) {
      const draw = () => {
        const profile = Admin.store.get("profile");
        const devices = Admin.store.list("devices");
        container.innerHTML = `${Admin.pageHead({
          group: "System",
          title: "Admin Profile & Credentials",
          subtitle: "Manage your administrator identity and authentication credentials.",
          actions: `<button class="btn btn-primary" data-profile-save>${svg("check")}Save profile</button>`,
        })}
          <div class="profile-grid">
            <div class="panel"><div class="panel-head"><div><h2>Your profile</h2><p>This name and email appear on audit entries and customer emails.</p></div></div>
              <div class="profile-card-head"><span class="avatar avatar-lg">${Admin.initials(profile.name)}</span><div><strong>${esc(profile.name)}</strong><span>${badge(profile.role, "blue")}</span><p>Member since ${Admin.dateShort(profile.memberSince)}</p></div></div>
              <form id="profileForm" class="form-grid profile-form">
                <div class="field"><label for="profileName">Full name</label><input class="input" id="profileName" name="name" value="${esc(profile.name)}" required></div>
                <div class="field"><label for="profileEmail">Email</label><input class="input" id="profileEmail" name="email" type="email" value="${esc(profile.email)}" required></div>
                <div class="field"><label for="profileRole">Role</label><input class="input" id="profileRole" value="${esc(profile.role)}" disabled></div>
                <div class="field"><label>Last sign-in</label><input class="input" value="${Admin.dateTime(profile.lastSignIn)}" disabled></div>
              </form>
            </div>

            <div class="panel"><div class="panel-head"><div><h2>Password</h2><p>Use at least eight characters. The current demo password is <code>admin1234</code>.</p></div></div>
              <form id="passwordForm" class="form-grid">
                <div class="field full"><label for="currentPassword">Current password</label><input class="input" id="currentPassword" name="current" type="password" autocomplete="current-password" required></div>
                <div class="field"><label for="newPassword">New password</label><input class="input" id="newPassword" name="next" type="password" autocomplete="new-password" minlength="8" required></div>
                <div class="field"><label for="confirmPassword">Confirm password</label><input class="input" id="confirmPassword" name="confirm" type="password" autocomplete="new-password" minlength="8" required></div>
                <div class="field full"><button class="btn btn-primary" type="submit">Update password</button></div>
              </form>
            </div>
          </div>

          <div class="panel"><div class="panel-head"><div><h2>Active sessions</h2><p>Devices signed in to this admin.</p></div><button class="btn btn-secondary btn-sm" data-profile-signout-others>Sign out other sessions</button></div>
            <div class="table-wrap"><table class="data-table">
              <thead><tr><th>Device</th><th>Type</th><th>Last seen</th><th class="th-actions">Actions</th></tr></thead>
              <tbody>${devices
                .map(
                  (device) => `<tr><td><strong>${esc(device.name)}</strong> ${device.current ? badge("Current", "blue") : ""}</td><td>${esc(device.type)}</td><td class="muted small">${Admin.dateTime(device.lastSeen)}</td>
                    <td class="table-actions">${device.current ? '<span class="muted small">This device</span>' : `<button class="icon-btn" data-profile-revoke="${esc(device.id)}" title="Sign out">${svg("logout")}</button>`}</td></tr>`
                )
                .join("")}</tbody>
            </table></div>
          </div>

          <div class="panel danger-zone"><div class="panel-head"><div><h2>Demo data</h2><p>This clone keeps its demo records in your browser. Reset to the original fictional data at any time.</p></div>
            <button class="btn btn-danger" data-profile-reset>Reset demo data</button></div>
          </div>
        </div>`;

        const saveProfile = () => {
          const form = container.querySelector("#profileForm");
          if (!form.reportValidity()) return;
          const values = Admin.formValues(form);
          profile.name = values.name;
          profile.email = values.email;
          const staff = Admin.store.list("staff").find((member) => member.role === "Owner / Admin");
          if (staff) {
            staff.name = values.name;
            staff.email = values.email;
          }
          Admin.store.save();
          Admin.hydrateShell?.();
          Admin.toast("Profile updated", "success");
          draw();
        };

        container.querySelector("[data-profile-save]").addEventListener("click", saveProfile);
        container.querySelector("#profileForm").addEventListener("submit", (event) => {
          event.preventDefault();
          saveProfile();
        });
        container.querySelector("#passwordForm").addEventListener("submit", (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          if (!form.reportValidity()) return;
          const values = Admin.formValues(form);
          if (values.current !== profile.password) {
            Admin.toast("The current password is not correct.", "error");
            return;
          }
          if (values.next.length < 8) {
            Admin.toast("The new password must be at least eight characters.", "error");
            return;
          }
          if (values.next !== values.confirm) {
            Admin.toast("The new passwords do not match.", "error");
            return;
          }
          profile.password = values.next;
          Admin.store.save();
          form.reset();
          Admin.toast("Password updated", "success");
        });
        container.querySelectorAll("[data-profile-revoke]").forEach((button) => {
          button.addEventListener("click", () => {
            Admin.store.data.devices = Admin.store.list("devices").filter((device) => device.id !== button.dataset.profileRevoke);
            Admin.store.save();
            Admin.toast("Session signed out", "success");
            draw();
          });
        });
        container.querySelector("[data-profile-signout-others]").addEventListener("click", () => {
          Admin.confirm({
            title: "Sign out other sessions?",
            message: "Every device except this one will be signed out.",
            confirmLabel: "Sign out others", danger: true,
            onConfirm() {
              Admin.store.data.devices = Admin.store.list("devices").filter((device) => device.current);
              Admin.store.save();
              Admin.toast("Other sessions signed out", "success");
              draw();
            },
          });
        });
        container.querySelector("[data-profile-reset]").addEventListener("click", () => {
          Admin.confirm({
            title: "Reset all demo data?",
            message: "Products, orders, settings, archived items and changes you made in this clone will return to the original fictional seed.",
            confirmLabel: "Reset demo", danger: true,
            onConfirm() {
              Admin.store.reset();
              Admin.store.applyTheme();
              Admin.uiState = {};
              Admin.hydrateShell?.();
              Admin.toast("Demo data reset", "success");
              Admin.rerender();
            },
          });
        });
      };
      draw();
    },
  };
})();
