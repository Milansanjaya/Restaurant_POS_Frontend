import { useEffect, useState } from 'react';
import { Layout, PageHeader, PageContent, Card, StatCard, PageLoader, Button } from '../components';
import { reportsApi } from '../api';
import type { DailyReport, PaymentSummary, Inventory } from '../types';

// Simple Pie Chart Component (CSS-based)
const SimplePieChart = ({ data, height = 320 }: { data: { name: string; value?: number; qty?: number }[]; height?: number }) => {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center" style={{ height }}>No data available</div>;
  }
  const total = data.reduce((sum, item) => sum + (item.value || item.qty || 0), 0);
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
  
  return (
    <div className="flex items-center gap-6" style={{ height }}>
      <div className="relative w-40 h-40">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {(() => {
            let currentAngle = 0;
            return data.slice(0, 7).map((item, index) => {
              const value = item.value || item.qty || 0;
              const percentage = total > 0 ? (value / total) * 100 : 0;
              const angle = (percentage / 100) * 360;
              const largeArc = angle > 180 ? 1 : 0;
              const startX = 50 + 40 * Math.cos((currentAngle * Math.PI) / 180);
              const startY = 50 + 40 * Math.sin((currentAngle * Math.PI) / 180);
              const endX = 50 + 40 * Math.cos(((currentAngle + angle) * Math.PI) / 180);
              const endY = 50 + 40 * Math.sin(((currentAngle + angle) * Math.PI) / 180);
              const pathD = `M 50 50 L ${startX} ${startY} A 40 40 0 ${largeArc} 1 ${endX} ${endY} Z`;
              currentAngle += angle;
              return <path key={index} d={pathD} fill={colors[index % colors.length]} className="hover:opacity-80 transition-opacity" />;
            });
          })()}
          <circle cx="50" cy="50" r="20" fill="white" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-slate-700">{total}</span>
        </div>
      </div>
      <div className="flex-1 space-y-2">
        {data.slice(0, 5).map((item, index) => {
          const value = item.value || item.qty || 0;
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
          return (
            <div key={index} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
              <span className="text-sm text-slate-600 flex-1 truncate">{item.name}</span>
              <span className="text-sm font-medium text-slate-700">{percentage}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

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
          <div className="flex gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <Button 
              onClick={() => alert('Install jspdf to enable PDF export')}
            >
              📥 Export PDF
            </Button>
            <Button 
              onClick={() => alert('Export feature requires jspdf package')}
              variant="outline"
            >
              📊 Export CSV
            </Button>
          </div>
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

        {/* Charts Section */}
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Top Products Pie Chart */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Top Selling Products (Chart)
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => alert('Install jspdf for PDF export')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                  title="Export to PDF"
                >
                  📄 PDF
                </button>
                <button
                  onClick={() => alert('Install jspdf for CSV export')}
                  className="text-sm text-green-600 hover:text-green-800"
                  title="Export to CSV"
                >
                  📊 CSV
                </button>
              </div>
            </div>
            {topProducts.length === 0 ? (
              <div className="flex h-[350px] items-center justify-center text-slate-500">
                No product sales data available
              </div>
            ) : (
              <SimplePieChart data={topProducts} height={350} />
            )}
          </Card>

          {/* Payment Methods Pie Chart */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Payment Methods Breakdown
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => alert('Install jspdf for PDF export')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                  title="Export to PDF"
                >
                  📄 PDF
                </button>
                <button
                  onClick={() => alert('Install jspdf for CSV export')}
                  className="text-sm text-green-600 hover:text-green-800"
                  title="Export to CSV"
                >
                  📊 CSV
                </button>
              </div>
            </div>
            {Object.keys(paymentSummary).length === 0 ? (
              <div className="flex h-[350px] items-center justify-center text-slate-500">
                No payment data available
              </div>
            ) : (
              <SimplePieChart 
                data={Object.entries(paymentSummary).map(([name, value]) => ({ name, value }))} 
                height={350} 
              />
            )}
          </Card>
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
