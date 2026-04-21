import { useEffect, useMemo, useState } from 'react';
import { Layout, PageHeader, PageContent, Button, Input, Table, Pagination, Badge, Modal } from '../components';
import { productsApi, categoriesApi, unitsApi, discountsApi } from '../api';
import type { Product, Category, ProductFormData, Unit, Discount } from '../types';
import toast from 'react-hot-toast';
import { formatMoney } from '../money';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Unit creation modal
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitSymbol, setNewUnitSymbol] = useState('');

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    sku: '',
    barcode: '',
    category: '',
    discount: '',
    price: 0,
    cost: 0,
    taxRate: 0,
    trackStock: false,
    lowStockThreshold: 5,
    preparationTime: undefined,
    unit: '',
  });

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await productsApi.getAll({ page, limit: 10, search });
      setProducts(res.products || []);
      setTotalPages(res.pagination?.pages || 1);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await categoriesApi.getAll();

      // If backend defaults to active-only when `isActive` isn't provided,
      // fetch inactive categories explicitly and merge.
      const flatten = (arr: Category[]): Category[] => {
        const out: Category[] = [];
        const walk = (list: Category[]) => {
          for (const c of list || []) {
            out.push(c);
            if (Array.isArray(c.children) && c.children.length) walk(c.children);
          }
        };
        if (Array.isArray(arr)) walk(arr);
        return out;
      };

      const hasInactive = flatten(cats || []).some((c) => c.isActive === false);
      if (hasInactive) {
        setCategories(cats || []);
        return;
      }

      const [activeCats, inactiveCats] = await Promise.all([
        categoriesApi.getAll({ isActive: true }).catch(() => []),
        categoriesApi.getAll({ isActive: false }).catch(() => []),
      ]);

      const mergeCategoryTrees = (a: Category[], b: Category[]): Category[] => {
        const byId = new Map<string, Category>();
        const order: string[] = [];

        const mergeOne = (existing: Category, incoming: Category): Category => {
          const merged: Category = { ...existing, ...incoming };
          const existingChildren = Array.isArray(existing.children) ? existing.children : [];
          const incomingChildren = Array.isArray(incoming.children) ? incoming.children : [];
          const mergedChildren = mergeCategoryTrees(existingChildren, incomingChildren);
          if (mergedChildren.length) merged.children = mergedChildren;
          else delete (merged as any).children;
          return merged;
        };

        const upsert = (cat: Category) => {
          const current = byId.get(cat._id);
          if (!current) {
            byId.set(cat._id, { ...cat });
            order.push(cat._id);
          } else {
            byId.set(cat._id, mergeOne(current, cat));
          }
        };

        (a || []).forEach(upsert);
        (b || []).forEach(upsert);

        return order.map((id) => byId.get(id)!).filter(Boolean);
      };

      setCategories(mergeCategoryTrees(activeCats || [], inactiveCats || []));
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories([]);
    }
  };

  const flatCategories = useMemo(() => {
    const out: Category[] = [];
    const walk = (arr: Category[]) => {
      for (const c of arr || []) {
        out.push(c);
        if (Array.isArray(c.children) && c.children.length) walk(c.children);
      }
    };
    if (Array.isArray(categories)) walk(categories);
    return out;
  }, [categories]);

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    flatCategories.forEach((c) => map.set(c._id, c));
    return map;
  }, [flatCategories]);

  const loadUnits = async () => {
    try {
      const unitsData = await unitsApi.getAll();
      const unitsArray = Array.isArray(unitsData) ? unitsData : unitsData?.units || [];
      setUnits(Array.isArray(unitsArray) ? unitsArray : []);
    } catch (error) {
      console.error('Failed to load units:', error);
      setUnits([]);
    }
  };

  const loadDiscounts = async () => {
    try {
      const data = await discountsApi.getAll();
      setDiscounts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load discounts:', error);
      setDiscounts([]);
    }
  };

  const handleCreateUnit = async () => {
    if (!newUnitName.trim()) {
      toast.error('Please enter unit name');
      return;
    }
    try {
      await unitsApi.create({ 
        name: newUnitName, 
        shortCode: newUnitName.substring(0, 3).toUpperCase(),
        type: 'WEIGHT' as const
      });
      toast.success('Unit created successfully!');
      setShowUnitModal(false);
      setNewUnitName('');
      setNewUnitSymbol('');
      loadUnits();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create unit');
    }
  };

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadUnits();
    loadDiscounts();
  }, [page, search]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '', 
      sku: '', 
      barcode: '', 
      category: '', 
      discount: '',
      price: 0, 
      cost: 0, 
      taxRate: 0,
      trackStock: false,
      lowStockThreshold: 5,
      preparationTime: undefined,
      unit: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    const discountId = !product.discount
      ? ''
      : typeof product.discount === 'string'
        ? product.discount
        : product.discount?._id || '';
    setFormData({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || '',
      category: typeof product.category === 'string' ? product.category : product.category._id,
      discount: discountId,
      price: product.price,
      cost: product.cost,
      taxRate: product.taxRate || 0,
      trackStock: product.trackStock || false,
      lowStockThreshold: product.lowStockThreshold || 5,
      preparationTime: product.preparationTime,
      unit: typeof product.unit === 'string' ? product.unit : product.unit?._id || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name || !formData.name.trim()) {
      toast.error('Please enter a product name');
      return;
    }
    if (!formData.sku || !formData.sku.trim()) {
      toast.error('Please enter a SKU');
      return;
    }
    if (!formData.category) {
      toast.error('Please select a category');
      return;
    }
    if (formData.price === undefined || formData.price < 0) {
      toast.error('Please enter a valid price');
      return;
    }
    if (formData.cost === undefined || formData.cost < 0) {
      toast.error('Please enter a valid cost');
      return;
    }

    try {
      setSaving(true);
      const payload: ProductFormData = {
        ...formData,
        discount: formData.discount ? formData.discount : undefined,
      };
      if (editingProduct) {
        await productsApi.update(editingProduct._id, payload);
        toast.success('✅ Product updated successfully');
      } else {
        await productsApi.create(payload);
        toast.success('✅ Product created successfully');
      }
      setModalOpen(false);
      loadProducts();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await productsApi.delete(id);
      toast.success('🗑️ Product deleted successfully');
      loadProducts();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete product');
    }
  };

  const handleToggleAvailability = async (product: Product) => {
    try {
      await productsApi.toggleAvailability(product._id, !product.isAvailable);
      toast.success(`${product.isAvailable ? '🔴' : '🟢'} Product availability updated`);
      loadProducts();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update availability');
    }
  };

  const flattenCategories = (cats: Category[], prefix = ''): { value: string; label: string }[] => {
    if (!Array.isArray(cats)) return [];
    let result: { value: string; label: string }[] = [];
    for (const cat of cats) {
      const isActive = cat.isActive !== false;
      const childPrefix = isActive ? prefix + '  ' : prefix;

      if (isActive) {
        result.push({ value: cat._id, label: prefix + cat.name });
      }

      if (cat.children?.length) {
        result = result.concat(flattenCategories(cat.children, childPrefix));
      }
    }
    return result;
  };

  const discountLabel = (d: Discount) => {
    const v = d.discountType === 'FLAT' ? formatMoney(d.value) : `${d.value}%`;
    return `${d.name} (${v})${d.isActive ? '' : ' [Inactive]'}`;
  };

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'sku', header: 'SKU' },
    {
      key: 'category',
      header: 'Category',
      render: (item: Product) => {
        const cat = typeof item.category === 'object' ? item.category : categoryById.get(item.category);
        if (!cat) return '-';
        return (
          <div className="flex items-center gap-2">
            <span>{cat.name}</span>
            {cat.isActive === false && <Badge variant="default">Inactive</Badge>}
          </div>
        );
      },
    },
    {
      key: 'price',
      header: 'Price',
      render: (item: Product) => formatMoney(item.price),
    },
    {
      key: 'discount',
      header: 'Discount',
      render: (item: Product) => {
        const d = item.discount && typeof item.discount === 'object' ? item.discount : null;
        if (!d) return <span className="text-slate-400">—</span>;
        const value = d.discountType === 'FLAT' ? formatMoney(d.value) : `${d.value}%`;
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-900">{d.name}</span>
            <Badge variant={d.discountType === 'FLAT' ? 'info' : 'warning'}>{value}</Badge>
            {!d.isActive && <Badge variant="default">Inactive</Badge>}
          </div>
        );
      },
    },
    {
      key: 'taxRate',
      header: 'Tax',
      render: (item: Product) => `${item.taxRate || 0}%`,
    },
    {
      key: 'trackStock',
      header: 'Stock Tracking',
      render: (item: Product) => (
        <Badge variant={item.trackStock ? 'success' : 'default'}>
          {item.trackStock ? 'Enabled' : 'Disabled'}
        </Badge>
      ),
    },
    {
      key: 'isAvailable',
      header: 'Available',
      render: (item: Product) => (
        <button
          onClick={() => handleToggleAvailability(item)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition ${
            item.isAvailable !== false
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-red-100 text-red-700 hover:bg-red-200'
          }`}
        >
          {item.isAvailable !== false ? '✓ In Stock' : '✗ Out of Stock'}
        </button>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (item: Product) => (
        <Badge variant={item.isActive ? 'success' : 'default'}>
          {item.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Product) => (
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
        title="Products"
        subtitle="Manage your product catalog"
        actions={
          <Button onClick={openCreateModal}>+ Add Product</Button>
        }
      />
      <PageContent>
        <div className="mb-4">
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>

        <Table
          columns={columns}
          data={products}
          keyExtractor={(item) => item._id}
          loading={loading}
          emptyMessage="No products found"
        />
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </PageContent>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add Product'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editingProduct ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="SKU"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Barcode"
              value={formData.barcode || ''}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              placeholder="Optional"
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select Category</option>
                {flattenCategories(categories).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Discount (Optional)
            </label>
            <select
              value={formData.discount || ''}
              onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">No Discount</option>
              {discounts.map((d) => (
                <option key={d._id} value={d._id}>
                  {discountLabel(d)}
                </option>
              ))}
            </select>
          </div>
          
          {/* Unit Selection with Create Option */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Unit of Measurement
            </label>
            <div className="flex gap-2">
              <select
                value={formData.unit || ''}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select Unit (Optional)</option>
                {units.map((unit) => (
                  <option key={unit._id} value={unit._id}>
                    {unit.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowUnitModal(true)}
              >
                + New
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Price"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              required
            />
            <Input
              label="Cost"
              type="number"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
              required
            />
            <Input
              label="Tax Rate (%)"
              type="number"
              value={formData.taxRate}
              onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="grid grid-cols-3 gap-4 items-end">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="trackStock"
                checked={formData.trackStock || false}
                onChange={(e) => setFormData({ ...formData, trackStock: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300"
              />
              <label htmlFor="trackStock" className="text-sm font-medium text-slate-700">
                Track Stock
              </label>
            </div>
            <Input
              label="Low Stock Threshold"
              type="number"
              value={formData.lowStockThreshold || 5}
              onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value) || 5 })}
              disabled={!formData.trackStock}
            />
            <Input
              label="Prep Time (min)"
              type="number"
              value={formData.preparationTime || ''}
              onChange={(e) => setFormData({ ...formData, preparationTime: parseInt(e.target.value) || undefined })}
              placeholder="Optional"
            />
          </div>
        </div>
      </Modal>

      {/* Create Unit Modal */}
      <Modal
        isOpen={showUnitModal}
        onClose={() => setShowUnitModal(false)}
        title="Create New Unit"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowUnitModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUnit}>
              Create Unit
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Unit Name"
            value={newUnitName}
            onChange={(e) => setNewUnitName(e.target.value)}
            placeholder="e.g., Kilogram, Piece, Liter"
            required
          />
          <Input
            label="Symbol"
            value={newUnitSymbol}
            onChange={(e) => setNewUnitSymbol(e.target.value)}
            placeholder="e.g., kg, pcs, L"
          />
        </div>
      </Modal>
    </Layout>
  );
}
