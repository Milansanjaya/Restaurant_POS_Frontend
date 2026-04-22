import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Layout, PageHeader, PageContent, StatCard, Table, Badge, getStatusBadgeVariant, Button, Modal, Input, PageLoader } from '../components';
import { batchesApi, productsApi } from '../api';
import type { Batch, ExpiryDashboard, Product } from '../types';
import type { CreateBatchData } from '../api/batches.api';
import { formatMoney } from '../money';

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dashboard, setDashboard] = useState<ExpiryDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [alertFilter, setAlertFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<CreateBatchData>({
    batchNumber: '',
    product_id: '',
    quantity: 0,
    costPerUnit: 0,
    expiryDate: '',
    manufactureDate: '',
  });

  const buildDashboardFromBatches = (list: Batch[]): ExpiryDashboard => {
    const stats: ExpiryDashboard = {
      totalBatches: list.length,
      normalCount: 0,
      warningCount: 0,
      criticalCount: 0,
      expiredCount: 0,
    };

    for (const batch of list) {
      if (batch.alertStatus === 'NORMAL') stats.normalCount += 1;
      else if (batch.alertStatus === 'WARNING') stats.warningCount += 1;
      else if (batch.alertStatus === 'CRITICAL') stats.criticalCount += 1;
      else if (batch.alertStatus === 'EXPIRED') stats.expiredCount += 1;
    }

    return stats;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [batchRes, dashboardData, productsRes] = await Promise.all([
        batchesApi.getAll({ alertStatus: alertFilter as any || undefined }),
        batchesApi.getExpiryDashboard(),
        productsApi.getAll({ limit: 1000 }),
      ]);

      const batchList: Batch[] = batchRes.data || batchRes.batches || [];
      const rawDashboard =
        (dashboardData as any)?.data ||
        (dashboardData as any)?.dashboard ||
        (dashboardData as any)?.summary ||
        dashboardData;

      const normalizedDashboard: ExpiryDashboard = {
        totalBatches: Number(rawDashboard?.totalBatches) || 0,
        normalCount: Number(rawDashboard?.normalCount) || 0,
        warningCount: Number(rawDashboard?.warningCount) || 0,
        criticalCount: Number(rawDashboard?.criticalCount) || 0,
        expiredCount: Number(rawDashboard?.expiredCount) || 0,
      };

      const shouldUseFallback = normalizedDashboard.totalBatches === 0 && batchList.length > 0;

      setBatches(batchList);
      setDashboard(shouldUseFallback ? buildDashboardFromBatches(batchList) : normalizedDashboard);
      setProducts(productsRes.products || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('❌ Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [alertFilter]);

  const handleToggleBlock = async (id: string) => {
    try {
      await batchesApi.toggleBlock(id);
      toast.success('✅ Batch status updated');
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to toggle batch');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this batch? This cannot be undone.')) return;
    try {
      await batchesApi.delete(id);
      toast.success('✅ Batch deleted');
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete batch');
    }
  };

  const openCreateModal = () => {
    setFormData({
      batchNumber: `BATCH-${Date.now()}`,
      product_id: '',
      quantity: 0,
      costPerUnit: 0,
      expiryDate: '',
      manufactureDate: '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.product_id) {
      toast.error('❌ Please select a product');
      return;
    }
    if (!formData.batchNumber) {
      toast.error('❌ Please enter a batch number');
      return;
    }
    if (formData.quantity <= 0) {
      toast.error('❌ Please enter a valid quantity');
      return;
    }
    if (!formData.expiryDate) {
      toast.error('❌ Please enter an expiry date');
      return;
    }
    
    try {
      setSaving(true);
      await batchesApi.create(formData);
      toast.success('✅ Batch created successfully');
      setModalOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create batch');
    } finally {
      setSaving(false);
    }
  };

  const getAlertBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
      NORMAL: 'success',
      WARNING: 'warning',
      CRITICAL: 'danger',
      EXPIRED: 'danger',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const columns = [
    { key: 'batchNumber', header: 'Batch #' },
    {
      key: 'product',
      header: 'Product',
      render: (item: Batch) =>
        typeof item.product_id === 'object' ? item.product_id.name : '-',
    },
    {
      key: 'remainingQuantity',
      header: 'Stock',
      render: (item: Batch) => (
        <span className={item.remainingQuantity === 0 ? 'text-red-600' : ''}>
          {item.remainingQuantity} / {item.quantity}
        </span>
      ),
    },
    {
      key: 'costPerUnit',
      header: 'Cost/Unit',
      render: (item: Batch) => item.costPerUnit === undefined ? '-' : formatMoney(item.costPerUnit),
    },
    {
      key: 'expiryDate',
      header: 'Expiry Date',
      render: (item: Batch) => new Date(item.expiryDate).toLocaleDateString(),
    },
    {
      key: 'daysUntilExpiry',
      header: 'Days Left',
      render: (item: Batch) => (
        <span className={item.daysUntilExpiry < 0 ? 'text-red-600 font-bold' : item.daysUntilExpiry < 7 ? 'text-yellow-600 font-medium' : ''}>
          {item.daysUntilExpiry < 0 ? `${Math.abs(item.daysUntilExpiry)} days ago` : `${item.daysUntilExpiry} days`}
        </span>
      ),
    },
    {
      key: 'alertStatus',
      header: 'Alert',
      render: (item: Batch) => getAlertBadge(item.alertStatus),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Batch) => (
        <Badge variant={getStatusBadgeVariant(item.status)}>{item.status}</Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Batch) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={item.status === 'BLOCKED' ? 'outline' : 'danger'}
            onClick={() => handleToggleBlock(item._id)}
          >
            {item.status === 'BLOCKED' ? 'Unblock' : 'Block'}
          </Button>
          {item.remainingQuantity === 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDelete(item._id)}
            >
              🗑️
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (loading && !dashboard) {
    return (
      <Layout>
        <PageLoader />
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title="Batch & Expiry Management"
        subtitle="Track product batches and expiry dates"
        actions={<Button onClick={openCreateModal}>+ Create Batch</Button>}
      />
      <PageContent>
        {/* Dashboard Stats */}
        {dashboard && (
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
            <StatCard title="Total Batches" value={dashboard.totalBatches ?? 0} />
            <StatCard title="Normal" value={dashboard.normalCount ?? 0} />
            <StatCard title="Warning (<30d)" value={dashboard.warningCount ?? 0} />
            <StatCard title="Critical (<7d)" value={dashboard.criticalCount ?? 0} />
            <StatCard title="Expired" value={dashboard.expiredCount ?? 0} />
          </div>
        )}

        {/* Filter */}
        <div className="mb-4">
          <select
            value={alertFilter}
            onChange={(e) => setAlertFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All Batches</option>
            <option value="NORMAL">Normal</option>
            <option value="WARNING">Warning</option>
            <option value="CRITICAL">Critical</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>

        <Table
          columns={columns}
          data={batches}
          keyExtractor={(item) => item._id}
          loading={loading}
          emptyMessage="No batches found"
        />

        {/* Create Batch Modal */}
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create Batch">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Batch Number</label>
              <Input
                value={formData.batchNumber}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                placeholder="BATCH-001"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Product</label>
              <select
                value={formData.product_id}
                onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select Product</option>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Quantity</label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Cost Per Unit</label>
                <Input
                  type="number"
                  value={formData.costPerUnit}
                  onChange={(e) => setFormData({ ...formData, costPerUnit: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Manufacture Date</label>
                <Input
                  type="date"
                  value={formData.manufactureDate}
                  onChange={(e) => setFormData({ ...formData, manufactureDate: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Expiry Date *</label>
                <Input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Creating...' : 'Create Batch'}
              </Button>
            </div>
          </div>
        </Modal>
      </PageContent>
    </Layout>
  );
}
