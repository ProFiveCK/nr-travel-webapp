import { Router } from 'express';
import { randomUUID } from 'crypto';
import argon2 from 'argon2';
import { authenticate, requireRole, type AuthenticatedRequest } from '../middleware/auth.js';
import { userService } from '../services/userService.js';
import { departmentService, departmentProfileService } from '../services/departmentService.js';
import { signupRequestService } from '../services/signupRequestService.js';
import { notificationService } from '../services/notificationService.js';
import { settingsService } from '../services/settingsService.js';
import { applicationService } from '../services/applicationService.js';
import type { DepartmentProfile, SystemSettings } from '../types.js';

const router = Router();
router.use(authenticate, requireRole(['ADMIN']));

router.get('/signup-requests', async (_req, res) => {
  const requests = await signupRequestService.findAll();
  return res.json({ requests });
});

router.get('/users', async (_req, res) => {
  const users = await userService.findAll(false);
  const userList = users.map((u) => {
    // Check if department head and secretary are duplicates
    const isDuplicate =
      (u.departmentHeadName && u.departmentSecretary && u.departmentHeadName === u.departmentSecretary) ||
      (u.departmentHeadEmail && u.departmentSecretaryEmail && u.departmentHeadEmail === u.departmentSecretaryEmail);

    // If duplicate, don't show secretary (it's the same as head)
    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      department: u.department,
      departmentHeadName: u.departmentHeadName,
      departmentHeadEmail: u.departmentHeadEmail,
      departmentHeadCode: u.departmentHeadCode,
      departmentSecretary: isDuplicate ? undefined : u.departmentSecretary,
      departmentSecretaryEmail: isDuplicate ? undefined : u.departmentSecretaryEmail,
      roles: u.roles,
      status: u.status,
      mustChangePassword: u.mustChangePassword || false,
    };
  });
  return res.json({ users: userList });
});

router.get('/users/archived', async (_req, res) => {
  const archivedUsers = await userService.findArchived();
  const userList = archivedUsers.map((u) => {
    // Check if department head and secretary are duplicates
    const isDuplicate =
      (u.departmentHeadName && u.departmentSecretary && u.departmentHeadName === u.departmentSecretary) ||
      (u.departmentHeadEmail && u.departmentSecretaryEmail && u.departmentHeadEmail === u.departmentSecretaryEmail);

    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      department: u.department,
      departmentHeadName: u.departmentHeadName,
      departmentHeadEmail: u.departmentHeadEmail,
      departmentHeadCode: u.departmentHeadCode,
      departmentSecretary: isDuplicate ? undefined : u.departmentSecretary,
      departmentSecretaryEmail: isDuplicate ? undefined : u.departmentSecretaryEmail,
      roles: u.roles,
      status: u.status,
      archivedAt: u.archivedAt,
      archivedBy: u.archivedBy,
    };
  });
  return res.json({ users: userList });
});

router.post('/users/:id/disable', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const adminId = req.user?.email || req.user?.id || 'unknown';

  try {
    const user = await userService.archive(id, adminId);
    return res.json({ message: 'User disabled and archived', user });
  } catch (error: any) {
    if (error.message === 'User not found') {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(500).json({ message: 'Failed to disable user' });
  }
});

router.post('/users/:id/restore', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  try {
    const user = await userService.restore(id);
    return res.json({ message: 'User restored', user });
  } catch (error: any) {
    if (error.message === 'User not found') {
      return res.status(404).json({ message: 'Archived user not found' });
    }
    return res.status(500).json({ message: 'Failed to restore user' });
  }
});

