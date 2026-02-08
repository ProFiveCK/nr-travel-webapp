import { Router } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { departmentService, departmentProfileService } from '../services/departmentService.js';
import { userService } from '../services/userService.js';
import { signupRequestService } from '../services/signupRequestService.js';
import { dbPool } from '../services/database.js';
import { config } from '../config.js';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.js';
import { ldapService } from '../services/ldapService.js';
import { settingsService } from '../services/settingsService.js';
import type { Role } from '../types.js';

const router = Router();

const issueToken = (userId: string, secret: string, expiresIn: string) =>
  jwt.sign({ userId }, secret, { expiresIn } as SignOptions);

// Get list of departments (public endpoint for signup form)
router.get('/departments', async (_req, res) => {
  const departments = await departmentService.findAll();
  return res.json({ departments });
});

// Get list of ministers (public endpoint for application form)
router.get('/ministers', async (_req, res) => {
  const ministers = await userService.findByRole('MINISTER');
  // Return only necessary info
  const sanitizedMinisters = ministers.map(m => ({
    id: m.id,
    name: `${m.firstName} ${m.lastName}`,
    email: m.email
  }));
  return res.json({ ministers: sanitizedMinisters });
});

// Get department profiles (public endpoint for application form auto-fill)
router.get('/department-profiles', async (_req, res) => {
  const profiles = await departmentProfileService.findAll();
  return res.json({ profiles });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  let user = await userService.findByEmail(email.toLowerCase());
  let authenticated = false;
  let isLdapUser = false;

  // 1. Try LDAP if enabled
  try {
    const settings = await settingsService.getSettings();
    if (settings.ldap?.enabled) {
      // Extract username from email (assuming email is used for login but LDAP might need username)
      // Or use the whole email if LDAP uses email as UID.
      // For now, let's try using the part before @ if it's an email, or the whole string.
      const username = email.includes('@') ? email.split('@')[0] : email;

      // Try to authenticate with LDAP
      const ldapSuccess = await ldapService.authenticate(username, password);

      if (ldapSuccess) {
        authenticated = true;
        isLdapUser = true;

        // Sync user: if user doesn't exist, create them. If exists, update?
        if (!user) {
          // Create new user from LDAP
          // We might need more info from LDAP (First/Last Name), but for now use placeholders or extract from email
          const id = randomUUID();
          await userService.create({
            id,
            email: email.toLowerCase(),
            firstName: username, // Placeholder
            lastName: '(LDAP)', // Placeholder
            department: '', // Needs to be set manually or mapped
            passwordHash: '', // No local password
            roles: ['USER'],
            status: 'ACTIVE',
          });
          user = await userService.findById(id);
        } else {
          // If user exists but was archived, we might want to check that.
          // But if LDAP says yes, we generally trust it.
          // However, we still respect local status if it's explicitly ARCHIVED/SUSPENDED.
        }
      }
    }
  } catch (error) {
    console.error('LDAP login error:', error);
    // Fallback to local
  }

  // 2. If not authenticated via LDAP, try local
  if (!authenticated) {
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    // If user has no password hash (LDAP only user) and LDAP failed/disabled, then fail.
    if (!user.passwordHash && !isLdapUser) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.passwordHash) {
      const ok = await argon2.verify(user.passwordHash, password);
      if (ok) authenticated = true;
    }
  }

  if (!authenticated || !user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  if (user.status === 'ARCHIVED') {
    return res.status(403).json({ message: 'Account has been disabled. Please contact an administrator.' });
  }
  if (user.status !== 'ACTIVE') {
    return res.status(403).json({ message: 'Account not active' });
  }

  const accessToken = issueToken(user.id, config.jwtSecret, '24h');
  const refreshToken = issueToken(user.id, config.refreshSecret, '30d');
  return res.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      department: user.department,
      roles: user.roles,
      mustChangePassword: user.mustChangePassword || false,
    },
    tokens: { accessToken, refreshToken },
  });
});

router.post('/signup-request', async (req, res) => {
  const { email, department, justification } = req.body;
  if (!email || !department || !justification) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  const exists = await signupRequestService.findByEmail(email);
  if (exists) {
    return res.status(409).json({ message: 'Request already submitted' });
  }
  const request = await signupRequestService.create({
    id: randomUUID(),
    email,
    department,
    justification,
    status: 'PENDING',
    requestedAt: new Date(),
  });
  return res.status(201).json({ message: 'Signup request submitted', request });
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token required' });
  }
  try {
    const payload = jwt.verify(refreshToken, config.refreshSecret) as { userId: string };
    const user = await userService.findById(payload.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    if (user.status === 'ARCHIVED' || user.status !== 'ACTIVE') {
      return res.status(403).json({ message: 'Account not active' });
    }
    // Issue new tokens with extended expiration
    const accessToken = issueToken(user.id, config.jwtSecret, '24h');
    const newRefreshToken = issueToken(user.id, config.refreshSecret, '30d');
    return res.json({
      tokens: { accessToken, refreshToken: newRefreshToken },
    });
  } catch (error) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
});

