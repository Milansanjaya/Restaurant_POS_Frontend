import { useEffect, useState } from 'react';
import { Layout, PageHeader, PageContent, Button, Input, Table, Badge, Modal, PageLoader } from '../components';
import { unitsApi } from '../api';
import type { Unit, UnitFormData, UnitType } from '../types';

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<UnitFormData>({
    name: '',
    shortCode: '',
    type: 'COUNT' as UnitType,
    baseUnit: '',
    conversionFactor: 1,
  });

  const loadUnits = async () => {
    try {
      setLoading(true);
      const res = await unitsApi.getAll({ type: typeFilter as UnitType || undefined });
      setUnits(res.units || []);
    } catch (error) {
      console.error('Failed to load units:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnits();
  }, [typeFilter]);

  const openCreateModal = () => {
    setEditingUnit(null);
    setFormData({
      name: '',
      shortCode: '',
      type: 'COUNT',
      baseUnit: '',
      conversionFactor: 1,
    });
    setModalOpen(true);
  };

  const openEditModal = (unit: Unit) => {
    setEditingUnit(unit);
    setFormData({
      name: unit.name,
      shortCode: unit.shortCode,
      type: unit.type,
      baseUnit: unit.baseUnit || '',
      conversionFactor: unit.conversionFactor || 1,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const data = { ...formData };
      if (!data.baseUnit) {
        delete data.baseUnit;
        delete data.conversionFactor;
      }
      
      if (editingUnit) {
        await unitsApi.update(editingUnit._id, data);
      } else {
        await unitsApi.create(data);
      }
      setModalOpen(false);
      loadUnits();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to save unit');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this unit?')) return;
    try {
      await unitsApi.delete(id);
      loadUnits();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to delete unit');
    }
  };

  const baseUnits = units.filter((u) => !u.baseUnit && u.type === formData.type);

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'shortCode', header: 'Short Code' },
    {
      key: 'type',
      header: 'Type',
      render: (item: Unit) => <Badge>{item.type}</Badge>,
    },
    {
      key: 'baseUnit',
      header: 'Base Unit',
      render: (item: Unit) => {
        if (!item.baseUnit) return <span className="text-slate-400">Base Unit</span>;
        const base = units.find((u) => u._id === item.baseUnit);
        return base?.shortCode || '-';
      },
    },
    {
      key: 'conversionFactor',
      header: 'Conversion',
      render: (item: Unit) => item.conversionFactor || '-',
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (item: Unit) => (
        <Badge variant={item.isActive ? 'success' : 'default'}>
          {item.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Unit) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => openEditModal(item)}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleDelete(item._id)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <PageHeader
        title="Units"
        subtitle="Manage measurement units"
        actions={<Button onClick={openCreateModal}>+ Add Unit</Button>}
      />
      <PageContent>
        <div className="mb-4">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All Types</option>
            <option value="WEIGHT">Weight</option>
            <option value="VOLUME">Volume</option>
            <option value="COUNT">Count</option>
            <option value="LENGTH">Length</option>
          </select>
        </div>

        <Table
          columns={columns}
          data={units}
          keyExtractor={(item) => item._id}
          loading={loading}
          emptyMessage="No units found"
        />
      </PageContent>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUnit ? 'Edit Unit' : 'Add Unit'}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editingUnit ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Kilogram"
            required
          />
          <Input
            label="Short Code"
            value={formData.shortCode}
            onChange={(e) => setFormData({ ...formData, shortCode: e.target.value })}
            placeholder="e.g., kg"
            required
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as UnitType, baseUnit: '' })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="WEIGHT">Weight</option>
              <option value="VOLUME">Volume</option>
              <option value="COUNT">Count</option>
              <option value="LENGTH">Length</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Base Unit (optional, for derived units)
            </label>
            <select
              value={formData.baseUnit}
              onChange={(e) => setFormData({ ...formData, baseUnit: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">None (This is a base unit)</option>
              {baseUnits.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.shortCode})
                </option>
              ))}
            </select>
          </div>
          {formData.baseUnit && (
            <Input
              label="Conversion Factor"
              type="number"
              step="0.0001"
              value={formData.conversionFactor}
              onChange={(e) => setFormData({ ...formData, conversionFactor: parseFloat(e.target.value) || 1 })}
              helperText="e.g., 0.001 if 1 gram = 0.001 kg"
            />
          )}
        </div>
      </Modal>
    </Layout>
  );
}
