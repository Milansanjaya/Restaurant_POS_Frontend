import { useEffect, useState } from 'react';
import { Layout, PageHeader, PageContent, Card, StatCard, Table, Badge, getStatusBadgeVariant, Button, PageLoader } from '../components';
import { batchesApi } from '../api';
import type { Batch, ExpiryDashboard } from '../types';

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [dashboard, setDashboard] = useState<ExpiryDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [alertFilter, setAlertFilter] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [batchRes, dashboardData] = await Promise.all([
        batchesApi.getAll({ alertStatus: alertFilter as any || undefined }),
        batchesApi.getExpiryDashboard(),
      ]);
      setBatches(batchRes.batches || []);
      setDashboard(dashboardData);
    } catch (error) {
      console.error('Failed to load data:', error);
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
      loadData();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to toggle batch');
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
      render: (item: Batch) => `${item.remainingQuantity} / ${item.quantity}`,
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
        <span className={item.daysUntilExpiry < 0 ? 'text-red-600' : item.daysUntilExpiry < 7 ? 'text-yellow-600' : ''}>
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
        <Button
          size="sm"
          variant={item.status === 'BLOCKED' ? 'ghost' : 'danger'}
          onClick={() => handleToggleBlock(item._id)}
        >
          {item.status === 'BLOCKED' ? 'Unblock' : 'Block'}
        </Button>
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
      />
      <PageContent>
        {/* Dashboard Stats */}
        {dashboard && (
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
            <StatCard title="Total Batches" value={dashboard.totalBatches} />
            <StatCard title="Normal" value={dashboard.normalCount} />
            <StatCard title="Warning (<30d)" value={dashboard.warningCount} />
            <StatCard title="Critical (<7d)" value={dashboard.criticalCount} />
            <StatCard title="Expired" value={dashboard.expiredCount} />
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
      </PageContent>
    </Layout>
  );
}
