/* Baytak Noor Admin — Overview and System pages */
(() => {
  "use strict";

  window.Admin = window.Admin || {};
  Admin.pages = Admin.pages || {};

  const { svg, esc, badge, money, num } = Admin;
  const sum = (rows, pick) => rows.reduce((total, row) => total + Number(pick(row) || 0), 0);
  const pct = (value) => `${Math.round(Number(value) || 0)}%`;

  function rangeStart(days) {
    const date = new Date(`${Admin.DEMO_TODAY}T23:59:59`);
    date.setDate(date.getDate() - (Number(days) - 1));
    return date;
  }

  function analyticsFor(days) {
    const cutoff = rangeStart(days);
    const all = Admin.store.list("orders").filter((order) => new Date(order.date) >= cutoff);
    const paid = all.filter((order) => order.payment === "PAID");
    const revenue = sum(paid, (order) => order.total);
    const cogs = paid.reduce(
      (total, order) =>
        total +
        order.items.reduce((itemTotal, item) => {
          const product = Admin.store.productById(item.productId);
          return itemTotal + Number(product?.cost || 0) * Number(item.qty || 0);
        }, 0),
      0
    );
    const delivery = sum(paid, (order) => order.shipping);
    const marketingRows = Admin.store.list("marketing").filter((row) => new Date(row.date) >= cutoff);
    const expenseRows = Admin.store.list("expenses").filter((row) => new Date(row.date) >= cutoff);
    const marketing = sum(marketingRows, (row) => row.amount);
    const expenses = sum(expenseRows, (row) => row.amount);
    const profit = revenue - cogs - delivery - marketing - expenses;
    const orderCounts = {};
    paid.forEach((order) => {
      orderCounts[order.customer.email] = (orderCounts[order.customer.email] || 0) + 1;
    });
    const repeatOrders = paid.filter((order) => orderCounts[order.customer.email] > 1).length;
    const visitors = Math.max(1, Math.round((Admin.store.get("abandoned")?.visitors || 860) * (Number(days) / 30)));
    const abandoned = Admin.store.get("abandoned") || { carts: 0, visitors: 0, recovered: 0, unrecovered: 0 };
    return {
      days: Number(days),
      all,
      paid,
      revenue,
      cogs,
      delivery,
      marketing,
      expenses,
      profit,
      margin: revenue ? (profit / revenue) * 100 : 0,
      aov: paid.length ? revenue / paid.length : 0,
      repeatRate: paid.length ? (repeatOrders / paid.length) * 100 : 0,
      repeatOrders,
      conversion: (all.length / visitors) * 100,
      visitors,
      abandoned: {
        ...abandoned,
        carts: Math.max(1, Math.round(abandoned.carts * (Number(days) / 30))),
        recovered: Math.round(abandoned.recovered * (Number(days) / 30)),
        unrecovered: Math.round(abandoned.unrecovered * (Number(days) / 30)),
      },
    };
  }

  function daySeries(days, data) {
    const out = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(`${Admin.DEMO_TODAY}T12:00:00`);
      date.setDate(date.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      const revenue = data.paid
        .filter((order) => String(order.date).slice(0, 10) === key)
        .reduce((total, order) => total + order.total, 0);
      out.push({ key, label: date.toLocaleDateString("en-GB", { weekday: "short" }), value: revenue });
    }
    return out;
  }

  function barChart(series) {
    const max = Math.max(1, ...series.map((point) => point.value));
    return `<div class="bar-chart" role="img" aria-label="Revenue for the last seven days">
      ${series
        .map(
          (point) => `<div class="bar-col" title="${point.key}: ${money(point.value)}">
            <span class="bar-value">${point.value ? money(point.value) : ""}</span>
            <div class="bar-track"><div class="bar-fill" style="height:${Math.max(3, Math.round((point.value / max) * 100))}%"></div></div>
            <span class="bar-label">${point.label}</span>
          </div>`
        )
        .join("")}
    </div>`;
  }

  function channelRows(data) {
    const channels = {};
    data.paid.forEach((order) => {
      if (!channels[order.channel]) channels[order.channel] = { channel: order.channel, orders: 0, revenue: 0 };
      channels[order.channel].orders += 1;
      channels[order.channel].revenue += order.total;
    });
    const rows = Object.values(channels).sort((a, b) => b.revenue - a.revenue);
    const max = Math.max(1, ...rows.map((row) => row.revenue));
    return rows
      .map(
        (row) => `<div class="channel-row">
          <div class="channel-label"><strong>${esc(row.channel)}</strong><span>${row.orders} orders</span></div>
          <div class="channel-meter"><span style="width:${Math.round((row.revenue / max) * 100)}%"></span></div>
          <strong class="channel-value">${money(row.revenue)}</strong>
        </div>`
      )
      .join("");
  }

  function topProducts(data) {
    const map = {};
    data.paid.forEach((order) => {
      order.items.forEach((item) => {
        if (!map[item.productId]) map[item.productId] = { id: item.productId, name: item.name, units: 0, revenue: 0, cost: 0 };
        const row = map[item.productId];
        const product = Admin.store.productById(item.productId);
        row.units += Number(item.qty);
        row.revenue += Number(item.price) * Number(item.qty);
        row.cost += Number(product?.cost || 0) * Number(item.qty);
      });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }

  /* ---------------------------------------------------------------------
     Analytics
     --------------------------------------------------------------------- */

  Admin.pages.analytics = {
    render(container) {
      const state = Admin.uiState.analytics || (Admin.uiState.analytics = { tab: "overview", range: "30" });
      const draw = () => {
        const data = analyticsFor(state.range);
        const series = daySeries(state.range, data);
        const products = topProducts(data);
        const customers = {};
        data.paid.forEach((order) => {
          if (!customers[order.customer.email]) customers[order.customer.email] = { ...order.customer, orders: 0, spend: 0 };
          customers[order.customer.email].orders += 1;
          customers[order.customer.email].spend += order.total;
        });
        const customerRows = Object.values(customers).sort((a, b) => b.spend - a.spend);
        const cohorts = {};
        data.paid
          .slice()
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .forEach((order) => {
            const key = new Date(order.date).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
            if (!cohorts[order.customer.email]) cohorts[order.customer.email] = { month: key, orders: 0, spend: 0 };
            cohorts[order.customer.email].orders += 1;
            cohorts[order.customer.email].spend += order.total;
          });
        const cohortGroups = {};
        Object.values(cohorts).forEach((row) => {
          if (!cohortGroups[row.month]) cohortGroups[row.month] = { month: row.month, customers: 0, repeat: 0, spend: 0 };
          cohortGroups[row.month].customers += 1;
          cohortGroups[row.month].repeat += row.orders > 1 ? 1 : 0;
          cohortGroups[row.month].spend += row.spend;
        });

        const rangeSelect = `<label class="select-wrap"><span class="sr-only">Date range</span><select class="select" id="anRange">
          <option value="7"${state.range === "7" ? " selected" : ""}>Last 7 days</option>
          <option value="30"${state.range === "30" ? " selected" : ""}>Last 30 days</option>
          <option value="90"${state.range === "90" ? " selected" : ""}>Last 90 days</option>
        </select></label><button class="btn btn-secondary" data-an-export>${svg("download")}Export</button>`;

        const tabs = [
          ["overview", "Overview"],
          ["products", "Products"],
          ["customers", "Customers"],
        ];

        const kpis = `
          <div class="kpi-grid">
            <div class="kpi-card"><span>Net revenue</span><strong>${money(data.revenue)}</strong><small class="trend up">${svg("trending")}${data.paid.length} retained orders</small></div>
            <div class="kpi-card"><span>Average order value</span><strong>${money(data.aov)}</strong><small>Across ${data.paid.length} paid orders</small></div>
            <div class="kpi-card"><span>Conversion rate</span><strong>${data.conversion.toFixed(2)}%</strong><small>${data.all.length} orders / ${num(data.visitors)} visitors</small></div>
            <div class="kpi-card"><span>Repeat order rate</span><strong>${pct(data.repeatRate)}</strong><small>${data.repeatOrders} orders from returning buyers</small></div>
            <div class="kpi-card"><span>Store profit</span><strong>${money(data.profit)}</strong><small class="${data.profit >= 0 ? "trend up" : "trend down"}">${pct(data.margin)} net margin</small></div>
          </div>`;

        let body = "";
        if (state.tab === "products") {
          body = `<div class="panel">
            <div class="panel-head"><div><h2>Product performance</h2><p>Revenue and gross margin for sold variants in this period.</p></div></div>
            <div class="table-wrap"><table class="data-table">
              <thead><tr><th>Product</th><th>Units sold</th><th>Revenue</th><th>Gross margin</th><th>Stock</th></tr></thead>
              <tbody>${products
                .map((row) => {
                  const product = Admin.store.productById(row.id);
                  return `<tr><td><strong>${esc(row.name)}</strong></td><td>${row.units}</td><td>${money(row.revenue)}</td>
                    <td>${money(row.revenue - row.cost)} <span class="muted small">(${row.revenue ? Math.round(((row.revenue - row.cost) / row.revenue) * 100) : 0}%)</span></td>
                    <td><span class="stock-value${Number(product?.stock) === 0 ? " out" : Number(product?.stock) <= 5 ? " low" : ""}">${product?.stock ?? "—"}</span></td></tr>`;
                })
                .join("")}</tbody>
            </table></div>
          </div>`;
        } else if (state.tab === "customers") {
          body = `<div class="split-grid">
            <div class="panel"><div class="panel-head"><div><h2>Cohorts by first order</h2><p>Repeat purchase behaviour for buyers in this period.</p></div></div>
              <div class="table-wrap"><table class="data-table">
                <thead><tr><th>First order</th><th>Customers</th><th>Repeat buyers</th><th>Revenue</th></tr></thead>
                <tbody>${Object.values(cohortGroups)
                  .map((row) => `<tr><td><strong>${esc(row.month)}</strong></td><td>${row.customers}</td><td>${row.repeat} (${row.customers ? Math.round((row.repeat / row.customers) * 100) : 0}%)</td><td>${money(row.spend)}</td></tr>`)
                  .join("")}</tbody>
              </table></div>
            </div>
            <div class="panel"><div class="panel-head"><div><h2>Top customers</h2><p>Ranked by net spend in this period.</p></div></div>
              <div class="table-wrap"><table class="data-table">
                <thead><tr><th>Customer</th><th>Orders</th><th>Spend</th></tr></thead>
                <tbody>${customerRows
                  .map((row) => `<tr><td><div class="cell-stack"><strong>${esc(row.name)}</strong><span>${esc(row.email)}</span></div></td><td>${row.orders}</td><td>${money(row.spend)}</td></tr>`)
                  .join("")}</tbody>
              </table></div>
            </div>
          </div>`;
        } else {
          body = `<div class="split-grid analytics-split">
            <div class="panel"><div class="panel-head"><div><h2>Revenue trend</h2><p>Daily retained revenue, last seven days.</p></div></div><div class="panel-body">${barChart(series)}</div></div>
            <div class="panel"><div class="panel-head"><div><h2>Channel attribution</h2><p>Where paid orders came from.</p></div></div><div class="panel-body channel-list">${channelRows(data) || '<p class="muted">No paid orders in this period.</p>'}</div></div>
          </div>
          <div class="split-grid">
            <div class="panel"><div class="panel-head"><div><h2>Top products</h2><p>Best sellers by revenue.</p></div></div>
              <div class="table-wrap"><table class="data-table compact">
                <thead><tr><th>Product</th><th>Units</th><th>Revenue</th></tr></thead>
                <tbody>${products.slice(0, 5).map((row) => `<tr><td><strong>${esc(row.name)}</strong></td><td>${row.units}</td><td>${money(row.revenue)}</td></tr>`).join("") || '<tr><td colspan="3" class="muted">No product sales in this period.</td></tr>'}</tbody>
              </table></div>
            </div>
            <div class="panel"><div class="panel-head"><div><h2>Abandoned checkouts</h2><p>Checkout drop-off in this period.</p></div></div>
              <div class="stat-lines">
                <div><span>Carts abandoned</span><strong>${num(data.abandoned.carts)}</strong></div>
                <div><span>Value recovered</span><strong>${money(data.abandoned.recovered)}</strong></div>
                <div><span>Value unrecovered</span><strong>${money(data.abandoned.unrecovered)}</strong></div>
              </div>
            </div>
          </div>`;
        }

        container.innerHTML = `${Admin.pageHead({
          group: "Overview",
          title: "Analytics",
          subtitle: "Visitors, sales and conversion attribution across your store.",
          actions: rangeSelect,
        })}
          <div class="tabbar" role="tablist">${tabs
            .map(([value, label]) => `<button class="tab${state.tab === value ? " active" : ""}" data-an-tab="${value}"><span>${label}</span></button>`)
            .join("")}</div>
          ${kpis}
          ${body}
        </div>`;

        container.querySelector("#anRange").addEventListener("change", (event) => {
          state.range = event.target.value;
          draw();
        });
        container.querySelectorAll("[data-an-tab]").forEach((button) => {
          button.addEventListener("click", () => {
            state.tab = button.dataset.anTab;
            draw();
          });
        });
        container.querySelector("[data-an-export]").addEventListener("click", () => {
          Admin.exportCSV("analytics-summary.csv", [
            ["Metric", "Value"],
            ["Period (days)", data.days],
            ["Net revenue", data.revenue],
            ["Paid orders", data.paid.length],
            ["Average order value", Math.round(data.aov)],
            ["Conversion rate", `${data.conversion.toFixed(2)}%`],
            ["Repeat order rate", `${Math.round(data.repeatRate)}%`],
            ["Cost of goods", data.cogs],
            ["Delivery", data.delivery],
            ["Marketing", data.marketing],
            ["Running expenses", data.expenses],
            ["Net profit", data.profit],
          ]);
        });
      };
      draw();
    },
  };

  /* ---------------------------------------------------------------------
     Accounting
     --------------------------------------------------------------------- */

  const ACCOUNTING_SECTIONS = [
    { id: "profit", title: "Profit & loss", hint: "Revenue, costs and true net profit", icon: "trending" },
    { id: "expenses", title: "Expenses & bills", hint: "Rent, salaries, packaging and utilities", icon: "wallet" },
    { id: "cogs", title: "Product costs", hint: "Cost price and margin per product", icon: "package" },
    { id: "couriers", title: "Courier payments", hint: "COD collected, fees and settlement", icon: "truck" },
    { id: "marketing", title: "Marketing spend", hint: "Ad platforms and campaign costs", icon: "megaphone" },
    { id: "tax", title: "Tax", hint: "Sales tax and filing readiness", icon: "percent" },
    { id: "reports", title: "Reports", hint: "Export ledgers and profit statements", icon: "analytics" },
    { id: "setup", title: "Books setup", hint: "Readiness checklist for clean books", icon: "checkCircle" },
  ];

  function accountingSection(id, data) {
    if (id === "expenses") {
      const rows = Admin.store.list("expenses");
      return `<div class="panel">
        <div class="panel-head"><div><h2>Expenses & bills</h2><p>Running and one-off costs for the period.</p></div>
          <button class="btn btn-primary btn-sm" data-acc-add-expense>${svg("plus")}Add expense</button></div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Expense</th><th>Category</th><th>Date</th><th>Amount</th><th class="th-actions">Actions</th></tr></thead>
          <tbody>${rows
            .map(
              (row) => `<tr data-id="${esc(row.id)}"><td><strong>${esc(row.label)}</strong><span class="cell-sub">${esc(row.notes || "")}</span></td>
                <td>${badge(row.category, "gray")}</td><td class="muted small">${Admin.dateShort(row.date)}</td><td>${money(row.amount)}</td>
                <td class="table-actions"><button class="icon-btn danger" data-acc-delete-expense="${esc(row.id)}" title="Delete">${svg("trash")}</button></td></tr>`
            )
            .join("")}</tbody>
        </table></div>
        <div class="panel-foot"><span>Total expenses</span><strong>${money(sum(rows, (row) => row.amount))}</strong></div>
      </div>`;
    }
    if (id === "cogs") {
      const products = Admin.store.list("products");
      return `<div class="panel"><div class="panel-head"><div><h2>Product costs</h2><p>Set a cost price to calculate accurate margins.</p></div></div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Product</th><th>Cost price</th><th>Selling price</th><th>Margin</th><th class="th-actions">Actions</th></tr></thead>
          <tbody>${products
            .map((product) => {
              const margin = product.price ? ((product.price - product.cost) / product.price) * 100 : 0;
              return `<tr data-id="${esc(product.id)}"><td><strong>${esc(product.name)}</strong><span class="cell-sub">${esc(product.sku)}</span></td>
                <td>${product.cost ? money(product.cost) : '<span class="text-danger">Not set</span>'}</td><td>${money(product.price)}</td>
                <td>${pct(margin)}</td><td class="table-actions"><button class="btn btn-secondary btn-sm" data-acc-cost="${esc(product.id)}">Edit cost</button></td></tr>`;
            })
            .join("")}</tbody>
        </table></div></div>`;
    }
    if (id === "couriers") {
      const rows = Admin.store.list("courierPayments");
      return `<div class="panel"><div class="panel-head"><div><h2>Courier COD settlements</h2><p>Cash collected on delivery and courier fees.</p></div></div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Courier</th><th>Parcels</th><th>COD collected</th><th>Fees</th><th>Due</th><th>Status</th><th class="th-actions">Actions</th></tr></thead>
          <tbody>${rows
            .map(
              (row) => `<tr data-id="${esc(row.id)}"><td><strong>${esc(row.courier)}</strong></td><td>${row.parcels}</td><td>${money(row.collected)}</td><td>${money(row.fees)}</td>
                <td>${Admin.dateShort(row.dueDate)}</td><td>${badge(row.status)}</td>
                <td class="table-actions">${row.status === "Unpaid" ? `<button class="btn btn-secondary btn-sm" data-acc-pay-courier="${esc(row.id)}">Mark paid</button>` : '<span class="muted small">Settled</span>'}</td></tr>`
            )
            .join("")}</tbody>
        </table></div></div>`;
    }
    if (id === "marketing") {
      const rows = Admin.store.list("marketing");
      return `<div class="panel"><div class="panel-head"><div><h2>Marketing spend</h2><p>Ad spend recorded against attributed revenue.</p></div>
        <button class="btn btn-primary btn-sm" data-acc-add-marketing>${svg("plus")}Add spend</button></div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Channel</th><th>Campaign</th><th>Date</th><th>Spend</th><th>Orders</th><th>Revenue</th><th>ROAS</th></tr></thead>
          <tbody>${rows
            .map(
              (row) => `<tr><td><strong>${esc(row.channel)}</strong></td><td>${esc(row.campaign)}</td><td class="muted small">${Admin.dateShort(row.date)}</td>
                <td>${money(row.amount)}</td><td>${row.orders}</td><td>${money(row.revenue)}</td><td>${(row.revenue / Math.max(1, row.amount)).toFixed(1)}×</td></tr>`
            )
            .join("")}</tbody>
        </table></div></div>`;
    }
    if (id === "tax") {
      return `<div class="split-grid">
        <div class="panel"><div class="panel-head"><div><h2>Sales tax</h2><p>Tax collected on retained sales.</p></div></div>
          <div class="stat-lines"><div><span>Tax rate</span><strong>${Admin.store.get("settings").shipping.taxRate}%</strong></div>
          <div><span>Net revenue</span><strong>${money(data.revenue)}</strong></div>
          <div><span>Tax collected</span><strong>${money((data.revenue * Admin.store.get("settings").shipping.taxRate) / 100)}</strong></div></div>
          <div class="panel-foot"><a class="btn btn-secondary btn-sm" href="#/settings" data-tax-settings>Tax settings</a></div>
        </div>
        <div class="panel"><div class="panel-head"><div><h2>Filing readiness</h2><p>What your accountant still needs.</p></div></div>
          <div class="check-list">
            <div class="check-item done">${svg("checkCircle")}Sales ledger reconciled</div>
            <div class="check-item done">${svg("checkCircle")}Courier COD recorded</div>
            <div class="check-item">${svg("alert")}Product cost prices complete</div>
            <div class="check-item">${svg("alert")}Ad account invoices uploaded</div>
          </div>
        </div>
      </div>`;
    }
    if (id === "reports") {
      return `<div class="panel"><div class="panel-head"><div><h2>Reports & exports</h2><p>Download the ledgers used in this demo.</p></div></div>
        <div class="report-grid">
          <button class="report-card" data-acc-report="pl"><span>${svg("accounting")}</span><strong>Profit & loss</strong><small>Revenue, costs and net profit</small></button>
          <button class="report-card" data-acc-report="expenses"><span>${svg("wallet")}</span><strong>Expense ledger</strong><small>Every recorded running cost</small></button>
          <button class="report-card" data-acc-report="couriers"><span>${svg("truck")}</span><strong>Courier settlement</strong><small>COD collected and courier fees</small></button>
          <button class="report-card" data-acc-report="products"><span>${svg("package")}</span><strong>Product profitability</strong><small>Cost, price and margin by product</small></button>
        </div></div>`;
    }
    if (id === "setup") {
      const steps = Admin.store.list("setupSteps");
      return `<div class="panel"><div class="panel-head"><div><h2>Books readiness</h2><p>Complete these to trust your profit numbers.</p></div>
        <span class="pill">${steps.filter((step) => step.done).length} / ${steps.length} done</span></div>
        <div class="setup-list">${steps
          .map(
            (step) => `<label class="setup-item${step.done ? " done" : ""}">
              <input type="checkbox" data-acc-step="${esc(step.id)}"${step.done ? " checked" : ""}>
              <span class="setup-check">${step.done ? svg("check") : ""}</span>
              <span>${esc(step.label)}</span>
            </label>`
          )
          .join("")}</div></div>`;
    }
    const pnl = [
      ["Revenue", data.revenue],
      ["Cost of goods sold", -data.cogs],
      ["Gross profit", data.revenue - data.cogs],
      ["Delivery costs", -data.delivery],
      ["Marketing spend", -data.marketing],
      ["Running expenses", -data.expenses],
      ["Net profit", data.profit],
    ];
    return `<div class="split-grid">
      <div class="panel"><div class="panel-head"><div><h2>Profit & loss</h2><p>${data.days}-day statement from retained orders.</p></div></div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Line</th><th>Amount</th></tr></thead>
          <tbody>${pnl
            .map(([label, value], index) => `<tr class="${index === pnl.length - 1 ? "total-row" : ""}"><td>${label}</td><td class="${value < 0 ? "text-danger" : ""}">${money(value)}</td></tr>`)
            .join("")}</tbody>
        </table></div>
      </div>
      <div class="panel"><div class="panel-head"><div><h2>Order profitability</h2><p>Net contribution from the latest paid orders.</p></div></div>
        <div class="table-wrap"><table class="data-table compact">
          <thead><tr><th>Order</th><th>Revenue</th><th>Costs</th><th>Profit</th></tr></thead>
          <tbody>${data.paid
            .slice(0, 6)
            .map((order) => {
              const cogs = order.items.reduce((total, item) => total + Number(Admin.store.productById(item.productId)?.cost || 0) * item.qty, 0);
              const costs = cogs + Number(order.shipping || 0);
              return `<tr><td>#${esc(order.number)}</td><td>${money(order.total)}</td><td>${money(costs)}</td><td>${money(order.total - costs)}</td></tr>`;
            })
            .join("")}</tbody>
        </table></div>
      </div>
    </div>`;
  }

  Admin.pages.accounting = {
    render(container) {
      const state = Admin.uiState.accounting || (Admin.uiState.accounting = { range: "30", section: "profit" });
      const draw = () => {
        const data = analyticsFor(state.range);
        const steps = Admin.store.list("setupSteps");
        const tiles = ACCOUNTING_SECTIONS.map(
          (section) => `<button class="tile${state.section === section.id ? " active" : ""}" data-acc-section="${section.id}">
            <span class="tile-icon">${svg(section.icon)}</span>
            <strong>${section.title}</strong><small>${section.hint}</small>
          </button>`
        ).join("");

        container.innerHTML = `${Admin.pageHead({
          group: "Overview",
          title: "Accounting",
          subtitle: "True profit after product costs, delivery, ads, tax and running costs.",
          actions: `<label class="select-wrap"><span class="sr-only">Accounting period</span><select class="select" id="accRange">
            <option value="7"${state.range === "7" ? " selected" : ""}>Last 7 days</option>
            <option value="30"${state.range === "30" ? " selected" : ""}>This month</option>
            <option value="90"${state.range === "90" ? " selected" : ""}>Last 90 days</option>
          </select></label>
          <button class="btn btn-secondary" data-acc-sync>${svg("refresh")}Sync now</button>`,
        })}
          <div class="kpi-grid">
            <div class="kpi-card"><span>Readiness</span><strong>${steps.filter((step) => step.done).length} / ${steps.length}</strong><small>books setup complete</small></div>
            <div class="kpi-card"><span>Net profit</span><strong>${money(data.profit)}</strong><small>${pct(data.margin)} margin</small></div>
            <div class="kpi-card"><span>Revenue</span><strong>${money(data.revenue)}</strong><small>${data.paid.length} paid orders</small></div>
            <div class="kpi-card"><span>Costs</span><strong>${money(data.cogs + data.delivery + data.marketing + data.expenses)}</strong><small>COGS, delivery, ads and expenses</small></div>
          </div>
          <div class="split-grid accounting-top">
            <div class="panel"><div class="panel-head"><div><h2>Revenue vs. costs</h2><p>Daily retained revenue for the last seven days.</p></div></div><div class="panel-body">${barChart(daySeries(state.range, data))}</div></div>
            <div class="panel"><div class="panel-head"><div><h2>Books readiness</h2><p>Fix the gaps before filing.</p></div><a class="link" href="#/accounting" data-acc-jump="setup">Open checklist</a></div>
              <div class="check-list">${steps
                .slice(0, 4)
                .map((step) => `<div class="check-item${step.done ? " done" : ""}">${svg(step.done ? "checkCircle" : "alert")}${esc(step.label)}</div>`)
                .join("")}</div>
            </div>
          </div>
          <div class="tiles">${tiles}</div>
          <div class="section-detail" id="accDetail">${accountingSection(state.section, data)}</div>
        </div>`;

        container.querySelector("#accRange").addEventListener("change", (event) => {
          state.range = event.target.value;
          draw();
        });
        container.querySelector("[data-acc-sync]").addEventListener("click", () => {
          Admin.toast("Accounting synced with orders, couriers and ad spend", "success");
          draw();
        });
        container.querySelectorAll("[data-acc-section]").forEach((button) => {
          button.addEventListener("click", () => {
            state.section = button.dataset.accSection;
            draw();
          });
        });
        container.querySelectorAll("[data-acc-jump]").forEach((button) => {
          button.addEventListener("click", (event) => {
            event.preventDefault();
            state.section = button.dataset.accJump;
            draw();
          });
        });

        const addExpense = () => {
          Admin.formModal({
            title: "Add expense",
            fields: [
              { name: "label", label: "Expense", required: true, full: true },
              { name: "category", label: "Category", type: "select", options: ["Running costs", "Packaging", "Marketing", "Utilities", "Other"] },
              { name: "amount", label: "Amount (Rs.)", type: "number", min: 0, required: true },
              { name: "date", label: "Date", type: "date", value: Admin.DEMO_TODAY },
              { name: "notes", label: "Notes", full: true },
            ],
            submitLabel: "Add expense",
            onSubmit(values) {
              Admin.store.add("expenses", values);
              Admin.toast("Expense recorded", "success");
              Admin.rerender();
            },
          });
        };
        container.querySelector("[data-acc-add-expense]")?.addEventListener("click", addExpense);
        container.querySelectorAll("[data-acc-delete-expense]").forEach((button) => {
          button.addEventListener("click", () => {
            const expense = Admin.store.byId("expenses", button.dataset.accDeleteExpense);
            Admin.confirm({
              title: "Delete expense?",
              message: `“${esc(expense?.label || "This expense")}” will be removed from the ledger.`,
              confirmLabel: "Delete", danger: true,
              onConfirm() {
                Admin.store.remove("expenses", button.dataset.accDeleteExpense);
                Admin.toast("Expense deleted", "success");
                Admin.rerender();
              },
            });
          });
        });
        container.querySelectorAll("[data-acc-cost]").forEach((button) => {
          button.addEventListener("click", () => {
            const product = Admin.store.productById(button.dataset.accCost);
            if (!product) return;
            Admin.formModal({
              title: `Cost price — ${product.name}`,
              fields: [{ name: "cost", label: "Cost per unit (Rs.)", type: "number", min: 0, required: true, value: product.cost }],
              submitLabel: "Save cost",
              onSubmit(values) {
                Admin.store.update("products", product.id, { cost: Number(values.cost) || 0 });
                Admin.toast("Product cost updated", "success");
                Admin.rerender();
              },
            });
          });
        });
        container.querySelectorAll("[data-acc-pay-courier]").forEach((button) => {
          button.addEventListener("click", () => {
            Admin.store.update("courierPayments", button.dataset.accPayCourier, { status: "Paid" });
            Admin.toast("Courier settlement marked paid", "success");
            Admin.rerender();
          });
        });
        container.querySelector("[data-acc-add-marketing]")?.addEventListener("click", () => {
          Admin.formModal({
            title: "Add marketing spend",
            fields: [
              { name: "channel", label: "Channel", type: "select", options: ["Meta Ads", "Google Ads", "Instagram boost", "TikTok Ads"] },
              { name: "campaign", label: "Campaign", required: true },
              { name: "amount", label: "Spend (Rs.)", type: "number", min: 0, required: true },
              { name: "date", label: "Date", type: "date", value: Admin.DEMO_TODAY },
              { name: "orders", label: "Attributed orders", type: "number", min: 0, value: 0 },
              { name: "revenue", label: "Attributed revenue (Rs.)", type: "number", min: 0, value: 0 },
            ],
            submitLabel: "Add spend",
            onSubmit(values) {
              Admin.store.add("marketing", values);
              Admin.toast("Marketing spend recorded", "success");
              Admin.rerender();
            },
          });
        });
        container.querySelectorAll("[data-acc-step]").forEach((checkbox) => {
          checkbox.addEventListener("change", () => {
            const step = Admin.store.byId("setupSteps", checkbox.dataset.accStep);
            if (!step) return;
            step.done = checkbox.checked;
            Admin.store.save();
            Admin.toast("Books checklist updated", "success");
            draw();
          });
        });
        container.querySelector("[data-tax-settings]")?.addEventListener("click", () => {
          Admin.uiState.settings = { tab: "shipping" };
        });
        container.querySelectorAll("[data-acc-report]").forEach((button) => {
          button.addEventListener("click", () => {
            const type = button.dataset.accReport;
            if (type === "pl") {
              Admin.exportCSV("profit-and-loss.csv", [
                ["Line", "Amount"],
                ["Revenue", data.revenue], ["COGS", -data.cogs], ["Gross profit", data.revenue - data.cogs],
                ["Delivery", -data.delivery], ["Marketing", -data.marketing], ["Expenses", -data.expenses], ["Net profit", data.profit],
              ]);
            } else if (type === "expenses") {
              Admin.exportCSV("expenses.csv", [["Expense", "Category", "Date", "Amount"], ...Admin.store.list("expenses").map((row) => [row.label, row.category, row.date, row.amount])]);
            } else if (type === "couriers") {
              Admin.exportCSV("courier-settlements.csv", [["Courier", "Parcels", "COD collected", "Fees", "Status"], ...Admin.store.list("courierPayments").map((row) => [row.courier, row.parcels, row.collected, row.fees, row.status])]);
            } else {
              Admin.exportCSV("product-profitability.csv", [["Product", "Cost", "Price", "Margin %"], ...Admin.store.list("products").map((product) => [product.name, product.cost, product.price, product.price ? Math.round(((product.price - product.cost) / product.price) * 100) : 0])]);
            }
          });
        });
      };
      draw();
    },
  };

  /* ---------------------------------------------------------------------
     AI Assistant
     --------------------------------------------------------------------- */

  const CONNECTOR_URL = "https://www.baytaknoor.com/api/ai/mcp";

  Admin.pages.ai = {
    render(container) {
      const ai = Admin.store.get("ai");
      if (!ai.level) ai.level = "read";
      const areas = [
        ["products", "Products & inventory"],
        ["prices", "Prices & discounts"],
        ["coupons", "Coupons"],
        ["orders", "Orders & customers"],
        ["homepage", "Homepage content"],
        ["accounting", "Accounting & expenses"],
        ["messages", "Customer messages"],
      ];
      const draw = () => {
        container.innerHTML = `${Admin.pageHead({
          group: "Overview",
          title: "AI Assistant",
          subtitle: "Connect the AI you already use to your store data.",
          pill: "Beta",
          actions: `<button class="btn btn-secondary" data-ai-copy>${svg("copy")}Copy connector</button>
            <button class="btn btn-primary" data-ai-connect>${svg("plus")}Connect app</button>`,
        })}
          <div class="ai-hero">
            <div>
              <span class="eyebrow">Remote MCP connector</span>
              <h2>Let Claude or ChatGPT work with your store</h2>
              <p>Add this address as a custom connector in the desktop app. Your data stays in your store; the AI only sees what you allow below.</p>
            </div>
            <div class="connector-box"><span class="mono">${esc(CONNECTOR_URL)}</span><button class="btn btn-secondary btn-sm" data-ai-copy>${svg("copy")}Copy</button></div>
          </div>

          <div class="split-grid">
            <div class="panel"><div class="panel-head"><div><h2>Connect Claude</h2><p>Claude Desktop or claude.ai</p></div></div>
              <ol class="steps-list"><li>Open Claude → Settings → Connectors.</li><li>Choose <strong>Add custom connector</strong>.</li><li>Paste the connector address above.</li><li>Approve the scopes you want to grant.</li></ol>
              <div class="panel-foot"><button class="btn btn-secondary btn-sm" data-ai-guide="Claude">Open setup guide ${svg("externalLink")}</button></div>
            </div>
            <div class="panel"><div class="panel-head"><div><h2>Connect ChatGPT</h2><p>ChatGPT desktop with developer mode</p></div></div>
              <ol class="steps-list"><li>Open ChatGPT → Settings → Connectors.</li><li>Enable developer mode if prompted.</li><li>Add the connector URL above.</li><li>Sign in to your store when asked.</li></ol>
              <div class="panel-foot"><button class="btn btn-secondary btn-sm" data-ai-guide="ChatGPT">Open setup guide ${svg("externalLink")}</button></div>
            </div>
          </div>

          <div class="panel">
            <div class="panel-head"><div><h2>Privacy</h2><p>Control whether product data can leave your store.</p></div>
              <label class="switch-row"><input type="checkbox" data-ai-privacy${ai.privacy ? " checked" : ""}><span class="switch"><span></span></span><span class="switch-label">${ai.privacy ? "Share data with AI" : "Store data stays local"}</span></label>
            </div>
            <p class="panel-note">${ai.privacy ? "Selected areas are shared with connected AI apps for this demo." : "AI apps can read the store structure, but private product and order data is not shared."}</p>
          </div>

          <div class="panel"><div class="panel-head"><div><h2>Permissions</h2><p>What connected AI apps are allowed to do.</p></div></div>
            <div class="choice-grid">
              ${[
                ["read", "Read only", "Can look up products, orders and reports. Cannot change anything."],
                ["propose", "Propose changes", "Can draft edits and new records for you to approve."],
                ["full", "Full control", "Can make changes directly, including prices and stock."],
              ]
                .map(([value, label, text]) => `<label class="choice-card${ai.level === value ? " selected" : ""}">
                  <input type="radio" name="aiLevel" value="${value}" data-ai-level${ai.level === value ? " checked" : ""}>
                  <strong>${label}</strong><span>${text}</span>
                </label>`)
                .join("")}
            </div>
          </div>

          <div class="panel"><div class="panel-head"><div><h2>Change areas</h2><p>Choose which parts of the store an AI app may touch.</p></div><button class="btn btn-secondary btn-sm" data-ai-save>Save changes</button></div>
            <div class="areas-grid">${areas
              .map(([key, label]) => `<label class="area-toggle"><input type="checkbox" data-ai-area="${key}"${ai.areas[key] ? " checked" : ""}><span class="area-check">${svg("check")}</span><span>${label}</span></label>`)
              .join("")}</div>
          </div>

          <div class="panel"><div class="panel-head"><div><h2>Connected apps</h2><p>Apps with access to this store.</p></div></div>
            ${ai.apps.length
              ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>App</th><th>Provider</th><th>Permission</th><th>Connected</th><th class="th-actions">Actions</th></tr></thead>
                <tbody>${ai.apps
                  .map(
                    (app) => `<tr data-id="${esc(app.id)}"><td><strong>${esc(app.name)}</strong></td><td>${esc(app.provider)}</td><td>${badge(app.level, "blue")}</td>
                      <td class="muted small">${Admin.dateShort(app.connectedAt)}</td><td class="table-actions"><button class="btn btn-secondary btn-sm" data-ai-disconnect="${esc(app.id)}">Disconnect</button></td></tr>`
                  )
                  .join("")}</tbody></table></div>`
              : Admin.emptyState({ icon: "sparkles", title: "No apps connected", text: "Connect Claude or ChatGPT to get started." })}
          </div>
        </div>`;

        container.querySelectorAll("[data-ai-copy]").forEach((button) =>
          button.addEventListener("click", () => Admin.copyText(CONNECTOR_URL, "Connector address copied"))
        );
        container.querySelector("[data-ai-privacy]").addEventListener("change", (event) => {
          ai.privacy = event.target.checked;
          Admin.store.save();
          draw();
        });
        container.querySelectorAll("[data-ai-level]").forEach((radio) => {
          radio.addEventListener("change", () => {
            ai.level = radio.value;
            Admin.store.save();
            draw();
          });
        });
        container.querySelectorAll("[data-ai-area]").forEach((checkbox) => {
          checkbox.addEventListener("change", () => {
            ai.areas[checkbox.dataset.aiArea] = checkbox.checked;
            Admin.store.save();
          });
        });
        container.querySelector("[data-ai-save]").addEventListener("click", () => {
          Admin.store.save();
          Admin.toast("AI permissions saved", "success");
        });
        container.querySelector("[data-ai-connect]").addEventListener("click", () => {
          Admin.formModal({
            title: "Connect an AI app",
            fields: [
              { name: "name", label: "App name", required: true, full: true, placeholder: "e.g. Claude Desktop" },
              { name: "provider", label: "Provider", type: "select", options: ["Claude", "ChatGPT", "Other"] },
              { name: "level", label: "Permission", type: "select", options: ["Read only", "Propose changes", "Full control"] },
            ],
            submitLabel: "Connect app",
            onSubmit(values) {
              ai.apps.push({ id: Admin.uid("ai"), ...values, connectedAt: Admin.DEMO_TODAY });
              Admin.store.save();
              Admin.toast("AI app connected", "success");
              Admin.rerender();
            },
          });
        });
        container.querySelectorAll("[data-ai-disconnect]").forEach((button) => {
          button.addEventListener("click", () => {
            const app = ai.apps.find((item) => item.id === button.dataset.aiDisconnect);
            Admin.confirm({
              title: "Disconnect app?",
              message: `“${esc(app?.name || "This app")}” will immediately lose access to your store data.`,
              confirmLabel: "Disconnect", danger: true,
              onConfirm() {
                ai.apps = ai.apps.filter((item) => item.id !== button.dataset.aiDisconnect);
                Admin.store.save();
                Admin.toast("AI app disconnected", "success");
                Admin.rerender();
              },
            });
          });
        });
        container.querySelectorAll("[data-ai-guide]").forEach((button) => {
          button.addEventListener("click", () => Admin.toast(`${button.dataset.aiGuide} setup guide opened in the demo docs.`, "success"));
        });
      };
      draw();
    },
  };

  /* ---------------------------------------------------------------------
     Settings
     --------------------------------------------------------------------- */

  const getPath = (object, path) => path.split(".").reduce((value, part) => value?.[part], object);
  const setPath = (object, path, value) => {
    const parts = path.split(".");
    let target = object;
    parts.slice(0, -1).forEach((part) => {
      target[part] = target[part] && typeof target[part] === "object" ? target[part] : {};
      target = target[part];
    });
    target[parts[parts.length - 1]] = value;
  };

  function settingsField(settings, path, label, options = {}) {
    const value = options.value ?? getPath(settings, path) ?? "";
    const type = options.type || "text";
    const id = `set_${path.replace(/\./g, "_")}`;
    let control;
    if (type === "select") {
      control = `<select class="select input" id="${id}" data-path="${path}">${options.options
        .map((option) => {
          const opt = typeof option === "object" ? option : { value: option, label: option };
          return `<option value="${esc(opt.value)}"${String(opt.value) === String(value) ? " selected" : ""}>${esc(opt.label)}</option>`;
        })
        .join("")}</select>`;
    } else if (type === "textarea") {
      control = `<textarea class="input textarea" id="${id}" data-path="${path}" rows="${options.rows || 3}">${esc(value)}</textarea>`;
    } else if (type === "color") {
      control = `<div class="color-field"><input class="color-input" type="color" id="${id}" data-path="${path}" value="${esc(value)}"><span class="mono small">${esc(value)}</span></div>`;
    } else {
      control = `<input class="input" type="${type}" id="${id}" data-path="${path}" value="${esc(value)}"${
        options.min !== undefined ? ` min="${options.min}"` : ""
      }${options.step !== undefined ? ` step="${options.step}"` : ""} placeholder="${esc(options.placeholder || "")}">`;
    }
    return `<div class="field ${options.full ? "full" : ""}"><label for="${id}">${label}</label>${control}${options.help ? `<span class="hint">${options.help}</span>` : ""}</div>`;
  }

  function settingsToggle(settings, path, label, help = "") {
    const checked = Boolean(getPath(settings, path));
    return `<label class="toggle-row">
      <input type="checkbox" data-path="${path}"${checked ? " checked" : ""}>
      <span class="switch"><span></span></span>
      <span class="toggle-copy"><strong>${label}</strong>${help ? `<small>${help}</small>` : ""}</span>
    </label>`;
  }

  function settingsPanel(tab, settings) {
    if (tab === "identity") {
      return `<section class="settings-section"><h2>Store identity</h2><p>The name and logo customers see across the storefront and emails.</p>
        <div class="logo-setting">
          <img id="settingsLogoPreview" src="${esc(settings.logo || "assets/logo.png")}" alt="Store logo">
          <div><label class="btn btn-secondary btn-sm" for="settingsLogo">${svg("upload")}Upload logo</label>
          <input id="settingsLogo" type="file" accept="image/*" hidden><p class="hint">PNG or SVG, transparent background, under 200 KB.</p></div>
        </div>
        <div class="form-grid">
          ${settingsField(settings, "storeName", "Store name", { required: true })}
          ${settingsField(settings, "currency", "Currency", { type: "select", options: ["PKR - Pakistani Rupee (Rs.)", "USD - US Dollar ($)", "AED - UAE Dirham (AED)", "GBP - Pound Sterling (£)"] })}
          ${settingsField(settings, "tagline", "Tagline", { full: true })}
          ${settingsField(settings, "country", "Country", { type: "select", options: ["Pakistan", "United Arab Emirates", "United Kingdom", "United States"] })}
        </div>
      </section>`;
    }
    if (tab === "contact") {
      return `<section class="settings-section"><h2>Contact details</h2><p>Where customers can reach you. These appear on invoices, emails and the contact page.</p>
        <div class="form-grid">
          ${settingsField(settings, "email", "Support email", { type: "email" })}
          ${settingsField(settings, "phone", "Phone number")}
          ${settingsField(settings, "whatsapp", "WhatsApp number")}
          ${settingsField(settings, "address", "Business address", { full: true })}
        </div>
      </section>`;
    }
    if (tab === "theme") {
      return `<section class="settings-section"><h2>Theme & styling</h2><p>Control the storefront's colours, corners and typeface.</p>
        <div class="form-grid">
          ${settingsField(settings, "theme.primary", "Primary colour", { type: "color" })}
          ${settingsField(settings, "theme.accent", "Accent colour", { type: "color" })}
          ${settingsField(settings, "theme.radius", "Corner radius", { type: "select", options: ["0px", "2px", "6px", "12px", "20px"] })}
          ${settingsField(settings, "theme.font", "Heading font", { type: "select", options: ["Poppins", "Roboto", "Georgia", "Inter"] })}
        </div>
        <div class="theme-preview"><span>Preview</span><div class="theme-card"><strong>Luxury bed linen</strong><p>Woven for everyday rest.</p><button class="btn btn-primary btn-sm">Shop the collection</button></div></div>
        <button class="btn btn-secondary btn-sm" data-settings-reset-theme>Reset default theme</button>
      </section>`;
    }
    if (tab === "shipping") {
      return `<section class="settings-section"><h2>Shipping & taxes</h2><p>What customers pay for delivery and the tax applied at checkout.</p>
        <div class="form-grid">
          ${settingsField(settings, "shipping.flatRate", "Flat delivery rate (Rs.)", { type: "number", min: 0 })}
          ${settingsField(settings, "shipping.freeThreshold", "Free shipping over (Rs.)", { type: "number", min: 0 })}
          ${settingsField(settings, "shipping.codFee", "Cash-on-delivery fee (Rs.)", { type: "number", min: 0 })}
          ${settingsField(settings, "shipping.taxRate", "Sales tax rate (%)", { type: "number", min: 0, step: "0.1" })}
        </div>
        <div class="alert alert-info">${svg("info")}Delivery is calculated at checkout from these values. Courier-specific rates can be configured on the Couriers tab.</div>
      </section>`;
    }
    if (tab === "payments") {
      return `<section class="settings-section"><h2>Payment methods</h2><p>Choose what customers can use to pay at checkout.</p>
        <div class="toggle-list">
          ${settingsToggle(settings, "payments.cod", "Cash on delivery", "Collect payment when the parcel arrives.")}
          ${settingsToggle(settings, "payments.bank", "Bank transfer", "Show bank details after checkout.")}
          ${settingsToggle(settings, "payments.card", "Debit / credit card", "Requires a connected payment gateway.")}
        </div>
        ${settingsField(settings, "payments.bankDetails", "Bank transfer details", { type: "textarea", full: true, rows: 3 })}
        <div class="alert alert-warn">${svg("alert")}Card payments are not connected in this demo. Customers will only see enabled manual methods.</div>
      </section>`;
    }
    if (tab === "couriers") {
      return `<section class="settings-section"><h2>Couriers & logistics</h2><p>Default courier and account used when booking shipments.</p>
        <div class="form-grid">
          ${settingsField(settings, "couriers.default", "Default courier", { type: "select", options: ["PostEx", "TCS", "Leopards", "M&P"] })}
          ${settingsField(settings, "couriers.account", "Courier account number")}
          ${settingsField(settings, "couriers.apiKey", "API key", { full: true, help: "Demo value only — never use a live key in this clone." })}
        </div>
        <div class="courier-row">${["PostEx", "TCS", "Leopards", "M&P"].map((courier) => `<span class="pill pill-soft">${courier} ${settings.couriers.default === courier ? "· default" : ""}</span>`).join("")}</div>
      </section>`;
    }
    if (tab === "email") {
      return `<section class="settings-section"><h2>Email & WhatsApp</h2><p>Sender identity for transactional messages.</p>
        <div class="form-grid">
          ${settingsField(settings, "emailSettings.fromName", "From name")}
          ${settingsField(settings, "emailSettings.replyTo", "Reply-to email", { type: "email" })}
          ${settingsField(settings, "emailSettings.cloudToken", "WhatsApp Cloud API token", { full: true, help: "Stored server-side in production." })}
        </div>
        <div class="toggle-list">${settingsToggle(settings, "emailSettings.copyOrders", "Email me a copy of every order", "Send a copy to the support inbox.")}</div>
        <button class="btn btn-secondary btn-sm" data-settings-test-email>${svg("mail")}Send test email</button>
        <div class="alert alert-warn">${svg("alert")}Email delivery is simulated in this admin clone. Nothing is actually sent.</div>
      </section>`;
    }
    if (tab === "tracking") {
      return `<section class="settings-section"><h2>Analytics & tracking</h2><p>Measurement IDs used on the storefront. Leave blank to disable a platform.</p>
        <div class="form-grid">
          ${settingsField(settings, "tracking.ga4", "Google Analytics 4", { placeholder: "G-XXXXXXXXXX" })}
          ${settingsField(settings, "tracking.gtm", "Google Tag Manager", { placeholder: "GTM-XXXXXXX" })}
          ${settingsField(settings, "tracking.meta", "Meta Pixel ID", { placeholder: "000000000000000" })}
          ${settingsField(settings, "tracking.tiktok", "TikTok Pixel ID", { placeholder: "XXXXXXXXXXXX" })}
        </div>
      </section>`;
    }
    if (tab === "social") {
      return `<section class="settings-section"><h2>Social channels</h2><p>Links shown in the storefront footer and product share cards.</p>
        <div class="form-grid">
          ${settingsField(settings, "social.instagram", "Instagram URL", { type: "url", full: true })}
          ${settingsField(settings, "social.facebook", "Facebook URL", { type: "url", full: true })}
          ${settingsField(settings, "social.tiktok", "TikTok URL", { type: "url", full: true })}
          ${settingsField(settings, "social.youtube", "YouTube URL", { type: "url", full: true })}
        </div>
      </section>`;
    }
    return `<section class="settings-section"><h2>SEO & domain</h2><p>Search metadata and the canonical domain for the storefront.</p>
      <div class="form-grid">
        ${settingsField(settings, "seo.title", "Meta title", { full: true })}
        ${settingsField(settings, "seo.description", "Meta description", { type: "textarea", full: true, rows: 3 })}
        ${settingsField(settings, "seo.domain", "Primary domain")}
      </div>
      <div class="toggle-list">${settingsToggle(settings, "seo.robots", "Allow search engines to index the store", "Turn off while the store is in preview.")}</div>
    </section>`;
  }

  Admin.pages.settings = {
    render(container) {
      const state = Admin.uiState.settings || (Admin.uiState.settings = { tab: "identity" });
      const draw = () => {
        const settings = Admin.store.get("settings");
        container.innerHTML = `${Admin.pageHead({
          group: "System",
          title: "Store Settings",
          subtitle: "Branding, Currency, Themes &amp; Integrations",
          actions: `<button class="btn btn-primary" data-settings-save>${svg("check")}Save changes</button>`,
        })}
          <div class="settings-shell">
            <div class="settings-tabs" role="tablist">${Admin.settingsTabs
              .map((tab) => `<button class="settings-tab${state.tab === tab.id ? " active" : ""}" data-settings-tab="${tab.id}"><span>${tab.label}</span></button>`)
              .join("")}</div>
            <div class="panel settings-panel"><form id="settingsForm">${settingsPanel(state.tab, settings)}</form></div>
          </div>
        </div>`;

        const save = (showToast = true) => {
          const form = container.querySelector("#settingsForm");
          if (!form) return;
          const next = Admin.deepClone(Admin.store.get("settings"));
          form.querySelectorAll("[data-path]").forEach((input) => {
            let value = input.type === "checkbox" ? input.checked : input.value;
            if (input.type === "number") value = Number(value) || 0;
            setPath(next, input.dataset.path, value);
          });
          Admin.store.set("settings", next);
          Admin.store.applyTheme();
          Admin.hydrateShell?.();
          if (showToast) Admin.toast("Store settings saved", "success");
        };

        container.querySelectorAll("[data-settings-tab]").forEach((button) => {
          button.addEventListener("click", () => {
            save(false);
            state.tab = button.dataset.settingsTab;
            draw();
          });
        });
        container.querySelector("[data-settings-save]").addEventListener("click", () => save(true));
        container.querySelector("#settingsForm").addEventListener("submit", (event) => {
          event.preventDefault();
          save(true);
        });
        container.querySelectorAll("[data-settings-reset-theme]").forEach((button) => {
          button.addEventListener("click", () => {
            const next = Admin.deepClone(Admin.store.get("settings"));
            next.theme = { primary: "#1a1a1a", accent: "#c4a484", radius: "2px", font: "Roboto" };
            Admin.store.set("settings", next);
            Admin.store.applyTheme();
            Admin.toast("Theme reset to defaults", "success");
            draw();
          });
        });
        container.querySelectorAll("[data-settings-test-email]").forEach((button) => {
          button.addEventListener("click", () => Admin.toast("Test email queued — email delivery is simulated.", "success"));
        });
        const logoInput = container.querySelector("#settingsLogo");
        logoInput?.addEventListener("change", () => {
          const file = logoInput.files?.[0];
          if (!file) return;
          if (file.size > 200 * 1024) {
            Admin.toast("Please choose a logo under 200 KB.", "error");
            logoInput.value = "";
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            const next = Admin.deepClone(Admin.store.get("settings"));
            next.logo = String(reader.result);
            Admin.store.set("settings", next);
            const preview = container.querySelector("#settingsLogoPreview");
            if (preview) preview.src = next.logo;
            Admin.hydrateShell?.();
            Admin.toast("Logo updated", "success");
          };
          reader.readAsDataURL(file);
        });
      };
      draw();
    },
  };
})();
