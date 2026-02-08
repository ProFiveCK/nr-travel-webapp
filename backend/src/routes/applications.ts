import { Router } from 'express';
import { randomUUID } from 'crypto';
import multer from 'multer';
import { authenticate, requireRole, type AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../data/memoryStore.js';
import { dbPool } from '../services/database.js';
import { userService } from '../services/userService.js';
import { applicationService } from '../services/applicationService.js';
import { attachmentService } from '../services/attachmentService.js';
import { storageService } from '../services/storageService.js';
import { notificationService } from '../services/notificationService.js';
import { settingsService } from '../services/settingsService.js';
import { emailTemplateService } from '../services/emailTemplateService.js';
import { departmentService } from '../services/departmentService.js';
import { config } from '../config.js';
import type { ExpenseRow, Traveller } from '../types.js';

const router = Router();

// Base multer instance (file size will be validated in route handler)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // Large limit, actual validation in handler
});

router.use(authenticate);

const canAccessApplication = (user: AuthenticatedRequest['user'], applicationRequesterId: string) => {
  if (!user) return false;
  return (
    user.id === applicationRequesterId ||
    user.roles.includes('ADMIN') ||
    user.roles.includes('REVIEWER')
  );
};

router.get('/', async (req: AuthenticatedRequest, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    console.log(`[Applications] Fetching applications for user: ${req.user.id} (${req.user.email})`);
    const applications = await applicationService.findByRequesterId(req.user.id);
    console.log(`[Applications] Found ${applications.length} application(s) for user ${req.user.id}`);
    return res.json({ applications });
  } catch (error: any) {
    console.error('Error fetching applications:', error);
    return res.status(500).json({ message: 'Failed to fetch applications', error: error.message });
  }
});

// Get expense types (public endpoint for form)
router.get('/expense-types', authenticate, async (_req, res) => {
  console.log('[DEBUG] Hit GET /expense-types');
  try {
    const settings = await settingsService.getSettings();
    const expenseTypes = settings.application?.expenseTypes || ['Airfare', 'Accommodation', 'Meals', 'Transportation', 'Registration Fee', 'Visa', 'Insurance', 'Other'];
    return res.json({ expenseTypes });
  } catch (error: any) {
    console.error('Error fetching expense types:', error);
    // Return defaults on error
    return res.json({ expenseTypes: ['Airfare', 'Accommodation', 'Meals', 'Transportation', 'Registration Fee', 'Visa', 'Insurance', 'Other'] });
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  console.log(`[DEBUG] Hit GET /:id with id=${id}`);
  try {
    const application = await applicationService.findById(id);
    if (!application || !canAccessApplication(req.user, application.requesterId)) {
      console.log(`[DEBUG] Application not found or access denied for id=${id}`);
      return res.status(404).json({ message: 'Application not found' });
    }
    return res.json({ application });
  } catch (error: any) {
    console.error('Error fetching application:', error);
    return res.status(500).json({ message: 'Failed to fetch application', error: error.message });
  }
});

const normalizeTravellers = (list: unknown): Traveller[] => {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return { name: '', role: '' };
      }
      const entry = item as { name?: string; role?: string };
      return {
        name: typeof entry.name === 'string' ? entry.name : '',
        role: typeof entry.role === 'string' ? entry.role : '',
      };
    })
    .filter((traveller) => traveller.name.trim().length > 0);
};

const normalizeExpenses = (list: unknown): ExpenseRow[] => {
  if (!Array.isArray(list)) return [];
  return list.map((item) => {
    if (!item || typeof item !== 'object') {
      return {
        expenseType: '',
        details: '',
        costPerPerson: 0,
        personsOrDays: 0,
        totalCost: 0,
        donorFunding: '',
        gonCost: 0,
      };
    }
    const entry = item as {
      expenseType?: string;
      details?: string;
      costPerPerson?: number | string;
      personsOrDays?: number | string;
      totalCost?: number | string;
      donorFunding?: string;
      gonCost?: number | string;
    };
    return {
      expenseType: typeof entry.expenseType === 'string' ? entry.expenseType : '',
      details: typeof entry.details === 'string' ? entry.details : '',
      costPerPerson: Number(entry.costPerPerson ?? 0),
      personsOrDays: Number(entry.personsOrDays ?? 0),
      totalCost: Number(entry.totalCost ?? 0),
      donorFunding: entry.donorFunding === 'Yes' || entry.donorFunding === 'No' ? entry.donorFunding : '',
      gonCost: Number(entry.gonCost ?? 0),
    };
  });
};

const calculateDuration = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.valueOf()) || Number.isNaN(endDate.valueOf())) {
    return 0;
  }
  const diff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff + 1 : 0;
};