router.post('/signup-requests/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { tempPassword } = req.body;

  const request = await signupRequestService.findById(id);
  if (!request) {
    return res.status(404).json({ message: 'Request not found' });
  }

  await signupRequestService.updateStatus(id, 'APPROVED');

  // Check if there's a department profile for this department code
  const deptProfile = request.departmentHeadCode
    ? await departmentProfileService.findByCode(request.departmentHeadCode)
    : null;

  const existingPending = await userService.findByEmail(request.email.toLowerCase());

  if (existingPending) {
    // Update existing user - preserve original password unless tempPassword is provided
    const updateData: any = {
      status: 'ACTIVE',
      roles: existingPending.roles.includes('USER') ? existingPending.roles : [...existingPending.roles, 'USER'],
      departmentHeadCode: request.departmentHeadCode ?? existingPending.departmentHeadCode,
      departmentHeadName: deptProfile?.headName ?? request.departmentHeadName ?? existingPending.departmentHeadName,
      departmentHeadEmail: deptProfile?.headEmail ?? request.departmentHeadEmail ?? existingPending.departmentHeadEmail,
      departmentSecretary: deptProfile?.secretaryName ?? request.departmentSecretary ?? existingPending.departmentSecretary,
      departmentSecretaryEmail: deptProfile?.secretaryEmail ?? request.departmentSecretaryEmail ?? existingPending.departmentSecretaryEmail,
    };

    // Only update password if tempPassword is explicitly provided
    if (tempPassword) {
      updateData.passwordHash = await argon2.hash(tempPassword);
    }
    // Otherwise, preserve the existing password hash (from registration)

    await userService.update(existingPending.id, updateData);

    return res.json({
      message: 'User approved',
      request,
      passwordChanged: !!tempPassword,
      note: tempPassword
        ? 'Password has been reset to the provided temporary password'
        : 'User can login with their original registration password'
    });
  } else {
    // Create new user - must have a password
    const password = tempPassword ?? 'Welcome123!';
    const passwordHash = await argon2.hash(password);

    await userService.create({
      id: randomUUID(),
      email: request.email.toLowerCase(),
      firstName: request.firstName ?? request.email.split('@')[0],
      lastName: request.lastName ?? '',
      department: request.department,
      departmentHeadCode: request.departmentHeadCode ?? '',
      departmentHeadName: deptProfile?.headName ?? request.departmentHeadName ?? '',
      departmentHeadEmail: deptProfile?.headEmail ?? request.departmentHeadEmail ?? '',
      departmentSecretary: deptProfile?.secretaryName ?? request.departmentSecretary ?? '',
      departmentSecretaryEmail: deptProfile?.secretaryEmail ?? request.departmentSecretaryEmail ?? '',
      passwordHash,
      roles: ['USER'],
      status: 'ACTIVE',
    });

    return res.json({
      message: 'User approved',
      request,
      passwordChanged: true,
      note: tempPassword ? 'Password set to provided temporary password' : 'Default password set to Welcome123!'
    });
  }
});

