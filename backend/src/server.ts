import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config.js';
import { apiRouter } from './routes/index.js';
import { db } from './data/memoryStore.js';
import { storageService } from './services/storageService.js';
import { initDatabase } from './services/database.js';
import { migrateDataFromMemory } from './services/migrationService.js';
import 'express-async-errors';

const app = express();
app.use(helmet());
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(morgan('tiny'));
app.use('/uploads', express.static(config.uploadsDir));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api', apiRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: 'Unexpected error' });
});

const start = async () => {
  try {
    // Initialize database first
    await initDatabase();
    
    // Seed memory store (for backward compatibility and initial data)
    await db.seed();
    
    // Migrate data from memory to database
    await migrateDataFromMemory();
    
    await storageService.init();
    
    app.listen(config.port, () => {
      console.log(`API listening on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    // Don't exit in development - allow the server to start even if some services fail
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

start();
