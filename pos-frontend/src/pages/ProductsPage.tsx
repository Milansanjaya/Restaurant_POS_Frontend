import { useEffect, useState } from 'react';
import { Layout, PageHeader, PageContent, Button, Input, Table, Pagination, Badge, getStatusBadgeVariant, Modal, Card, PageLoader } from '../components';
import { productsApi, categoriesApi } from '../api';
import type { Product, Category, ProductFormData } from '../types';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    sku: '',
    barcode: '',
    category: '',
    price: 0,
    cost: 0,
    taxRate: 0,
    trackStock: false,
    lowStockThreshold: 5,
    preparationTime: undefined,
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
      setCategories(cats || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories([]);
    }
  };

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [page, search]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({ 
      name: '', 
      sku: '', 
      barcode: '', 
      category: '', 
      price: 0, 
      cost: 0, 
      taxRate: 0,
      trackStock: false,
      lowStockThreshold: 5,
      preparationTime: undefined,
    });
    setModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || '',
      category: typeof product.category === 'string' ? product.category : product.category._id,
      price: product.price,
      cost: product.cost,
      taxRate: product.taxRate || 0,
      trackStock: product.trackStock || false,
      lowStockThreshold: product.lowStockThreshold || 5,
      preparationTime: product.preparationTime,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (editingProduct) {
        await productsApi.update(editingProduct._id, formData);
      } else {
        await productsApi.create(formData);
      }
      setModalOpen(false);
      loadProducts();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await productsApi.delete(id);
      loadProducts();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to delete product');
    }
  };

  const flattenCategories = (cats: Category[], prefix = ''): { value: string; label: string }[] => {
    if (!Array.isArray(cats)) return [];
    let result: { value: string; label: string }[] = [];
    for (const cat of cats) {
      result.push({ value: cat._id, label: prefix + cat.name });
      if (cat.children?.length) {
        result = result.concat(flattenCategories(cat.children, prefix + '  '));
      }
    }
    return result;
  };

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'sku', header: 'SKU' },
    {
      key: 'category',
      header: 'Category',
      render: (item: Product) =>
        typeof item.category === 'object' ? item.category.name : '-',
    },
    {
      key: 'price',
      header: 'Price',
      render: (item: Product) => `Rs. ${item.price.toLocaleString()}`,
    },
    {
      key: 'taxRate',
      header: 'Tax',
      render: (item: Product) => `${item.taxRate || 0}%`,
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
    </Layout>
  );
}
