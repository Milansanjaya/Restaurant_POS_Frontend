import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Layout, PageHeader, PageContent, Button, Badge } from '../components';
import Table from '../components/Table';
import Modal from '../components/Modal';
import * as salesApi from '../api/sales.api';
import type { Sale, SaleFilters, Product } from '../types';

const SalesPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalSales, setTotalSales] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
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

  const handlePrintInvoice = async (sale: Sale) => {
    setSelectedSale(sale);
    // Open in new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      const invoiceHtml = generateInvoiceHtml(sale);
      printWindow.document.write(invoiceHtml);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const generateInvoiceHtml = (sale: Sale) => {
    const itemsHtml = sale.items.map(item => {
      const productName = typeof item.product === 'object' ? (item.product as Product).name : 'Product';
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${productName}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${item.price.toFixed(2)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${item.subtotal.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${sale.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          h1 { text-align: center; }
          .header { text-align: center; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #f5f5f5; padding: 10px; text-align: left; }
          .totals { margin-top: 20px; text-align: right; }
          .total-row { display: flex; justify-content: space-between; max-width: 300px; margin-left: auto; padding: 5px 0; }
          .grand-total { font-weight: bold; font-size: 1.2em; border-top: 2px solid #000; padding-top: 10px; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>INVOICE</h1>
          <p><strong>Invoice #:</strong> ${sale.invoiceNumber}</p>
          <p><strong>Date:</strong> ${new Date(sale.createdAt).toLocaleString()}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Price</th>
              <th style="text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row"><span>Subtotal:</span> <span>$${sale.subtotal.toFixed(2)}</span></div>
          <div class="total-row"><span>Tax:</span> <span>$${sale.taxTotal.toFixed(2)}</span></div>
          ${sale.discount > 0 ? `<div class="total-row"><span>Discount:</span> <span>-$${sale.discount.toFixed(2)}</span></div>` : ''}
          <div class="total-row grand-total"><span>Grand Total:</span> <span>$${sale.grandTotal.toFixed(2)}</span></div>
          <div class="total-row"><span>Paid:</span> <span>$${sale.paidAmount.toFixed(2)}</span></div>
          ${sale.balanceAmount > 0 ? `<div class="total-row"><span>Balance Due:</span> <span>$${sale.balanceAmount.toFixed(2)}</span></div>` : ''}
        </div>

        <p style="text-align: center; margin-top: 40px; color: #666;">Thank you for your business!</p>
        <button onclick="window.print()" style="display: block; margin: 20px auto; padding: 10px 30px; cursor: pointer;">Print Invoice</button>
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
      key: 'items', 
      header: 'Items',
      render: (sale: Sale) => sale.items.length
    },
    { 
      key: 'grandTotal', 
      header: 'Total',
      render: (sale: Sale) => `$${sale.grandTotal.toFixed(2)}`
    },
    { 
      key: 'paidAmount', 
      header: 'Paid',
      render: (sale: Sale) => `$${sale.paidAmount.toFixed(2)}`
    },
    { 
      key: 'balanceAmount', 
      header: 'Balance',
      render: (sale: Sale) => `$${sale.balanceAmount.toFixed(2)}`
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
        <div className="mb-4 flex gap-4">
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
            onClick={() => setFilters({ page: 1, limit: 20 })}
            variant="ghost"
          >
            Clear Filters
          </Button>
        </div>

        <Table
          columns={columns}
          data={sales}
          keyExtractor={(sale) => sale._id}
          loading={loading}
          emptyMessage="No sales found"
        />

        {/* Pagination */}
        {totalSales > (filters.limit || 20) && (
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
              Amount: ${selectedSale?.grandTotal.toFixed(2)}
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
                  <span className="text-gray-500">Sale Type:</span>
                  <span className="ml-2 capitalize">{(selectedSale as any).saleType?.toLowerCase() || 'POS'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <span className="ml-2">{selectedSale.status}</span>
                </div>
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
                            <td className="text-right p-2">${item.price.toFixed(2)}</td>
                            <td className="text-right p-2">${item.subtotal.toFixed(2)}</td>
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
                  <span>${selectedSale.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>${selectedSale.taxTotal.toFixed(2)}</span>
                </div>
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span>-${selectedSale.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Grand Total:</span>
                  <span>${selectedSale.grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid:</span>
                  <span>${selectedSale.paidAmount.toFixed(2)}</span>
                </div>
                {selectedSale.balanceAmount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Balance Due:</span>
                    <span>${selectedSale.balanceAmount.toFixed(2)}</span>
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
                        <span>${payment.amount.toFixed(2)}</span>
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
                          <span>-${refund.amount.toFixed(2)}</span>
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
                  Paid Amount: <strong>${selectedSale.paidAmount.toFixed(2)}</strong>
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
                  Max refundable: ${selectedSale.paidAmount.toFixed(2)}
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
