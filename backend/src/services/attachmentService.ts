import { dbPool } from './database.js';
import { randomUUID } from 'crypto';
import type { Attachment } from '../types.js';

export const attachmentService = {
  async create(attachment: Omit<Attachment, 'id'>): Promise<Attachment> {
    const id = randomUUID();
    await dbPool.query(
      `INSERT INTO attachments (
        id, application_id, file_name, mime_type, size, storage_path, 
        uploaded_by, uploaded_at, attachment_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        attachment.applicationId,
        attachment.fileName,
        attachment.mimeType,
        attachment.size,
        attachment.storagePath,
        attachment.uploadedBy,
        attachment.uploadedAt,
        attachment.attachmentType || null,
      ]
    );
    return { ...attachment, id };
  },

  async findByApplicationId(applicationId: string): Promise<Attachment[]> {
    const result = await dbPool.query(
      'SELECT * FROM attachments WHERE application_id = $1 ORDER BY uploaded_at DESC',
      [applicationId]
    );
    return result.rows.map((row: any) => ({
      id: row.id,
      applicationId: row.application_id,
      fileName: row.file_name,
      mimeType: row.mime_type,
      size: row.size,
      storagePath: row.storage_path,
      uploadedBy: row.uploaded_by,
      uploadedAt: row.uploaded_at,
      attachmentType: row.attachment_type || undefined,
    }));
  },

  async delete(id: string): Promise<void> {
    await dbPool.query('DELETE FROM attachments WHERE id = $1', [id]);
  },
};

