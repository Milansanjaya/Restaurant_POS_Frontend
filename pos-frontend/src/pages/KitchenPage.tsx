import { useEffect, useState, useCallback } from 'react';
import { Layout, PageHeader, PageContent } from '../components/Layout';
import { Button, Badge, Card } from '../components';
import { kitchenApi } from '../api/kitchen.api';
import type { KitchenOrder, KitchenDashboard, KitchenOrderStatus } from '../types';

const statusFlow: KitchenOrderStatus[] = ['PENDING', 'PREPARING', 'READY', 'SERVED'];

const statusColors: Record<KitchenOrderStatus, 'warning' | 'info' | 'success' | 'default'> = {
  PENDING: 'warning',
  PREPARING: 'info',
  READY: 'success',
  SERVED: 'default',
};

const statusLabels: Record<KitchenOrderStatus, string> = {
  PENDING: '🔴 Pending',
  PREPARING: '🟡 Preparing',
  READY: '🟢 Ready',
  SERVED: '✅ Served',
};

export default function KitchenPage() {
  const [dashboard, setDashboard] = useState<KitchenDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<KitchenOrderStatus | 'ALL'>('ALL');

  const loadDashboard = useCallback(async () => {
    try {
      const data = await kitchenApi.getDashboard();
      setDashboard(data);
    } catch (err) {
      console.error('Failed to load kitchen dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  const handleStatusUpdate = async (order: KitchenOrder, newStatus: KitchenOrderStatus) => {
    try {
      await kitchenApi.updateStatus(order._id, newStatus);
      loadDashboard();
    } catch (err) {
      console.error('Failed to update order status:', err);
    }
  };

  const getNextStatus = (currentStatus: KitchenOrderStatus): KitchenOrderStatus | null => {
    const currentIndex = statusFlow.indexOf(currentStatus);
    if (currentIndex < statusFlow.length - 1) {
      return statusFlow[currentIndex + 1];
    }
    return null;
  };

  const filteredOrders = dashboard?.orders.filter((order) =>
    filter === 'ALL' ? order.status !== 'SERVED' : order.status === filter
  ) || [];

  return (
    <Layout>
      <PageHeader
        title="Kitchen Display"
        action={
          <Button variant="secondary" onClick={loadDashboard}>
            Refresh
          </Button>
        }
      />

      <PageContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            {dashboard && (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Card className="p-4 text-center">
                  <div className="text-3xl font-bold text-red-600">
                    {dashboard.summary.pendingCount}
                  </div>
                  <div className="text-sm text-slate-500">Pending</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-3xl font-bold text-yellow-600">
                    {dashboard.summary.preparingCount}
                  </div>
                  <div className="text-sm text-slate-500">Preparing</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {dashboard.summary.readyCount}
                  </div>
                  <div className="text-sm text-slate-500">Ready</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-3xl font-bold text-slate-600">
                    {dashboard.summary.totalActive}
                  </div>
                  <div className="text-sm text-slate-500">Total Active</div>
                </Card>
              </div>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-2">
              {(['ALL', 'PENDING', 'PREPARING', 'READY'] as const).map((status) => (
                <Button
                  key={status}
                  variant={filter === status ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setFilter(status)}
                >
                  {status === 'ALL' ? 'All Active' : status}
                </Button>
              ))}
            </div>

            {/* Orders Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredOrders.map((order) => {
                const nextStatus = getNextStatus(order.status);
                return (
                  <Card
                    key={order._id}
                    className={`p-4 ${
                      order.status === 'PENDING'
                        ? 'border-l-4 border-l-red-500'
                        : order.status === 'PREPARING'
                        ? 'border-l-4 border-l-yellow-500'
                        : 'border-l-4 border-l-green-500'
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        {order.tableNumber && (
                          <div className="text-lg font-bold text-slate-900">
                            Table {order.tableNumber}
                          </div>
                        )}
                        {order.section && (
                          <div className="text-xs text-slate-500">{order.section}</div>
                        )}
                      </div>
                      <Badge variant={statusColors[order.status]}>
                        {statusLabels[order.status]}
                      </Badge>
                    </div>

                    {/* Order Items */}
                    <div className="mb-3 space-y-1">
                      {order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between text-sm"
                        >
                          <span className="font-medium">{item.name}</span>
                          <span className="text-slate-500">x{item.quantity}</span>
                        </div>
                      ))}
                    </div>

                    {/* Time Info */}
                    <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {new Date(order.createdAt).toLocaleTimeString()}
                      </span>
                      {order.waitingMinutes !== undefined && (
                        <span
                          className={`font-medium ${
                            order.waitingMinutes > 15
                              ? 'text-red-600'
                              : order.waitingMinutes > 10
                              ? 'text-yellow-600'
                              : 'text-slate-600'
                          }`}
                        >
                          {order.waitingMinutes} min wait
                        </span>
                      )}
                    </div>

                    {/* Action Button */}
                    {nextStatus && (
                      <Button
                        className="w-full"
                        variant={order.status === 'PENDING' ? 'primary' : 'secondary'}
                        onClick={() => handleStatusUpdate(order, nextStatus)}
                      >
                        {order.status === 'PENDING'
                          ? 'Start Preparing'
                          : order.status === 'PREPARING'
                          ? 'Mark Ready'
                          : 'Mark Served'}
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>

            {filteredOrders.length === 0 && (
              <div className="rounded-lg bg-slate-50 p-12 text-center">
                <p className="text-slate-500">
                  {filter === 'ALL'
                    ? 'No active orders in the kitchen'
                    : `No ${filter.toLowerCase()} orders`}
                </p>
              </div>
            )}
          </div>
        )}
      </PageContent>
    </Layout>
  );
}
