import type { IncomingMessage, ServerResponse } from 'node:http';
import { dispatchVercelRoute } from '../lib/vercel-handler';
import health from '../routes/health';
import adminAccounting from '../routes/admin/accounting';
import adminAddOns from '../routes/admin/add-ons';
import adminArchive from '../routes/admin/archive';
import adminBlog from '../routes/admin/blog';
import adminCategories from '../routes/admin/categories';
import adminCmsPages from '../routes/admin/cms-pages';
import adminCollections from '../routes/admin/collections';
import adminContactInquiries from '../routes/admin/contact-inquiries';
import adminCoupons from '../routes/admin/coupons';
import adminFaqs from '../routes/admin/faqs';
import adminMediaLibrary from '../routes/admin/media-library';
import adminNewsletter from '../routes/admin/newsletter';
import adminOrders from '../routes/admin/orders';
import adminPhoneApp from '../routes/admin/phone-app';
import adminProducts from '../routes/admin/products';
import adminProfile from '../routes/admin/profile';
import adminRedirects from '../routes/admin/redirects';
import adminReviews from '../routes/admin/reviews';
import adminStaff from '../routes/admin/staff';
import adminStoreSettings from '../routes/admin/store-settings';
import adminSuppliers from '../routes/admin/suppliers';
import adminWaitlist from '../routes/admin/waitlist';
import processOutbox from '../routes/cron/process-outbox';
import storeCategories from '../routes/store/categories';
import storeCheckout from '../routes/store/checkout';
import storeCollections from '../routes/store/collections';
import storeContact from '../routes/store/contact';
import storeNewsletter from '../routes/store/newsletter';
import storeProducts from '../routes/store/products';
import storeReviews from '../routes/store/reviews';
import storeTracking from '../routes/store/tracking';
import storeWaitlist from '../routes/store/waitlist';
import whatsappWebhook from '../routes/webhooks/whatsapp';

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
  try {
    const parsedUrl = new URL(req.url || '/', 'https://api.local');
    const rawPath =
      (typeof req.query?.path === 'string' ? req.query.path : null) ||
      (Array.isArray(req.query?.path) ? req.query.path[0] : null) ||
      parsedUrl.searchParams.get('path') ||
      (parsedUrl.pathname.startsWith('/api/') ? parsedUrl.pathname.replace(/^\/api\//, '') : null) ||
      parsedUrl.pathname.replace(/^\/api/, '');

    const normalized = typeof rawPath === 'string' ? `/${rawPath.replace(/^\/+|\/+$/g, '')}` : '/';
    const route = routes[normalized];

    if (!route) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'API route not found', requestedPath: normalized }));
      return;
    }
    await dispatchVercelRoute(route, normalized, req, res);
  } catch (err: any) {
    console.error('API Dispatcher fatal error:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Internal server error', message: err?.message || 'Server error' }));
    }
  }
}
