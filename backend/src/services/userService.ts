import { randomUUID } from 'crypto';
import { dbPool } from './database.js';
import type { User, Role } from '../types.js';

export const userService = {
  async findAll(includeArchived = false): Promise<User[]> {
    const query = includeArchived
      ? 'SELECT * FROM users ORDER BY created_at DESC'
      : "SELECT * FROM users WHERE status != 'ARCHIVED' ORDER BY created_at DESC";
    const result = await dbPool.query(query);
    return result.rows.map(rowToUser);
  },

  async findArchived(): Promise<User[]> {
    const result = await dbPool.query("SELECT * FROM users WHERE status = 'ARCHIVED' ORDER BY archived_at DESC");
    return result.rows.map(rowToUser);
  },

  async findById(id: string): Promise<User | null> {
    const result = await dbPool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return rowToUser(result.rows[0]);
  },

  async findByEmail(email: string): Promise<User | null> {
    const result = await dbPool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) return null;
    return rowToUser(result.rows[0]);
  },

  async findByRole(role: Role): Promise<User[]> {
    const result = await dbPool.query('SELECT * FROM users WHERE $1 = ANY(roles)', [role]);
    return result.rows.map(rowToUser);
  },

  async create(user: Omit<User, 'id'> & { id?: string }): Promise<User> {
    const id = user.id || randomUUID();
    const result = await dbPool.query(
      `INSERT INTO users (
        id, email, password_hash, first_name, last_name, department,
        department_head_name, department_head_email, department_head_code,
        department_secretary, department_secretary_email, roles, status, must_change_password
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        id,
        user.email.toLowerCase(),
        user.passwordHash,
        user.firstName,
        user.lastName,
        user.department || null,
        user.departmentHeadName || null,
        user.departmentHeadEmail || null,
        user.departmentHeadCode || null,
        user.departmentSecretary || null,
        user.departmentSecretaryEmail || null,
        user.roles || [],
        user.status || 'PENDING',
        user.mustChangePassword || false,
      ]
    );
    return rowToUser(result.rows[0]);
  },

  async update(id: string, updates: Partial<User>): Promise<User> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.email !== undefined) {
      fields.push(`email = $${paramCount++}`);
      values.push(updates.email.toLowerCase());
    }
    if (updates.passwordHash !== undefined) {
      fields.push(`password_hash = $${paramCount++}`);
      values.push(updates.passwordHash);
    }
    if (updates.firstName !== undefined) {
      fields.push(`first_name = $${paramCount++}`);
      values.push(updates.firstName);
    }
    if (updates.lastName !== undefined) {
      fields.push(`last_name = $${paramCount++}`);
      values.push(updates.lastName);
    }
    if (updates.department !== undefined) {
      fields.push(`department = $${paramCount++}`);
      values.push(updates.department);
    }
    if (updates.departmentHeadName !== undefined) {
      fields.push(`department_head_name = $${paramCount++}`);
      values.push(updates.departmentHeadName);
    }
    if (updates.departmentHeadEmail !== undefined) {
      fields.push(`department_head_email = $${paramCount++}`);
      values.push(updates.departmentHeadEmail);
    }
    if (updates.departmentHeadCode !== undefined) {
      fields.push(`department_head_code = $${paramCount++}`);
      values.push(updates.departmentHeadCode);
    }
    if (updates.departmentSecretary !== undefined) {
      fields.push(`department_secretary = $${paramCount++}`);
      values.push(updates.departmentSecretary || null);
    }
    if (updates.departmentSecretaryEmail !== undefined) {
      fields.push(`department_secretary_email = $${paramCount++}`);
      values.push(updates.departmentSecretaryEmail || null);
    }
    if (updates.roles !== undefined) {
      fields.push(`roles = $${paramCount++}`);
      values.push(updates.roles);
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${paramCount++}`);
      values.push(updates.status);
    }
    if (updates.mustChangePassword !== undefined) {
      fields.push(`must_change_password = $${paramCount++}`);
      values.push(updates.mustChangePassword);
    }
    if (updates.archivedAt !== undefined) {
      fields.push(`archived_at = $${paramCount++}`);
      values.push(updates.archivedAt);
    }
    if (updates.archivedBy !== undefined) {
      fields.push(`archived_by = $${paramCount++}`);
      values.push(updates.archivedBy);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await dbPool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    if (result.rows.length === 0) throw new Error('User not found');
    return rowToUser(result.rows[0]);
  },

  async addRole(id: string, role: Role): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new Error('User not found');
    if (!user.roles.includes(role)) {
      const newRoles = [...user.roles, role];
      return this.update(id, { roles: newRoles });
    }
    return user;
  },

  async removeRole(id: string, role: Role): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new Error('User not found');
    const newRoles = user.roles.filter((r) => r !== role);
    return this.update(id, { roles: newRoles });
  },

  async archive(id: string, archivedBy: string): Promise<User> {
    const now = new Date().toISOString();
    return this.update(id, {
      status: 'ARCHIVED',
      archivedAt: now,
      archivedBy,
    });
  },

  async restore(id: string): Promise<User> {
    return this.update(id, {
      status: 'ACTIVE',
      archivedAt: undefined,
      archivedBy: undefined,
    });
  },

  async delete(id: string): Promise<void> {
    const result = await dbPool.query('DELETE FROM users WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      throw new Error('User not found');
    }
  },
};

function rowToUser(row: any): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    firstName: row.first_name,
    lastName: row.last_name,
    department: row.department,
    departmentHeadName: row.department_head_name,
    departmentHeadEmail: row.department_head_email,
    departmentHeadCode: row.department_head_code,
    departmentSecretary: row.department_secretary,
    departmentSecretaryEmail: row.department_secretary_email,
    roles: (row.roles || []) as Role[],
    status: row.status,
    mustChangePassword: row.must_change_password || false,
    archivedAt: row.archived_at,
    archivedBy: row.archived_by,
  };
}

