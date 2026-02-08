import { Router } from 'express';
import { randomUUID } from 'crypto';
import { authenticate, requireRole, type AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../data/memoryStore.js';
import { applicationService } from '../services/applicationService.js';
import { notificationService } from '../services/notificationService.js';
import { settingsService } from '../services/settingsService.js';
import { emailTemplateService } from '../services/emailTemplateService.js';
import type { TravelApplication } from '../types.js';

const router = Router();
router.use(authenticate, requireRole(['REVIEWER', 'ADMIN']));

router.get('/queue', async (req: AuthenticatedRequest, res) => {
  const submitted = await applicationService.findByStatus('SUBMITTED');
  const inReview = await applicationService.findByStatus('IN_REVIEW');
  const queue = [...submitted, ...inReview];
  return res.json({ queue });
});

router.get('/archived', async (req: AuthenticatedRequest, res) => {
  const archived = await applicationService.findByStatus('ARCHIVED');
  // Sort by archived date, most recent first
  archived.sort((a, b) => {
    const aDate = a.archivedAt ? new Date(a.archivedAt).getTime() : 0;
    const bDate = b.archivedAt ? new Date(b.archivedAt).getTime() : 0;
    return bDate - aDate;
  });
  return res.json({ applications: archived });
});

// When reviewer opens an application, mark it as IN_REVIEW
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const app = await applicationService.findById(id);
  if (!app) {
    return res.status(404).json({ message: 'Application not found' });
  }
  
  // If status is SUBMITTED, change to IN_REVIEW
  if (app.status === 'SUBMITTED') {
    await applicationService.update(id, {
      status: 'IN_REVIEW',
      currentReviewerId: req.user!.id,
    });
    const updated = await applicationService.findById(id);
    return res.json({ application: updated });
  }
  
  return res.json({ application: app });
});

router.post('/:id/decision', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { action, note } = req.body;
  const allowed = ['APPROVED', 'REJECTED', 'REQUEST_INFO', 'REFERRED_TO_MINISTER'];
  if (!allowed.includes(action)) {
    return res.status(400).json({ message: 'Invalid action' });
  }
  
  // For REFERRED_TO_MINISTER, note (email) is required
  if (action === 'REFERRED_TO_MINISTER' && !note) {
    return res.status(400).json({ message: 'Minister email is required for referral' });
  }
  
  const app = await applicationService.findById(id);
  if (!app) {
    return res.status(404).json({ message: 'Application not found' });
  }
  
  const reviewer = req.user!;
  const now = new Date().toISOString();
  
  // Create approval log entry
  const approvalLogEntry = {
    id: randomUUID(),
    action: action as 'APPROVED' | 'REJECTED' | 'REQUEST_INFO' | 'REFERRED_TO_MINISTER',
    actorId: reviewer.id,
    actorName: `${reviewer.firstName} ${reviewer.lastName}`,
    actorEmail: reviewer.email,
    note: note || undefined,
    timestamp: now,
  };
  
  // Get existing approval log or initialize
  const existingLog = (app.approvalLog || []) as any[];
  const updatedLog = [...existingLog, approvalLogEntry];
  
  let statusUpdate: Partial<TravelApplication> = {
    approvalLog: updatedLog as any,
  };
  
  if (action === 'APPROVED') {
    statusUpdate = {
      ...statusUpdate,
      status: 'ARCHIVED',
      decidedAt: now,
      archivedAt: now,
    };
  } else if (action === 'REJECTED') {
    statusUpdate = {
      ...statusUpdate,
      status: 'REJECTED',
      decidedAt: now,
    };
  } else if (action === 'REFERRED_TO_MINISTER') {
    statusUpdate = {
      ...statusUpdate,
      status: 'REFERRED_TO_MINISTER',
      ministerEmail: note, // Store minister email in the application
    };
  } else {
    statusUpdate = {
      ...statusUpdate,
      status: 'IN_REVIEW',
    };
  }
  
  const updated = await applicationService.update(id, statusUpdate);
  
  db.workflow.push({
    id: randomUUID(),
    applicationId: id,
    actorId: reviewer.id,
    action: action === 'APPROVED' ? 'APPROVED' : action === 'REJECTED' ? 'REJECTED' : action === 'REFERRED_TO_MINISTER' ? 'REFERRED_TO_MINISTER' : 'REQUEST_INFO',
    note,
    createdAt: new Date().toISOString(),
  });

  // Send notifications
  try {
    const settings = await settingsService.getSettings();
    
    if (action === 'REFERRED_TO_MINISTER' && note) {
      // Send email to minister
      const ministerTemplate = settings.email.templates.applicationSubmittedReviewer; // Reuse reviewer template
      const ministerSubject = emailTemplateService.replaceVariables(ministerTemplate.subject, { application: updated });
      const ministerBody = emailTemplateService.replaceVariables(ministerTemplate.body, { application: updated });
      
      await notificationService.send({
        to: note, // Minister email from note
        subject: `Travel Application Referred for Review: ${updated.eventTitle}`,
        html: ministerBody,
      }).catch((err) => {
        console.error(`Failed to send referral notification to minister ${note}:`, err);
      });
      
      console.info(`Sent referral notification to minister: ${note}`);
    }
    
    const shouldNotify = 
      (action === 'APPROVED' && settings.email.notifications.applicationApproved) ||
      (action === 'REJECTED' && settings.email.notifications.applicationRejected) ||
      (action === 'REQUEST_INFO' && settings.email.notifications.enabled);

    if (settings.email.notifications.enabled && shouldNotify) {
      let template;
      if (action === 'APPROVED') {
        template = settings.email.templates.applicationApproved;
      } else if (action === 'REJECTED') {
        template = settings.email.templates.applicationRejected;
      } else {
        template = settings.email.templates.informationRequested;
      }

      const subject = emailTemplateService.replaceVariables(template.subject, {
        application: updated,
        reviewer,
        note,
        reason: action === 'REJECTED' ? note : undefined,
      });
      
      const body = emailTemplateService.replaceVariables(template.body, {
        application: updated,
        reviewer,
        note,
        reason: action === 'REJECTED' ? note : undefined,
      });

      await notificationService.send({
        to: updated.requesterEmail,
        subject,
        html: body,
      }).catch((err) => {
        console.error(`Failed to send ${action.toLowerCase()} notification to ${updated.requesterEmail}:`, err);
      });

      console.info(`Sent ${action.toLowerCase()} notification to applicant: ${updated.requesterEmail}`);
    }
  } catch (error) {
    console.error('Error sending decision notification:', error);
    // Don't fail the request if notification fails
  }

  return res.json({ application: updated });
});

export const reviewerRouter = router;
