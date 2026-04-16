import { useState, useEffect, useCallback } from 'react';
import { Layout, PageHeader, PageContent, Button } from '../components';
import { orderReturnsApi, type OrderReturn } from '../api/orderReturns.api';
import { formatMoney } from '../money';
import toast from 'react-hot-toast';

// ─── Types ──────────────────────────────────────────────────────────────────
type ReturnStep = 'search' | 'items' | 'type' | 'confirm';
type ReturnType = 'INTERNAL' | 'CUSTOMER';

interface ReturnLineItem {
  product: string;
  productName: string;
  purchasedQty: number;
  price: number;
  returnQty: number;
  reason: string;
  selected: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const stepLabel: Record<ReturnStep, string> = {
  search: '1. Search Order',
  items: '2. Select Items',
  type: '3. Return Type',
  confirm: '4. Confirm',
};

const STEPS: ReturnStep[] = ['search', 'items', 'type', 'confirm'];

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function ReturnDetailModal({ ret, onClose }: { ret: OrderReturn; onClose: () => void }) {
  const saleRef = typeof ret.sale_id === 'object' ? ret.sale_id : null;
  const cashierRef = typeof ret.processedBy === 'object' ? ret.processedBy : null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{ret.returnNumber}</h3>
            <p className="text-sm text-slate-500 mt-0.5">Order: {saleRef?.invoiceNumber ?? ret.invoiceNumber}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {/* Type badge */}
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              ret.returnType === 'INTERNAL'
                ? 'bg-rose-100 text-rose-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}>
              {ret.returnType === 'INTERNAL' ? '🔴 Internal Return (Wastage)' : '🟢 Customer Return (Refund)'}
            </span>
            <span className="text-xs text-slate-400">{new Date(ret.createdAt).toLocaleString()}</span>
          </div>
          {/* Items */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">Product</th>
                  <th className="text-center px-3 py-2 font-medium text-slate-600">Qty</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600">Refund</th>
                </tr>
              </thead>
              <tbody>
                {ret.items.map((item, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{item.productName}</div>
                      <div className="text-xs text-slate-400">{item.reason}</div>
                    </td>
                    <td className="px-3 py-3 text-center text-slate-700">{item.quantity}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatMoney(item.refundAmount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={2} className="px-4 py-3 font-semibold text-slate-700">Total Refund</td>
                  <td className="px-4 py-3 text-right font-bold text-green-600 text-base">{formatMoney(ret.refundAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          {/* Notes */}
          {ret.notes && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              <span className="font-medium">Notes:</span> {ret.notes}
            </div>
          )}
          {/* Cashier */}
          {cashierRef && (
            <p className="text-xs text-slate-400">Processed by: <span className="font-medium text-slate-600">{cashierRef.name}</span></p>
          )}
          {/* Stock note */}
          <div className={`rounded-lg px-4 py-3 text-sm font-medium ${
            ret.returnType === 'CUSTOMER'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-rose-50 text-rose-700'
          }`}>
            {ret.returnType === 'CUSTOMER'
              ? '✅ Stock has been restored to inventory.'
              : '⚠️ Stock was NOT restored (recorded as wastage/loss).'}
          </div>
        </div>
        <div className="p-6 pt-0">
          <Button variant="outline" onClick={onClose} className="w-full">Close</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReturnsPage() {
  const [activeTab, setActiveTab] = useState<'create' | 'view'>('create');

  // ── Create Return State ──
  const [step, setStep] = useState<ReturnStep>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [lineItems, setLineItems] = useState<ReturnLineItem[]>([]);
  const [returnType, setReturnType] = useState<ReturnType | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // ── View Returns State ──
  const [returns, setReturns] = useState<OrderReturn[]>([]);
  const [loadingReturns, setLoadingReturns] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [detailReturn, setDetailReturn] = useState<OrderReturn | null>(null);

  // ── Load returns when tab switches to view ──
  const loadReturns = useCallback(async () => {
    setLoadingReturns(true);
    try {
      const res = await orderReturnsApi.getAll({ returnType: typeFilter || undefined });
      setReturns(res.orderReturns);
    } catch (e) {
      toast.error('Failed to load returns');
    } finally {
      setLoadingReturns(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    if (activeTab === 'view') loadReturns();
  }, [activeTab, loadReturns]);

  // ── Search sales ──
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await orderReturnsApi.searchSales(searchQuery.trim());
      setSearchResults(results);
      if (results.length === 0) toast.error('No completed orders found for that ID.');
    } catch {
      toast.error('Search failed. Check backend connection.');
    } finally {
      setSearching(false);
    }
  };

  // ── Select a sale from search results ──
  const handleSelectSale = (sale: any) => {
    setSelectedSale(sale);
    const lines: ReturnLineItem[] = sale.items.map((si: any) => ({
      product: typeof si.product === 'object' ? si.product._id : si.product,
      productName: typeof si.product === 'object' ? si.product.name : si.productName || 'Item',
      purchasedQty: si.quantity,
      price: si.price,
      returnQty: 0,
      reason: '',
      selected: false,
    }));
    setLineItems(lines);
    setStep('items');
    setSearchResults([]);
  };

  // ── Line item controls ──
  const toggleItem = (idx: number) => {
    setLineItems(prev => prev.map((li, i) =>
      i === idx ? { ...li, selected: !li.selected, returnQty: li.selected ? 0 : 1 } : li
    ));
  };

  const setQty = (idx: number, qty: number) => {
    setLineItems(prev => prev.map((li, i) =>
      i === idx ? { ...li, returnQty: Math.min(Math.max(1, qty), li.purchasedQty) } : li
    ));
  };

  const setReason = (idx: number, reason: string) => {
    setLineItems(prev => prev.map((li, i) => i === idx ? { ...li, reason } : li));
  };

  const selectedItems = lineItems.filter(li => li.selected);
  const totalRefund = selectedItems.reduce((s, li) => s + li.price * li.returnQty, 0);

  // ── Validate items step ──
  const canProceedFromItems = () => {
    if (selectedItems.length === 0) return false;
    return selectedItems.every(li => li.returnQty > 0 && li.reason.trim());
  };

  // ── Save return ──
  const handleSave = async () => {
    if (!selectedSale || !returnType || selectedItems.length === 0) return;
    setSaving(true);
    try {
      await orderReturnsApi.create({
        sale_id: selectedSale._id,
        returnType,
        items: selectedItems.map(li => ({
          product: li.product,
          productName: li.productName,
          quantity: li.returnQty,
          reason: li.reason,
        })),
        notes: notes.trim() || undefined,
      });
      toast.success(`✅ Return created! Refund: ${formatMoney(totalRefund)}`);
      // Reset form
      setStep('search');
      setSearchQuery('');
      setSelectedSale(null);
      setLineItems([]);
      setReturnType(null);
      setNotes('');
      setActiveTab('view');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create return');
    } finally {
      setSaving(false);
    }
  };

  // ── Reset form ──
  const resetForm = () => {
    setStep('search');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedSale(null);
    setLineItems([]);
    setReturnType(null);
    setNotes('');
  };

  // ── Step indicator ──
  const StepIndicator = () => (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((s, i) => {
        const current = STEPS.indexOf(step);
        const done = i < current;
        const active = s === step;
        return (
          <div key={s} className="flex items-center">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              active ? 'bg-slate-900 text-white shadow-md' :
              done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
            }`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                active ? 'bg-white/20' : done ? 'bg-white/30' : 'bg-slate-200 text-slate-500'
              }`}>
                {done ? '✓' : i + 1}
              </span>
              <span className="hidden sm:inline">{stepLabel[s]}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-6 h-0.5 mx-1 ${done ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );

  // ─────────────────────────── RENDER ───────────────────────────────────────
  return (
    <Layout>
      <PageHeader
        title="Order Returns"
        subtitle="Process customer order returns without modifying the original order"
      />
      <PageContent>
        {/* Tab Navigation */}
        <div className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
          <button
            onClick={() => { setActiveTab('create'); resetForm(); }}
            className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition ${
              activeTab === 'create' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ↩ Create Return
          </button>
          <button
            onClick={() => setActiveTab('view')}
            className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition ${
              activeTab === 'view' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📋 View Returns
          </button>
        </div>

        {/* ── TAB 1: CREATE RETURN ── */}
        {activeTab === 'create' && (
          <div className="max-w-3xl">
            <StepIndicator />

            {/* STEP 1: SEARCH */}
            {step === 'search' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-8">
                <h2 className="text-xl font-bold text-slate-900 mb-1">Search Order</h2>
                <p className="text-sm text-slate-500 mb-6">Enter the Invoice ID or Order ID to find the order to return.</p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder="e.g. INV-1713273600000"
                    className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <Button onClick={handleSearch} loading={searching} disabled={!searchQuery.trim()}>
                    Search
                  </Button>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-5 space-y-2">
                    <p className="text-sm font-medium text-slate-600 mb-2">{searchResults.length} order(s) found:</p>
                    {searchResults.map(sale => (
                      <button
                        key={sale._id}
                        onClick={() => handleSelectSale(sale)}
                        className="w-full text-left rounded-xl border border-slate-200 hover:border-slate-400 hover:bg-slate-50 p-4 transition"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-slate-900">{sale.invoiceNumber}</div>
                            <div className="text-sm text-slate-500 mt-0.5">
                              {sale.items?.length ?? 0} items · {formatMoney(sale.grandTotal)} ·{' '}
                              <span className="capitalize">{sale.orderType?.toLowerCase()}</span>
                            </div>
                          </div>
                          <div className="text-sm text-slate-400">
                            {sale.createdAt && new Date(sale.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: SELECT ITEMS */}
            {step === 'items' && selectedSale && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-xl font-bold text-slate-900">Select Items to Return</h2>
                    <button onClick={() => setStep('search')} className="text-sm text-slate-400 hover:text-slate-600">← Back</button>
                  </div>
                  <p className="text-sm text-slate-500 mb-5">
                    Order: <span className="font-medium text-slate-700">{selectedSale.invoiceNumber}</span> ·
                    Qty cannot exceed purchased quantity.
                  </p>

                  <div className="space-y-3">
                    {lineItems.map((li, i) => (
                      <div key={i} className={`rounded-xl border p-4 transition ${
                        li.selected ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
                      }`}>
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={li.selected}
                            onChange={() => toggleItem(i)}
                            className="mt-1 h-4 w-4 rounded border-slate-400 accent-slate-900"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-semibold text-slate-800">{li.productName}</div>
                                <div className="text-xs text-slate-400 mt-0.5">
                                  Purchased: {li.purchasedQty} × {formatMoney(li.price)}
                                </div>
                              </div>
                              <div className="text-sm font-bold text-slate-700">
                                {li.selected ? formatMoney(li.price * li.returnQty) : formatMoney(li.price * li.purchasedQty)}
                              </div>
                            </div>

                            {li.selected && (
                              <div className="mt-3 grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs font-medium text-slate-600 mb-1 block">Return Qty (max {li.purchasedQty})</label>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => setQty(i, li.returnQty - 1)}
                                      disabled={li.returnQty <= 1}
                                      className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 disabled:opacity-40 text-lg"
                                    >−</button>
                                    <input
                                      type="number"
                                      min={1}
                                      max={li.purchasedQty}
                                      value={li.returnQty}
                                      onChange={e => setQty(i, parseInt(e.target.value) || 1)}
                                      className="w-12 text-center border border-slate-300 rounded-lg px-1 py-1.5 text-sm font-semibold"
                                    />
                                    <button
                                      onClick={() => setQty(i, li.returnQty + 1)}
                                      disabled={li.returnQty >= li.purchasedQty}
                                      className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 disabled:opacity-40 text-lg"
                                    >+</button>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-slate-600 mb-1 block">Reason *</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Wrong item, Damaged"
                                    value={li.reason}
                                    onChange={e => setReason(i, e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedItems.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 px-6 py-4 flex items-center justify-between">
                    <div>
                      <span className="text-sm text-slate-500">{selectedItems.length} item(s) selected</span>
                      <div className="text-xl font-bold text-green-600">{formatMoney(totalRefund)} refund</div>
                    </div>
                    <Button onClick={() => setStep('type')} disabled={!canProceedFromItems()}>
                      Next: Choose Return Type →
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: RETURN TYPE */}
            {step === 'type' && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-xl font-bold text-slate-900">Choose Return Type</h2>
                    <button onClick={() => setStep('items')} className="text-sm text-slate-400 hover:text-slate-600">← Back</button>
                  </div>
                  <p className="text-sm text-slate-500 mb-6">Select the type of return — this determines how stock and finances are handled.</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Internal Return */}
                    <button
                      onClick={() => { setReturnType('INTERNAL'); setStep('confirm'); }}
                      className={`rounded-2xl border-2 p-6 text-left transition hover:shadow-md ${
                        returnType === 'INTERNAL' ? 'border-rose-500 bg-rose-50' : 'border-slate-200 hover:border-rose-300'
                      }`}
                    >
                      <div className="text-3xl mb-3">🔴</div>
                      <div className="text-base font-bold text-slate-900 mb-1">Internal Return</div>
                      <div className="text-sm text-slate-500 mb-4">
                        Issue is from the business side — wrong item served, damaged goods, etc.
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="text-green-600 font-bold">✓</span> Refund customer
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="text-red-500 font-bold">✗</span> Stock NOT restored
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="text-amber-500 font-bold">!</span> Recorded as wastage/loss
                        </div>
                      </div>
                    </button>

                    {/* Customer Return */}
                    <button
                      onClick={() => { setReturnType('CUSTOMER'); setStep('confirm'); }}
                      className={`rounded-2xl border-2 p-6 text-left transition hover:shadow-md ${
                        returnType === 'CUSTOMER' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="text-3xl mb-3">🟢</div>
                      <div className="text-base font-bold text-slate-900 mb-1">Customer Return</div>
                      <div className="text-sm text-slate-500 mb-4">
                        Customer returns an unused / resalable item.
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="text-green-600 font-bold">✓</span> Refund customer
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="text-green-600 font-bold">✓</span> Item added back to stock
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="text-blue-500 font-bold">✓</span> Cashier must confirm resalable
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: CONFIRM */}
            {step === 'confirm' && returnType && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-xl font-bold text-slate-900">Confirm Return</h2>
                    <button onClick={() => setStep('type')} className="text-sm text-slate-400 hover:text-slate-600">← Back</button>
                  </div>
                  <p className="text-sm text-slate-500 mb-5">Review the details before saving. The original order will NOT be modified.</p>

                  {/* Summary banner */}
                  <div className={`rounded-xl p-4 mb-5 ${returnType === 'INTERNAL' ? 'bg-rose-50 border border-rose-200' : 'bg-emerald-50 border border-emerald-200'}`}>
                    <div className="flex items-center gap-2 font-semibold text-sm mb-1">
                      {returnType === 'INTERNAL' ? '🔴 Internal Return — Wastage/Loss' : '🟢 Customer Return — Stock Restored'}
                    </div>
                    <div className="text-xs text-slate-500">
                      Original Order: <strong>{selectedSale?.invoiceNumber}</strong>
                    </div>
                  </div>

                  {/* Items summary */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden mb-4">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Product</th>
                          <th className="text-center px-3 py-2.5 font-semibold text-slate-600">Qty</th>
                          <th className="text-left px-3 py-2.5 font-semibold text-slate-600">Reason</th>
                          <th className="text-right px-4 py-2.5 font-semibold text-slate-600">Refund</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedItems.map((li, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="px-4 py-3 font-medium text-slate-800">{li.productName}</td>
                            <td className="px-3 py-3 text-center text-slate-700">{li.returnQty}</td>
                            <td className="px-3 py-3 text-slate-500 text-xs">{li.reason}</td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatMoney(li.price * li.returnQty)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t border-slate-200">
                        <tr>
                          <td colSpan={3} className="px-4 py-3 font-bold text-slate-700">Total Refund</td>
                          <td className="px-4 py-3 text-right font-bold text-green-600 text-lg">{formatMoney(totalRefund)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes (optional)</label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Any additional notes about this return..."
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={resetForm} className="flex-1">Cancel</Button>
                  <Button
                    onClick={handleSave}
                    loading={saving}
                    className={`flex-1 ${returnType === 'CUSTOMER' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'} text-white`}
                  >
                    {saving ? 'Processing…' : `Save ${returnType === 'INTERNAL' ? 'Internal' : 'Customer'} Return`}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: VIEW RETURNS ── */}
        {activeTab === 'view' && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm bg-white"
              >
                <option value="">All Types</option>
                <option value="INTERNAL">🔴 Internal Returns</option>
                <option value="CUSTOMER">🟢 Customer Returns</option>
              </select>
              <Button variant="outline" onClick={loadReturns}>🔄 Refresh</Button>
            </div>

            {loadingReturns ? (
              <div className="text-center py-16 text-slate-400">Loading returns…</div>
            ) : returns.length === 0 ? (
              <div className="text-center py-16 text-slate-400">No returns found</div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-5 py-3.5 font-semibold text-slate-600">Return #</th>
                      <th className="text-left px-3 py-3.5 font-semibold text-slate-600">Order ID</th>
                      <th className="text-left px-3 py-3.5 font-semibold text-slate-600">Type</th>
                      <th className="text-center px-3 py-3.5 font-semibold text-slate-600">Items</th>
                      <th className="text-right px-3 py-3.5 font-semibold text-slate-600">Refund</th>
                      <th className="text-left px-3 py-3.5 font-semibold text-slate-600">Date</th>
                      <th className="text-right px-5 py-3.5 font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returns.map(ret => {
                      const saleRef = typeof ret.sale_id === 'object' ? ret.sale_id : null;
                      return (
                        <tr key={ret._id} className="border-t border-slate-100 hover:bg-slate-50 transition">
                          <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-800">{ret.returnNumber}</td>
                          <td className="px-3 py-3.5 text-slate-600 text-xs">{saleRef?.invoiceNumber ?? ret.invoiceNumber}</td>
                          <td className="px-3 py-3.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              ret.returnType === 'INTERNAL'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {ret.returnType === 'INTERNAL' ? '🔴 Internal' : '🟢 Customer'}
                            </span>
                          </td>
                          <td className="px-3 py-3.5 text-center text-slate-700">{ret.items.length}</td>
                          <td className="px-3 py-3.5 text-right font-bold text-green-600">{formatMoney(ret.refundAmount)}</td>
                          <td className="px-3 py-3.5 text-slate-500 text-xs">
                            {new Date(ret.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={() => setDetailReturn(ret)}
                              className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </PageContent>

      {/* Detail Modal */}
      {detailReturn && (
        <ReturnDetailModal ret={detailReturn} onClose={() => setDetailReturn(null)} />
      )}
    </Layout>
  );
}
