/* Baytak Noor Admin — demo store data
   Every record here is fictional sample data for the interface clone. */
(() => {
  "use strict";

  window.Admin = window.Admin || {};

  const img = (label, color) => Admin.placeholder(label, color);

  const products = [
    {
      id: "p1", name: "Sateen Sheet Set — Ivory", sku: "BN-SAT-IVR", category: "Bed Sheets",
      supplier: "Lahore Textiles", price: 8990, compareAt: 10990, cost: 3980, stock: 34,
      status: "Active", description: "400-thread-count cotton sateen with a soft lustre and a deep fitted sheet.",
      image: img("Sateen · Ivory", "#e9dfd1"), createdAt: "2026-09-18",
      variants: [
        { id: "v11", size: "Queen", color: "Ivory", sku: "BN-SAT-IVR-Q", price: 8990, stock: 18 },
        { id: "v12", size: "King", color: "Ivory", sku: "BN-SAT-IVR-K", price: 9990, stock: 16 },
      ],
    },
    {
      id: "p2", name: "Percale Duvet Cover — Sage", sku: "BN-PER-SGE", category: "Duvet Covers",
      supplier: "Karachi Cotton Mills", price: 11990, compareAt: 13990, cost: 5240, stock: 21,
      status: "Active", description: "Crisp washed percale with coconut-shell buttons and a relaxed drape.",
      image: img("Percale · Sage", "#dfe5dc"), createdAt: "2026-09-22",
      variants: [
        { id: "v21", size: "Double", color: "Sage", sku: "BN-PER-SGE-D", price: 11990, stock: 9 },
        { id: "v22", size: "King", color: "Sage", sku: "BN-PER-SGE-K", price: 13490, stock: 12 },
      ],
    },
    {
      id: "p3", name: "Waffle Bedspread — Sand", sku: "BN-WAF-SND", category: "Bedspreads",
      supplier: "Faisalabad Weavers", price: 7490, compareAt: 8990, cost: 3180, stock: 12,
      status: "Active", description: "Textured cotton waffle weave, pre-washed for a soft hand feel.",
      image: img("Waffle · Sand", "#ece2d3"), createdAt: "2026-09-28",
      variants: [
        { id: "v31", size: "Single", color: "Sand", sku: "BN-WAF-SND-S", price: 6490, stock: 5 },
        { id: "v32", size: "Double", color: "Sand", sku: "BN-WAF-SND-D", price: 7490, stock: 7 },
      ],
    },
    {
      id: "p4", name: "Pillowcase Pair — White", sku: "BN-PIL-WHT", category: "Pillowcases",
      supplier: "Chenab Home", price: 2490, compareAt: 2990, cost: 820, stock: 78,
      status: "Active", description: "Two standard pillowcases in breathable long-staple cotton.",
      image: img("Pillowcase · White", "#f1ece4"), createdAt: "2026-10-02",
      variants: [
        { id: "v41", size: "Standard", color: "White", sku: "BN-PIL-WHT-S", price: 2490, stock: 48 },
        { id: "v42", size: "King", color: "White", sku: "BN-PIL-WHT-K", price: 2890, stock: 30 },
      ],
    },
    {
      id: "p5", name: "Linen Blend Sheet Set — Clay", sku: "BN-LIN-CLY", category: "Bed Sheets",
      supplier: "Indus Linens", price: 10990, compareAt: 0, cost: 4980, stock: 0,
      status: "Draft", description: "A linen-cotton blend in a warm clay tone. Awaiting the next production run.",
      image: img("Linen · Clay", "#e6d7cc"), createdAt: "2026-10-14",
      variants: [
        { id: "v51", size: "Queen", color: "Clay", sku: "BN-LIN-CLY-Q", price: 10990, stock: 0 },
        { id: "v52", size: "King", color: "Clay", sku: "BN-LIN-CLY-K", price: 12490, stock: 0 },
      ],
    },
    {
      id: "p6", name: "Cotton Mattress Protector", sku: "BN-MAT-COT", category: "Mattress Protectors",
      supplier: "Lahore Textiles", price: 6490, compareAt: 0, cost: 2740, stock: 12,
      status: "Active", description: "Quilted cotton surface with a quiet, waterproof backing.",
      image: img("Protector · Cotton", "#ebe7de"), createdAt: "2026-10-19",
      variants: [
        { id: "v61", size: "Single", color: "White", sku: "BN-MAT-COT-S", price: 5490, stock: 3 },
        { id: "v62", size: "Double", color: "White", sku: "BN-MAT-COT-D", price: 6490, stock: 4 },
        { id: "v63", size: "Queen", color: "White", sku: "BN-MAT-COT-Q", price: 6990, stock: 5 },
      ],
    },
    {
      id: "p7", name: "Heritage Bedspread — Olive", sku: "BN-HER-OLV", category: "Bedspreads",
      supplier: "Faisalabad Weavers", price: 15990, compareAt: 18990, cost: 7200, stock: 6,
      status: "Draft", description: "Hand-finished jacquard bedspread with a cotton fringe.",
      image: img("Heritage · Olive", "#e2e4d8"), createdAt: "2026-10-24",
      variants: [
        { id: "v71", size: "Single", color: "Olive", sku: "BN-HER-OLV-S", price: 14990, stock: 2 },
        { id: "v72", size: "Double", color: "Olive", sku: "BN-HER-OLV-D", price: 15990, stock: 4 },
      ],
    },
  ];

  const findProduct = (id) => products.find((product) => product.id === id);
  const line = (id, qty) => {
    const product = findProduct(id);
    return { productId: id, name: product.name, qty, price: product.price, cost: product.cost };
  };
  const customer = (name, email, phone, city, address) => ({ name, email, phone, city, address });
  const order = (id, number, date, person, items, overrides = {}) => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const shipping = overrides.shipping ?? 0;
    const discount = overrides.discount ?? 0;
    return {
      id, number, date, customer: person, items, subtotal, shipping, discount,
      total: subtotal + shipping - discount, payment: "PAID", fulfillment: "UNFULFILLED",
      courier: "PostEx", tracking: "", channel: "Direct / Organic", notes: "",
      ...overrides,
    };
  };

  const ayesha = customer("Ayesha Khan", "ayesha.khan@example.com", "+92 300 1112223", "Lahore", "House 14, Gulberg III, Lahore");
  const bilal = customer("Bilal Ahmed", "bilal.ahmed@example.com", "+92 321 2223334", "Karachi", "Flat 7B, Clifton Block 5, Karachi");
  const zara = customer("Zara Malik", "zara.malik@example.com", "+92 333 3334445", "Islamabad", "House 22, F-7/2, Islamabad");
  const hamza = customer("Hamza Sheikh", "hamza.sheikh@example.com", "+92 345 4445556", "Rawalpindi", "Street 9, Bahria Town Phase 4, Rawalpindi");
  const fatima = customer("Fatima Noor", "fatima.noor@example.com", "+92 301 5556667", "Faisalabad", "P-18, D Ground, Faisalabad");
  const usman = customer("Usman Raza", "usman.raza@example.com", "+92 302 6667778", "Multan", "House 5, Cantt, Multan");
  const mahnoor = customer("Mahnoor Ali", "mahnoor.ali@example.com", "+92 313 7778889", "Peshawar", "House 31, Hayatabad Phase 2, Peshawar");
  const ali = customer("Ali Hassan", "ali.hassan@example.com", "+92 334 8889990", "Quetta", "Apartment 3, Jinnah Road, Quetta");

  const orders = [
    order("o1", "BN-1042", "2026-11-11T10:24:00", ayesha, [line("p1", 1), line("p4", 1)], {
      shipping: 250, courier: "PostEx", tracking: "PX-8842114", fulfillment: "FULFILLED", channel: "Google Search / Ads",
      notes: "Please call before delivery.",
    }),
    order("o2", "BN-1043", "2026-11-10T16:05:00", bilal, [line("p2", 1)], {
      payment: "UNPAID", shipping: 250, channel: "Facebook", courier: "TCS",
    }),
    order("o3", "BN-1044", "2026-11-10T09:42:00", zara, [line("p3", 1), line("p4", 2)], {
      shipping: 250, fulfillment: "FULFILLED", courier: "TCS", tracking: "TCS-5521903", channel: "Direct / Organic",
    }),
    order("o4", "BN-1045", "2026-11-09T14:18:00", hamza, [line("p6", 1)], {
      shipping: 250, courier: "Leopards", channel: "Instagram",
    }),
    order("o5", "BN-1046", "2026-11-08T18:36:00", fatima, [line("p1", 1), line("p3", 1)], {
      payment: "UNPAID", shipping: 250, channel: "Email", discount: 500,
    }),
    order("o6", "BN-1047", "2026-11-07T11:12:00", ayesha, [line("p2", 1), line("p4", 1)], {
      shipping: 0, fulfillment: "FULFILLED", courier: "PostEx", tracking: "PX-8839012", channel: "Direct / Organic",
    }),
    order("o7", "BN-1048", "2026-11-06T17:50:00", usman, [line("p3", 1)], {
      fulfillment: "RETURNED", payment: "REFUNDED", shipping: 250, courier: "PostEx", tracking: "PX-8834770", channel: "Google Search / Ads",
      notes: "Customer reported a colour difference.",
    }),
    order("o8", "BN-1049", "2026-11-05T13:07:00", mahnoor, [line("p4", 2), line("p6", 1)], {
      shipping: 250, fulfillment: "FULFILLED", courier: "Leopards", tracking: "LP-2298411", channel: "Instagram",
    }),
    order("o9", "BN-1050", "2026-11-04T20:31:00", ali, [line("p1", 1)], {
      payment: "UNPAID", shipping: 250, channel: "Facebook",
    }),
    order("o10", "BN-1051", "2026-11-03T10:02:00", ayesha, [line("p1", 1), line("p6", 1)], {
      shipping: 0, fulfillment: "FULFILLED", courier: "PostEx", tracking: "PX-8821556", channel: "Email", discount: 800,
    }),
    order("o11", "BN-1052", "2026-11-02T15:44:00", bilal, [line("p2", 1), line("p3", 1)], {
      payment: "REFUNDED", fulfillment: "RETURNED", shipping: 250, courier: "TCS", tracking: "TCS-5510288", channel: "Google Search / Ads",
    }),
    order("o12", "BN-1053", "2026-11-01T12:21:00", zara, [line("p4", 3)], {
      shipping: 250, fulfillment: "FULFILLED", courier: "PostEx", tracking: "PX-8819002", channel: "Direct / Organic",
    }),
  ];

  const emails = [
    { id: "e1", to: "ayesha.khan@example.com", subject: "Order BN-1042 confirmed", template: "Order confirmation", status: "Sent", date: "2026-11-11T10:25:00", error: "", body: "Thank you for your order. We will let you know as soon as it ships." },
    { id: "e2", to: "bilal.ahmed@example.com", subject: "Order BN-1043 confirmed", template: "Order confirmation", status: "Sent", date: "2026-11-10T16:06:00", error: "", body: "Your order has been received. Payment is still pending." },
    { id: "e3", to: "zara.malik@example.com", subject: "Your parcel is on the way", template: "Shipping update", status: "Sent", date: "2026-11-10T13:10:00", error: "", body: "Your parcel has been handed to TCS. Tracking: TCS-5521903." },
    { id: "e4", to: "hamza.sheikh@example.com", subject: "Order BN-1045 confirmed", template: "Order confirmation", status: "Failed", date: "2026-11-09T14:19:00", error: "Mailbox unavailable", body: "Your order has been received." },
    { id: "e5", to: "fatima.noor@example.com", subject: "Order BN-1046 confirmed", template: "Order confirmation", status: "Not sent (email not set up)", date: "2026-11-08T18:37:00", error: "Sender identity missing", body: "Your order has been received." },
    { id: "e6", to: "mahnoor.ali@example.com", subject: "Your parcel is on the way", template: "Shipping update", status: "Sent", date: "2026-11-05T16:20:00", error: "", body: "Your parcel has been handed to Leopards. Tracking: LP-2298411." },
    { id: "e7", to: "ayesha.khan@example.com", subject: "Your parcel is on the way", template: "Shipping update", status: "Sent", date: "2026-11-03T12:00:00", error: "", body: "Your parcel has been handed to PostEx. Tracking: PX-8821556." },
  ];

  const coupons = [
    { id: "c1", code: "WELCOME10", type: "percent", value: 10, minOrder: 5000, usageLimit: 200, used: 64, expiresAt: "2026-12-31", status: "active", description: "First-order welcome offer" },
    { id: "c2", code: "LINEN500", type: "fixed", value: 500, minOrder: 8000, usageLimit: 100, used: 22, expiresAt: "2026-11-30", status: "active", description: "Fixed saving on linen sets" },
    { id: "c3", code: "WINTER15", type: "percent", value: 15, minOrder: 12000, usageLimit: 150, used: 9, expiresAt: "2026-12-15", status: "inactive", description: "Winter campaign" },
    { id: "c4", code: "EIDSALE", type: "percent", value: 20, minOrder: 10000, usageLimit: 300, used: 188, expiresAt: "2026-09-30", status: "expired", description: "Eid promotion" },
    { id: "c5", code: "SHEETS250", type: "fixed", value: 250, minOrder: 0, usageLimit: 0, used: 31, expiresAt: "2027-01-15", status: "active", description: "Always-on sheet offer" },
  ];

  const reviews = [
    { id: "r1", productId: "p1", customer: "Ayesha K.", email: "ayesha.khan@example.com", rating: 5, title: "Beautifully soft", body: "The sateen feels cool and smooth, and the ivory colour looks exactly like the photos.", status: "approved", date: "2026-11-09", hasPhoto: true },
    { id: "r2", productId: "p2", customer: "Bilal A.", email: "bilal.ahmed@example.com", rating: 4, title: "Good weight", body: "Lovely percale. I would have liked a slightly deeper fitted sheet, but the quality is excellent.", status: "pending", date: "2026-11-10", hasPhoto: false },
    { id: "r3", productId: "p3", customer: "Zara M.", email: "zara.malik@example.com", rating: 5, title: "Perfect for winter", body: "Cosy without being heavy. The sand tone warms up the whole room.", status: "approved", date: "2026-11-08", hasPhoto: true },
    { id: "r4", productId: "p4", customer: "Hamza S.", email: "hamza.sheikh@example.com", rating: 3, title: "Decent, but thin", body: "Soft pillowcases, though I expected a slightly heavier cotton for the price.", status: "pending", date: "2026-11-07", hasPhoto: false },
    { id: "r5", productId: "p1", customer: "Fatima N.", email: "fatima.noor@example.com", rating: 5, title: "Gift-worthy", body: "Bought this for my sister. The packaging and stitching both felt premium.", status: "approved", date: "2026-11-06", hasPhoto: false },
    { id: "r6", productId: "p6", customer: "Usman R.", email: "usman.raza@example.com", rating: 2, title: "Arrived creased", body: "The protector works, but it arrived quite creased and took a day to settle.", status: "pending", date: "2026-11-05", hasPhoto: true },
    { id: "r7", productId: "p2", customer: "Mahnoor A.", email: "mahnoor.ali@example.com", rating: 5, title: "Washed beautifully", body: "Second wash and it still feels crisp. The sage is a very calm colour.", status: "approved", date: "2026-11-04", hasPhoto: false },
  ];

  const waitlist = [
    { id: "w1", email: "sana.iqbal@example.com", phone: "+92 300 9001111", productId: "p5", productName: "Linen Blend Sheet Set — Clay", date: "2026-11-09", restockDate: "2026-11-24", notified: false },
    { id: "w2", email: "danish.q@example.com", phone: "+92 321 9002222", productId: "p5", productName: "Linen Blend Sheet Set — Clay", date: "2026-11-08", restockDate: "2026-11-24", notified: false },
    { id: "w3", email: "hira.s@example.com", phone: "+92 333 9003333", productId: "p5", productName: "Linen Blend Sheet Set — Clay", date: "2026-11-06", restockDate: "2026-11-24", notified: false },
    { id: "w4", email: "omar.f@example.com", phone: "+92 345 9004444", productId: "p7", productName: "Heritage Bedspread — Olive", date: "2026-11-05", restockDate: "2026-12-02", notified: false },
    { id: "w5", email: "nadia.h@example.com", phone: "+92 301 9005555", productId: "p7", productName: "Heritage Bedspread — Olive", date: "2026-11-03", restockDate: "2026-12-02", notified: false },
    { id: "w6", email: "saad.m@example.com", phone: "+92 302 9006666", productId: "p5", productName: "Linen Blend Sheet Set — Clay", date: "2026-11-01", restockDate: "2026-11-24", notified: false },
  ];

  const blog = [
    { id: "b1", title: "How to care for cotton sateen", slug: "care-for-cotton-sateen", category: "Care Guides", author: "Amina Rauf", status: "Published", date: "2026-11-06", views: 842, excerpt: "A simple wash-and-dry routine that keeps the lustre and softness of sateen for years.", body: "Wash at 30°C on a gentle cycle, use a mild detergent, and line dry in the shade. A warm iron on the reverse side restores the surface." },
    { id: "b2", title: "Choosing the right duvet weight", slug: "choosing-duvet-weight", category: "Guides", author: "Amina Rauf", status: "Published", date: "2026-10-28", views: 611, excerpt: "A practical guide to GSM, fill power and the seasons of Pakistani weather.", body: "For most of the year a lightweight 200 GSM duvet is enough. Keep a warmer layer for December and January." },
    { id: "b3", title: "The story behind our clay collection", slug: "clay-collection-story", category: "Brand Stories", author: "Sana Iqbal", status: "Draft", date: "2026-10-19", views: 0, excerpt: "Why we spent eighteen months developing a warm, earthy linen blend.", body: "The clay tone started with a hand-dyed swatch from a small mill outside Faisalabad." },
    { id: "b4", title: "Five ways to layer a bed", slug: "five-ways-to-layer-a-bed", category: "Styling", author: "Mahnoor Ali", status: "Published", date: "2026-10-10", views: 1203, excerpt: "From a simple two-layer look to a full hotel-style stack, here is how to build a bed you want to fall into.", body: "Start with a crisp sheet, add a textured bedspread, then finish with two pillows in contrasting tones." },
  ];

  const pages = [
    { id: "pg1", title: "About Baytak Noor", slug: "about", status: "Published", updatedAt: "2026-10-12", body: "Baytak Noor is a small Lahore studio making quietly luxurious bed linen for everyday rest." },
    { id: "pg2", title: "Shipping & Returns", slug: "shipping-returns", status: "Published", updatedAt: "2026-10-08", body: "Nationwide delivery in 2–4 working days. Unused items can be returned within 14 days." },
    { id: "pg3", title: "Privacy Policy", slug: "privacy-policy", status: "Published", updatedAt: "2026-09-30", body: "We only collect the information needed to fulfil your order and improve your experience." },
    { id: "pg4", title: "Terms of Service", slug: "terms", status: "Draft", updatedAt: "2026-09-27", body: "The terms that apply when you place an order with our store." },
    { id: "pg5", title: "Size Guide", slug: "size-guide", status: "Published", updatedAt: "2026-09-20", body: "A simple table of our sheet, duvet and pillowcase dimensions." },
  ];

  const faqs = [
    { id: "f1", question: "How long does delivery take?", answer: "Orders are dispatched within 24 hours and typically arrive in 2–4 working days.", category: "Shipping", status: "Published", sort: 1 },
    { id: "f2", question: "Do you offer cash on delivery?", answer: "Yes, cash on delivery is available across Pakistan. A small COD fee applies.", category: "Payments", status: "Published", sort: 2 },
    { id: "f3", question: "What is your return policy?", answer: "Unused items in their original packaging can be returned within 14 days of delivery.", category: "Returns", status: "Published", sort: 3 },
    { id: "f4", question: "How do I choose the right size?", answer: "Check the Size Guide page, or message us with your mattress dimensions and we will help.", category: "Sizing", status: "Published", sort: 4 },
    { id: "f5", question: "Can I change my order after placing it?", answer: "Message us on WhatsApp within two hours and we will do our best to update it.", category: "Orders", status: "Published", sort: 5 },
    { id: "f6", question: "Are your fabrics pre-shrunk?", answer: "Most of our cotton styles are pre-washed. Slight shrinkage is normal on the first wash.", category: "Care", status: "Draft", sort: 6 },
    { id: "f7", question: "Do you ship internationally?", answer: "We currently ship within Pakistan. International shipping is being explored.", category: "Shipping", status: "Published", sort: 7 },
    { id: "f8", question: "How should I wash my sheets?", answer: "Use a gentle 30°C cycle, avoid bleach, and line dry in the shade.", category: "Care", status: "Published", sort: 8 },
  ];

  const redirects = [
    { id: "rd1", from: "/bedsheets", to: "/collections/bed-sheets", type: "301 (Permanent)", status: "Active", hits: 1420, createdAt: "2026-10-02" },
    { id: "rd2", from: "/old-about", to: "/pages/about", type: "301 (Permanent)", status: "Active", hits: 312, createdAt: "2026-09-22" },
    { id: "rd3", from: "/winter-sale", to: "/collections/winter-edit", type: "302 (Temporary)", status: "Active", hits: 884, createdAt: "2026-10-18" },
    { id: "rd4", from: "/duvets", to: "/collections/duvet-covers", type: "301 (Permanent)", status: "Disabled", hits: 96, createdAt: "2026-08-30" },
    { id: "rd5", from: "/contact-us", to: "/pages/contact", type: "301 (Permanent)", status: "Active", hits: 540, createdAt: "2026-09-11" },
    { id: "rd6", from: "/eid-offer", to: "/collections/best-sellers", type: "302 (Temporary)", status: "Active", hits: 2031, createdAt: "2026-09-15" },
  ];

  const subscribers = [
    { id: "n1", email: "ayesha.khan@example.com", name: "Ayesha Khan", status: "active", source: "Footer", joinedAt: "2026-10-30" },
    { id: "n2", email: "bilal.ahmed@example.com", name: "Bilal Ahmed", status: "active", source: "Checkout", joinedAt: "2026-10-27" },
    { id: "n3", email: "zara.malik@example.com", name: "Zara Malik", status: "active", source: "Popup", joinedAt: "2026-10-24" },
    { id: "n4", email: "hamza.sheikh@example.com", name: "Hamza Sheikh", status: "inactive", source: "Footer", joinedAt: "2026-09-18" },
    { id: "n5", email: "fatima.noor@example.com", name: "Fatima Noor", status: "active", source: "Checkout", joinedAt: "2026-10-19" },
    { id: "n6", email: "usman.raza@example.com", name: "Usman Raza", status: "active", source: "Popup", joinedAt: "2026-10-14" },
    { id: "n7", email: "mahnoor.ali@example.com", name: "Mahnoor Ali", status: "inactive", source: "Footer", joinedAt: "2026-08-30" },
    { id: "n8", email: "ali.hassan@example.com", name: "Ali Hassan", status: "active", source: "Footer", joinedAt: "2026-10-08" },
    { id: "n9", email: "sana.iqbal@example.com", name: "Sana Iqbal", status: "active", source: "Checkout", joinedAt: "2026-10-02" },
    { id: "n10", email: "danish.q@example.com", name: "Danish Qureshi", status: "inactive", source: "Popup", joinedAt: "2026-09-12" },
  ];

  const inquiries = [
    { id: "i1", name: "Ayesha Khan", email: "ayesha.khan@example.com", phone: "+92 300 1112223", subject: "King size availability", message: "Do you have the sateen set in a king size with a deep fitted sheet?", date: "2026-11-11T09:10:00", status: "unread", reply: "" },
    { id: "i2", name: "Bilal Ahmed", email: "bilal.ahmed@example.com", phone: "+92 321 2223334", subject: "Order BN-1043 payment", message: "I tried to pay by card but the checkout did not accept it. Can I pay by bank transfer?", date: "2026-11-10T18:22:00", status: "unread", reply: "" },
    { id: "i3", name: "Zara Malik", email: "zara.malik@example.com", phone: "+92 333 3334445", subject: "Colour question", message: "Is the sage duvet closer to grey or green in daylight?", date: "2026-11-09T14:05:00", status: "read", reply: "It is a soft, muted green with a grey undertone." },
    { id: "i4", name: "Hamza Sheikh", email: "hamza.sheikh@example.com", phone: "+92 345 4445556", subject: "Bulk order", message: "We need twelve mattress protectors for a guest house. Do you offer a bulk price?", date: "2026-11-08T11:42:00", status: "unread", reply: "" },
    { id: "i5", name: "Fatima Noor", email: "fatima.noor@example.com", phone: "+92 301 5556667", subject: "Return request", message: "I would like to return one pillowcase pair from order BN-1046.", date: "2026-11-07T16:30:00", status: "read", reply: "We have sent you a return label and pickup details." },
    { id: "i6", name: "Ali Hassan", email: "ali.hassan@example.com", phone: "+92 334 8889990", subject: "Delivery to Quetta", message: "How long does delivery to Quetta usually take?", date: "2026-11-05T10:12:00", status: "read", reply: "Usually three to four working days." },
  ];

  const staff = [
    { id: "st1", name: "Baytak Noor Admin", email: "admin@baytaknoor.demo", role: "Owner / Admin", status: "Active", lastActive: "2026-11-11T10:40:00" },
    { id: "st2", name: "Amina Rauf", email: "amina@baytaknoor.demo", role: "Manager", status: "Active", lastActive: "2026-11-11T09:18:00" },
    { id: "st3", name: "Sana Iqbal", email: "sana@baytaknoor.demo", role: "Support", status: "Active", lastActive: "2026-11-10T17:55:00" },
    { id: "st4", name: "Danish Qureshi", email: "danish@baytaknoor.demo", role: "Accountant", status: "Invited", lastActive: "" },
  ];

  const whatsapp = [
    {
      id: "wa1", orderId: "o1", customer: "Ayesha Khan", phone: "+92 300 1112223", needsReply: false, confirmed: true,
      messages: [
        { id: "m1", from: "store", text: "Assalam o Alaikum Ayesha! Your order BN-1042 is confirmed. We will dispatch it today.", time: "2026-11-11T10:26:00" },
        { id: "m2", from: "customer", text: "Thank you! Please call before delivery.", time: "2026-11-11T10:31:00" },
        { id: "m3", from: "store", text: "Noted — we have added that instruction for the courier.", time: "2026-11-11T10:33:00" },
      ],
    },
    {
      id: "wa2", orderId: "o2", customer: "Bilal Ahmed", phone: "+92 321 2223334", needsReply: true, confirmed: false,
      messages: [
        { id: "m4", from: "store", text: "Hello Bilal, your order BN-1043 is reserved. Payment is still pending.", time: "2026-11-10T16:07:00" },
        { id: "m5", from: "customer", text: "Can I pay by bank transfer?", time: "2026-11-10T18:20:00" },
      ],
    },
    {
      id: "wa3", orderId: "o4", customer: "Hamza Sheikh", phone: "+92 345 4445556", needsReply: true, confirmed: false,
      messages: [
        { id: "m6", from: "store", text: "Your order BN-1045 has been packed and will be collected by Leopards today.", time: "2026-11-09T15:00:00" },
        { id: "m7", from: "customer", text: "Perfect, thank you. Do you have the tracking number yet?", time: "2026-11-09T15:22:00" },
      ],
    },
    {
      id: "wa4", orderId: "o6", customer: "Ayesha Khan", phone: "+92 300 1112223", needsReply: false, confirmed: true,
      messages: [
        { id: "m8", from: "store", text: "Your order BN-1047 is on its way. Tracking: PX-8839012.", time: "2026-11-07T12:05:00" },
        { id: "m9", from: "customer", text: "Received, thank you!", time: "2026-11-07T12:09:00" },
      ],
    },
    {
      id: "wa5", orderId: "o9", customer: "Ali Hassan", phone: "+92 334 8889990", needsReply: true, confirmed: false,
      messages: [
        { id: "m10", from: "store", text: "Hello Ali, we have your order BN-1050 reserved. Shall we confirm it?", time: "2026-11-04T20:32:00" },
      ],
    },
  ];

  const expenses = [
    { id: "x1", label: "Studio & office rent", category: "Running costs", amount: 8000, date: "2026-11-01", notes: "Monthly rent" },
    { id: "x2", label: "Team salaries", category: "Running costs", amount: 12000, date: "2026-11-01", notes: "Part-time team" },
    { id: "x3", label: "Packaging & inserts", category: "Packaging", amount: 3500, date: "2026-11-04", notes: "Mailer boxes and tissue" },
    { id: "x4", label: "Electricity & internet", category: "Running costs", amount: 2500, date: "2026-11-05", notes: "October bills" },
    { id: "x5", label: "Photography retainer", category: "Marketing", amount: 2000, date: "2026-11-06", notes: "November shoot" },
  ];

  const marketing = [
    { id: "mkt1", channel: "Meta Ads", campaign: "Winter bedding", amount: 3200, date: "2026-11-07", orders: 2, revenue: 26970 },
    { id: "mkt2", channel: "Google Ads", campaign: "Brand search", amount: 3000, date: "2026-11-08", orders: 3, revenue: 41960 },
    { id: "mkt3", channel: "Instagram boost", campaign: "Sage duvet launch", amount: 1800, date: "2026-11-09", orders: 2, revenue: 18960 },
  ];

  const courierPayments = [
    { id: "cp1", courier: "PostEx", parcels: 4, collected: 6671, fees: 720, status: "Unpaid", dueDate: "2026-11-06" },
    { id: "cp2", courier: "TCS", parcels: 2, collected: 14390, fees: 610, status: "Paid", dueDate: "2026-11-04" },
    { id: "cp3", courier: "Leopards", parcels: 1, collected: 6740, fees: 280, status: "Unpaid", dueDate: "2026-11-09" },
  ];

  const setupSteps = [
    { id: "s1", label: "Set the store currency and country", done: true },
    { id: "s2", label: "Add courier accounts", done: true },
    { id: "s3", label: "Add cost prices for every product", done: false },
    { id: "s4", label: "Record monthly running costs", done: true },
    { id: "s5", label: "Connect ad accounts", done: false },
    { id: "s6", label: "Invite your accountant", done: false },
  ];

  const archive = [
    { id: "a1", collection: "coupons", label: "SPRING20", entity: "Coupon", deletedAt: "2026-10-28T14:12:00", payload: { id: "old_c1", code: "SPRING20", type: "percent", value: 20, minOrder: 8000, usageLimit: 100, used: 41, expiresAt: "2026-09-30", status: "expired", description: "Spring promotion" } },
    { id: "a2", collection: "products", label: "Linen Pillow Shams", entity: "Product", deletedAt: "2026-10-24T10:05:00", payload: { id: "old_p1", name: "Linen Pillow Shams", sku: "BN-SHM-LIN", category: "Pillowcases", supplier: "Indus Linens", price: 3790, compareAt: 0, cost: 1500, stock: 0, status: "Archived", description: "Discontinued shams.", variants: [] } },
    { id: "a3", collection: "pages", label: "Care Guide", entity: "Page", deletedAt: "2026-10-20T16:44:00", payload: { id: "old_pg1", title: "Care Guide", slug: "care-guide", status: "Draft", updatedAt: "2026-10-20", body: "A retired care guide." } },
    { id: "a4", collection: "parts", label: "King / Clay variant", entity: "Removed variant", deletedAt: "2026-10-18T09:30:00", payload: { id: "old_v1", productId: "p5", productName: "Linen Blend Sheet Set — Clay", size: "King", color: "Clay", sku: "BN-LIN-CLY-K", price: 12490, stock: 0 } },
  ];

  Admin.seed = {
    products,
    suppliers: [
      { id: "sp1", name: "Lahore Textiles", phone: "+92 300 7001001", notes: "Sateen and quilted protectors. 7-day lead time.", products: 2 },
      { id: "sp2", name: "Karachi Cotton Mills", phone: "+92 321 7002002", notes: "Percale specialist. Minimum order 40 sets.", products: 1 },
      { id: "sp3", name: "Faisalabad Weavers", phone: "+92 333 7003003", notes: "Waffle and jacquard bedspreads.", products: 2 },
      { id: "sp4", name: "Chenab Home", phone: "+92 345 7004004", notes: "Pillowcases and small textiles.", products: 1 },
      { id: "sp5", name: "Indus Linens", phone: "+92 301 7005005", notes: "Linen blends. New production runs monthly.", products: 1 },
    ],
    categories: [
      { id: "cat1", name: "Bed Sheets", slug: "bed-sheets", parent: "", status: "Active", description: "Sheet sets and separates" },
      { id: "cat2", name: "Duvet Covers", slug: "duvet-covers", parent: "", status: "Active", description: "Percale and sateen duvet covers" },
      { id: "cat3", name: "Pillowcases", slug: "pillowcases", parent: "", status: "Active", description: "Standard and king pillowcase pairs" },
      { id: "cat4", name: "Bedspreads", slug: "bedspreads", parent: "", status: "Active", description: "Waffle and heritage bedspreads" },
      { id: "cat5", name: "Mattress Protectors", slug: "mattress-protectors", parent: "", status: "Active", description: "Quilted cotton protectors" },
      { id: "cat6", name: "New Arrivals", slug: "new-arrivals", parent: "", status: "Active", description: "Latest additions" },
    ],
    collections: [
      { id: "col1", name: "Best Sellers", type: "Manual", status: "Active", rule: "Hand-picked", products: 4, description: "The styles customers return for." },
      { id: "col2", name: "Winter Edit", type: "Smart", status: "Active", rule: "Colour contains Ivory or Sand", products: 3, description: "Warm neutrals for the season." },
      { id: "col3", name: "Under Rs. 10,000", type: "Smart", status: "Active", rule: "Price is less than 10000", products: 4, description: "Everyday pieces at an easy price." },
      { id: "col4", name: "New Arrivals", type: "Manual", status: "Draft", rule: "Hand-picked", products: 2, description: "New season preview." },
    ],
    media: [
      { id: "md1", name: "sateen-ivory-hero", url: img("Sateen · Ivory", "#e9dfd1"), alt: "Ivory sateen sheet set styled on a bed", size: "184 KB", uploadedAt: "2026-10-30" },
      { id: "md2", name: "percales-sage-detail", url: img("Percale · Sage", "#dfe5dc"), alt: "Close-up of sage percale cotton", size: "142 KB", uploadedAt: "2026-10-29" },
      { id: "md3", name: "waffle-sand-fold", url: img("Waffle · Sand", "#ece2d3"), alt: "Folded sand waffle bedspread", size: "206 KB", uploadedAt: "2026-10-26" },
      { id: "md4", name: "pillowcase-white-stack", url: img("Pillowcase · White", "#f1ece4"), alt: "Stack of white pillowcases", size: "98 KB", uploadedAt: "2026-10-22" },
      { id: "md5", name: "heritage-olive-room", url: img("Heritage · Olive", "#e2e4d8"), alt: "Olive heritage bedspread in a styled room", size: "228 KB", uploadedAt: "2026-10-19" },
      { id: "md6", name: "studio-linen-clay", url: img("Linen · Clay", "#e6d7cc"), alt: "Clay linen sheet set in the studio", size: "174 KB", uploadedAt: "2026-10-14" },
    ],
    orders,
    emails,
    coupons,
    reviews,
    waitlist,
    blog,
    pages,
    faqs,
    redirects,
    subscribers,
    inquiries,
    staff,
    whatsapp,
    archive,
    expenses,
    marketing,
    courierPayments,
    setupSteps,
    ai: {
      privacy: false,
      apps: [
        { id: "ai1", name: "Claude Desktop", provider: "Claude", level: "Read only", connectedAt: "2026-11-02" },
        { id: "ai2", name: "ChatGPT", provider: "ChatGPT", level: "Propose changes", connectedAt: "2026-10-27" },
      ],
      areas: { products: true, prices: true, coupons: true, orders: true, homepage: true, accounting: false, messages: false },
    },
    addons: [
      { id: "ad1", name: "Accounting & Ledger", icon: "accounting", status: "trial", trialDays: 10, monthly: 2499, yearly: 24990, description: "True profit after product costs, delivery, ads and running costs.", features: ["Profit & loss", "Expenses & bills", "Courier COD tracking", "Tax reports"] },
      { id: "ad2", name: "Abandoned Cart Recovery", icon: "orders", status: "inactive", trialDays: 14, monthly: 1499, yearly: 14990, description: "Recover checkout drop-offs with timed WhatsApp and email reminders.", features: ["Recovery emails", "WhatsApp reminders", "Recovered revenue report"] },
      { id: "ad3", name: "Loyalty & Rewards", icon: "gift", status: "inactive", trialDays: 14, monthly: 1999, yearly: 19990, description: "Points, referrals and early access for returning customers.", features: ["Points ledger", "Referral codes", "VIP tiers"] },
      { id: "ad4", name: "Advanced Reports", icon: "analytics", status: "active", trialDays: 0, monthly: 999, yearly: 9990, description: "Cohorts, channel attribution, product profitability and exports.", features: ["Cohort analysis", "Product margins", "Scheduled exports"] },
    ],
    devices: [
      { id: "dv1", name: "This computer", type: "Desktop · Chrome", lastSeen: "2026-11-11T10:40:00", current: true },
      { id: "dv2", name: "iPhone 14", type: "Phone · Safari", lastSeen: "2026-11-10T21:12:00", current: false },
    ],
    notifications: true,
    profile: {
      name: "Baytak Noor Admin",
      email: "admin@baytaknoor.demo",
      role: "ADMIN",
      memberSince: "2026-09-11",
      lastSignIn: "2026-11-11T09:42:00",
      password: "admin1234",
    },
    settings: {
      storeName: "Baytak Noor",
      tagline: "Luxury bed linen, woven for everyday rest.",
      currency: "PKR - Pakistani Rupee (Rs.)",
      country: "Pakistan",
      logo: "assets/logo.png",
      favicon: "",
      email: "hello@baytaknoor.demo",
      phone: "+92 300 0000000",
      whatsapp: "+92 300 0000000",
      address: "Studio 4, Gulberg III, Lahore, Pakistan",
      theme: { primary: "#1a1a1a", accent: "#c4a484", radius: "2px", font: "Roboto" },
      shipping: { freeThreshold: 10000, flatRate: 250, taxRate: 0, codFee: 100 },
      payments: { cod: true, bank: true, card: false, bankDetails: "Bank transfer details are shown at checkout." },
      couriers: { default: "PostEx", account: "BN-8842", apiKey: "demo-courier-key" },
      emailSettings: { fromName: "Baytak Noor", replyTo: "support@baytaknoor.demo", copyOrders: true, cloudToken: "demo-whatsapp-token" },
      tracking: { ga4: "G-DEMO12345", gtm: "GTM-DEMO123", meta: "100000000000000", tiktok: "" },
      social: { instagram: "https://instagram.com/example", facebook: "https://facebook.com/example", tiktok: "", youtube: "" },
      seo: { title: "Baytak Noor — Luxury Bed Linen", description: "Premium cotton bed linen, made for everyday rest.", domain: "baytaknoor.example", robots: true },
    },
    abandoned: { carts: 24, sessions: 1240, visitors: 860, recovered: 18400, unrecovered: 52600 },
  };
})();
