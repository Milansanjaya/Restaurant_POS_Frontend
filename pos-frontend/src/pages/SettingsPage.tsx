import { useEffect, useState } from 'react';
import { Layout, PageHeader, PageContent, Card, Button, Input, PageLoader } from '../components';
import { configApi } from '../api';
import type { TaxSetting } from '../types';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [taxes, setTaxes] = useState<TaxSetting[]>([]);
  const [currency, setCurrency] = useState<{ code: string; symbol: string; position: 'BEFORE' | 'AFTER' }>({ 
    code: 'USD', 
    symbol: '$', 
    position: 'BEFORE' as const 
  });
  const [invoicePrefix, setInvoicePrefix] = useState('INV');
  const [invoiceFooter, setInvoiceFooter] = useState('Thank you for your business!');
  const [expiryAlertDays, setExpiryAlertDays] = useState(30);
  const [serviceCharge, setServiceCharge] = useState(0);
  const [serviceChargeType, setServiceChargeType] = useState<'FIXED' | 'PERCENTAGE'>('PERCENTAGE');
  const [packagingCharge, setPackagingCharge] = useState(0);
  const [packagingChargeType, setPackagingChargeType] = useState<'FIXED' | 'PERCENTAGE'>('PERCENTAGE');

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await configApi.get();
      if (!data) {
        console.warn('Config API returned null/undefined');
        return;
      }
      setTaxes(data.taxes || []);
      setCurrency(data.currency || { code: 'USD', symbol: '$', position: 'BEFORE' as const });
      setInvoicePrefix(data.invoiceFormat?.prefix || 'INV');
      setInvoiceFooter(data.invoiceFormat?.footer || 'Thank you!');
      setExpiryAlertDays(data.expiryAlertDays || 30);
      setServiceCharge(typeof data.serviceCharge === 'number' ? data.serviceCharge : 0);
      setServiceChargeType((data.serviceChargeType as 'FIXED' | 'PERCENTAGE') || 'PERCENTAGE');
      setPackagingCharge(typeof data.packagingCharge === 'number' ? data.packagingCharge : 0);
      setPackagingChargeType((data.packagingChargeType as 'FIXED' | 'PERCENTAGE') || 'PERCENTAGE');
    } catch (error) {
      console.error('Failed to load config:', error);
      alert('⚠️ Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await configApi.update({
        taxes,
        currency,
        invoiceFormat: {
          prefix: invoicePrefix,
          numberLength: 6,
          footer: invoiceFooter,
        },
        expiryAlertDays,
        serviceCharge,
        serviceChargeType,
        packagingCharge,
        packagingChargeType,
      });
      alert('Settings saved successfully');
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const addTax = () => {
    setTaxes([...taxes, { name: '', rate: 0, isDefault: false, type: 'EXCLUSIVE' }]);
  };

  const updateTax = (index: number, field: string, value: any) => {
    const newTaxes = [...taxes];
    (newTaxes[index] as any)[field] = value;
    setTaxes(newTaxes);
  };

  const removeTax = (index: number) => {
    setTaxes(taxes.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <Layout>
        <PageLoader />
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title="Settings"
        subtitle="Configure your POS system"
        actions={
          <Button onClick={handleSave} loading={saving}>
            Save Changes
          </Button>
        }
      />
      <PageContent>
        <div className="max-w-3xl space-y-6">
          {/* Tax Settings */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Tax Settings</h3>
              <Button size="sm" variant="outline" onClick={addTax}>
                + Add Tax
              </Button>
            </div>
            
            {taxes.length === 0 ? (
              <p className="text-slate-500">No taxes configured</p>
            ) : (
              <div className="space-y-3">
                {taxes.map((tax, index) => (
                  <div key={index} className="flex items-center gap-3 rounded-lg border p-3">
                    <Input
                      placeholder="Tax Name"
                      value={tax.name}
                      onChange={(e) => updateTax(index, 'name', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Rate %"
                      value={tax.rate}
                      onChange={(e) => updateTax(index, 'rate', parseFloat(e.target.value) || 0)}
                      className="w-24"
                    />
                    <select
                      value={tax.type}
                      onChange={(e) => updateTax(index, 'type', e.target.value)}
                      className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
                    >
                      <option value="EXCLUSIVE">Exclusive</option>
                      <option value="INCLUSIVE">Inclusive</option>
                    </select>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={tax.isDefault}
                        onChange={(e) => updateTax(index, 'isDefault', e.target.checked)}
                      />
                      <span className="text-sm">Default</span>
                    </label>
                    <Button size="sm" variant="ghost" onClick={() => removeTax(index)}>
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Service & Packaging Charges */}
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Service & Packaging Charges</h3>
            <div className="grid grid-cols-2 gap-6">
              {/* Service Charge */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Service Charge (Dine-in)
                </label>
                <div className="flex gap-2">
                  <select
                    value={serviceChargeType}
                    onChange={(e) => setServiceChargeType(e.target.value as 'FIXED' | 'PERCENTAGE')}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="PERCENTAGE">% Percentage</option>
                    <option value="FIXED">Rs. Fixed</option>
                  </select>
                  <Input
                    type="number"
                    value={serviceCharge}
                    onChange={(e) => setServiceCharge(parseFloat(e.target.value) || 0)}
                    helperText={serviceChargeType === 'PERCENTAGE' ? 'e.g. 5 = 5% of subtotal' : 'Fixed Rs. amount'}
                    className="flex-1"
                  />
                </div>
              </div>
              {/* Packaging Charge */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Packaging Charge (Takeaway/Delivery)
                </label>
                <div className="flex gap-2">
                  <select
                    value={packagingChargeType}
                    onChange={(e) => setPackagingChargeType(e.target.value as 'FIXED' | 'PERCENTAGE')}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="PERCENTAGE">% Percentage</option>
                    <option value="FIXED">Rs. Fixed</option>
                  </select>
                  <Input
                    type="number"
                    value={packagingCharge}
                    onChange={(e) => setPackagingCharge(parseFloat(e.target.value) || 0)}
                    helperText={packagingChargeType === 'PERCENTAGE' ? 'e.g. 3 = 3% of subtotal' : 'Fixed Rs. amount'}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Currency Settings */}
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Currency</h3>
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Code"
                value={currency.code}
                onChange={(e) => setCurrency({ ...currency, code: e.target.value })}
                placeholder="USD"
              />
              <Input
                label="Symbol"
                value={currency.symbol}
                onChange={(e) => setCurrency({ ...currency, symbol: e.target.value })}
                placeholder="$"
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Position</label>
                <select
                  value={currency.position}
                  onChange={(e) => setCurrency({ ...currency, position: e.target.value as 'BEFORE' | 'AFTER' })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="BEFORE">Before ($100)</option>
                  <option value="AFTER">After (100$)</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Invoice Settings */}
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Invoice Settings</h3>
            <div className="space-y-4">
              <Input
                label="Invoice Prefix"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                placeholder="INV"
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Invoice Footer</label>
                <textarea
                  value={invoiceFooter}
                  onChange={(e) => setInvoiceFooter(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
            </div>
          </Card>

          {/* Other Settings */}
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Other Settings</h3>
            <Input
              label="Expiry Alert Days"
              type="number"
              value={expiryAlertDays}
              onChange={(e) => setExpiryAlertDays(parseInt(e.target.value) || 30)}
              helperText="Days before expiry to show warning alerts"
            />
          </Card>
        </div>
      </PageContent>
    </Layout>
  );
}
