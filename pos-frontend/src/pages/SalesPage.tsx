import React, { useMemo, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Layout, PageHeader, PageContent, Button, Badge } from '../components';
import Table from '../components/Table';
import Modal from '../components/Modal';
import * as salesApi from '../api/sales.api';
import { configApi } from '../api';
import type { Sale, SaleFilters, Product, Customer, RestaurantTable, OrderType, Invoice, UserRef } from '../types';
import { formatMoney } from '../money';

const SalesPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalSales, setTotalSales] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [filters, setFilters] = useState<SaleFilters>({
    page: 1,
    limit: 20,
  });
  
  // Modals
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState(0);

  const loadSales = async () => {
    setLoading(true);
    try {
      const data = await salesApi.getSales(filters);
      setSales(data.sales);
      setTotalSales(data.total);
      setCurrentPage(data.page);
    } catch (error) {
      console.error('Failed to load sales:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, [filters]);

  const displayedSales = useMemo(() => {
    const term = invoiceSearch.trim().toLowerCase();
    if (!term) return sales;
    return sales.filter((sale) => {
      const invoiceNumber = (sale.invoiceNumber || '').toLowerCase();
      return invoiceNumber.includes(term);
    });
  }, [invoiceSearch, sales]);

  const handleViewDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setShowDetailModal(true);
  };

  const handleVoidClick = (sale: Sale) => {
    setSelectedSale(sale);
    setVoidReason('');
    setShowVoidModal(true);
  };

  const handleVoidSale = async () => {
    if (!selectedSale || !voidReason.trim()) {
      toast.error('Please provide a reason for voiding the sale');
      return;
    }

    try {
      await salesApi.voidSale(selectedSale._id, voidReason);
      toast.success('✅ Sale voided successfully');
      setShowVoidModal(false);
      loadSales();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to void sale');
    }
  };

  const handleRefundClick = (sale: Sale) => {
    setSelectedSale(sale);
    setRefundReason('');
    setRefundAmount(sale.paidAmount);
    setShowRefundModal(true);
  };

  const handleRefund = async () => {
    if (!selectedSale || !refundReason.trim()) {
      toast.error('Please provide a reason for the refund');
      return;
    }

    try {
      await salesApi.refundSale(selectedSale._id, {
        reason: refundReason,
        amount: refundAmount,
      });
      toast.success('💰 Refund processed successfully');
      setShowRefundModal(false);
      loadSales();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to process refund');
    }
  };

  const escapeHtml = (value: unknown) => {
    const str = String(value ?? '');
    return str
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  };

  const deriveOrderNumber = (invoiceNumber?: string) => {
    if (!invoiceNumber) return '';
    const digits = invoiceNumber.match(/\d+/g)?.join('') || '';
    if (!digits) return invoiceNumber;
    const short = digits.length >= 4 ? digits.slice(-4) : digits.padStart(4, '0');
    return short;
  };

  const handlePrintInvoice = async (sale: Sale) => {
    setSelectedSale(sale);

    // Open immediately (avoids popup blockers), then fill once invoice data arrives.
    const printWindow = window.open('', '_blank', 'width=420,height=680');
    if (!printWindow) {
      toast.error('Popup blocked. Please allow popups to print.');
      return;
    }

    printWindow.document.write(`<!doctype html><html><head><title>Loading...</title></head><body>Loading...</body></html>`);
    printWindow.document.close();

    try {
      const [invoice, config] = await Promise.all([
        salesApi.getInvoice(sale._id).catch(() => null as Invoice | null),
        configApi.get().catch(() => null),
      ]);

      let localPrintSettings: any = null;
      try {
        const raw = localStorage.getItem('pos_print_settings');
        localPrintSettings = raw ? JSON.parse(raw) : null;
      } catch {
        localPrintSettings = null;
      }

      const businessDetails = config?.businessDetails || localPrintSettings?.businessDetails;
      const invoiceFormat = config?.invoiceFormat || localPrintSettings?.invoiceFormat;

      const configCompany = businessDetails
        ? {
            name: businessDetails.name || '',
            address: businessDetails.address || '',
            phone: businessDetails.phone || '',
            email: businessDetails.email || '',
            logo:
              businessDetails.logo ||
              (businessDetails as any).logoUrl ||
              config?.logo ||
              localPrintSettings?.logo ||
              undefined,
          }
        : null;

      const company = configCompany || invoice?.company;
      const headerText = invoiceFormat?.header || '';
      const footerText = invoiceFormat?.footer || '';

      const html = generateThermalReceiptHtml(invoice?.sale ?? sale, company || undefined, headerText, footerText);

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();

      printWindow.focus();
      printWindow.onafterprint = () => {
        try {
          printWindow.close();
        } catch {
          // ignore
        }
      };
      printWindow.print();
    } catch (error) {
      console.error('Print invoice failed:', error);
      toast.error('Failed to print invoice');
      try {
        printWindow.close();
      } catch {
        // ignore
      }
    }
  };

  const generateThermalReceiptHtml = (sale: Sale, company?: Invoice['company'], headerText?: string, footerText?: string) => {
    const orderType = (sale.orderType || (sale as any).saleType) as OrderType | undefined;
    const orderTypeLabel = orderType ? orderType.replaceAll('_', ' ') : 'POS';

    const customer = sale.customer_id && typeof sale.customer_id === 'object'
      ? (sale.customer_id as Customer)
      : null;

    const table = sale.table && typeof sale.table === 'object'
      ? (sale.table as RestaurantTable)
      : null;

    const orderNumber = deriveOrderNumber(sale.invoiceNumber);

    const itemsHtml = sale.items.map((item) => {
      const productName = typeof item.product === 'object' ? (item.product as Product).name : 'Product';
      const safeName = escapeHtml(productName);
      return `
        <div class="item">
          <div class="item-top">
            <div class="name">${safeName}</div>
            <div class="qty">${escapeHtml(item.quantity)}</div>
            <div class="amt">${escapeHtml(formatMoney(item.subtotal))}</div>
          </div>
          <div class="item-sub">${escapeHtml(item.quantity)} x ${escapeHtml(formatMoney(item.price))}</div>
        </div>
      `;
    }).join('');

    const companyName = company?.name ? escapeHtml(company.name) : '';
    const companyAddress = company?.address ? escapeHtml(company.address) : '';
    const companyPhone = company?.phone ? escapeHtml(company.phone) : '';
    const companyEmail = company?.email ? escapeHtml(company.email) : '';
    const companyLogo = company?.logo ? String(company.logo) : '';

    const companyHtml = (companyName || companyAddress || companyPhone || companyEmail || companyLogo)
      ? `
        <div class="company">
          ${companyLogo ? `<div class="logo"><img src="${escapeHtml(companyLogo)}" alt="Logo" /></div>` : ''}
          ${companyName ? `<div class="company-name">${companyName}</div>` : ''}
          ${companyAddress ? `<div class="muted">${companyAddress}</div>` : ''}
          ${companyPhone ? `<div class="muted">Tel: ${companyPhone}</div>` : ''}
          ${companyEmail ? `<div class="muted">${companyEmail}</div>` : ''}
        </div>
      `
      : '';

    const headerLines = String(headerText || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const headerHtml = headerLines.length
      ? `<div class="center header">${headerLines.map((line) => `<div>${escapeHtml(line)}</div>`).join('')}</div>`
      : '';

    const footerLines = String(footerText || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const footerHtml = footerLines.length
      ? footerLines.map((line) => `<div>${escapeHtml(line)}</div>`).join('')
      : '<div>Thank you!</div><div class="muted">Please come again</div>';

    const customerHtml = customer
      ? `<div class="muted">Customer: ${escapeHtml(customer.name)}${customer.phone ? ` (${escapeHtml(customer.phone)})` : ''}</div>`
      : '';

    const tableHtml = table
      ? `<div class="muted">Table: ${escapeHtml(table.tableNumber)}${table.section ? ` (${escapeHtml(table.section)})` : ''}</div>`
      : '';

    const cashierName = typeof sale.createdBy === 'object'
      ? (sale.createdBy as UserRef).name || (sale.createdBy as UserRef).email || (sale.createdBy as UserRef)._id
      : sale.createdBy;

    const cashierHtml = cashierName
      ? `<div class="muted">Cashier: ${escapeHtml(cashierName)}</div>`
      : '';

    const discountHtml = sale.discount > 0
      ? `<div class="row"><span>Discount</span><span>- ${escapeHtml(formatMoney(sale.discount))}</span></div>`
      : '';

    const serviceChargeValue = (sale.serviceCharge || (sale as any).serviceCharge || 0) as number;
    const packagingChargeValue = (sale.packagingCharge || (sale as any).packagingCharge || 0) as number;
    const showPackagingCharge = (orderType === 'TAKEAWAY' || orderType === 'DELIVERY') && packagingChargeValue > 0;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Receipt - ${escapeHtml(sale.invoiceNumber)}</title>
          <style>
            @page { size: 80mm auto; margin: 6mm; }
            html, body { padding: 0; margin: 0; }
            body {
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
              color: #000;
              font-size: 12px;
              line-height: 1.25;
            }
            .receipt { width: 100%; }
            .center { text-align: center; }
            .muted { color: #111; opacity: 0.85; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .company { text-align: center; }
            .header { font-weight: 900; letter-spacing: 0.4px; margin-top: 6px; }
            .company-name { font-weight: 800; font-size: 14px; margin-top: 4px; }
            .logo img { max-width: 160px; max-height: 60px; object-fit: contain; }
            .company .muted { white-space: pre-line; }
            .order-block { border: 2px solid #000; padding: 10px 8px; margin: 10px 0; text-align: center; }
            .order-label { font-weight: 800; letter-spacing: 0.5px; }
            .order-number { font-size: 28px; font-weight: 900; margin-top: 4px; }
            .meta { margin-top: 8px; }
            .meta .row { display: flex; justify-content: space-between; gap: 8px; }
            .meta .row span:last-child { text-align: right; }
            .items-header { display: grid; grid-template-columns: 1fr 44px 72px; gap: 8px; font-weight: 800; }
            .item { margin-top: 8px; }
            .item-top { display: grid; grid-template-columns: 1fr 44px 72px; gap: 8px; }
            .item-top .qty, .item-top .amt { text-align: right; }
            .item-sub { font-size: 11px; opacity: 0.85; margin-top: 2px; }
            .totals { margin-top: 8px; }
            .totals .row { display: flex; justify-content: space-between; gap: 8px; padding: 2px 0; }
            .total-due { border-top: 2px solid #000; padding-top: 6px; margin-top: 6px; font-weight: 900; font-size: 14px; }
            .footer { margin-top: 12px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="receipt">
            ${companyHtml}
            ${headerHtml}

            <div class="divider"></div>

            <div class="order-block">
              <div class="order-label">ORDER NUMBER</div>
              <div class="order-number">${escapeHtml(orderNumber || sale.invoiceNumber)}</div>
            </div>

            <div class="meta">
              <div class="row"><span>Date</span><span>${escapeHtml(new Date(sale.createdAt).toLocaleString())}</span></div>
              <div class="row"><span>Invoice</span><span>${escapeHtml(sale.invoiceNumber)}</span></div>
              <div class="row"><span>Order Type</span><span>${escapeHtml(orderTypeLabel)}</span></div>
              ${customerHtml}
              ${tableHtml}
              ${cashierHtml}
            </div>

            <div class="divider"></div>

            <div class="items">
              <div class="items-header">
                <div>ITEM</div>
                <div style="text-align:right;">QTY</div>
                <div style="text-align:right;">AMT</div>
              </div>
              ${itemsHtml}
            </div>

            <div class="divider"></div>

            <div class="totals">
              <div class="row"><span>Subtotal</span><span>${escapeHtml(formatMoney(sale.subtotal))}</span></div>
              <div class="row"><span>Tax</span><span>${escapeHtml(formatMoney(sale.taxTotal || 0))}</span></div>
              <div class="row"><span>Service Charge</span><span>${escapeHtml(formatMoney(serviceChargeValue))}</span></div>
              ${showPackagingCharge ? `<div class="row"><span>Packaging Charge</span><span>${escapeHtml(formatMoney(packagingChargeValue))}</span></div>` : ''}
              ${discountHtml}
              <div class="row total-due"><span>TOTAL DUE</span><span>${escapeHtml(formatMoney(sale.grandTotal))}</span></div>
              <div class="row"><span>Paid</span><span>${escapeHtml(formatMoney(sale.paidAmount))}</span></div>
              ${sale.balanceAmount > 0 ? `<div class="row"><span>Balance</span><span>${escapeHtml(formatMoney(sale.balanceAmount))}</span></div>` : ''}
            </div>

            <div class="divider"></div>

            <div class="footer">
              ${footerHtml}
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      COMPLETED: { variant: 'success', label: 'Completed' },
      PARTIALLY_PAID: { variant: 'default', label: 'Partially Paid' },
      OPEN: { variant: 'default', label: 'Open' },
      VOIDED: { variant: 'default', label: 'Voided' },
    };
    
    const config = statusMap[status as keyof typeof statusMap] || { variant: 'default', label: status };
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  const columns = [
    { 
      key: 'invoiceNumber', 
      header: 'Invoice #',
      render: (sale: Sale) => sale.invoiceNumber
    },
    { 
      key: 'createdAt', 
      header: 'Date',
      render: (sale: Sale) => new Date(sale.createdAt).toLocaleDateString()
    },
    { 
      key: 'orderType', 
      header: 'Order Type',
      render: (sale: Sale) => {
        const ot = (sale.orderType || (sale as any).saleType) as string | undefined;
        return ot ? ot.replace('_', ' ') : '-';
      }
    },
    {
      key: 'createdBy',
      header: 'Cashier',
      render: (sale: Sale) => {
        const cashier = sale.createdBy;
        if (!cashier) return '-';
        if (typeof cashier === 'object') return cashier.name || cashier.email || cashier._id || '-';
        return cashier;
      },
    },
    { 
      key: 'items', 
      header: 'Items',
      render: (sale: Sale) => sale.items.length
    },
    { 
      key: 'grandTotal', 
      header: 'Total',
      render: (sale: Sale) => formatMoney(sale.grandTotal)
    },
    { 
      key: 'paidAmount', 
      header: 'Paid',
      render: (sale: Sale) => formatMoney(sale.paidAmount)
    },
    { 
      key: 'balanceAmount', 
      header: 'Balance',
      render: (sale: Sale) => formatMoney(sale.balanceAmount)
    },
    { 
      key: 'status', 
      header: 'Status',
      render: (sale: Sale) => getStatusBadge(sale.status)
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (sale: Sale) => (
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => handleViewDetails(sale)}
          >
            View
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => handlePrintInvoice(sale)}
          >
            Invoice
          </Button>
          {sale.status !== 'VOIDED' && (
            <>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => handleVoidClick(sale)}
              >
                Void
              </Button>
              {sale.status === 'COMPLETED' && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => handleRefundClick(sale)}
                >
                  Refund
                </Button>
              )}
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <PageHeader
        title="Sales History"
        subtitle="View and manage all sales transactions"
      />
      
      <PageContent>
        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-4">
          <input
            type="text"
            value={invoiceSearch}
            onChange={(e) => setInvoiceSearch(e.target.value)}
            className="border rounded px-3 py-2"
            placeholder="Search Invoice #"
          />

          <select
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as any, page: 1 })}
            className="border rounded px-3 py-2"
          >
            <option value="">All Status</option>
            <option value="OPEN">Open</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="COMPLETED">Completed</option>
            <option value="VOIDED">Voided</option>
          </select>

          <select
            value={filters.orderType || ''}
            onChange={(e) => setFilters({ ...filters, orderType: (e.target.value || undefined) as any, page: 1 })}
            className="border rounded px-3 py-2"
          >
            <option value="">All Order Types</option>
            <option value="DINE_IN">Dine In</option>
            <option value="TAKEAWAY">Takeaway</option>
            <option value="DELIVERY">Delivery</option>
          </select>

          <input
            type="date"
            value={filters.from || ''}
            onChange={(e) => setFilters({ ...filters, from: e.target.value, page: 1 })}
            className="border rounded px-3 py-2"
            placeholder="From Date"
          />

          <input
            type="date"
            value={filters.to || ''}
            onChange={(e) => setFilters({ ...filters, to: e.target.value, page: 1 })}
            className="border rounded px-3 py-2"
            placeholder="To Date"
          />

          <Button 
            onClick={() => {
              setInvoiceSearch('');
              setFilters({ page: 1, limit: 20 });
            }}
            variant="ghost"
          >
            Clear Filters
          </Button>
        </div>

        <Table
          columns={columns}
          data={displayedSales}
          keyExtractor={(sale) => sale._id}
          loading={loading}
          emptyMessage="No sales found"
        />

        {/* Pagination */}
        {!invoiceSearch.trim() && totalSales > (filters.limit || 20) && (
          <div className="mt-4 flex justify-center gap-2">
            <Button
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setFilters({ ...filters, page: currentPage - 1 })}
            >
              Previous
            </Button>
            <span className="px-4 py-2">
              Page {currentPage} of {Math.ceil(totalSales / (filters.limit || 20))}
            </span>
            <Button
              size="sm"
              disabled={currentPage >= Math.ceil(totalSales / (filters.limit || 20))}
              onClick={() => setFilters({ ...filters, page: currentPage + 1 })}
            >
              Next
            </Button>
          </div>
        )}

        {/* Void Sale Modal */}
        <Modal
          isOpen={showVoidModal}
          onClose={() => setShowVoidModal(false)}
          title="Void Sale"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Invoice: {selectedSale?.invoiceNumber}
            </p>
            <p className="text-sm text-gray-600">
              Amount: {formatMoney(selectedSale?.grandTotal)}
            </p>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Reason for Voiding *
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full border rounded px-3 py-2"
                rows={3}
                placeholder="Enter reason..."
                required
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowVoidModal(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVoidSale}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Void Sale
              </button>
            </div>
          </div>
        </Modal>

        {/* Sale Detail Modal */}
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={`Sale Details - ${selectedSale?.invoiceNumber || ''}`}
        >
          {selectedSale && (
            <div className="space-y-4">
              {/* Sale Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Date:</span>
                  <span className="ml-2">{new Date(selectedSale.createdAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <span className="ml-2">{selectedSale.status}</span>
                </div>
                <div>
                  <span className="text-gray-500">Cashier:</span>
                  <span className="ml-2">
                    {typeof selectedSale.createdBy === 'object'
                      ? (selectedSale.createdBy as UserRef).name || (selectedSale.createdBy as UserRef).email || (selectedSale.createdBy as UserRef)._id
                      : selectedSale.createdBy}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Order Type:</span>
                  <span className="ml-2">{(selectedSale.orderType || (selectedSale as any).saleType || 'POS').toString().replace('_', ' ')}</span>
                </div>

                {selectedSale.customer_id && typeof selectedSale.customer_id === 'object' && (
                  <div>
                    <span className="text-gray-500">Customer:</span>
                    <span className="ml-2">{(selectedSale.customer_id as Customer).name}</span>
                  </div>
                )}

                {selectedSale.table && typeof selectedSale.table === 'object' && (
                  <div>
                    <span className="text-gray-500">Table:</span>
                    <span className="ml-2">
                      {(selectedSale.table as RestaurantTable).tableNumber}
                      {(selectedSale.table as RestaurantTable).section
                        ? ` (${(selectedSale.table as RestaurantTable).section})`
                        : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Items */}
              <div>
                <h4 className="font-medium mb-2">Items</h4>
                <div className="border rounded max-h-48 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left p-2">Item</th>
                        <th className="text-center p-2">Qty</th>
                        <th className="text-right p-2">Price</th>
                        <th className="text-right p-2">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSale.items.map((item, idx) => {
                        const productName = typeof item.product === 'object' ? (item.product as Product).name : 'Product';
                        return (
                          <tr key={idx} className="border-t">
                            <td className="p-2">{productName}</td>
                            <td className="text-center p-2">{item.quantity}</td>
                            <td className="text-right p-2">{formatMoney(item.price)}</td>
                            <td className="text-right p-2">{formatMoney(item.subtotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="border-t pt-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatMoney(selectedSale.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Charge:</span>
                  <span>{formatMoney(selectedSale.serviceCharge || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Packaging Charge:</span>
                  <span>{formatMoney(selectedSale.packagingCharge || 0)}</span>
                </div>
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span>- {formatMoney(selectedSale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Grand Total:</span>
                  <span>{formatMoney(selectedSale.grandTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid:</span>
                  <span>{formatMoney(selectedSale.paidAmount)}</span>
                </div>
                {selectedSale.balanceAmount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Balance Due:</span>
                    <span>{formatMoney(selectedSale.balanceAmount)}</span>
                  </div>
                )}
              </div>

              {/* Payments */}
              {selectedSale.payments && selectedSale.payments.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Payments</h4>
                  <div className="space-y-1 text-sm">
                    {selectedSale.payments.map((payment, idx) => (
                      <div key={idx} className="flex justify-between bg-gray-50 p-2 rounded">
                        <span className="capitalize">{(payment as any).method?.toLowerCase() || payment.paymentMethod || 'Cash'}</span>
                        <span>{formatMoney(payment.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Refunds */}
              {selectedSale.refunds && selectedSale.refunds.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-red-600">Refunds</h4>
                  <div className="space-y-1 text-sm">
                    {selectedSale.refunds.map((refund, idx) => (
                      <div key={idx} className="bg-red-50 p-2 rounded">
                        <div className="flex justify-between">
                          <span>{new Date((refund as any).date || (refund as any).refundDate || Date.now()).toLocaleDateString()}</span>
                          <span>- {formatMoney(refund.amount)}</span>
                        </div>
                        <p className="text-gray-600 text-xs">{refund.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4">
                <Button onClick={() => setShowDetailModal(false)}>Close</Button>
                <Button onClick={() => handlePrintInvoice(selectedSale)}>Print Invoice</Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Refund Modal */}
        <Modal
          isOpen={showRefundModal}
          onClose={() => setShowRefundModal(false)}
          title="Process Refund"
        >
          {selectedSale && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-600">
                  Invoice: <strong>{selectedSale.invoiceNumber}</strong>
                </p>
                <p className="text-sm text-gray-600">
                  Paid Amount: <strong>{formatMoney(selectedSale.paidAmount)}</strong>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Refund Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedSale.paidAmount}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                  className="w-full border rounded px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Max refundable: {formatMoney(selectedSale.paidAmount)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Reason for Refund *
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  placeholder="Enter refund reason..."
                  required
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRefund}
                  disabled={refundAmount <= 0 || refundAmount > selectedSale.paidAmount}
                  className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
                >
                  Process Refund
                </button>
              </div>
            </div>
          )}
        </Modal>
      </PageContent>
    </Layout>
  );
};

export default SalesPage;
