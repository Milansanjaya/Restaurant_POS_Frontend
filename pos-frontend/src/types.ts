// ==================== AUTH ====================
export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  branch_id: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// ==================== PRODUCT ====================
export interface Product {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string | Category;
  price: number;
  cost: number;
  taxRate: number;
  trackStock: boolean;
  lowStockThreshold: number;
  preparationTime?: number;
  branch_id: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFormData {
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  price: number;
  cost: number;
  taxRate?: number;
  trackStock?: boolean;
  lowStockThreshold?: number;
  preparationTime?: number;
}

// ==================== CATEGORY ====================
export interface Category {
  _id: string;
  name: string;
  description?: string;
  parentId?: string;
  level: number;
  icon?: string;
  image?: string;
  displayOrder: number;
  isActive: boolean;
  branch_id: string;
  children?: Category[];
  createdAt: string;
  updatedAt: string;
}

export interface CategoryFormData {
  name: string;
  description?: string;
  parentId?: string;
  icon?: string;
  displayOrder?: number;
}

// ==================== INVENTORY ====================
export interface Inventory {
  _id: string;
  product: Product | string;
  branch_id: string;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
}

export interface InventoryAdjustment {
  productId: string;
  quantityChange: number;
  type: 'PURCHASE' | 'ADJUSTMENT' | 'RETURN';
}

// ==================== SUPPLIER ====================
export type SupplierStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export interface Supplier {
  _id: string;
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  creditLimit: number;
  paymentTerms: number;
  gstNumber?: string;
  panNumber?: string;
  status: SupplierStatus;
  branch_id: string;
  outstandingBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierFormData {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  creditLimit?: number;
  paymentTerms?: number;
  gstNumber?: string;
  panNumber?: string;
}

export interface SupplierTransaction {
  _id: string;
  supplier_id: string;
  transactionType: 'PAYMENT' | 'PURCHASE';
  amount: number;
  branch_id: string;
  createdBy: string;
  createdAt: string;
}

export interface SupplierPaymentData {
  amount: number;
  paymentMethod: string;
  reference?: string;
  notes?: string;
}

// ==================== PURCHASE ORDER ====================
export type POStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrderItem {
  product_id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PurchaseOrder {
  _id: string;
  poNumber: string;
  supplier_id: string | Supplier;
  items: PurchaseOrderItem[];
  totalAmount: number;
  status: POStatus;
  approvedBy?: string;
  approvedAt?: string;
  branch_id: string;
  expectedDeliveryDate?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderFormData {
  supplier_id: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  expectedDeliveryDate?: string;
  notes?: string;
}

// ==================== GRN ====================
export type GRNStatus = 'DRAFT' | 'APPROVED' | 'RECEIVED' | 'REJECTED';
export type QualityStatus = 'ACCEPTED' | 'REJECTED' | 'PARTIAL';

export interface GRNItem {
  product_id: string;
  productName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitPrice: number;
  totalPrice: number;
  batchNumber?: string;
  expiryDate?: string;
  qualityStatus: QualityStatus;
  rejectionReason?: string;
}

export interface GRN {
  _id: string;
  grnNumber: string;
  purchaseOrder_id: string | PurchaseOrder;
  supplier_id: string | Supplier;
  items: GRNItem[];
  totalAmount: number;
  status: GRNStatus;
  receivedDate: string;
  approvedBy?: string;
  approvedAt?: string;
  branch_id: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GRNFormData {
  purchaseOrder_id: string;
  supplier_id: string;
  items: GRNItem[];
  totalAmount: number;
  notes?: string;
}

// ==================== BATCH ====================
export type BatchStatus = 'ACTIVE' | 'BLOCKED' | 'EXPIRED' | 'DEPLETED';
export type AlertStatus = 'NORMAL' | 'WARNING' | 'CRITICAL' | 'EXPIRED';

export interface Batch {
  _id: string;
  batchNumber: string;
  product_id: string | Product;
  branch_id: string;
  quantity: number;
  remainingQuantity: number;
  costPerUnit: number;
  totalCost: number;
  expiryDate: string;
  manufactureDate?: string;
  receivedDate: string;
  supplier_id?: string;
  grn_id?: string;
  status: BatchStatus;
  alertStatus: AlertStatus;
  daysUntilExpiry: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExpiryDashboard {
  totalBatches: number;
  expiredCount: number;
  criticalCount: number;
  warningCount: number;
  normalCount: number;
}

// ==================== CUSTOMER ====================
export type CustomerTier = 'BASIC' | 'SILVER' | 'GOLD' | 'PLATINUM';
export type CustomerStatus = 'ACTIVE' | 'INACTIVE';

export interface Customer {
  _id: string;
  customerCode: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  dob?: string;
  anniversary?: string;
  isWalkIn: boolean;
  tier: CustomerTier;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastVisit?: string;
  status: CustomerStatus;
  branch_id?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerFormData {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  dob?: string;
  anniversary?: string;
  notes?: string;
}

// ==================== LOYALTY ====================
export interface LoyaltyAccount {
  _id: string;
  customer_id: string;
  pointsBalance: number;
  walletBalance: number;
  lifetimePoints: number;
  redeemedPoints: number;
  tier: CustomerTier;
  pointsExpiryDate?: string;
}

export interface LoyaltyTransaction {
  _id: string;
  customer_id: string;
  type: 'EARNED' | 'REDEEMED';
  points: number;
  balance: number;
  sale_id?: string;
  description: string;
  createdAt: string;
}

export interface WalletTransaction {
  _id: string;
  customer_id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  balance: number;
  paymentMethod?: string;
  sale_id?: string;
  description: string;
  createdAt: string;
}

export interface EarnPointsData {
  customer_id: string;
  saleAmount: number;
  sale_id: string;
}

export interface RedeemPointsData {
  customer_id: string;
  points: number;
  sale_id: string;
}

export interface WalletTopupData {
  customer_id: string;
  amount: number;
  paymentMethod: string;
  reference?: string;
}

export interface WalletPaymentData {
  customer_id: string;
  amount: number;
  sale_id: string;
}

// ==================== SALE ====================
export type SaleStatus = 'OPEN' | 'PARTIALLY_PAID' | 'COMPLETED' | 'VOIDED';
export type DiscountType = 'FLAT' | 'PERCENTAGE';

export interface SaleItem {
  product: string | Product;
  quantity: number;
  price: number;
  taxRate: number;
  subtotal: number;
}

export interface Payment {
  amount: number;
  paymentMethod: string;
  paidAt?: string;
  receivedBy?: string;
}

export interface Refund {
  amount: number;
  reason: string;
  items?: { product: string; quantity: number }[];
  refundedAt: string;
  refundedBy: string;
}

export interface Sale {
  _id: string;
  invoiceNumber: string;
  branch_id: string;
  items: SaleItem[];
  subtotal: number;
  taxTotal: number;
  discount: number;
  grandTotal: number;
  payments: Payment[];
  refunds?: Refund[];
  paidAmount: number;
  balanceAmount: number;
  paymentMethod?: string;
  status: SaleStatus;
  discountType?: DiscountType;
  discountValue?: number;
  couponCode?: string;
  customer_id?: string;
  reservation?: string;
  createdBy: string;
  voidedBy?: string;
  voidedAt?: string;
  voidReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaleFormData {
  items: { product: string; quantity: number }[];
  paymentMethod?: string;
  tableId?: string;
  reservationId?: string;
  discountType?: DiscountType;
  discountValue?: number;
  couponCode?: string;
  customer_id?: string;
}

// ==================== UNIT ====================
export type UnitType = 'WEIGHT' | 'VOLUME' | 'COUNT' | 'LENGTH';

export interface Unit {
  _id: string;
  name: string;
  shortCode: string;
  type: UnitType;
  baseUnit?: string;
  conversionFactor?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UnitFormData {
  name: string;
  shortCode: string;
  type: UnitType;
  baseUnit?: string;
  conversionFactor?: number;
}

// ==================== CONFIG ====================
export interface TaxSetting {
  name: string;
  rate: number;
  isDefault: boolean;
  type: 'INCLUSIVE' | 'EXCLUSIVE';
}

export interface CurrencyConfig {
  code: string;
  symbol: string;
  position: 'BEFORE' | 'AFTER';
}

export interface InvoiceFormat {
  prefix: string;
  numberLength: number;
  footer: string;
}

export interface SystemConfig {
  _id: string;
  company_id?: string;
  branch_id?: string;
  taxes: TaxSetting[];
  currency: CurrencyConfig;
  expiryAlertDays: number;
  invoiceFormat: InvoiceFormat;
  logo?: string;
  pointsPerDollar: number;
  pointsExpiryDays: number;
}

// ==================== SUPPLIER RETURN ====================
export type ReturnStatus = 'PENDING' | 'APPROVED' | 'COMPLETED';

export interface SupplierReturnItem {
  product_id: string;
  productName: string;
  batch_id?: string;
  quantity: number;
  reason: string;
  unitPrice: number;
  totalPrice: number;
}

export interface SupplierReturn {
  _id: string;
  returnNumber: string;
  supplier_id: string | Supplier;
  grn_id?: string;
  branch_id: string;
  items: SupplierReturnItem[];
  totalAmount: number;
  status: ReturnStatus;
  debitNoteNumber?: string;
  returnDate: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierReturnFormData {
  supplier_id: string;
  grn_id?: string;
  items: SupplierReturnItem[];
  totalAmount: number;
  notes?: string;
}

// ==================== DASHBOARD ====================
export interface DashboardSummary {
  branch_id: string;
  date: string;
  todayRevenue: number;
  todayOrders: number;
  lowStockCount: number;
  openShiftCount: number;
  pendingKitchenOrders: number;
}

export interface RevenueChartPoint {
  date: string;
  revenue: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  quantitySold: number;
  revenue: number;
}

// ==================== REPORTS ====================
export interface DailyReport {
  date: string;
  totalOrders: number;
  totalSales: number;
  totalTax: number;
  averageOrderValue: number;
}

export interface PaymentSummary {
  [method: string]: number;
}

// ==================== PAGINATION ====================
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
}

// ==================== TABLE ====================
export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';

export interface RestaurantTable {
  _id: string;
  tableNumber: string;
  branch_id: string;
  capacity: number;
  status: TableStatus;
  currentSale?: string | Sale;
  section?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TableFormData {
  tableNumber: string;
  capacity: number;
  section?: string;
}

// ==================== KITCHEN ====================
export type KitchenOrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'SERVED';

export interface KitchenOrderItem {
  product: string | Product;
  name: string;
  quantity: number;
}

export interface KitchenOrder {
  _id: string;
  sale: string | Sale;
  branch_id: string;
  items: KitchenOrderItem[];
  status: KitchenOrderStatus;
  createdBy: string;
  tableNumber?: string;
  section?: string;
  waitingMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

export interface KitchenDashboardSummary {
  pendingCount: number;
  preparingCount: number;
  readyCount: number;
  totalActive: number;
}

export interface KitchenDashboard {
  branch_id: string;
  summary: KitchenDashboardSummary;
  orders: KitchenOrder[];
}

// ==================== RESERVATION ====================
export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'SEATED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export interface Reservation {
  _id: string;
  branch_id: string;
  table: string | RestaurantTable;
  customerName: string;
  customerPhone: string;
  guestCount: number;
  reservationDateTime: string;
  status: ReservationStatus;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationFormData {
  tableId: string;
  customerName: string;
  customerPhone: string;
  guestCount: number;
  reservationDateTime: string;
  notes?: string;
}

// ==================== SHIFT ====================
export type ShiftStatus = 'OPEN' | 'CLOSED';

export interface Shift {
  _id: string;
  branch_id: string;
  cashier: string | User;
  openingCash: number;
  closingCash?: number;
  expectedCash?: number;
  cashDifference?: number;
  status: ShiftStatus;
  openedAt: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}
