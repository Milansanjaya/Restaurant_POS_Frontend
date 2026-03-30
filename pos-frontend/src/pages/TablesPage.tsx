import { useEffect, useState } from 'react';
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
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
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
      await tablesApi.create(formData);
      setShowModal(false);
      setFormData({ tableNumber: '', capacity: 2, section: '' });
      loadTables();
    } catch (err) {
      console.error('Failed to create table:', err);
    }
  };

  const handleStatusChange = async (table: RestaurantTable, status: TableStatus) => {
    try {
      await tablesApi.updateStatus(table._id, status);
      loadTables();
    } catch (err) {
      console.error('Failed to update table status:', err);
    }
  };

  const handleCloseTable = async () => {
    if (!selectedTable) return;
    try {
      await tablesApi.close(selectedTable._id, paymentMethod);
      setShowCloseModal(false);
      setSelectedTable(null);
      setPaymentMethod('CASH');
      loadTables();
    } catch (err) {
      console.error('Failed to close table:', err);
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
        action={<Button onClick={() => setShowModal(true)}>Add Table</Button>}
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
                    <Card key={table._id} className="p-4 text-center">
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

      {/* Create Table Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add New Table"
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
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTable} disabled={!formData.tableNumber}>
              Create Table
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
    </Layout>
  );
}
