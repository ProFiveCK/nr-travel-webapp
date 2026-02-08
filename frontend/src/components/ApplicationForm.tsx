import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import type { AppUser, ExpenseRow, TravelApplication, Traveller } from '../types.js';
import { api } from '../lib/api.js';

interface Props {
  applications: TravelApplication[];
  user?: AppUser | null;
  onCreate: (payload: Partial<TravelApplication>) => Promise<void>;
  onSubmit: (payload: Partial<TravelApplication>) => Promise<{ application: TravelApplication }>;
  onNavigateToApplications?: () => void;
}

const documentChecklist = [
  'Invitation from event organiser',
  'Travel cost quotation (least cost flights)',
  'Justification for unfunded participants',
  'Explanation when latest flights are not used',
] as const;

const createId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

type ExpenseRowForm = ExpenseRow & { id: string };
type TravellerRow = Traveller & { id: string };

const createExpenseRow = (): ExpenseRowForm => ({
  id: createId(),
  expenseType: '',
  details: '',
  costPerPerson: 0,
  personsOrDays: 0,
  totalCost: 0,
  donorFunding: 'No',
  gonCost: 0,
});

const createTravellerRow = (): TravellerRow & { firstName: string; lastName: string } => ({
  id: createId(),
  name: '',
  role: '',
  firstName: '',
  lastName: '',
});

type FormState = {
  department: string;
  division: string;
  headOfDepartment: string;
  eventTitle: string;
  reasonForParticipation: string;
  startDate: string;
  endDate: string;
  numberOfTravellers: number;
  hodEmail: string;
  ministerName: string;
  ministerEmail: string;
  requesterEmail: string;
  requesterFirstName: string;
  requesterLastName: string;
  phoneNumber: string;
  attachmentsProvided: string[];
};

const defaultFormState: FormState = {
  department: '',
  division: '',
  headOfDepartment: '',
  eventTitle: '',
  reasonForParticipation: '',
  startDate: '',
  endDate: '',
  numberOfTravellers: 0,
  hodEmail: '',
  ministerName: '',
  ministerEmail: '',
  requesterEmail: '',
  requesterFirstName: '',
  requesterLastName: '',
  phoneNumber: '',
  attachmentsProvided: [],
};

