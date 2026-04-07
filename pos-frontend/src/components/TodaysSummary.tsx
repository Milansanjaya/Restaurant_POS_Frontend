import React from 'react';

interface SummaryData {
  salesBreakdown: {
    dineIn: number;
    takeaway: number;
    delivery: number;
  };
  paymentMethods: {
    cash: number;
    card: number;
    wallet: number;
  };
  orderStats: {
    completed: number;
    cancelled: number;
    pending: number;
  };
}

interface TodaysSummaryProps {
  data: SummaryData;
}

export const TodaysSummary: React.FC<TodaysSummaryProps> = ({ data }) => {
  const total = data.salesBreakdown.dineIn + data.salesBreakdown.takeaway + data.salesBreakdown.delivery;
  
  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">Today's Summary</h3>
      
      {/* Sales Breakdown */}
      <div className="mb-4">
        <h4 className="mb-2 text-xs font-medium text-slate-600">Sales Breakdown</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">🍽️ Dine-in</span>
            <span className="font-semibold text-slate-900">Rs. {data.salesBreakdown.dineIn.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">🥡 Takeaway</span>
            <span className="font-semibold text-slate-900">Rs. {data.salesBreakdown.takeaway.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">🚗 Delivery</span>
            <span className="font-semibold text-slate-900">Rs. {data.salesBreakdown.delivery.toLocaleString()}</span>
          </div>
          <div className="border-t pt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Total</span>
              <span className="font-bold text-slate-900">Rs. {total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="mb-4">
        <h4 className="mb-2 text-xs font-medium text-slate-600">Payment Methods</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">💵 Cash</span>
            <span className="font-semibold text-green-600">Rs. {data.paymentMethods.cash.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">💳 Card</span>
            <span className="font-semibold text-blue-600">Rs. {data.paymentMethods.card.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">📱 Wallet</span>
            <span className="font-semibold text-purple-600">Rs. {data.paymentMethods.wallet.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Order Stats */}
      <div>
        <h4 className="mb-2 text-xs font-medium text-slate-600">Order Status</h4>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-green-50 p-2 text-center">
            <div className="text-xl font-bold text-green-600">{data.orderStats.completed}</div>
            <div className="text-xs text-green-700">Done</div>
          </div>
          <div className="rounded-lg bg-yellow-50 p-2 text-center">
            <div className="text-xl font-bold text-yellow-600">{data.orderStats.pending}</div>
            <div className="text-xs text-yellow-700">Pending</div>
          </div>
          <div className="rounded-lg bg-red-50 p-2 text-center">
            <div className="text-xl font-bold text-red-600">{data.orderStats.cancelled}</div>
            <div className="text-xs text-red-700">Cancel</div>
          </div>
        </div>
      </div>
    </div>
  );
};
