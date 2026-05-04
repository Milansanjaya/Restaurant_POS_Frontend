import { useEffect, useState } from 'react';
import notify from '../utils/notify';
import { Layout, PageHeader, PageContent, Table, Pagination, Input, Card, Badge, getStatusBadgeVariant } from '../components';
import { grnApi, suppliersApi } from '../api';
import type { GRNPayment, Supplier } from '../types';
import { formatMoney } from '../money';

export default function GRNPaymentsPage() {
  const [payments, setPayments] = useState<GRNPayment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const [supplierId, setSupplierId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = async () => {
    try {
      setLoading(true);
      const [payRes, supplierRes] = await Promise.all([
        grnApi.getAllPayments({
          page,
          limit: 10,
          supplierId: supplierId || undefined,
          from: from || undefined,
          to: to || undefined,
        }),
        suppliersApi.getAll(),
      ]);

      setPayments(payRes.payments || []);
      setSuppliers(supplierRes.suppliers || []);
      setTotalPages(payRes.pagination?.pages || 1);
    } catch (err) {
      console.error('Failed to load GRN payments:', err);
      notify.error('Failed to load GRN payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId, from, to, page]);

  const columns = [
    {
      key: 'date',
      header: 'Date',
      render: (p: GRNPayment) => new Date(p.createdAt || p.date).toLocaleString(),
    },
    {
      key: 'grn',
      header: 'GRN',
      render: (p: GRNPayment) => {
        const grn = p.grn_id as any;
        return typeof grn === 'object' && grn ? (grn.grnNumber || grn._id) : String(grn || '-');
      },
    },
    {
      key: 'supplier',
      header: 'Supplier',
      render: (p: GRNPayment) => {
        const s = p.supplier_id as any;
        return typeof s === 'object' && s ? s.name : String(s || '-');
      },
    },
    {
      key: 'method',
      header: 'Method',
      render: (p: GRNPayment) => (
        <Badge variant={getStatusBadgeVariant(p.paymentMethod)}>{p.paymentMethod}</Badge>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (p: GRNPayment) => <span className="font-medium">{formatMoney(p.amount)}</span>,
    },
    {
      key: 'reference',
      header: 'Reference',
      render: (p: GRNPayment) => p.reference || '-',
    },
  ];

  return (
    <Layout>
      <PageHeader title="GRN Payments" subtitle="Payment history for goods received notes" />
      <PageContent>
        <Card className="mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="w-64">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Supplier</label>
              <select
                value={supplierId}
                onChange={(e) => {
                  setPage(1);
                  setSupplierId(e.target.value);
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">All Suppliers</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="From"
              type="date"
              value={from}
              onChange={(e) => {
                setPage(1);
                setFrom(e.target.value);
              }}
              className="w-48"
            />
            <Input
              label="To"
              type="date"
              value={to}
              onChange={(e) => {
                setPage(1);
                setTo(e.target.value);
              }}
              className="w-48"
            />
          </div>
        </Card>

        <Table
          columns={columns}
          data={payments}
          keyExtractor={(p) => p._id}
          loading={loading}
          emptyMessage="No GRN payments found"
        />

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </PageContent>
    </Layout>
  );
}
