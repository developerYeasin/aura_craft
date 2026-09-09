import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1).max(120),
  name_bn: z.string().max(120).optional().nullable(),
  slug: z.string().max(140).optional(),
  description: z.string().optional().nullable(),
  icon: z.string().max(16).optional().nullable(),
  image_url: z.string().max(500).optional().nullable(),
  banner_url: z.string().max(500).optional().nullable(),
  sort_order: z.coerce.number().int().optional(),
  is_active: z.coerce.number().int().min(0).max(1).optional(),
  show_in_nav: z.coerce.number().int().min(0).max(1).optional(),
});

export const updateCategorySchema = createCategorySchema.partial();
