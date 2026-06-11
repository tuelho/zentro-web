// Modelos espelhados dos DTOs do zentro-api

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface StoreInfo {
  storeName: string;
  slug: string | null;
  themeColor: string | null;
  whatsapp: string | null;
  instagram: string | null;
  deliveryFee: number;
  minOrderValue: number;
  openingHours: string | null;
  pixKey: string | null;
  aboutText: string | null;
  hasLogo: boolean;
}

export interface CategoryCard {
  id: number;
  name: string;
  description: string | null;
}

export interface ProductCard {
  id: number;
  name: string;
  slug: string;
  shortDescription: string | null;
  price: number;
  originalPrice: number | null;
  unit: string;
  coverImageId: number | null;
  stockStatus: 'DISPONIVEL' | 'ULTIMAS_UNIDADES' | 'ESGOTADO';
  featured: boolean;
  categoryId: number | null;
  hasVariants: boolean;
}

export interface VariantView {
  id: number;
  name: string;
  price: number;
  stockStatus: string;
  options: { attribute: string; value: string }[];
}

export interface ProductDetail {
  id: number;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  price: number;
  originalPrice: number | null;
  unit: string;
  stockStatus: string;
  hasVariants: boolean;
  categoryId: number | null;
  categoryName: string | null;
  imageIds: number[];
  variants: VariantView[];
}

// ---------- auth ----------

export interface LoginResponse {
  token: string;
  id: number;
  name: string;
  email: string;
  role: 'LOJISTA' | 'CLIENTE' | 'PLATFORM_ADMIN';
  store: { id: number; name: string; slug: string } | null;
}

// ---------- checkout / pedidos ----------

export interface AddressInput {
  label?: string;
  street?: string;
  number?: string;
  district?: string;
  city?: string;
  state?: string;
  zip?: string;
  reference?: string;
  latitude: number;
  longitude: number;
}

export interface CheckoutItem {
  productId: number;
  variantId?: number | null;
  qty: number;
}

export interface CheckoutRequest {
  customer?: { name: string; email: string; phone?: string } | null;
  addressId?: number | null;
  address?: AddressInput | null;
  deliveryType: 'ENTREGA' | 'RETIRADA';
  items: CheckoutItem[];
  customerNote?: string;
  paymentNote?: string;
}

export interface CheckoutResponse {
  code: string;
  total: number;
  status: string;
}

export interface OrderItemDto {
  productId: number;
  variantId: number | null;
  productName: string;
  variantName: string | null;
  unitPrice: number;
  qty: number;
  total: number;
}

export interface OrderHistoryDto {
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  changedBy: string | null;
  changedAt: string | null;
}

export interface OrderResponse {
  id: number;
  code: string;
  status: string;
  deliveryType: 'ENTREGA' | 'RETIRADA';
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  addressSnapshot: string | null;
  paymentMethodNote: string | null;
  customerNote: string | null;
  createdAt: string | null;
  customer: { id: number; name: string; email: string; phone: string | null } | null;
  items: OrderItemDto[];
  history: OrderHistoryDto[];
}

export const ORDER_STATUSES = [
  'NOVO', 'CONFIRMADO', 'EM_SEPARACAO', 'SAIU_PARA_ENTREGA',
  'PRONTO_PARA_RETIRADA', 'ENTREGUE', 'CANCELADO',
] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];

