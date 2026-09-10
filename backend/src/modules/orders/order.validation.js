import { z } from 'zod';

export const createOrderSchema = z.object({
  customer_name: z.string().min(2).max(140),
  customer_phone: z.string().min(6).max(40),
  customer_email: z.string().email().optional().nullable().or(z.literal('')),
  address: z.string().min(5),
  city: z.string().max(120).optional().nullable(),
  delivery_area: z.enum(['inside_dhaka', 'outside_dhaka']).default('inside_dhaka'),
  device_id: z.string().trim().max(80).optional().nullable(),
  website: z.string().max(200).optional().nullable(),
  coupon_code: z.string().trim().max(40).optional().nullable(),
  payment_method: z.enum(['cod', 'bkash', 'nagad']).default('cod'),
  note: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        product_id: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int().min(1).max(99).default(1),
        variant: z.string().max(120).optional().nullable(),
      })
    )
    .min(1, 'At least one item is required'),
});

export const updateStatusSchema = z.object({
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
});

export const orderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(15),
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
  search: z.string().trim().optional(),
});
