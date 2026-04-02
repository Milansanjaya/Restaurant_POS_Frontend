import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Layout, PageHeader, PageContent } from '../components/Layout';
import { Button, Input, Select, Modal, Badge, Card } from '../components';
import { tablesApi } from '../api/tables.api';
import type { RestaurantTable, TableFormData, TableStatus } from '../types';

const statusOptions = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'OCCUPIED', label: 'Occupied' },
  { value: 'RESERVED', label: 'Reserved' },
  { value: 'CLEANING', label: 'Cleaning' },
];

const statusColors: Record<TableStatus, 'success' | 'warning' | 'danger' | 'info'> = {
  AVAILABLE: 'success',
  OCCUPIED: 'danger',
  RESERVED: 'warning',
  CLEANING: 'info',
};

export default function TablesPage() {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [formData, setFormData] = useState<TableFormData>({
    tableNumber: '',
    capacity: 2,
    section: '',
  });

  const loadTables = async () => {
    try {
      const data = await tablesApi.getAll();
      setTables(data);
    } catch (err) {
      console.error('Failed to load tables:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  const handleCreateTable = async () => {
    try {
      if (editingTable) {
        // Update existing table
        await tablesApi.update(editingTable._id, formData);
        toast.success('✅ Table updated successfully');
      } else {
        // Create new table
        await tablesApi.create(formData);
        toast.success('✅ Table created successfully');
      }
      setShowModal(false);
      setFormData({ tableNumber: '', capacity: 2, section: '' });
      setEditingTable(null);
      loadTables();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save table');
    }
  };

  const openEditModal = (table: RestaurantTable) => {
    setEditingTable(table);
    setFormData({
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      section: table.section || '',
    });
    setShowModal(true);
  };

  const openDeleteModal = (table: RestaurantTable) => {
    setSelectedTable(table);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!selectedTable) return;
    try {
      await tablesApi.delete(selectedTable._id);
      toast.success('✅ Table deleted successfully');
      setShowDeleteModal(false);
      setSelectedTable(null);
      loadTables();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete table');
    }
  };

  const handleStatusChange = async (table: RestaurantTable, status: TableStatus) => {
    try {
      await tablesApi.updateStatus(table._id, status);
      toast.success('✅ Table status updated');
      loadTables();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update status');
    }
  };

  const handleCloseTable = async () => {
    if (!selectedTable) return;
    try {
      await tablesApi.close(selectedTable._id, paymentMethod);
      toast.success('💰 Table closed successfully');
      setShowCloseModal(false);
      setSelectedTable(null);
      setPaymentMethod('CASH');
      loadTables();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to close table');
    }
  };

  const openCloseModal = (table: RestaurantTable) => {
    setSelectedTable(table);
    setShowCloseModal(true);
  };

  // Group tables by section
  const tablesBySection = tables.reduce((acc, table) => {
    const section = table.section || 'Main';
    if (!acc[section]) acc[section] = [];
    acc[section].push(table);
    return acc;
  }, {} as Record<string, RestaurantTable[]>);

  return (
    <Layout>
      <PageHeader
        title="Tables"
        actions={<Button onClick={() => setShowModal(true)}>Add Table</Button>}
      />

      <PageContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(tablesBySection).map(([section, sectionTables]) => (
              <div key={section}>
                <h2 className="mb-4 text-lg font-semibold text-slate-900">{section} Section</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {sectionTables.map((table) => (
                    <Card key={table._id} className="p-4 text-center relative">
                      {/* Edit/Delete buttons */}
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button
                          onClick={() => openEditModal(table)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-blue-600"
                          title="Edit table"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => openDeleteModal(table)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-red-600"
                          title="Delete table"
                          disabled={table.status === 'OCCUPIED'}
                        >
                          🗑️
                        </button>
                      </div>
                      
                      <div className="mb-2 text-2xl font-bold text-slate-900">
                        {table.tableNumber}
                      </div>
                      <div className="mb-2 text-sm text-slate-500">
                        Capacity: {table.capacity}
                      </div>
                      <Badge variant={statusColors[table.status]}>
                        {table.status}
                      </Badge>
                      <div className="mt-3 space-y-2">
                        <Select
                          value={table.status}
                          options={statusOptions}
                          onChange={(e) =>
                            handleStatusChange(table, e.target.value as TableStatus)
                          }
                        />
                        {table.status === 'OCCUPIED' && table.currentSale && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full"
                            onClick={() => openCloseModal(table)}
                          >
                            Close & Pay
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}

            {tables.length === 0 && (
              <div className="rounded-lg bg-slate-50 p-12 text-center">
                <p className="text-slate-500">No tables found. Add your first table!</p>
              </div>
            )}
          </div>
        )}
      </PageContent>

      {/* Create/Edit Table Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingTable(null);
          setFormData({ tableNumber: '', capacity: 2, section: '' });
        }}
        title={editingTable ? 'Edit Table' : 'Add New Table'}
      >
        <div className="space-y-4">
          <Input
            label="Table Number"
            value={formData.tableNumber}
            onChange={(e) => setFormData({ ...formData, tableNumber: e.target.value })}
            placeholder="e.g., T1, A1"
          />
          <Input
            label="Capacity"
            type="number"
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 2 })}
            min={1}
          />
          <Input
            label="Section (Optional)"
            value={formData.section || ''}
            onChange={(e) => setFormData({ ...formData, section: e.target.value })}
            placeholder="e.g., Main, Patio, VIP"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => {
              setShowModal(false);
              setEditingTable(null);
              setFormData({ tableNumber: '', capacity: 2, section: '' });
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateTable} disabled={!formData.tableNumber}>
              {editingTable ? 'Update Table' : 'Create Table'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Close Table Modal */}
      <Modal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        title={`Close Table ${selectedTable?.tableNumber}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Select payment method to close this table and finalize the sale.
          </p>
          <Select
            label="Payment Method"
            value={paymentMethod}
            options={[
              { value: 'CASH', label: 'Cash' },
              { value: 'CARD', label: 'Card' },
              { value: 'WALLET', label: 'Wallet' },
            ]}
            onChange={(e) => setPaymentMethod(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowCloseModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCloseTable}>
              Close & Pay
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Table"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete table <strong>{selectedTable?.tableNumber}</strong>?
            {selectedTable?.status === 'OCCUPIED' && (
              <span className="block mt-2 text-red-600 font-medium">
                ⚠️ Cannot delete table with active sale. Please close the table first.
              </span>
            )}
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={handleDelete}
              disabled={selectedTable?.status === 'OCCUPIED'}
            >
              Delete Table
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
