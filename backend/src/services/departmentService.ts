import { dbPool } from './database.js';
import type { Department, DepartmentProfile } from '../types.js';

export const departmentService = {
  async findAll(): Promise<Department[]> {
    const result = await dbPool.query('SELECT * FROM departments ORDER BY dep_head');
    return result.rows.map((row: any) => ({
      depHead: row.dep_head,
      deptName: row.dept_name,
    }));
  },

  async findByCode(code: string): Promise<Department | null> {
    const result = await dbPool.query('SELECT * FROM departments WHERE dep_head = $1', [code]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      depHead: row.dep_head,
      deptName: row.dept_name,
    };
  },

  async create(department: Department): Promise<Department> {
    const result = await dbPool.query(
      'INSERT INTO departments (dep_head, dept_name) VALUES ($1, $2) RETURNING *',
      [department.depHead, department.deptName]
    );
    const row = result.rows[0];
    return {
      depHead: row.dep_head,
      deptName: row.dept_name,
    };
  },

  async update(code: string, deptName: string): Promise<Department> {
    const result = await dbPool.query(
      'UPDATE departments SET dept_name = $1, updated_at = CURRENT_TIMESTAMP WHERE dep_head = $2 RETURNING *',
      [deptName, code]
    );
    if (result.rows.length === 0) throw new Error('Department not found');
    const row = result.rows[0];
    return {
      depHead: row.dep_head,
      deptName: row.dept_name,
    };
  },

  async delete(code: string): Promise<void> {
    const result = await dbPool.query('DELETE FROM departments WHERE dep_head = $1', [code]);
    if (result.rowCount === 0) throw new Error('Department not found');
  },
};

export const departmentProfileService = {
  async findAll(): Promise<DepartmentProfile[]> {
    const result = await dbPool.query('SELECT * FROM department_profiles ORDER BY dep_head');
    return result.rows.map(rowToProfile);
  },

  async findByCode(code: string): Promise<DepartmentProfile | null> {
    const result = await dbPool.query('SELECT * FROM department_profiles WHERE dep_head = $1', [code]);
    if (result.rows.length === 0) return null;
    return rowToProfile(result.rows[0]);
  },

  async create(profile: DepartmentProfile): Promise<DepartmentProfile> {
    const result = await dbPool.query(
      `INSERT INTO department_profiles (
        dep_head, dept_name, head_name, head_email, secretary_name, secretary_email, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        profile.depHead,
        profile.deptName,
        profile.headName,
        profile.headEmail,
        profile.secretaryName || null,
        profile.secretaryEmail || null,
        profile.updatedBy || null,
      ]
    );
    return rowToProfile(result.rows[0]);
  },

  async update(code: string, profile: Partial<DepartmentProfile>): Promise<DepartmentProfile> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (profile.deptName !== undefined) {
      fields.push(`dept_name = $${paramCount++}`);
      values.push(profile.deptName);
    }
    if (profile.headName !== undefined) {
      fields.push(`head_name = $${paramCount++}`);
      values.push(profile.headName);
    }
    if (profile.headEmail !== undefined) {
      fields.push(`head_email = $${paramCount++}`);
      values.push(profile.headEmail);
    }
    if (profile.secretaryName !== undefined) {
      fields.push(`secretary_name = $${paramCount++}`);
      values.push(profile.secretaryName);
    }
    if (profile.secretaryEmail !== undefined) {
      fields.push(`secretary_email = $${paramCount++}`);
      values.push(profile.secretaryEmail);
    }
    if (profile.updatedBy !== undefined) {
      fields.push(`updated_by = $${paramCount++}`);
      values.push(profile.updatedBy);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(code);

    const result = await dbPool.query(
      `UPDATE department_profiles SET ${fields.join(', ')} WHERE dep_head = $${paramCount} RETURNING *`,
      values
    );
    if (result.rows.length === 0) throw new Error('Department profile not found');
    return rowToProfile(result.rows[0]);
  },

  async delete(code: string): Promise<void> {
    const result = await dbPool.query('DELETE FROM department_profiles WHERE dep_head = $1', [code]);
    if (result.rowCount === 0) throw new Error('Department profile not found');
  },
};

function rowToProfile(row: any): DepartmentProfile {
  return {
    depHead: row.dep_head,
    deptName: row.dept_name,
    headName: row.head_name,
    headEmail: row.head_email,
    secretaryName: row.secretary_name,
    secretaryEmail: row.secretary_email,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