export const ApplicationForm = ({ applications, user, onCreate, onSubmit, onNavigateToApplications }: Props) => {
  const [form, setForm] = useState<FormState>({ ...defaultFormState });
  const [expenses, setExpenses] = useState<ExpenseRowForm[]>([createExpenseRow()]);
  const [travellers, setTravellers] = useState<(TravellerRow & { firstName: string; lastName: string })[]>([createTravellerRow()]);
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [busyAction, setBusyAction] = useState<'idle' | 'submit'>('idle');
  const [status, setStatus] = useState<string | null>(null);
  const [expenseTypes, setExpenseTypes] = useState<string[]>([]);
  const [departments, setDepartments] = useState<{ depHead: string; deptName: string; headName?: string; headEmail?: string }[]>([]);
  const [departmentProfiles, setDepartmentProfiles] = useState<{ depHead: string; headName: string; headEmail: string }[]>([]);
  const [ministers, setMinisters] = useState<{ id: string; name: string; email: string }[]>([]);
  const [uploadSettings, setUploadSettings] = useState<{ maxFileSizeMB: number; allowedFileTypes: string[] } | null>(null);

  // Load expense types and department data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load expense types from public endpoint
        try {
          const { data: expenseData } = await api.get('/applications/expense-types');
          if (expenseData.expenseTypes && Array.isArray(expenseData.expenseTypes) && expenseData.expenseTypes.length > 0) {
            console.log('Loaded expense types:', expenseData.expenseTypes);
            setExpenseTypes(expenseData.expenseTypes);
          } else {
            throw new Error('No expense types in response');
          }
        } catch (expenseError) {
          console.warn('Failed to load expense types, using defaults:', expenseError);
          setExpenseTypes(['Airfare', 'Accommodation', 'Meals', 'Transportation', 'Registration Fee', 'Visa', 'Insurance', 'Other']);
        }

        // Load upload settings from admin settings (if user has access)
        try {
          const { data: settingsData } = await api.get('/admin/settings');
          if (settingsData.settings?.uploads) {
            setUploadSettings({
              maxFileSizeMB: settingsData.settings.uploads.maxFileSizeMB,
              allowedFileTypes: settingsData.settings.uploads.allowedFileTypes,
            });
          }
        } catch (uploadError) {
          console.warn('Failed to load upload settings, using defaults:', uploadError);
          setUploadSettings({
            maxFileSizeMB: 10,
            allowedFileTypes: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'],
          });
        }

        // Load departments
        const { data: deptsData } = await api.get('/auth/departments');
        if (deptsData.departments) {
          setDepartments(deptsData.departments);
        }

        // Load department profiles
        const { data: profilesData } = await api.get('/auth/department-profiles');
        if (profilesData.profiles) {
          setDepartmentProfiles(profilesData.profiles);
        }

        // Load ministers
        const { data: ministersData } = await api.get('/auth/ministers');
        if (ministersData.ministers) {
          setMinisters(ministersData.ministers);
        }
      } catch (error) {
        console.error('Failed to load form data:', error);
      }
    };
    loadData();
  }, []);

  // Pre-fill form with user's department information when user is available
  useEffect(() => {
    if (user) {
      const userDeptProfile = departmentProfiles.find(p =>
        departments.find(d => d.depHead === p.depHead && d.deptName === user.department)
      );

      setForm((prev) => ({
        ...prev,
        department: user.department || prev.department,
        requesterEmail: user.email || prev.requesterEmail,
        requesterFirstName: user.firstName || prev.requesterFirstName,
        requesterLastName: user.lastName || prev.requesterLastName,
        headOfDepartment: userDeptProfile?.headName || prev.headOfDepartment,
        hodEmail: userDeptProfile?.headEmail || user.departmentHeadEmail || prev.hodEmail,
      }));
    }
  }, [user, departmentProfiles, departments]);

  // Auto-count number of travellers
  useEffect(() => {
    const validTravellers = travellers.filter(t => t.firstName.trim() || t.lastName.trim());
    setForm((prev) => ({
      ...prev,
      numberOfTravellers: validTravellers.length,
    }));
  }, [travellers]);

  const durationDays = useMemo(() => {
    if (!form.startDate || !form.endDate) return 0;
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) return 0;
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff + 1 : 0;
  }, [form.startDate, form.endDate]);

  const totalGonCost = useMemo(() => {
    return expenses.reduce((sum, row) => sum + (Number(row.gonCost) || 0), 0);
  }, [expenses]);

  const updateFormField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateExpense = (index: number, field: keyof ExpenseRow, value: string | number) => {
    setExpenses((prev) => {
      const next = [...prev];
      let parsedValue: string | number | ExpenseRow['donorFunding'] = value;
      if (field === 'donorFunding') {
        parsedValue = value as ExpenseRow['donorFunding'];
      } else if (field === 'expenseType' || field === 'details') {
        parsedValue = typeof value === 'string' ? value : String(value);
      } else {
        parsedValue = Number(value) || 0;
      }
      next[index] = { ...next[index], [field]: parsedValue } as ExpenseRowForm;
      if (field === 'costPerPerson' || field === 'personsOrDays') {
        const costPerPerson = Number(next[index].costPerPerson) || 0;
        const personsOrDays = Number(next[index].personsOrDays) || 0;
        next[index].totalCost = costPerPerson * personsOrDays;
      }
      return next;
    });
  };

  const updateTraveller = (index: number, field: 'firstName' | 'lastName' | 'role', value: string) => {
    setTravellers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      // Update name field for backward compatibility
      if (field === 'firstName' || field === 'lastName') {
        next[index].name = `${next[index].firstName || ''} ${next[index].lastName || ''}`.trim();
      }
      return next;
    });
  };

  const handleFilesChange = (event: ChangeEvent<HTMLInputElement>, attachmentType: string) => {
    if (!event.target.files) return;
    const selectedFiles = Array.from(event.target.files);

    // Validate file types and sizes
    if (uploadSettings) {
      const invalidFiles: string[] = [];
      const oversizedFiles: string[] = [];

      selectedFiles.forEach((file) => {
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        if (!fileExt || !uploadSettings.allowedFileTypes.includes(fileExt)) {
          invalidFiles.push(file.name);
        }
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > uploadSettings.maxFileSizeMB) {
          oversizedFiles.push(file.name);
        }
      });

      if (invalidFiles.length > 0) {
        setStatus(`Invalid file type(s): ${invalidFiles.join(', ')}. Allowed types: ${uploadSettings.allowedFileTypes.join(', ').toUpperCase()}`);
        return;
      }

      if (oversizedFiles.length > 0) {
        setStatus(`File(s) too large: ${oversizedFiles.join(', ')}. Maximum size: ${uploadSettings.maxFileSizeMB}MB`);
        return;
      }
    }

    setFiles((prev) => ({
      ...prev,
      [attachmentType]: selectedFiles,
    }));
  };

  const removeFile = (attachmentType: string, fileIndex: number) => {
    setFiles((prev) => {
      const currentFiles = prev[attachmentType] || [];
      const updatedFiles = currentFiles.filter((_, idx) => idx !== fileIndex);
      if (updatedFiles.length === 0) {
        const { [attachmentType]: removed, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [attachmentType]: updatedFiles,
      };
    });
  };

  const resetForm = () => {
    setForm({ ...defaultFormState });
    setExpenses([createExpenseRow()]);
    setTravellers([createTravellerRow()]);
    setFiles({});
  };

  const buildPayload = () => {
    // Find department code from selected head of department
    const selectedProfile = departmentProfiles.find(p => p.headName === form.headOfDepartment);
    const selectedDept = departments.find(d => d.deptName === form.department);
    const departmentCode = selectedProfile?.depHead || selectedDept?.depHead || '00';

    return {
      ...form,
      headOfDepartmentEmail: selectedProfile?.headEmail || form.hodEmail || '',
      departmentHeadCode: departmentCode,
      ministerName: form.ministerName,
      durationDays,
      expenses: expenses.map(({ id, ...row }) => row),
      travellers: travellers
        .filter((traveller) => traveller.firstName.trim() || traveller.lastName.trim())
        .map(({ id, firstName, lastName, role, ...rest }) => ({
          name: `${firstName || ''} ${lastName || ''}`.trim(),
          role,
          firstName,
          lastName,
        })),
      attachmentsProvided: form.attachmentsProvided,
      totalGonCost,
      status: 'SUBMITTED',
      submit: true,
    };
  };

  const handleAction = async (mode: 'submit') => {
    if (busyAction !== 'idle') return;
    setBusyAction(mode);
    setStatus(null);
    try {
      const payload = buildPayload();
      const result = await onSubmit(payload);
      const applicationId = result.application.id;

      // Upload all files after application is created
      if (applicationId && Object.keys(files).length > 0) {
        setStatus('Uploading attachments...');
        const uploadPromises: Promise<void>[] = [];

        for (const [attachmentType, fileList] of Object.entries(files)) {
          for (const file of fileList) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('attachmentType', attachmentType);

            uploadPromises.push(
              api.post(`/applications/${applicationId}/attachments`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
              }).then(() => {
                console.log(`Uploaded ${file.name} for ${attachmentType}`);
              }).catch((error) => {
                console.error(`Failed to upload ${file.name}:`, error);
                throw error;
              })
            );
          }
        }

        await Promise.all(uploadPromises);
        setStatus('Submitted for review. Check Reviewer tab for status.');
      } else {
        setStatus('Submitted for review. Check Reviewer tab for status.');
      }

      resetForm();
    } catch (error: any) {
      console.error('Submission error:', error);
      setStatus(error.response?.data?.message || 'Unable to submit for review.');
    } finally {
      setBusyAction('idle');
    }
  };

  const handleSubmitForReview = async () => {
    // Validate required fields
    if (!form.ministerName || !form.ministerName.trim()) {
      setStatus('Minister Name is required. Please enter the minister\'s full name.');
      return;
    }
    if (!form.ministerEmail || !form.ministerEmail.trim()) {
      setStatus('Minister Email is required. Please enter a valid email address.');
      return;
    }
    if (!form.hodEmail || !form.hodEmail.trim()) {
      setStatus('Head of Department Email is required. Please enter a valid email address.');
      return;
    }
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.ministerEmail)) {
      setStatus('Please enter a valid Minister Email address.');
      return;
    }
    if (!emailRegex.test(form.hodEmail)) {
      setStatus('Please enter a valid Head of Department Email address.');
      return;
    }
    await handleAction('submit');
  };

  return (
    <div className="space-y-10 reveal-stagger">
      <form onSubmit={(e) => { e.preventDefault(); handleSubmitForReview(); }} className="space-y-8">
        {/* Applicant Information & Contact - Moved to Top */}
        <section className="p-6 rounded-xl app-panel">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Applicant Information & Contact</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="text-sm font-medium text-slate-700">
              First Name
              <input
                className="mt-1 w-full border rounded-md px-3 py-2 bg-slate-50"
                value={form.requesterFirstName}
                readOnly
                title="Pre-filled from your profile"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Last Name
              <input
                className="mt-1 w-full border rounded-md px-3 py-2 bg-slate-50"
                value={form.requesterLastName}
                readOnly
                title="Pre-filled from your profile"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                className="mt-1 w-full border rounded-md px-3 py-2 bg-slate-50"
                value={form.requesterEmail}
                readOnly
                title="Pre-filled from your profile"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Contact Phone
              <div className="flex items-center gap-0 mt-1">
                <span className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-l-md text-slate-600 font-medium border-r-0">
                  (674)
                </span>
                <input
                  type="text"
                  className="flex-1 border border-l-0 rounded-r-md px-3 py-2"
                  value={form.phoneNumber.replace(/^\(674\)\s*/, '')}
                  onChange={(event) => {
                    let value = event.target.value;
                    // Remove non-digits
                    value = value.replace(/\D/g, '');
                    // Limit to 7 digits
                    if (value.length > 7) {
                      value = value.slice(0, 7);
                    }
                    // Format: NNN-NNNN
                    if (value.length > 3) {
                      value = `${value.slice(0, 3)}-${value.slice(3)}`;
                    }
                    updateFormField('phoneNumber', `(674) ${value}`);
                  }}
                  placeholder="123-4567"
                  maxLength={8}
                />
              </div>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Select Minister <span className="text-red-500">*</span>
              <select
                className="mt-1 w-full border-2 border-blue-200 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                value={form.ministerEmail} // Use email as value since names might not be unique, or use ID if available in form state (but form state uses name/email)
                onChange={(event) => {
                  const selectedEmail = event.target.value;
                  const selectedMinister = ministers.find(m => m.email === selectedEmail);
                  if (selectedMinister) {
                    updateFormField('ministerName', selectedMinister.name);
                    updateFormField('ministerEmail', selectedMinister.email);
                  } else {
                    updateFormField('ministerName', '');
                    updateFormField('ministerEmail', '');
                  }
                }}
                required
              >
                <option value="">Select a Minister</option>
                {ministers.map((minister) => (
                  <option key={minister.id} value={minister.email}>
                    {minister.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Minister Email
              <input
                type="email"
                className="mt-1 w-full border rounded-md px-3 py-2 bg-slate-50 text-slate-600"
                value={form.ministerEmail}
                readOnly
                placeholder="Auto-filled"
              />
            </label>
          </div>
        </section>

        <section className="p-6 rounded-xl app-panel">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Identification of Spending Unit</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="text-sm font-medium text-slate-700">
              Department (Select)
              <select
                required
                className="mt-1 w-full border rounded-md px-3 py-2 bg-slate-50"
                value={form.department}
                onChange={(event) => {
                  const selectedDeptName = event.target.value;
                  updateFormField('department', selectedDeptName);

                  // Auto-fill Head of Department if profile exists
                  const selectedProfile = departmentProfiles.find(p =>
                    departments.find(d => d.deptName === selectedDeptName && d.depHead === p.depHead)
                  );

                  if (selectedProfile) {
                    updateFormField('headOfDepartment', selectedProfile.headName);
                    updateFormField('hodEmail', selectedProfile.headEmail);
                  } else {
                    // Also check if the department object itself has head info (fallback)
                    const deptInfo = departments.find(d => d.deptName === selectedDeptName);
                    if (deptInfo?.headName) updateFormField('headOfDepartment', deptInfo.headName);
                    if (deptInfo?.headEmail) updateFormField('hodEmail', deptInfo.headEmail);
                  }
                }}
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.depHead} value={dept.deptName}>
                    {dept.deptName}
                  </option>
                ))}
              </select>
              {user?.department && form.department === user.department && (
                <p className="text-xs text-slate-500 mt-1">Default selection from your profile</p>
              )}
            </label>
            <label className="text-sm font-medium text-slate-700">
              Division
              <input
                className="mt-1 w-full border rounded-md px-3 py-2"
                value={form.division}
                onChange={(event) => updateFormField('division', event.target.value)}
                placeholder="Accounts Payable"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Head of Department <span className="text-red-500">*</span>
              <div className="mt-1 relative">
                <input
                  list="hod-list"
                  className="w-full border-2 border-blue-200 rounded-md px-3 py-2 pr-8 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                  value={form.headOfDepartment}
                  onChange={(event) => {
                    const value = event.target.value;
                    updateFormField('headOfDepartment', value);
                    // Try to find matching profile and auto-fill email
                    const selectedProfile = departmentProfiles.find(p => p.headName === value);
                    if (selectedProfile) {
                      updateFormField('hodEmail', selectedProfile.headEmail);
                    }
                  }}
                  placeholder="Select from list or type name"
                  required
                />
                <datalist id="hod-list">
                  {departmentProfiles.map((profile) => (
                    <option key={profile.depHead} value={profile.headName}>
                      {profile.headEmail}
                    </option>
                  ))}
                </datalist>
              </div>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Head of Department Email <span className="text-red-500">*</span>
              <input
                type="email"
                required
                className="mt-1 w-full border-2 border-blue-200 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                value={form.hodEmail}
                onChange={(event) => updateFormField('hodEmail', event.target.value)}
                placeholder="hod@example.com"
              />
            </label>
          </div>
        </section>

        <section className="p-6 rounded-xl app-panel space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Event Details</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="text-sm font-medium text-slate-700">
              Event Title <span className="text-red-500">*</span>
              <input
                required
                className="mt-1 w-full border-2 border-blue-200 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                value={form.eventTitle}
                onChange={(event) => updateFormField('eventTitle', event.target.value)}
                placeholder="Business Travel Summit"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Reason for Participation <span className="text-red-500">*</span>
              <input
                required
                className="mt-1 w-full border-2 border-blue-200 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                value={form.reasonForParticipation}
                onChange={(event) => updateFormField('reasonForParticipation', event.target.value)}
                placeholder="Capacity building"
              />
            </label>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <label className="text-sm font-medium text-slate-700">
              Start Date <span className="text-red-500">*</span>
              <input
                required
                type="date"
                className="mt-1 w-full border-2 border-blue-200 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                value={form.startDate}
                onChange={(event) => updateFormField('startDate', event.target.value)}
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              End Date <span className="text-red-500">*</span>
              <input
                required
                type="date"
                className="mt-1 w-full border-2 border-blue-200 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                value={form.endDate}
                onChange={(event) => updateFormField('endDate', event.target.value)}
              />
            </label>
            <div className="text-sm text-slate-600 flex flex-col justify-end">
              <span className="font-medium text-slate-900">Trip Duration</span>
              <span>{durationDays ? `${durationDays} day(s)` : 'Select dates'}</span>
            </div>
          </div>
        </section>

        <section className="p-6 rounded-xl app-panel space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900">Traveller Details</h3>
              <p className="text-sm text-slate-600">Provide the number of travellers and list each participant.</p>
            </div>
            <div className="w-full md:w-48">
              <label className="text-sm font-medium text-slate-700">
                Number of Travellers
                <div className="relative mt-1">
                  <input
                    type="number"
                    min={0}
                    className="w-full border-2 border-slate-200 rounded-md px-3 py-2 bg-slate-100 text-slate-600 cursor-not-allowed"
                    value={form.numberOfTravellers}
                    readOnly
                    title="Automatically calculated from traveller list"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 bg-white px-1 rounded">Auto</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Auto-calculated from traveller list</p>
              </label>
            </div>
          </div>

          <div className="space-y-3">
            {travellers.map((traveller, index) => (
              <div key={traveller.id} className="grid md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg">
                <label className="text-sm font-medium text-slate-700">
                  First Name <span className="text-red-500">*</span>
                  <input
                    className="mt-1 w-full border-2 border-blue-200 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    value={traveller.firstName}
                    onChange={(event) => updateTraveller(index, 'firstName', event.target.value)}
                    placeholder="First name"
                    required
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Last Name <span className="text-red-500">*</span>
                  <input
                    className="mt-1 w-full border-2 border-blue-200 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    value={traveller.lastName}
                    onChange={(event) => updateTraveller(index, 'lastName', event.target.value)}
                    placeholder="Last name"
                    required
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Position / Role <span className="text-red-500">*</span>
                  <input
                    className="mt-1 w-full border-2 border-blue-200 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    value={traveller.role}
                    onChange={(event) => updateTraveller(index, 'role', event.target.value)}
                    placeholder="Role"
                    required
                  />
                </label>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-link text-sm"
              onClick={() => setTravellers((prev) => [...prev, createTravellerRow()])}
            >
              + Add Traveller
            </button>
          </div>
        </section>

        <section className="p-6 rounded-xl app-panel space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Expense Details</h3>
              <p className="text-sm text-slate-600">Capture each anticipated cost and funding split.</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600 mb-1">Total GoN Cost</p>
              <p className="text-xl font-semibold text-emerald-600">
                ${totalGonCost.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1">(Calculated from expense rows)</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-600 text-xs uppercase">
                <tr>
                  <th className="p-2 text-left min-w-[150px]">Expense Type</th>
                  <th className="p-2 text-left min-w-[200px]">Details</th>
                  <th className="p-2 text-right w-24">Cost / Person</th>
                  <th className="p-2 text-right w-20">Persons / Days</th>
                  <th className="p-2 text-right w-28">Total Cost ($)</th>
                  <th className="p-2 text-left w-28">Donor Funding</th>
                  <th className="p-2 text-right w-28">GoN Cost ($)</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((row, index) => (
                  <tr key={row.id} className="border-b">
                    <td className="p-2 min-w-[150px]">
                      {expenseTypes.length > 0 ? (
                        <select
                          className="w-full border rounded-md px-2 py-1"
                          value={row.expenseType}
                          onChange={(event) => updateExpense(index, 'expenseType', event.target.value)}
                        >
                          <option value="">Select type</option>
                          {expenseTypes.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          className="w-full border rounded-md px-2 py-1"
                          value={row.expenseType}
                          onChange={(event) => updateExpense(index, 'expenseType', event.target.value)}
                          placeholder="Enter expense type"
                        />
                      )}
                      {row.expenseType && expenseTypes.length > 0 && !expenseTypes.includes(row.expenseType) && (
                        <input
                          className="mt-1 w-full border rounded-md px-2 py-1 text-xs"
                          value={row.expenseType}
                          onChange={(event) => updateExpense(index, 'expenseType', event.target.value)}
                          placeholder="Custom type"
                        />
                      )}
                    </td>
                    <td className="p-2 min-w-[200px]">
                      <input
                        className="w-full border rounded-md px-2 py-1"
                        value={row.details}
                        onChange={(event) => updateExpense(index, 'details', event.target.value)}
                        placeholder="Economy return flights"
                      />
                    </td>
                    <td className="p-2 text-right w-24">
                      <input
                        type="number"
                        className="w-full border rounded-md px-2 py-1 text-right"
                        value={row.costPerPerson || ''}
                        onChange={(event) => updateExpense(index, 'costPerPerson', Number(event.target.value) || 0)}
                        placeholder="0"
                      />
                    </td>
                    <td className="p-2 text-right w-20">
                      <input
                        type="number"
                        className="w-full border rounded-md px-2 py-1 text-right"
                        value={row.personsOrDays || ''}
                        onChange={(event) => updateExpense(index, 'personsOrDays', Number(event.target.value) || 0)}
                        placeholder="0"
                      />
                    </td>
                    <td className="p-2 text-right w-28 font-medium">${row.totalCost.toLocaleString()}</td>
                    <td className="p-2 w-28">
                      <select
                        className="w-full border rounded-md px-2 py-1"
                        value={row.donorFunding}
                        onChange={(event) => updateExpense(index, 'donorFunding', event.target.value)}
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </td>
                    <td className="p-2 text-right w-28">
                      <input
                        type="number"
                        className="w-full border rounded-md px-2 py-1 text-right"
                        value={row.gonCost || ''}
                        onChange={(event) => updateExpense(index, 'gonCost', Number(event.target.value) || 0)}
                        min="0"
                        step="0.01"
                        placeholder="0"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="btn btn-link text-sm" onClick={() => setExpenses((prev) => [...prev, createExpenseRow()])}>
            + Add Expense Row
          </button>
        </section>

        <section className="p-6 rounded-xl app-panel space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Approval Attachments</h3>
          <p className="text-sm text-slate-600">All supporting documents are mandatory prior to review.</p>
          <div className="space-y-3">
            {documentChecklist.map((item) => (
              <div key={item} className="flex items-center gap-4 text-sm text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <span className="flex-1 font-medium">{item}</span>
                <label className="flex-shrink-0">
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFilesChange(e, item)}
                    id={`file-${item}`}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById(`file-${item}`)?.click()}
                    className="btn btn-primary btn-sm"
                  >
                    {files[item] && files[item].length > 0 ? `Add More (${files[item].length})` : 'Add File'}
                  </button>
                </label>
                {files[item] && files[item].length > 0 && (
                  <div className="flex-1 space-y-1">
                    {files[item].map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-600 bg-white p-2 rounded border">
                        <span className="flex-1 truncate">
                          {file.name} ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(item, idx)}
                          className="btn btn-soft-danger btn-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 italic">
            <strong>Note:</strong> Upload files for each document type separately using the "Add File" button beside each item.
            {uploadSettings && (
              <>
                <br />
                <strong>Allowed file types:</strong> {uploadSettings.allowedFileTypes.join(', ').toUpperCase()}
                <br />
                <strong>Maximum file size:</strong> {uploadSettings.maxFileSizeMB}MB per file
              </>
            )}
          </p>
        </section>


        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSubmitForReview}
            disabled={busyAction !== 'idle'}
            className="btn btn-primary disabled:opacity-60"
          >
            {busyAction === 'submit' ? 'Submitting…' : 'Submit for Review'}
          </button>
        </div>
        {status && <p className="text-sm text-slate-600">{status}</p>}
      </form>

      <div className="p-6 rounded-xl app-panel">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Recent Applications</h3>
          {applications.length > 0 && onNavigateToApplications && (
            <button
              type="button"
              onClick={onNavigateToApplications}
              className="btn btn-link text-sm"
            >
              View All →
            </button>
          )}
        </div>
        <div className="space-y-4">
          {applications.slice(0, 5).map((app) => (
            <div
              key={app.id}
              className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
              onClick={() => {
                if (onNavigateToApplications) {
                  onNavigateToApplications();
                }
              }}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{app.department}</p>
                  <p className="text-xl font-semibold text-slate-900">{app.eventTitle}</p>
                  <p className="text-sm text-slate-600">
                    {app.applicationNumber && (
                      <span className="font-mono text-blue-600">#{app.applicationNumber}</span>
                    )}{' '}
                    {app.startDate} → {app.endDate}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${app.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                    app.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                      app.status === 'SUBMITTED' || app.status === 'IN_REVIEW' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                    }`}>
                    {app.status}
                  </span>
                  <p className="text-sm text-slate-600 mt-1">GoN Cost: ${app.totalGonCost.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
          {applications.length === 0 && <p className="text-sm text-slate-500">No applications yet. Submit your first application above.</p>}
        </div>
      </div>
    </div>
  );
};
