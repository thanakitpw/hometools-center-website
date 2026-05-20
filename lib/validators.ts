import { z } from 'zod';

export const quoteSchema = z.object({
  name: z.string().trim().min(1, 'กรุณากรอกชื่อ').max(120),
  phone: z.string().trim().min(8, 'กรุณากรอกเบอร์โทร').max(30),
  email: z.string().email('อีเมลไม่ถูกต้อง').optional().or(z.literal('')),
  company: z.string().trim().max(120).optional().or(z.literal('')),
  message: z.string().trim().max(2000).optional().or(z.literal('')),
  items: z.array(z.object({
    slug: z.string().optional(),
    name: z.string().optional(),
    qty: z.number().int().positive().optional(),
    note: z.string().max(500).optional(),
  })).max(50).optional(),
  source_page: z.string().max(500).optional(),
  honeypot: z.string().max(0, 'detected').optional(),
});

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  subject: z.string().trim().max(200).optional().or(z.literal('')),
  message: z.string().trim().min(1, 'กรุณากรอกข้อความ').max(2000),
  source_page: z.string().max(500).optional(),
  honeypot: z.string().max(0).optional(),
}).refine(d => d.phone || d.email, { message: 'กรุณาระบุเบอร์โทรหรืออีเมล', path: ['phone'] });

export type QuoteInput = z.infer<typeof quoteSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
