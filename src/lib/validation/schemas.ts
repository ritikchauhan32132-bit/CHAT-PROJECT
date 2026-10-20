import { z } from 'zod';

export const passwordValidation = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(60, 'Full name cannot exceed 60 characters'),
    username: z
      .string()
      .trim()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username cannot exceed 30 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    email: z.string().trim().email('Invalid email address'),
    password: passwordValidation,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    // Anti-bot honeypot field (must remain empty)
    website_hp: z.string().max(0, 'Bot detected').optional().or(z.literal('')),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
});

export const resetPasswordSchema = z
  .object({
    password: passwordValidation,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const profileUpdateSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(60, 'Full name cannot exceed 60 characters'),
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  bio: z.string().max(250, 'Bio cannot exceed 250 characters').optional().default(''),
  avatar_url: z.string().url().nullable().optional(),
});

export const createDirectChatSchema = z.object({
  target_user_id: z.string().uuid('Invalid user ID'),
});

export const createGroupChatSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Group name must be at least 2 characters')
    .max(60, 'Group name cannot exceed 60 characters'),
  description: z.string().max(300, 'Description cannot exceed 300 characters').optional().default(''),
  avatar_url: z.string().url().nullable().optional(),
  member_ids: z.array(z.string().uuid()).min(1, 'Select at least one member to start a group'),
});

export const updateGroupChatSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Group name must be at least 2 characters')
    .max(60, 'Group name cannot exceed 60 characters')
    .optional(),
  description: z.string().max(300, 'Description cannot exceed 300 characters').optional(),
  avatar_url: z.string().url().nullable().optional(),
});

export const addGroupMemberSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
});

export const sendMessageSchema = z.object({
  conversation_id: z.string().uuid('Invalid conversation ID'),
  content: z.string().max(4000, 'Message cannot exceed 4000 characters').default(''),
  message_type: z.enum(['text', 'image', 'video', 'file', 'system']).default('text'),
  reply_to_message_id: z.string().uuid().nullable().optional(),
  attachments: z
    .array(
      z.object({
        storage_path: z.string().min(1),
        file_name: z.string().min(1),
        mime_type: z.string().min(1),
        file_size: z.number().positive(),
      })
    )
    .optional()
    .default([]),
});

export const reportUserSchema = z.object({
  reported_user_id: z.string().uuid().nullable().optional(),
  conversation_id: z.string().uuid().nullable().optional(),
  reason: z.string().trim().min(5, 'Reason must be at least 5 characters').max(500),
});

export const adminBootstrapSchema = z.object({
  secret: z.string().min(1, 'Bootstrap secret is required'),
  user_email: z.string().trim().email('Invalid user email'),
});
