/* Baytak Noor Admin — application shell, dashboard and hash router */
(() => {
  "use strict";

  const { svg } = Admin;

  const currentSlug = () => {
    const raw = decodeURIComponent(location.hash.replace(/^#\/?/, "")).split("?")[0];
    return raw && Admin.tabs[raw] ? raw : "dashboard";
  };

  const hrefFor = (slug) => (slug === "dashboard" ? "#/" : `#/${slug}`);

  function navHTML(activeSlug) {
    return Admin.navGroups
      .map(
        (group) => `
        <div class="nav-group">
          <h3>${group.name}</h3>
          <div class="nav-list">
            ${group.items
              .map((slug) => {
                const tab = Admin.tabOf(slug);
                const active = slug === activeSlug;
                return `
                  <a class="nav-item${active ? " active" : ""}" href="${hrefFor(slug)}" data-slug="${slug}"${active ? ' aria-current="page"' : ""}>
                    <span class="nav-left">${svg(tab.icon)}<span>${tab.label}</span></span>
                    ${active ? svg("chevron", "chev") : ""}
                  </a>`;
              })
              .join("")}
          </div>
        </div>`
      )
      .join("");
  }

  function dashboardHTML() {
    return `
      <div class="main-inner">
        <section class="welcome">
          <h2>Welcome back, Baytak Noor Admin</h2>
          <p>Everything in your store admin, by section.</p>
        </section>
        <section class="sections" aria-label="Admin sections">
          ${Admin.navGroups
            .map((group) => {
              const items = group.items.filter((slug) => slug !== "dashboard");
              if (!items.length) return "";
              return `
                <div class="section-card">
                  <div class="section-card-head">
                    <div>
                      <h3 class="section-title">${group.name}</h3>
                      <p class="section-sub">${group.blurb}</p>
                    </div>
                  </div>
                  <ul class="section-list">
                    ${items
                      .map((slug) => {
                        const tab = Admin.tabOf(slug);
                        return `
                          <li>
                            <a href="${hrefFor(slug)}" data-slug="${slug}">
                              ${svg(tab.icon, "list-icon")}
                              <span class="list-copy">
                                <span class="list-label">${tab.label}</span>
                                <span class="list-desc">${tab.cardDesc || tab.subtitle}</span>
                              </span>
                              ${svg("chevron", "list-chev")}
                            </a>
                          </li>`;
                      })
                      .join("")}
                  </ul>
                </div>`;
            })
            .join("")}
        </section>
      </div>`;
  }

  function hydrateShell() {
    const settings = Admin.store.get("settings");
    const profile = Admin.store.get("profile");
    if (settings) {
      document.querySelectorAll(".brand-name").forEach((node) => {
        node.textContent = settings.storeName || "Baytak Noor";
      });
      document.querySelectorAll(".brand-logo img, .mobile-brand img").forEach((image) => {
        if (settings.logo) image.src = settings.logo;
      });
    }
    if (profile) {
      document.querySelectorAll(".user-name").forEach((node) => {
        node.textContent = profile.name;
      });
      document.querySelectorAll(".user-badge").forEach((node) => {
        node.textContent = profile.role || "ADMIN";
      });
      document.querySelectorAll(".user-avatar").forEach((node) => {
        node.innerHTML = Admin.svg("profile");
      });
      const welcome = document.querySelector(".welcome h2");
      if (welcome) welcome.textContent = `Welcome back, ${profile.name}`;
    }
  }

  function render() {
    const slug = currentSlug();
    const tab = Admin.tabOf(slug);
    const sidebar = document.querySelector("#sidebarNav");
    const drawer = document.querySelector("#drawerNav");
    const main = document.querySelector("#main");
    if (sidebar) sidebar.innerHTML = navHTML(slug);
    if (drawer) drawer.innerHTML = navHTML(slug);

    if (slug === "dashboard") {
      main.innerHTML = dashboardHTML();
    } else if (Admin.pages[slug]) {
      main.innerHTML = "";
      Admin.pages[slug].render(main);
    } else {
      main.innerHTML = `<div class="main-inner">${Admin.emptyState({
        icon: tab.icon,
        title: "This section is not available",
        text: "Choose another section from the sidebar.",
        action: `<a class="btn btn-primary" href="#/">Back to dashboard</a>`,
      })}</div>`;
    }

    hydrateShell();
    document.title =
      slug === "dashboard"
        ? "Baytak Noor Admin"
        : `${String(tab.pageTitle || tab.label).replace(/&amp;/g, "&")} — Baytak Noor Admin`;
  }

  Admin.rerender = render;
  Admin.hydrateShell = hydrateShell;

  /* ---------------------------------------------------------------------
     Mobile drawer
     --------------------------------------------------------------------- */

  const drawer = document.querySelector("#drawer");
  const overlay = document.querySelector("#drawerOverlay");

  function openDrawer() {
    if (!drawer) return;
    drawer.classList.add("open");
    overlay?.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    document.querySelector("#openDrawer")?.setAttribute("aria-expanded", "true");
    document.body.classList.add("no-scroll");
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove("open");
    overlay?.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    document.querySelector("#openDrawer")?.setAttribute("aria-expanded", "false");
    if (!document.querySelector(".modal-overlay")) document.body.classList.remove("no-scroll");
  }

  document.querySelector("#openDrawer")?.addEventListener("click", openDrawer);
  document.querySelector("#closeDrawer")?.addEventListener("click", closeDrawer);
  overlay?.addEventListener("click", closeDrawer);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDrawer();
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest("#drawer a, #drawer [data-slug]")) closeDrawer();

    const storeAction = event.target.closest("[data-store-action]");
    if (storeAction) {
      window.location.href = "/";
      return;
    }

    const signout = event.target.closest("[data-signout]");
    if (signout) {
      Admin.confirm({
        title: "Sign out of Admin?",
        message: "Are you sure you want to sign out of the store admin?",
        confirmLabel: "Sign out",
        danger: true,
        onConfirm() {
          localStorage.removeItem("baytak_admin_token");
          localStorage.removeItem("baytak_admin_user");
          window.location.href = "login.html";
        },
      });
      return;
    }

    const demo = event.target.closest("[data-demo]");
    if (demo) {
      Admin.toast(`“${demo.dataset.demo}” is a front-end action in this replica.`, "success");
    }
  });

  window.addEventListener("hashchange", () => {
    closeDrawer();
    render();
    window.scrollTo({ top: 0, behavior: "auto" });
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    Admin.installPrompt = event;
  });

  /* ---------------------------------------------------------------------
     Boot
     --------------------------------------------------------------------- */

  Admin.store.init();
  Admin.store.applyTheme();
  render();
})();
