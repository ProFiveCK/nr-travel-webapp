import { useState, useEffect } from 'react';
import type { TravelApplication } from '../types.js';
import { api } from '../lib/api.js';
import { formatDateNauru } from '../lib/dateUtils.js';

interface Props {
    onRefresh?: () => void;
}

export const MinisterDashboard = ({ onRefresh }: Props) => {
    const [queue, setQueue] = useState<TravelApplication[]>([]);
    const [archived, setArchived] = useState<TravelApplication[]>([]);
    const [status, setStatus] = useState<string | null>(null);
    const [processing, setProcessing] = useState<string | null>(null);
    const [viewingApplication, setViewingApplication] = useState<TravelApplication | null>(null);
    const [showDecisionModal, setShowDecisionModal] = useState<{ id: string; action: string } | null>(null);
    const [note, setNote] = useState('');

    useEffect(() => {
        loadQueue();
        loadArchived();
    }, []);

    const loadQueue = async () => {
        try {
            const { data } = await api.get('/minister/queue');
            setQueue(data.queue || []);
        } catch (error) {
            console.error('Failed to load minister queue:', error);
            setStatus('Failed to load pending applications');
        }
    };

    const loadArchived = async () => {
        try {
            const { data } = await api.get('/minister/archived');
            setArchived(data.applications || []);
        } catch (error) {
            console.error('Failed to load archived applications:', error);
        }
    };

    const handleDecision = async (applicationId: string, action: string, noteText?: string) => {
        try {
            setProcessing(applicationId);
            setStatus(null);

            await api.post(`/minister/${applicationId}/decision`, {
                action,
                note: noteText || '',
            });

            const actionLabels: Record<string, string> = {
                'MINISTER_APPROVED': 'Approved',
                'MINISTER_REJECTED': 'Rejected',
            };

            setStatus(`${actionLabels[action] || action} successfully!`);
            setShowDecisionModal(null);
            setNote('');
            setViewingApplication(null);

            // Refresh the queue and archived list
            await loadQueue();
            await loadArchived();
            if (onRefresh) {
                onRefresh();
            }

            // Clear status after 3 seconds
            setTimeout(() => setStatus(null), 3000);
        } catch (error: any) {
            setStatus(error.response?.data?.message || `Failed to ${action.toLowerCase()} application`);
        } finally {
            setProcessing(null);
        }
    };

    const openDecisionModal = (id: string, action: string) => {
        setShowDecisionModal({ id, action });
        setNote('');
    };

    const submitDecision = () => {
        if (showDecisionModal) {
            handleDecision(showDecisionModal.id, showDecisionModal.action, note);
        }
    };

    const handleViewApplication = (app: TravelApplication) => {
        setViewingApplication(app);
    };

    return (
        <div className="space-y-8 reveal-stagger">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold text-slate-800">Minister Approval Queue</h2>
                    <button
                        onClick={() => { loadQueue(); loadArchived(); }}
                        className="btn btn-primary btn-sm"
                    >
                        Refresh
                    </button>
                </div>

                {status && (
                    <div className={`p-4 rounded-lg ${status.includes('Failed') || status.includes('Error') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
                        {status}
                    </div>
                )}

                <div className="rounded-lg app-panel">
                    <div className="p-6">
                        <p className="text-sm text-slate-600 mb-4">
                            {queue.length} application{queue.length !== 1 ? 's' : ''} pending your approval
                        </p>

                        {queue.length === 0 ? (
                            <p className="text-slate-500 text-center py-8">No applications pending minister approval</p>
                        ) : (
                            <div className="space-y-4">
                                {queue.map((app) => (
                                    <div key={app.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="font-mono text-sm font-semibold text-orange-600">
                                                        {app.applicationNumber || app.id.slice(0, 8)}
                                                    </span>
                                                    <span className={`px-2 py-1 text-xs rounded-full ${app.status === 'PENDING_MINISTER_APPROVAL'
                                                        ? 'bg-orange-100 text-orange-800'
                                                        : 'bg-blue-100 text-blue-800'
                                                        }`}>
                                                        {app.status === 'PENDING_MINISTER_APPROVAL' ? 'Pending Approval' : 'Referred'}
                                                    </span>
                                                </div>
                                                <h3 className="font-semibold text-slate-900 mb-2">{app.eventTitle}</h3>
                                                <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                                                    <div>
                                                        <span className="font-medium">Applicant:</span> {app.requesterFirstName} {app.requesterLastName}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">Department:</span> {app.department}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">Travel Dates:</span> {formatDateNauru(app.startDate)} - {formatDateNauru(app.endDate)}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">Total Cost:</span> ${app.totalGonCost.toLocaleString()}
                                                    </div>
                                                </div>

                                                {/* Show reviewer recommendation if available */}
                                                {app.approvalLog && app.approvalLog.length > 0 && (
                                                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                                        <p className="text-xs font-semibold text-blue-900 mb-1">Reviewer Recommendation:</p>
                                                        {app.approvalLog
                                                            .filter(log => log.action === 'REFERRED_TO_MINISTER' || log.action === 'APPROVED')
                                                            .slice(-1)
                                                            .map((log, idx) => (
                                                                <div key={idx} className="text-sm text-blue-800">
                                                                    <p><strong>{log.actorName}</strong> recommended approval</p>
                                                                    {log.note && <p className="mt-1 italic">"{log.note}"</p>}
                                                                </div>
                                                            ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={() => handleViewApplication(app)}
                                                    className="btn btn-outline btn-sm"
                                                >
                                                    View Details
                                                </button>
                                                <button
                                                    onClick={() => openDecisionModal(app.id, 'MINISTER_APPROVED')}
                                                    disabled={processing === app.id}
                                                    className="btn btn-primary btn-sm disabled:opacity-50"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => openDecisionModal(app.id, 'MINISTER_REJECTED')}
                                                    disabled={processing === app.id}
                                                    className="btn btn-danger btn-sm disabled:opacity-50"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Archived / Past Decisions Section */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-800">Past Decisions (Archive)</h2>
                <div className="rounded-lg app-panel overflow-hidden">
                    {archived.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            No past decisions found.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3">App #</th>
                                        <th className="px-4 py-3">Date Decided</th>
                                        <th className="px-4 py-3">Applicant</th>
                                        <th className="px-4 py-3">Event</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {archived.map((app) => (
                                        <tr key={app.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 font-mono text-slate-600">
                                                {app.applicationNumber || app.id.slice(0, 8)}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {app.decidedAt ? formatDateNauru(app.decidedAt) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-slate-900">
                                                {app.requesterFirstName} {app.requesterLastName}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 truncate max-w-xs">
                                                {app.eventTitle}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 text-xs rounded-full ${app.status === 'ARCHIVED' ? 'bg-green-100 text-green-800' :
                                                    app.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                        'bg-slate-100 text-slate-800'
                                                    }`}>
                                                    {app.status === 'ARCHIVED' ? 'Approved' : app.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => handleViewApplication(app)}
                                                    className="btn btn-link text-sm"
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* View Application Modal */}
            {viewingApplication && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-white rounded-2xl p-6 shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-800">Application Details</h3>
                            <button
                                onClick={() => setViewingApplication(null)}
                                className="btn btn-link text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4 text-sm">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="font-semibold text-slate-700">Application Number:</span>
                                    <p className="text-slate-900">{viewingApplication.applicationNumber}</p>
                                </div>
                                <div>
                                    <span className="font-semibold text-slate-700">Status:</span>
                                    <p className="text-slate-900">{viewingApplication.status}</p>
                                </div>
                                <div>
                                    <span className="font-semibold text-slate-700">Event Title:</span>
                                    <p className="text-slate-900">{viewingApplication.eventTitle}</p>
                                </div>
                                <div>
                                    <span className="font-semibold text-slate-700">Department:</span>
                                    <p className="text-slate-900">{viewingApplication.department}</p>
                                </div>
                                <div>
                                    <span className="font-semibold text-slate-700">Applicant:</span>
                                    <p className="text-slate-900">{viewingApplication.requesterFirstName} {viewingApplication.requesterLastName}</p>
                                </div>
                                <div>
                                    <span className="font-semibold text-slate-700">Total GoN Cost:</span>
                                    <p className="text-slate-900 font-bold">${viewingApplication.totalGonCost.toLocaleString()}</p>
                                </div>
                            </div>

                            <div>
                                <span className="font-semibold text-slate-700">Reason for Participation:</span>
                                <p className="text-slate-900">{viewingApplication.reasonForParticipation}</p>
                            </div>

                            {/* Approval History */}
                            {viewingApplication.approvalLog && viewingApplication.approvalLog.length > 0 && (
                                <div className="mt-6 border-t pt-4">
                                    <h4 className="font-semibold text-slate-800 mb-3">Approval History:</h4>
                                    <div className="space-y-2">
                                        {viewingApplication.approvalLog.map((log, idx) => (
                                            <div key={idx} className="p-3 bg-slate-50 rounded border-l-4 border-orange-500">
                                                <p className="font-medium text-slate-900">{log.action}</p>
                                                <p className="text-xs text-slate-600">by {log.actorName} on {formatDateNauru(log.timestamp)}</p>
                                                {log.note && <p className="mt-1 text-sm italic text-slate-700">"{log.note}"</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
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

            {/* Decision Modal */}
            {showDecisionModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 shadow-xl max-w-md w-full">
                        <h3 className="text-lg font-bold mb-2 text-gray-800">
                            {showDecisionModal.action === 'MINISTER_APPROVED' ? 'Approve Application' : 'Reject Application'}
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            {showDecisionModal.action === 'MINISTER_APPROVED'
                                ? 'Please provide any notes or comments (optional):'
                                : 'Please provide a reason for rejection:'}
                        </p>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={
                                showDecisionModal.action === 'MINISTER_APPROVED'
                                    ? 'Comments...'
                                    : 'Reason for rejection...'
                            }
                            className="w-full border rounded-md px-3 py-2 mb-4 h-24 resize-none"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setShowDecisionModal(null);
                                    setNote('');
                                }}
                                className="btn btn-outline btn-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitDecision}
                                className={`btn btn-sm text-white ${showDecisionModal.action === 'MINISTER_APPROVED'
                                    ? 'btn-primary'
                                    : 'btn-danger'
                                    }`}
                            >
                                Confirm {showDecisionModal.action === 'MINISTER_APPROVED' ? 'Approval' : 'Rejection'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
