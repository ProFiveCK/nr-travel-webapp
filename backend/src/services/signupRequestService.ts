import { dbPool } from './database.js';
import type { SignupRequest } from '../types.js';

export const signupRequestService = {
  async findAll(): Promise<SignupRequest[]> {
    const result = await dbPool.query("SELECT * FROM signup_requests WHERE status = 'PENDING' ORDER BY requested_at DESC");
    return result.rows.map(rowToRequest);
  },

  async findById(id: string): Promise<SignupRequest | null> {
    const result = await dbPool.query('SELECT * FROM signup_requests WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return rowToRequest(result.rows[0]);
  },

  async findByEmail(email: string): Promise<SignupRequest | null> {
    const result = await dbPool.query('SELECT * FROM signup_requests WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) return null;
    return rowToRequest(result.rows[0]);
  },

  async create(request: SignupRequest): Promise<SignupRequest> {
    const result = await dbPool.query(
      `INSERT INTO signup_requests (
        id, email, department, justification, first_name, last_name,
        department_head_name, department_head_email, department_head_code,
        department_secretary, department_secretary_email, status, requested_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        request.id,
        request.email.toLowerCase(),
        request.department || null,
        request.justification || null,
        request.firstName || null,
        request.lastName || null,
        request.departmentHeadName || null,
        request.departmentHeadEmail || null,
        request.departmentHeadCode || null,
        request.departmentSecretary || null,
        request.departmentSecretaryEmail || null,
        request.status || 'PENDING',
        request.requestedAt || new Date(),
      ]
    );
    return rowToRequest(result.rows[0]);
  },

  async updateStatus(id: string, status: 'PENDING' | 'APPROVED' | 'REJECTED'): Promise<SignupRequest> {
    const result = await dbPool.query(
      'UPDATE signup_requests SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (result.rows.length === 0) throw new Error('Signup request not found');
    return rowToRequest(result.rows[0]);
  },

  async delete(id: string): Promise<void> {
    const result = await dbPool.query('DELETE FROM signup_requests WHERE id = $1', [id]);
    if (result.rowCount === 0) throw new Error('Signup request not found');
  },
};

function rowToRequest(row: any): SignupRequest {
  return {
    id: row.id,
    email: row.email,
    department: row.department,
    justification: row.justification,
    firstName: row.first_name,
    lastName: row.last_name,
    departmentHeadName: row.department_head_name,
    departmentHeadEmail: row.department_head_email,
    departmentHeadCode: row.department_head_code,
    departmentSecretary: row.department_secretary,
    departmentSecretaryEmail: row.department_secretary_email,
    status: row.status,
    requestedAt: row.requested_at,
  };
}

