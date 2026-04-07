import { useEffect, useState } from 'react';
import { Layout, PageHeader, PageContent } from '../components/Layout';
import { Button, Input, Card } from '../components';
import { shiftsApi } from '../api/shifts.api';
import type { Shift } from '../types';

export default function ShiftsPage() {
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [openingCash, setOpeningCash] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load current shift on page mount
  useEffect(() => {
    loadCurrentShift();
  }, []);

  const loadCurrentShift = async () => {
    try {
      setInitialLoading(true);
      const shift = await shiftsApi.getCurrent();
      setCurrentShift(shift);
    } catch (err: any) {
      console.error('Failed to load current shift:', err);
      // Don't show error if no shift found - that's expected
      if (err?.response?.status !== 404) {
        setError(err?.response?.data?.message || 'Failed to load shift');
      }
    } finally {
      setInitialLoading(false);
    }
  };

  const handleOpenShift = async () => {
    const amount = parseFloat(openingCash);
    if (isNaN(amount) || amount < 0) {
      setError('Please enter a valid opening cash amount');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const shift = await shiftsApi.open(amount);
      setCurrentShift(shift);
      setOpeningCash('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to open shift');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async () => {
    const amount = parseFloat(closingCash);
    if (isNaN(amount) || amount < 0) {
      setError('Please enter a valid closing cash amount');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const shift = await shiftsApi.close(amount);
      setCurrentShift(shift);
      setClosingCash('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to close shift');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const resetShift = () => {
    setCurrentShift(null);
    setError(null);
  };

  return (
    <Layout>
      <PageHeader title="Shift Management" />

      <PageContent>
        <div className="mx-auto max-w-2xl space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Loading State */}
          {initialLoading && (
            <div className="rounded-lg bg-slate-50 p-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900"></div>
              <p className="mt-4 text-slate-600">Loading shift information...</p>
            </div>
          )}

          {/* Current Shift Status */}
          {!initialLoading && currentShift && currentShift.status === 'OPEN' && (
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Current Shift
              </h2>
              <div className="mb-6 space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">Status</span>
                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                    OPEN
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Opened At</span>
                  <span className="font-medium">
                    {new Date(currentShift.openedAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Opening Cash</span>
                  <span className="font-medium">
                    {formatCurrency(currentShift.openingCash)}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="mb-3 font-medium text-slate-900">Close Shift</h3>
                <div className="space-y-4">
                  <Input
                    label="Closing Cash Amount"
                    type="number"
                    value={closingCash}
                    onChange={(e) => setClosingCash(e.target.value)}
                    placeholder="Enter closing cash"
                    step="0.01"
                    min="0"
                  />
                  <Button
                    onClick={handleCloseShift}
                    disabled={loading || !closingCash}
                    className="w-full"
                  >
                    {loading ? 'Closing...' : 'Close Shift'}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Closed Shift Summary */}
          {currentShift && currentShift.status === 'CLOSED' && (
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Shift Summary
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">Status</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                    CLOSED
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Opened At</span>
                  <span className="font-medium">
                    {new Date(currentShift.openedAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Closed At</span>
                  <span className="font-medium">
                    {currentShift.closedAt
                      ? new Date(currentShift.closedAt).toLocaleString()
                      : '-'}
                  </span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Opening Cash</span>
                    <span className="font-medium">
                      {formatCurrency(currentShift.openingCash)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Closing Cash</span>
                  <span className="font-medium">
                    {formatCurrency(currentShift.closingCash || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Expected Cash</span>
                  <span className="font-medium">
                    {formatCurrency(currentShift.expectedCash || 0)}
                  </span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg">
                    <span className="font-medium text-slate-900">Difference</span>
                    <span
                      className={`font-bold ${
                        (currentShift.cashDifference || 0) >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {(currentShift.cashDifference || 0) >= 0 ? '+' : ''}
                      {formatCurrency(currentShift.cashDifference || 0)}
                    </span>
                  </div>
                  {(currentShift.cashDifference || 0) !== 0 && (
                    <p className="mt-2 text-sm text-slate-500">
                      {(currentShift.cashDifference || 0) > 0
                        ? 'Cash overage detected'
                        : 'Cash shortage detected'}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-6">
                <Button
                  variant="secondary"
                  onClick={resetShift}
                  className="w-full"
                >
                  Start New Shift
                </Button>
              </div>
            </Card>
          )}

          {/* Open New Shift */}
          {!initialLoading && !currentShift && (
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Open New Shift
              </h2>
              <p className="mb-6 text-sm text-slate-600">
                Start your shift by entering the opening cash amount in the drawer.
              </p>
              <div className="space-y-4">
                <Input
                  label="Opening Cash Amount"
                  type="number"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  placeholder="Enter opening cash"
                  step="0.01"
                  min="0"
                />
                <Button
                  onClick={handleOpenShift}
                  disabled={loading || !openingCash}
                  className="w-full"
                >
                  {loading ? 'Opening...' : 'Open Shift'}
                </Button>
              </div>
            </Card>
          )}

          {/* Instructions */}
          <Card className="bg-slate-50 p-6">
            <h3 className="mb-3 font-medium text-slate-900">How Shifts Work</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                <span>Open a shift at the start of your work period by recording the cash in the drawer</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                <span>All cash sales during your shift will be tracked automatically</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                <span>Close the shift by counting and entering the final cash amount</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                <span>The system will calculate any cash variance (overage or shortage)</span>
              </li>
            </ul>
          </Card>
        </div>
      </PageContent>
    </Layout>
  );
}
