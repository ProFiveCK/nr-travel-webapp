import { randomUUID } from 'crypto';
import argon2 from 'argon2';
import type { Attachment, Department, DepartmentProfile, SignupRequest, SystemSettings, TravelApplication, User, WorkflowAction } from '../types.js';
import { config } from '../config.js';

class MemoryStore {
  users: User[] = [];
  archivedUsers: User[] = []; // Disabled/archived users
  signupRequests: SignupRequest[] = [];
  applications: TravelApplication[] = [];
  workflow: WorkflowAction[] = [];
  attachments: Attachment[] = [];
  departmentProfiles: DepartmentProfile[] = []; // Department head and secretary information
  departments: Department[] = [
    { depHead: '01', deptName: 'Presidency and State House (including GIO)' },
    { depHead: '02', deptName: 'Ministerial' },
    { depHead: '03', deptName: 'Chief Secretary Office' },
    { depHead: '04', deptName: 'Skills and Workforce Development' },
    { depHead: '05', deptName: 'Audit' },
    { depHead: '08', deptName: 'National Emergency Services' },
    { depHead: '09', deptName: 'Electoral Commission' },
    { depHead: '11', deptName: 'Finance Secretariat' },
    { depHead: '12', deptName: 'Finance -Public Debt' },
    { depHead: '13', deptName: 'Bureau of Statistics' },
    { depHead: '14', deptName: 'Trade and Commerce' },
    { depHead: '15', deptName: 'Nauru Revenue Office' },
    { depHead: '16', deptName: 'Finance - Other Payments' },
    { depHead: '17', deptName: 'Nauru Customs Office (NCO)' },
    { depHead: '18', deptName: 'Nauru Regional Processing Centre (NRPCC)' },
    { depHead: '21', deptName: 'Environment Management & Agriculture (DEMA)' },
    { depHead: '22', deptName: 'Climate Change & Resilience' },
    { depHead: '31', deptName: 'Fisheries' },
    { depHead: '41', deptName: 'Police' },
    { depHead: '42', deptName: 'Multi Cultural Affairs' },
    { depHead: '43', deptName: 'Justice - Secretariat' },
    { depHead: '44', deptName: 'Judiciary' },
    { depHead: '45', deptName: 'Border Control' },
    { depHead: '46', deptName: 'Correctional Services' },
    { depHead: '47', deptName: 'Nauru Financial Intelligence Unit' },
    { depHead: '51', deptName: 'Education' },
    { depHead: '53', deptName: 'Vocational Training and Professional Development' },
    { depHead: '59', deptName: 'Public Health' },
    { depHead: '61', deptName: 'Health' },
    { depHead: '62', deptName: 'Sports' },
    { depHead: '63', deptName: 'Infrastructure Development' },
    { depHead: '71', deptName: 'Foreign Affairs - Secretariat' },
    { depHead: '72', deptName: 'Foreign Affairs - Brisbane' },
    { depHead: '73', deptName: 'Foreign Affairs - Suva' },
    { depHead: '74', deptName: 'Foreign Affairs - New York' },
    { depHead: '76', deptName: 'Foreign Affairs- Geneva' },
    { depHead: '77', deptName: 'High Commission India' },
    { depHead: '78', deptName: 'High Commission Canberra' },
    { depHead: '79', deptName: 'Embassy of Nauru Beijing' },
    { depHead: '80', deptName: 'Internal Affairs' },
    { depHead: '81', deptName: 'Community And Youth' },
    { depHead: '82', deptName: 'Women and Social Development Affairs (WASDA)' },
    { depHead: '83', deptName: 'Media Bureau' },
    { depHead: '84', deptName: 'Lands & Survey' },
    { depHead: '85', deptName: 'Lands Committee' },
    { depHead: '87', deptName: 'People Living with Disability (PLD)' },
    { depHead: '88', deptName: 'National Heritage' },
    { depHead: '91', deptName: 'Transport' },
    { depHead: '95', deptName: 'ICT' },
    { depHead: '97', deptName: 'Telecom' },
    { depHead: '06', deptName: 'Parliament' },
  ];
  settings: SystemSettings = {
    email: {
      smtp: {
        host: config.smtp.host || '',
        port: config.smtp.port || 587,
        username: config.smtp.username || '',
        password: config.smtp.password || '',
        from: config.smtp.from || 'Travel Desk <no-reply@example.com>',
        fromName: 'Travel Desk',
        replyTo: config.smtp.from || 'no-reply@example.com',
        secure: true,
      },
      notifications: {
        enabled: true,
        applicationSubmitted: true,
        applicationApproved: true,
        applicationRejected: true,
        notifyApplicantOnSubmission: true,
      },
      templates: {
        applicationSubmitted: {
          subject: 'Travel Application Submitted',
          body: 'Your travel application has been submitted successfully.',
        },
        applicationSubmittedReviewer: {
          subject: 'New Travel Application for Review',
          body: 'A new travel application requires your review.',
        },
        applicationApproved: {
          subject: 'Travel Application Approved',
          body: 'Your travel application has been approved.',
        },
        applicationRejected: {
          subject: 'Travel Application Rejected',
          body: 'Your travel application has been rejected.',
        },
        informationRequested: {
          subject: 'Information Requested for Travel Application',
          body: 'Additional information has been requested for your travel application.',
        },
      },
    },
    workflow: {
      defaultReviewDeadlineDays: 7,
      autoEscalationEnabled: true,
      minCostForAdditionalApproval: 5000,
      maxTravellersPerApplication: 10,
      maxTravelDurationDays: 30,
    },
    uploads: {
      maxFileSizeMB: 10,
      allowedFileTypes: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'],
      retentionDays: 365,
    },
    security: {
      minPasswordLength: 8,
      passwordExpirationDays: 90,
      sessionTimeoutMinutes: 60,
    },
    system: {
      maintenanceMode: false,
      maintenanceMessage: 'The system is currently under maintenance. Please try again later.',
      auditLogRetentionDays: 730,
    },
    application: {
      expenseTypes: ['Airfare', 'Accommodation', 'Per Diem', 'Transport', 'Other'],
    },
  };

