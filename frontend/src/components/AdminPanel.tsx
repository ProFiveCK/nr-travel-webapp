import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { formatDateNauru } from '../lib/dateUtils.js';
import { SettingsManagement } from './SettingsManagement.js';
import { DepartmentsList } from './DepartmentsList.js';
import { MinistersManagement } from './MinistersManagement.js';

interface SignupRequest {
  id: string;
  email: string;
  department: string;
  status: string;
}

export const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'departments' | 'ministers' | 'settings' | 'applications'>('users');
  const [archivedApplications, setArchivedApplications] = useState<any[]>([]);
  const [users, setUsers] = useState<
    {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      department: string;
      roles: string[];
      departmentHeadName?: string;
      departmentHeadEmail?: string;
      departmentHeadCode?: string;
      departmentSecretary?: string;
      departmentSecretaryEmail?: string;
      mustChangePassword?: boolean;
    }[]
  >([]);
  const [archivedUsers, setArchivedUsers] = useState<
    {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      department: string;
      roles: string[];
      archivedAt?: string;
      archivedBy?: string;
    }[]
  >([]);
  const [requests, setRequests] = useState<SignupRequest[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [editUserModal, setEditUserModal] = useState<{
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
  } | null>(null);
  const [editUserData, setEditUserData] = useState({
    firstName: '',
    lastName: '',
    roles: [] as string[],
    resetPassword: false,
    newPassword: '',
    forceChangeOnLogin: false,
  });
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    department: '',
    departmentHeadCode: '',
    roles: [] as string[],
  });
  const [departments, setDepartments] = useState<{ depHead: string; deptName: string }[]>([]);
  const [viewingApplication, setViewingApplication] = useState<any | null>(null);
  const [attachments, setAttachments] = useState<Array<{ id: string; fileName: string; downloadUrl: string; size: number }>>([]);

  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [loadingApplication, setLoadingApplication] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: userData } = await api.get('/admin/users');
        setUsers(userData.users);
        const { data: requestData } = await api.get('/admin/signup-requests');
        setRequests(requestData.requests);
        const { data: deptsData } = await api.get('/auth/departments');
        setDepartments(deptsData.departments || []);
        // Load archived users when user management tab is active
        const { data: archivedData } = await api.get('/admin/users/archived');
        setArchivedUsers(archivedData.users);
        // Load archived applications
        const { data: appsData } = await api.get('/applications/archive/all');
        setArchivedApplications(appsData.applications || []);
      } catch (error) {
        setStatus('Unable to load admin data (requires admin auth).');
      }
    };
    load();
  }, []);

  const loadArchivedUsers = async () => {
    try {
      const { data } = await api.get('/admin/users/archived');
      setArchivedUsers(data.users);
    } catch (error) {
      setStatus('Unable to load archived users.');
    }
  };

  const approveRequest = async (id: string) => {
    try {
      // Don't send tempPassword - this preserves the user's registration password
      await api.post(`/admin/signup-requests/${id}/approve`, {});
      setRequests((prev) => prev.filter((r) => r.id !== id));
      const { data: userData } = await api.get('/admin/users');
      setUsers(userData.users);
      setStatus('User approved successfully. They can log in with their registration password.');
      setTimeout(() => setStatus(null), 3000);
    } catch {
      setStatus('Failed to approve request.');
    }
  };

  const rejectRequest = (id: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  const openEditModal = (user: typeof users[0]) => {
    setEditUserModal({
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
    });
    setEditUserData({
      firstName: user.firstName,
      lastName: user.lastName,
      roles: [...user.roles],
      resetPassword: false,
      newPassword: '',
      forceChangeOnLogin: false,
    });
  };

  const saveUserEdit = async () => {
    if (!editUserModal) return;
    try {
      setStatus(null);
      const updatePayload: any = {
        firstName: editUserData.firstName,
        lastName: editUserData.lastName,
        roles: editUserData.roles,
      };

      if (editUserData.resetPassword) {
        updatePayload.resetPassword = true;
        if (editUserData.newPassword) {
          updatePayload.newPassword = editUserData.newPassword;
        }
        updatePayload.forceChangeOnLogin = editUserData.forceChangeOnLogin;
      }

      const { data } = await api.put(`/admin/users/${editUserModal.userId}`, updatePayload);

      setStatus(
        data.tempPassword
          ? `User updated! Password reset to: ${data.tempPassword} (user must change on log in: ${editUserData.forceChangeOnLogin ? 'Yes' : 'No'})`
          : 'User updated successfully!'
      );

      setEditUserModal(null);
      setEditUserData({
        firstName: '',
        lastName: '',
        roles: [],
        resetPassword: false,
        newPassword: '',
        forceChangeOnLogin: false,
      });

      const { data: userData } = await api.get('/admin/users');
      setUsers(userData.users);
      setTimeout(() => setStatus(null), 3000);
    } catch (error: any) {
      setStatus(error.response?.data?.message || 'Failed to update user.');
    }
  };

  const deleteUser = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE user ${email}? This action cannot be undone!`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setStatus('User deleted permanently!');
      const { data: userData } = await api.get('/admin/users');
      setUsers(userData.users);
      loadArchivedUsers();
      setTimeout(() => setStatus(null), 3000);
    } catch (error: any) {
      setStatus(error.response?.data?.message || 'Failed to delete user.');
    }
  };

  const loadAttachments = async (applicationId: string) => {
    setLoadingAttachments(true);
    try {
      const { data } = await api.get(`/applications/${applicationId}/attachments`);
      setAttachments(data.attachments || []);
    } catch (error) {
      console.error('Failed to load attachments:', error);
      setAttachments([]);
    } finally {
      setLoadingAttachments(false);
    }
  };

  const handleViewApplication = async (app: any) => {
    setViewingApplication(app); // Show immediately with list data
    setLoadingApplication(true);
    try {
      // Fetch full details to ensure we have everything (including travellers, expenses, etc.)
      const { data } = await api.get(`/applications/${app.id}`);
      if (data.application) {
        setViewingApplication(data.application);
      }
      await loadAttachments(app.id);
    } catch (error) {
      console.error('Failed to load application details:', error);
      setStatus('Failed to load full application details. Showing summary only.');
    } finally {
      setLoadingApplication(false);
    }
  };

  const handleDeleteApplication = async (id: string, appNumber: string) => {
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE application ${appNumber}? This action cannot be undone!`)) return;
    try {
      await api.delete(`/admin/applications/${id}`);
      setStatus(`Application ${appNumber} deleted permanently!`);
      // Reload archived applications
      const { data: appsData } = await api.get('/applications/archive/all');
      setArchivedApplications(appsData.applications || []);
      setTimeout(() => setStatus(null), 3000);
    } catch (error: any) {
      setStatus(error.response?.data?.message || 'Failed to delete application.');
    }
  };

  const disableUser = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to disable and archive user ${email}?`)) return;
    try {
      await api.post(`/admin/users/${id}/disable`);
      setStatus('User disabled and archived successfully!');
      const { data: userData } = await api.get('/admin/users');
      setUsers(userData.users);
      loadArchivedUsers();
      setTimeout(() => setStatus(null), 3000);
    } catch (error: any) {
      setStatus(error.response?.data?.message || 'Failed to disable user.');
    }
  };

  const restoreUser = async (id: string) => {
    try {
      await api.post(`/admin/users/${id}/restore`);
      setStatus('User restored successfully!');
      loadArchivedUsers();
      const { data: userData } = await api.get('/admin/users');
      setUsers(userData.users);
      setTimeout(() => setStatus(null), 3000);
    } catch (error: any) {
      setStatus(error.response?.data?.message || 'Failed to restore user.');
    }
  };

  const createUser = async () => {
    try {
      setStatus(null);
      if (!newUserData.email || !newUserData.firstName || !newUserData.password) {
        setStatus('Email, first name, and password are required.');
        return;
      }
      if (newUserData.password.length < 8) {
        setStatus('Password must be at least 8 characters.');
        return;
      }
      if (newUserData.roles.length === 0) {
        setStatus('At least one role must be selected.');
        return;
      }

      // Create signup request first, then approve it
      const dept = departments.find((d) => d.depHead === newUserData.departmentHeadCode);
      await api.post('/auth/register', {
        email: newUserData.email,
        password: newUserData.password,
        fullName: `${newUserData.firstName} ${newUserData.lastName}`,
        departmentHead: newUserData.departmentHeadCode,
        department: dept?.deptName || '',
      });

      // Find the signup request and approve it
      const { data: requestsData } = await api.get('/admin/signup-requests');
      const request = requestsData.requests.find((r: SignupRequest) => r.email === newUserData.email.toLowerCase());
      if (request) {
        await api.post(`/admin/signup-requests/${request.id}/approve`, {
          tempPassword: newUserData.password,
        });

        // Assign roles
        const { data: userData } = await api.get('/admin/users');
        const newUser = userData.users.find((u: any) => u.email === newUserData.email.toLowerCase());
        if (newUser) {
          for (const role of newUserData.roles) {
            await api.post(`/admin/users/${newUser.id}/role`, { role });
          }
        }
      }

      setStatus('User created successfully!');
      setShowCreateUserModal(false);
      setNewUserData({
        email: '',
        firstName: '',
        lastName: '',
        password: '',
        department: '',
        departmentHeadCode: '',
        roles: [],
      });
      const { data: updatedUserData } = await api.get('/admin/users');
      setUsers(updatedUserData.users);
      setTimeout(() => setStatus(null), 3000);
    } catch (error: any) {
      setStatus(error.response?.data?.message || 'Failed to create user.');
    }
  };

  const toggleRole = (role: string) => {
    setNewUserData((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
  };


  return (
    <div className="space-y-6 reveal-stagger">
      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-4">
          <button
            onClick={() => setActiveTab('ministers')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'ministers'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-800'
              }`}
          >
            Ministers
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'users'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-800'
              }`}
          >
            User Management
          </button>
          <button
            onClick={() => setActiveTab('departments')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'departments'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-800'
              }`}
          >
            Departments
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'settings'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-800'
              }`}
          >
            System Settings
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'applications'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-800'
              }`}
          >
            Archived Applications
          </button>
        </nav>
      </div>

      {activeTab === 'users' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-800">User Management</h2>
              <p className="text-sm text-slate-600 mt-1">
                {users.length} active user{users.length !== 1 ? 's' : ''} • {archivedUsers.length} archived
              </p>
            </div>
          <button
            onClick={() => setShowCreateUserModal(true)}
            className="btn btn-primary btn-sm"
          >
            + Create New User
          </button>
        </div>
          <section className="p-6 rounded-lg app-panel">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Pending Signup Requests</h3>
            <div className="space-y-3">
              {requests.map((request) => (
                <div key={request.id} className="flex items-center justify-between border border-slate-100 rounded-lg px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-800">{request.email}</p>
                    <p className="text-sm text-slate-500">{request.department}</p>
                  </div>
                  <div className="space-x-2">
                    <button className="btn btn-primary btn-sm" onClick={() => approveRequest(request.id)}>
                      Approve
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => rejectRequest(request.id)}>
                      Reject
                    </button>
                  </div>
                </div>
              ))}
              {requests.length === 0 && <p className="text-sm text-slate-500">No pending requests.</p>}
            </div>
          </section>
          <section className="p-6 rounded-lg app-panel">
            <h3 className="text-lg font-semibold text-slate-800">Users &amp; Roles</h3>
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between border border-slate-100 rounded-lg px-4 py-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-slate-800">
                        {user.firstName} {user.lastName}
                      </p>
                      <span className="text-xs text-slate-500">({user.email})</span>
                    </div>
                    <p className="text-xs text-slate-600 mb-1">
                      <span className="font-medium">Department:</span> {user.department || 'Not set'}
                      {user.departmentHeadCode && (
                        <span className="ml-2 text-slate-500">[Code: {user.departmentHeadCode}]</span>
                      )}
                    </p>
                    {(user.departmentHeadName || user.departmentHeadEmail) && (
                      <p className="text-xs text-slate-500">
                        <span className="font-medium">Dept. Head:</span> {user.departmentHeadName || 'Not set'}
                        {user.departmentHeadEmail && <span className="ml-1">({user.departmentHeadEmail})</span>}
                      </p>
                    )}
                    {(user.departmentSecretary || user.departmentSecretaryEmail) && (
                      <p className="text-xs text-slate-500">
                        <span className="font-medium">Secretary:</span> {user.departmentSecretary || 'Not set'}
                        {user.departmentSecretaryEmail && <span className="ml-1">({user.departmentSecretaryEmail})</span>}
                      </p>
                    )}
                    {!user.departmentHeadName && !user.departmentHeadEmail && !user.departmentSecretary && !user.departmentSecretaryEmail && (
                      <p className="text-xs text-slate-400 italic">
                        Department head and secretary information not yet configured
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {user.mustChangePassword && (
                      <span className="px-2 py-1 text-xs rounded bg-orange-100 text-orange-800" title="User must change password on next log in">
                        Must Change Password
                      </span>
                    )}
                    <button
                      onClick={() => openEditModal(user)}
                      className="btn btn-outline btn-sm"
                      title="Edit User"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => disableUser(user.id, user.email)}
                      className="btn btn-secondary btn-sm"
                      title="Disable User"
                    >
                      Disable
                    </button>
                    <button
                      onClick={() => deleteUser(user.id, user.email)}
                      className="btn btn-danger btn-sm"
                      title="Delete User Permanently"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {users.length === 0 && <p className="text-sm text-slate-500">No users loaded. Ensure admin auth.</p>}
              {status && <p className="text-sm text-rose-600">{status}</p>}
            </div>
          </section>
          <section className="p-6 rounded-lg app-panel">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Archived Users</h3>
            <p className="text-sm text-slate-600 mb-4">
              Users who have been disabled. They can be restored if needed.
            </p>
            <div className="space-y-3">
              {archivedUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between border border-slate-100 rounded-lg px-4 py-3 bg-slate-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-slate-800">
                        {user.firstName} {user.lastName}
                      </p>
                      <span className="text-xs text-slate-500">({user.email})</span>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800">ARCHIVED</span>
                    </div>
                    <p className="text-xs text-slate-600 mb-1">
                      <span className="font-medium">Department:</span> {user.department || 'Not set'}
                    </p>
                    {user.archivedAt && (
                      <p className="text-xs text-slate-400">
                        Archived on {new Date(user.archivedAt).toLocaleString()}
                        {user.archivedBy && ` by ${user.archivedBy}`}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => restoreUser(user.id)}
                    className="btn btn-primary btn-sm"
                    title="Restore User"
                  >
                    Restore
                  </button>
                </div>
              ))}
              {archivedUsers.length === 0 && <p className="text-sm text-slate-500">No archived users.</p>}
            </div>
          </section>
        </>
      )}

      {activeTab === 'departments' && <DepartmentsList />}
      {activeTab === 'ministers' && <MinistersManagement />}
      {activeTab === 'settings' && <SettingsManagement />}

      {activeTab === 'applications' && (
        <div className="p-6 rounded-lg app-panel">
          <h2 className="text-2xl font-semibold text-slate-800 mb-4">Archived Applications</h2>
          <p className="text-sm text-slate-600 mb-4">View and manage all archived (approved) applications</p>

          {archivedApplications.length === 0 ? (
            <p className="text-sm text-slate-500">No archived applications.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left">Application #</th>
                    <th className="px-4 py-3 text-left">Event</th>
                    <th className="px-4 py-3 text-left">Department</th>
                    <th className="px-4 py-3 text-left">Applicant</th>
                    <th className="px-4 py-3 text-right">Total Cost</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Approved Date</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {archivedApplications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-blue-600">
                        {app.applicationNumber || app.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3">{app.eventTitle}</td>
                      <td className="px-4 py-3">{app.department}</td>
                      <td className="px-4 py-3">
                        {app.requesterFirstName} {app.requesterLastName}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ${app.totalGonCost.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                          {app.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {app.decidedAt ? new Date(app.decidedAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewApplication(app)}
                            className="btn btn-outline btn-sm"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDeleteApplication(app.id, app.applicationNumber || app.id.slice(0, 8))}
                            className="btn btn-soft-danger btn-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit User Modal */}
      {editUserModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 text-gray-800">Edit User</h3>
            <p className="text-sm text-gray-600 mb-4">
              Editing: <strong>{editUserModal.email}</strong>
            </p>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={editUserData.firstName}
                    onChange={(e) => setEditUserData({ ...editUserData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editUserData.lastName}
                    onChange={(e) => setEditUserData({ ...editUserData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Roles *</label>
                <div className="flex gap-4">
                  {['USER', 'REVIEWER', 'MINISTER', 'ADMIN'].map((role) => (
                    <label key={role} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={editUserData.roles.includes(role)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditUserData({
                              ...editUserData,
                              roles: [...editUserData.roles, role],
                            });
                          } else {
                            setEditUserData({
                              ...editUserData,
                              roles: editUserData.roles.filter((r) => r !== role),
                            });
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-700">{role}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1">Select at least one role</p>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <label className="flex items-center space-x-2 mb-4">
                  <input
                    type="checkbox"
                    checked={editUserData.resetPassword}
                    onChange={(e) => setEditUserData({ ...editUserData, resetPassword: e.target.checked, newPassword: '', forceChangeOnLogin: false })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Reset Password</span>
                </label>

                {editUserData.resetPassword && (
                  <div className="ml-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        New Password (leave blank for auto-generated)
                      </label>
                      <input
                        type="password"
                        value={editUserData.newPassword}
                        onChange={(e) => setEditUserData({ ...editUserData, newPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Leave blank for: Welcome123!"
                      />
                      <p className="text-xs text-slate-500 mt-1">If left blank, password will be: Welcome123!</p>
                    </div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={editUserData.forceChangeOnLogin}
                        onChange={(e) => setEditUserData({ ...editUserData, forceChangeOnLogin: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-700">Force password change on next log in</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setEditUserModal(null);
                  setEditUserData({
                    firstName: '',
                    lastName: '',
                    roles: [],
                    resetPassword: false,
                    newPassword: '',
                    forceChangeOnLogin: false,
                  });
                }}
                className="btn btn-outline btn-sm"
              >
                Cancel
              </button>
              <button
                onClick={saveUserEdit}
                disabled={!editUserData.firstName || editUserData.roles.length === 0}
                className="btn btn-primary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden mx-auto">
            <h3 className="text-lg font-bold mb-4 text-gray-800">Create New User</h3>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                  <input
                    type="password"
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    minLength={8}
                  />
                  <p className="text-xs text-slate-500 mt-1">Minimum 8 characters</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={newUserData.firstName}
                    onChange={(e) => setNewUserData({ ...newUserData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={newUserData.lastName}
                    onChange={(e) => setNewUserData({ ...newUserData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Department *</label>
                <select
                  value={newUserData.departmentHeadCode}
                  onChange={(e) => {
                    const dept = departments.find((d) => d.depHead === e.target.value);
                    setNewUserData({
                      ...newUserData,
                      departmentHeadCode: e.target.value,
                      department: dept?.deptName || '',
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
                <label className="block text-sm font-medium text-slate-700 mb-2">Roles *</label>
                <div className="flex gap-4">
                  {['USER', 'REVIEWER', 'MINISTER', 'ADMIN'].map((role) => (
                    <label key={role} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newUserData.roles.includes(role)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewUserData({
                              ...newUserData,
                              roles: [...newUserData.roles, role],
                            });
                          } else {
                            setNewUserData({
                              ...newUserData,
                              roles: newUserData.roles.filter((r) => r !== role),
                            });
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-700">{role}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1">Select at least one role</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCreateUserModal(false);
                  setNewUserData({
                    email: '',
                    firstName: '',
                    lastName: '',
                    department: '',
                    departmentHeadCode: '',
                    roles: [],
                    password: '',
                  });
                }}
                className="btn btn-outline btn-sm w-full sm:w-auto flex-shrink-0"
              >
                Cancel
              </button>
              <button
                onClick={createUser}
                disabled={!newUserData.email || !newUserData.firstName || !newUserData.password || newUserData.roles.length === 0 || !newUserData.departmentHeadCode}
                className="btn btn-primary btn-sm w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                Create User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Application Modal */}
      {viewingApplication && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Application Details</h3>
                <p className="text-sm font-mono text-blue-600 mt-1">
                  Application #: {viewingApplication.applicationNumber || viewingApplication.id.slice(0, 8)}
                  {loadingApplication && <span className="ml-2 text-slate-400">(Updating details...)</span>}
                </p>
              </div>
              <button
                onClick={() => setViewingApplication(null)}
                className="btn btn-link text-sm"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Applicant Information */}
              <section className="border-b border-slate-200 pb-4">
                <h4 className="text-lg font-semibold text-slate-900 mb-3">Applicant Information</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-slate-700">Name:</span> {viewingApplication.requesterFirstName} {viewingApplication.requesterLastName}
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Email:</span> {viewingApplication.requesterEmail}
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Phone:</span> {viewingApplication.phoneNumber || 'Not provided'}
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Minister Email:</span> {viewingApplication.ministerEmail || 'Not provided'}
                  </div>
                </div>
              </section>

              {/* Identification of Spending Unit */}
              <section className="border-b border-slate-200 pb-4">
                <h4 className="text-lg font-semibold text-slate-900 mb-3">Identification of Spending Unit</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-slate-700">Department:</span> {viewingApplication.department}
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Division:</span> {viewingApplication.division || 'Not provided'}
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Head of Department:</span> {viewingApplication.headOfDepartment}
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">HOD Email:</span> {viewingApplication.hodEmail}
                  </div>
                </div>
              </section>

              {/* Event Details */}
              <section className="border-b border-slate-200 pb-4">
                <h4 className="text-lg font-semibold text-slate-900 mb-3">Event Details</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-slate-700">Event Title:</span> {viewingApplication.eventTitle}
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Reason for Participation:</span> {viewingApplication.reasonForParticipation}
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Start Date:</span> {formatDateNauru(viewingApplication.startDate)}
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">End Date:</span> {formatDateNauru(viewingApplication.endDate)}
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Duration:</span> {viewingApplication.durationDays} day{viewingApplication.durationDays !== 1 ? 's' : ''}
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Number of Travellers:</span> {viewingApplication.numberOfTravellers}
                  </div>
                </div>
              </section>

              {/* Travellers */}
              {viewingApplication.travellers && viewingApplication.travellers.length > 0 && (
                <section className="border-b border-slate-200 pb-4">
                  <h4 className="text-lg font-semibold text-slate-900 mb-3">Travellers</h4>
                  <div className="space-y-2">
                    {viewingApplication.travellers.map((traveller: any, idx: number) => (
                      <div key={idx} className="bg-slate-50 p-3 rounded text-sm">
                        <span className="font-medium text-slate-700">Name:</span> {traveller.name} | <span className="font-medium text-slate-700">Role:</span> {traveller.role}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Expenses */}
              {viewingApplication.expenses && viewingApplication.expenses.length > 0 && (
                <section className="border-b border-slate-200 pb-4">
                  <h4 className="text-lg font-semibold text-slate-900 mb-3">Expense Details</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border border-slate-200">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="p-2 text-left border">Expense Type</th>
                          <th className="p-2 text-left border">Details</th>
                          <th className="p-2 text-left border">Cost/Person</th>
                          <th className="p-2 text-left border">Persons/Days</th>
                          <th className="p-2 text-left border">Total Cost</th>
                          <th className="p-2 text-left border">Donor Funding</th>
                          <th className="p-2 text-left border">GoN Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingApplication.expenses.map((expense: any, idx: number) => (
                          <tr key={idx}>
                            <td className="p-2 border">{expense.expenseType}</td>
                            <td className="p-2 border">{expense.details}</td>
                            <td className="p-2 border">${expense.costPerPerson.toLocaleString()}</td>
                            <td className="p-2 border">{expense.personsOrDays}</td>
                            <td className="p-2 border">${expense.totalCost.toLocaleString()}</td>
                            <td className="p-2 border">{expense.donorFunding || 'No'}</td>
                            <td className="p-2 border">${expense.gonCost.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50">
                        <tr>
                          <td colSpan={6} className="p-2 border font-semibold text-right">Total GoN Cost:</td>
                          <td className="p-2 border font-semibold">${viewingApplication.totalGonCost.toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </section>
              )}

              {/* Attachments */}
              <section>
                <h4 className="text-lg font-semibold text-slate-900 mb-3">Attachments</h4>
                {loadingAttachments ? (
                  <p className="text-sm text-slate-500">Loading attachments...</p>
                ) : attachments.length > 0 ? (
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className="bg-slate-50 p-3 rounded text-sm flex items-center justify-between border border-slate-200">
                        <div className="flex-1">
                          <span className="font-medium">{attachment.fileName}</span>
                          {attachment.size && (
                            <span className="text-xs text-slate-500 ml-2">
                              ({(attachment.size / 1024).toFixed(1)} KB)
                            </span>
                          )}
                        </div>
                        <a
                          href={attachment.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium px-3 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                ) : viewingApplication.attachmentsProvided && viewingApplication.attachmentsProvided.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-600 mb-2">Expected attachments:</p>
                    {viewingApplication.attachmentsProvided.map((attachment: string, idx: number) => (
                      <div key={idx} className="bg-slate-50 p-3 rounded text-sm border border-slate-200">
                        <span>{attachment}</span>
                        <span className="text-xs text-slate-500 ml-2">(Not uploaded yet)</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No attachments provided</p>
                )}
              </section>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="btn btn-primary btn-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print / Export PDF
              </button>
              <button
                onClick={() => setViewingApplication(null)}
                className="btn btn-outline btn-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
