import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationDir = resolve(process.cwd(), '../supabase/migrations');
const readMigration = (name: string) => readFileSync(resolve(migrationDir, name), 'utf8');

describe('migration contract', () => {
  it('uses a single atomic checkout transaction with idempotency, row locks and one movement per line', () => {
    const sql = readMigration('0011_atomic_checkout_outbox.sql');
    expect(sql).toMatch(/orders_idempotency_key_uq/);
    expect(sql).toMatch(/for update of v/i);
    expect(sql).toMatch(/insufficient_stock/);
    expect(sql).toMatch(/inventory_movements \(variant_id, delta, reason, notes\)/);
    expect(sql).toMatch(/on conflict \(dedupe_key\)/i);
    expect(sql).toMatch(/revoke all on function place_order/i);
  });

  it('claims outbox jobs with skip-locked locking, bounded retries and service-only grants', () => {
    const sql = readMigration('0011_atomic_checkout_outbox.sql');
    expect(sql).toMatch(/for update skip locked/i);
    expect(sql).toMatch(/attempts = o\.attempts \+ 1/i);
    expect(sql).toMatch(/finish_outbox_job/);
    expect(sql).toMatch(/to service_role/i);
  });

  it('queues an idempotent administrator order alert in the same database transaction', () => {
    const sql = readMigration('0012_admin_order_notifications.sql');
    expect(sql).toMatch(/after insert on orders/i);
    expect(sql).toMatch(/notifications->>'adminEmail'/i);
    expect(sql).toMatch(/admin_new_order/);
    expect(sql).toMatch(/order:' \|\| new\.id::text \|\| ':admin/);
    expect(sql).toMatch(/on conflict \(dedupe_key\)/i);
  });

  it('restocks and changes order status in one locked transaction, callable only by the service role', () => {
    const sql = readMigration('0013_admin_order_status.sql');
    expect(sql).toMatch(/for update/i);
    expect(sql).toMatch(/insert into inventory_movements \(variant_id, delta, reason, notes\)/);
    expect(sql).toMatch(/fulfillment_status = v_status/);
    expect(sql).toMatch(/revoke all on function admin_set_order_status/i);
    expect(sql).toMatch(/grant execute on function admin_set_order_status\(uuid, text\) to service_role/i);
  });

  it('keeps the previously malformed historical indexes and partial unique constraints valid', () => {
    const migrations = [
      '0003_images_inventory.sql', '0004_orders_payments.sql', '0006_reviews_blog.sql',
      '0007_newsletter_contact.sql', '0008_staff_archive_addons.sql',
    ].map(readMigration).join('\n');
    expect(migrations).not.toMatch(/create\s+(?:unique\s+)?index\s+\w+\s+on\s+(?:slug|status|from_path|result|event_type|paid)\b/i);
    expect(migrations).not.toMatch(/constraint\s+\w+\s+unique\s*\([^)]*\)\s+where/i);
  });
});
