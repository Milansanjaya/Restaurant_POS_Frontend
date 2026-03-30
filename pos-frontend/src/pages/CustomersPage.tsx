import { useEffect, useState } from 'react';
import { Layout, PageHeader, PageContent, Button, Input, Table, Badge, getStatusBadgeVariant, Modal, Card, PageLoader } from '../components';
import { customersApi } from '../api';
import type { Customer, CustomerFormData } from '../types';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await customersApi.getAll({ 
        search,
        tier: tierFilter as any || undefined,
      });
      setCustomers(res.customers || []);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [search, tierFilter]);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', email: '', address: '' });
    setModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      notes: customer.notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (editingCustomer) {
        await customersApi.update(editingCustomer._id, formData);
      } else {
        await customersApi.create(formData);
      }
      setModalOpen(false);
      loadCustomers();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const getTierVariant = (tier: string) => {
    const map: Record<string, 'default' | 'info' | 'warning' | 'success'> = {
      BASIC: 'default',
      SILVER: 'info',
      GOLD: 'warning',
      PLATINUM: 'success',
    };
    return map[tier] || 'default';
  };

  const columns = [
    { key: 'customerCode', header: 'Code' },
    { key: 'name', header: 'Name' },
    { key: 'phone', header: 'Phone' },
    {
      key: 'tier',
      header: 'Tier',
      render: (item: Customer) => (
        <Badge variant={getTierVariant(item.tier)}>{item.tier}</Badge>
      ),
    },
    {
      key: 'totalOrders',
      header: 'Orders',
    },
    {
      key: 'totalSpent',
      header: 'Total Spent',
      render: (item: Customer) => `Rs. ${item.totalSpent.toLocaleString()}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Customer) => (
        <Badge variant={item.status === 'ACTIVE' ? 'success' : 'default'}>
          {item.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Customer) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => openEditModal(item)}>
            Edit
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <PageHeader
        title="Customers"
        subtitle="Manage your customer database"
        actions={<Button onClick={openCreateModal}>+ Add Customer</Button>}
      />
      <PageContent>
        <div className="mb-4 flex gap-4">
          <Input
            placeholder="Search by name, phone, or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All Tiers</option>
            <option value="BASIC">Basic</option>
            <option value="SILVER">Silver</option>
            <option value="GOLD">Gold</option>
            <option value="PLATINUM">Platinum</option>
          </select>
        </div>

        <Table
          columns={columns}
          data={customers}
          keyExtractor={(item) => item._id}
          loading={loading}
          emptyMessage="No customers found"
        />
      </PageContent>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editingCustomer ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={formData.email || ''}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label="Address"
            value={formData.address || ''}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Notes
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              rows={3}
            />
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
