import { z } from 'zod';

const optionalString = z.string().optional().nullable();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(12),
  sort: z.enum(['newest', 'oldest', 'price_asc', 'price_desc', 'name_asc', 'rating', 'featured']).default('newest'),
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  categoryId: z.coerce.number().int().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  material: z.string().trim().optional(),
  color: z.string().trim().optional(),
  featured: z.enum(['true', 'false']).optional(),
  inStock: z.enum(['true', 'false']).optional(),
});

export const createProductSchema = z.object({
  category_id: z.coerce.number().int().positive(),
  name: z.string().min(1).max(180),
  slug: z.string().max(200).optional(),
  sku: optionalString,
  short_description: optionalString,
  description: optionalString,
  price: z.coerce.number().min(0),
  compare_price: z.coerce.number().min(0).optional().nullable(),
  stock: z.coerce.number().int().min(0).default(0),
  material: optionalString,
  color: optionalString,
  size_options: optionalString,
  warranty: optionalString,
  is_featured: z.coerce.number().int().min(0).max(1).default(0),
  is_active: z.coerce.number().int().min(0).max(1).default(1),
  images: z.array(z.string().min(1)).optional(),
});

export const updateProductSchema = createProductSchema.partial();
