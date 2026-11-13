/* Baytak Noor Admin — navigation and page metadata */
(() => {
  "use strict";

  window.Admin = window.Admin || {};

  const NAV_GROUPS = [
    {
      name: "Overview",
      blurb: "How the store is doing",
      items: ["dashboard", "analytics", "accounting", "ai"],
    },
    {
      name: "Catalog",
      blurb: "What you sell",
      items: ["products", "inventory", "suppliers", "categories", "collections", "media"],
    },
    {
      name: "Sales &amp; Customers",
      blurb: "Orders and the people behind them",
      items: ["orders", "whatsapp", "emails", "coupons", "reviews", "waitlist"],
    },
    {
      name: "Content &amp; Marketing",
      blurb: "Pages, posts and reaching customers",
      items: ["blog", "pages", "faq", "redirects", "newsletter", "contact"],
    },
    {
      name: "System",
      blurb: "Settings, team and add-ons",
      items: ["settings", "phone-app", "addons", "staff", "archive", "profile"],
    },
  ];

  const SETTINGS_TABS = [
    { id: "identity", label: "Store Identity" },
    { id: "contact", label: "Contact Details" },
    { id: "theme", label: "Theme &amp; Styling" },
    { id: "shipping", label: "Shipping &amp; Taxes" },
    { id: "payments", label: "Payment Methods" },
    { id: "couriers", label: "Couriers &amp; Logistics" },
    { id: "email", label: "Email &amp; WhatsApp" },
    { id: "tracking", label: "Analytics &amp; Tracking" },
    { id: "social", label: "Social Channels" },
    { id: "seo", label: "SEO &amp; Domain" },
  ];

  const TABS = {
    dashboard: { label: "Dashboard", icon: "dashboard" },
    analytics: {
      label: "Analytics", icon: "analytics", pageTitle: "Analytics",
      cardDesc: "Visitors, sales and conversion",
      subtitle: "Visitors, sales and conversion attribution across your store.",
    },
    accounting: {
      label: "Accounting", icon: "accounting", pageTitle: "Accounting",
      cardDesc: "True profit, expenses, couriers, ads, tax and reports",
      subtitle: "True profit after product costs, delivery, ads, tax and running costs.",
    },
    ai: {
      label: "AI Assistant", icon: "sparkles", pageTitle: "AI Assistant",
      cardDesc: "Connect your own Claude or ChatGPT to your store data",
      subtitle: "Connect the AI you already use to your store data.",
    },
    products: {
      label: "Products", icon: "package", pageTitle: "Product Catalog",
      cardDesc: "Products, variants and pricing",
      subtitle: "Manage your store's inventory, variants, prices, and availability.",
    },
    inventory: {
      label: "Inventory", icon: "layers", pageTitle: "Inventory Management",
      cardDesc: "Stock levels across variants",
      subtitle: "Track and adjust stock levels across all product variants.",
    },
    suppliers: {
      label: "Suppliers", icon: "truck", pageTitle: "Suppliers",
      cardDesc: "Who you buy each product from",
      subtitle: "Record who you buy each product from and message them on WhatsApp.",
    },
    categories: {
      label: "Categories", icon: "category", pageTitle: "Categories Management",
      cardDesc: "Store navigation and filters",
      subtitle: "Organize products into hierarchical storefront taxonomy.",
    },
    collections: {
      label: "Collections", icon: "layers", pageTitle: "Collections Management",
      cardDesc: "Hand-picked and smart groupings",
      subtitle: "Curate manual and automated smart collections for storefront merchandizing.",
    },
    media: {
      label: "Media Library", icon: "media", pageTitle: "Media Library",
      cardDesc: "Images with alt text",
      subtitle: "Store and manage product photography, banners, and marketing assets.",
    },
    orders: {
      label: "Orders", icon: "orders", pageTitle: "Orders Management",
      cardDesc: "Payments, shipping and returns",
      subtitle: "Track, filter, fulfill, and manage store customer orders and courier shipments.",
    },
    whatsapp: {
      label: "WhatsApp Messages", icon: "whatsapp", pageTitle: "Order WhatsApp Messages",
      cardDesc: "Order messages sent to customers",
      subtitle: "Customer replies, confirmation audit history, and direct order messaging.",
    },
    emails: {
      label: "Email Log", icon: "mail", pageTitle: "Email log",
      cardDesc: "Every email sent to customers",
      subtitle: "Every email your store sends to customers, and whether it was delivered.",
    },
    coupons: {
      label: "Coupons", icon: "coupons", pageTitle: "Discount Coupons",
      cardDesc: "Promo codes and discounts",
      subtitle: "Create and track promotional coupon codes, percentage/fixed deductions, and usage rules.",
    },
    reviews: {
      label: "Reviews", icon: "reviews", pageTitle: "Review Moderation",
      cardDesc: "Moderate ratings and photo reviews",
      subtitle: "Approve, reject, and monitor customer product ratings and reviews.",
    },
    waitlist: {
      label: "Waitlist", icon: "waitlist", pageTitle: "Waitlist & Restock",
      cardDesc: "Back-in-stock requests and restock dates",
      subtitle: "Track out-of-stock backorder demand and automate replenishment notifications.",
    },
    blog: {
      label: "Blog Articles", icon: "blog", pageTitle: "Blog & Editorial",
      cardDesc: "Stories, guides and news",
      subtitle: "Manage journal articles, guides, and brand stories.",
    },
    pages: {
      label: "Custom Pages", icon: "pages", pageTitle: "Custom Pages",
      cardDesc: "About, policies and other pages",
      subtitle: "Manage static CMS pages (About, Policies, Terms, Brand Story).",
    },
    faq: {
      label: "FAQ Manager", icon: "faq", pageTitle: "FAQ Management",
      cardDesc: "Customer questions and answers",
      subtitle: "Manage frequently asked questions, customer answers, and categorized help accordion.",
    },
    redirects: {
      label: "URL Redirects", icon: "redirects", pageTitle: "URL Redirects",
      cardDesc: "Send old links to the right page",
      subtitle: "Map old URLs and renamed pages to new destinations with 301 and 302 redirects.",
    },
    newsletter: {
      label: "Newsletter", icon: "mail", pageTitle: "Newsletter Audience",
      cardDesc: "Subscribers and exports",
      subtitle: "View, filter, manage, and export email newsletter subscribers.",
    },
    contact: {
      label: "Inbound Contact", icon: "whatsapp", pageTitle: "Inbound Inquiries",
      cardDesc: "Messages from the contact form",
      subtitle: "Read, filter, and reply to customer messages submitted through the contact form.",
    },
    settings: {
      label: "Store Settings", icon: "settings", pageTitle: "Store Settings",
      cardDesc: "Branding, currency, shipping, payments and tracking",
      subtitle: "Branding, Currency, Themes &amp; Integrations",
    },
    "phone-app": {
      label: "Phone App & Alerts", icon: "phone", pageTitle: "Phone app & alerts",
      cardDesc: "Install on your phone, get new-order alerts",
      subtitle: "Put your store admin on your phone like an app and get a notification for every new order.",
    },
    addons: {
      label: "Add-ons", icon: "addons", pageTitle: "Add-ons",
      cardDesc: "Extra features for your store",
      subtitle: "Extra features for your store. Try them free first, then keep the ones you like.",
    },
    staff: {
      label: "Staff & Roles", icon: "staff", pageTitle: "Staff & Roles",
      cardDesc: "Team accounts and what each can open",
      subtitle: "Give team members their own login with only the access they need.",
    },
    archive: {
      label: "Archive", icon: "archive", pageTitle: "Archive",
      cardDesc: "Everything deleted — kept and restorable",
      subtitle: "Nothing in your store is ever permanently deleted. Deleted items are kept here.",
    },
    profile: {
      label: "Admin Profile", icon: "profile", pageTitle: "Admin Profile &amp; Credentials",
      cardDesc: "Your name, email and password",
      subtitle: "Manage your administrator identity and authentication credentials.",
    },
  };

  Admin.navGroups = NAV_GROUPS;
  Admin.settingsTabs = SETTINGS_TABS;
  Admin.tabs = TABS;
  Admin.groupOf = (slug) => NAV_GROUPS.find((group) => group.items.includes(slug)) || NAV_GROUPS[0];
  Admin.tabOf = (slug) => TABS[slug] || TABS.dashboard;
})();
