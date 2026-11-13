// Single source of truth for who may call which admin route.
// The dispatcher enforces this before any route handler runs.

export type StaffRole = 'owner' | 'manager' | 'support' | 'accountant' | 'admin';

export type RouteAccess = {
  /** GET / HEAD */
  read: StaffRole[];
  /** POST / PUT / PATCH */
  write: StaffRole[];
  /** DELETE (defaults to `write`) */
  remove?: StaffRole[];
};

const OM: StaffRole[] = ['owner', 'manager'];
const OMS: StaffRole[] = ['owner', 'manager', 'support'];
const OMSA: StaffRole[] = ['owner', 'manager', 'support', 'accountant'];
const OWNER: StaffRole[] = ['owner'];

export const ADMIN_ACCESS: Record<string, RouteAccess> = {
  '/admin/accounting': { read: ['owner', 'manager', 'accountant'], write: ['owner', 'accountant'] },
  '/admin/add-ons': { read: OM, write: OWNER },
  '/admin/archive': { read: OM, write: OM, remove: OWNER },
  '/admin/blog': { read: OM, write: OM },
  '/admin/categories': { read: OMS, write: OM },
  '/admin/cms-pages': { read: OM, write: OM },
  '/admin/collections': { read: OMS, write: OM },
  '/admin/contact-inquiries': { read: OMS, write: OMS, remove: OM },
  '/admin/coupons': { read: OM, write: OM },
  '/admin/faqs': { read: OMS, write: OM },
  '/admin/inventory': { read: OMSA, write: OM },
  '/admin/media-library': { read: OMSA, write: OM },
  '/admin/newsletter': { read: OMS, write: OM },
  '/admin/orders': { read: OMS, write: OMS },
  '/admin/phone-app': { read: OM, write: OM },
  '/admin/product-images': { read: OMS, write: OM },
  '/admin/products': { read: OMS, write: OM },
  '/admin/profile': { read: [...OMSA, 'admin'], write: [...OMSA, 'admin'] },
  '/admin/redirects': { read: OM, write: OM },
  '/admin/reviews': { read: OMS, write: OMS, remove: OM },
  '/admin/staff': { read: OM, write: OWNER },
  '/admin/store-settings': { read: OM, write: OWNER },
  '/admin/suppliers': { read: OMS, write: OM },
  '/admin/variants': { read: OMS, write: OM },
  '/admin/waitlist': { read: OMS, write: OMS, remove: OM },
};

/** Roles allowed for a method on an admin route, or null when the route is unknown. */
export function allowedRolesFor(routePath: string, method: string): StaffRole[] | null {
  const access = ADMIN_ACCESS[routePath];
  if (!access) return null;
  const verb = method.toUpperCase();
  if (verb === 'GET' || verb === 'HEAD') return access.read;
  if (verb === 'DELETE') return access.remove ?? access.write;
  return access.write;
}
