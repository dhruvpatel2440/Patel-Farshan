import { z } from 'zod'

const phoneRegex = /^[6-9]\d{9}$/
const pincodeRegex = /^\d{6}$/

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter your full name'),
    phone: z.string().regex(phoneRegex, 'Enter a valid 10-digit mobile number'),
    // Required since signup now sends a verification code to this address.
    email: z.string().trim().min(1, 'Enter your email').email('Enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
    terms: z.boolean().refine((v) => v === true, {
      message: 'You must accept the terms to continue',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Enter your mobile number or email'),
  password: z.string().min(1, 'Enter your password'),
  remember: z.boolean().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>

export const addressSchema = z.object({
  full_name: z.string().trim().min(2, 'Enter full name'),
  phone: z.string().regex(phoneRegex, 'Enter a valid 10-digit mobile number'),
  address_line: z.string().trim().min(3, 'Enter your flat / house / building'),
  area: z.string().trim().min(2, 'Enter your area / street / landmark'),
  city_id: z.string().uuid('Select a city'),
  pincode: z.string().regex(pincodeRegex, 'Enter a valid 6-digit pincode'),
  is_default: z.boolean().optional(),
})

export type AddressInput = z.infer<typeof addressSchema>
