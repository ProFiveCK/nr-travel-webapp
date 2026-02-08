import { useState } from 'react';
import { api } from '../lib/api.js';
import { formatDateNauru } from '../lib/dateUtils.js';
import type { TravelApplication } from '../types.js';

interface Props {
  queue: TravelApplication[];
  archived?: TravelApplication[];
  onRefresh?: () => void;
}

export const ReviewerDashboard = ({ queue, archived = [], onRefresh }: Props) => {
  const [processing, setProcessing] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [showNoteModal, setShowNoteModal] = useState<{ id: string; action: string } | null>(null);
  const [note, setNote] = useState('');
  const [viewingApplication, setViewingApplication] = useState<TravelApplication | null>(null);
  const [attachments, setAttachments] = useState<Array<{ id: string; fileName: string; downloadUrl: string; size: number }>>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  const activeQueue = queue.filter((item) => item.status !== 'ARCHIVED');

  const handleDecision = async (applicationId: string, action: string, noteText?: string) => {
    try {
      setProcessing(applicationId);
      setStatus(null);

      // For REFERRED_TO_MINISTER and APPROVED (direct approve), note is required
      if (action === 'REFERRED_TO_MINISTER' && !noteText) {
        setStatus('Minister email is required');
        return;
      }

      if (action === 'APPROVED' && !noteText) {
        setStatus('Documentation of offline minister approval is required');
        return;
      }

      await api.post(`/reviewer/${applicationId}/decision`, {
        action,
        note: noteText || '',
      });

      const actionLabels: Record<string, string> = {
        'APPROVED': 'Directly approved',
        'REJECTED': 'Rejected',
        'REQUEST_INFO': 'Info requested',
        'REFERRED_TO_MINISTER': 'Sent to Minister',
      };

      setStatus(`${actionLabels[action] || action} successfully!`);
      setShowNoteModal(null);
      setNote('');

      // Refresh the queue
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

  const openNoteModal = (id: string, action: string) => {
    setShowNoteModal({ id, action });

    // Auto-fill minister email if referring to minister
    if (action === 'REFERRED_TO_MINISTER') {
      const application = queue.find(app => app.id === id);
      setNote(application?.ministerEmail || '');
    } else {
      setNote('');
    }
  };

  const submitWithNote = () => {
    if (showNoteModal) {
      handleDecision(showNoteModal.id, showNoteModal.action, note);
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

  const handleViewApplication = (app: TravelApplication) => {
    setViewingApplication(app);
    loadAttachments(app.id);
  };

  return (
    <div className="space-y-4">
      {status && (
        <div className={`p-4 rounded-lg ${status.includes('successfully') ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
          {status}
        </div>
      )}

      {activeQueue.map((item) => (
        <div key={item.id} className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
          <div className="flex flex-col lg:flex-row lg:items-start gap-4">
            <div className="flex-1 space-y-2 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  {item.applicationNumber || item.id.slice(0, 8)}
                </p>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {item.department} · {item.numberOfTravellers} traveller{item.numberOfTravellers === 1 ? '' : 's'}
                </p>
              </div>
              <button
                onClick={() => handleViewApplication(item)}
                className="text-left w-full group"
              >
                <p className="text-xl font-semibold text-blue-600 group-hover:text-blue-800 group-hover:underline transition-colors cursor-pointer">
                  {item.eventTitle}
                </p>
              </button>
              <p className="text-sm text-slate-600">
                {formatDateNauru(item.startDate)} → {formatDateNauru(item.endDate)}
              </p>
              <p className="text-sm text-slate-600 line-clamp-2">{item.reasonForParticipation}</p>
              <p className="text-xs text-slate-500">
                Attachments: {item.attachmentsProvided.length ? item.attachmentsProvided.join(', ') : 'Pending'}
              </p>
              <div className="mt-2 text-sm text-slate-600 flex flex-wrap gap-4">
                <span className="font-medium">Total GoN Cost: ${item.totalGonCost.toLocaleString()}</span>
                <span>Contact: {item.requesterFirstName} {item.requesterLastName}</span>
                <span>HOD: {item.hodEmail}</span>
              </div>
            </div>
            <div className="flex flex-shrink-0 gap-2 flex-wrap lg:flex-nowrap">
              <button
                onClick={() => openNoteModal(item.id, 'REFERRED_TO_MINISTER')}
                disabled={processing === item.id}
                className="px-3 py-1.5 rounded-md bg-purple-500 text-white text-sm hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                Send to Minister
              </button>
              <button
                onClick={() => openNoteModal(item.id, 'APPROVED')}
                disabled={processing === item.id}
                className="px-3 py-1.5 rounded-md bg-amber-500 text-white text-sm hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                Direct Approve
              </button>
              <button
                onClick={() => openNoteModal(item.id, 'REJECTED')}
                disabled={processing === item.id}
                className="px-3 py-1.5 rounded-md bg-rose-500 text-white text-sm hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                Reject
              </button>
              <button
                onClick={() => openNoteModal(item.id, 'REQUEST_INFO')}
                disabled={processing === item.id}
                className="px-3 py-1.5 rounded-md border border-slate-300 text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                Request Info
              </button>
            </div>
          </div>
        </div>
      ))}
      {activeQueue.length === 0 && queue.length === 0 && <p className="text-sm text-slate-500">No applications pending review.</p>}

      {archived.length > 0 && (
        <div className="mt-8 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-slate-700">Approved Applications (Archived)</h4>
            <span className="text-sm text-slate-500">{archived.length} application{archived.length === 1 ? '' : 's'}</span>
          </div>
          {archived.map((item) => (
            <div key={item.id} className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">APPROVED</span>
                    {item.archivedAt && (
                      <span className="text-xs text-slate-500">
                        Approved on {new Date(item.archivedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {item.department} · {item.numberOfTravellers} traveller{item.numberOfTravellers === 1 ? '' : 's'}
                  </p>
                  <p className="text-xl font-semibold text-slate-800">{item.eventTitle}</p>
                  <p className="text-sm text-slate-600">{formatDateNauru(item.startDate)} → {formatDateNauru(item.endDate)} ({item.durationDays} days)</p>
                  <p className="text-sm text-slate-600">{item.reasonForParticipation}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-800">${item.totalGonCost.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Total GoN Cost</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-sm text-slate-600 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-4">
                  <span>Applicant: {item.requesterFirstName} {item.requesterLastName}</span>
                  <span>Email: {item.requesterEmail}</span>
                  {item.hodEmail && <span>HOD: {item.hodEmail}</span>}
                </div>
                <button
                  onClick={() => handleViewApplication(item)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  View & Print
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Application View Modal */}
      {viewingApplication && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Application Details</h3>
                <p className="text-sm font-mono text-blue-600 mt-1">
                  Application #: {viewingApplication.applicationNumber || viewingApplication.id.slice(0, 8)}
                </p>
              </div>
              <button
                onClick={() => setViewingApplication(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
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
                    {viewingApplication.travellers.map((traveller, idx) => (
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
                        {viewingApplication.expenses.map((expense, idx) => (
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
                    {viewingApplication.attachmentsProvided.map((attachment, idx) => (
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
                className="px-4 py-2 text-sm rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print / Export PDF
              </button>
              <button
                onClick={() => setViewingApplication(null)}
                className="px-4 py-2 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full">
            <h3 className="text-lg font-bold mb-2 text-gray-800">
              {showNoteModal.action === 'REJECTED' ? 'Reject Application' :
                showNoteModal.action === 'APPROVED' ? 'Direct Approve Application' :
                  showNoteModal.action === 'REFERRED_TO_MINISTER' ? 'Send to Minister' :
                    'Request Information'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {showNoteModal.action === 'REJECTED'
                ? 'Please provide a reason for rejection (optional but recommended):'
                : showNoteModal.action === 'APPROVED'
                  ? 'Please document the offline minister approval. This is required to approve the application directly without sending to the minister queue.'
                  : showNoteModal.action === 'REFERRED_TO_MINISTER'
                    ? 'The Minister\'s email has been pre-filled from the application. An email notification will be sent to them for review.'
                    : 'Please specify what information is needed:'}
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                showNoteModal.action === 'REJECTED' ? 'Reason for rejection...' :
                  showNoteModal.action === 'APPROVED' ? 'Document offline minister approval (required)...' :
                    showNoteModal.action === 'REFERRED_TO_MINISTER' ? 'Minister email address...' :
                      'Information needed...'
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
              rows={4}
              required={showNoteModal.action === 'REFERRED_TO_MINISTER' || showNoteModal.action === 'APPROVED'}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowNoteModal(null);
                  setNote('');
                }}
                className="px-4 py-2 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={submitWithNote}
                disabled={processing === showNoteModal.id || ((showNoteModal.action === 'REFERRED_TO_MINISTER' || showNoteModal.action === 'APPROVED') && !note.trim())}
                className={`px-4 py-2 text-sm rounded-md text-white ${showNoteModal.action === 'REJECTED'
                  ? 'bg-rose-500 hover:bg-rose-600'
                  : showNoteModal.action === 'APPROVED'
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : showNoteModal.action === 'REFERRED_TO_MINISTER'
                      ? 'bg-purple-500 hover:bg-purple-600'
                      : 'bg-blue-500 hover:bg-blue-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {processing === showNoteModal.id ? 'Processing...' :
                  showNoteModal.action === 'REJECTED' ? 'Reject' :
                    showNoteModal.action === 'APPROVED' ? 'Direct Approve' :
                      showNoteModal.action === 'REFERRED_TO_MINISTER' ? 'Send to Minister' :
                        'Request Info'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
