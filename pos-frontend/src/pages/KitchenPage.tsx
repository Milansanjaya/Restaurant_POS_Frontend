import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../store/auth.store';
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
  const user = useAuthStore((s) => s.user);
  const [dashboard, setDashboard] = useState<KitchenDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<KitchenOrderStatus | 'ALL'>('ALL');
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);

  // Debug: Log user info on mount
  useEffect(() => {
    console.log('👤 Current User:', user);
    console.log('🏢 Branch ID:', user?.branch_id);
    console.log('👮 Role:', user?.role?.name);
    console.log('🔑 Permissions:', user?.permissions);
  }, [user]);

  const loadDebug = async () => {
    try {
      const data = await kitchenApi.debug();
      setDebugInfo(data);
      setShowDebug(true);
      console.log('🔍 Debug Info:', data);
    } catch (err) {
      console.error('Debug error:', err);
    }
  };

  const loadDashboard = useCallback(async () => {
    try {
      const data = await kitchenApi.getDashboard();
      console.log('🍳 Kitchen Dashboard Data:', data);
      console.log('📊 Summary:', data.summary);
      console.log('📋 Orders count:', data.orders?.length);
      setDashboard(data);
    } catch (err: any) {
      console.error('❌ Failed to load kitchen dashboard:', err);
      console.error('Error details:', err.response?.data || err);
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
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={loadDebug}>
              🔍 Debug
            </Button>
            <Button variant="secondary" onClick={loadDashboard}>
              Refresh
            </Button>
          </div>
        }
      />

      <PageContent>
        {/* Debug Info Panel */}
        {showDebug && debugInfo && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-yellow-800">🔍 Debug Info</h3>
              <button onClick={() => setShowDebug(false)} className="text-yellow-600 hover:text-yellow-800">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>User:</strong> {debugInfo.currentUser?.name} ({debugInfo.currentUser?.email})</p>
                <p><strong>Role:</strong> {debugInfo.currentUser?.role}</p>
                <p><strong>User Branch ID:</strong> <code className="bg-yellow-100 px-1">{debugInfo.currentUser?.branch_id}</code></p>
              </div>
              <div>
                <p><strong>Total Active Orders:</strong> {debugInfo.kitchenData?.totalActiveOrders}</p>
                <p><strong>Orders for Your Branch:</strong> {debugInfo.kitchenData?.ordersForUserBranch}</p>
                <p><strong>Branch IDs in Orders:</strong> {debugInfo.kitchenData?.allBranchIdsInOrders?.join(', ') || 'None'}</p>
                <p><strong>Branch Match:</strong> {debugInfo.kitchenData?.branchMatch ? '✅ Yes' : '❌ No - This is the problem!'}</p>
              </div>
            </div>
            {!debugInfo.kitchenData?.branchMatch && debugInfo.kitchenData?.totalActiveOrders > 0 && (
              <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-red-800 text-sm">
                <strong>⚠️ Issue Found:</strong> Your user branch_id (<code>{debugInfo.currentUser?.branch_id}</code>) doesn't match any kitchen orders.
                <br />Orders exist with branch_id: <code>{debugInfo.kitchenData?.allBranchIdsInOrders?.join(', ')}</code>
                <br /><strong>Fix:</strong> Admin needs to update this user's branch_id to match.
              </div>
            )}
          </div>
        )}

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
