-- Check current data for the user
SELECT id, email, department_head_name, department_head_email, 
       department_secretary, department_secretary_email 
FROM users 
WHERE email = 'teu.teulilo@auspacpartnerships.com.au';

-- Fix duplication: Clear secretary fields if they match head fields
UPDATE users 
SET department_secretary = NULL, 
    department_secretary_email = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'teu.teulilo@auspacpartnerships.com.au'
  AND (
    (department_head_name IS NOT NULL AND department_secretary = department_head_name)
    OR (department_head_email IS NOT NULL AND department_secretary_email = department_head_email)
  );

-- Verify the fix
SELECT id, email, department_head_name, department_head_email, 
       department_secretary, department_secretary_email 
FROM users 
WHERE email = 'teu.teulilo@auspacpartnerships.com.au';

