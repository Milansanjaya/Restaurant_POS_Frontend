import { useEffect, useState } from 'react';
import { Layout, PageHeader, PageContent, Card, Button, Badge, PageLoader } from '../components';
import { 
  productsApi, 
  salesApi, 
  customersApi, 
  suppliersApi, 
  purchaseOrdersApi, 
  grnApi, 
  batchesApi,
  tablesApi,
  reservationsApi
} from '../api';
import type { 
  Product, 
  Sale, 
  Customer, 
  Supplier, 
  PurchaseOrder, 
  GRN, 
  Batch,
  RestaurantTable,
  Reservation
} from '../types';
import toast from 'react-hot-toast';

type ReportSection = 
  | 'products' 
  | 'sales' 
  | 'customers' 
  | 'suppliers' 
  | 'purchase-orders' 
  | 'grn' 
  | 'batches'
  | 'tables'
  | 'kitchens'
  | 'reservations';

export default function ComprehensiveReportsPage() {
  const [activeSection, setActiveSection] = useState<ReportSection>('sales');
  const [loading, setLoading] = useState(false);

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [grns, setGrns] = useState<GRN[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const loadSectionData = async (section: ReportSection) => {
    setLoading(true);
    try {
      switch (section) {
        case 'products':
          const productsData = await productsApi.getAll();
          const productsArray = productsData?.products || productsData?.data || productsData || [];
          setProducts(Array.isArray(productsArray) ? productsArray : []);
          break;
        case 'sales':
          const salesData = await salesApi.getAll();
          const salesArray = Array.isArray(salesData) ? salesData : (salesData as any)?.sales || [];
          setSales(Array.isArray(salesArray) ? salesArray : []);
          break;
        case 'customers':
          const customersData = await customersApi.getAll();
          const customersArray = customersData?.customers || customersData?.data || customersData || [];
          setCustomers(Array.isArray(customersArray) ? customersArray : []);
          break;
        case 'suppliers':
          const suppliersData = await suppliersApi.getAll();
          const suppliersArray = suppliersData?.suppliers || suppliersData?.data || suppliersData || [];
          setSuppliers(Array.isArray(suppliersArray) ? suppliersArray : []);
          break;
        case 'purchase-orders':
          const poData = await purchaseOrdersApi.getAll();
          const poArray = poData?.purchaseOrders || poData?.data || poData || [];
          setPurchaseOrders(Array.isArray(poArray) ? poArray : []);
          break;
        case 'grn':
          const grnData = await grnApi.getAll();
          const grnArray = grnData?.grns || grnData?.data || grnData || [];
          setGrns(Array.isArray(grnArray) ? grnArray : []);
          break;
        case 'batches':
          const batchData = await batchesApi.getAll();
          const batchArray = batchData?.batches || batchData?.data || batchData || [];
          setBatches(Array.isArray(batchArray) ? batchArray : []);
          break;
        case 'tables':
          const tablesData = await tablesApi.getAll();
          const tablesArray = Array.isArray(tablesData) ? tablesData : [];
          setTables(Array.isArray(tablesArray) ? tablesArray : []);
          break;
        case 'reservations':
          const reservationsData = await reservationsApi.getAll();
          const reservationsArray = Array.isArray(reservationsData) ? reservationsData : [];
          setReservations(Array.isArray(reservationsArray) ? reservationsArray : []);
          break;
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || `Failed to load ${section}`);
      // Set empty arrays on error
      switch (section) {
        case 'products': setProducts([]); break;
        case 'sales': setSales([]); break;
        case 'customers': setCustomers([]); break;
        case 'suppliers': setSuppliers([]); break;
        case 'purchase-orders': setPurchaseOrders([]); break;
        case 'grn': setGrns([]); break;
        case 'batches': setBatches([]); break;
        case 'tables': setTables([]); break;
        case 'reservations': setReservations([]); break;
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSectionData(activeSection);
  }, [activeSection]);

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        if (typeof value === 'object' && value !== null) {
          return JSON.stringify(value).replace(/,/g, ';');
        }
        return value;
      }).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success(`Exported ${data.length} records`);
  };

  const exportToPDF = () => {
    // Get current section data
    const getSectionData = () => {
      switch (activeSection) {
        case 'products': return { title: 'Products Report', data: products, columns: ['Name', 'SKU', 'Price', 'Cost', 'Category', 'Unit', 'Status'] };
        case 'sales': return { title: 'Sales Report', data: sales, columns: ['Invoice', 'Customer', 'Total', 'Profit', 'Payment', 'Status', 'Date'] };
        case 'customers': return { title: 'Customers Report', data: customers, columns: ['Name', 'Phone', 'Email', 'Address', 'Loyalty Points'] };
        case 'suppliers': return { title: 'Suppliers Report', data: suppliers, columns: ['Name', 'Contact', 'Email', 'Phone', 'Address'] };
        case 'purchase-orders': return { title: 'Purchase Orders Report', data: purchaseOrders, columns: ['PO Number', 'Supplier', 'Total', 'Status', 'Date'] };
        case 'grn': return { title: 'GRN Report', data: grns, columns: ['GRN Number', 'PO Reference', 'Supplier', 'Status', 'Date'] };
        case 'batches': return { title: 'Batches Report', data: batches, columns: ['Batch Number', 'Product', 'Quantity', 'Expiry Date', 'Status'] };
        case 'tables': return { title: 'Tables Report', data: tables, columns: ['Table Number', 'Capacity', 'Location', 'Status'] };
        case 'reservations': return { title: 'Reservations Report', data: reservations, columns: ['Customer', 'Table', 'Guests', 'Date/Time', 'Status'] };
        default: return { title: 'Report', data: [], columns: [] };
      }
    };

    const { title, data, columns } = getSectionData();
    
    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }

    // Helper function to get cell value
    const getCellValue = (item: any, colIndex: number): string => {
      const section = activeSection;
      try {
        if (section === 'products') {
          const vals = [
            item.name, 
            item.sku, 
            `Rs. ${item.price?.toFixed(2) || '0.00'}`, 
            `Rs. ${item.cost?.toFixed(2) || '0.00'}`,
            item.category?.name || '-', 
            item.unit?.name || '-', 
            item.isActive ? 'Active' : 'Inactive'
          ];
          return vals[colIndex] || '-';
        }
        if (section === 'sales') {
          // Calculate profit for this sale
          const itemCost = (item.items || []).reduce((sum: number, saleItem: any) => {
            const product = typeof saleItem.product === 'object' ? saleItem.product : null;
            const cost = product?.cost || 0;
            return sum + (cost * saleItem.quantity);
          }, 0);
          const profit = (item.grandTotal || 0) - itemCost;
          
          const vals = [
            item.invoiceNumber, 
            item.customer?.name || 'Walk-in', 
            `Rs. ${item.grandTotal?.toFixed(2) || '0.00'}`,
            `Rs. ${profit.toFixed(2)}`,
            item.paymentMethod, 
            item.status, 
            new Date(item.createdAt).toLocaleDateString()
          ];
          return vals[colIndex] || '-';
        }
        if (section === 'customers') {
          const vals = [item.name, item.phone, item.email || '-', item.address || '-', String(item.loyaltyPoints || 0)];
          return vals[colIndex] || '-';
        }
        if (section === 'suppliers') {
          const vals = [item.name, item.contactPerson || '-', item.email || '-', item.phone || '-', item.address || '-'];
          return vals[colIndex] || '-';
        }
        if (section === 'purchase-orders') {
          const vals = [item.poNumber, item.supplier?.name || '-', `Rs. ${item.totalAmount?.toFixed(2) || '0.00'}`, item.status, new Date(item.createdAt).toLocaleDateString()];
          return vals[colIndex] || '-';
        }
        if (section === 'grn') {
          const vals = [item.grnNumber, item.purchaseOrder?.poNumber || '-', item.supplier?.name || '-', item.status, new Date(item.createdAt).toLocaleDateString()];
          return vals[colIndex] || '-';
        }
        if (section === 'batches') {
          const vals = [item.batchNumber, item.product?.name || '-', String(item.quantity || 0), item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '-', item.status || '-'];
          return vals[colIndex] || '-';
        }
        if (section === 'tables') {
          const vals = [item.tableNumber, String(item.capacity || 0), item.location || '-', item.status];
          return vals[colIndex] || '-';
        }
        if (section === 'reservations') {
          const vals = [item.customerName, typeof item.table === 'object' ? item.table.tableNumber : '-', String(item.guestCount || 0), new Date(item.reservationDateTime).toLocaleString(), item.status];
          return vals[colIndex] || '-';
        }
        return '-';
      } catch {
        return '-';
      }
    };
    
    // Calculate stats based on section
    const getStats = () => {
      if (activeSection === 'sales') {
        const revenue = data.reduce((sum: number, s: any) => sum + (s.grandTotal || 0), 0);
        const cost = data.reduce((sum: number, s: any) => {
          return sum + (s.items || []).reduce((itemSum: number, item: any) => {
            const product = typeof item.product === 'object' ? item.product : null;
            const itemCost = product?.cost || 0;
            return itemSum + (itemCost * item.quantity);
          }, 0);
        }, 0);
        const profit = revenue - cost;
        return `
          <div class="stat-box">
            <div class="stat-value">${data.length}</div>
            <div class="stat-label">Total Sales</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">Rs. ${revenue.toLocaleString()}</div>
            <div class="stat-label">Total Revenue</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">Rs. ${profit.toLocaleString()}</div>
            <div class="stat-label">Total Profit</div>
          </div>
        `;
      } else if (activeSection === 'products') {
        const totalValue = data.reduce((sum: number, p: any) => sum + ((p.price || 0) * (p.stockQuantity || 0)), 0);
        return `
          <div class="stat-box">
            <div class="stat-value">${data.length}</div>
            <div class="stat-label">Total Products</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">Rs. ${totalValue.toLocaleString()}</div>
            <div class="stat-label">Inventory Value</div>
          </div>
        `;
      } else {
        return `
          <div class="stat-box">
            <div class="stat-value">${data.length}</div>
            <div class="stat-label">Total Records</div>
          </div>
        `;
      }
    };
    
    // Create printable HTML content
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h1 { text-align: center; color: #1e293b; margin-bottom: 10px; }
          .subtitle { text-align: center; color: #64748b; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background-color: #f1f5f9; color: #334155; font-weight: 600; text-align: left; padding: 10px; border: 1px solid #e2e8f0; }
          td { padding: 8px 10px; border: 1px solid #e2e8f0; font-size: 13px; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; }
          .stats { display: flex; gap: 20px; margin-bottom: 20px; justify-content: center; flex-wrap: wrap; }
          .stat-box { background: #f1f5f9; padding: 15px 25px; border-radius: 8px; text-align: center; }
          .stat-value { font-size: 24px; font-weight: bold; color: #1e293b; }
          .stat-label { font-size: 12px; color: #64748b; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="subtitle">Generated on ${new Date().toLocaleString()}</div>
        <div class="stats">
          ${getStats()}
        </div>
        <table>
          <thead>
            <tr>
              ${columns.map(col => `<th>${col}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.slice(0, 100).map(item => `
              <tr>
                ${columns.map((_, idx) => `<td>${getCellValue(item, idx)}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${data.length > 100 ? '<p style="text-align:center; color:#94a3b8; margin-top:10px;">Showing first 100 records...</p>' : ''}
        <div class="footer">Restaurant POS System - ${new Date().toLocaleDateString()}</div>
      </body>
      </html>
    `;

    // Open print window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
      toast.success('PDF ready for printing');
    } else {
      toast.error('Please allow popups to download PDF');
    }
  };

  const sections = [
    { id: 'sales' as ReportSection, label: '💰 Sales', count: sales.length },
    { id: 'products' as ReportSection, label: '📦 Products', count: products.length },
    { id: 'customers' as ReportSection, label: '👥 Customers', count: customers.length },
    { id: 'suppliers' as ReportSection, label: '🏭 Suppliers', count: suppliers.length },
    { id: 'purchase-orders' as ReportSection, label: '📋 Purchase Orders', count: purchaseOrders.length },
    { id: 'grn' as ReportSection, label: '📥 GRN', count: grns.length },
    { id: 'batches' as ReportSection, label: '🏷️ Batches', count: batches.length },
    { id: 'tables' as ReportSection, label: '🪑 Tables', count: tables.length },
    { id: 'reservations' as ReportSection, label: '📅 Reservations', count: reservations.length },
  ];

  // Calculate summary statistics
  const totalRevenue = sales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
  // Calculate profit: Revenue - Cost (from product items sold)
  const totalCost = sales.reduce((sum, s) => {
    return sum + (s.items || []).reduce((itemSum, item) => {
      const product = typeof item.product === 'object' ? item.product : null;
      const cost = product?.cost || 0;
      return itemSum + (cost * item.quantity);
    }, 0);
  }, 0);
  const totalProfit = totalRevenue - totalCost;
  const totalProducts = products.length;
  const totalCustomers = customers.length;
  const totalOrders = purchaseOrders.length;

  return (
    <Layout>
      <PageHeader 
        title="📊 Comprehensive Reports" 
        subtitle="View and export all system data"
      />
      
      <PageContent>
        {/* Summary Stats Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Sales</p>
                <p className="mt-1 text-2xl font-bold text-blue-600">{sales.length}</p>
              </div>
              <div className="rounded-full bg-blue-100 p-3">
                <span className="text-2xl">💰</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Revenue: Rs. {totalRevenue.toLocaleString()}
            </p>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Profit</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">Rs. {totalProfit.toLocaleString()}</p>
              </div>
              <div className="rounded-full bg-emerald-100 p-3">
                <span className="text-2xl">📈</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Margin: {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%
            </p>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Products</p>
                <p className="mt-1 text-2xl font-bold text-green-600">{totalProducts}</p>
              </div>
              <div className="rounded-full bg-green-100 p-3">
                <span className="text-2xl">📦</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Available: {products.filter(p => p.isAvailable).length}
            </p>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Customers</p>
                <p className="mt-1 text-2xl font-bold text-purple-600">{totalCustomers}</p>
              </div>
              <div className="rounded-full bg-purple-100 p-3">
                <span className="text-2xl">👥</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Platinum: {customers.filter(c => c.tier === 'PLATINUM').length}
            </p>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Purchase Orders</p>
                <p className="mt-1 text-2xl font-bold text-orange-600">{totalOrders}</p>
              </div>
              <div className="rounded-full bg-orange-100 p-3">
                <span className="text-2xl">📋</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Pending: {purchaseOrders.filter(po => po.status === 'PENDING').length}
            </p>
          </Card>
        </div>

        {/* Section Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                activeSection === section.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {section.label} ({section.count})
            </button>
          ))}
        </div>

        {loading ? (
          <PageLoader />
        ) : (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {sections.find(s => s.id === activeSection)?.label}
              </h2>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const dataMap: Record<string, any[]> = { 
                      products, sales, customers, suppliers, 
                      'purchase-orders': purchaseOrders, 
                      grn: grns, batches, tables, reservations
                    };
                    const dataToExport = dataMap[activeSection] || [];
                    exportToCSV(dataToExport as any[], activeSection);
                  }}
                >
                  📥 CSV
                </Button>
                <Button
                  variant="secondary"
                  onClick={exportToPDF}
                >
                  📄 PDF
                </Button>
              </div>
            </div>

            {/* Products Report */}
            {activeSection === 'products' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">SKU</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Category</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Price</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Tax Rate</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {products.map((product) => (
                      <tr key={product._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{product.name}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{product.sku || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {typeof product.category === 'object' ? product.category?.name : product.category}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900">Rs. {product.price.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{product.taxRate || 0}%</td>
                        <td className="px-4 py-3">
                          <Badge variant={product.isAvailable ? 'success' : 'danger'}>
                            {product.isAvailable ? 'Available' : 'Unavailable'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {products.length === 0 && (
                  <div className="py-12 text-center text-slate-500">No products found</div>
                )}
              </div>
            )}

            {/* Sales Report */}
            {activeSection === 'sales' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Invoice #</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Customer</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Items</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Subtotal</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Tax</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Total</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {sales.map((sale) => (
                      <tr key={sale._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium text-blue-600">{sale.invoiceNumber}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {new Date(sale.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {typeof sale.customer_id === 'object' && (sale.customer_id as any)?.name ? (sale.customer_id as any).name : 'Walk-in'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{sale.items?.length || 0}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">Rs. {sale.subtotal?.toFixed(2) || '0.00'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">Rs. {(sale as any).tax?.toFixed(2) || sale.subtotal ? (sale.subtotal * 0.1).toFixed(2) : '0.00'}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-600">
                          Rs. {sale.grandTotal?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="info">{sale.paymentMethod || 'CASH'}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sales.length === 0 && (
                  <div className="py-12 text-center text-slate-500">No sales found</div>
                )}
              </div>
            )}

            {/* Customers Report */}
            {activeSection === 'customers' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Phone</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Tier</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {customers.map((customer) => (
                      <tr key={customer._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{customer.name}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{customer.email || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{customer.phone}</td>
                        <td className="px-4 py-3">
                          <Badge variant={customer.tier === 'PLATINUM' ? 'warning' : 'info'}>
                            {customer.tier || 'REGULAR'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {new Date(customer.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {customers.length === 0 && (
                  <div className="py-12 text-center text-slate-500">No customers found</div>
                )}
              </div>
            )}

            {/* Suppliers Report */}
            {activeSection === 'suppliers' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Contact Person</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Phone</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Address</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {suppliers.map((supplier) => (
                      <tr key={supplier._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{supplier.name}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{supplier.contactPerson || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{supplier.email || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{supplier.phone}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{supplier.address || '-'}</td>
                        <td className="px-4 py-3">
                          <Badge variant={supplier.status === 'ACTIVE' ? 'success' : 'danger'}>
                            {supplier.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {suppliers.length === 0 && (
                  <div className="py-12 text-center text-slate-500">No suppliers found</div>
                )}
              </div>
            )}

            {/* Purchase Orders Report */}
            {activeSection === 'purchase-orders' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">PO Number</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Supplier</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Order Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Expected</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Total Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {purchaseOrders.map((po) => (
                      <tr key={po._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium text-blue-600">{po.poNumber}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {typeof po.supplier_id === 'object' ? (po.supplier_id as any)?.name : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {(po as any).orderDate ? new Date((po as any).orderDate).toLocaleDateString() : 
                           po.createdAt ? new Date(po.createdAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                          Rs. {po.totalAmount?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge 
                            variant={
                              po.status === 'RECEIVED' ? 'success' : 
                              po.status === 'PENDING' ? 'warning' : 
                              'info'
                            }
                          >
                            {po.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {purchaseOrders.length === 0 && (
                  <div className="py-12 text-center text-slate-500">No purchase orders found</div>
                )}
              </div>
            )}

            {/* GRN Report */}
            {activeSection === 'grn' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">GRN Number</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">PO Number</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Supplier</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Received Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Items</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {grns.map((grn) => (
                      <tr key={grn._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium text-blue-600">{grn.grnNumber}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {typeof grn.purchaseOrder_id === 'object' ? (grn.purchaseOrder_id as any)?.poNumber : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {typeof grn.supplier_id === 'object' ? (grn.supplier_id as any)?.name : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {new Date(grn.receivedDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{grn.items?.length || 0}</td>
                        <td className="px-4 py-3">
                          <Badge variant={grn.status === 'RECEIVED' ? 'success' : 'warning'}>
                            {grn.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {grns.length === 0 && (
                  <div className="py-12 text-center text-slate-500">No GRN records found</div>
                )}
              </div>
            )}

            {/* Batches Report */}
            {activeSection === 'batches' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Batch Number</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Product</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Quantity</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Used</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Remaining</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Expiry Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {batches.map((batch) => (
                      <tr key={batch._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium text-blue-600">{batch.batchNumber}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {typeof batch.product_id === 'object' ? (batch.product_id as any)?.name : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{batch.quantity}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{batch.quantity || 0}</td>
                        <td className="px-4 py-3 text-sm font-medium text-green-600">
                          {batch.remainingQuantity || batch.quantity}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge 
                            variant={
                              batch.status === 'ACTIVE' ? 'success' : 
                              batch.status === 'EXPIRED' ? 'danger' : 
                              'warning'
                            }
                          >
                            {batch.status || 'ACTIVE'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {batches.length === 0 && (
                  <div className="py-12 text-center text-slate-500">No batches found</div>
                )}
              </div>
            )}

            {/* Tables Report */}
            {activeSection === 'tables' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Table Number</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Section</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Capacity</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Current Sale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {tables.map((table) => (
                      <tr key={table._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{table.tableNumber}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{table.section || 'Main'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{table.capacity} seats</td>
                        <td className="px-4 py-3">
                          <Badge 
                            variant={
                              table.status === 'AVAILABLE' ? 'success' : 
                              table.status === 'OCCUPIED' ? 'danger' : 
                              table.status === 'RESERVED' ? 'warning' : 
                              'info'
                            }
                          >
                            {table.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {table.currentSale ? 'Yes' : 'No'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {tables.length === 0 && (
                  <div className="py-12 text-center text-slate-500">No tables found</div>
                )}
              </div>
            )}

            {/* Reservations Report */}
            {activeSection === 'reservations' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Customer</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Phone</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Date & Time</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Table</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Guests</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reservations.map((reservation) => (
                      <tr key={reservation._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{reservation.customerName}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{reservation.customerPhone}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {new Date(reservation.reservationDateTime).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {typeof reservation.table === 'object' ? reservation.table?.tableNumber : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{reservation.guestCount || 0}</td>
                        <td className="px-4 py-3">
                          <Badge 
                            variant={
                              reservation.status === 'COMPLETED' ? 'success' : 
                              reservation.status === 'SEATED' ? 'info' :
                              reservation.status === 'CONFIRMED' ? 'warning' : 
                              'danger'
                            }
                          >
                            {reservation.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {reservations.length === 0 && (
                  <div className="py-12 text-center text-slate-500">No reservations found</div>
                )}
              </div>
            )}

            {/* Kitchens placeholder */}
            {activeSection === 'kitchens' && (
              <div className="py-12 text-center text-slate-500">
                Kitchen reports coming soon
              </div>
            )}
          </Card>
        )}
      </PageContent>
    </Layout>
  );
}
