import { promises as fs } from 'fs';
import path from 'path';
import { config } from '../config.js';

const ensureUploadsDir = async () => {
  await fs.mkdir(config.uploadsDir, { recursive: true });
};

export const storageService = {
  async init() {
    await ensureUploadsDir();
  },
  async saveLocalFile({
    buffer,
    originalName,
    mimeType,
    applicationNumber,
  }: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    applicationNumber?: string;
  }) {
    await ensureUploadsDir();
    const prefix = applicationNumber || Date.now().toString();
    const safeName = `${prefix}-${originalName.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
    const targetPath = path.join(config.uploadsDir, safeName);
    await fs.writeFile(targetPath, buffer);
    return { fileName: safeName, storagePath: targetPath, mimeType };
  },
};
