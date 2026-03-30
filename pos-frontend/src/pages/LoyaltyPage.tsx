import { useEffect, useState } from 'react';
import { Layout, PageHeader, PageContent, Card, StatCard, Table, Badge, Button, Input, Modal, PageLoader } from '../components';
import { loyaltyApi, customersApi } from '../api';
import type { LoyaltyAccount, LoyaltyTransaction, WalletTransaction, Customer } from '../types';

export default function LoyaltyPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loyaltyAccount, setLoyaltyAccount] = useState<LoyaltyAccount | null>(null);
  const [pointsHistory, setPointsHistory] = useState<LoyaltyTransaction[]>([]);
  const [walletHistory, setWalletHistory] = useState<WalletTransaction[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [topupModalOpen, setTopupModalOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState(0);
  const [topupMethod, setTopupMethod] = useState('CASH');

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await customersApi.getAll({ search, status: 'ACTIVE' });
      setCustomers(res.customers || []);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [search]);

  const viewLoyalty = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailLoading(true);
    try {
      const [account, points, wallet] = await Promise.all([
        loyaltyApi.getAccount(customer._id),
        loyaltyApi.getPointsHistory(customer._id),
        loyaltyApi.getWalletHistory(customer._id),
      ]);
      setLoyaltyAccount(account);
      setPointsHistory(points);
      setWalletHistory(wallet);
    } catch (error) {
      console.error('Failed to load loyalty data:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleTopup = async () => {
    if (!selectedCustomer || topupAmount <= 0) return;
    try {
      await loyaltyApi.walletTopup({
        customer_id: selectedCustomer._id,
        amount: topupAmount,
        paymentMethod: topupMethod,
      });
      setTopupModalOpen(false);
      viewLoyalty(selectedCustomer);
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to topup wallet');
    }
  };

  const getTierBadge = (tier: string) => {
    const variants: Record<string, 'default' | 'info' | 'warning' | 'success'> = {
      BASIC: 'default',
      SILVER: 'info',
      GOLD: 'warning',
      PLATINUM: 'success',
    };
    return <Badge variant={variants[tier] || 'default'}>{tier}</Badge>;
  };

  const columns = [
    { key: 'customerCode', header: 'Code' },
    { key: 'name', header: 'Name' },
    { key: 'phone', header: 'Phone' },
    {
      key: 'tier',
      header: 'Tier',
      render: (item: Customer) => getTierBadge(item.tier),
    },
    {
      key: 'totalSpent',
      header: 'Total Spent',
      render: (item: Customer) => `Rs. ${item.totalSpent.toLocaleString()}`,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Customer) => (
        <Button size="sm" variant="ghost" onClick={() => viewLoyalty(item)}>
          View Loyalty
        </Button>
      ),
    },
  ];

  return (
    <Layout>
      <PageHeader
        title="Loyalty & Wallet"
        subtitle="Manage customer loyalty points and wallet"
      />
      <PageContent>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Customer List */}
          <div className="lg:col-span-2">
            <div className="mb-4">
              <Input
                placeholder="Search customers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Table
              columns={columns}
              data={customers}
              keyExtractor={(item) => item._id}
              loading={loading}
              emptyMessage="No customers found"
            />
          </div>

          {/* Loyalty Detail */}
          <div>
            {!selectedCustomer ? (
              <Card>
                <div className="py-8 text-center text-slate-500">
                  Select a customer to view loyalty details
                </div>
              </Card>
            ) : detailLoading ? (
              <Card>
                <PageLoader />
              </Card>
            ) : (
              <div className="space-y-4">
                <Card>
                  <h3 className="mb-3 text-lg font-semibold">{selectedCustomer.name}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Tier:</span>
                      {getTierBadge(loyaltyAccount?.tier || selectedCustomer.tier)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Points Balance:</span>
                      <span className="font-bold text-lg">{loyaltyAccount?.pointsBalance || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Wallet Balance:</span>
                      <span className="font-bold text-lg text-green-600">
                        Rs. {(loyaltyAccount?.walletBalance || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Lifetime Points:</span>
                      <span>{loyaltyAccount?.lifetimePoints || 0}</span>
                    </div>
                  </div>
                  <Button className="mt-4 w-full" onClick={() => setTopupModalOpen(true)}>
                    Topup Wallet
                  </Button>
                </Card>

                {/* Points History */}
                <Card>
                  <h4 className="mb-3 font-semibold">Points History</h4>
                  {pointsHistory.length === 0 ? (
                    <p className="text-sm text-slate-500">No points history</p>
                  ) : (
                    <div className="max-h-48 space-y-2 overflow-y-auto">
                      {pointsHistory.slice(0, 10).map((txn) => (
                        <div key={txn._id} className="flex justify-between text-sm">
                          <span className={txn.type === 'EARNED' ? 'text-green-600' : 'text-red-600'}>
                            {txn.type === 'EARNED' ? '+' : '-'}{txn.points} pts
                          </span>
                          <span className="text-slate-500">
                            {new Date(txn.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Wallet History */}
                <Card>
                  <h4 className="mb-3 font-semibold">Wallet History</h4>
                  {walletHistory.length === 0 ? (
                    <p className="text-sm text-slate-500">No wallet history</p>
                  ) : (
                    <div className="max-h-48 space-y-2 overflow-y-auto">
                      {walletHistory.slice(0, 10).map((txn) => (
                        <div key={txn._id} className="flex justify-between text-sm">
                          <span className={txn.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}>
                            {txn.type === 'CREDIT' ? '+' : '-'}Rs. {txn.amount}
                          </span>
                          <span className="text-slate-500">
                            {new Date(txn.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}
          </div>
        </div>
      </PageContent>

      {/* Topup Modal */}
      <Modal
        isOpen={topupModalOpen}
        onClose={() => setTopupModalOpen(false)}
        title={`Topup Wallet: ${selectedCustomer?.name || ''}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setTopupModalOpen(false)}>Cancel</Button>
            <Button onClick={handleTopup}>Topup</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Current Balance: Rs. {loyaltyAccount?.walletBalance?.toLocaleString() || 0}
          </p>
          <Input
            label="Amount"
            type="number"
            value={topupAmount}
            onChange={(e) => setTopupAmount(parseFloat(e.target.value) || 0)}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Payment Method</label>
            <select
              value={topupMethod}
              onChange={(e) => setTopupMethod(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