router.post('/', async (req: AuthenticatedRequest, res) => {
  const {
    department,
    division,
    headOfDepartment,
    headOfDepartmentEmail,
    eventTitle,
    reasonForParticipation,
    startDate,
    endDate,
    numberOfTravellers,
    travellers,
    expenses,
    attachmentsProvided,
    hodEmail,
    ministerName,
    ministerEmail,
    requesterEmail,
    requesterFirstName,
    requesterLastName,
    phoneNumber,
  } = req.body;

  if (!department || !eventTitle || !startDate || !endDate) {
    return res.status(400).json({ message: 'Department, event title, and travel dates are required' });
  }

  // Validate required fields
  if (!ministerName || !ministerName.trim()) {
    return res.status(400).json({ message: 'Minister Name is required' });
  }
  if (!ministerEmail || !ministerEmail.trim()) {
    return res.status(400).json({ message: 'Minister Email is required' });
  }
  if (!hodEmail || !hodEmail.trim()) {
    return res.status(400).json({ message: 'Head of Department Email is required' });
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(ministerEmail)) {
    return res.status(400).json({ message: 'Invalid Minister Email format' });
  }
  if (!emailRegex.test(hodEmail)) {
    return res.status(400).json({ message: 'Invalid Head of Department Email format' });
  }

  const normalizedTravellers = normalizeTravellers(travellers);
  const normalizedExpenses = normalizeExpenses(expenses);
  const totalGonCost = normalizedExpenses.reduce((sum, row) => sum + Number(row.gonCost ?? 0), 0);
  const durationDays = calculateDuration(startDate, endDate);
  const attachments = Array.isArray(attachmentsProvided)
    ? attachmentsProvided.filter((item): item is string => typeof item === 'string')
    : [];
  const travellersCount = Number(numberOfTravellers ?? normalizedTravellers.length ?? 0);

  // Get department code from user or department profile
  let departmentCode = '00';
  if (req.user?.departmentHeadCode) {
    departmentCode = req.user.departmentHeadCode;
  } else if (headOfDepartment) {
    // Try to find department by head name or code
    const dept = await departmentService.findByCode(headOfDepartment);
    if (dept) {
      departmentCode = dept.depHead;
    }
  }

  // Check if this is a submission (status will be SUBMITTED) or draft creation
  const isSubmission = req.body.status === 'SUBMITTED' || req.body.submit === true;

  console.log(`[Applications] Creating application for user: ${req.user!.id} (${req.user!.email})`);
  const application = await applicationService.create({
    requesterId: req.user!.id,
    department,
    division: division ?? '',
    headOfDepartment: headOfDepartment ?? '',
    headOfDepartmentEmail: headOfDepartmentEmail ?? '',
    departmentHeadCode: departmentCode,
    eventTitle,
    reasonForParticipation: reasonForParticipation ?? '',
    startDate,
    endDate,
    durationDays,
    numberOfTravellers: Number.isNaN(travellersCount) ? 0 : travellersCount,
    travellers: normalizedTravellers,
    expenses: normalizedExpenses,
    attachmentsProvided: attachments,
    totalGonCost,
    hodEmail: hodEmail ?? '',
    ministerName: ministerName ?? '',
    ministerEmail: ministerEmail ?? '',
    requesterEmail: requesterEmail ?? req.user!.email,
    requesterFirstName: requesterFirstName ?? req.user!.firstName,
    requesterLastName: requesterLastName ?? req.user!.lastName,
    phoneNumber: phoneNumber ?? '',
    status: isSubmission ? 'SUBMITTED' : 'DRAFT',
    submittedAt: isSubmission ? new Date().toISOString() : undefined,
  });

  // If this is a submission, trigger the submit workflow
  if (isSubmission) {
    try {
      const settings = await settingsService.getSettings();
      const updated = await applicationService.update(application.id, {
        status: 'SUBMITTED',
        submittedAt: new Date().toISOString(),
      });

      // Send notifications (same logic as submit endpoint)
      if (settings.email.notifications.enabled && settings.email.notifications.applicationSubmitted) {
        if (settings.email.notifications.notifyApplicantOnSubmission) {
          const applicantTemplate = settings.email.templates.applicationSubmitted;
          const applicantSubject = emailTemplateService.replaceVariables(applicantTemplate.subject, { application: updated });
          const applicantBody = emailTemplateService.replaceVariables(applicantTemplate.body, { application: updated });

          notificationService.send({
            to: updated.requesterEmail,
            subject: applicantSubject,
            html: applicantBody,
          }).catch((err) => {
            console.error(`Failed to send notification to applicant ${updated.requesterEmail}:`, err);
          });
        }

        const allUsers = await userService.findAll(true);
        const reviewers = allUsers.filter((user) =>
          user.roles.includes('REVIEWER') || user.roles.includes('ADMIN')
        );

        for (const reviewer of reviewers) {
          const reviewerTemplate = settings.email.templates.applicationSubmitted;
          const reviewerSubject = emailTemplateService.replaceVariables(reviewerTemplate.subject, { application: updated });
          const reviewerBody = emailTemplateService.replaceVariables(reviewerTemplate.body, { application: updated });

          notificationService.send({
            to: reviewer.email,
            subject: reviewerSubject,
            html: reviewerBody,
          }).catch((err) => {
            console.error(`Failed to send notification to reviewer ${reviewer.email}:`, err);
          });
        }
      }

      return res.status(201).json({ application: updated });
    } catch (error: any) {
      console.error('Error during submission:', error);
      // Still return the application even if notification fails
      return res.status(201).json({ application });
    }
  }

  return res.status(201).json({ application });
});

