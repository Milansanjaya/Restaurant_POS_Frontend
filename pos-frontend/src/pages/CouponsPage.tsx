import { useEffect, useState } from 'react';
import { Layout, PageHeader, PageContent } from '../components/Layout';
import { Button, Input, Select, Modal, Badge, Table } from '../components';
import { couponsApi } from '../api/coupons.api';
import type { Coupon, CouponFormData, DiscountType } from '../types';
import { formatMoney } from '../money';

const initialFormData: CouponFormData = {
  code: '',
  discountType: 'FLAT',
  value: 0,
  expiryDate: '',
  minOrderValue: 0,
  maxDiscount: undefined,
  validFrom: '',
  validTo: '',
  usageLimit: undefined,
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState<CouponFormData>(initialFormData);
  const [saving, setSaving] = useState(false);

  const loadCoupons = async () => {
    try {
      const data = await couponsApi.getAll();
      setCoupons(data);
    } catch (err) {
      console.error('Failed to load coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const openCreateModal = () => {
    setEditingCoupon(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  const openEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discountType: coupon.discountType,
      value: coupon.value,
      expiryDate: coupon.expiryDate.split('T')[0],
      minOrderValue: coupon.minOrderValue,
      maxDiscount: coupon.maxDiscount,
      validFrom: coupon.validFrom ? coupon.validFrom.split('T')[0] : '',
      validTo: coupon.validTo ? coupon.validTo.split('T')[0] : '',
      usageLimit: coupon.usageLimit,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (editingCoupon) {
        await couponsApi.update(editingCoupon._id, formData);
      } else {
        await couponsApi.create(formData);
      }
      setShowModal(false);
      loadCoupons();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (coupon: Coupon) => {
    try {
      await couponsApi.toggle(coupon._id);
      loadCoupons();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to toggle coupon status');
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    if (!confirm(`Delete coupon "${coupon.code}"?`)) return;
    try {
      await couponsApi.delete(coupon._id);
      loadCoupons();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete coupon');
    }
  };

  const isExpired = (date: string) => new Date(date) < new Date();

  const columns = [
    { key: 'code', header: 'Code', render: (c: Coupon) => (
      <span className="font-mono font-medium">{c.code}</span>
    )},
    { key: 'discountType', header: 'Type', render: (c: Coupon) => (
      <Badge variant={c.discountType === 'FLAT' ? 'info' : 'warning'}>
        {c.discountType}
      </Badge>
    )},
    { key: 'value', header: 'Value', render: (c: Coupon) => (
      c.discountType === 'FLAT' ? formatMoney(c.value) : `${c.value}%`
    )},
    { key: 'minOrderValue', header: 'Min Order', render: (c: Coupon) => (
      formatMoney(c.minOrderValue)
    )},
    { key: 'expiryDate', header: 'Expiry', render: (c: Coupon) => (
      <span className={isExpired(c.expiryDate) ? 'text-red-600' : ''}>
        {new Date(c.expiryDate).toLocaleDateString()}
      </span>
    )},
    { key: 'usage', header: 'Usage', render: (c: Coupon) => (
      c.usageLimit ? `${c.timesUsed}/${c.usageLimit}` : `${c.timesUsed}/∞`
    )},
    { key: 'status', header: 'Status', render: (c: Coupon) => (
      <button
        onClick={() => handleToggle(c)}
        disabled={isExpired(c.expiryDate)}
        className={`px-3 py-1 rounded-full text-xs font-medium transition ${
          c.isActive && !isExpired(c.expiryDate)
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        } ${isExpired(c.expiryDate) ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {!c.isActive ? 'Inactive' : isExpired(c.expiryDate) ? 'Expired' : 'Active'}
      </button>
    )},
    { key: 'actions', header: 'Actions', render: (c: Coupon) => (
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={() => openEditModal(c)}>
          Edit
        </Button>
        <Button size="sm" variant="ghost" onClick={() => handleDelete(c)}>
          Delete
        </Button>
      </div>
    )},
  ];

  return (
    <Layout>
      <PageHeader
        title="Coupons"
        actions={<Button onClick={openCreateModal}>+ Add Coupon</Button>}
      />

      <PageContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900"></div>
          </div>
        ) : (
          <Table 
            data={coupons} 
            columns={columns} 
            keyExtractor={(c) => c._id}
            emptyMessage="No coupons found. Create your first coupon!"
          />
        )}
      </PageContent>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
      >
        <div className="space-y-4">
          <Input
            label="Coupon Code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="e.g., SAVE20"
            disabled={!!editingCoupon}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Discount Type"
              value={formData.discountType}
              options={[
                { value: 'FLAT', label: 'Flat Amount' },
                { value: 'PERCENTAGE', label: 'Percentage' },
              ]}
              onChange={(e) => setFormData({ ...formData, discountType: e.target.value as DiscountType })}
            />
            <Input
              label={formData.discountType === 'FLAT' ? 'Discount Amount (Rs.)' : 'Discount (%)'}
              type="number"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
              min={0}
              max={formData.discountType === 'PERCENTAGE' ? 100 : undefined}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Min Order Value"
              type="number"
              value={formData.minOrderValue || 0}
              onChange={(e) => setFormData({ ...formData, minOrderValue: parseFloat(e.target.value) || 0 })}
              min={0}
            />
            {formData.discountType === 'PERCENTAGE' && (
              <Input
                label="Max Discount (Rs.)"
                type="number"
                value={formData.maxDiscount || ''}
                onChange={(e) => setFormData({ ...formData, maxDiscount: parseFloat(e.target.value) || undefined })}
                placeholder="No limit"
                min={0}
              />
            )}
          </div>
          <Input
            label="Expiry Date"
            type="date"
            value={formData.expiryDate}
            onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Valid From (Optional)"
              type="date"
              value={formData.validFrom || ''}
              onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
            />
            <Input
              label="Valid To (Optional)"
              type="date"
              value={formData.validTo || ''}
              onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
            />
          </div>
          <Input
            label="Usage Limit (Optional)"
            type="number"
            value={formData.usageLimit || ''}
            onChange={(e) => setFormData({ ...formData, usageLimit: parseInt(e.target.value) || undefined })}
            placeholder="Unlimited"
            min={1}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || !formData.code || !formData.expiryDate || formData.value <= 0}
            >
              {saving ? 'Saving...' : editingCoupon ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
