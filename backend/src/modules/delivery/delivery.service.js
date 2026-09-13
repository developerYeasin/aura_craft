import { query, queryOne } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { getSetting } from '../settings/setting.service.js';

export const listActive = () =>
  query(
    `SELECT id, name, name_bn, region, charge, note, sort_order FROM delivery_zones
     WHERE is_active = 1 ORDER BY sort_order ASC, id ASC`
  );

export const listAll = () => query('SELECT * FROM delivery_zones ORDER BY sort_order ASC, id ASC');

export const findById = (id) => queryOne('SELECT * FROM delivery_zones WHERE id = ?', [id]);

/**
 * The charge an order actually pays. A zone id wins; without one (older
 * clients, or every zone removed) it falls back to the flat inside/outside
 * settings so checkout never breaks.
 */
export const resolveDelivery = async ({ zoneId, area }) => {
  if (zoneId) {
    const zone = await queryOne('SELECT * FROM delivery_zones WHERE id = ? AND is_active = 1', [zoneId]);
    if (!zone) throw ApiError.badRequest('Selected delivery area is not available');
    return {
      charge: Number(zone.charge),
      region: zone.region,
      zoneName: zone.name_bn ? `${zone.name_bn} (${zone.name})` : zone.name,
    };
  }
  const outside = area === 'outside_dhaka';
  const charge = Number((await getSetting(outside ? 'delivery_charge_outside' : 'delivery_charge_inside')) || (outside ? 120 : 60));
  return { charge, region: outside ? 'outside_dhaka' : 'inside_dhaka', zoneName: null };
};
