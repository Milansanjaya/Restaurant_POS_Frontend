import { useEffect, useState, Fragment as React } from 'react';
import toast from 'react-hot-toast';
import { Layout, PageHeader, PageContent, Button, Table, Badge, getStatusBadgeVariant, Modal, Card, Input, PageLoader } from '../components';
import { grnApi, purchaseOrdersApi, suppliersApi } from '../api';
import type { GRN, GRNFormData, GRNItem, PurchaseOrder, Supplier, QualityStatus } from '../types';

export default function GRNPage() {
  const [grns, setGrns] = useState<GRN[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState<GRN | null>(null);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Filter states
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');

  const [formData, setFormData] = useState<GRNFormData>({
    purchaseOrder_id: '',
    supplier_id: '',
    items: [],
    totalAmount: 0,
    notes: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [grnRes, poRes, supplierRes] = await Promise.all([
        grnApi.getAll({ 
          status: filterStatus || undefined,
          supplierId: filterSupplier || undefined 
        }),
        purchaseOrdersApi.getAll({ status: 'APPROVED' }),
        suppliersApi.getAll(),
      ]);
      setGrns(grnRes.grns || []);
      setPurchaseOrders(poRes.purchaseOrders || []);
      setSuppliers(supplierRes.suppliers || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('❌ Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterStatus, filterSupplier]);

  const openCreateModal = (po: PurchaseOrder) => {
    setEditingId(null);
    setSelectedPO(po);
    const supplierId = typeof po.supplier_id === 'object' ? po.supplier_id._id : po.supplier_id;
    
    const items: GRNItem[] = po.items.map((item) => ({
      product_id: item.product_id,
      productName: item.productName,
      orderedQuantity: item.quantity,
      receivedQuantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      qualityStatus: 'ACCEPTED' as QualityStatus,
      batchNumber: '',
      expiryDate: '',
    }));

    setFormData({
      purchaseOrder_id: po._id,
      supplier_id: supplierId,
      items,
      totalAmount: po.totalAmount,
      notes: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (grn: GRN) => {
    setEditingId(grn._id);
    setSelectedPO(null);
    setFormData({
      purchaseOrder_id: typeof grn.purchaseOrder_id === 'object' ? grn.purchaseOrder_id._id : grn.purchaseOrder_id,
      supplier_id: typeof grn.supplier_id === 'object' ? grn.supplier_id._id : grn.supplier_id,
      items: grn.items,
      totalAmount: grn.totalAmount,
      notes: grn.notes || '',
    });
    setModalOpen(true);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    (newItems[index] as any)[field] = value;
    
    if (field === 'receivedQuantity') {
      newItems[index].totalPrice = value * newItems[index].unitPrice;
    }
    
    const total = newItems.reduce((sum, i) => sum + i.totalPrice, 0);
    setFormData({ ...formData, items: newItems, totalAmount: total });
  };

  const handleSave = async () => {
    // Validation
    if (!formData.items || formData.items.length === 0) {
      toast.error('❌ Please add at least one item');
      return;
    }

    // Validate all items
    for (const item of formData.items) {
      if (!item.receivedQuantity || item.receivedQuantity < 0) {
        toast.error(`❌ Invalid received quantity for ${item.productName}`);
        return;
      }

      if (item.qualityStatus === 'REJECTED' || item.qualityStatus === 'PARTIAL') {
        if (!item.rejectionReason || item.rejectionReason.trim() === '') {
          toast.error(`❌ Please provide rejection reason for ${item.productName}`);
          return;
        }
      }

      if (item.batchNumber && item.batchNumber.trim() !== '' && !item.expiryDate) {
        toast.error(`❌ Please provide expiry date for batch ${item.batchNumber}`);
        return;
      }
    }

    try {
      setSaving(true);
      if (editingId) {
        await grnApi.update(editingId, formData);
        toast.success('✅ GRN updated successfully');
      } else {
        await grnApi.create(formData);
        toast.success('✅ GRN created successfully');
      }
      setModalOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || '❌ Failed to save GRN');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this GRN? This cannot be undone.')) return;
    try {
      await grnApi.delete(id);
      toast.success('✅ GRN deleted successfully');
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || '❌ Failed to delete GRN');
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Approve GRN? This will update inventory and supplier balance.')) return;
    try {
      await grnApi.approve(id);
      toast.success('💰 GRN approved! Inventory and batches updated');
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || '❌ Failed to approve GRN');
    }
  };

  const handleViewDetails = (grn: GRN) => {
    setSelectedGRN(grn);
    setDetailModalOpen(true);
  };

  const handlePrintGRN = () => {
    if (!selectedGRN) return;
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>GRN - ${selectedGRN.grnNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .details { margin-bottom: 20px; }
          .details div { margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f4f4f4; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #333; }
          .signature { margin-top: 50px; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>GOODS RECEIVED NOTE</h1>
          <h2>${selectedGRN.grnNumber}</h2>
        </div>
        
        <div class="details">
          <div><strong>Supplier:</strong> ${typeof selectedGRN.supplier_id === 'object' ? selectedGRN.supplier_id.name : '-'}</div>
          <div><strong>PO Number:</strong> ${typeof selectedGRN.purchaseOrder_id === 'object' ? selectedGRN.purchaseOrder_id.poNumber : '-'}</div>
          <div><strong>Received Date:</strong> ${new Date(selectedGRN.receivedDate).toLocaleDateString()}</div>
          <div><strong>Status:</strong> ${selectedGRN.status}</div>
          ${selectedGRN.notes ? `<div><strong>Notes:</strong> ${selectedGRN.notes}</div>` : ''}
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Ordered</th>
              <th>Received</th>
              <th>Quality</th>
              <th>Batch#</th>
              <th>Expiry</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${selectedGRN.items.map(item => `
              <tr>
                <td>${item.productName}</td>
                <td>${item.orderedQuantity || item.purchasedQuantity || '-'}</td>
                <td>${item.receivedQuantity}</td>
                <td>${item.qualityStatus}</td>
                <td>${item.batchNumber || '-'}</td>
                <td>${item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '-'}</td>
                <td>Rs. ${item.unitPrice.toLocaleString()}</td>
                <td>Rs. ${item.totalPrice.toLocaleString()}</td>
              </tr>
              ${item.rejectionReason ? `<tr><td colspan="8" style="background: #fff3cd; font-size: 0.9em;">⚠️ Rejection Reason: ${item.rejectionReason}</td></tr>` : ''}
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <th colspan="7">TOTAL</th>
              <th>Rs. ${selectedGRN.totalAmount.toLocaleString()}</th>
            </tr>
          </tfoot>
        </table>
        
        <div class="footer">
          <div class="signature">
            <div style="display: inline-block; width: 45%;">
              <div>_________________________</div>
              <div>Received By</div>
              <div>Date: ___________________</div>
            </div>
            <div style="display: inline-block; width: 45%; float: right;">
              <div>_________________________</div>
              <div>Approved By</div>
              <div>Date: ___________________</div>
            </div>
          </div>
        </div>
        
        <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background: #333; color: white; border: none; cursor: pointer;">Print</button>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  };

  const columns = [
    { key: 'grnNumber', header: 'GRN Number' },
    {
      key: 'supplier',
      header: 'Supplier',
      render: (item: GRN) =>
        (item.supplier_id && typeof item.supplier_id === 'object') ? item.supplier_id.name : '-',
    },
    {
      key: 'po',
      header: 'PO Number',
      render: (item: GRN) =>
        (item.purchaseOrder_id && typeof item.purchaseOrder_id === 'object') ? item.purchaseOrder_id.poNumber : '-',
    },
    {
      key: 'totalAmount',
      header: 'Total',
      render: (item: GRN) => `Rs. ${item.totalAmount.toLocaleString()}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: GRN) => (
        <Badge variant={getStatusBadgeVariant(item.status)}>{item.status}</Badge>
      ),
    },
    {
      key: 'receivedDate',
      header: 'Received',
      render: (item: GRN) => new Date(item.receivedDate).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: GRN) => (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => handleViewDetails(item)}>
            View
          </Button>
          {item.status === 'DRAFT' && (
            <>
              <Button size="sm" variant="ghost" onClick={() => openEditModal(item)}>
                Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleApprove(item._id)}>
                Approve
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleDelete(item._id)}>
                Delete
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <PageHeader
        title="Goods Received Notes"
        subtitle="Receive goods against purchase orders"
      />
      <PageContent>
        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="w-48">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="APPROVED">Approved</option>
              <option value="RECEIVED">Received</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          
          <div className="w-48">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Supplier</label>
            <select
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All Suppliers</option>
              {suppliers.map((supplier) => (
                <option key={supplier._id} value={supplier._id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Pending POs to receive */}
        {purchaseOrders.length > 0 && (
          <Card className="mb-6">
            <h3 className="mb-3 font-medium text-slate-900">Approved POs Ready to Receive</h3>
            <div className="space-y-2">
              {purchaseOrders.map((po) => (
                <div key={po._id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{po.poNumber}</p>
                    <p className="text-sm text-slate-500">
                      {(po.supplier_id && typeof po.supplier_id === 'object') ? po.supplier_id.name : '-'} • 
                      {po.items?.length || 0} items • Rs. {po.totalAmount?.toLocaleString() || 0}
                    </p>
                  </div>
                  <Button onClick={() => openCreateModal(po)}>Receive</Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Table
          columns={columns}
          data={grns}
          keyExtractor={(item) => item._id}
          loading={loading}
          emptyMessage="No GRNs found"
        />
      </PageContent>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Receive Goods: ${selectedPO?.poNumber || ''}`}
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>
              Create GRN
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-3">
            {formData.items.map((item, index) => (
              <Card key={index} padding="sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-sm text-slate-500">Ordered: {item.orderedQuantity}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Input
                      label="Received"
                      type="number"
                      value={item.receivedQuantity}
                      onChange={(e) => updateItem(index, 'receivedQuantity', parseInt(e.target.value) || 0)}
                      className="w-24"
                    />
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Quality</label>
                      <select
                        value={item.qualityStatus}
                        onChange={(e) => updateItem(index, 'qualityStatus', e.target.value)}
                        className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
                      >
                        <option value="ACCEPTED">Accepted</option>
                        <option value="PARTIAL">Partial</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                {/* Rejection Reason - show only if REJECTED or PARTIAL */}
                {(item.qualityStatus === 'REJECTED' || item.qualityStatus === 'PARTIAL') && (
                  <div className="mt-3">
                    <Input
                      label="Rejection Reason"
                      value={item.rejectionReason || ''}
                      onChange={(e) => updateItem(index, 'rejectionReason', e.target.value)}
                      placeholder="e.g., Damaged packaging, expired, poor quality..."
                    />
                  </div>
                )}
                
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Input
                    label="Batch Number"
                    value={item.batchNumber || ''}
                    onChange={(e) => updateItem(index, 'batchNumber', e.target.value)}
                    placeholder="BATCH-001"
                  />
                  <Input
                    label="Expiry Date"
                    type="date"
                    value={item.expiryDate || ''}
                    onChange={(e) => updateItem(index, 'expiryDate', e.target.value)}
                  />
                </div>
              </Card>
            ))}
          </div>

          <div className="text-right font-bold text-lg">
            Total: Rs. {formData.totalAmount.toLocaleString()}
          </div>

          <Input
            label="Notes"
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>
      </Modal>

      {/* GRN Detail View Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={`GRN Details - ${selectedGRN?.grnNumber || ''}`}
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setDetailModalOpen(false)}>Close</Button>
            <Button onClick={handlePrintGRN}>🖨️ Print</Button>
          </>
        }
      >
        {selectedGRN && (
          <div className="space-y-6">
            {/* GRN Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">GRN Number</label>
                <p className="text-slate-900">{selectedGRN.grnNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Status</label>
                <div className="mt-1">
                  <Badge variant={getStatusBadgeVariant(selectedGRN.status)}>
                    {selectedGRN.status}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Supplier</label>
                <p className="text-slate-900">
                  {typeof selectedGRN.supplier_id === 'object' ? selectedGRN.supplier_id.name : '-'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">PO Number</label>
                <p className="text-slate-900">
                  {typeof selectedGRN.purchaseOrder_id === 'object' ? selectedGRN.purchaseOrder_id.poNumber : '-'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Received Date</label>
                <p className="text-slate-900">{new Date(selectedGRN.receivedDate).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Total Amount</label>
                <p className="text-slate-900 font-bold">Rs. {selectedGRN.totalAmount.toLocaleString()}</p>
              </div>
            </div>

            {selectedGRN.notes && (
              <div>
                <label className="text-sm font-medium text-slate-700">Notes</label>
                <p className="text-slate-600 text-sm mt-1">{selectedGRN.notes}</p>
              </div>
            )}

            {/* Items Table */}
            <div>
              <h3 className="font-medium text-slate-900 mb-3">Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Product</th>
                      <th className="px-3 py-2 text-left">Ordered</th>
                      <th className="px-3 py-2 text-left">Received</th>
                      <th className="px-3 py-2 text-left">Quality</th>
                      <th className="px-3 py-2 text-left">Batch#</th>
                      <th className="px-3 py-2 text-left">Expiry</th>
                      <th className="px-3 py-2 text-right">Unit Price</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedGRN.items.map((item, idx) => (
                      <React.Fragment key={idx}>
                        <tr>
                          <td className="px-3 py-2">{item.productName}</td>
                          <td className="px-3 py-2">{item.orderedQuantity || item.purchasedQuantity || '-'}</td>
                          <td className="px-3 py-2">{item.receivedQuantity}</td>
                          <td className="px-3 py-2">
                            <Badge variant={
                              item.qualityStatus === 'ACCEPTED' ? 'success' :
                              item.qualityStatus === 'REJECTED' ? 'danger' : 'warning'
                            }>
                              {item.qualityStatus}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">{item.batchNumber || '-'}</td>
                          <td className="px-3 py-2">
                            {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-3 py-2 text-right">Rs. {item.unitPrice.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">Rs. {item.totalPrice.toLocaleString()}</td>
                        </tr>
                        {item.rejectionReason && (
                          <tr>
                            <td colSpan={8} className="px-3 py-2 bg-yellow-50 text-sm">
                              <span className="font-medium">⚠️ Rejection Reason:</span> {item.rejectionReason}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold">
                    <tr>
                      <td colSpan={7} className="px-3 py-2 text-right">TOTAL:</td>
                      <td className="px-3 py-2 text-right">Rs. {selectedGRN.totalAmount.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Approval Info */}
            {selectedGRN.status === 'APPROVED' && selectedGRN.approvedAt && (
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-800">
                  ✅ Approved on {new Date(selectedGRN.approvedAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </Layout>
  );
}
