/* Baytak Noor Admin — Sales & Customers pages */
(() => {
  "use strict";

  window.Admin = window.Admin || {};
  Admin.pages = Admin.pages || {};

  const { svg, esc, badge, money } = Admin;

  const customerCounts = () => {
    const counts = {};
    Admin.store.list("orders").forEach((order) => {
      counts[order.customer.email] = (counts[order.customer.email] || 0) + 1;
    });
    return counts;
  };

  const repeatLabel = (order) => (customerCounts()[order.customer.email] > 1 ? "repeat" : "first");

  /* ---------------------------------------------------------------------
     Orders
     --------------------------------------------------------------------- */

  function orderPanel(order) {
    const items = order.items
      .map(
        (item) => `<tr><td>${esc(item.name)}</td><td>${item.qty}</td><td>${money(item.price)}</td><td>${money(item.price * item.qty)}</td></tr>`
      )
      .join("");
    const overlay = document.createElement("div");
    overlay.className = "side-overlay";
    overlay.innerHTML = `<aside class="side-panel" aria-label="Order ${esc(order.number)}">
      <div class="side-head">
        <div><span class="page-group">Order</span><h2>#${esc(order.number)}</h2><p>${Admin.dateTime(order.date)}</p></div>
        <button type="button" class="icon-btn" data-close-panel aria-label="Close">${svg("x")}</button>
      </div>
      <div class="side-body">
        <div class="order-meta-grid">
          <div><span>Payment</span>${badge(order.payment)}</div>
          <div><span>Fulfillment</span>${badge(order.fulfillment)}</div>
          <div><span>Channel</span><strong>${esc(order.channel)}</strong></div>
          <div><span>Total</span><strong>${money(order.total)}</strong></div>
        </div>

        <section class="panel-card">
          <h3>Customer</h3>
          <div class="detail-row"><span>Name</span><strong>${esc(order.customer.name)}</strong></div>
          <div class="detail-row"><span>Email</span><a href="mailto:${esc(order.customer.email)}">${esc(order.customer.email)}</a></div>
          <div class="detail-row"><span>Phone</span><strong>${esc(order.customer.phone)}</strong></div>
          <div class="detail-row"><span>Address</span><strong>${esc(order.customer.address)}, ${esc(order.customer.city)}</strong></div>
          <div class="detail-row"><span>Buyer</span>${badge(repeatLabel(order) === "repeat" ? "Repeat" : "First-time", repeatLabel(order) === "repeat" ? "blue" : "gray")}</div>
        </section>

        <section class="panel-card">
          <h3>Items</h3>
          <div class="table-wrap"><table class="data-table compact">
            <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
            <tbody>${items}</tbody>
          </table></div>
          <div class="order-totals">
            <div><span>Subtotal</span><strong>${money(order.subtotal)}</strong></div>
            <div><span>Shipping</span><strong>${money(order.shipping)}</strong></div>
            ${order.discount ? `<div><span>Discount</span><strong>− ${money(order.discount)}</strong></div>` : ""}
            <div class="total"><span>Total</span><strong>${money(order.total)}</strong></div>
          </div>
        </section>

        <section class="panel-card">
          <h3>Update order</h3>
          <div class="form-grid">
            <div class="field"><label for="opPayment">Payment status</label>
              <select class="select input" id="opPayment">
                ${["PAID", "UNPAID", "REFUNDED"].map((value) => `<option${order.payment === value ? " selected" : ""}>${value}</option>`).join("")}
              </select></div>
            <div class="field"><label for="opFulfillment">Fulfillment</label>
              <select class="select input" id="opFulfillment">
                ${["UNFULFILLED", "FULFILLED", "RETURNED"].map((value) => `<option${order.fulfillment === value ? " selected" : ""}>${value}</option>`).join("")}
              </select></div>
            <div class="field"><label for="opCourier">Courier</label>
              <select class="select input" id="opCourier">
                ${["PostEx", "TCS", "Leopards", "Not booked"].map((value) => `<option${order.courier === value ? " selected" : ""}>${value}</option>`).join("")}
              </select></div>
            <div class="field"><label for="opTracking">Tracking number</label>
              <input class="input" id="opTracking" value="${esc(order.tracking || "")}" placeholder="PX-0000000"></div>
            <div class="field full"><label for="opNotes">Internal note</label>
              <textarea class="input textarea" id="opNotes" rows="2">${esc(order.notes || "")}</textarea></div>
          </div>
        </section>
      </div>
      <div class="side-foot">
        <button class="btn btn-primary" data-save-order>Save changes</button>
        <button class="btn btn-secondary" data-fulfil-order>Mark fulfilled</button>
        <button class="btn btn-secondary" data-wa-order>${svg("whatsapp")}WhatsApp</button>
        <button class="btn btn-secondary" data-print-order>${svg("printer")}Invoice</button>
        <button class="btn btn-danger btn-ghost" data-refund-order>Refund</button>
      </div>
    </aside>`;
    document.body.appendChild(overlay);
    document.body.classList.add("no-scroll");
    requestAnimationFrame(() => overlay.classList.add("open"));

    const close = () => {
      overlay.classList.remove("open");
      document.body.classList.remove("no-scroll");
      setTimeout(() => overlay.remove(), 180);
    };
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.closest("[data-close-panel]")) close();
    });
    overlay.querySelector("[data-save-order]").addEventListener("click", () => {
      Admin.store.update("orders", order.id, {
        payment: overlay.querySelector("#opPayment").value,
        fulfillment: overlay.querySelector("#opFulfillment").value,
        courier: overlay.querySelector("#opCourier").value,
        tracking: overlay.querySelector("#opTracking").value.trim(),
        notes: overlay.querySelector("#opNotes").value.trim(),
      });
      close();
      Admin.toast("Order updated", "success");
      Admin.rerender();
    });
    overlay.querySelector("[data-fulfil-order]").addEventListener("click", () => {
      Admin.store.update("orders", order.id, { fulfillment: "FULFILLED" });
      close();
      Admin.toast("Order marked fulfilled", "success");
      Admin.rerender();
    });
    overlay.querySelector("[data-print-order]").addEventListener("click", () => {
      Admin.toast("Invoice preview generated for #" + order.number, "success");
    });
    overlay.querySelector("[data-refund-order]").addEventListener("click", () => {
      Admin.confirm({
        title: "Refund this order?",
        message: "The payment status will change to REFUNDED. This demo does not contact a payment provider.",
        confirmLabel: "Refund",
        danger: true,
        onConfirm() {
          Admin.store.update("orders", order.id, { payment: "REFUNDED" });
          close();
          Admin.toast("Order marked refunded", "success");
          Admin.rerender();
        },
      });
    });
    overlay.querySelector("[data-wa-order]").addEventListener("click", () => {
      const conversation = Admin.store.list("whatsapp").find((item) => item.orderId === order.id);
      if (conversation) {
        Admin.uiState.whatsapp = { tab: "all", selected: conversation.id };
        close();
        location.hash = "#/whatsapp";
      } else {
        Admin.toast("No WhatsApp thread for this order yet.", "error");
      }
    });
    const escHandler = (event) => {
      if (event.key === "Escape") {
        document.removeEventListener("keydown", escHandler);
        close();
      }
    };
    document.addEventListener("keydown", escHandler);
  }

  Admin.pages.orders = {
    render(container) {
      const state =
        Admin.uiState.orders ||
        (Admin.uiState.orders = { q: "", payment: "all", fulfillment: "all", customer: "all", selected: [] });

      const draw = () => {
        const all = Admin.store.list("orders");
        const counts = customerCounts();
        const rows = all.filter((order) => {
          if (state.payment !== "all" && order.payment !== state.payment) return false;
          if (state.fulfillment !== "all" && order.fulfillment !== state.fulfillment) return false;
          if (state.customer !== "all" && repeatLabel(order) !== state.customer) return false;
          if (state.q) {
            const haystack = `${order.number} ${order.customer.name} ${order.customer.email} ${order.customer.phone} ${order.tracking}`.toLowerCase();
            if (!haystack.includes(state.q.toLowerCase())) return false;
          }
          return true;
        });
        state.selected = state.selected.filter((id) => all.some((order) => order.id === id));
        const selectedVisible = rows.filter((order) => state.selected.includes(order.id));
        const revenue = rows.filter((order) => order.payment === "PAID").reduce((sum, order) => sum + order.total, 0);
        const unpaid = rows.filter((order) => order.payment === "UNPAID").length;
        const unfulfilled = rows.filter((order) => order.fulfillment === "UNFULFILLED").length;

        container.innerHTML = `${Admin.pageHead({
          group: "Sales & Customers",
          title: "Orders Management",
          subtitle: "Track, filter, fulfill, and manage store customer orders and courier shipments.",
          actions: `<button class="btn btn-secondary" data-order-act="sync">${svg("refresh")}Sync PostEx Status</button>
            <button class="btn btn-secondary" data-order-act="refresh">${svg("refresh")}Refresh</button>`,
        })}
          <div class="stat-strip">
            <div class="stat-mini"><span>Visible orders</span><strong>${rows.length}</strong></div>
            <div class="stat-mini"><span>Paid revenue</span><strong>${money(revenue)}</strong></div>
            <div class="stat-mini"><span>Unpaid</span><strong>${unpaid}</strong></div>
            <div class="stat-mini"><span>Unfulfilled</span><strong>${unfulfilled}</strong></div>
          </div>
          <div class="panel">
            <div class="table-toolbar">
              <div class="toolbar-left">
                <span class="table-search">${svg("search")}<input class="input" id="orderSearch" placeholder="Search order, customer or tracking" value="${esc(state.q)}"></span>
                <select class="select" id="orderPayment" aria-label="Payment status">
                  <option value="all">All Payment Statuses</option>
                  ${["UNPAID", "PAID", "REFUNDED"].map((value) => `<option${state.payment === value ? " selected" : ""}>${value}</option>`).join("")}
                </select>
                <select class="select" id="orderFulfillment" aria-label="Fulfillment status">
                  <option value="all">All Fulfillment Statuses</option>
                  ${["UNFULFILLED", "FULFILLED", "RETURNED"].map((value) => `<option${state.fulfillment === value ? " selected" : ""}>${value}</option>`).join("")}
                </select>
                <select class="select" id="orderCustomer" aria-label="Customer type">
                  <option value="all">All Customers</option>
                  <option value="repeat"${state.customer === "repeat" ? " selected" : ""}>⭐ Repeat Buyers (2+ Orders)</option>
                  <option value="first"${state.customer === "first" ? " selected" : ""}>✨ First-Time Buyers</option>
                </select>
              </div>
              <div class="toolbar-right"><span class="result-count">${rows.length} of ${all.length}</span></div>
            </div>
            ${selectedVisible.length
              ? `<div class="bulk-bar"><strong>${selectedVisible.length} selected</strong>
                  <button class="btn btn-secondary btn-sm" data-bulk-fulfil>Mark fulfilled</button>
                  <button class="btn btn-secondary btn-sm" data-bulk-clear>Clear</button></div>`
              : ""}
            ${rows.length
              ? `<div class="table-wrap"><table class="data-table orders-table">
                  <thead><tr>
                    <th class="th-check"><input type="checkbox" id="orderCheckAll" aria-label="Select all orders"${rows.every((order) => state.selected.includes(order.id)) ? " checked" : ""}></th>
                    <th>Order #</th><th>Date</th><th>Customer</th><th>Courier / Tracking</th><th>Payment</th><th>Fulfillment</th><th>Items</th><th>Total</th><th class="th-actions">Actions</th>
                  </tr></thead>
                  <tbody>${rows
                    .map(
                      (order) => `<tr data-id="${esc(order.id)}"${state.selected.includes(order.id) ? ' class="selected-row"' : ""}>
                        <td class="th-check"><input type="checkbox" data-order-check="${esc(order.id)}" aria-label="Select ${esc(order.number)}"${state.selected.includes(order.id) ? " checked" : ""}></td>
                        <td><strong>#${esc(order.number)}</strong></td>
                        <td class="muted small">${Admin.dateShort(order.date)}</td>
                        <td><div class="cell-stack"><strong>${esc(order.customer.name)}</strong><span>${esc(order.customer.email)}</span></div></td>
                        <td><div class="cell-stack"><strong>${esc(order.courier)}</strong><span class="mono">${esc(order.tracking || "Not booked")}</span></div></td>
                        <td>${badge(order.payment)}</td>
                        <td>${badge(order.fulfillment)}</td>
                        <td>${order.items.reduce((sum, item) => sum + item.qty, 0)}</td>
                        <td><strong>${money(order.total)}</strong></td>
                        <td class="table-actions"><button class="btn btn-secondary btn-sm" data-view-order="${esc(order.id)}">${svg("eye")}View</button></td>
                      </tr>`
                    )
                    .join("")}</tbody>
                </table></div>`
              : Admin.emptyState({ icon: "orders", title: "No orders match these filters", text: "Try clearing the search or selecting a different status." })}
          </div>
        </div>`;

        container.querySelector("#orderSearch").addEventListener("input", Admin.debounce((event) => {
          state.q = event.target.value;
          draw();
          const input = container.querySelector("#orderSearch");
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }));
        container.querySelector("#orderPayment").addEventListener("change", (event) => {
          state.payment = event.target.value;
          draw();
        });
        container.querySelector("#orderFulfillment").addEventListener("change", (event) => {
          state.fulfillment = event.target.value;
          draw();
        });
        container.querySelector("#orderCustomer").addEventListener("change", (event) => {
          state.customer = event.target.value;
          draw();
        });
        container.querySelector("#orderCheckAll")?.addEventListener("change", (event) => {
          if (event.target.checked) state.selected = [...new Set([...state.selected, ...rows.map((order) => order.id)])];
          else state.selected = state.selected.filter((id) => !rows.some((order) => order.id === id));
          draw();
        });
        container.querySelectorAll("[data-order-check]").forEach((checkbox) => {
          checkbox.addEventListener("change", () => {
            const id = checkbox.dataset.orderCheck;
            state.selected = checkbox.checked ? [...new Set([...state.selected, id])] : state.selected.filter((item) => item !== id);
            draw();
          });
        });
        container.querySelectorAll("[data-view-order]").forEach((button) => {
          button.addEventListener("click", () => {
            const order = all.find((item) => item.id === button.dataset.viewOrder);
            if (order) orderPanel(order);
          });
        });
        container.querySelector("[data-bulk-clear]")?.addEventListener("click", () => {
          state.selected = [];
          draw();
        });
        container.querySelector("[data-bulk-fulfil]")?.addEventListener("click", () => {
          selectedVisible.forEach((order) => Admin.store.update("orders", order.id, { fulfillment: "FULFILLED" }));
          state.selected = [];
          Admin.toast(`${selectedVisible.length} orders marked fulfilled`, "success");
          draw();
        });
        container.querySelectorAll("[data-order-act]").forEach((button) => {
          button.addEventListener("click", () => {
            if (button.dataset.orderAct === "refresh") {
              Admin.toast("Orders refreshed", "success");
              draw();
              return;
            }
            let synced = 0;
            Admin.store.list("orders").forEach((order) => {
              if (order.courier === "PostEx" && !order.tracking) {
                order.tracking = `PX-${Math.floor(8800000 + Math.random() * 99999)}`;
                synced += 1;
              }
            });
            Admin.store.save();
            Admin.toast(synced ? `${synced} PostEx tracking numbers synced` : "PostEx is already up to date", "success");
            draw();
          });
        });
      };
      draw();
    },
  };

  /* ---------------------------------------------------------------------
     WhatsApp
     --------------------------------------------------------------------- */

  Admin.pages.whatsapp = {
    render(container) {
      const state = Admin.uiState.whatsapp || (Admin.uiState.whatsapp = { tab: "all", selected: "" });
      const draw = () => {
        const all = Admin.store.list("whatsapp");
        const counts = {
          all: all.length,
          needs: all.filter((conversation) => conversation.needsReply).length,
          confirmed: all.filter((conversation) => conversation.confirmed).length,
        };
        const visible = all.filter((conversation) => {
          if (state.tab === "needs") return conversation.needsReply;
          if (state.tab === "confirmed") return conversation.confirmed;
          return true;
        });
        if (!visible.some((conversation) => conversation.id === state.selected)) {
          state.selected = visible[0]?.id || "";
        }
        const active = all.find((conversation) => conversation.id === state.selected);
        const orderOf = (conversation) => Admin.store.byId("orders", conversation.orderId);
        const lastMessage = (conversation) => conversation.messages[conversation.messages.length - 1];
        const timeOf = (iso) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

        container.innerHTML = `${Admin.pageHead({
          group: "Sales & Customers",
          title: "Order WhatsApp Messages",
          subtitle: "Customer replies, confirmation audit history, and direct order messaging.",
          pill: "Cloud API Live",
          actions: `<button class="btn btn-secondary" data-wa-act="refresh">${svg("refresh")}Refresh</button>`,
        })}
          <div class="tabbar" role="tablist">
            ${[["all", "All", counts.all], ["needs", "Needs Reply", counts.needs], ["confirmed", "Confirmed", counts.confirmed]]
              .map(([value, label, count]) => `<button class="tab${state.tab === value ? " active" : ""}" data-wa-tab="${value}"><span>${label}</span><span class="count">${count}</span></button>`)
              .join("")}
          </div>
          <div class="panel whatsapp-panel">
            ${all.length
              ? `<div class="split">
                  <div class="list-pane">
                    ${visible.length
                      ? visible
                          .map((conversation) => {
                            const order = orderOf(conversation);
                            const last = lastMessage(conversation);
                            return `<button type="button" class="conversation${conversation.id === state.selected ? " active" : ""}" data-conv="${esc(conversation.id)}">
                              <span class="avatar">${Admin.initials(conversation.customer)}</span>
                              <span class="conversation-copy">
                                <span class="conversation-top"><strong>${esc(conversation.customer)}</strong><span>${order ? "#" + esc(order.number) : ""}</span></span>
                                <span class="conversation-bottom"><span>${esc(last?.text || "No messages")}</span><time>${last ? timeOf(last.time) : ""}</time></span>
                              </span>
                              ${conversation.needsReply ? '<span class="unread-dot"></span>' : ""}
                            </button>`;
                          })
                          .join("")
                      : Admin.emptyState({ icon: "whatsapp", title: "No conversations here", text: "Switch tabs to see other order threads." })}
                  </div>
                  <div class="thread-pane">
                    ${active
                      ? `<div class="thread-head">
                          <div class="cell-stack"><strong>${esc(active.customer)}</strong><span>${esc(active.phone)}${orderOf(active) ? ` · Order #${esc(orderOf(active).number)}` : ""}</span></div>
                          <div class="thread-actions">
                            ${active.confirmed ? badge("Confirmed") : `<button class="btn btn-secondary btn-sm" data-confirm-wa>${svg("check")}Confirm order</button>`}
                            <a class="btn btn-secondary btn-sm" href="#/orders">${svg("orders")}Open order</a>
                          </div>
                        </div>
                        <div class="thread" id="waThread">
                          ${active.messages
                            .map(
                              (message) => `<div class="message ${message.from === "store" ? "out" : "in"}">
                                <div class="bubble">${esc(message.text)}</div>
                                <time>${timeOf(message.time)}</time>
                              </div>`
                            )
                            .join("")}
                        </div>
                        <div class="quick-replies">
                          ${["Confirm order", "Share tracking number", "Ask for complete address"].map((text) => `<button class="chip" data-quick="${text}">${text}</button>`).join("")}
                        </div>
                        <form class="composer" id="waForm">
                          <input class="input" id="waInput" placeholder="Write a WhatsApp reply…" autocomplete="off">
                          <button class="btn btn-primary" type="submit">${svg("send")}Send</button>
                        </form>`
                      : Admin.emptyState({ icon: "whatsapp", title: "Select an order", text: "Choose a conversation to view messages." })}
                  </div>
                </div>`
              : Admin.emptyState({ icon: "whatsapp", title: "No WhatsApp messages yet", text: "Messages sent with your orders will appear here." })}
          </div>
        </div>`;

        container.querySelectorAll("[data-wa-tab]").forEach((button) => {
          button.addEventListener("click", () => {
            state.tab = button.dataset.waTab;
            draw();
          });
        });
        container.querySelectorAll("[data-conv]").forEach((button) => {
          button.addEventListener("click", () => {
            state.selected = button.dataset.conv;
            draw();
          });
        });
        container.querySelectorAll('[data-wa-act="refresh"]').forEach((button) => {
          button.addEventListener("click", () => {
            Admin.toast("WhatsApp threads refreshed", "success");
            draw();
          });
        });
        container.querySelectorAll("[data-quick]").forEach((button) => {
          button.addEventListener("click", () => {
            const input = container.querySelector("#waInput");
            if (input) {
              input.value = button.dataset.quick;
              input.focus();
            }
          });
        });
        const form = container.querySelector("#waForm");
        form?.addEventListener("submit", (event) => {
          event.preventDefault();
          const input = container.querySelector("#waInput");
          const text = input.value.trim();
          if (!text || !active) return;
          active.messages.push({ id: Admin.uid("msg"), from: "store", text, time: new Date().toISOString() });
          active.needsReply = false;
          Admin.store.save();
          Admin.toast("Message sent", "success");
          draw();
        });
        container.querySelector("[data-confirm-wa]")?.addEventListener("click", () => {
          if (!active) return;
          active.confirmed = true;
          active.needsReply = false;
          active.messages.push({ id: Admin.uid("msg"), from: "store", text: "Your order is confirmed. Thank you!", time: new Date().toISOString() });
          Admin.store.save();
          Admin.toast("Order confirmed on WhatsApp", "success");
          draw();
        });
      };
      draw();
    },
  };

  /* ---------------------------------------------------------------------
     Email Log
     --------------------------------------------------------------------- */

  Admin.pages.emails = {
    render(container) {
      Admin.listPage(container, {
        slug: "emails",
        key: "emails",
        singular: "email",
        hideNew: true,
        archive: false,
        searchKeys: ["to", "subject", "template"],
        searchPlaceholder: "Search recipient or subject",
        filters: [
          {
            key: "status", label: "Delivery result",
            options: [
              { value: "all", label: "All results" },
              { value: "Sent", label: "Sent" },
              { value: "Failed", label: "Failed" },
              { value: "Not sent (email not set up)", label: "Not sent (email not set up)" },
            ],
            match: (row, value) => row.status === value,
          },
        ],
        intro: `<div class="alert alert-info">${svg("mail")}Every email your store sends is recorded here. Emails sent by the store do not appear in your mailbox's Sent folder.</div>`,
        columns: [
          { label: "To", render: (row) => `<strong>${esc(row.to)}</strong>` },
          { label: "Subject", render: (row) => `<div class="cell-stack"><strong>${esc(row.subject)}</strong><span>${esc(row.template)}</span></div>` },
          {
            label: "Status",
            render: (row) => badge(row.status === "Not sent (email not set up)" ? "Not sent" : row.status, row.status === "Sent" ? "green" : row.status === "Failed" ? "red" : "amber"),
          },
          { label: "Date", render: (row) => `<span class="muted small">${Admin.dateTime(row.date)}</span>` },
        ],
        rowActions: (row) => `<button type="button" class="icon-btn" data-act="view" data-id="${esc(row.id)}" title="View">${svg("eye")}</button>
          <button type="button" class="icon-btn" data-act="resend" data-id="${esc(row.id)}" title="Resend">${svg("refresh")}</button>`,
        onAction(act, row) {
          if (!row) return;
          if (act === "view") {
            Admin.openModal({
              title: "Email details",
              body: `<div class="detail-list">
                <div class="detail-row"><span>To</span><strong>${esc(row.to)}</strong></div>
                <div class="detail-row"><span>Subject</span><strong>${esc(row.subject)}</strong></div>
                <div class="detail-row"><span>Template</span><strong>${esc(row.template)}</strong></div>
                <div class="detail-row"><span>Status</span>${badge(row.status, row.status === "Sent" ? "green" : row.status === "Failed" ? "red" : "amber")}</div>
                <div class="detail-row"><span>Sent</span><strong>${Admin.dateTime(row.date)}</strong></div>
                ${row.error ? `<div class="detail-row"><span>Error</span><strong class="text-danger">${esc(row.error)}</strong></div>` : ""}
              </div>
              <div class="email-preview">${esc(row.body)}</div>`,
              footer: `<button class="btn btn-secondary" data-modal-close>Close</button>`,
            });
          }
          if (act === "resend") {
            Admin.store.add("emails", {
              to: row.to,
              subject: row.subject,
              template: row.template,
              status: "Sent",
              date: new Date().toISOString(),
              error: "",
              body: row.body,
            });
            Admin.toast("Email queued again", "success");
            Admin.rerender();
          }
        },
      });
    },
  };

  /* ---------------------------------------------------------------------
     Coupons
     --------------------------------------------------------------------- */

  const couponStatus = (coupon) =>
    coupon.status === "active" && coupon.expiresAt && coupon.expiresAt < Admin.DEMO_TODAY ? "expired" : coupon.status;

  Admin.pages.coupons = {
    render(container) {
      Admin.listPage(container, {
        slug: "coupons",
        key: "coupons",
        singular: "coupon",
        plural: "coupons",
        entity: "Coupon",
        title: "Discount Coupons",
        subtitle: "Create and track promotional coupon codes, percentage/fixed deductions, and usage rules.",
        newLabel: "New Coupon",
        searchKeys: ["code", "description"],
        label: (row) => row.code,
        tabs: (rows) => [
          { value: "all", label: "all", count: rows.length },
          { value: "active", label: "active", count: rows.filter((row) => couponStatus(row) === "active").length },
          { value: "inactive", label: "inactive", count: rows.filter((row) => couponStatus(row) === "inactive").length },
          { value: "expired", label: "expired", count: rows.filter((row) => couponStatus(row) === "expired").length },
        ],
        tabFilter: (row, value) => value === "all" || couponStatus(row) === value,
        columns: [
          { label: "Code", render: (row) => `<strong class="mono">${esc(row.code)}</strong><span class="cell-sub">${esc(row.description || "")}</span>` },
          { label: "Discount", render: (row) => (row.type === "percent" ? `${row.value}%` : money(row.value)) },
          { label: "Minimum order", render: (row) => (Number(row.minOrder) ? money(row.minOrder) : "None") },
          { label: "Usage", render: (row) => `${row.used || 0}${Number(row.usageLimit) ? ` / ${row.usageLimit}` : ""}` },
          { label: "Expires", render: (row) => `<span class="muted small">${Admin.dateShort(row.expiresAt)}</span>` },
          { label: "Status", render: (row) => badge(couponStatus(row)) },
        ],
        fields: [
          { name: "code", label: "Coupon code", required: true, placeholder: "WELCOME10" },
          { name: "type", label: "Discount type", type: "select", options: [{ value: "percent", label: "Percentage" }, { value: "fixed", label: "Fixed amount" }] },
          { name: "value", label: "Discount value", type: "number", min: 0, required: true },
          { name: "minOrder", label: "Minimum order (Rs.)", type: "number", min: 0 },
          { name: "usageLimit", label: "Maximum total uses (0 = unlimited)", type: "number", min: 0 },
          { name: "startsAt", label: "Start date", type: "datetime-local" },
          { name: "expiresAt", label: "Expiration date", type: "datetime-local", required: true },
          { name: "status", label: "Status", type: "select", options: ["active", "inactive"] },
          { name: "description", label: "Description", type: "textarea", full: true, rows: 2 },
        ],
        defaults: { type: "percent", value: 10, minOrder: 0, usageLimit: 0, used: 0, status: "active", description: "" },
        rowActions: (row) => `<button class="icon-btn" data-act="copy" data-id="${esc(row.id)}" title="Copy code">${svg("copy")}</button>
          <button class="icon-btn" data-edit title="Edit">${svg("edit")}</button>
          <button class="icon-btn danger" data-delete title="Delete">${svg("trash")}</button>`,
        onAction(act, row) {
          if (act === "copy" && row) Admin.copyText(row.code, "Coupon code copied");
        },
      });
    },
  };

  /* ---------------------------------------------------------------------
     Reviews
     --------------------------------------------------------------------- */

  Admin.pages.reviews = {
    render(container) {
      const state = Admin.uiState.reviews || (Admin.uiState.reviews = { tab: "pending" });
      const draw = () => {
        const all = Admin.store.list("reviews");
        const counts = {
          pending: all.filter((review) => review.status === "pending").length,
          approved: all.filter((review) => review.status === "approved").length,
          all: all.length,
        };
        const visible = all.filter((review) => (state.tab === "all" ? true : review.status === state.tab));

        container.innerHTML = `${Admin.pageHead({
          group: "Sales & Customers",
          title: "Review Moderation",
          subtitle: "Approve, reject, and monitor customer product ratings and reviews.",
          actions: `<button class="btn btn-secondary" data-review-act="import">${svg("upload")}Import CSV</button>
            <button class="btn btn-secondary" data-review-act="refresh">${svg("refresh")}Refresh</button>`,
        })}
          <div class="tabbar" role="tablist">
            ${[["pending", "Pending"], ["approved", "Approved"], ["all", "All"]]
              .map(([value, label]) => `<button class="tab${state.tab === value ? " active" : ""}" data-review-tab="${value}"><span>${label}</span><span class="count">${counts[value]}</span></button>`)
              .join("")}
          </div>
          ${visible.length
            ? `<div class="review-grid">${visible
                .map((review) => {
                  const product = Admin.store.productById(review.productId);
                  return `<article class="review-card">
                    <div class="review-head">
                      <div>${Admin.stars(review.rating)}<strong>${esc(review.title)}</strong></div>
                      ${badge(review.status)}
                    </div>
                    <p class="review-body">${esc(review.body)}</p>
                    <div class="review-meta">
                      <span>${esc(review.customer)}</span>
                      <span>${esc(product?.name || "Deleted product")}</span>
                      <span>${Admin.dateShort(review.date)}</span>
                      ${review.hasPhoto ? `<span class="pill">Photo review</span>` : ""}
                    </div>
                    <div class="review-actions">
                      ${review.status === "pending"
                        ? `<button class="btn btn-primary btn-sm" data-review-action="approve" data-id="${esc(review.id)}">${svg("check")}Approve</button>
                           <button class="btn btn-secondary btn-sm" data-review-action="reject" data-id="${esc(review.id)}">Reject</button>`
                        : `<button class="btn btn-secondary btn-sm" data-review-action="unpublish" data-id="${esc(review.id)}">Unpublish</button>`}
                      <button class="icon-btn danger" data-review-action="delete" data-id="${esc(review.id)}" title="Delete">${svg("trash")}</button>
                    </div>
                  </article>`;
                })
                .join("")}</div>`
            : Admin.emptyState({ icon: "reviews", title: "No reviews in this tab", text: "New customer reviews will appear here for moderation." })}
        </div>`;

        container.querySelectorAll("[data-review-tab]").forEach((button) => {
          button.addEventListener("click", () => {
            state.tab = button.dataset.reviewTab;
            draw();
          });
        });
        container.querySelectorAll("[data-review-action]").forEach((button) => {
          button.addEventListener("click", () => {
            const review = all.find((item) => item.id === button.dataset.id);
            if (!review) return;
            const action = button.dataset.reviewAction;
            if (action === "approve") {
              review.status = "approved";
              Admin.store.save();
              Admin.toast("Review approved", "success");
              draw();
            }
            if (action === "unpublish") {
              review.status = "pending";
              Admin.store.save();
              Admin.toast("Review moved back to pending", "success");
              draw();
            }
            if (action === "reject") {
              review.status = "rejected";
              Admin.store.save();
              Admin.toast("Review rejected", "success");
              draw();
            }
            if (action === "delete") {
              Admin.confirm({
                title: "Delete review?",
                message: "This review will be removed from the moderation queue.",
                confirmLabel: "Delete",
                danger: true,
                onConfirm() {
                  Admin.store.remove("reviews", review.id);
                  Admin.toast("Review deleted", "success");
                  draw();
                },
              });
            }
          });
        });
        container.querySelectorAll("[data-review-act]").forEach((button) => {
          button.addEventListener("click", () => {
            if (button.dataset.reviewAct === "refresh") {
              Admin.toast("Moderation queue refreshed", "success");
              draw();
              return;
            }
            Admin.store.add("reviews", {
              productId: "p1", customer: "Imported customer", email: "imported@example.com", rating: 5,
              title: "Imported review", body: "This review was added by the demo CSV import.",
              status: "pending", date: Admin.DEMO_TODAY, hasPhoto: false,
            });
            Admin.store.add("reviews", {
              productId: "p3", customer: "Imported customer", email: "imported@example.com", rating: 4,
              title: "Another imported review", body: "A second row from the demo CSV import.",
              status: "pending", date: Admin.DEMO_TODAY, hasPhoto: false,
            });
            Admin.toast("2 reviews imported from CSV", "success");
            draw();
          });
        });
      };
      draw();
    },
  };

  /* ---------------------------------------------------------------------
     Waitlist
     --------------------------------------------------------------------- */

  Admin.pages.waitlist = {
    render(container) {
      const state = Admin.uiState.waitlist || (Admin.uiState.waitlist = { tab: "demand" });
      const draw = () => {
        const all = Admin.store.list("waitlist");
        const groups = {};
        all.forEach((entry) => {
          if (!groups[entry.productId]) {
            groups[entry.productId] = { productId: entry.productId, productName: entry.productName, restockDate: entry.restockDate, entries: [] };
          }
          groups[entry.productId].entries.push(entry);
        });
        const demand = Object.values(groups);

        const addSubscriber = () => {
          const products = Admin.store.list("products");
          Admin.formModal({
            title: "Add waitlist subscriber",
            fields: [
              { name: "email", label: "Email", type: "email", required: true },
              { name: "phone", label: "Phone", placeholder: "+92 300 0000000" },
              { name: "productId", label: "Product", type: "select", options: products.map((product) => ({ value: product.id, label: product.name })) },
              { name: "restockDate", label: "Expected restock", type: "date", value: "2026-11-30" },
            ],
            submitLabel: "Add subscriber",
            onSubmit(values) {
              const product = Admin.store.productById(values.productId);
              Admin.store.add("waitlist", {
                ...values,
                productName: product?.name || "Deleted product",
                date: Admin.DEMO_TODAY,
                notified: false,
              });
              Admin.toast("Subscriber added", "success");
              Admin.rerender();
            },
          });
        };

        container.innerHTML = `${Admin.pageHead({
          group: "Sales & Customers",
          title: "Waitlist & Restock",
          subtitle: "Track out-of-stock backorder subscriber demand and automate replenishment notifications.",
          actions: `<button class="btn btn-primary" data-wait-add>${svg("plus")}Add subscriber</button>`,
        })}
          <div class="tabbar" role="tablist">
            <button class="tab${state.tab === "demand" ? " active" : ""}" data-wait-tab="demand"><span>Product Demand Summaries</span><span class="count">${demand.length}</span></button>
            <button class="tab${state.tab === "subs" ? " active" : ""}" data-wait-tab="subs"><span>All Subscribers Log</span><span class="count">${all.length}</span></button>
          </div>
          <div class="panel">
            ${state.tab === "demand"
              ? demand.length
                ? `<div class="table-wrap"><table class="data-table">
                    <thead><tr><th>Product</th><th>Waiting</th><th>Notified</th><th>Restock date</th><th class="th-actions">Actions</th></tr></thead>
                    <tbody>${demand
                      .map(
                        (groupRow) => `<tr>
                          <td><strong>${esc(groupRow.productName)}</strong></td>
                          <td>${groupRow.entries.length}</td>
                          <td>${groupRow.entries.filter((entry) => entry.notified).length}</td>
                          <td>${Admin.dateShort(groupRow.restockDate)}</td>
                          <td class="table-actions"><button class="btn btn-secondary btn-sm" data-notify="${esc(groupRow.productId)}">${svg("send")}Notify all</button></td>
                        </tr>`
                      )
                      .join("")}</tbody>
                  </table></div>`
                : Admin.emptyState({ icon: "waitlist", title: "No waitlist demand", text: "Customers can join the waitlist from out-of-stock product pages." })
              : all.length
                ? `<div class="table-wrap"><table class="data-table">
                    <thead><tr><th>Email</th><th>Phone</th><th>Product</th><th>Requested</th><th>Status</th><th class="th-actions">Actions</th></tr></thead>
                    <tbody>${all
                      .map(
                        (entry) => `<tr data-id="${esc(entry.id)}">
                          <td><strong>${esc(entry.email)}</strong></td>
                          <td class="mono small">${esc(entry.phone || "—")}</td>
                          <td>${esc(entry.productName)}</td>
                          <td class="muted small">${Admin.dateShort(entry.date)}</td>
                          <td>${entry.notified ? badge("Notified", "green") : badge("Waiting", "amber")}</td>
                          <td class="table-actions"><button class="icon-btn danger" data-wait-delete="${esc(entry.id)}" title="Remove">${svg("trash")}</button></td>
                        </tr>`
                      )
                      .join("")}</tbody>
                  </table></div>`
                : Admin.emptyState({ icon: "waitlist", title: "No subscribers yet", text: "Add a subscriber or let customers join from the storefront." })}
          </div>
        </div>`;

        container.querySelectorAll("[data-wait-tab]").forEach((button) => {
          button.addEventListener("click", () => {
            state.tab = button.dataset.waitTab;
            draw();
          });
        });
        container.querySelector("[data-wait-add]").addEventListener("click", addSubscriber);
        container.querySelectorAll("[data-notify]").forEach((button) => {
          button.addEventListener("click", () => {
            const productId = button.dataset.notify;
            const groupRow = groups[productId];
            Admin.confirm({
              title: "Notify the waitlist?",
              message: `${groupRow.entries.length} subscribers will receive a back-in-stock message for ${esc(groupRow.productName)}.`,
              confirmLabel: "Notify all",
              onConfirm() {
                groupRow.entries.forEach((entry) => {
                  entry.notified = true;
                });
                Admin.store.save();
                Admin.toast(`${groupRow.entries.length} subscribers notified`, "success");
                draw();
              },
            });
          });
        });
        container.querySelectorAll("[data-wait-delete]").forEach((button) => {
          button.addEventListener("click", () => {
            Admin.store.remove("waitlist", button.dataset.waitDelete);
            Admin.toast("Subscriber removed", "success");
            draw();
          });
        });
      };
      draw();
    },
  };
})();
