import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { useAuthStore } from "../store/auth.store";
import { useCartStore } from "../store/cart.store";
import api from "../api/axios";
import { createSale, getSaleById, paySale } from "../api/sales.api";
import { categoriesApi } from "../api";
import { tablesApi } from "../api/tables.api";
import { shiftsApi } from "../api/shifts.api";
import type { Category, RestaurantTable, Shift, Sale } from "../types";

type Product = {
  _id: string;
  name: string;
  price: number;
  category?: string | { _id: string; name: string };
  taxRate?: number;
  lowStock?: boolean;
  isAvailable?: boolean;
};

type PaymentMethod = 'CASH' | 'CARD' | 'UPI' | 'WALLET' | 'SPLIT';
type DiscountType = 'PERCENTAGE' | 'FIXED' | '';

export default function PosPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const token = useAuthStore((s) => s.token);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  // Order options
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [discountType, setDiscountType] = useState<DiscountType>('');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [couponCode, setCouponCode] = useState<string>("");
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'>('TAKEAWAY');
  
  // Table orders (tracking items for occupied tables before creating sale)
  type TableOrder = {
    tableId: string;
    items: Array<{ _id: string; name: string; price: number; taxRate: number; quantity: number }>;
  };
  const [tableOrders, setTableOrders] = useState<TableOrder[]>([]);
  
  // Table bill/payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedTableForPayment, setSelectedTableForPayment] = useState<RestaurantTable | null>(null);
  const [tableSale, setTableSale] = useState<Sale | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Shift modal
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [openingCash, setOpeningCash] = useState<number>(0);
  const [processingShift, setProcessingShift] = useState(false);

  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const increaseQty = useCartStore((s) => s.increaseQty);
  const decreaseQty = useCartStore((s) => s.decreaseQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const subtotal = useCartStore((s) => s.subtotal);
  const taxTotal = useCartStore((s) => s.taxTotal);
  const grandTotal = useCartStore((s) => s.grandTotal);

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    const loadData = async () => {
      try {
        const [productsRes, categoriesRes, tablesRes, shiftRes] = await Promise.all([
          api.get("/products"),
          categoriesApi.getAll(),
          tablesApi.getAll(),
          shiftsApi.getCurrent().catch(() => null),
        ]);
        setProducts(productsRes.data.products || []);
        setCategories(categoriesRes || []);
        setTables(tablesRes || []);
        setCurrentShift(shiftRes);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token, navigate]);

  const handleOpenShift = async () => {
    if (openingCash < 0) {
      toast.error("Opening cash cannot be negative");
      return;
    }
    
    setProcessingShift(true);
    try {
      const shift = await shiftsApi.open(openingCash);
      setCurrentShift(shift);
      setShowShiftModal(false);
      setOpeningCash(0);
      toast.success("✅ Shift opened successfully!");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to open shift");
    } finally {
      setProcessingShift(false);
    }
  };

  // Handle opening table bill for payment
  const handleOpenTableBill = async (table: RestaurantTable) => {
    // Find table order in our local state
    const tableOrder = tableOrders.find(order => order.tableId === table._id);
    
    if (!tableOrder || tableOrder.items.length === 0) {
      toast.error("No items in this table order");
      return;
    }

    // Load items into the cart for this table
    clearCart();
    tableOrder.items.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        addItem({
          _id: item._id,
          name: item.name,
          price: item.price,
          taxRate: item.taxRate
        });
      }
    });

    setSelectedTableForPayment(table);
    setShowPaymentModal(true);
  };

  // Handle payment for table
  const handleTablePayment = async () => {
    if (!selectedTableForPayment || items.length === 0) {
      toast.error("No items to pay for");
      return;
    }

    if (!currentShift) {
      toast.error("No open shift");
      return;
    }

    setProcessingPayment(true);
    try {
      // Create the sale with all items and payment
      const payload: any = {
        items: items.map((item) => ({
          product: item._id,
          quantity: item.quantity
        })),
        paymentMethod: paymentMethod,
      };

      // Add discount if applied
      if (discountType && discountValue > 0) {
        payload.discountType = discountType;
        payload.discountValue = discountValue;
      }

      // Add coupon if entered
      if (couponCode.trim()) {
        payload.couponCode = couponCode.trim();
      }

      const sale = await createSale(payload);

      // Update table status to AVAILABLE
      await tablesApi.updateStatus(selectedTableForPayment._id, 'AVAILABLE');

      // Remove table order from state
      setTableOrders(tableOrders.filter(order => order.tableId !== selectedTableForPayment._id));

      // Refresh tables
      const tablesRes = await tablesApi.getAll();
      setTables(tablesRes || []);

      toast.success(`💰 Payment complete! Invoice: ${sale.invoiceNumber}`, {
        duration: 4000,
      });
      
      clearCart();
      setDiscountType('');
      setDiscountValue(0);
      setCouponCode('');
      setShowPaymentModal(false);
      setSelectedTableForPayment(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Payment failed");
    } finally {
      setProcessingPayment(false);
    }
  };

  // Get occupied tables (show tables with OCCUPIED status OR in local tableOrders)
  const occupiedTables = tables.filter(t => 
    t.status === 'OCCUPIED' || tableOrders.some(order => order.tableId === t._id)
  );

  // Calculate discount amount
  const calculateDiscount = () => {
    const total = subtotal() + taxTotal();
    if (!discountType || discountValue <= 0) return 0;
    if (discountType === 'PERCENTAGE') {
      return Math.min(total, (total * discountValue) / 100);
    }
    return Math.min(total, discountValue);
  };

  const finalTotal = () => {
    return grandTotal() - calculateDiscount();
  };

  const getCategoryName = (product: Product) => {
    if (!product.category) return "General";
    if (typeof product.category === "object") return product.category.name;
    const cat = categories.find((c) => c._id === product.category);
    return cat?.name || "General";
  };

  const getCategoryId = (product: Product) => {
    if (!product.category) return "";
    if (typeof product.category === "object") return product.category._id;
    return product.category;
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || getCategoryId(product) === selectedCategory;
    const isAvailable = product.isAvailable !== false; // Default to available if undefined
    return matchesSearch && matchesCategory && isAvailable;
  });

  // Products marked as unavailable (for display)
  const unavailableProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || getCategoryId(product) === selectedCategory;
    return matchesSearch && matchesCategory && product.isAvailable === false;
  });

  const flattenCategories = (cats: Category[]): Category[] => {
    let result: Category[] = [];
    for (const cat of cats) {
      result.push(cat);
      if (cat.children?.length) {
        result = result.concat(flattenCategories(cat.children));
      }
    }
    return result;
  };

