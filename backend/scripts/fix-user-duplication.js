import { dbPool } from '../src/services/database.js';

const email = 'teu.teulilo@auspacpartnerships.com.au';

async function fixUserDuplication() {
  try {
    // First, check the current data
    const checkResult = await dbPool.query(
      `SELECT id, email, department_head_name, department_head_email, 
              department_secretary, department_secretary_email 
       FROM users WHERE email = $1`,
      [email]
    );

    if (checkResult.rows.length === 0) {
      console.log(`User ${email} not found`);
      return;
    }

    const user = checkResult.rows[0];
    console.log('Current user data:');
    console.log(JSON.stringify(user, null, 2));

    // Check if department head and secretary are the same
    const headName = user.department_head_name;
    const headEmail = user.department_head_email;
    const secretaryName = user.department_secretary;
    const secretaryEmail = user.department_secretary_email;

    const isDuplicate = 
      (headName && secretaryName && headName === secretaryName) ||
      (headEmail && secretaryEmail && headEmail === secretaryEmail);

    if (isDuplicate) {
      console.log('\nDuplication detected! Fixing...');
      
      // Clear secretary fields since they're duplicates of head
      const updateResult = await dbPool.query(
        `UPDATE users 
         SET department_secretary = NULL, 
             department_secretary_email = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE email = $1
         RETURNING *`,
        [email]
      );

      console.log('\nUser updated successfully:');
      console.log(JSON.stringify({
        email: updateResult.rows[0].email,
        department_head_name: updateResult.rows[0].department_head_name,
        department_head_email: updateResult.rows[0].department_head_email,
        department_secretary: updateResult.rows[0].department_secretary,
        department_secretary_email: updateResult.rows[0].department_secretary_email,
      }, null, 2));
    } else {
      console.log('\nNo duplication found. Head and Secretary are different.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixUserDuplication();

