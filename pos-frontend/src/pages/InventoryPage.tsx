import { useEffect, useState } from 'react';
import { Layout, PageHeader, PageContent, Table, Badge, Button, Input, Modal, PageLoader } from '../components';
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

  const loadInventory = async () => {
    try {
      setLoading(true);
      const data = await inventoryApi.getAll();
      // Filter out null items and items with null product
      const validData = (data || []).filter(item => item != null && item.product != null);
      setInventory(validData);
    } catch (error) {
      console.error('Failed to load inventory:', error);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const openAdjustModal = (item: Inventory) => {
    setSelectedItem(item);
    setAdjustmentQty(0);
    setAdjustmentType('ADJUSTMENT');
    setAdjustModalOpen(true);
  };

  const handleAdjust = async () => {
    if (!selectedItem || adjustmentQty === 0) return;
    const productId = typeof selectedItem.product === 'object' 
      ? selectedItem.product._id 
      : selectedItem.product;
    
    try {
      await inventoryApi.adjust({
        productId,
        quantityChange: adjustmentQty,
        type: adjustmentType,
      });
      setAdjustModalOpen(false);
      loadInventory();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to adjust inventory');
    }
  };

  const getProduct = (item: Inventory | null): Product | null => {
    if (!item) return null;
    return (item.product && typeof item.product === 'object') ? item.product : null;
  };

  const filteredInventory = inventory.filter((item) => {
    const product = getProduct(item);
    if (!search) return true;
    return product?.name.toLowerCase().includes(search.toLowerCase()) ||
           product?.sku.toLowerCase().includes(search.toLowerCase());
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

  return (
    <Layout>
      <PageHeader
        title="Inventory"
        subtitle="Monitor and adjust stock levels"
        actions={
          <Button variant="outline" onClick={loadInventory}>
            Refresh
          </Button>
        }
      />
      <PageContent>
        <div className="mb-4">
          <Input
            placeholder="Search by product name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>

        <Table
          columns={columns}
          data={filteredInventory}
          keyExtractor={(item) => item._id}
          loading={loading}
          emptyMessage="No inventory items found"
        />
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