  async seed() {
    if (this.users.length > 0) {
      console.log('Users already seeded, skipping...');
      return;
    }
    console.log('Seeding initial users...');
    const adminPassword = await argon2.hash('Admin123!');
    this.users.push({
      id: randomUUID(),
      email: 'admin@example.com',
      firstName: 'Ada',
      lastName: 'Admin',
      department: 'Operations',
      departmentHeadName: 'Ops Director',
      departmentHeadEmail: 'director.ops@example.com',
      passwordHash: adminPassword,
      roles: ['ADMIN', 'REVIEWER'],
      status: 'ACTIVE',
    });
    console.log('Admin user created: admin@example.com / Admin123!');
    const reviewerPassword = await argon2.hash('Review123!');
    this.users.push({
      id: randomUUID(),
      email: 'reviewer@example.com',
      firstName: 'Rita',
      lastName: 'Reviewer',
      department: 'Finance',
      departmentHeadName: 'CFO',
      departmentHeadEmail: 'cfo@example.com',
      passwordHash: reviewerPassword,
      roles: ['REVIEWER'],
      status: 'ACTIVE',
    });
    const userPassword = await argon2.hash('User123!');
    const requesterId = randomUUID();
    this.users.push({
      id: requesterId,
      email: 'user@example.com',
      firstName: 'Uma',
      lastName: 'User',
      department: 'Marketing',
      departmentHeadName: 'CMO',
      departmentHeadEmail: 'cmo@example.com',
      passwordHash: userPassword,
      roles: ['USER'],
      status: 'ACTIVE',
    });
    this.applications.push({
      id: randomUUID(),
      requesterId,
      department: 'Marketing',
      division: 'Global Campaigns',
      headOfDepartment: 'Sally Head',
      eventTitle: 'Global Marketing Summit',
      reasonForParticipation: 'Present new campaign',
      startDate: '2024-09-12',
      endDate: '2024-09-16',
      durationDays: 5,

      numberOfTravellers: 2,
      travellers: [
        { name: 'Uma User', role: 'Marketing Lead' },
        { name: 'Alex Analyst', role: 'Analyst' },
      ],
      expenses: [
        {
          expenseType: 'Airfare',
          details: 'Roundtrip flight (economy)',
          costPerPerson: 1200,
          personsOrDays: 2,
          totalCost: 2400,
          donorFunding: 'No',
          gonCost: 2400,
        },
        {
          expenseType: 'Accommodation',
          details: '4 nights hotel',
          costPerPerson: 200,
          personsOrDays: 8,
          totalCost: 1600,
          donorFunding: 'No',
          gonCost: 1600,
        },
      ],
      attachmentsProvided: [
        'Invitation from event organizer',
        'Travel cost quotation (least cost flights)',
        'Justification for unfunded participants',
      ],
      totalGonCost: 4000,
      hodEmail: 'hod.marketing@example.com',
      ministerEmail: '',
      requesterEmail: 'user@example.com',
      requesterFirstName: 'Uma',
      requesterLastName: 'User',
      phoneNumber: '+674-555-0101',
      status: 'IN_REVIEW',
      currentReviewerId: this.users[1]?.id,
      submittedAt: new Date().toISOString(),
    });
  }
}

export const db = new MemoryStore();
