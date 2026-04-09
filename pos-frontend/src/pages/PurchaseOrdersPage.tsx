import { useState, useEffect } from 'react';
import { Layout, PageHeader, PageContent, Button, Input, Table, Badge, getStatusBadgeVariant, Modal, Card } from '../components';
import { purchaseOrdersApi, suppliersApi, productsApi } from '../api';
import type { PurchaseOrder, PurchaseOrderFormData, PurchaseOrderItem, Supplier, Product } from '../types';

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<PurchaseOrderFormData>({
    supplier_id: '',
    items: [],
    totalAmount: 0,
    deliveryDate: '',
    notes: '',
  });

  const [newItem, setNewItem] = useState({
    product_id: '',
    quantity: 1,
    unitPrice: 0,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersRes, suppliersRes, productsRes] = await Promise.all([
        purchaseOrdersApi.getAll({ status: statusFilter as any || undefined }),
        suppliersApi.getAll({}),
        productsApi.getAll({ limit: 1000 }),
      ]);
      setOrders(ordersRes.purchaseOrders || []);
      setSuppliers(suppliersRes.suppliers || []);
      setProducts(productsRes.products || []);
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
      deliveryDate: '',
      notes: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (order: PurchaseOrder) => {
    setEditingId(order._id);
    setFormData({
      supplier_id: typeof order.supplier_id === 'object' ? order.supplier_id._id : order.supplier_id,
      items: order.items,
      totalAmount: order.totalAmount,
      deliveryDate: order.deliveryDate ? order.deliveryDate.slice(0, 10) : '',
      notes: order.notes || '',
    });
    setModalOpen(true);
  };

  const addItem = () => {
    if (!newItem.product_id || newItem.quantity <= 0) return;
    const product = products.find((p) => p._id === newItem.product_id);
    if (!product) return;

    const item: PurchaseOrderItem = {
      product_id: newItem.product_id,
      productName: product.name,
      quantity: newItem.quantity,
      unitPrice: newItem.unitPrice || product.cost,
      totalPrice: newItem.quantity * (newItem.unitPrice || product.cost),
    };

    const newItems = [...formData.items, item];
    const total = newItems.reduce((sum, i) => sum + i.totalPrice, 0);
    
    setFormData({ ...formData, items: newItems, totalAmount: total });
    setNewItem({ product_id: '', quantity: 1, unitPrice: 0 });
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
        await purchaseOrdersApi.update(editingId, formData);
      } else {
        await purchaseOrdersApi.create(formData);
      }
      setModalOpen(false);
      loadData();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to save PO');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Are you sure you want to approve this PO?')) return;
    try {
      await purchaseOrdersApi.approve(id);
      loadData();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to approve PO');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this PO?')) return;
    try {
      await purchaseOrdersApi.cancel(id);
      loadData();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to cancel PO');
    }
  };

  const columns = [
    { key: 'poNumber', header: 'PO Number' },
    {
      key: 'supplier',
      header: 'Supplier',
      render: (item: PurchaseOrder) =>
        (item.supplier_id && typeof item.supplier_id === 'object') ? item.supplier_id.name : '-',
    },
    {
      key: 'items',
      header: 'Items',
      render: (item: PurchaseOrder) => item.items?.length || 0,
    },
    {
      key: 'totalAmount',
      header: 'Total',
      render: (item: PurchaseOrder) => `Rs. ${item.totalAmount.toLocaleString()}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: PurchaseOrder) => (
        <Badge variant={getStatusBadgeVariant(item.status)}>{item.status}</Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (item: PurchaseOrder) => new Date(item.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: PurchaseOrder) => (
        <div className="flex gap-1">
          {(item.status === 'DRAFT' || item.status === 'PENDING') && (
            <Button size="sm" variant="ghost" onClick={() => openEditModal(item)}>
              Edit
            </Button>
          )}
          {item.status === 'PENDING' && (
            <>
              <Button size="sm" variant="ghost" onClick={() => handleApprove(item._id)}>
                Approve
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleCancel(item._id)}>
                Cancel
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
        title="Purchase Orders"
        subtitle="Manage procurement orders"
        actions={<Button onClick={openCreateModal}>+ Create PO</Button>}
      />
      <PageContent>
        <div className="mb-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="RECEIVED">Received</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <Table
          columns={columns}
          data={orders}
          keyExtractor={(item) => item._id}
          loading={loading}
          emptyMessage="No purchase orders found"
        />
      </PageContent>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Purchase Order"
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving} disabled={formData.items.length === 0}>
              Create PO
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
            <Input
              label="Expected Delivery"
              type="date"
              value={formData.deliveryDate || ''}
              onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
            />
          </div>

          {/* Add Item */}
          <Card padding="sm">
            <h4 className="mb-3 font-medium">Add Item</h4>
            <div className="flex gap-2">
              <select
                value={newItem.product_id}
                onChange={(e) => {
                  const product = products.find((p) => p._id === e.target.value);
                  setNewItem({
                    ...newItem,
                    product_id: e.target.value,
                    unitPrice: product?.cost || 0,
                  });
                }}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select Product</option>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
                ))}
              </select>
              <Input
                placeholder="Qty"
                type="number"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                className="w-20"
              />
              <Input
                placeholder="Price"
                type="number"
                value={newItem.unitPrice}
                onChange={(e) => setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) || 0 })}
                className="w-24"
              />
              <Button onClick={addItem}>Add</Button>
            </div>
          </Card>

          {/* Items List */}
          {formData.items.length > 0 && (
            <div className="space-y-2">
              {formData.items.map((item, index) => (
                <div key={index} className="flex justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-sm text-slate-500">
                      {item.quantity} x Rs. {item.unitPrice}
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
