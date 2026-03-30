import { useEffect, useState } from 'react';
import { Layout, PageHeader, PageContent } from '../components/Layout';
import { Button, Input, Select, Modal, Badge, Table } from '../components';
import { reservationsApi } from '../api/reservations.api';
import { tablesApi } from '../api/tables.api';
import type { Reservation, ReservationFormData, ReservationStatus, RestaurantTable } from '../types';

const statusColors: Record<ReservationStatus, 'warning' | 'info' | 'success' | 'danger' | 'default'> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  SEATED: 'success',
  CANCELLED: 'danger',
  COMPLETED: 'default',
  NO_SHOW: 'danger',
};

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'SEATED', label: 'Seated' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'NO_SHOW', label: 'No Show' },
];

const updateStatusOptions = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'NO_SHOW', label: 'No Show' },
  { value: 'COMPLETED', label: 'Completed' },
];

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [formData, setFormData] = useState<ReservationFormData>({
    tableId: '',
    customerName: '',
    customerPhone: '',
    guestCount: 1,
    reservationDateTime: '',
    notes: '',
  });

  const loadData = async () => {
    try {
      const [reservationsData, tablesData] = await Promise.all([
        reservationsApi.getAll({
          status: filterStatus as ReservationStatus || undefined,
          date: filterDate || undefined,
        }),
        tablesApi.getAll(),
      ]);
      setReservations(reservationsData);
      setTables(tablesData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterStatus, filterDate]);

  const handleCreate = async () => {
    try {
      await reservationsApi.create(formData);
      setShowModal(false);
      setFormData({
        tableId: '',
        customerName: '',
        customerPhone: '',
        guestCount: 1,
        reservationDateTime: '',
        notes: '',
      });
      loadData();
    } catch (err) {
      console.error('Failed to create reservation:', err);
    }
  };

  const handleStatusChange = async (reservation: Reservation, status: ReservationStatus) => {
    try {
      await reservationsApi.updateStatus(reservation._id, status);
      loadData();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleSeat = async (reservation: Reservation) => {
    try {
      await reservationsApi.seat(reservation._id);
      loadData();
    } catch (err) {
      console.error('Failed to seat reservation:', err);
    }
  };

  const availableTables = tables.filter((t) => t.status === 'AVAILABLE');

  const columns = [
    {
      key: 'reservationDateTime',
      header: 'Date & Time',
      render: (r: Reservation) => (
        <div>
          <div className="font-medium">
            {new Date(r.reservationDateTime).toLocaleDateString()}
          </div>
          <div className="text-sm text-slate-500">
            {new Date(r.reservationDateTime).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (r: Reservation) => (
        <div>
          <div className="font-medium">{r.customerName}</div>
          <div className="text-sm text-slate-500">{r.customerPhone}</div>
        </div>
      ),
    },
    {
      key: 'table',
      header: 'Table',
      render: (r: Reservation) => {
        const table = r.table as RestaurantTable;
        return table?.tableNumber || '-';
      },
    },
    {
      key: 'guestCount',
      header: 'Guests',
      render: (r: Reservation) => r.guestCount,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r: Reservation) => (
        <Badge variant={statusColors[r.status]}>{r.status}</Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r: Reservation) => (
        <div className="flex items-center gap-2">
          {r.status === 'CONFIRMED' && (
            <Button size="sm" onClick={() => handleSeat(r)}>
              Seat
            </Button>
          )}
          {!['SEATED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(r.status) && (
            <Select
              value={r.status}
              options={updateStatusOptions}
              onChange={(e) =>
                handleStatusChange(r, e.target.value as ReservationStatus)
              }
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <PageHeader
        title="Reservations"
        action={
          <Button onClick={() => setShowModal(true)}>New Reservation</Button>
        }
      />

      <PageContent>
        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="w-48">
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              label="Filter by Date"
            />
          </div>
          <div className="w-48">
            <Select
              label="Filter by Status"
              value={filterStatus}
              options={statusOptions}
              onChange={(e) => setFilterStatus(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900"></div>
          </div>
        ) : (
          <Table data={reservations} columns={columns} />
        )}

        {!loading && reservations.length === 0 && (
          <div className="rounded-lg bg-slate-50 p-12 text-center">
            <p className="text-slate-500">No reservations found</p>
          </div>
        )}
      </PageContent>

      {/* Create Reservation Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="New Reservation"
      >
        <div className="space-y-4">
          <Input
            label="Customer Name"
            value={formData.customerName}
            onChange={(e) =>
              setFormData({ ...formData, customerName: e.target.value })
            }
            placeholder="Enter customer name"
          />
          <Input
            label="Phone Number"
            value={formData.customerPhone}
            onChange={(e) =>
              setFormData({ ...formData, customerPhone: e.target.value })
            }
            placeholder="Enter phone number"
          />
          <Select
            label="Table"
            value={formData.tableId}
            options={[
              { value: '', label: 'Select table' },
              ...availableTables.map((t) => ({
                value: t._id,
                label: `${t.tableNumber} (Capacity: ${t.capacity})`,
              })),
            ]}
            onChange={(e) =>
              setFormData({ ...formData, tableId: e.target.value })
            }
          />
          <Input
            label="Number of Guests"
            type="number"
            value={formData.guestCount}
            onChange={(e) =>
              setFormData({
                ...formData,
                guestCount: parseInt(e.target.value) || 1,
              })
            }
            min={1}
          />
          <Input
            label="Date & Time"
            type="datetime-local"
            value={formData.reservationDateTime}
            onChange={(e) =>
              setFormData({ ...formData, reservationDateTime: e.target.value })
            }
          />
          <Input
            label="Notes (Optional)"
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Special requests, etc."
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                !formData.customerName ||
                !formData.customerPhone ||
                !formData.tableId ||
                !formData.reservationDateTime
              }
            >
              Create Reservation
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
