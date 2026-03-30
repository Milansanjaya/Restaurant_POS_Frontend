import { useEffect, useState } from 'react';
import { Layout, PageHeader, PageContent, Card, StatCard, PageLoader } from '../components';
import { reportsApi } from '../api';
import type { DailyReport, PaymentSummary, Inventory, Product } from '../types';

export default function ReportsPage() {
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [topProducts, setTopProducts] = useState<{ name: string; qty: number }[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary>({});
  const [lowStock, setLowStock] = useState<Inventory[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [daily, top, payments, stock] = await Promise.all([
        reportsApi.getDailySales(selectedDate),
        reportsApi.getTopProducts(),
        reportsApi.getPaymentSummary(),
        reportsApi.getLowStock(),
      ]);
      setDailyReport(daily);
      setTopProducts(top || []);
      setPaymentSummary(payments || {});
      setLowStock(stock || []);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  if (loading) {
    return (
      <Layout>
        <PageLoader />
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title="Reports"
        subtitle="Sales and inventory reports"
        actions={
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        }
      />
      <PageContent>
        {/* Daily Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Orders"
            value={dailyReport?.totalOrders || 0}
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <StatCard
            title="Total Sales"
            value={`Rs. ${(dailyReport?.totalSales || 0).toLocaleString()}`}
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Total Tax"
            value={`Rs. ${(dailyReport?.totalTax || 0).toLocaleString()}`}
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
            }
          />
          <StatCard
            title="Avg Order Value"
            value={`Rs. ${(dailyReport?.averageOrderValue || 0).toFixed(2)}`}
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Top Products */}
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Top Selling Products</h3>
            {topProducts.length === 0 ? (
              <p className="text-slate-500">No sales data</p>
            ) : (
              <div className="space-y-3">
                {topProducts.slice(0, 10).map((product, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg bg-slate-50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-medium text-white">
                        {index + 1}
                      </span>
                      <span className="font-medium text-slate-900">{product.name}</span>
                    </div>
                    <span className="text-sm text-slate-600">{product.qty} sold</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Payment Methods */}
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Payment Methods</h3>
            {Object.keys(paymentSummary).length === 0 ? (
              <p className="text-slate-500">No payment data</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(paymentSummary).map(([method, amount]) => (
                  <div
                    key={method}
                    className="flex items-center justify-between rounded-lg bg-slate-50 p-3"
                  >
                    <span className="font-medium text-slate-900">{method}</span>
                    <span className="font-semibold text-slate-900">
                      Rs. {(amount as number).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Low Stock */}
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Low Stock Alert</h3>
            {lowStock.length === 0 ? (
              <p className="text-slate-500">All items well stocked</p>
            ) : (
              <div className="space-y-3">
                {lowStock.slice(0, 10).map((item) => {
                  const product = typeof item.product === 'object' ? item.product : null;
                  return (
                    <div
                      key={item._id}
                      className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3"
                    >
                      <span className="font-medium text-slate-900">
                        {product?.name || 'Unknown'}
                      </span>
                      <span className="text-sm font-medium text-red-600">
                        {item.stockQuantity} left
                      </span>
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
