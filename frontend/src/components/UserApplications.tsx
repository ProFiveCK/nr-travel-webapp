import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api.js';
import { formatDateNauru } from '../lib/dateUtils.js';
import type { TravelApplication } from '../types.js';

interface Props {
  user: { id: string };
  onRefresh?: () => void;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-slate-200 text-slate-700',
  SUBMITTED: 'bg-blue-200 text-blue-700',
  IN_REVIEW: 'bg-yellow-200 text-yellow-700',
  APPROVED: 'bg-green-200 text-green-700',
  REJECTED: 'bg-red-200 text-red-700',
  ARCHIVED: 'bg-gray-200 text-gray-700',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  IN_REVIEW: 'In Progress',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ARCHIVED: 'Archived',
};

export const UserApplications = ({ user, onRefresh }: Props) => {
  const [applications, setApplications] = useState<TravelApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<TravelApplication | null>(null);
  const [attachments, setAttachments] = useState<Array<{ id: string; fileName: string; downloadUrl: string; size: number }>>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, File[]>>({});
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const loadApplications = async () => {
    try {
      setLoading(true);
      console.log('[UserApplications] Loading applications for user:', user.id);
      const { data } = await api.get('/applications');
      console.log('[UserApplications] Received applications:', data.applications?.length || 0, data.applications);
      setApplications(data.applications || []);
    } catch (error: any) {
      console.error('[UserApplications] Failed to load applications:', error);
      console.error('[UserApplications] Error details:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, [user.id]);

  // Also refresh when component becomes visible (user switches to this tab)
  useEffect(() => {
    const handleFocus = () => {
      loadApplications();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const handlePrintPDF = (app: TravelApplication) => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Generate HTML content for PDF
    const htmlContent = generatePDFContent(app);
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const generatePDFContent = (app: TravelApplication): string => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Travel Application - ${app.applicationNumber}</title>
  <style>
    @media print {
      @page { margin: 1cm; }
      body { margin: 0; padding: 20px; }
      .no-print { display: none !important; }
    }
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #000; margin: 0; padding: 20px; }
    .header { background-color: #059669; color: white; padding: 20px; text-align: center; margin: -20px -20px 20px -20px; }
    .header h1 { margin: 0; font-size: 24px; }
    .section { margin: 20px 0; padding: 15px; border: 1px solid #e5e7eb; }
    .section h3 { margin-top: 0; color: #059669; border-bottom: 2px solid #059669; padding-bottom: 10px; }
    .detail-row { margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { font-weight: bold; display: inline-block; width: 200px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    table th, table td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
    table th { background-color: #f3f4f6; font-weight: bold; }
    .approval-section { margin-top: 30px; padding-top: 20px; border-top: 2px solid #059669; }
    .signature-line { margin-top: 60px; border-top: 1px solid #000; width: 300px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>✓ TRAVEL APPLICATION APPROVED</h1>
  </div>
  
  <div class="section">
    <h3>Application Details</h3>
    <div class="detail-row">
      <span class="detail-label">Application Number:</span>
      <span>${app.applicationNumber || app.id.slice(0, 8)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Event Title:</span>
      <span>${app.eventTitle}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Department:</span>
      <span>${app.department}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Division:</span>
      <span>${app.division || 'N/A'}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Travel Dates:</span>
      <span>${formatDateNauru(app.startDate)} to ${formatDateNauru(app.endDate)} (${app.durationDays} days)</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Number of Travellers:</span>
      <span>${app.numberOfTravellers}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Total GoN Cost:</span>
      <span><strong>$${app.totalGonCost.toLocaleString()}</strong></span>
    </div>
  </div>

  ${app.travellers && app.travellers.length > 0 ? `
  <div class="section">
    <h3>Travellers</h3>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Role</th>
        </tr>
      </thead>
      <tbody>
        ${app.travellers.map(t => `
        <tr>
          <td>${t.firstName && t.lastName ? `${t.firstName} ${t.lastName}` : t.name}</td>
          <td>${t.role || 'N/A'}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${app.expenses && app.expenses.length > 0 ? `
  <div class="section">
    <h3>Expense Details</h3>
    <table>
      <thead>
        <tr>
          <th>Expense Type</th>
          <th>Details</th>
          <th>Cost/Person</th>
          <th>Persons/Days</th>
          <th>Total Cost</th>
          <th>Donor Funding</th>
          <th>GoN Cost</th>
        </tr>
      </thead>
      <tbody>
        ${app.expenses.map(e => `
        <tr>
          <td>${e.expenseType}</td>
          <td>${e.details}</td>
          <td>$${e.costPerPerson.toLocaleString()}</td>
          <td>${e.personsOrDays}</td>
          <td>$${e.totalCost.toLocaleString()}</td>
          <td>${e.donorFunding}</td>
          <td>$${e.gonCost.toLocaleString()}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${app.reasonForParticipation ? `
  <div class="section">
    <h3>Reason for Participation</h3>
    <p>${app.reasonForParticipation}</p>
  </div>
  ` : ''}

  ${app.approvalLog && app.approvalLog.length > 0 ? `
  <div class="approval-section">
    <h3>Approval History</h3>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Action</th>
          <th>Reviewer</th>
          <th>Note</th>
        </tr>
      </thead>
      <tbody>
        ${app.approvalLog.map(log => `
        <tr>
          <td>${formatDateNauru(log.timestamp)}</td>
          <td>${log.action}</td>
          <td>${log.actorName} (${log.actorEmail})</td>
          <td>${log.note || 'N/A'}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="approval-section">
    <h3>Approval Information</h3>
    <p><strong>Approved Date:</strong> ${app.decidedAt ? formatDateNauru(app.decidedAt) : 'N/A'}</p>
    <div class="signature-line"></div>
    <p class="signature-label">Authorized Signature</p>
  </div>
</body>
</html>`;
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
    setSelectedApplication(app);
    loadAttachments(app.id);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, attachmentType: string, applicationId: string) => {
    const files = Array.from(event.target.files || []);
    console.log('[UserApplications] Files selected:', files.length, files.map(f => f.name));
    if (files.length === 0) return;

    const key = `${applicationId}-${attachmentType}`;
    const existingFiles = uploadingFiles[key] || [];

    console.log('[UserApplications] Adding files to state. Key:', key, 'Existing:', existingFiles.length, 'New:', files.length);

    const updatedFiles = [...existingFiles, ...files];
    console.log('[UserApplications] Setting uploadingFiles state. Total files for', key, ':', updatedFiles.length);

    setUploadingFiles((prev) => {
      const updated = {
        ...prev,
        [key]: updatedFiles,
      };
      console.log('[UserApplications] Updated uploadingFiles state:', Object.keys(updated).length, 'keys');
      return updated;
    });

    // Reset the input so the same file can be selected again if needed
    event.target.value = '';
  };

  const handleUploadFiles = async (applicationId: string, attachmentType: string) => {
    const files = uploadingFiles[`${applicationId}-${attachmentType}`] || [];
    if (files.length === 0) return;

    setUploadStatus('Uploading files...');
    try {
      const uploadPromises = files.map((file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('attachmentType', attachmentType);
        return api.post(`/applications/${applicationId}/attachments`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      });

      await Promise.all(uploadPromises);
      setUploadStatus('Files uploaded successfully!');

      // Clear the file input and reload attachments
      setUploadingFiles((prev) => {
        const { [`${applicationId}-${attachmentType}`]: removed, ...rest } = prev;
        return rest;
      });
      loadAttachments(applicationId);

      // Clear status after 3 seconds
      setTimeout(() => setUploadStatus(null), 3000);
    } catch (error: any) {
      console.error('Failed to upload files:', error);
      setUploadStatus(error.response?.data?.message || 'Failed to upload files');
      setTimeout(() => setUploadStatus(null), 5000);
    }
  };

  const handleResubmit = async (applicationId: string) => {
    try {
      // First, upload any pending files before resubmitting
      const pendingFiles = Object.keys(uploadingFiles).filter(key => key.startsWith(`${applicationId}-`));

      if (pendingFiles.length > 0) {
        setUploadStatus('Uploading attachments before resubmission...');

        // Upload all pending files
        const uploadPromises = pendingFiles.map(async (key) => {
          const attachmentType = key.replace(`${applicationId}-`, '');
          const files = uploadingFiles[key] || [];

          if (files.length === 0) return;

          // Upload each file for this attachment type
          const fileUploadPromises = files.map((file) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('attachmentType', attachmentType);
            return api.post(`/applications/${applicationId}/attachments`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
          });

          return Promise.all(fileUploadPromises);
        });

        await Promise.all(uploadPromises);

        // Clear all uploaded files from state
        setUploadingFiles((prev) => {
          const updated = { ...prev };
          pendingFiles.forEach(key => delete updated[key]);
          return updated;
        });

        setUploadStatus('Files uploaded! Resubmitting application...');
        await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause to show status
      } else {
        setUploadStatus('Resubmitting application...');
      }

      // Now resubmit the application
      await api.post(`/applications/${applicationId}/resubmit`);
      setUploadStatus('Application resubmitted successfully!');
      loadApplications();
      setTimeout(() => {
        setUploadStatus(null);
        setSelectedApplication(null);
      }, 3000);
    } catch (error: any) {
      console.error('Failed to resubmit:', error);
      setUploadStatus(error.response?.data?.message || 'Failed to resubmit application');
      setTimeout(() => setUploadStatus(null), 5000);
    }
  };

  const handleDownloadFiles = async (app: TravelApplication) => {
    try {
      const { data } = await api.get(`/applications/${app.id}/attachments`);
      const files = data.attachments || [];

      if (files.length === 0) {
        alert('No attachments available for this application.');
        return;
      }

      // Download each file
      for (const file of files) {
        const link = document.createElement('a');
        link.href = file.downloadUrl;
        link.download = file.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('Failed to download files:', error);
      alert('Failed to download files. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-600">Loading applications...</div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-600">You haven't submitted any applications yet.</p>
        <p className="text-sm text-slate-500 mt-2">Create a new application using the "Application" tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {uploadStatus && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${uploadStatus.includes('successfully') || uploadStatus.includes('success')
            ? 'bg-green-50 text-green-800 border border-green-200'
            : uploadStatus.includes('Uploading') || uploadStatus.includes('Resubmitting')
              ? 'bg-blue-50 text-blue-800 border border-blue-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
          {uploadStatus}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800">My Applications</h2>
          <p className="text-sm text-slate-600 mt-1">Track the status of your travel applications</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Application #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Travel Dates
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Total Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-900">
                    {app.applicationNumber || app.id.slice(0, 8)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900">
                    <div className="font-medium">{app.eventTitle}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {app.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {formatDateNauru(app.startDate)} - {formatDateNauru(app.endDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                    ${app.totalGonCost.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[app.status] || statusColors.DRAFT
                        }`}
                    >
                      {statusLabels[app.status] || app.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {app.submittedAt ? formatDateNauru(app.submittedAt) : 'Not submitted'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewApplication(app)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View Details
                      </button>
                      {(app.status === 'APPROVED' || app.status === 'ARCHIVED') && (
                        <>
                          <button
                            onClick={() => handlePrintPDF(app)}
                            className="text-green-600 hover:text-green-800 font-medium"
                          >
                            Print PDF
                          </button>
                          <button
                            onClick={() => handleDownloadFiles(app)}
                            className="text-purple-600 hover:text-purple-800 font-medium"
                          >
                            Download Files
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-slate-800">
                Application Details - {selectedApplication.applicationNumber || selectedApplication.id.slice(0, 8)}
              </h3>
              <button
                onClick={() => setSelectedApplication(null)}
                className="text-slate-500 hover:text-slate-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Status</label>
                  <div className="mt-1">
                    <span
                      className={`px-3 py-1 text-sm font-semibold rounded-full ${statusColors[selectedApplication.status] || statusColors.DRAFT
                        }`}
                    >
                      {statusLabels[selectedApplication.status] || selectedApplication.status}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Event Title</label>
                  <div className="mt-1 text-slate-900">{selectedApplication.eventTitle}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Department</label>
                  <div className="mt-1 text-slate-900">{selectedApplication.department}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Division</label>
                  <div className="mt-1 text-slate-900">{selectedApplication.division || 'N/A'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Travel Dates</label>
                  <div className="mt-1 text-slate-900">
                    {formatDateNauru(selectedApplication.startDate)} - {formatDateNauru(selectedApplication.endDate)} ({selectedApplication.durationDays} days)
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Number of Travellers</label>
                  <div className="mt-1 text-slate-900">{selectedApplication.numberOfTravellers}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Total Cost</label>
                  <div className="mt-1 text-slate-900 font-semibold">
                    ${selectedApplication.totalGonCost.toLocaleString()}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Submitted</label>
                  <div className="mt-1 text-slate-900">
                    {selectedApplication.submittedAt ? formatDateNauru(selectedApplication.submittedAt) : 'Not submitted'}
                  </div>
                </div>
              </div>

              {selectedApplication.travellers && selectedApplication.travellers.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Travellers</label>
                  <div className="mt-2 space-y-2">
                    {selectedApplication.travellers.map((traveller, idx) => (
                      <div key={idx} className="bg-slate-50 p-3 rounded">
                        <div className="text-slate-900">
                          {traveller.firstName && traveller.lastName
                            ? `${traveller.firstName} ${traveller.lastName}`
                            : traveller.name}
                        </div>
                        {traveller.role && (
                          <div className="text-sm text-slate-600">Role: {traveller.role}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedApplication.expenses && selectedApplication.expenses.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Expenses</label>
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-4 py-2 text-left">Type</th>
                          <th className="px-4 py-2 text-left">Details</th>
                          <th className="px-4 py-2 text-right">Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedApplication.expenses.map((expense, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="px-4 py-2">{expense.expenseType}</td>
                            <td className="px-4 py-2">{expense.details}</td>
                            <td className="px-4 py-2 text-right">
                              ${expense.gonCost.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedApplication.reasonForParticipation && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Reason for Participation</label>
                  <div className="mt-1 text-slate-900 p-3 bg-slate-50 rounded">
                    {selectedApplication.reasonForParticipation}
                  </div>
                </div>
              )}

              {/* Attachments Section */}
              <div>
                <h4 className="text-lg font-semibold text-slate-900 mb-3">Attachments</h4>
                {loadingAttachments ? (
                  <p className="text-sm text-slate-500">Loading attachments...</p>
                ) : attachments.length > 0 ? (
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className="bg-slate-50 p-3 rounded text-sm flex items-center justify-between border border-slate-200">
                        <div>
                          <span className="font-medium">{attachment.fileName}</span>
                          {attachment.size && (
                            <span className="text-slate-500 ml-2">
                              ({(attachment.size / 1024).toFixed(1)} KB)
                            </span>
                          )}
                        </div>
                        <a
                          href={attachment.downloadUrl}
                          download
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                        >
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No attachments uploaded</p>
                )}

                {/* Upload attachments for REJECTED applications */}
                {selectedApplication.status === 'REJECTED' && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800 mb-3">
                      This application was rejected. You can add missing attachments and resubmit.
                    </p>
                    <div className="space-y-3">
                      {['Invitation from event organizer', 'Travel cost quotation (least cost flights)', 'Justification for unfunded participants', 'Explanation when latest flights are not used'].map((item) => {
                        const key = `${selectedApplication.id}-${item}`;
                        const files = uploadingFiles[key] || [];
                        return (
                          <div key={item} className="flex items-center gap-2 flex-wrap">
                            <label className="flex-1 text-sm text-slate-700 min-w-[200px]">{item}</label>
                            <input
                              ref={(el) => {
                                fileInputRefs.current[key] = el;
                              }}
                              type="file"
                              multiple
                              className="hidden"
                              id={`file-${key}`}
                              onChange={(e) => {
                                console.log('[UserApplications] File input onChange triggered for:', key);
                                const selectedFiles = Array.from(e.target.files || []);
                                console.log('[UserApplications] Files in onChange:', selectedFiles.length, selectedFiles.map(f => f.name));
                                if (selectedFiles.length > 0) {
                                  handleFileSelect(e, item, selectedApplication.id);
                                } else {
                                  console.log('[UserApplications] No files selected (user cancelled)');
                                }
                              }}
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('[UserApplications] Add File button clicked for:', key);
                                const input = fileInputRefs.current[key] || (document.getElementById(`file-${key}`) as HTMLInputElement);
                                console.log('[UserApplications] File input element:', input);
                                if (input) {
                                  // Reset the input value to allow selecting the same file again
                                  input.value = '';
                                  console.log('[UserApplications] Triggering file input click');
                                  input.click();
                                  console.log('[UserApplications] File input click triggered');
                                } else {
                                  console.error('[UserApplications] File input not found:', `file-${key}`);
                                }
                              }}
                              className="px-3 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap"
                            >
                              {files.length > 0 ? `Add More (${files.length})` : 'Add File'}
                            </button>
                            {files.length > 0 && (
                              <>
                                <div className="text-xs text-slate-600">
                                  {files.length} file{files.length > 1 ? 's' : ''} ready: {files.map(f => f.name).join(', ')}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleUploadFiles(selectedApplication.id, item)}
                                  className="px-3 py-1 text-xs rounded-md bg-green-600 text-white hover:bg-green-700 whitespace-nowrap"
                                >
                                  Upload {files.length} file{files.length > 1 ? 's' : ''}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const clearKey = `${selectedApplication.id}-${item}`;
                                    console.log('[UserApplications] Clearing files for:', clearKey);
                                    setUploadingFiles((prev) => {
                                      const { [clearKey]: removed, ...rest } = prev;
                                      return rest;
                                    });
                                    // Also clear the input value
                                    const input = fileInputRefs.current[clearKey];
                                    if (input) {
                                      input.value = '';
                                    }
                                  }}
                                  className="px-3 py-1 text-xs rounded-md bg-red-600 text-white hover:bg-red-700 whitespace-nowrap"
                                >
                                  Clear
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })}
                      <div className="mt-4 pt-4 border-t border-yellow-300">
                        <button
                          type="button"
                          onClick={() => handleResubmit(selectedApplication.id)}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
                        >
                          Resubmit Application
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

