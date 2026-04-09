import { useEffect, useState } from 'react';
import { Layout, PageHeader, PageContent, Button, Input, Table, Badge, Modal } from '../components';
import { suppliersApi } from '../api';
import type { Supplier, SupplierFormData, SupplierTransaction } from '../types';
import { formatMoney } from '../money';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerSupplier, setLedgerSupplier] = useState<Supplier | null>(null);
  const [ledgerData, setLedgerData] = useState<SupplierTransaction[]>([]);
  
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  const [formData, setFormData] = useState<SupplierFormData>({
    code: '',
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    creditLimit: 0,
    paymentTerms: 30,
    gstNumber: '',
    panNumber: '',
  });

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const res = await suppliersApi.getAll({ search });
      setSuppliers(res.suppliers || []);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, [search]);

  const openCreateModal = () => {
    setEditingSupplier(null);
    setFormData({
      code: '',
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      creditLimit: 0,
      paymentTerms: 30,
      gstNumber: '',
      panNumber: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      code: supplier.code,
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      creditLimit: supplier.creditLimit,
      paymentTerms: supplier.paymentTerms,
      gstNumber: supplier.gstNumber || '',
      panNumber: supplier.panNumber || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (editingSupplier) {
        await suppliersApi.update(editingSupplier._id, formData);
      } else {
        await suppliersApi.create(formData);
      }
      setModalOpen(false);
      loadSuppliers();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  const openLedger = async (supplier: Supplier) => {
    setLedgerSupplier(supplier);
    try {
      const transactions = await suppliersApi.getLedger(supplier._id);
      setLedgerData(transactions);
      setLedgerOpen(true);
    } catch (error) {
      console.error('Failed to load ledger:', error);
    }
  };

  const openPayment = (supplier: Supplier) => {
    setLedgerSupplier(supplier);
    setPaymentAmount(0);
    setPaymentMethod('CASH');
    setPaymentOpen(true);
  };

  const handlePayment = async () => {
    if (!ledgerSupplier || paymentAmount <= 0) return;
    try {
      await suppliersApi.recordPayment(ledgerSupplier._id, {
        amount: paymentAmount,
        paymentMethod,
      });
      setPaymentOpen(false);
      loadSuppliers();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to record payment');
    }
  };

  const columns = [
    { key: 'code', header: 'Code' },
    { key: 'name', header: 'Name' },
    { key: 'contactPerson', header: 'Contact' },
    { key: 'phone', header: 'Phone' },
    {
      key: 'outstandingBalance',
      header: 'Balance',
      render: (item: Supplier) => (
        <span className={item.outstandingBalance > 0 ? 'text-red-600 font-medium' : ''}>
          {formatMoney(item.outstandingBalance)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Supplier) => (
        <Badge variant={item.status === 'ACTIVE' ? 'success' : item.status === 'BLOCKED' ? 'danger' : 'default'}>
          {item.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Supplier) => (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => openEditModal(item)}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={() => openLedger(item)}>
            Ledger
          </Button>
          <Button size="sm" variant="ghost" onClick={() => openPayment(item)}>
            Pay
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <PageHeader
        title="Suppliers"
        subtitle="Manage your suppliers"
        actions={<Button onClick={openCreateModal}>+ Add Supplier</Button>}
      />
      <PageContent>
        <div className="mb-4">
          <Input
            placeholder="Search suppliers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>
        <Table
          columns={columns}
          data={suppliers}
          keyExtractor={(item) => item._id}
          loading={loading}
          emptyMessage="No suppliers found"
        />
      </PageContent>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>
              {editingSupplier ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Supplier Code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
              disabled={!!editingSupplier}
              placeholder="e.g., SUP001"
            />
            <Input
              label="Company Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Contact Person"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              required
            />
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <Input
              label="Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Credit Limit"
              type="number"
              value={formData.creditLimit}
              onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
              required
            />
            <Input
              label="Payment Terms (days)"
              type="number"
              value={formData.paymentTerms}
              onChange={(e) => setFormData({ ...formData, paymentTerms: parseInt(e.target.value) || 30 })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="GST Number"
              value={formData.gstNumber}
              onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
              required
            />
            <Input
              label="PAN Number"
              value={formData.panNumber}
              onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })}
              required
            />
          </div>
        </div>
      </Modal>

      {/* Ledger Modal */}
      <Modal
        isOpen={ledgerOpen}
        onClose={() => setLedgerOpen(false)}
        title={`Ledger: ${ledgerSupplier?.name || ''}`}
        size="lg"
      >
        <div className="space-y-2">
          {ledgerData.length === 0 ? (
            <p className="text-slate-500">No transactions yet</p>
          ) : (
            ledgerData.map((txn) => (
              <div key={txn._id} className="flex justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{txn.transactionType}</p>
                  <p className="text-sm text-slate-500">
                    {new Date(txn.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={txn.transactionType === 'PAYMENT' ? 'text-green-600' : 'text-red-600'}>
                  {txn.transactionType === 'PAYMENT' ? '-' : '+'}{formatMoney(txn.amount)}
                </span>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        title={`Record Payment: ${ledgerSupplier?.name || ''}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
            <Button onClick={handlePayment}>Record Payment</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Outstanding: {formatMoney(ledgerSupplier?.outstandingBalance || 0)}
          </p>
          <Input
            label="Amount"
            type="number"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
