import { dbPool } from './database.js';
import { db } from '../data/memoryStore.js';
import { userService } from './userService.js';
import { departmentService, departmentProfileService } from './departmentService.js';
import { signupRequestService } from './signupRequestService.js';

export async function migrateDataFromMemory() {
  try {
    console.log('Starting data migration from memory to database...');

    // Check if departments already exist in database
    const existingDepts = await departmentService.findAll();
    if (existingDepts.length > 0) {
      console.log('Departments already exist in database, continuing to check other entities...');
    } else {
      // Migrate departments
      console.log('Migrating departments...');
      for (const dept of db.departments) {
        try {
          await departmentService.create(dept);
        } catch (error: any) {
          if (error.code !== '23505') { // Ignore duplicate key errors
            console.error(`Error migrating department ${dept.depHead}:`, error.message);
          }
        }
      }
      console.log(`Migrated ${db.departments.length} departments`);
    }

    // Migrate department profiles
    console.log('Migrating department profiles...');
    for (const profile of db.departmentProfiles) {
      try {
        await departmentProfileService.create(profile);
      } catch (error: any) {
        if (error.code !== '23505') {
          console.error(`Error migrating profile ${profile.depHead}:`, error.message);
        }
      }
    }
    console.log(`Migrated ${db.departmentProfiles.length} department profiles`);

    // Migrate users
    console.log('Migrating users...');
    let migratedUsers = 0;
    for (const user of db.users) {
      try {
        await userService.create(user);
        migratedUsers++;
      } catch (error: any) {
        if (error.code !== '23505') {
          console.error(`Error migrating user ${user.email}:`, error.message);
        }
      }
    }
    console.log(`Migrated ${migratedUsers} active users`);

    // Migrate archived users
    console.log('Migrating archived users...');
    let migratedArchived = 0;
    for (const user of db.archivedUsers) {
      try {
        await userService.create(user);
        migratedArchived++;
      } catch (error: any) {
        if (error.code !== '23505') {
          console.error(`Error migrating archived user ${user.email}:`, error.message);
        }
      }
    }
    console.log(`Migrated ${migratedArchived} archived users`);

    // Migrate signup requests
    console.log('Migrating signup requests...');
    let migratedRequests = 0;
    for (const request of db.signupRequests) {
      try {
        await signupRequestService.create(request);
        migratedRequests++;
      } catch (error: any) {
        if (error.code !== '23505') {
          console.error(`Error migrating signup request ${request.id}:`, error.message);
        }
      }
    }
    console.log(`Migrated ${migratedRequests} signup requests`);

    console.log('Data migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
}