router.post('/:id/submit', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const application = await applicationService.findById(id);
  if (!application || application.requesterId !== req.user?.id) {
    return res.status(404).json({ message: 'Application not found' });
  }

  const updated = await applicationService.update(id, {
    status: 'SUBMITTED',
    submittedAt: new Date().toISOString(),
  });

  // Send notifications
  try {
    const settings = await settingsService.getSettings();
    console.log('Notification settings:', {
      enabled: settings.email.notifications.enabled,
      applicationSubmitted: settings.email.notifications.applicationSubmitted,
      notifyApplicantOnSubmission: settings.email.notifications.notifyApplicantOnSubmission,
      smtpConfigured: !!settings.email.smtp.host && !!settings.email.smtp.username,
    });

    if (settings.email.notifications.enabled && settings.email.notifications.applicationSubmitted) {
      // Send notification to applicant
      if (settings.email.notifications.notifyApplicantOnSubmission) {
        const applicantTemplate = settings.email.templates.applicationSubmitted;
        const applicantSubject = emailTemplateService.replaceVariables(applicantTemplate.subject, { application: updated });
        const applicantBody = emailTemplateService.replaceVariables(applicantTemplate.body, { application: updated });

        notificationService.send({
          to: updated.requesterEmail,
          subject: applicantSubject,
          html: applicantBody,
        }).catch((err) => {
          console.error(`Failed to send notification to applicant ${updated.requesterEmail}:`, err);
        });
        console.info(`Sent submission confirmation to applicant: ${updated.requesterEmail}`);
      }

      // Get all reviewers
      const allUsers = await userService.findAll(true);
      const reviewers = allUsers.filter((user) =>
        user.roles.includes('REVIEWER') || user.roles.includes('ADMIN')
      );

      console.log(`Found ${reviewers.length} reviewer(s) to notify`);

      // Send notification to each reviewer using template with application link
      const reviewerTemplate = settings.email.templates.applicationSubmittedReviewer;
      const reviewerSubject = emailTemplateService.replaceVariables(reviewerTemplate.subject, { application: updated });
      let reviewerBody = emailTemplateService.replaceVariables(reviewerTemplate.body, { application: updated });

      // Ensure the reviewer email includes a link to review the application
      const reviewLink = `${config.clientUrl}/#/reviewer`;
      if (!reviewerBody.includes('href=') || !reviewerBody.includes(reviewLink)) {
        // Add review link if not already present
        reviewerBody = reviewerBody.replace(
          /(Please log in to the system to review this application\.)/i,
          `$1<br><br><div style="text-align: center;"><a href="${reviewLink}" style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 5px;">Review Application</a></div>`
        );
      }

      const notificationPromises = reviewers.map((reviewer) =>
        notificationService.send({
          to: reviewer.email,
          subject: reviewerSubject,
          html: reviewerBody,
        }).catch((err) => {
          console.error(`Failed to send notification to ${reviewer.email}:`, err);
          return null;
        })
      );

      const results = await Promise.allSettled(notificationPromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      console.info(`Sent submission notifications to ${successCount} of ${reviewers.length} reviewer(s)`);
    } else {
      console.info('Notifications disabled or not configured for application submissions');
    }
  } catch (error) {
    console.error('Error sending submission notifications:', error);
    // Don't fail the request if notification fails
  }

  return res.json({ application: updated });
});

router.get('/:id/attachments', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const application = await applicationService.findById(id);
  if (!application || !canAccessApplication(req.user, application.requesterId)) {
    return res.status(404).json({ message: 'Application not found' });
  }
  try {
    const attachments = await attachmentService.findByApplicationId(id);
    const attachmentsWithUrls = attachments.map((att) => ({
      ...att,
      downloadUrl: `/uploads/${encodeURIComponent(att.fileName)}`,
    }));
    return res.json({ attachments: attachmentsWithUrls });
  } catch (error: any) {
    console.error('Error fetching attachments:', error);
    return res.status(500).json({ message: 'Failed to fetch attachments', error: error.message });
  }
});

