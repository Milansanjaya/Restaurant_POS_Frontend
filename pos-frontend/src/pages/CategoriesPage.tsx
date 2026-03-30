import { useEffect, useState } from 'react';
import { Layout, PageHeader, PageContent, Button, Input, Modal, Card, PageLoader } from '../components';
import { categoriesApi } from '../api';
import type { Category, CategoryFormData } from '../types';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    parentId: '',
    icon: '',
    displayOrder: 0,
  });

  const loadCategories = async () => {
    try {
      setLoading(true);
      const cats = await categoriesApi.getAll();
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openCreateModal = (parentId?: string) => {
    setEditingCategory(null);
    setFormData({ name: '', description: '', parentId: parentId || '', icon: '', displayOrder: 0 });
    setModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      parentId: category.parentId || '',
      icon: category.icon || '',
      displayOrder: category.displayOrder,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const data = { ...formData };
      if (!data.parentId) delete data.parentId;
      
      if (editingCategory) {
        await categoriesApi.update(editingCategory._id, data);
      } else {
        await categoriesApi.create(data);
      }
      setModalOpen(false);
      loadCategories();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await categoriesApi.delete(id);
      loadCategories();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to delete category');
    }
  };

  const flattenForSelect = (cats: Category[], prefix = '', excludeId?: string): { value: string; label: string }[] => {
    let result: { value: string; label: string }[] = [];
    for (const cat of cats) {
      if (cat._id !== excludeId) {
        result.push({ value: cat._id, label: prefix + cat.name });
        if (cat.children?.length) {
          result = result.concat(flattenForSelect(cat.children, prefix + '── ', excludeId));
        }
      }
    }
    return result;
  };

  const renderCategoryTree = (cats: Category[], level = 0) => {
    return cats.map((cat) => (
      <div key={cat._id} style={{ marginLeft: level * 24 }}>
        <div className="mb-2 flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-3">
            {cat.icon && <span className="text-xl">{cat.icon}</span>}
            <div>
              <p className="font-medium text-slate-900">{cat.name}</p>
              {cat.description && (
                <p className="text-sm text-slate-500">{cat.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => openCreateModal(cat._id)}>
              + Sub
            </Button>
            <Button size="sm" variant="ghost" onClick={() => openEditModal(cat)}>
              Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleDelete(cat._id)}>
              Delete
            </Button>
          </div>
        </div>
        {cat.children?.length ? renderCategoryTree(cat.children, level + 1) : null}
      </div>
    ));
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
        title="Categories"
        subtitle="Organize your products into categories"
        actions={
          <Button onClick={() => openCreateModal()}>+ Add Category</Button>
        }
      />
      <PageContent>
        {categories.length === 0 ? (
          <Card>
            <div className="py-8 text-center text-slate-500">
              No categories yet. Create your first category!
            </div>
          </Card>
        ) : (
          <div className="space-y-2">{renderCategoryTree(categories)}</div>
        )}
      </PageContent>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <Input
            label="Icon (emoji)"
            value={formData.icon}
            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
            placeholder="🍔"
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Parent Category
            </label>
            <select
              value={formData.parentId}
              onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">None (Top Level)</option>
              {flattenForSelect(categories, '', editingCategory?._id).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Display Order"
            type="number"
            value={formData.displayOrder}
            onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
          />
        </div>
      </Modal>
    </Layout>
  );
}
