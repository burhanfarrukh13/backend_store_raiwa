/* Baytak Noor Admin — shared UI helpers, icons and modals */
(() => {
  "use strict";

  window.Admin = window.Admin || {};

  const ICONS = {
    dashboard: '<rect width="7" height="9" x="3" y="3" rx="1"></rect><rect width="7" height="5" x="14" y="3" rx="1"></rect><rect width="7" height="9" x="14" y="12" rx="1"></rect><rect width="7" height="5" x="3" y="16" rx="1"></rect>',
    analytics: '<path d="M3 3v16a2 2 0 0 0 2 2h16"></path><path d="M18 17V9"></path><path d="M13 17V5"></path><path d="M8 17v-3"></path>',
    accounting: '<rect width="16" height="20" x="4" y="2" rx="2"></rect><line x1="8" x2="16" y1="6" y2="6"></line><line x1="16" x2="16" y1="14" y2="18"></line><path d="M16 10h.01"></path><path d="M12 10h.01"></path><path d="M8 10h.01"></path><path d="M12 14h.01"></path><path d="M8 14h.01"></path><path d="M12 18h.01"></path><path d="M8 18h.01"></path>',
    sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"></path><path d="M20 3v4"></path><path d="M22 5h-4"></path><path d="M4 17v2"></path><path d="M5 18H3"></path>',
    package: '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"></path><path d="M12 22V12"></path><path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7"></path><path d="m7.5 4.27 9 5.15"></path>',
    layers: '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"></path><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"></path><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"></path>',
    truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"></path><path d="M15 18H9"></path><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"></path><circle cx="17" cy="18" r="2"></circle><circle cx="7" cy="18" r="2"></circle>',
    category: '<path d="M20 10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 3h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z"></path><path d="M20 21a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2.9a1 1 0 0 1-.88-.55l-.42-.85a1 1 0 0 0-.92-.6H13a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z"></path><path d="M3 5a2 2 0 0 0 2 2h3"></path><path d="M3 3v13a2 2 0 0 0 2 2h3"></path>',
    media: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>',
    orders: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><path d="M3 6h18"></path><path d="M16 10a4 4 0 0 1-8 0"></path>',
    whatsapp: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>',
    coupons: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path><path d="M13 5v2"></path><path d="M13 17v2"></path><path d="M13 11v2"></path>',
    reviews: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>',
    waitlist: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
    blog: '<path d="M12 7v14"></path><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path>',
    pages: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path>',
    faq: '<circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><path d="M12 17h.01"></path>',
    redirects: '<path d="m16 3 4 4-4 4"></path><path d="M20 7H4"></path><path d="m8 21-4-4 4-4"></path><path d="M4 17h16"></path>',
    settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle>',
    phone: '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"></rect><path d="M12 18h.01"></path>',
    addons: '<path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z"></path>',
    staff: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
    archive: '<rect width="20" height="5" x="2" y="3" rx="1"></rect><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"></path><path d="M10 12h4"></path>',
    profile: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path>',
    chevron: '<path d="m9 18 6-6-6-6"></path>',
    chevronDown: '<path d="m6 9 6 6 6-6"></path>',
    arrowLeft: '<path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path>',
    arrowUp: '<path d="m5 12 7-7 7 7"></path><path d="M12 19V5"></path>',
    arrowDown: '<path d="M12 5v14"></path><path d="m19 12-7 7-7-7"></path>',
    plus: '<path d="M5 12h14"></path><path d="M12 5v14"></path>',
    refresh: '<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M16 16h5v5"></path>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" x2="12" y1="3" y2="15"></line>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line>',
    search: '<circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path>',
    edit: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path><path d="m15 5 4 4"></path>',
    trash: '<path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" x2="10" y1="11" y2="17"></line><line x1="14" x2="14" y1="11" y2="17"></line>',
    eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path><circle cx="12" cy="12" r="3"></circle>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>',
    check: '<path d="M20 6 9 17l-5-5"></path>',
    checkCircle: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><path d="m9 11 3 3L22 4"></path>',
    x: '<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>',
    xCircle: '<circle cx="12" cy="12" r="10"></circle><path d="m15 9-6 6"></path><path d="m9 9 6 6"></path>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"></path><path d="M22 2 11 13"></path>',
    alert: '<circle cx="12" cy="12" r="10"></circle><line x1="12" x2="12" y1="8" y2="12"></line><line x1="12" x2="12.01" y1="16" y2="16"></line>',
    filter: '<line x1="21" x2="14" y1="4" y2="4"></line><line x1="10" x2="3" y1="4" y2="4"></line><line x1="21" x2="12" y1="12" y2="12"></line><line x1="8" x2="3" y1="12" y2="12"></line><line x1="21" x2="16" y1="20" y2="20"></line><line x1="12" x2="3" y1="20" y2="20"></line><line x1="14" x2="14" y1="2" y2="6"></line><line x1="8" x2="8" y1="10" y2="14"></line><line x1="16" x2="16" y1="18" y2="22"></line>',
    more: '<circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle>',
    printer: '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"></path><rect width="12" height="8" x="6" y="14" rx="1"></rect>',
    externalLink: '<path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>',
    menu: '<line x1="4" x2="20" y1="12" y2="12"></line><line x1="4" x2="20" y1="6" y2="6"></line><line x1="4" x2="20" y1="18" y2="18"></line>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" x2="9" y1="12" y2="12"></line>',
    calendar: '<path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path>',
    creditCard: '<rect width="20" height="14" x="2" y="5" rx="2"></rect><line x1="2" x2="22" y1="10" y2="10"></line>',
    percent: '<line x1="19" x2="5" y1="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle>',
    tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"></path><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"></circle>',
    clock: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>',
    trending: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline>',
    wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"></path><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"></path>',
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>',
    megaphone: '<path d="m3 11 18-5v12L3 14v-3z"></path><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"></rect><path d="M12 8v13"></path><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"></path><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"></path>',
  };

  const esc = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const svg = (name, cls = "") =>
    `<svg class="icon${cls ? ` ${cls}` : ""}" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.package}</svg>`;

  const icon = svg;

  const moneyFmt = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 });
  const money = (value) => `Rs. ${moneyFmt.format(Math.round(Number(value) || 0))}`;
  const num = (value) => moneyFmt.format(Number(value) || 0);

  const dateShort = (iso) => {
    if (!iso) return "—";
    const d = new Date(String(iso).length <= 10 ? `${iso}T12:00:00` : iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const dateTime = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return `${dateShort(iso)}, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
  };

  const uid = (prefix = "id") =>
    `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;

  const deepClone = (value) => JSON.parse(JSON.stringify(value));

  const TONES = {
    active: "green", paid: "green", approved: "green", fulfilled: "green", sent: "green", delivered: "green",
    confirmed: "green", online: "green", enabled: "green", success: "green",
    pending: "amber", unpaid: "amber", unfulfilled: "amber", trial: "amber", low: "amber",
    draft: "gray", inactive: "gray", scheduled: "gray", archived: "gray", disabled: "gray",
    refunded: "red", returned: "red", cancelled: "red", failed: "red", expired: "red",
    unread: "blue", read: "gray", new: "blue",
  };

  const tone = (value) => TONES[String(value).toLowerCase()] || "gray";

  const badge = (text, explicitTone) =>
    `<span class="badge badge-${explicitTone || tone(text)}">${esc(text)}</span>`;

  const stars = (rating) =>
    `<span class="stars" aria-label="${rating} out of 5">${[1, 2, 3, 4, 5]
      .map((n) => `<span class="${n <= rating ? "on" : ""}">★</span>`)
      .join("")}</span>`;

  const toggle = (name, checked, label = "") =>
    `<label class="switch-row"><input type="checkbox" class="switch-input" name="${esc(name)}"${checked ? " checked" : ""}><span class="switch"><span></span></span>${label ? `<span class="switch-label">${label}</span>` : ""}</label>`;

  const placeholder = (label = "Image", color = "#ece5db") => {
    const safe = esc(label).slice(0, 26);
    const svgText = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="#f8f4ee"/></linearGradient></defs><rect width="640" height="480" fill="url(#g)"/><circle cx="320" cy="204" r="58" fill="none" stroke="#b9aa96" stroke-width="3"/><path d="M262 204h116M320 146v116" stroke="#b9aa96" stroke-width="3"/><text x="320" y="330" text-anchor="middle" font-family="Poppins, sans-serif" font-size="26" fill="#7b6b58">${safe}</text><text x="320" y="364" text-anchor="middle" font-family="Roboto, sans-serif" font-size="16" fill="#9c8b78">Baytak Noor</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
  };

  const initials = (name) =>
    String(name || "?")
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] || "")
      .join("")
      .toUpperCase();

  const debounce = (fn, ms = 180) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  };

  /* ---------------------------------------------------------------------
     Toasts and modals
     --------------------------------------------------------------------- */

  let toastTimer;

  function toast(message, type = "") {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = message;
    el.className = `toast${type ? ` toast-${type}` : ""}`;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
  }

  let modalEl = null;
  let lastFocused = null;

  function closeModal() {
    if (!modalEl) return;
    modalEl.remove();
    modalEl = null;
    if (!document.getElementById("drawer")?.classList.contains("open")) {
      document.body.classList.remove("no-scroll");
    }
    if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
    lastFocused = null;
  }

  function openModal({ title, body, footer = "", size = "md", onMount }) {
    closeModal();
    lastFocused = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal modal-${size}" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <div class="modal-head">
          <h2 id="modalTitle">${title}</h2>
          <button type="button" class="icon-btn" data-modal-close aria-label="Close">${svg("x")}</button>
        </div>
        <div class="modal-body">${body}</div>
        ${footer ? `<div class="modal-foot">${footer}</div>` : ""}
      </div>`;
    document.body.appendChild(overlay);
    document.body.classList.add("no-scroll");
    requestAnimationFrame(() => overlay.classList.add("open"));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.closest("[data-modal-close]")) closeModal();
    });
    modalEl = overlay;
    const api = {
      el: overlay,
      body: overlay.querySelector(".modal-body"),
      close: closeModal,
    };
    onMount?.(api);
    const focusable = overlay.querySelector("input, select, textarea, button");
    focusable?.focus();
    return api;
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });

  function confirm({ title = "Are you sure?", message = "", confirmLabel = "Confirm", danger = false, onConfirm }) {
    const api = openModal({
      title,
      size: "sm",
      body: `<p class="modal-text">${message}</p>`,
      footer: `<button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>
        <button type="button" class="btn ${danger ? "btn-danger" : "btn-primary"}" data-confirm-ok>${esc(confirmLabel)}</button>`,
    });
    api.el.querySelector("[data-confirm-ok]").addEventListener("click", () => {
      closeModal();
      onConfirm?.();
    });
  }

  function fieldHTML(field, values) {
    const value = values?.[field.name] ?? field.value ?? "";
    if (field.type === "html") return field.html || "";
    if (field.type === "checkbox") {
      return `<label class="field field-check ${field.full ? "full" : ""}">
        <input type="checkbox" name="${esc(field.name)}"${value ? " checked" : ""}>
        <span><strong>${esc(field.label)}</strong>${field.help ? `<span class="hint">${field.help}</span>` : ""}</span>
      </label>`;
    }
    const id = `f_${field.name}`;
    const common = `id="${id}" name="${esc(field.name)}"${field.required ? " required" : ""}${field.placeholder ? ` placeholder="${esc(field.placeholder)}"` : ""}`;
    let control = "";
    if (field.type === "textarea") {
      control = `<textarea class="input textarea" rows="${field.rows || 4}" ${common}>${esc(value)}</textarea>`;
    } else if (field.type === "select") {
      control = `<select class="select input" ${common}>${(field.options || [])
        .map((option) => {
          const opt = typeof option === "object" ? option : { value: option, label: option };
          return `<option value="${esc(opt.value)}"${String(opt.value) === String(value) ? " selected" : ""}>${esc(opt.label)}</option>`;
        })
        .join("")}</select>`;
    } else {
      control = `<input class="input" type="${field.type || "text"}" ${common} value="${esc(value)}"${
        field.min !== undefined ? ` min="${field.min}"` : ""
      }${field.max !== undefined ? ` max="${field.max}"` : ""}${field.step !== undefined ? ` step="${field.step}"` : ""}${
        field.type === "number" ? ' data-numeric="1"' : ""
      }>`;
    }
    return `<div class="field ${field.full ? "full" : ""}">
      <label for="${id}">${esc(field.label)}${field.required ? " *" : ""}</label>
      ${control}
      ${field.help ? `<span class="hint">${field.help}</span>` : ""}
    </div>`;
  }

  function formValues(form) {
    const values = {};
    new FormData(form).forEach((value, key) => {
      values[key] = value;
    });
    form.querySelectorAll('input[type="checkbox"][name]').forEach((input) => {
      values[input.name] = input.checked;
    });
    form.querySelectorAll("[data-numeric]").forEach((input) => {
      values[input.name] = Number(input.value) || 0;
    });
    return values;
  }

  function formModal({ title, fields = [], values = {}, submitLabel = "Save", onSubmit, size = "md", intro = "", body = "", onMount }) {
    const fieldsHTML = fields.map((field) => fieldHTML(field, values)).join("");
    const api = openModal({
      title,
      size,
      body: `${intro}${body || `<form id="modalForm" class="form-grid" novalidate>${fieldsHTML}</form>`}`,
      footer: `<button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>
        <button type="submit" class="btn btn-primary" form="modalForm">${esc(submitLabel)}</button>`,
      onMount(api) {
        const form = api.el.querySelector("#modalForm");
        form?.addEventListener("submit", (event) => {
          event.preventDefault();
          if (!form.reportValidity()) return;
          const result = onSubmit?.(formValues(form), form);
          if (result !== false) closeModal();
        });
        onMount?.(api, form);
      },
    });
    return api;
  }

  /* ---------------------------------------------------------------------
     Shared page pieces
     --------------------------------------------------------------------- */

  function pageHead({ group, title, subtitle, pill, actions = "" }) {
    return `<div class="main-inner">
      <a class="back-link" href="#/">${svg("arrowLeft")}<span>Dashboard</span></a>
      <div class="page-head">
        <div>
          <div class="eyebrow-row">
            <span class="page-group">${group}</span>
            ${pill ? `<span class="status-pill">${pill}</span>` : ""}
          </div>
          <h1>${title}</h1>
          <p>${subtitle}</p>
        </div>
        ${actions ? `<div class="page-actions">${actions}</div>` : ""}
      </div>
    `;
  }

  const emptyState = ({ icon: iconName = "package", title = "Nothing here yet", text = "", action = "" }) => `
    <div class="empty-state">
      <div class="empty-icon">${svg(iconName)}</div>
      <h2>${esc(title)}</h2>
      ${text ? `<p>${text}</p>` : ""}
      ${action ? `<div class="empty-action">${action}</div>` : ""}
    </div>`;

  function pageActions(actions) {
    return actions
      .map(
        (action) =>
          `<button type="button" class="btn btn-${action.variant || "secondary"}" data-act="${action.act}"${
            action.id ? ` data-id="${esc(action.id)}"` : ""
          }>${action.icon ? svg(action.icon) : ""}<span>${esc(action.label)}</span></button>`
      )
      .join("");
  }

  function exportCSV(filename, rows) {
    const csv = rows
      .map((row) =>
        row
          .map((cell) => {
            const value = String(cell ?? "");
            return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
          })
          .join(",")
      )
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Exported ${filename}`, "success");
  }

  async function copyText(text, label = "Copied to clipboard") {
    try {
      await navigator.clipboard.writeText(text);
      toast(label, "success");
    } catch {
      toast("Copy is blocked by the browser — select the text manually.", "error");
    }
  }

  const DEMO_TODAY = "2026-11-11";

  Admin.icons = ICONS;
  Admin.svg = svg;
  Admin.icon = icon;
  Admin.esc = esc;
  Admin.money = money;
  Admin.num = num;
  Admin.dateShort = dateShort;
  Admin.dateTime = dateTime;
  Admin.uid = uid;
  Admin.deepClone = deepClone;
  Admin.badge = badge;
  Admin.tone = tone;
  Admin.stars = stars;
  Admin.toggle = toggle;
  Admin.placeholder = placeholder;
  Admin.initials = initials;
  Admin.debounce = debounce;
  Admin.toast = toast;
  Admin.openModal = openModal;
  Admin.closeModal = closeModal;
  Admin.confirm = confirm;
  Admin.formModal = formModal;
  Admin.formValues = formValues;
  Admin.fieldHTML = fieldHTML;
  Admin.pageHead = pageHead;
  Admin.emptyState = emptyState;
  Admin.pageActions = pageActions;
  Admin.exportCSV = exportCSV;
  Admin.copyText = copyText;
  Admin.DEMO_TODAY = DEMO_TODAY;
  Admin.uiState = {};
})();
