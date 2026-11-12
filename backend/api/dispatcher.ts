import type { IncomingMessage, ServerResponse } from 'node:http';
import { dispatchVercelRoute } from '../lib/vercel-handler';
import health from './health';
import adminAccounting from './admin/accounting';
import adminAddOns from './admin/add-ons';
import adminArchive from './admin/archive';
import adminBlog from './admin/blog';
import adminCategories from './admin/categories';
import adminCmsPages from './admin/cms-pages';
import adminCollections from './admin/collections';
import adminContactInquiries from './admin/contact-inquiries';
import adminCoupons from './admin/coupons';
import adminFaqs from './admin/faqs';
import adminMediaLibrary from './admin/media-library';
import adminNewsletter from './admin/newsletter';
import adminOrders from './admin/orders';
import adminPhoneApp from './admin/phone-app';
import adminProducts from './admin/products';
import adminProfile from './admin/profile';
import adminRedirects from './admin/redirects';
import adminReviews from './admin/reviews';
import adminStaff from './admin/staff';
import adminStoreSettings from './admin/store-settings';
import adminSuppliers from './admin/suppliers';
import adminWaitlist from './admin/waitlist';
import processOutbox from './cron/process-outbox';
import storeCategories from './store/categories';
import storeCheckout from './store/checkout';
import storeCollections from './store/collections';
import storeContact from './store/contact';
import storeNewsletter from './store/newsletter';
import storeProducts from './store/products';
import storeReviews from './store/reviews';
import storeTracking from './store/tracking';
import storeWaitlist from './store/waitlist';
import whatsappWebhook from './webhooks/whatsapp';

type ApiHandler = (context: any) => Promise<Response | void> | Response | void;
type VercelRequest = IncomingMessage & {
  body?: unknown;
  query?: Record<string, string | string[]>;
};

const routes: Record<string, ApiHandler> = {
  '/health': health,
  '/admin/accounting': adminAccounting,
  '/admin/add-ons': adminAddOns,
  '/admin/archive': adminArchive,
  '/admin/blog': adminBlog,
  '/admin/categories': adminCategories,
  '/admin/cms-pages': adminCmsPages,
  '/admin/collections': adminCollections,
  '/admin/contact-inquiries': adminContactInquiries,
  '/admin/coupons': adminCoupons,
  '/admin/faqs': adminFaqs,
  '/admin/media-library': adminMediaLibrary,
  '/admin/newsletter': adminNewsletter,
  '/admin/orders': adminOrders,
  '/admin/phone-app': adminPhoneApp,
  '/admin/products': adminProducts,
  '/admin/profile': adminProfile,
  '/admin/redirects': adminRedirects,
  '/admin/reviews': adminReviews,
  '/admin/staff': adminStaff,
  '/admin/store-settings': adminStoreSettings,
  '/admin/suppliers': adminSuppliers,
  '/admin/waitlist': adminWaitlist,
  '/cron/process-outbox': processOutbox,
  '/store/categories': storeCategories,
  '/store/checkout': storeCheckout,
  '/store/collections': storeCollections,
  '/store/contact': storeContact,
  '/store/newsletter': storeNewsletter,
  '/store/products': storeProducts,
  '/store/reviews': storeReviews,
  '/store/track': storeTracking,
  '/store/tracking': storeTracking,
  '/store/waitlist': storeWaitlist,
  '/webhooks/whatsapp': whatsappWebhook,
};

export const config = { api: { bodyParser: false } };

export default async function handler(req: VercelRequest, res: ServerResponse): Promise<void> {
  const parsedUrl = new URL(req.url || '/', 'https://api.local');
  const rawPath = Array.isArray(req.query?.path) ? req.query?.path[0] : req.query?.path;
  const routePath = typeof rawPath === 'string'
    ? `/${rawPath.replace(/^\/+|\/+$/g, '')}`
    : parsedUrl.pathname.replace(/^\/api/, '');
  const route = routes[routePath];

  if (!route) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'API route not found' }));
    return;
  }
  await dispatchVercelRoute(route, routePath, req, res);
}
