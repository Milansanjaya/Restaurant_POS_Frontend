import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Layout, PageHeader, PageContent, Table, Badge, Button, Input, Modal } from '../components';
import { inventoryApi } from '../api';
import type { Inventory, Product } from '../types';

export default function InventoryPage() {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Inventory | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState(0);
  const [adjustmentType, setAdjustmentType] = useState<'PURCHASE' | 'ADJUSTMENT' | 'RETURN'>('ADJUSTMENT');
  const [cleaning, setCleaning] = useState(false);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const data = await inventoryApi.getAll();
      // Filter out items with null/undefined products (deleted products)
      const validData = (data || []).filter(item => {
        if (!item) return false;
        // Check if product exists and is an object with _id
        if (typeof item.product === 'object' && item.product && item.product._id) {
          return true;
        }
        // If product is just an ID string, we can't verify it exists, so exclude it
        return false;
      });
      setInventory(validData);
      
      if (validData.length === 0 && data && data.length > 0) {
        toast.error('⚠️ Some inventory items reference deleted products. Click "Cleanup" to remove them.');
      }
    } catch (error) {
      console.error('Failed to load inventory:', error);
      toast.error('❌ Failed to load inventory');
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const openAdjustModal = (item: Inventory) => {
    const product = getProduct(item);
    if (product && !product.trackStock) {
      toast.error('❌ Cannot adjust stock for non-tracked products');
      return;
    }
    setSelectedItem(item);
    setAdjustmentQty(0);
    setAdjustmentType('ADJUSTMENT');
    setAdjustModalOpen(true);
  };

  const handleAdjust = async () => {
    if (!selectedItem || adjustmentQty === 0) {
      toast.error('❌ Please enter a quantity to adjust');
      return;
    }
    const productId = typeof selectedItem.product === 'object' 
      ? selectedItem.product._id 
      : selectedItem.product;
    
    try {
      await inventoryApi.adjust({
        productId,
        quantityChange: adjustmentQty,
        type: adjustmentType,
      });
      toast.success(`✅ Inventory adjusted by ${adjustmentQty > 0 ? '+' : ''}${adjustmentQty}`);
      setAdjustModalOpen(false);
      loadInventory();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || '❌ Failed to adjust inventory');
    }
  };

  const handleCleanup = async () => {
    if (!confirm('Deactivate inventory items for deleted/inactive products? This will hide them from the inventory list.')) return;
    
    try {
      setCleaning(true);
      const result = await inventoryApi.cleanup();
      const count = result.deactivated || result.deleted || 0;
      if (count > 0) {
        toast.success(`✅ Cleanup complete! ${count} items deactivated`);
      } else {
        toast.success('✅ No orphaned items found');
      }
      loadInventory();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || '❌ Failed to cleanup inventory');
    } finally {
      setCleaning(false);
    }
  };

  const getProduct = (item: Inventory | null): Product | null => {
    if (!item) return null;
    return (item.product && typeof item.product === 'object') ? item.product : null;
  };

  const filteredInventory = inventory.filter((item) => {
    const product = getProduct(item);
    if (!product) return false;
    if (!search) return true;
    return product?.name.toLowerCase().includes(search.toLowerCase()) ||
           product?.sku.toLowerCase().includes(search.toLowerCase());
  });

  // Separate tracked and untracked products
  const trackedInventory = filteredInventory.filter((item) => {
    const product = getProduct(item);
    return product?.trackStock === true;
  });

  const untrackedInventory = filteredInventory.filter((item) => {
    const product = getProduct(item);
    return product?.trackStock === false;
  });

  const columns = [
    {
      key: 'product',
      header: 'Product',
      render: (item: Inventory) => getProduct(item)?.name || 'Unknown',
    },
    {
      key: 'sku',
      header: 'SKU',
      render: (item: Inventory) => getProduct(item)?.sku || '-',
    },
    {
      key: 'stockQuantity',
      header: 'Stock',
      render: (item: Inventory) => (
        <span className={item.stockQuantity <= item.lowStockThreshold ? 'text-red-600 font-medium' : ''}>
          {item.stockQuantity}
        </span>
      ),
    },
    {
      key: 'lowStockThreshold',
      header: 'Min Stock',
      render: (item: Inventory) => (
        <span className="text-slate-600">
          {item.lowStockThreshold || 0}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: Inventory) => {
        if (item.stockQuantity <= 0) {
          return <Badge variant="danger">Out of Stock</Badge>;
        }
        if (item.stockQuantity <= item.lowStockThreshold) {
          return <Badge variant="warning">Low Stock</Badge>;
        }
        return <Badge variant="success">In Stock</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Inventory) => (
        <Button size="sm" variant="ghost" onClick={() => openAdjustModal(item)}>
          Adjust
        </Button>
      ),
    },
  ];

  // Columns for non-tracked products (restaurant items)
  const untrackedColumns = [
    {
      key: 'product',
      header: 'Product',
      render: (item: Inventory) => getProduct(item)?.name || 'Unknown',
    },
    {
      key: 'sku',
      header: 'SKU',
      render: (item: Inventory) => getProduct(item)?.sku || '-',
    },
    {
      key: 'status',
      header: 'Status',
      render: () => (
        <Badge variant="success">Always Available</Badge>
      ),
    },
  ];

  return (
    <Layout>
      <PageHeader
        title="Inventory"
        subtitle="Monitor and adjust stock levels"
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleCleanup} disabled={cleaning}>
              {cleaning ? '⏳ Cleaning...' : '🧹 Cleanup'}
            </Button>
            <Button variant="outline" onClick={loadInventory}>
              🔄 Refresh
            </Button>
          </div>
        }
      />
      <PageContent>
        {/* Summary Stats - Only for tracked products */}
        {trackedInventory.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-700 mb-3">📦 Stock Tracked Items</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <div className="text-sm text-slate-600">Total Items</div>
                <div className="text-2xl font-bold text-slate-900">{trackedInventory.length}</div>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <div className="text-sm text-slate-600">Out of Stock</div>
                <div className="text-2xl font-bold text-red-600">
                  {trackedInventory.filter(i => i.stockQuantity <= 0).length}
                </div>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <div className="text-sm text-slate-600">Low Stock</div>
                <div className="text-2xl font-bold text-yellow-600">
                  {trackedInventory.filter(i => i.stockQuantity > 0 && i.stockQuantity <= i.lowStockThreshold).length}
                </div>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <div className="text-sm text-slate-600">In Stock</div>
                <div className="text-2xl font-bold text-green-600">
                  {trackedInventory.filter(i => i.stockQuantity > i.lowStockThreshold).length}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-4">
          <Input
            placeholder="Search by product name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Tracked Inventory */}
        {trackedInventory.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">
              📊 Stock Tracked Products ({trackedInventory.length})
            </h3>
            <Table
              columns={columns}
              data={trackedInventory}
              keyExtractor={(item) => item._id}
              loading={loading}
              emptyMessage="No tracked inventory items found"
            />
          </div>
        )}

        {/* Untracked Inventory (Always Available) */}
        {untrackedInventory.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3">
              🍽️ Restaurant Items (Always Available) ({untrackedInventory.length})
            </h3>
            <Table
              columns={untrackedColumns}
              data={untrackedInventory}
              keyExtractor={(item) => item._id}
              loading={loading}
              emptyMessage="No untracked items found"
            />
          </div>
        )}

        {trackedInventory.length === 0 && untrackedInventory.length === 0 && !loading && (
          <div className="text-center py-12 text-slate-500">
            No inventory items found
          </div>
        )}
      </PageContent>

      <Modal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        title="Adjust Inventory"
        footer={
          <>
            <Button variant="outline" onClick={() => setAdjustModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdjust}>
              Apply Adjustment
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Product: <span className="font-medium">{getProduct(selectedItem!)?.name}</span>
          </p>
          <p className="text-sm text-slate-600">
            Current Stock: <span className="font-medium">{selectedItem?.stockQuantity || 0}</span>
          </p>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Adjustment Type
            </label>
            <select
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value as any)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="ADJUSTMENT">Manual Adjustment</option>
              <option value="PURCHASE">Purchase (Add Stock)</option>
              <option value="RETURN">Return (Remove Stock)</option>
            </select>
          </div>

          <Input
            label="Quantity Change"
            type="number"
            value={adjustmentQty}
            onChange={(e) => setAdjustmentQty(parseInt(e.target.value) || 0)}
            helperText="Use positive to add, negative to remove"
          />

          <p className="text-sm text-slate-600">
            New Stock: <span className="font-medium">
              {(selectedItem?.stockQuantity || 0) + adjustmentQty}
            </span>
          </p>
        </div>
      </Modal>
    </Layout>
  );
}
