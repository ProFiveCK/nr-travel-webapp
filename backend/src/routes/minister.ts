import { Router } from 'express';
import { randomUUID } from 'crypto';
import { authenticate, requireRole, type AuthenticatedRequest } from '../middleware/auth.js';
import { applicationService } from '../services/applicationService.js';
import { notificationService } from '../services/notificationService.js';
import { settingsService } from '../services/settingsService.js';
import { emailTemplateService } from '../services/emailTemplateService.js';
import type { TravelApplication } from '../types.js';

const router = Router();
router.use(authenticate, requireRole(['MINISTER', 'ADMIN']));

// Get applications pending minister approval
router.get('/queue', async (req: AuthenticatedRequest, res) => {
    const pending = await applicationService.findByStatus('PENDING_MINISTER_APPROVAL');
    const referred = await applicationService.findByStatus('REFERRED_TO_MINISTER');
    const queue = [...pending, ...referred];
    return res.json({ queue });
});

// Get applications archived/decided by this minister
router.get('/archived', async (req: AuthenticatedRequest, res) => {
    const ministerId = req.user?.id;
    if (!ministerId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const applications = await applicationService.findByApproverId(ministerId);
    return res.json({ applications });
});

// Minister decision on an application
router.post('/:id/decision', async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { action, note } = req.body;
    const allowed = ['MINISTER_APPROVED', 'MINISTER_REJECTED'];

    if (!allowed.includes(action)) {
        return res.status(400).json({ message: 'Invalid action' });
    }

    const app = await applicationService.findById(id);
    if (!app) {
        return res.status(404).json({ message: 'Application not found' });
    }

    // Verify application is in correct status
    if (app.status !== 'PENDING_MINISTER_APPROVAL' && app.status !== 'REFERRED_TO_MINISTER') {
        return res.status(400).json({
            message: 'Application is not pending minister approval'
        });
    }

    const minister = req.user!;
    const now = new Date().toISOString();

    // Create approval log entry
    const approvalLogEntry = {
        id: randomUUID(),
        action: action as 'MINISTER_APPROVED' | 'MINISTER_REJECTED',
        actorId: minister.id,
        actorName: `${minister.firstName} ${minister.lastName}`,
        actorEmail: minister.email,
        note: note || undefined,
        timestamp: now,
    };

    // Get existing approval log
    const existingLog = (app.approvalLog || []) as any[];
    const updatedLog = [...existingLog, approvalLogEntry];

    let statusUpdate: Partial<TravelApplication> = {
        approvalLog: updatedLog as any,
    };

    if (action === 'MINISTER_APPROVED') {
        statusUpdate = {
            ...statusUpdate,
            status: 'ARCHIVED',
            decidedAt: now,
            archivedAt: now,
        };
    } else if (action === 'MINISTER_REJECTED') {
        statusUpdate = {
            ...statusUpdate,
            status: 'REJECTED',
            decidedAt: now,
        };
    }

    const updated = await applicationService.update(id, statusUpdate);

    // Send notifications
    try {
        const settings = await settingsService.getSettings();

        const shouldNotify =
            (action === 'MINISTER_APPROVED' && settings.email.notifications.applicationApproved) ||
            (action === 'MINISTER_REJECTED' && settings.email.notifications.applicationRejected);

        if (settings.email.notifications.enabled && shouldNotify) {
            let template;
            if (action === 'MINISTER_APPROVED') {
                template = settings.email.templates.applicationApproved;
            } else {
                template = settings.email.templates.applicationRejected;
            }

            const subject = emailTemplateService.replaceVariables(template.subject, {
                application: updated,
                reviewer: minister,
                note,
                reason: action === 'MINISTER_REJECTED' ? note : undefined,
            });

            const body = emailTemplateService.replaceVariables(template.body, {
                application: updated,
                reviewer: minister,
                note,
                reason: action === 'MINISTER_REJECTED' ? note : undefined,
            });

            await notificationService.send({
                to: updated.requesterEmail,
                subject,
                html: body,
            }).catch((err) => {
                console.error(`Failed to send minister decision notification to ${updated.requesterEmail}:`, err);
            });

            console.info(`Sent minister ${action.toLowerCase()} notification to applicant: ${updated.requesterEmail}`);
        }
    } catch (error) {
        console.error('Error sending minister decision notification:', error);
        // Don't fail the request if notification fails
    }

    return res.json({ application: updated });
});

export const ministerRouter = router;
