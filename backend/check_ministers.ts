
import { dbPool } from './src/services/database.js';
import { userService } from './src/services/userService.js';

async function checkMinisters() {
    try {
        console.log('Checking all users...');
        const result = await dbPool.query('SELECT id, email, roles FROM users');
        console.log('All users:', JSON.stringify(result.rows, null, 2));

        console.log('Checking findByRole("MINISTER")...');
        const ministers = await userService.findByRole('MINISTER');
        console.log('Ministers found:', JSON.stringify(ministers, null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkMinisters();
