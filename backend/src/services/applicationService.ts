import { dbPool } from './database.js';
import type { TravelApplication, ExpenseRow, Traveller } from '../types.js';

export const applicationService = {
  async generateApplicationNumber(departmentCode: string): Promise<string> {
    const year = new Date().getFullYear();

    // Get or create sequence for this department and year
    const result = await dbPool.query(
      `INSERT INTO application_number_sequences (department_code, year, sequence)
       VALUES ($1, $2, 1)
       ON CONFLICT (department_code, year)
       DO UPDATE SET sequence = application_number_sequences.sequence + 1
       RETURNING sequence`,
      [departmentCode, year]
    );

    const sequence = result.rows[0].sequence;
    const sequenceStr = sequence.toString().padStart(3, '0');

    return `${departmentCode}-${year}-${sequenceStr}`;
  },

  async create(application: Omit<TravelApplication, 'id' | 'applicationNumber'> & { applicationNumber?: string; departmentHeadCode?: string }): Promise<TravelApplication> {
    const { randomUUID } = await import('crypto');
    const id = randomUUID();

    // Generate application number if not provided
    let applicationNumber = application.applicationNumber;
    if (!applicationNumber) {
      // Extract department code from application or default to '00'
      const departmentCode = application.departmentHeadCode || '00';
      applicationNumber = await this.generateApplicationNumber(departmentCode);
    }

    await dbPool.query(
      `INSERT INTO applications (
        id, application_number, requester_id, department, division, head_of_department,
        head_of_department_email, event_title, reason_for_participation, start_date, end_date,
        duration_days, number_of_travellers, travellers, expenses, attachments_provided,
        total_gon_cost, hod_email, minister_name, minister_email, requester_email, requester_first_name,
        requester_last_name, phone_number, status, current_reviewer_id, submitted_at, decided_at, approval_log
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
      )`,
      [
        id,
        applicationNumber,
        application.requesterId,
        application.department,
        application.division,
        application.headOfDepartment,
        application.headOfDepartmentEmail || null,
        application.eventTitle,
        application.reasonForParticipation,
        application.startDate,
        application.endDate,
        application.durationDays,
        application.numberOfTravellers,
        JSON.stringify(application.travellers),
        JSON.stringify(application.expenses),
        application.attachmentsProvided,
        application.totalGonCost,
        application.hodEmail,
        application.ministerName || null,
        application.ministerEmail || null,
        application.requesterEmail,
        application.requesterFirstName,
        application.requesterLastName,
        application.phoneNumber,
        application.status,
        application.currentReviewerId || null,
        application.submittedAt || null,
        application.decidedAt || null,
        JSON.stringify(application.approvalLog || []),
      ]
    );

    return this.findById(id) as Promise<TravelApplication>;
  },

  async findById(id: string): Promise<TravelApplication | null> {
    const result = await dbPool.query('SELECT * FROM applications WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return this.mapRowToApplication(result.rows[0]);
  },

  async findByApplicationNumber(applicationNumber: string): Promise<TravelApplication | null> {
    const result = await dbPool.query('SELECT * FROM applications WHERE application_number = $1', [applicationNumber]);
    if (result.rows.length === 0) return null;
    return this.mapRowToApplication(result.rows[0]);
  },

  async findByRequesterId(requesterId: string): Promise<TravelApplication[]> {
    console.log(`[ApplicationService] Finding applications for requester_id: ${requesterId}`);
    // Order by submitted_at first, then created_at, both are timestamps
    const result = await dbPool.query(
      `SELECT * FROM applications 
       WHERE requester_id = $1 
       ORDER BY COALESCE(submitted_at, created_at) DESC NULLS LAST`,
      [requesterId]
    );
    console.log(`[ApplicationService] Found ${result.rows.length} row(s) in database`);
    if (result.rows.length > 0) {
      console.log(`[ApplicationService] Sample application IDs: ${result.rows.slice(0, 3).map(r => r.id).join(', ')}`);
    }
    return result.rows.map((row: any) => this.mapRowToApplication(row));
  },

  async findByStatus(status: string): Promise<TravelApplication[]> {
    const result = await dbPool.query(
      'SELECT * FROM applications WHERE status = $1 ORDER BY submitted_at DESC',
      [status]
    );
    return result.rows.map((row: any) => this.mapRowToApplication(row));
  },

  async findByApproverId(actorId: string): Promise<TravelApplication[]> {
    // Find applications where the approval_log contains an entry with the given actorId
    const result = await dbPool.query(
      `SELECT * FROM applications 
       WHERE approval_log @> $1::jsonb 
       ORDER BY decided_at DESC, updated_at DESC`,
      [JSON.stringify([{ actorId }])]
    );
    return result.rows.map((row: any) => this.mapRowToApplication(row));
  },

  async findAll(): Promise<TravelApplication[]> {
    const result = await dbPool.query('SELECT * FROM applications ORDER BY created_at DESC');
    return result.rows.map((row: any) => this.mapRowToApplication(row));
  },

  async delete(id: string): Promise<void> {
    await dbPool.query('DELETE FROM applications WHERE id = $1', [id]);
  },

  async update(id: string, updates: Partial<TravelApplication>): Promise<TravelApplication> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      status: 'status',
      currentReviewerId: 'current_reviewer_id',
      submittedAt: 'submitted_at',
      decidedAt: 'decided_at',
      archivedAt: 'archived_at',
      ministerEmail: 'minister_email',
      approvalLog: 'approval_log',
    };

    for (const [key, value] of Object.entries(updates)) {
      // Skip null/undefined values unless explicitly set to null
      if (value === undefined) continue;

      // Handle null values (to clear fields)
      if (value === null && fieldMap[key]) {
        fields.push(`${fieldMap[key]} = NULL`);
        continue;
      }

      if (fieldMap[key]) {
        // Handle JSON fields
        if (key === 'approvalLog') {
          fields.push(`${fieldMap[key]} = $${paramIndex}`);
          values.push(JSON.stringify(value));
        } else {
          fields.push(`${fieldMap[key]} = $${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return this.findById(id) as Promise<TravelApplication>;
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    await dbPool.query(
      `UPDATE applications SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    return this.findById(id) as Promise<TravelApplication>;
  },

  mapRowToApplication(row: any): TravelApplication {
    return {
      id: row.id,
      applicationNumber: row.application_number,
      requesterId: row.requester_id,
      department: row.department,
      division: row.division,
      headOfDepartment: row.head_of_department,
      headOfDepartmentEmail: row.head_of_department_email,
      eventTitle: row.event_title,
      reasonForParticipation: row.reason_for_participation,
      startDate: row.start_date,
      endDate: row.end_date,
      durationDays: row.duration_days,
      numberOfTravellers: row.number_of_travellers,
      travellers: (row.travellers || []) as Traveller[],
      expenses: (row.expenses || []) as ExpenseRow[],
      attachmentsProvided: row.attachments_provided || [],
      totalGonCost: Number(row.total_gon_cost),
      hodEmail: row.hod_email,
      ministerName: row.minister_name || undefined,
      ministerEmail: row.minister_email || undefined,
      requesterEmail: row.requester_email,
      requesterFirstName: row.requester_first_name,
      requesterLastName: row.requester_last_name,
      phoneNumber: row.phone_number,
      status: row.status,
      currentReviewerId: row.current_reviewer_id,
      submittedAt: row.submitted_at,
      decidedAt: row.decided_at,
      archivedAt: row.archived_at,
      approvalLog: (row.approval_log || []) as any,
    };
  },

  async addApprovalLogEntry(id: string, entry: any): Promise<void> {
    const application = await this.findById(id);
    if (!application) {
      throw new Error('Application not found');
    }

    const existingLog = (application.approvalLog || []) as any[];
    const updatedLog = [...existingLog, entry];

    await dbPool.query(
      'UPDATE applications SET approval_log = $1 WHERE id = $2',
      [JSON.stringify(updatedLog), id]
    );
  },
};

