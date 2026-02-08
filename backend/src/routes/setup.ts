import { Router } from 'express';
import argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { dbPool } from '../services/database.js';
import { userService } from '../services/userService.js';
import type { Role } from '../types.js';

const router = Router();

// Check if setup is required
router.get('/status', async (_req, res) => {
    try {
        const { rows } = await dbPool.query('SELECT COUNT(*) FROM users');
        const userCount = parseInt(rows[0].count, 10);

        return res.json({
            isSetupRequired: userCount === 0
        });
    } catch (error) {
        console.error('Setup status check failed:', error);
        return res.status(500).json({ message: 'Failed to check setup status' });
    }
});

// Perform first-time setup
router.post('/', async (req, res) => {
    try {
        // 1. Verify no users exist (security check)
        const { rows } = await dbPool.query('SELECT COUNT(*) FROM users');
        const userCount = parseInt(rows[0].count, 10);

        if (userCount > 0) {
            return res.status(403).json({ message: 'Setup has already been completed' });
        }

        const { email, password, firstName, lastName, department } = req.body;

        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // 2. Create Admin User
        const passwordHash = await argon2.hash(password);

        await userService.create({
            id: randomUUID(),
            email: email.toLowerCase(),
            firstName,
            lastName,
            department: department || 'Administration',
            departmentHeadName: '',
            departmentHeadEmail: '',
            departmentHeadCode: '',
            departmentSecretary: '',
            departmentSecretaryEmail: '',
            passwordHash,
            roles: ['ADMIN', 'USER'] as Role[],
            status: 'ACTIVE',
        });

        // 3. Initialize System Settings (Optional: Add default settings here)
        await dbPool.query(`
      INSERT INTO system_settings (key, value, updated_by)
      VALUES ($1, $2, $3)
      ON CONFLICT (key) DO NOTHING
    `, ['setup_completed_at', JSON.stringify({ date: new Date().toISOString() }), 'system']);

        return res.status(201).json({ message: 'System setup completed successfully' });

    } catch (error) {
        console.error('Setup failed:', error);
        return res.status(500).json({ message: 'Setup failed' });
    }
});

export const setupRouter = router;