router.post('/:id/attachments', upload.single('file'), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const application = await applicationService.findById(id);
    if (!application || !canAccessApplication(req.user, application.requesterId)) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Allow file uploads for: DRAFT, SUBMITTED, IN_REVIEW, REJECTED (so users can resubmit)
    const allowedStatuses = ['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'REJECTED'];
    if (!allowedStatuses.includes(application.status)) {
      return res.status(400).json({
        message: `Cannot add attachments to applications with status: ${application.status}`
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }

    // Get settings for validation
    const settings = await settingsService.getSettings();
    const maxFileSize = settings.uploads.maxFileSizeMB * 1024 * 1024;
    const allowedTypes = settings.uploads.allowedFileTypes.map(ext => ext.toLowerCase().replace('.', ''));

    // Validate file size
    if (req.file.size > maxFileSize) {
      return res.status(400).json({
        message: `File size exceeds maximum allowed size of ${settings.uploads.maxFileSizeMB}MB`
      });
    }

    // Validate file type
    const fileExt = req.file.originalname.split('.').pop()?.toLowerCase();
    if (!fileExt) {
      return res.status(400).json({ message: 'File must have an extension' });
    }

    if (!allowedTypes.includes(fileExt)) {
      return res.status(400).json({
        message: `File type .${fileExt} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
      });
    }

    const stored = await storageService.saveLocalFile({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      applicationNumber: application.applicationNumber,
    });

    const attachment = await attachmentService.create({
      applicationId: id,
      fileName: stored.fileName, // Use the safe filename from storage
      mimeType: stored.mimeType,
      size: req.file.size,
      storagePath: stored.storagePath,
      uploadedBy: req.user!.id,
      uploadedAt: new Date().toISOString(),
      attachmentType: req.body.attachmentType || undefined,
    });

    return res.status(201).json({ attachment });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

router.post('/:id/resubmit', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const application = await applicationService.findById(id);

  if (!application || application.requesterId !== req.user?.id) {
    return res.status(404).json({ message: 'Application not found' });
  }

  if (application.status !== 'REJECTED') {
    return res.status(400).json({ message: 'Only rejected applications can be resubmitted' });
  }

  // Update status back to SUBMITTED
  // First clear decidedAt, then update status
  await dbPool.query(
    'UPDATE applications SET decided_at = NULL WHERE id = $1',
    [id]
  );
  const updated = await applicationService.update(id, {
    status: 'SUBMITTED',
    submittedAt: new Date().toISOString(),
  });

  // Add to approval log
  await applicationService.addApprovalLogEntry(id, {
    actorId: req.user.id,
    action: 'SUBMITTED',
    note: 'Application resubmitted by user',
    createdAt: new Date().toISOString(),
  });

  // Send notifications (same as initial submission)
  try {
    const settings = await settingsService.getSettings();
    if (settings.email.notifications.enabled && settings.email.notifications.applicationSubmitted) {
      const allUsers = await userService.findAll(true);
      const reviewers = allUsers.filter((user) =>
        user.roles.includes('REVIEWER') || user.roles.includes('ADMIN')
      );

      for (const reviewer of reviewers) {
        const reviewerTemplate = settings.email.templates.applicationSubmitted;
        const reviewerSubject = emailTemplateService.replaceVariables(reviewerTemplate.subject, { application: updated });
        const reviewerBody = emailTemplateService.replaceVariables(reviewerTemplate.body, { application: updated });

        notificationService.send({
          to: reviewer.email,
          subject: reviewerSubject,
          html: reviewerBody,
        }).catch((err) => {
          console.error(`Failed to send notification to reviewer ${reviewer.email}:`, err);
        });
      }
    }
  } catch (error) {
    console.error('Error sending resubmission notifications:', error);
  }

  return res.json({ application: updated, message: 'Application resubmitted successfully' });
});

router.get('/archive/all', requireRole(['ADMIN', 'REVIEWER']), async (_req, res) => {
  try {
    // Get both ARCHIVED and REJECTED applications for admin to manage
    const archived = await applicationService.findByStatus('ARCHIVED');
    const rejected = await applicationService.findByStatus('REJECTED');
    const allArchived = [...archived, ...rejected].sort((a, b) => {
      const dateA = a.decidedAt || a.submittedAt || '';
      const dateB = b.decidedAt || b.submittedAt || '';
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
    return res.json({ applications: allArchived });
  } catch (error: any) {
    console.error('Error fetching archived applications:', error);
    return res.status(500).json({ message: 'Failed to fetch archived applications', error: error.message });
  }
});

export const applicationRouter = router;
