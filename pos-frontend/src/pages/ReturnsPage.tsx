import { useState, useEffect, useCallback } from 'react';
import { Layout, PageHeader, PageContent } from '../components';
import { Button } from '../components';
import { orderReturnsApi, type OrderReturn } from '../api/orderReturns.api';
import { formatMoney } from '../money';
import toast from 'react-hot-toast';

// ─── Types ──────────────────────────────────────────────────────────────────
type ReturnType = 'INTERNAL' | 'CUSTOMER';

interface ReturnLineItem {
  product: string;
  productName: string;
  purchasedQty: number;
  price: number;
  costPrice: number;  // COGS per unit
  returnQty: number;
  reason: string;
  selected: boolean;
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function ReturnDetailModal({ ret, onClose }: { ret: OrderReturn; onClose: () => void }) {
  const saleRef    = typeof ret.sale_id      === 'object' ? ret.sale_id      : null;
  const cashierRef = typeof ret.processedBy  === 'object' ? ret.processedBy  : null;
  const totalCost  = ret.totalCostAmount ?? 0;
  const pnlImpact  = ret.netPnlImpact    ?? 0;

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

          {/* Items table */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">Product</th>
                  <th className="text-center px-3 py-2 font-medium text-slate-600">Qty</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Refund</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600">COGS</th>
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
                    <td className="px-3 py-3 text-right font-semibold text-slate-900">{formatMoney(item.refundAmount)}</td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500">{formatMoney(item.costAmount ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={2} className="px-4 py-2.5 font-semibold text-slate-700 text-xs uppercase">Totals</td>
                  <td className="px-3 py-2.5 text-right font-bold text-green-600">{formatMoney(ret.refundAmount)}</td>
                  <td className="px-4 py-2.5 text-right text-xs text-slate-500 font-medium">{formatMoney(totalCost)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* P&L Breakdown */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-200">
              Profit & Loss Impact
            </div>
            <div className="divide-y divide-slate-100">
              {ret.returnType === 'CUSTOMER' ? (
                <>
                  <div className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-slate-600">Revenue lost (refund)</span>
                    <span className="font-medium text-red-600">− {formatMoney(ret.refundAmount)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-slate-600">COGS recovered (restocked)</span>
                    <span className="font-medium text-green-600">+ {formatMoney(totalCost)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5 text-sm bg-red-50">
                    <span className="font-semibold text-slate-800">Net P&L Impact (Gross Profit Lost)</span>
                    <span className="font-bold text-red-700">{formatMoney(pnlImpact)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-slate-600">Refund issued</span>
                    <span className="font-medium text-slate-500">None</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-slate-600">COGS written off (wastage)</span>
                    <span className="font-medium text-red-600">− {formatMoney(totalCost)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5 text-sm bg-red-50">
                    <span className="font-semibold text-slate-800">Net P&L Impact (Wastage Loss)</span>
                    <span className="font-bold text-red-700">{formatMoney(pnlImpact)}</span>
                  </div>
                </>
              )}
            </div>
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [lineItems, setLineItems] = useState<ReturnLineItem[]>([]);
  const [returnType, setReturnType] = useState<ReturnType>('CUSTOMER');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // ── View Returns State ──
  const [returns, setReturns] = useState<OrderReturn[]>([]);
  const [pnlSummary, setPnlSummary] = useState<{ totalRefunds: number; totalCostImpact: number; totalPnlImpact: number } | null>(null);
  const [loadingReturns, setLoadingReturns] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [detailReturn, setDetailReturn] = useState<OrderReturn | null>(null);

  // ── Load returns when tab switches to view ──
  const loadReturns = useCallback(async () => {
    setLoadingReturns(true);
    try {
      const res = await orderReturnsApi.getAll({ returnType: typeFilter || undefined });
      setReturns(res.orderReturns);
      setPnlSummary(res.pnlSummary ?? null);
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
      // If only one result, auto-select it
      if (results.length === 1) {
        handleSelectSale(results[0]);
      }
    } catch {
      toast.error('Search failed. Check backend connection.');
    } finally {
      setSearching(false);
    }
  };

  // ── Select a sale from search results ──
  const handleSelectSale = (sale: any) => {
    setSelectedSale(sale);
    const lines: ReturnLineItem[] = sale.items.map((si: any) => {
      const productDoc = typeof si.product === 'object' ? si.product : null;
      return {
        product:      productDoc?._id ?? si.product,
        productName:  productDoc?.name ?? si.productName ?? 'Item',
        purchasedQty: si.quantity,
        price:        si.price,
        costPrice:    productDoc?.cost ?? 0,
        returnQty:    0,
        reason:       '',
        selected:     false,
      };
    });
    setLineItems(lines);
    setSearchResults([]);
    setReturnType('CUSTOMER');
    setNotes('');
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

  const selectAll = () => {
    setLineItems(prev => prev.map(li => ({ ...li, selected: true, returnQty: li.returnQty || 1 })));
  };

  const deselectAll = () => {
    setLineItems(prev => prev.map(li => ({ ...li, selected: false, returnQty: 0 })));
  };

  const selectedItems = lineItems.filter(li => li.selected);
  const totalRefund = selectedItems.reduce((s, li) => s + li.price * li.returnQty, 0);
  const totalCost   = selectedItems.reduce((s, li) => s + li.costPrice * li.returnQty, 0);
  // Estimated P&L impact preview (mirrors backend logic)
  const estimatedPnl =
    returnType === 'CUSTOMER'
      ? -(totalRefund - totalCost)   // gross profit lost
      : -totalCost;                  // wastage write-off

  // ── Validate form ──
  const canSubmit = () => {
    if (!selectedSale) return false;
    if (selectedItems.length === 0) return false;
    return selectedItems.every(li => li.returnQty > 0 && li.reason.trim());
  };

  // ── Save return ──
  const handleSave = async () => {
    if (!selectedSale || selectedItems.length === 0) return;
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
      resetForm();
      setActiveTab('view');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create return');
    } finally {
      setSaving(false);
    }
  };

  // ── Reset form ──
  const resetForm = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedSale(null);
    setLineItems([]);
    setReturnType('CUSTOMER');
    setNotes('');
  };

  // ─────────────────────────── RENDER ───────────────────────────────────────
  return (
    <Layout>
      <PageHeader
        title="Order Returns"
        subtitle="Process returns in a single streamlined flow"
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

        {/* ── TAB 1: CREATE RETURN (Single Form) ── */}
        {activeTab === 'create' && (
          <div className="max-w-4xl space-y-5">

            {/* ── SEARCH BAR ── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Search Order</h2>
              <p className="text-sm text-slate-500 mb-4">Enter an Invoice ID or Order ID. The order details will load automatically.</p>
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
                {selectedSale && (
                  <Button variant="outline" onClick={resetForm}>
                    Clear
                  </Button>
                )}
              </div>

              {/* Search Results (only if multiple) */}
              {searchResults.length > 1 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-slate-600">{searchResults.length} orders found — select one:</p>
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

            {/* ── FULL RETURN FORM (appears after order is selected) ── */}
            {selectedSale && (
              <>
                {/* Order Info Card */}
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl border border-slate-200 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Selected Order</div>
                      <div className="text-xl font-bold text-slate-900 mt-1">{selectedSale.invoiceNumber}</div>
                    </div>
                    <div className="flex gap-6 text-sm">
                      <div>
                        <span className="text-slate-500">Date: </span>
                        <span className="font-medium text-slate-800">
                          {selectedSale.createdAt && new Date(selectedSale.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Items: </span>
                        <span className="font-medium text-slate-800">{selectedSale.items?.length ?? 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Total: </span>
                        <span className="font-bold text-slate-900">{formatMoney(selectedSale.grandTotal)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Type: </span>
                        <span className="font-medium text-slate-800 capitalize">{selectedSale.orderType?.toLowerCase()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items Selection + Return Type side-by-side on large screens */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                  {/* Items Selection (2/3 width) */}
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Select Items to Return</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Check items, set return qty and reason for each.</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={selectAll} className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50">
                          Select All
                        </button>
                        <button onClick={deselectAll} className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-50">
                          Deselect All
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {lineItems.map((li, i) => (
                        <div key={i} className={`rounded-xl border p-4 transition ${
                          li.selected ? 'border-slate-900 bg-slate-50 shadow-sm' : 'border-slate-200 bg-white'
                        }`}>
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={li.selected}
                              onChange={() => toggleItem(i)}
                              className="h-4 w-4 rounded border-slate-400 accent-slate-900 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="font-semibold text-slate-800 truncate">{li.productName}</div>
                                <div className="text-sm font-bold text-slate-700 shrink-0 ml-2">
                                  {li.selected ? formatMoney(li.price * li.returnQty) : formatMoney(li.price * li.purchasedQty)}
                                </div>
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                Purchased: {li.purchasedQty} × {formatMoney(li.price)}
                              </div>
                            </div>
                          </div>

                          {li.selected && (
                            <div className="mt-3 flex flex-wrap items-end gap-3 pl-7">
                              <div className="w-36">
                                <label className="text-xs font-medium text-slate-600 mb-1 block">Return Qty (max {li.purchasedQty})</label>
                                <div className="flex items-center gap-1">
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
                              <div className="flex-1 min-w-[160px]">
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
                      ))}
                    </div>
                  </div>

                  {/* Return Type + Notes (1/3 width) */}
                  <div className="space-y-5">
                    {/* Return Type */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6">
                      <h3 className="text-base font-bold text-slate-900 mb-1">Return Type</h3>
                      <p className="text-xs text-slate-500 mb-4">Select how stock and refund should be handled.</p>

                      <div className="space-y-3">
                        <label
                          className={`flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition ${
                            returnType === 'CUSTOMER' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="returnType"
                            checked={returnType === 'CUSTOMER'}
                            onChange={() => setReturnType('CUSTOMER')}
                            className="mt-0.5 accent-emerald-600"
                          />
                          <div>
                            <div className="font-semibold text-slate-900 text-sm">🟢 Customer Return</div>
                            <div className="text-xs text-slate-500 mt-1">Refund customer + restore stock</div>
                          </div>
                        </label>

                        <label
                          className={`flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition ${
                            returnType === 'INTERNAL' ? 'border-rose-500 bg-rose-50' : 'border-slate-200 hover:border-rose-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="returnType"
                            checked={returnType === 'INTERNAL'}
                            onChange={() => setReturnType('INTERNAL')}
                            className="mt-0.5 accent-rose-600"
                          />
                          <div>
                            <div className="font-semibold text-slate-900 text-sm">🔴 Internal Return</div>
                            <div className="text-xs text-slate-500 mt-1">Wastage/loss — stock NOT restored</div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6">
                      <h3 className="text-base font-bold text-slate-900 mb-3">Notes (optional)</h3>
                      <textarea
                        rows={3}
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Any additional notes about this return..."
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                      />
                    </div>

                    {/* Stock Impact Info */}
                    <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
                      returnType === 'CUSTOMER'
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                        : 'bg-rose-50 border border-rose-200 text-rose-700'
                    }`}>
                      {returnType === 'CUSTOMER'
                        ? '✅ Stock will be restored to inventory on submit.'
                        : '⚠️ Stock will NOT be restored (recorded as wastage/loss).'}
                    </div>
                  </div>
                </div>

                {/* ── SUMMARY BAR (sticky at bottom) ── */}
                <div className="sticky bottom-0 z-10 bg-white rounded-2xl border border-slate-200 shadow-lg px-6 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-sm text-slate-500">
                        {selectedItems.length} item(s) selected for return
                        {selectedItems.length > 0 && !canSubmit() && (
                          <span className="text-amber-600 ml-2">— fill in qty &amp; reason for all items</span>
                        )}
                      </div>
                      {/* Refund + P&L row */}
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        <div>
                          <span className="text-xs text-slate-400">Refund</span>
                          <div className="text-2xl font-bold text-green-600">{formatMoney(totalRefund)}</div>
                        </div>
                        {selectedItems.length > 0 && (
                          <>
                            <div className="text-slate-200 text-xl">|</div>
                            <div>
                              <span className="text-xs text-slate-400">COGS impact</span>
                              <div className="text-base font-semibold text-slate-600">{formatMoney(totalCost)}</div>
                            </div>
                            <div className="text-slate-200 text-xl">|</div>
                            <div>
                              <span className="text-xs text-slate-400">Est. P&L impact</span>
                              <div className={`text-base font-bold ${
                                estimatedPnl < 0 ? 'text-red-600' : 'text-slate-600'
                              }`}>
                                {estimatedPnl <= 0 ? '− ' : '+ '}{formatMoney(Math.abs(estimatedPnl))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={resetForm}>Cancel</Button>
                      <Button
                        onClick={handleSave}
                        loading={saving}
                        disabled={!canSubmit()}
                        className={`${returnType === 'CUSTOMER' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'} text-white px-8`}
                      >
                        {saving ? 'Processing…' : `Submit ${returnType === 'INTERNAL' ? 'Internal' : 'Customer'} Return`}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
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

          {/* P&L Summary Card */}
            {pnlSummary && returns.length > 0 && (
              <div className="mb-5 grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Total Refunds</div>
                  <div className="text-xl font-bold text-green-600">{formatMoney(pnlSummary.totalRefunds)}</div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">COGS Impact</div>
                  <div className="text-xl font-bold text-slate-700">{formatMoney(pnlSummary.totalCostImpact)}</div>
                </div>
                <div className="bg-white rounded-xl border border-red-200 bg-red-50 px-5 py-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-red-400 mb-1">Net P&L Loss</div>
                  <div className="text-xl font-bold text-red-600">− {formatMoney(Math.abs(pnlSummary.totalPnlImpact))}</div>
                </div>
              </div>
            )}

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
                      <th className="text-right px-3 py-3.5 font-semibold text-slate-600">Net P&L</th>
                      <th className="text-left px-3 py-3.5 font-semibold text-slate-600">Date</th>
                      <th className="text-right px-5 py-3.5 font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returns.map(ret => {
                      const saleRef  = typeof ret.sale_id === 'object' ? ret.sale_id : null;
                      const pnl      = ret.netPnlImpact ?? 0;
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
                          <td className="px-3 py-3.5 text-right">
                            <span className="font-semibold text-red-600 text-xs">
                              − {formatMoney(Math.abs(pnl))}
                            </span>
                          </td>
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
