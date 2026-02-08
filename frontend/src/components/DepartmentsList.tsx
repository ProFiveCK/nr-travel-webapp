import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

interface Department {
  depHead: string;
  deptName: string;
}

interface DepartmentProfile {
  depHead: string;
  deptName: string;
  headName: string;
  headEmail: string;
  secretaryName?: string;
  secretaryEmail?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const DepartmentsList = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [profiles, setProfiles] = useState<DepartmentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<DepartmentProfile | null>(null);
  const [formData, setFormData] = useState({
    depHead: '',
    deptName: '',
  });
  const [editFormData, setEditFormData] = useState({
    depHead: '',
    deptName: '',
    secretaryName: '',
    secretaryEmail: '',
  });

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      setStatus(null);
      const [deptsRes, profilesRes] = await Promise.all([
        api.get('/admin/departments'),
        api.get('/admin/department-profiles'),
      ]);
      setDepartments(deptsRes.data.departments || []);
      setProfiles(profilesRes.data.profiles || []);
    } catch (error: any) {
      console.error('Failed to load departments:', error);
      if (error.response?.status === 401) {
        setStatus('Authentication failed. Please ensure you are logged in as an admin and refresh the page.');
      } else if (error.response?.status === 403) {
        setStatus('Access denied. You need admin privileges to view departments.');
      } else {
        setStatus(error.response?.data?.message || 'Failed to load departments. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (dept: Department) => {
    setEditingDept(dept);
    const profile = profiles.find((p) => p.depHead === dept.depHead);
    if (profile) {
      setEditingProfile(profile);
      // Since Head and Secretary are the same, use secretary fields for both
      setEditFormData({
        depHead: dept.depHead,
        deptName: dept.deptName,
        secretaryName: profile.secretaryName || profile.headName || '',
        secretaryEmail: profile.secretaryEmail || profile.headEmail || '',
      });
    } else {
      setEditingProfile(null);
      setEditFormData({
        depHead: dept.depHead,
        deptName: dept.deptName,
        secretaryName: '',
        secretaryEmail: '',
      });
    }
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      setStatus(null);
      // Update department name if changed
      if (editingDept && editFormData.deptName !== editingDept.deptName) {
        await api.put(`/admin/departments/${editingDept.depHead}`, {
          depHead: editFormData.depHead,
          deptName: editFormData.deptName,
        });
      }
      
      // Update or create profile (Head and Secretary are the same person)
      const profilePayload = {
        depHead: editFormData.depHead,
        deptName: editFormData.deptName,
        headName: editFormData.secretaryName,
        headEmail: editFormData.secretaryEmail,
        secretaryName: editFormData.secretaryName,
        secretaryEmail: editFormData.secretaryEmail,
      };
      
      if (editingProfile) {
        await api.put(`/admin/department-profiles/${editingProfile.depHead}`, profilePayload);
        setStatus('Department profile updated successfully!');
      } else {
        await api.post('/admin/department-profiles', profilePayload);
        setStatus('Department profile created successfully!');
      }
      setShowEditModal(false);
      loadDepartments();
      setTimeout(() => setStatus(null), 3000);
    } catch (error: any) {
      setStatus(error.response?.data?.message || 'Failed to save department profile.');
    }
  };

  const handleCreate = () => {
    setEditingDept(null);
    setFormData({
      depHead: '',
      deptName: '',
    });
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    try {
      setStatus(null);
      if (editingDept) {
        await api.put(`/admin/departments/${editingDept.depHead}`, formData);
        setStatus('Department updated successfully!');
      } else {
        await api.post('/admin/departments', formData);
        setStatus('Department added successfully!');
      }
      setShowCreateModal(false);
      loadDepartments();
      setTimeout(() => setStatus(null), 3000);
    } catch (error: any) {
      setStatus(error.response?.data?.message || 'Failed to save department.');
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm(`Are you sure you want to delete department [${code}]? This will remove it from the signup dropdown.`)) return;
    try {
      await api.delete(`/admin/departments/${code}`);
      setStatus('Department deleted successfully!');
      loadDepartments();
      setTimeout(() => setStatus(null), 3000);
    } catch (error: any) {
      setStatus(error.response?.data?.message || 'Failed to delete department.');
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-600">Loading departments...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Departments Master List</h2>
          <p className="text-sm text-slate-600 mt-1">
            Manage the master list of departments available for user registration.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Add Department
        </button>
      </div>

      {status && (
        <div className={`p-4 rounded-lg ${status.includes('successfully') ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
          <div className="flex items-center justify-between">
            <span>{status}</span>
            {!status.includes('successfully') && (
              <button
                onClick={loadDepartments}
                className="ml-4 px-3 py-1 text-sm rounded bg-rose-600 text-white hover:bg-rose-700"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Department Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Head/Secretary</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {departments.map((dept) => {
                const profile = profiles.find((p) => p.depHead === dept.depHead);
                return (
                  <tr key={dept.depHead} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono font-semibold text-slate-800">{dept.depHead || '(No code)'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-800">{dept.deptName}</span>
                    </td>
                    <td className="px-4 py-3">
                      {profile ? (
                        <div className="text-sm">
                          <p className="font-medium text-slate-800">{profile.secretaryName || profile.headName || 'Not set'}</p>
                          <p className="text-slate-600">{profile.secretaryEmail || profile.headEmail || 'Not set'}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Not configured</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(dept)}
                          className="px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 text-xs"
                          title="Edit Department and Profile"
                        >
                          Edit Profile
                        </button>
                        <button
                          onClick={() => handleDelete(dept.depHead)}
                          className="px-3 py-1 rounded bg-rose-500 text-white hover:bg-rose-600 text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {departments.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-8">No departments found.</p>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full">
            <h3 className="text-lg font-bold mb-4 text-gray-800">
              {editingDept ? 'Edit Department' : 'Add Department'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Department Code *
                </label>
                <input
                  type="text"
                  value={formData.depHead}
                  onChange={(e) => setFormData({ ...formData, depHead: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 11, 21, 51"
                  required
                  disabled={!!editingDept}
                />
                {editingDept && (
                  <p className="text-xs text-slate-500 mt-1">Department code cannot be changed</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Department Name *
                </label>
                <input
                  type="text"
                  value={formData.deptName}
                  onChange={(e) => setFormData({ ...formData, deptName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Finance Secretariat"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingDept(null);
                }}
                className="px-4 py-2 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.depHead || !formData.deptName}
                className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingDept ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal - Consolidated */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 text-gray-800">
              Edit Department Profile
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Manage department information and Head/Secretary details for <strong>[{editFormData.depHead}]</strong>
            </p>
            <div className="space-y-6">
              {/* Department Information */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2">Department Information</h4>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Department Code
                  </label>
                  <input
                    type="text"
                    value={editFormData.depHead}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50"
                    disabled
                  />
                  <p className="text-xs text-slate-500 mt-1">Department code cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Department Name *
                  </label>
                  <input
                    type="text"
                    value={editFormData.deptName}
                    onChange={(e) => setEditFormData({ ...editFormData, deptName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Finance Secretariat"
                    required
                  />
                </div>
              </div>

              {/* Head/Secretary Information */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2">Head/Secretary Information</h4>
                <p className="text-xs text-slate-500 italic">Note: Head and Secretary are the same person</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                    <input
                      type="text"
                      value={editFormData.secretaryName}
                      onChange={(e) => setEditFormData({ ...editFormData, secretaryName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Head/Secretary name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={editFormData.secretaryEmail}
                      onChange={(e) => setEditFormData({ ...editFormData, secretaryEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="head.secretary@example.com"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingProfile(null);
                  setEditingDept(null);
                }}
                className="px-4 py-2 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editFormData.deptName || !editFormData.secretaryName || !editFormData.secretaryEmail}
                className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

