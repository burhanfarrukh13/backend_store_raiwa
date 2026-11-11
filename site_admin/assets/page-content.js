/* Baytak Noor Admin — Content & Marketing pages */
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

  const statusBadge = (status) => badge(status, status === "Published" ? "green" : "gray");

  /* ---------------------------------------------------------------------
     Blog
     --------------------------------------------------------------------- */

  Admin.pages.blog = {
    render(container) {
      Admin.listPage(container, {
        slug: "blog",
        key: "blog",
        singular: "article",
        plural: "articles",
        entity: "Blog article",
        title: "Blog & Editorial",
        subtitle: "Manage journal articles, guides, and brand stories.",
        newLabel: "New Article",
        searchKeys: ["title", "category", "author", "excerpt"],
        label: (row) => row.title,
        columns: [
          { label: "Article", render: (row) => `<div><strong>${esc(row.title)}</strong><span class="cell-sub">${esc(row.excerpt || "")}</span></div>` },
          { label: "Author", render: (row) => `<span class="muted">${esc(row.author)}</span>` },
          { label: "Category", render: (row) => `<span class="pill pill-soft">${esc(row.category)}</span>` },
          { label: "Status", render: (row) => statusBadge(row.status) },
          { label: "Published", render: (row) => `<span class="muted small">${Admin.dateShort(row.date)}</span>` },
          { label: "Views", render: (row) => Admin.num(row.views) },
        ],
        filters: [
          {
            key: "status", label: "Article status",
            options: [{ value: "all", label: "All statuses" }, { value: "Published", label: "Published" }, { value: "Draft", label: "Draft" }],
            match: (row, value) => row.status === value,
          },
        ],
        fields: (row) => [
          { name: "title", label: "Article title", required: true, full: true },
          { name: "slug", label: "URL slug", value: row?.slug || "" },
          { name: "category", label: "Category", placeholder: "Care Guides" },
          { name: "author", label: "Author", required: true },
          { name: "status", label: "Status", type: "select", options: ["Published", "Draft"] },
          { name: "date", label: "Publish date", type: "date" },
          { name: "views", label: "Views", type: "number", min: 0 },
          { name: "excerpt", label: "Summary excerpt", type: "textarea", full: true, rows: 2, placeholder: "Brief 1–2 sentence preview for search and article cards…" },
          { name: "body", label: "Article body (HTML)", type: "textarea", full: true, rows: 7 },
          { name: "heroImage", label: "Featured hero image URL", full: true, placeholder: "https://… or assets/…" },
          { name: "tags", label: "Tags (comma-separated)", full: true, placeholder: "guide, cotton, care" },
          { name: "seoTitle", label: "SEO page title", full: true, placeholder: "Article SEO title" },
          { name: "seoDescription", label: "SEO meta description", type: "textarea", full: true, rows: 3, placeholder: "Search engine snippet description…" },
        ],
        defaults: { status: "Draft", author: "Amina Rauf", date: Admin.DEMO_TODAY, views: 0, category: "Guides" },
        onSave(values, row) {
          return { ...values, slug: values.slug || slugify(values.title), views: Number(values.views) || 0 };
        },
        rowActions: (row) => `<button class="icon-btn" data-act="view" data-id="${esc(row.id)}" title="Preview">${svg("eye")}</button>
          <button class="icon-btn" data-act="toggle" data-id="${esc(row.id)}" title="Publish or unpublish">${svg(row.status === "Published" ? "xCircle" : "checkCircle")}</button>
          <button class="icon-btn" data-edit title="Edit">${svg("edit")}</button>
          <button class="icon-btn danger" data-delete title="Delete">${svg("trash")}</button>`,
        onAction(act, row) {
          if (!row) return;
          if (act === "toggle") {
            row.status = row.status === "Published" ? "Draft" : "Published";
            if (row.status === "Published" && !row.date) row.date = Admin.DEMO_TODAY;
            Admin.store.save();
            Admin.toast(`Article ${row.status.toLowerCase()}`, "success");
            Admin.rerender();
          }
          if (act === "view") {
            Admin.openModal({
              title: esc(row.title),
              size: "lg",
              body: `<div class="article-preview"><div class="article-meta">${esc(row.category)} · ${esc(row.author)} · ${Admin.dateShort(row.date)} · ${Admin.num(row.views)} views</div>
                <p class="article-excerpt">${esc(row.excerpt || "")}</p><div class="article-body">${esc(row.body || "").replace(/\n/g, "<br>")}</div></div>`,
              footer: `<button class="btn btn-secondary" data-modal-close>Close</button>`,
            });
          }
        },
      });
    },
  };

  /* ---------------------------------------------------------------------
     Custom pages
     --------------------------------------------------------------------- */

  Admin.pages.pages = {
    render(container) {
      Admin.listPage(container, {
        slug: "pages",
        key: "pages",
        singular: "page",
        plural: "pages",
        entity: "Custom page",
        title: "Custom Pages",
        subtitle: "Manage static CMS pages (About, Policies, Terms, Brand Story).",
        newLabel: "New Page",
        searchKeys: ["title", "slug", "body"],
        label: (row) => row.title,
        columns: [
          { label: "Page", render: (row) => `<div><strong>${esc(row.title)}</strong><span class="cell-sub">${esc((row.body || "").slice(0, 90))}</span></div>` },
          { label: "Slug", render: (row) => `<span class="mono small">/${esc(row.slug)}</span>` },
          { label: "Status", render: (row) => statusBadge(row.status) },
          { label: "Last updated", render: (row) => `<span class="muted small">${Admin.dateShort(row.updatedAt)}</span>` },
        ],
        fields: [
          { name: "title", label: "Page title", required: true, full: true },
          { name: "slug", label: "URL slug" },
          { name: "status", label: "Status", type: "select", options: ["Published", "Draft"] },
          { name: "seoTitle", label: "SEO page title", full: true, placeholder: "Page SEO title" },
          { name: "seoDescription", label: "SEO meta description", type: "textarea", full: true, rows: 3, placeholder: "Search engine snippet description…" },
          { name: "body", label: "Page content", type: "textarea", full: true, rows: 9 },
        ],
        defaults: { status: "Draft", updatedAt: Admin.DEMO_TODAY },
        onSave(values) {
          return { ...values, slug: values.slug || slugify(values.title), updatedAt: Admin.DEMO_TODAY };
        },
        rowActions: (row) => `<button class="icon-btn" data-act="view" data-id="${esc(row.id)}" title="View">${svg("eye")}</button>
          <button class="icon-btn" data-edit title="Edit">${svg("edit")}</button>
          <button class="icon-btn danger" data-delete title="Delete">${svg("trash")}</button>`,
        onAction(act, row) {
          if (act !== "view" || !row) return;
          Admin.openModal({
            title: esc(row.title),
            body: `<div class="article-meta">/${esc(row.slug)} · ${esc(row.status)} · updated ${Admin.dateShort(row.updatedAt)}</div>
              <div class="article-body">${esc(row.body || "").replace(/\n/g, "<br>")}</div>`,
            footer: `<button class="btn btn-secondary" data-modal-close>Close</button>`,
          });
        },
      });
    },
  };

  /* ---------------------------------------------------------------------
     FAQ
     --------------------------------------------------------------------- */

  Admin.pages.faq = {
    render(container) {
      const categories = ["all", ...new Set(Admin.store.list("faqs").map((faq) => faq.category))];
      Admin.listPage(container, {
        slug: "faq",
        key: "faqs",
        singular: "FAQ",
        plural: "FAQs",
        entity: "FAQ",
        title: "FAQ Management",
        subtitle: "Manage frequently asked questions, customer answers, and categorized help accordion.",
        newLabel: "New FAQ",
        searchKeys: ["question", "answer", "category"],
        label: (row) => row.question,
        rows: () => Admin.store.list("faqs").slice().sort((a, b) => Number(a.sort) - Number(b.sort)),
        filters: [
          {
            key: "category", label: "FAQ category",
            options: categories.map((category) => ({ value: category, label: category === "all" ? "All Categories" : category })),
            match: (row, value) => row.category === value,
          },
        ],
        columns: [
          { label: "Question", render: (row) => `<div><strong>${esc(row.question)}</strong><span class="cell-sub">${esc(row.answer)}</span></div>` },
          { label: "Category", render: (row) => `<span class="pill pill-soft">${esc(row.category)}</span>` },
          { label: "Status", render: (row) => statusBadge(row.status) },
          { label: "Order", render: (row) => `<span class="muted">${row.sort}</span>` },
        ],
        fields: (row) => [
          { name: "question", label: "Question", required: true, full: true },
          { name: "answer", label: "Answer", type: "textarea", full: true, rows: 4, required: true },
          { name: "category", label: "Category", placeholder: "Shipping" },
          { name: "status", label: "Status", type: "select", options: ["Published", "Draft"] },
          { name: "sort", label: "Sort order", type: "number", min: 1 },
        ],
        defaults: { status: "Published", category: "General", sort: Admin.store.list("faqs").length + 1 },
        rowActions: (row) => `<button class="icon-btn" data-act="up" data-id="${esc(row.id)}" title="Move up">${svg("arrowUp")}</button>
          <button class="icon-btn" data-act="down" data-id="${esc(row.id)}" title="Move down">${svg("arrowDown")}</button>
          <button class="icon-btn" data-act="toggle" data-id="${esc(row.id)}" title="Publish or unpublish">${svg(row.status === "Published" ? "xCircle" : "checkCircle")}</button>
          <button class="icon-btn" data-edit title="Edit">${svg("edit")}</button>
          <button class="icon-btn danger" data-delete title="Delete">${svg("trash")}</button>`,
        onAction(act, row) {
          if (!row) return;
          const sorted = Admin.store.list("faqs").slice().sort((a, b) => Number(a.sort) - Number(b.sort));
          const index = sorted.findIndex((faq) => faq.id === row.id);
          if (act === "up" && index > 0) {
            const previous = sorted[index - 1];
            const swap = row.sort;
            row.sort = previous.sort;
            previous.sort = swap;
            Admin.store.save();
            Admin.rerender();
          }
          if (act === "down" && index < sorted.length - 1) {
            const next = sorted[index + 1];
            const swap = row.sort;
            row.sort = next.sort;
            next.sort = swap;
            Admin.store.save();
            Admin.rerender();
          }
          if (act === "toggle") {
            row.status = row.status === "Published" ? "Draft" : "Published";
            Admin.store.save();
            Admin.toast(`FAQ ${row.status.toLowerCase()}`, "success");
            Admin.rerender();
          }
        },
      });
    },
  };

  /* ---------------------------------------------------------------------
     Redirects
     --------------------------------------------------------------------- */

  Admin.pages.redirects = {
    render(container) {
      Admin.listPage(container, {
        slug: "redirects",
        key: "redirects",
        singular: "redirect",
        plural: "redirects",
        entity: "Redirect",
        title: "URL Redirects",
        subtitle: "Map old URLs and renamed pages to new destinations with 301 and 302 redirects.",
        newLabel: "Create redirect",
        searchKeys: ["from", "to", "type"],
        label: (row) => row.from,
        actions: [{ label: "Import CSV", icon: "upload", act: "import", variant: "secondary" }],
        filters: [
          {
            key: "type", label: "Redirect type",
            options: [{ value: "all", label: "All Types" }, { value: "301 (Permanent)", label: "301 (Permanent)" }, { value: "302 (Temporary)", label: "302 (Temporary)" }],
            match: (row, value) => row.type === value,
          },
          {
            key: "status", label: "Redirect status",
            options: [{ value: "all", label: "All Statuses" }, { value: "Active", label: "Active only" }, { value: "Disabled", label: "Disabled only" }],
            match: (row, value) => row.status === value,
          },
        ],
        columns: [
          { label: "From", render: (row) => `<span class="mono small">${esc(row.from)}</span>` },
          { label: "To", render: (row) => `<span class="mono small muted">${esc(row.to)}</span>` },
          { label: "Type", render: (row) => badge(row.type.startsWith("301") ? "301" : "302", row.type.startsWith("301") ? "blue" : "gray") },
          { label: "Hits", render: (row) => Admin.num(row.hits) },
          { label: "Status", render: (row) => badge(row.status) },
        ],
        fields: [
          { name: "from", label: "From path", required: true, placeholder: "/old-url", full: true },
          { name: "to", label: "To path", required: true, placeholder: "/collections/new-url", full: true },
          { name: "type", label: "Redirect type", type: "select", options: ["301 (Permanent)", "302 (Temporary)"] },
          { name: "status", label: "Status", type: "select", options: ["Active", "Disabled"] },
        ],
        defaults: { type: "301 (Permanent)", status: "Active", hits: 0, createdAt: Admin.DEMO_TODAY },
        rowActions: (row) => `<button class="icon-btn" data-act="copy" data-id="${esc(row.id)}" title="Copy path">${svg("copy")}</button>
          <button class="icon-btn" data-act="toggle" data-id="${esc(row.id)}" title="Enable or disable">${svg(row.status === "Active" ? "xCircle" : "checkCircle")}</button>
          <button class="icon-btn" data-edit title="Edit">${svg("edit")}</button>
          <button class="icon-btn danger" data-delete title="Delete">${svg("trash")}</button>`,
        onAction(act, row) {
          if (act === "import") {
            Admin.store.add("redirects", {
              from: "/sale-2026", to: "/collections/best-sellers", type: "302 (Temporary)",
              status: "Active", hits: 0, createdAt: Admin.DEMO_TODAY,
            });
            Admin.store.add("redirects", {
              from: "/bed-linen", to: "/collections/bed-sheets", type: "301 (Permanent)",
              status: "Active", hits: 0, createdAt: Admin.DEMO_TODAY,
            });
            Admin.toast("2 redirects imported", "success");
            Admin.rerender();
            return;
          }
          if (!row) return;
          if (act === "copy") Admin.copyText(row.from, "Path copied");
          if (act === "toggle") {
            row.status = row.status === "Active" ? "Disabled" : "Active";
            Admin.store.save();
            Admin.toast(`Redirect ${row.status.toLowerCase()}`, "success");
            Admin.rerender();
          }
        },
      });
    },
  };

  /* ---------------------------------------------------------------------
     Newsletter
     --------------------------------------------------------------------- */

  Admin.pages.newsletter = {
    render(container) {
      Admin.listPage(container, {
        slug: "newsletter",
        key: "subscribers",
        singular: "subscriber",
        plural: "subscribers",
        entity: "Subscriber",
        title: "Newsletter Audience",
        subtitle: "View, filter, manage, and export email newsletter subscribers.",
        newLabel: "Add subscriber",
        searchKeys: ["email", "name", "source"],
        label: (row) => row.email,
        tabs: (rows) => [
          { value: "all", label: "all", count: rows.length },
          { value: "active", label: "active", count: rows.filter((row) => row.status === "active").length },
          { value: "inactive", label: "inactive", count: rows.filter((row) => row.status === "inactive").length },
        ],
        tabFilter: (row, value) => value === "all" || row.status === value,
        actions: [{ label: "Export CSV", icon: "download", act: "export", variant: "secondary" }],
        columns: [
          { label: "Subscriber", render: (row) => `<div><strong>${esc(row.email)}</strong><span class="cell-sub">${esc(row.name || "No name")}</span></div>` },
          { label: "Source", render: (row) => `<span class="pill pill-soft">${esc(row.source)}</span>` },
          { label: "Joined", render: (row) => `<span class="muted small">${Admin.dateShort(row.joinedAt)}</span>` },
          { label: "Status", render: (row) => badge(row.status) },
        ],
        fields: [
          { name: "email", label: "Email", type: "email", required: true, full: true },
          { name: "name", label: "Name" },
          { name: "source", label: "Source", type: "select", options: ["Footer", "Checkout", "Popup", "Manual"] },
          { name: "status", label: "Status", type: "select", options: ["active", "inactive"] },
        ],
        defaults: { status: "active", source: "Manual", joinedAt: Admin.DEMO_TODAY },
        rowActions: (row) => `<button class="icon-btn" data-act="toggle" data-id="${esc(row.id)}" title="Toggle status">${svg(row.status === "active" ? "xCircle" : "checkCircle")}</button>
          <button class="icon-btn" data-edit title="Edit">${svg("edit")}</button>
          <button class="icon-btn danger" data-delete title="Delete">${svg("trash")}</button>`,
        onAction(act, row) {
          if (act === "export") {
            Admin.exportCSV("newsletter-subscribers.csv", [
              ["Email", "Name", "Status", "Source", "Joined"],
              ...Admin.store.list("subscribers").map((item) => [item.email, item.name, item.status, item.source, item.joinedAt]),
            ]);
            return;
          }
          if (act === "toggle" && row) {
            row.status = row.status === "active" ? "inactive" : "active";
            Admin.store.save();
            Admin.toast("Subscriber status updated", "success");
            Admin.rerender();
          }
        },
      });
    },
  };

  /* ---------------------------------------------------------------------
     Contact
     --------------------------------------------------------------------- */

  Admin.pages.contact = {
    render(container) {
      const openReply = (row) => {
        Admin.formModal({
          title: `Reply to ${row.name}`,
          fields: [
            { name: "subject", label: "Subject", full: true, value: `Re: ${row.subject}` },
            { name: "reply", label: "Reply", type: "textarea", rows: 5, full: true, required: true },
          ],
          submitLabel: "Send reply",
          onSubmit(values) {
            row.reply = values.reply;
            row.status = "read";
            Admin.store.add("emails", {
              to: row.email,
              subject: values.subject,
              template: "Contact reply",
              status: "Sent",
              date: new Date().toISOString(),
              error: "",
              body: values.reply,
            });
            Admin.store.save();
            Admin.toast("Reply sent", "success");
            Admin.rerender();
          },
        });
      };

      Admin.listPage(container, {
        slug: "contact",
        key: "inquiries",
        singular: "inquiry",
        plural: "inquiries",
        hideNew: true,
        archive: false,
        searchKeys: ["name", "email", "subject", "message"],
        tabs: (rows) => [
          { value: "all", label: "all", count: rows.length },
          { value: "unread", label: "unread", count: rows.filter((row) => row.status === "unread").length },
          { value: "read", label: "read", count: rows.filter((row) => row.status === "read").length },
        ],
        tabFilter: (row, value) => value === "all" || row.status === value,
        columns: [
          { label: "From", render: (row) => `<div><strong>${esc(row.name)}</strong><span class="cell-sub">${esc(row.email)}</span></div>` },
          { label: "Subject", render: (row) => `<div><strong>${esc(row.subject)}</strong><span class="cell-sub">${esc(row.message.slice(0, 80))}</span></div>` },
          { label: "Received", render: (row) => `<span class="muted small">${Admin.dateTime(row.date)}</span>` },
          { label: "Status", render: (row) => badge(row.status, row.status === "unread" ? "blue" : "gray") },
        ],
        rowActions: (row) => `<button class="icon-btn" data-act="view" data-id="${esc(row.id)}" title="Open">${svg("eye")}</button>
          <button class="icon-btn" data-act="reply" data-id="${esc(row.id)}" title="Reply">${svg("send")}</button>
          <button class="icon-btn danger" data-act="delete" data-id="${esc(row.id)}" title="Delete">${svg("trash")}</button>`,
        onAction(act, row) {
          if (!row) return;
          if (act === "reply") openReply(row);
          if (act === "delete") {
            Admin.confirm({
              title: "Delete inquiry?",
              message: "The message will be permanently removed from this demo.",
              confirmLabel: "Delete",
              danger: true,
              onConfirm() {
                Admin.store.remove("inquiries", row.id);
                Admin.toast("Inquiry deleted", "success");
                Admin.rerender();
              },
            });
          }
          if (act === "view") {
            if (row.status === "unread") {
              row.status = "read";
              Admin.store.save();
            }
            Admin.openModal({
              title: esc(row.subject),
              size: "md",
              body: `<div class="detail-list">
                <div class="detail-row"><span>From</span><strong>${esc(row.name)} &lt;${esc(row.email)}&gt;</strong></div>
                <div class="detail-row"><span>Phone</span><strong>${esc(row.phone || "—")}</strong></div>
                <div class="detail-row"><span>Received</span><strong>${Admin.dateTime(row.date)}</strong></div>
              </div>
              <div class="email-preview">${esc(row.message)}</div>
              ${row.reply ? `<div class="reply-block"><span>Previous reply</span><p>${esc(row.reply)}</p></div>` : ""}`,
              footer: `<button class="btn btn-secondary" data-modal-close>Close</button><button class="btn btn-primary" data-reply-now>${svg("send")}Reply</button>`,
              onMount(api) {
                api.el.querySelector("[data-reply-now]").addEventListener("click", () => {
                  Admin.closeModal();
                  openReply(row);
                });
              },
            });
          }
        },
      });
    },
  };
})();
