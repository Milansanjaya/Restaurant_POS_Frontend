import React, { useState, useEffect } from 'react';
import { Layout, PageHeader, PageContent, Button, Badge } from '../components';
import Table from '../components/Table';
import Modal from '../components/Modal';
import { usersApi, rolesApi } from '../api';
import { useAuthStore } from '../store/auth.store';
import type { User, Role } from '../types';

const UsersPage: React.FC = () => {
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    branch_id: '',
    isActive: true,
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await usersApi.getAll();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const data = await rolesApi.getAll();
      setRoles(data);
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  };

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        role: typeof user.role === 'string' ? user.role : user.role._id,
        branch_id: user.branch_id,
        isActive: user.isActive ?? true,
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: '',
        branch_id: currentUser?.branch_id || 'BRANCH001', // Use current user's branch
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: '',
      branch_id: currentUser?.branch_id || '',
      isActive: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = editingUser 
        ? formData.password 
          ? formData 
          : { ...formData, password: undefined }
        : formData;

      if (editingUser) {
        await usersApi.update(editingUser._id, submitData);
      } else {
        await usersApi.create(submitData);
      }
      await loadUsers();
      handleCloseModal();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save user');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await usersApi.delete(id);
      await loadUsers();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await usersApi.toggleStatus(id);
      await loadUsers();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to toggle user status');
    }
  };

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { 
      key: 'role', 
      header: 'Role',
      render: (user: User) => {
        const role = user.role;
        return typeof role === 'string' ? role : role?.name || 'N/A';
      }
    },
    { key: 'branch_id', header: 'Branch' },
    { 
      key: 'isActive', 
      header: 'Status',
      render: (user: User) => (
        <Badge variant={user.isActive ? 'success' : 'default'}>
          {user.isActive ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (user: User) => (
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => handleToggleStatus(user._id)}
          >
            {user.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleOpenModal(user)}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleDelete(user._id)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <PageHeader
        title="User Management"
        subtitle="Manage users and assign roles"
        actions={
          <Button onClick={() => handleOpenModal()}>
            Create User
          </Button>
        }
      />
      
      <PageContent>
        <Table
          columns={columns}
          data={users}
          keyExtractor={(user) => user._id}
          loading={loading}
          emptyMessage="No users found"
        />

        <Modal
          isOpen={showModal}
          onClose={handleCloseModal}
          title={editingUser ? 'Edit User' : 'Create User'}
        >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Password {editingUser && '(leave blank to keep unchanged)'}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required={!editingUser}
              placeholder={editingUser ? 'Leave blank to keep current password' : ''}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="">Select a role</option>
              {roles.map(role => (
                <option key={role._id} value={role._id}>
                  {role.name} {role.description && `- ${role.description}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Branch ID</label>
            <input
              type="text"
              value={formData.branch_id}
              onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="isActive" className="text-sm font-medium">
              Active
            </label>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {editingUser ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </PageContent>
  </Layout>
);
};

export default UsersPage;
