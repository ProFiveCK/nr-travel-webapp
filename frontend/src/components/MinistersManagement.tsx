import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Minister {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
}

export const MinistersManagement = () => {
    const [ministers, setMinisters] = useState<Minister[]>([]);
    const [status, setStatus] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newMinisterData, setNewMinisterData] = useState({
        email: '',
        firstName: '',
        lastName: '',
        password: '',
    });

    const loadMinisters = async () => {
        try {
            const { data } = await api.get('/admin/users');
            const allUsers: Minister[] = data.users;
            const ministerUsers = allUsers.filter(u => u.roles.includes('MINISTER'));
            setMinisters(ministerUsers);
        } catch (error) {
            setStatus('Unable to load ministers.');
        }
    };

    useEffect(() => {
        loadMinisters();
    }, []);

    const createMinister = async () => {
        try {
            setStatus(null);
            if (!newMinisterData.email || !newMinisterData.firstName || !newMinisterData.password) {
                setStatus('Email, first name, and password are required.');
                return;
            }
            if (newMinisterData.password.length < 8) {
                setStatus('Password must be at least 8 characters.');
                return;
            }

            // Create signup request first
            await api.post('/auth/register', {
                email: newMinisterData.email,
                password: newMinisterData.password,
                fullName: `${newMinisterData.firstName} ${newMinisterData.lastName}`,
                departmentHead: '02', // Ministerial department code
                department: 'Ministerial',
            });

            // Find the signup request and approve it
            const { data: requestsData } = await api.get('/admin/signup-requests');
            const request = requestsData.requests.find((r: any) => r.email === newMinisterData.email.toLowerCase());

            if (request) {
                await api.post(`/admin/signup-requests/${request.id}/approve`, {
                    tempPassword: newMinisterData.password,
                });

                // Assign MINISTER role
                const { data: userData } = await api.get('/admin/users');
                const newUser = userData.users.find((u: any) => u.email === newMinisterData.email.toLowerCase());

                if (newUser) {
                    // Set roles to ONLY 'MINISTER' (removing default 'USER' role)
                    await api.put(`/admin/users/${newUser.id}`, { roles: ['MINISTER'] });
                }
            }

            setStatus('Minister created successfully!');
            setShowCreateModal(false);
            setNewMinisterData({
                email: '',
                firstName: '',
                lastName: '',
                password: '',
            });
            loadMinisters();
            setTimeout(() => setStatus(null), 3000);
        } catch (error: any) {
            setStatus(error.response?.data?.message || 'Failed to create minister.');
        }
    };

    const removeMinisterRole = async (id: string) => {
        if (!confirm('Are you sure you want to remove the Minister role from this user?')) return;
        try {
            // We can't easily remove a role via the current API if it only supports adding?
            // Let's check the API. The userService has removeRole, but is there an endpoint?
            // The AdminPanel uses `api.post('/admin/users/${id}/role', { role })` which likely toggles or adds.
            // Let's assume for now we can just edit the user in the main User Management tab if needed, 
            // or we might need to implement a remove role endpoint if it doesn't exist.
            // Actually, looking at AdminPanel.tsx, it seems to use `api.put` to update roles.

            const minister = ministers.find(m => m.id === id);
            if (!minister) return;

            const newRoles = minister.roles.filter(r => r !== 'MINISTER');
            await api.put(`/admin/users/${id}`, {
                roles: newRoles
            });

            setStatus('Minister role removed.');
            loadMinisters();
            setTimeout(() => setStatus(null), 3000);
        } catch (error: any) {
            setStatus(error.response?.data?.message || 'Failed to remove minister role.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-2xl font-semibold text-slate-800">Ministers Management</h2>
                    <p className="text-sm text-slate-600 mt-1">
                        Manage users with the Minister role. These users will appear in the application form for selection.
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    + Add Minister
                </button>
            </div>

            <div className="bg-white p-6 rounded-lg border border-slate-200">
                <div className="space-y-3">
                    {ministers.map((minister) => (
                        <div key={minister.id} className="flex items-center justify-between border border-slate-100 rounded-lg px-4 py-3">
                            <div>
                                <p className="font-medium text-slate-800">
                                    {minister.firstName} {minister.lastName}
                                </p>
                                <p className="text-sm text-slate-500">{minister.email}</p>
                            </div>
                            <button
                                onClick={() => removeMinisterRole(minister.id)}
                                className="px-3 py-1 text-xs font-medium rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                            >
                                Remove Role
                            </button>
                        </div>
                    ))}
                    {ministers.length === 0 && <p className="text-sm text-slate-500">No ministers found.</p>}
                </div>
                {status && <p className="mt-4 text-sm text-rose-600">{status}</p>}
            </div>

            {/* Create Minister Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full">
                        <h3 className="text-lg font-bold mb-4 text-gray-800">Add New Minister</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                                <input
                                    type="email"
                                    value={newMinisterData.email}
                                    onChange={(e) => setNewMinisterData({ ...newMinisterData, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
                                <input
                                    type="text"
                                    value={newMinisterData.firstName}
                                    onChange={(e) => setNewMinisterData({ ...newMinisterData, firstName: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                                <input
                                    type="text"
                                    value={newMinisterData.lastName}
                                    onChange={(e) => setNewMinisterData({ ...newMinisterData, lastName: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                                <input
                                    type="password"
                                    value={newMinisterData.password}
                                    onChange={(e) => setNewMinisterData({ ...newMinisterData, password: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                    required
                                    minLength={8}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createMinister}
                                className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                            >
                                Create Minister
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