router.get('/me', authenticate, (req: AuthenticatedRequest, res) => {
  return res.json({ user: req.user });
});

router.post('/change-password', authenticate, async (req: AuthenticatedRequest, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword) {
    return res.status(400).json({ message: 'New password is required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters' });
  }

  const user = await userService.findById(req.user?.id || '');
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Verify current password (unless it's a forced change)
  if (!user.mustChangePassword) {
    if (!currentPassword) {
      return res.status(400).json({ message: 'Current password is required' });
    }
    const ok = await argon2.verify(user.passwordHash, currentPassword);
    if (!ok) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
  }

  // Update password
  const passwordHash = await argon2.hash(newPassword);
  await userService.update(user.id, {
    passwordHash,
    mustChangePassword: false,
  });

  return res.json({ message: 'Password changed successfully' });
});

router.post('/register', async (req, res) => {
  const { email, password, fullName, departmentHead, department } = req.body;
  if (!email || !password || !fullName || !departmentHead) {
    return res.status(400).json({ message: 'Email, password, full name, and Department are required' });
  }
  const exists = await userService.findByEmail(email.toLowerCase());
  if (exists) {
    return res.status(409).json({ message: 'User already exists' });
  }
  const passwordHash = await argon2.hash(password);
  // Find the department name if not provided
  const dept = await departmentService.findByCode(departmentHead);
  const departmentName = department || dept?.deptName || '';

  const nameParts = fullName.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Create signup request
  await signupRequestService.create({
    id: randomUUID(),
    email: email.toLowerCase(),
    department: departmentName,
    departmentHeadName: '',
    departmentHeadEmail: '',
    departmentHeadCode: departmentHead,
    departmentSecretary: '',
    departmentSecretaryEmail: '',
    justification: 'Self-registration',
    firstName,
    lastName,
    status: 'PENDING',
    requestedAt: new Date(),
  });

  // Create pending user record
  await userService.create({
    id: randomUUID(),
    email: email.toLowerCase(),
    firstName,
    lastName,
    department: departmentName,
    departmentHeadName: '',
    departmentHeadEmail: '',
    departmentHeadCode: departmentHead,
    departmentSecretary: '',
    departmentSecretaryEmail: '',
    passwordHash,
    roles: ['USER'] as Role[],
    status: 'PENDING',
  });

  return res.status(201).json({ message: 'Registration submitted for approval by admin.' });
});

export const authRouter = router;

// Password Reset Request
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const user = await userService.findByEmail(email.toLowerCase());
  if (!user) {
    // Return success even if user not found to prevent enumeration
    return res.json({ message: 'If an account exists, a reset link has been sent.' });
  }

  // Generate reset token (valid for 1 hour)
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 3600000); // 1 hour

  // Store token in DB
  await dbPool.query(`
    INSERT INTO password_resets (user_id, token, expires_at)
    VALUES ($1, $2, $3)
  `, [user.id, token, expiresAt]);

  // Send email (Mock for now, should use nodemailer)
  console.log(`[EMAIL] Password Reset Link for ${email}: ${config.clientUrl}/reset-password?token=${token}`);

  // In production, call email service here
  // await emailService.sendPasswordReset(email, token);

  return res.json({ message: 'If an account exists, a reset link has been sent.' });
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Token and new password are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  try {
    // Verify token
    const { rows } = await dbPool.query(`
      SELECT user_id FROM password_resets 
      WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL
    `, [token]);

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const userId = rows[0].user_id;
    const passwordHash = await argon2.hash(newPassword);

    // Update password and mark token as used
    await userService.update(userId, {
      passwordHash,
      mustChangePassword: false
    });

    await dbPool.query(`
      UPDATE password_resets SET used_at = NOW() WHERE token = $1
    `, [token]);

    return res.json({ message: 'Password has been reset successfully' });

  } catch (error) {
    console.error('Password reset failed:', error);
    return res.status(500).json({ message: 'Password reset failed' });
  }
});

