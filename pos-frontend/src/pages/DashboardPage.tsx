import { useEffect, useState } from 'react';
import { Layout, PageHeader, PageContent, StatCard, Card, Badge, getStatusBadgeVariant, PageLoader } from '../components';
import { dashboardApi, reportsApi } from '../api';
import type { DashboardSummary, TopProduct, Inventory } from '../types';

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStock, setLowStock] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [summaryData, topProductsData, lowStockData] = await Promise.all([
          dashboardApi.getSummary(),
          dashboardApi.getTopProducts(5),
          reportsApi.getLowStock(),
        ]);
        setSummary(summaryData);
        setTopProducts(topProductsData);
        setLowStock(lowStockData);
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <Layout>
        <PageLoader />
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader title="Dashboard" subtitle="Overview of your business" />
      <PageContent>
        {/* Stats Grid */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Today's Revenue"
            value={`Rs. ${summary?.todayRevenue?.toLocaleString() || 0}`}
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Today's Orders"
            value={summary?.todayOrders || 0}
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <StatCard
            title="Low Stock Items"
            value={summary?.lowStockCount || 0}
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          />
          <StatCard
            title="Pending Kitchen"
            value={summary?.pendingKitchenOrders || 0}
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Top Products */}
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Top Products</h3>
            {topProducts.length === 0 ? (
              <p className="text-slate-500">No sales data yet</p>
            ) : (
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div
                    key={product.productId}
                    className="flex items-center justify-between rounded-lg bg-slate-50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-medium text-white">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-slate-900">{product.name}</p>
                        <p className="text-sm text-slate-500">
                          {product.quantitySold} sold
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold text-slate-900">
                      Rs. {product.revenue.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Low Stock Alert */}
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Low Stock Alerts</h3>
            {lowStock.length === 0 ? (
              <p className="text-slate-500">All items are well stocked</p>
            ) : (
              <div className="space-y-3">
                {lowStock.slice(0, 5).map((item) => {
                  const product = typeof item.product === 'object' ? item.product : null;
                  return (
                    <div
                      key={item._id}
                      className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3"
                    >
                      <div>
                        <p className="font-medium text-slate-900">
                          {product?.name || 'Unknown Product'}
                        </p>
                        <p className="text-sm text-slate-500">
                          SKU: {product?.sku || 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="danger">{item.stockQuantity} left</Badge>
                        <p className="mt-1 text-xs text-slate-500">
                          Min: {item.lowStockThreshold}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </PageContent>
    </Layout>
  );
}
