import { useEffect, useState } from 'react';
import { Layout, PageHeader, PageContent, Button, Table, Badge, getStatusBadgeVariant, Modal, Card, Input, PageLoader } from '../components';
import { returnsApi, suppliersApi, grnApi } from '../api';
import type { SupplierReturn, SupplierReturnFormData, SupplierReturnItem, Supplier, GRN } from '../types';

export default function ReturnsPage() {
  const [returns, setReturns] = useState<SupplierReturn[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [grns, setGrns] = useState<GRN[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<SupplierReturnFormData>({
    supplier_id: '',
    items: [],
    totalAmount: 0,
    notes: '',
  });

  const [newItem, setNewItem] = useState<SupplierReturnItem>({
    product_id: '',
    productName: '',
    quantity: 1,
    reason: '',
    unitPrice: 0,
    totalPrice: 0,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [returnsRes, suppliersRes, grnRes] = await Promise.all([
        returnsApi.getAll({ status: statusFilter as any || undefined }),
        suppliersApi.getAll({}),
        grnApi.getAll({ status: 'APPROVED' }),
      ]);
      setReturns(returnsRes.returns || []);
      setSuppliers(suppliersRes.suppliers || []);
      setGrns(grnRes.grns || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      supplier_id: '',
      items: [],
      totalAmount: 0,
      notes: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (ret: SupplierReturn) => {
    setEditingId(ret._id);
    setFormData({
      supplier_id: typeof ret.supplier_id === 'object' ? ret.supplier_id._id : ret.supplier_id,
      grn_id: ret.grn_id,
      items: ret.items,
      totalAmount: ret.totalAmount,
      notes: ret.notes || '',
    });
    setModalOpen(true);
  };

  const addItem = () => {
    if (!newItem.productName || newItem.quantity <= 0) return;
    const item = {
      ...newItem,
      totalPrice: newItem.quantity * newItem.unitPrice,
    };
    const newItems = [...formData.items, item];
    const total = newItems.reduce((sum, i) => sum + i.totalPrice, 0);
    setFormData({ ...formData, items: newItems, totalAmount: total });
    setNewItem({
      product_id: '',
      productName: '',
      quantity: 1,
      reason: '',
      unitPrice: 0,
      totalPrice: 0,
    });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    const total = newItems.reduce((sum, i) => sum + i.totalPrice, 0);
    setFormData({ ...formData, items: newItems, totalAmount: total });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (editingId) {
        await returnsApi.update(editingId, formData);
      } else {
        await returnsApi.create(formData);
      }
      setModalOpen(false);
      loadData();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to save return');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this return? This cannot be undone.')) return;
    try {
      await returnsApi.delete(id);
      loadData();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to delete return');
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Approve return? This will deduct stock and update supplier balance.')) return;
    try {
      await returnsApi.approve(id);
      loadData();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to approve return');
    }
  };

  const columns = [
    { key: 'returnNumber', header: 'Return #' },
    {
      key: 'supplier',
      header: 'Supplier',
      render: (item: SupplierReturn) =>
        typeof item.supplier_id === 'object' ? item.supplier_id.name : '-',
    },
    {
      key: 'items',
      header: 'Items',
      render: (item: SupplierReturn) => item.items.length,
    },
    {
      key: 'totalAmount',
      header: 'Total',
      render: (item: SupplierReturn) => `Rs. ${item.totalAmount.toLocaleString()}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: SupplierReturn) => (
        <Badge variant={getStatusBadgeVariant(item.status)}>{item.status}</Badge>
      ),
    },
    {
      key: 'returnDate',
      header: 'Date',
      render: (item: SupplierReturn) => new Date(item.returnDate).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: SupplierReturn) => (
        <div className="flex gap-1">
          {item.status === 'PENDING' && (
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
        title="Supplier Returns"
        subtitle="Manage returns to suppliers"
        actions={<Button onClick={openCreateModal}>+ Create Return</Button>}
      />
      <PageContent>
        <div className="mb-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        <Table
          columns={columns}
          data={returns}
          keyExtractor={(item) => item._id}
          loading={loading}
          emptyMessage="No returns found"
        />
      </PageContent>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Supplier Return"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving} disabled={formData.items.length === 0}>
              Create Return
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Supplier</label>
            <select
              value={formData.supplier_id}
              onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select Supplier</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>

          <Card padding="sm">
            <h4 className="mb-3 font-medium">Add Return Item</h4>
            <div className="space-y-2">
              <Input
                placeholder="Product Name"
                value={newItem.productName}
                onChange={(e) => setNewItem({ ...newItem, productName: e.target.value })}
              />
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="Qty"
                  type="number"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                />
                <Input
                  placeholder="Unit Price"
                  type="number"
                  value={newItem.unitPrice}
                  onChange={(e) => setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) || 0 })}
                />
                <Button onClick={addItem}>Add</Button>
              </div>
              <Input
                placeholder="Reason for return"
                value={newItem.reason}
                onChange={(e) => setNewItem({ ...newItem, reason: e.target.value })}
              />
            </div>
          </Card>

          {formData.items.length > 0 && (
            <div className="space-y-2">
              {formData.items.map((item, index) => (
                <div key={index} className="flex justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-sm text-slate-500">
                      {item.quantity} x Rs. {item.unitPrice} • {item.reason}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">Rs. {item.totalPrice.toLocaleString()}</span>
                    <Button size="sm" variant="ghost" onClick={() => removeItem(index)}>×</Button>
                  </div>
                </div>
              ))}
              <div className="text-right font-bold text-lg">
                Total: Rs. {formData.totalAmount.toLocaleString()}
              </div>
            </div>
          )}

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
