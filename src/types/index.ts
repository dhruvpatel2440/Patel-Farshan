export type UserRole = 'user' | 'admin'

export interface Profile {
  id: string
  name: string
  phone: string
  email?: string
  role: UserRole
  created_at: string
}

export interface Category {
  id: string
  name: string
  name_gujarati: string
  display_order: number
  is_active: boolean
  image_url?: string
}

export interface PriceTier {
  id: string
  product_id: string
  unit_label: string
  price: number
  weight_grams: number
  stock_qty: number
  sort_order: number
}

export interface Product {
  id: string
  category_id: string
  category?: Category
  name: string
  name_gujarati: string
  description?: string
  image_url?: string
  price: number
  unit: string
  stock_qty: number
  price_tiers?: PriceTier[]
  is_available: boolean
  is_featured: boolean
  created_at: string
}

export interface City {
  id: string
  name: string
  delivery_charge: number
  min_order_kg: number
  estimated_delivery_time?: string | null
  is_active: boolean
}

export interface Address {
  id: string
  user_id: string
  full_name: string
  phone: string
  address_line: string
  area: string
  city_id: string
  city?: City
  pincode: string
  is_default: boolean
}

export type PaymentMode = 'upi' | 'cod'
export type PaymentStatus = 'pending' | 'awaiting_verification' | 'paid' | 'failed'
export type OrderStatus =
  | 'awaiting_payment'
  | 'placed'
  | 'confirmed'
  | 'packed'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'

export interface Order {
  id: string
  order_number: string
  user_id: string
  profile?: Profile
  address_snapshot: Address
  subtotal: number
  delivery_charge: number
  total: number
  payment_mode: PaymentMode
  payment_status: PaymentStatus
  order_status: OrderStatus
  utr_number?: string
  delivery_instructions?: string
  placed_at: string
  delivered_at?: string
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  product_name_gujarati: string
  product_image_url?: string
  tier_id?: string
  unit_label?: string
  price_at_purchase: number
  quantity: number
  line_total: number
}

export interface OrderStatusHistory {
  id: string
  order_id: string
  status: OrderStatus
  changed_by: string
  changed_at: string
  note?: string
}

export interface CartItem {
  product: Product
  tier: PriceTier
  quantity: number
}

export type EmailStatus = 'sent' | 'failed' | 'skipped'

export interface EmailLog {
  id: string
  context: string
  recipient_email: string
  recipient_name: string | null
  subject: string
  status: EmailStatus
  error: string | null
  created_at: string
}

export interface Feedback {
  id: string
  user_id: string
  user_name: string
  rating: number
  message: string | null
  is_approved: boolean
  created_at: string
  updated_at: string
}
