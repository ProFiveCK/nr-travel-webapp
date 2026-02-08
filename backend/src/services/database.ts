import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres',
  port: Number(process.env.POSTGRES_PORT || 5432),
  user: process.env.POSTGRES_USER || 'travel',
  password: process.env.POSTGRES_PASSWORD || 'travel',
  database: process.env.POSTGRES_DB || 'travel',
});

// Test connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
  // Don't exit in development - allow retries
  if (process.env.NODE_ENV === 'production') {
    process.exit(-1);
  }
});

export const dbPool = pool;

// Initialize database schema
export async function initDatabase() {
  try {
    // Test connection first
    await pool.query('SELECT NOW()');
    console.log('Database connection verified');

    // Create settings table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by VARCHAR(255)
      );
    `);

    // Create index for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
    `);

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        department VARCHAR(255),
        department_head_name VARCHAR(255),
        department_head_email VARCHAR(255),
        department_head_code VARCHAR(50),
        department_secretary VARCHAR(255),
        department_secretary_email VARCHAR(255),
        roles TEXT[] DEFAULT ARRAY[]::TEXT[],
        status VARCHAR(50) DEFAULT 'PENDING',
        must_change_password BOOLEAN DEFAULT FALSE,
        archived_at TIMESTAMP,
        archived_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for users
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
      CREATE INDEX IF NOT EXISTS idx_users_department_head_code ON users(department_head_code);
    `);

    // Create departments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS departments (
        dep_head VARCHAR(50) PRIMARY KEY,
        dept_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create department_profiles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS department_profiles (
        dep_head VARCHAR(50) PRIMARY KEY,
        dept_name VARCHAR(255) NOT NULL,
        head_name VARCHAR(255) NOT NULL,
        head_email VARCHAR(255) NOT NULL,
        secretary_name VARCHAR(255),
        secretary_email VARCHAR(255),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by VARCHAR(255),
        FOREIGN KEY (dep_head) REFERENCES departments(dep_head) ON DELETE CASCADE
      );
    `);

    // Create signup_requests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS signup_requests (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        department VARCHAR(255),
        justification TEXT,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        department_head_name VARCHAR(255),
        department_head_email VARCHAR(255),
        department_head_code VARCHAR(50),
        department_secretary VARCHAR(255),
        department_secretary_email VARCHAR(255),
        status VARCHAR(50) DEFAULT 'PENDING',
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create index for signup_requests
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_signup_requests_email ON signup_requests(email);
      CREATE INDEX IF NOT EXISTS idx_signup_requests_status ON signup_requests(status);
    `);

    // Create applications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id VARCHAR(255) PRIMARY KEY,
        application_number VARCHAR(50) UNIQUE NOT NULL,
        requester_id VARCHAR(255) NOT NULL,
        department VARCHAR(255),
        division VARCHAR(255),
        head_of_department VARCHAR(255),
        head_of_department_email VARCHAR(255),
        event_title VARCHAR(500),
        reason_for_participation TEXT,
        start_date DATE,
        end_date DATE,
        duration_days INTEGER,
        number_of_travellers INTEGER,
        travellers JSONB,
        expenses JSONB,
        attachments_provided TEXT[],
        total_gon_cost DECIMAL(12, 2),
        hod_email VARCHAR(255),
        minister_name VARCHAR(255),
        minister_email VARCHAR(255),
        requester_email VARCHAR(255),
        requester_first_name VARCHAR(255),
        requester_last_name VARCHAR(255),
        phone_number VARCHAR(50),
        status VARCHAR(50) DEFAULT 'DRAFT',
        current_reviewer_id VARCHAR(255),
        submitted_at TIMESTAMP,
        decided_at TIMESTAMP,
        archived_at TIMESTAMP,
        approval_log JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Add minister_name column if it doesn't exist (migration for existing databases)
    try {
      await pool.query(`
        ALTER TABLE applications ADD COLUMN IF NOT EXISTS minister_name VARCHAR(255);
      `);
    } catch (error: any) {
      // Column might already exist, ignore error
      if (!error.message?.includes('already exists')) {
        console.warn('Could not add minister_name column:', error.message);
      }
    }

    // Create indexes for applications
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_applications_requester_id ON applications(requester_id);
      CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
      CREATE INDEX IF NOT EXISTS idx_applications_application_number ON applications(application_number);
      CREATE INDEX IF NOT EXISTS idx_applications_submitted_at ON applications(submitted_at);
      CREATE INDEX IF NOT EXISTS idx_applications_department ON applications(department);
    `);

    // Create application_number_sequence table to track sequence per department per year
    await pool.query(`
      CREATE TABLE IF NOT EXISTS application_number_sequences (
        department_code VARCHAR(50),
        year INTEGER,
        sequence INTEGER DEFAULT 0,
        PRIMARY KEY (department_code, year)
      );
    `);

    // Create attachments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attachments (
        id VARCHAR(255) PRIMARY KEY,
        application_id VARCHAR(255) NOT NULL,
        file_name VARCHAR(500) NOT NULL,
        mime_type VARCHAR(255),
        size BIGINT,
        storage_path VARCHAR(1000) NOT NULL,
        uploaded_by VARCHAR(255) NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        attachment_type VARCHAR(255),
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Create index for attachments
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_attachments_application_id ON attachments(application_id);
    `);

    // Migration: Add approval_log column if it doesn't exist
    try {
      const checkResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='applications' AND column_name='approval_log'
      `);

      if (checkResult.rows.length === 0) {
        await pool.query(`
          ALTER TABLE applications 
          ADD COLUMN approval_log JSONB DEFAULT '[]'::jsonb
        `);
        console.log('✅ Added approval_log column to applications table');
      }
    } catch (error: any) {
      console.warn('⚠️  Could not add approval_log column (may already exist):', error.message);
    }

    // Create password_resets table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    console.log('Database schema initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
    console.error('Please ensure PostgreSQL is running and connection settings are correct');
    throw error;
  }
}