router.post('/users/:id/role', async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!['USER', 'REVIEWER', 'ADMIN', 'MINISTER'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  try {
    const user = await userService.addRole(id, role as any);
    return res.json({ user });
  } catch (error: any) {
    if (error.message === 'User not found') {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(500).json({ message: 'Failed to update role' });
  }
});

router.put('/users/:id', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { firstName, lastName, roles, resetPassword, newPassword, forceChangeOnLogin } = req.body;

  try {
    const user = await userService.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updates: any = {};

    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;

    if (roles !== undefined && Array.isArray(roles)) {
      // Validate roles
      const validRoles = ['USER', 'REVIEWER', 'ADMIN', 'MINISTER'];
      const invalidRoles = roles.filter((r: string) => !validRoles.includes(r));
      if (invalidRoles.length > 0) {
        return res.status(400).json({ message: `Invalid roles: ${invalidRoles.join(', ')}` });
      }
      updates.roles = roles;
    }

    if (resetPassword === true) {
      const password = newPassword || 'Welcome123!';
      updates.passwordHash = await argon2.hash(password);
      updates.mustChangePassword = forceChangeOnLogin === true;
    }

    const updatedUser = await userService.update(id, updates);

    return res.json({
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        roles: updatedUser.roles,
        mustChangePassword: updatedUser.mustChangePassword,
      },
      tempPassword: resetPassword && !newPassword ? 'Welcome123!' : undefined,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to update user' });
  }
});

router.post('/users/:id/reset-password', async (req, res) => {
  const { id } = req.params;
  const { newPassword, forceChangeOnLogin } = req.body;

  try {
    const user = await userService.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const password = newPassword || 'Welcome123!';
    const passwordHash = await argon2.hash(password);

    await userService.update(id, {
      passwordHash,
      mustChangePassword: forceChangeOnLogin === true,
    });

    return res.json({
      message: 'Password reset successfully',
      user: {
        id: user.id,
        email: user.email,
        mustChangePassword: forceChangeOnLogin === true,
      },
      tempPassword: newPassword ? undefined : password, // Only return if auto-generated
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to reset password' });
  }
});

router.delete('/users/:id', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  try {
    const user = await userService.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Permanently delete the user
    await userService.delete(id);

    return res.json({ message: 'User deleted permanently' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to delete user' });
  }
});

// Department Profiles Management


router.get('/department-profiles', async (_req, res) => {
  const profiles = await departmentProfileService.findAll();
  return res.json({ profiles });
});

router.get('/department-profiles/:code', async (req, res) => {
  const { code } = req.params;
  const profile = await departmentProfileService.findByCode(code);
  if (!profile) {
    return res.status(404).json({ message: 'Department profile not found' });
  }
  return res.json({ profile });
});

router.post('/department-profiles', async (req: AuthenticatedRequest, res) => {
  const { depHead, deptName, headName, headEmail, secretaryName, secretaryEmail } = req.body;

  if (!depHead || !deptName || !headName || !headEmail) {
    return res.status(400).json({ message: 'Department code, name, head name, and head email are required' });
  }

  const userId = req.user?.email || req.user?.id || 'unknown';

  try {
    // Check if profile already exists
    const existing = await departmentProfileService.findByCode(depHead);

    if (existing) {
      // Update existing profile
      const updated = await departmentProfileService.update(depHead, {
        deptName,
        headName,
        headEmail,
        secretaryName: secretaryName || '',
        secretaryEmail: secretaryEmail || '',
        updatedBy: userId,
      });

      // Update all users in this department with the profile info
      const users = await userService.findAll(true);
      for (const user of users) {
        if (user.departmentHeadCode === depHead) {
          await userService.update(user.id, {
            departmentHeadName: headName,
            departmentHeadEmail: headEmail,
            departmentSecretary: secretaryName || '',
            departmentSecretaryEmail: secretaryEmail || '',
          });
        }
      }

      return res.json({ profile: updated, message: 'Department profile updated' });
    } else {
      // Create new profile
      const profile = await departmentProfileService.create({
        depHead,
        deptName,
        headName,
        headEmail,
        secretaryName: secretaryName || '',
        secretaryEmail: secretaryEmail || '',
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      });

      // Update all users in this department with the profile info
      const users = await userService.findAll(true);
      for (const user of users) {
        if (user.departmentHeadCode === depHead) {
          await userService.update(user.id, {
            departmentHeadName: headName,
            departmentHeadEmail: headEmail,
            departmentSecretary: secretaryName || '',
            departmentSecretaryEmail: secretaryEmail || '',
          });
        }
      }

      return res.status(201).json({ profile, message: 'Department profile created' });
    }
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to save department profile' });
  }
});

router.put('/department-profiles/:code', async (req: AuthenticatedRequest, res) => {
  const { code } = req.params;
  const { deptName, headName, headEmail, secretaryName, secretaryEmail } = req.body;

  const userId = req.user?.email || req.user?.id || 'unknown';

  try {
    const profile = await departmentProfileService.update(code, {
      deptName,
      headName,
      headEmail,
      secretaryName: secretaryName !== undefined ? secretaryName : undefined,
      secretaryEmail: secretaryEmail !== undefined ? secretaryEmail : undefined,
      updatedBy: userId,
    });

    // Update all users in this department with the profile info
    const users = await userService.findAll(true);
    for (const user of users) {
      if (user.departmentHeadCode === code) {
        await userService.update(user.id, {
          departmentHeadName: profile.headName,
          departmentHeadEmail: profile.headEmail,
          departmentSecretary: profile.secretaryName || '',
          departmentSecretaryEmail: profile.secretaryEmail || '',
        });
      }
    }

    return res.json({ profile, message: 'Department profile updated' });
  } catch (error: any) {
    if (error.message === 'Department profile not found') {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    return res.status(500).json({ message: 'Failed to update department profile' });
  }
});

router.delete('/department-profiles/:code', async (req, res) => {
  const { code } = req.params;

  try {
    await departmentProfileService.delete(code);
    return res.json({ message: 'Department profile deleted' });
  } catch (error: any) {
    if (error.message === 'Department profile not found') {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    return res.status(500).json({ message: 'Failed to delete department profile' });
  }
});

// Departments Management (the master list)
router.get('/departments', async (_req, res) => {
  const departments = await departmentService.findAll();
  return res.json({ departments });
});

router.post('/departments', async (req: AuthenticatedRequest, res) => {
  const { depHead, deptName } = req.body;
  if (!depHead || !deptName) {
    return res.status(400).json({ message: 'Department code and name are required' });
  }

  try {
    const department = await departmentService.create({ depHead, deptName });
    return res.status(201).json({ department, message: 'Department added' });
  } catch (error: any) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ message: 'Department with this code already exists' });
    }
    return res.status(500).json({ message: 'Failed to create department' });
  }
});

router.put('/departments/:code', async (req, res) => {
  const { code } = req.params;
  const { deptName } = req.body;
  if (!deptName) {
    return res.status(400).json({ message: 'Department name is required' });
  }

  try {
    const department = await departmentService.update(code, deptName);
    return res.json({ department, message: 'Department updated' });
  } catch (error: any) {
    if (error.message === 'Department not found') {
      return res.status(404).json({ message: 'Department not found' });
    }
    return res.status(500).json({ message: 'Failed to update department' });
  }
});

router.delete('/departments/:code', async (req, res) => {
  const { code } = req.params;

  try {
    await departmentService.delete(code);
    return res.json({ message: 'Department deleted' });
  } catch (error: any) {
    if (error.message === 'Department not found') {
      return res.status(404).json({ message: 'Department not found' });
    }
    return res.status(500).json({ message: 'Failed to delete department' });
  }
});

// Settings Management Endpoints
router.get('/settings', async (_req, res) => {
  try {
    const settings = await settingsService.getSettings();
    // Return settings with password masked
    const response = { ...settings };
    response.email.smtp.password = response.email.smtp.password ? '***MASKED***' : '';
    return res.json({ settings: response });
  } catch (error) {
    console.error('Error getting settings:', error);
    return res.status(500).json({ message: 'Failed to load settings' });
  }
});

router.put('/settings', async (req: AuthenticatedRequest, res) => {
  try {
    const updates = req.body as Partial<SystemSettings>;
    const userId = req.user?.email || req.user?.id || 'unknown';

    const updatedSettings = await settingsService.updateSettings(updates, userId);

    // Return updated settings with password masked
    const response = { ...updatedSettings };
    response.email.smtp.password = response.email.smtp.password ? '***MASKED***' : '';
    return res.json({ settings: response, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    return res.status(500).json({ message: 'Failed to update settings' });
  }
});

router.post('/settings/test-email', async (req, res) => {
  const { testEmail } = req.body;
  if (!testEmail || !testEmail.includes('@')) {
    return res.status(400).json({ message: 'Valid test email address is required' });
  }

  try {
    const settings = await settingsService.getSettings();

    // Use current settings to send test email
    await notificationService.send({
      to: testEmail,
      subject: 'Test Email - Travel Application System',
      html: `
        <h2>Test Email</h2>
        <p>This is a test email from the Travel Application Management System.</p>
        <p>If you received this email, your SMTP configuration is working correctly.</p>
        <p><strong>SMTP Host:</strong> ${settings.email.smtp.host}</p>
        <p><strong>From:</strong> ${settings.email.smtp.from}</p>
        <p><strong>Reply-To:</strong> ${settings.email.smtp.replyTo}</p>
        <p><em>Sent at: ${new Date().toISOString()}</em></p>
      `,
      replyTo: settings.email.smtp.replyTo,
    });
    return res.json({ message: 'Test email sent successfully', success: true });
  } catch (error) {
    console.error('Test email error:', error);
    return res.status(500).json({
      message: 'Failed to send test email. Please check your SMTP configuration.',
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    });
  }
});

// Delete application (admin only)
router.delete('/applications/:id', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  try {
    const app = await applicationService.findById(id);
    if (!app) {
      return res.status(404).json({ message: 'Application not found' });
    }

    await applicationService.delete(id);
    return res.json({ message: 'Application deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to delete application' });
  }
});

// Fix user duplication: Clear secretary fields if they match head fields
router.post('/users/fix-duplication', async (req: AuthenticatedRequest, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const user = await userService.findByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if department head and secretary are duplicates
    const isDuplicate =
      (user.departmentHeadName && user.departmentSecretary && user.departmentHeadName === user.departmentSecretary) ||
      (user.departmentHeadEmail && user.departmentSecretaryEmail && user.departmentHeadEmail === user.departmentSecretaryEmail);

    if (isDuplicate) {
      // Clear secretary fields
      await userService.update(user.id, {
        departmentSecretary: '',
        departmentSecretaryEmail: '',
      });
      const updatedUser = await userService.findById(user.id);
      return res.json({
        message: 'Duplication fixed. Secretary fields cleared.',
        user: updatedUser
      });
    } else {
      return res.json({
        message: 'No duplication found. Head and Secretary are different.',
        user
      });
    }
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to fix duplication' });
  }
});

export const adminRouter = router;
