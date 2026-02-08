import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

interface DepartmentProfile {
  depHead: string;
  deptName: string;
  headName: string;
  headEmail: string;
  secretaryName?: string;
  secretaryEmail?: string;
  updatedAt: string;
  updatedBy: string;
}

interface Department {
  depHead: string;
  deptName: string;
}

export const DepartmentProfiles = () => {
  const [profiles, setProfiles] = useState<DepartmentProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<DepartmentProfile | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    depHead: '',
    deptName: '',
    headName: '',
    headEmail: '',
    secretaryName: '',
    secretaryEmail: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profilesRes, deptsRes] = await Promise.all([
        api.get('/admin/department-profiles'),
        api.get('/auth/departments'),
      ]);
      setProfiles(profilesRes.data.profiles || []);
      setDepartments(deptsRes.data.departments || []);
    } catch (error) {
      setStatus('Failed to load department profiles.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (profile: DepartmentProfile) => {
    setEditingProfile(profile);
    setFormData({
      depHead: profile.depHead,
      deptName: profile.deptName,
      headName: profile.headName,
      headEmail: profile.headEmail,
      secretaryName: profile.secretaryName || '',
      secretaryEmail: profile.secretaryEmail || '',
    });
    setShowCreateModal(true);
  };

  const handleCreate = () => {
    setEditingProfile(null);
    setFormData({
      depHead: '',
      deptName: '',
      headName: '',
      headEmail: '',
      secretaryName: '',
      secretaryEmail: '',
    });
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    try {
      setStatus(null);
      if (editingProfile) {
        await api.put(`/admin/department-profiles/${editingProfile.depHead}`, formData);
        setStatus('Department profile updated successfully!');
      } else {
        await api.post('/admin/department-profiles', formData);
        setStatus('Department profile created successfully!');
      }
      setShowCreateModal(false);
      loadData();
      setTimeout(() => setStatus(null), 3000);
    } catch (error: any) {
      setStatus(error.response?.data?.message || 'Failed to save department profile.');
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm('Are you sure you want to delete this department profile?')) return;
    try {
      await api.delete(`/admin/department-profiles/${code}`);
      setStatus('Department profile deleted successfully!');
      loadData();
      setTimeout(() => setStatus(null), 3000);
    } catch (error: any) {
      setStatus(error.response?.data?.message || 'Failed to delete department profile.');
    }
  };

  const selectedDept = departments.find((d) => d.depHead === formData.depHead);

  if (loading) {
    return <div className="text-center py-8 text-slate-600">Loading department profiles...</div>;
  }

  return (
    <div className="space-y-6 reveal-stagger">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-800">Department Profiles</h2>
        <button
          onClick={handleCreate}
          className="btn btn-primary btn-sm"
        >
          + Add Department Profile
        </button>
      </div>

      {status && (
        <div className={`p-4 rounded-lg ${status.includes('successfully') ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
          {status}
        </div>
      )}

      <div className="p-6 rounded-lg app-panel">
        <p className="text-sm text-slate-600 mb-4">
          Manage department head and secretary information. This information will be automatically applied to all users in the department.
        </p>
        <div className="space-y-3">
          {profiles.map((profile) => (
            <div key={profile.depHead} className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-slate-800">[{profile.depHead}] {profile.deptName}</span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Department Head</p>
                      <p className="font-medium text-slate-800">{profile.headName}</p>
                      <p className="text-slate-600">{profile.headEmail}</p>
                    </div>
                    {(profile.secretaryName || profile.secretaryEmail) && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Secretary</p>
                        <p className="font-medium text-slate-800">{profile.secretaryName || 'Not set'}</p>
                        {profile.secretaryEmail && <p className="text-slate-600">{profile.secretaryEmail}</p>}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Last updated: {new Date(profile.updatedAt).toLocaleString()} by {profile.updatedBy}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(profile)}
                    className="btn btn-outline btn-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(profile.depHead)}
                    className="btn btn-danger btn-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {profiles.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">No department profiles configured yet.</p>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 text-gray-800">
              {editingProfile ? 'Edit Department Profile' : 'Create Department Profile'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                <select
                  value={formData.depHead}
                  onChange={(e) => {
                    const dept = departments.find((d) => d.depHead === e.target.value);
                    setFormData({
                      ...formData,
                      depHead: e.target.value,
                      deptName: dept?.deptName || '',
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.depHead} value={dept.depHead}>
                      {dept.depHead ? `[${dept.depHead}] ${dept.deptName}` : dept.deptName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Department Name</label>
                <input
                  type="text"
                  value={formData.deptName}
                  onChange={(e) => setFormData({ ...formData, deptName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Head Name *</label>
                  <input
                    type="text"
                    value={formData.headName}
                    onChange={(e) => setFormData({ ...formData, headName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Head Email *</label>
                  <input
                    type="email"
                    value={formData.headEmail}
                    onChange={(e) => setFormData({ ...formData, headEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Secretary Name (optional)</label>
                  <input
                    type="text"
                    value={formData.secretaryName}
                    onChange={(e) => setFormData({ ...formData, secretaryName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Secretary Email (optional)</label>
                  <input
                    type="email"
                    value={formData.secretaryEmail}
                    onChange={(e) => setFormData({ ...formData, secretaryEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingProfile(null);
                }}
                className="btn btn-outline btn-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.depHead || !formData.deptName || !formData.headName || !formData.headEmail}
                className="btn btn-primary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingProfile ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