const handleAddToTable = async () => {
  if (items.length === 0) {
    toast.error("Cart is empty");
    return;
  }

  if (!selectedTable) {
    toast.error("Please select a table");
    return;
  }

  try {
    // Check if table already has an order
    const existingOrderIndex = tableOrders.findIndex(order => order.tableId === selectedTable);
    
    if (existingOrderIndex >= 0) {
      // Add to existing table order
      const updatedOrders = [...tableOrders];
      const existingOrder = updatedOrders[existingOrderIndex];
      
      items.forEach(newItem => {
        const existingItemIndex = existingOrder.items.findIndex(i => i._id === newItem._id);
        if (existingItemIndex >= 0) {
          existingOrder.items[existingItemIndex].quantity += newItem.quantity;
        } else {
          existingOrder.items.push({ ...newItem });
        }
      });
      
      setTableOrders(updatedOrders);
    } else {
      // Create new table order
      setTableOrders([...tableOrders, {
        tableId: selectedTable,
        items: items.map(item => ({ ...item }))
      }]);
    }

    // Update table status to OCCUPIED
    await tablesApi.updateStatus(selectedTable, 'OCCUPIED');
    
    // Refresh tables
    const tablesRes = await tablesApi.getAll();
    setTables(tablesRes || []);
    
    clearCart();
    toast.success("🍽️ Items added to table! Table is now OCCUPIED.");
  } catch (error: any) {
    console.error("Add to table error:", error);
    toast.error(error?.response?.data?.message || "Failed to add items to table");
  }
};

