import { useEffect, useState } from 'react';
import { Layout, PageHeader, PageContent, Button, Table, Badge, getStatusBadgeVariant, Modal, Card, Input, PageLoader } from '../components';
import { grnApi, purchaseOrdersApi, suppliersApi } from '../api';
import type { GRN, GRNFormData, GRNItem, PurchaseOrder, Supplier, QualityStatus } from '../types';

export default function GRNPage() {
  const [grns, setGrns] = useState<GRN[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
      const [grnRes, poRes] = await Promise.all([
        grnApi.getAll({}),
        purchaseOrdersApi.getAll({ status: 'APPROVED' }),
      ]);
      setGrns(grnRes.grns || []);
      setPurchaseOrders(poRes.purchaseOrders || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
    try {
      setSaving(true);
      if (editingId) {
        await grnApi.update(editingId, formData);
      } else {
        await grnApi.create(formData);
      }
      setModalOpen(false);
      loadData();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to save GRN');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this GRN? This cannot be undone.')) return;
    try {
      await grnApi.delete(id);
      loadData();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to delete GRN');
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Approve GRN? This will update inventory and supplier balance.')) return;
    try {
      await grnApi.approve(id);
      loadData();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to approve GRN');
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
    </Layout>
  );
}