export const ORDER_STATUS_LABELS: Record<string, string> = {
  NOVO: 'Novo',
  CONFIRMADO: 'Confirmado',
  EM_SEPARACAO: 'Em separação',
  SAIU_PARA_ENTREGA: 'Saiu para entrega',
  PRONTO_PARA_RETIRADA: 'Pronto p/ retirada',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

/** Próximos status possíveis (espelha OrderStatus.canTransitionTo do backend). */
export const ORDER_NEXT_STATUSES: Record<string, OrderStatus[]> = {
  NOVO: ['CONFIRMADO', 'CANCELADO'],
  CONFIRMADO: ['EM_SEPARACAO', 'SAIU_PARA_ENTREGA', 'PRONTO_PARA_RETIRADA', 'CANCELADO'],
  EM_SEPARACAO: ['SAIU_PARA_ENTREGA', 'PRONTO_PARA_RETIRADA', 'CANCELADO'],
  SAIU_PARA_ENTREGA: ['ENTREGUE', 'CANCELADO'],
  PRONTO_PARA_RETIRADA: ['ENTREGUE', 'CANCELADO'],
  ENTREGUE: [],
  CANCELADO: [],
};

// ---------- admin: catalogo ----------

export interface CategoryResponse {
  id: number;
  name: string;
  description: string | null;
  displayOrder: number;
  active: boolean;
}

export interface OptionDto {
  attribute: string;
  value: string;
}

export interface VariantResponse {
  id: number;
  name: string;
  sku: string | null;
  costPrice: number | null;
  salePrice: number | null;
  effectiveSalePrice: number;
  stockQty: number;
  minStockAlert: number | null;
  active: boolean;
  options: OptionDto[];
}

export interface VariantRequest {
  id?: number | null;
  name: string;
  sku?: string | null;
  costPrice?: number | null;
  salePrice?: number | null;
  stockQty?: number | null;
  minStockAlert?: number | null;
  active?: boolean;
  options: OptionDto[];
}

export interface ImageMetaDto {
  id: number;
  variantId: number | null;
  displayOrder: number | null;
  cover: boolean;
}

export interface ProductResponse {
  id: number;
  name: string;
  slug: string;
  categoryId: number | null;
  categoryName: string | null;
  shortDescription: string | null;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  unit: string;
  costPrice: number | null;
  salePrice: number;
  promoPrice: number | null;
  promoUntil: string | null;
  currentPrice: number;
  marginPercent: number | null;
  weightGrams: number | null;
  active: boolean;
  featured: boolean;
  hasVariants: boolean;
  stockQty: number;
  totalStock: number;
  minStockAlert: number | null;
  variants: VariantResponse[];
  images: ImageMetaDto[];
}

export interface ProductRequest {
  name: string;
  categoryId?: number | null;
  shortDescription?: string | null;
  description?: string | null;
  sku?: string | null;
  barcode?: string | null;
  unit?: string;
  costPrice?: number | null;
  salePrice: number;
  promoPrice?: number | null;
  promoUntil?: string | null;
  weightGrams?: number | null;
  active?: boolean;
  featured?: boolean;
  minStockAlert?: number | null;
  variants: VariantRequest[];
}

// ---------- admin: estoque ----------

export type MovementType = 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'VENDA' | 'CANCELAMENTO';

export interface MovementResponse {
  id: number;
  productId: number;
  variantId: number | null;
  type: MovementType;
  qty: number;
  reason: string | null;
  orderId: number | null;
  createdBy: string | null;
  createdAt: string | null;
}

export interface LowStockItem {
  productId: number;
  variantId?: number;
  name: string;
  stockQty: number;
  minStockAlert: number;
}

// ---------- admin: dashboard / relatorios ----------

export interface Kpi {
  sales: number;
  orders: number;
  avgTicket: number;
}

export interface Dashboard {
  today: Kpi;
  week: Kpi;
  month: Kpi;
  ordersByStatus: Record<string, number>;
  last7Days: { day: string; sales: number; orders: number }[];
  topProducts: { name: string; qty: number; total: number }[];
  lowStockCount: number;
}

export interface SalesRow {
  label: string;
  qty: number;
  sales: number;
  cost: number;
  profit: number;
}

// ---------- admin: clientes / entregas / settings ----------

export interface CustomerRow {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  registered: boolean;
  createdAt: string | null;
}

export interface AddressDto {
  id: number;
  label: string | null;
  street: string | null;
  number: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  reference: string | null;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}

export interface CustomerDetail {
  customer: CustomerRow;
  addresses: AddressDto[];
  orders: OrderResponse[];
}

export interface DeliveryView {
  orderId: number;
  orderCode: string;
  status: string;
  customerName: string;
  customerPhone: string | null;
  total: number;
  addressSnapshot: string | null;
  latitude: number | null;
  longitude: number | null;
  courierName: string | null;
  scheduledFor: string | null;
  deliveredAt: string | null;
  notes: string | null;
}

export interface SettingsDto {
  storeName: string;
  themeColor: string | null;
  whatsapp: string | null;
  instagram: string | null;
  deliveryFeeDefault: number | null;
  minOrderValue: number | null;
  openingHours: string | null;
  pixKey: string | null;
  aboutText: string | null;
  hasLogo: boolean;
}

// ---------- plataforma ----------

export interface TenantRow {
  id: number;
  name: string;
  slug: string;
  schemaName: string;
  status: string;
  plan: string;
  createdAt: string | null;
  domains: string[];
}

export interface TenantOverview {
  id: number;
  name: string;
  slug: string;
  status: string;
  ordersToday: number;
  salesToday: number;
}