const handleCreateSale = async () => {
  if (items.length === 0) {
    toast.error("Cart is empty");
    return;
  }

  if (!currentShift) {
    toast.error("No open shift. Please open a shift first.");
    setShowShiftModal(true);
    return;
  }

  try {
    const payload: any = {
      items: items.map((item) => ({
        product: item._id,
        quantity: item.quantity
      })),
      paymentMethod: paymentMethod,
    };

    // Add discount if applied
    if (discountType && discountValue > 0) {
      payload.discountType = discountType;
      payload.discountValue = discountValue;
    }

    // Add coupon if entered
    if (couponCode.trim()) {
      payload.couponCode = couponCode.trim();
    }

    const sale = await createSale(payload);

    toast.success(`✅ Sale created successfully! Invoice: ${sale.invoiceNumber}`, {
      duration: 4000,
    });
    clearCart();
    setDiscountType('');
    setDiscountValue(0);
    setCouponCode('');
    console.log("SALE:", sale);
  } catch (error: any) {
    console.error("Create sale error:", error?.response?.data || error);
    toast.error(error?.response?.data?.message || "Failed to create sale");
  }
};

  // Get available tables (only AVAILABLE tables for selection in dropdown)
  const availableTables = tables.filter(t => t.status === 'AVAILABLE');

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '14px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
            style: {
              background: '#10b981',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
            style: {
              background: '#ef4444',
            },
          },
        }}
      />
      
      {/* Shift Warning Banner */}
      {!currentShift && !loading && (
        <div className="bg-yellow-500 text-white px-6 py-2 flex items-center justify-between">
          <span className="font-medium">⚠️ No shift open. You need to open a shift to create sales.</span>
          <button
            onClick={() => setShowShiftModal(true)}
            className="rounded bg-white text-yellow-600 px-4 py-1 text-sm font-medium hover:bg-yellow-50"
          >
            Open Shift
          </button>
        </div>
      )}

      {/* Current Shift Info */}
      {currentShift && (
        <div className="bg-green-500 text-white px-6 py-1 text-sm">
          ✓ Shift Open | Opening Cash: Rs. {currentShift.openingCash?.toFixed(2) || '0.00'}
        </div>
      )}

      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">POS Dashboard</h1>
          <p className="text-sm text-slate-500">Restaurant Point of Sale</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            Dashboard
          </button>
          <button
            onClick={logout}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="flex h-[calc(100vh-4rem)]">
        <aside className="w-64 border-r border-slate-200 bg-white p-4 overflow-y-auto">
          {/* Order Type Selection */}
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Order Type
          </h2>
          <div className="flex gap-1 mb-4">
            {(['TAKEAWAY', 'DINE_IN', 'DELIVERY'] as const).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setOrderType(type);
                  if (type !== 'DINE_IN') setSelectedTable('');
                }}
                className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium transition ${
                  orderType === type
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Table Selection (only for Dine-In) */}
          {orderType === 'DINE_IN' && (
            <div className="mb-4">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Select Table
              </h2>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">-- Select Table --</option>
                {availableTables.map((table) => (
                  <option key={table._id} value={table._id}>
                    Table {table.tableNumber} {table.section ? `(${table.section})` : ''} - {table.capacity} seats - {table.status}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Occupied Tables Section */}
          {occupiedTables.length > 0 && (
            <div className="mb-4">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                🍽️ Active Tables ({occupiedTables.length})
              </h2>
              <div className="space-y-2">
                {occupiedTables.map((table) => {
                  const isSelected = selectedTable === table._id;
                  return (
                  <div
                    key={table._id}
                    className={`rounded-lg border p-3 transition-all ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : 'border-orange-200 bg-orange-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className={`font-medium ${isSelected ? 'text-blue-800' : 'text-orange-800'}`}>
                          Table {table.tableNumber}
                        </span>
                        {table.section && (
                          <span className={`text-xs ml-1 ${isSelected ? 'text-blue-600' : 'text-orange-600'}`}>
                            ({table.section})
                          </span>
                        )}
                        {isSelected && (
                          <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                            ✓ Selected
                          </span>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        isSelected 
                          ? 'bg-blue-200 text-blue-700' 
                          : 'bg-orange-200 text-orange-700'
                      }`}>
                        OCCUPIED
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setOrderType('DINE_IN');
                          setSelectedTable(table._id);
                        }}
                        className={`flex-1 text-xs rounded px-2 py-1 ${
                          isSelected
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                        }`}
                      >
                        {isSelected ? '✓ Adding Items' : '+ Add Items'}
                      </button>
                      <button
                        onClick={() => handleOpenTableBill(table)}
                        className="flex-1 text-xs bg-green-600 text-white rounded px-2 py-1 hover:bg-green-700"
                      >
                        💳 Pay Bill
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Categories
          </h2>

          <div className="space-y-2">
            <button
              onClick={() => setSelectedCategory("")}
              className={`w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                selectedCategory === ""
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All Products
            </button>
            {flattenCategories(categories).map((cat) => (
              <button
                key={cat._id}
                onClick={() => setSelectedCategory(cat._id)}
                className={`w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                  selectedCategory === cat._id
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {cat.icon && <span className="mr-2">{cat.icon}</span>}
                {cat.name}
              </button>
            ))}
          </div>
        </aside>

        <section className="flex-1 overflow-auto p-6">
          <div className="mb-6">
            <input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-500"
            />
          </div>

          <h2 className="mb-4 text-lg font-semibold text-slate-800">Products</h2>

          {loading ? (
            <p className="text-slate-500">Loading products...</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <div
                  key={product._id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <h3 className="text-base font-semibold text-slate-800">
                      {product.name}
                    </h3>

                    {product.lowStock ? (
                      <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-600">
                        Low Stock
                      </span>
                    ) : null}
                  </div>

                  <p className="mb-4 text-sm text-slate-500">
                    {getCategoryName(product)}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-slate-900">
                      Rs. {product.price}
                    </span>

                    <button
                      onClick={() =>
                        addItem({
                          _id: product._id,
                          name: product.name,
                          price: product.price,
                          taxRate: product.taxRate || 0
                        })
                      }
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}

              {/* Unavailable Products Section */}
              {unavailableProducts.length > 0 && (
                <>
                  <div className="col-span-full mt-6 mb-2">
                    <h3 className="text-sm font-medium text-slate-500">Currently Unavailable</h3>
                  </div>
                  {unavailableProducts.map((product) => (
                    <div
                      key={product._id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 opacity-60"
                    >
                      <div className="mb-2 flex items-start justify-between">
                        <h3 className="text-base font-semibold text-slate-500">
                          {product.name}
                        </h3>
                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-600">
                          Out of Stock
                        </span>
                      </div>
                      <p className="mb-4 text-sm text-slate-400">
                        {getCategoryName(product)}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-slate-400">
                          Rs. {product.price}
                        </span>
                        <span className="text-sm text-slate-400">Unavailable</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </section>

        <aside className="w-96 border-l border-slate-200 bg-white p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Cart</h2>
            {orderType === 'DINE_IN' && selectedTable && (
              <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600">🍽️</span>
                    <span className="text-sm font-medium text-blue-800">
                      Table {tables.find(t => t._id === selectedTable)?.tableNumber}
                      {tables.find(t => t._id === selectedTable)?.section && (
                        <span className="text-blue-600 ml-1">
                          ({tables.find(t => t._id === selectedTable)?.section})
                        </span>
                      )}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedTable('')}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex h-full flex-col">
            <div className="flex-1 space-y-3 overflow-auto">
              {items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  No items in cart yet.
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item._id}
                    className="rounded-xl border border-slate-200 p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-slate-800">{item.name}</h3>
                        <p className="text-sm text-slate-500">
                          Rs. {item.price} each
                        </p>
                      </div>

                      <button
                        onClick={() => removeItem(item._id)}
                        className="text-sm text-red-500 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => decreaseQty(item._id)}
                          className="rounded-lg border px-3 py-1 text-sm"
                        >
                          -
                        </button>
                        <span className="min-w-[24px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => increaseQty(item._id)}
                          className="rounded-lg border px-3 py-1 text-sm"
                        >
                          +
                        </button>
                      </div>

                      <span className="font-medium text-slate-800">
                        Rs. {item.price * item.quantity}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Payment & Discount Section */}
            <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
              {/* Payment Method */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="WALLET">Wallet</option>
                </select>
              </div>

              {/* Discount */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Discount
                </label>
                <div className="flex gap-2">
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                    className="w-1/2 rounded-lg border border-slate-300 px-2 py-2 text-sm"
                  >
                    <option value="">No Discount</option>
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount</option>
                  </select>
                  {discountType && (
                    <input
                      type="number"
                      min="0"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                      placeholder={discountType === 'PERCENTAGE' ? '%' : 'Rs.'}
                      className="w-1/2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  )}
                </div>
              </div>

              {/* Coupon Code */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Coupon Code
                </label>
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Totals */}
            <div className="mt-4 space-y-2 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span>Rs. {subtotal().toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Tax</span>
                <span>Rs. {taxTotal().toFixed(2)}</span>
              </div>

              {calculateDiscount() > 0 && (
                <div className="flex items-center justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>- Rs. {calculateDiscount().toFixed(2)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-base font-semibold text-slate-900 pt-2 border-t">
                <span>Total</span>
                <span>Rs. {finalTotal().toFixed(2)}</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={clearCart}
                  className="w-1/2 rounded-xl border border-slate-300 px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Clear
                </button>

                <button
                  onClick={orderType === 'DINE_IN' && selectedTable ? handleAddToTable : handleCreateSale}
                  disabled={!currentShift || (orderType === 'DINE_IN' && !selectedTable)}
                  className="w-1/2 rounded-xl bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {orderType === 'DINE_IN' && selectedTable ? 'Add to Table' : 'Create Sale'}
                </button>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Open Shift Modal */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Open New Shift</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Opening Cash Amount
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={openingCash}
                onChange={(e) => setOpeningCash(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3"
                placeholder="Enter opening cash..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowShiftModal(false)}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleOpenShift}
                disabled={processingShift}
                className="flex-1 rounded-xl bg-green-600 px-4 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {processingShift ? 'Opening...' : 'Open Shift'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedTableForPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                💳 Pay Bill - Table {selectedTableForPayment.tableNumber}
              </h3>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedTableForPayment(null);
                  clearCart();
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Bill Items */}
            <div className="mb-4 bg-slate-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-slate-600 mb-2">Order Items</h4>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>
                      {item.name} × {item.quantity}
                    </span>
                    <span className="font-medium">Rs. {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bill Summary */}
            <div className="mb-4 space-y-2 border-t border-slate-200 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span>Rs. {subtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Tax</span>
                <span>Rs. {taxTotal().toFixed(2)}</span>
              </div>
              {calculateDiscount() > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>- Rs. {calculateDiscount().toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-lg text-green-600 pt-2 border-t">
                <span>Total Amount</span>
                <span>Rs. {finalTotal().toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Payment Method
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['CASH', 'CARD', 'UPI', 'WALLET'] as const).map((method) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                        paymentMethod === method
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {method === 'CASH' && '💵'} {method === 'CARD' && '💳'} 
                      {method === 'UPI' && '📱'} {method === 'WALLET' && '👛'}
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Discount Section */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Discount (Optional)
                </label>
                <div className="flex gap-2">
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                    className="w-1/2 rounded-lg border border-slate-300 px-2 py-2 text-sm"
                  >
                    <option value="">No Discount</option>
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount</option>
                  </select>
                  {discountType && (
                    <input
                      type="number"
                      min="0"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                      placeholder={discountType === 'PERCENTAGE' ? '%' : 'Rs.'}
                      className="w-1/2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  )}
                </div>
              </div>

              {/* Coupon Code */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Coupon Code (Optional)
                </label>
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedTableForPayment(null);
                    clearCart();
                  }}
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTablePayment}
                  disabled={processingPayment}
                  className="flex-1 rounded-xl bg-green-600 px-4 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {processingPayment ? 'Processing...' : `Pay Rs. ${finalTotal().toFixed(2)}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}