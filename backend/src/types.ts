export type Role = 'USER' | 'REVIEWER' | 'ADMIN' | 'MINISTER';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  department: string;
  departmentHeadName?: string;
  departmentHeadEmail?: string;
  departmentHeadCode?: string;
  departmentSecretary?: string;
  departmentSecretaryEmail?: string;
  roles: Role[];
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
  mustChangePassword?: boolean;
  archivedAt?: string;
  archivedBy?: string;
}

export interface SignupRequest {
  id: string;
  email: string;
  department: string;
  justification?: string;
  firstName?: string;
  lastName?: string;
  departmentHeadName?: string;
  departmentHeadEmail?: string;
  departmentHeadCode?: string;
  departmentSecretary?: string;
  departmentSecretaryEmail?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: Date;
}

export interface Traveller {
  name: string;
  role: string;
}

export interface ExpenseRow {
  expenseType: string;
  details: string;
  costPerPerson: number;
  personsOrDays: number;
  totalCost: number;
  donorFunding: 'Yes' | 'No' | '';
  gonCost: number;
}

export interface ApprovalLog {
  id: string;
  action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'REQUEST_INFO' | 'REFERRED_TO_MINISTER' | 'MINISTER_APPROVED' | 'MINISTER_REJECTED' | 'REVIEWER_RECOMMENDED';
  actorId: string;
  actorName: string;
  actorEmail: string;
  note?: string;
  timestamp: string;
}

export interface TravelApplication {
  id: string;
  applicationNumber?: string;
  requesterId: string;
  department: string;
  division: string;
  headOfDepartment: string;
  headOfDepartmentEmail?: string;
  departmentHeadCode?: string;
  eventTitle: string;
  reasonForParticipation: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  numberOfTravellers: number;
  travellers: Traveller[];
  expenses: ExpenseRow[];
  attachmentsProvided: string[];
  totalGonCost: number;
  hodEmail: string;
  ministerName?: string;
  ministerEmail?: string;
  requesterEmail: string;
  requesterFirstName: string;
  requesterLastName: string;
  phoneNumber: string;
  status: 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED' | 'REFERRED_TO_MINISTER' | 'PENDING_MINISTER_APPROVAL';
  currentReviewerId?: string;
  submittedAt?: string;
  decidedAt?: string;
  archivedAt?: string;
  approvalLog?: ApprovalLog[];
}

export interface WorkflowAction {
  id: string;
  applicationId: string;
  actorId: string;
  action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'REQUEST_INFO' | 'ARCHIVED' | 'REFERRED_TO_MINISTER' | 'MINISTER_APPROVED' | 'MINISTER_REJECTED' | 'REVIEWER_RECOMMENDED';
  note?: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  applicationId: string;
  fileName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  uploadedBy: string;
  uploadedAt: string;
  attachmentType?: string;
}

export interface Department {
  depHead: string;
  deptName: string;
}

export interface DepartmentProfile {
  depHead: string; // Department code (e.g., "11", "21")
  deptName: string;
  headName: string;
  headEmail: string;
  secretaryName?: string;
  secretaryEmail?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface LdapSettings {
  enabled: boolean;
  url: string;
  bindDN: string;
  bindCredentials?: string;
  searchBase: string;
  searchFilter: string;
}

export interface SystemSettings {
  ldap?: LdapSettings;
  email: {
    smtp: {
      host: string;
      port: number;
      username: string;
      password: string;
      from: string;
      fromName: string;
      replyTo: string;
      secure: boolean;
    };
    notifications: {
      enabled: boolean;
      applicationSubmitted: boolean;
      applicationApproved: boolean;
      applicationRejected: boolean;
      notifyApplicantOnSubmission: boolean;
    };
    templates: {
      applicationSubmitted: {
        subject: string;
        body: string;
      };
      applicationSubmittedReviewer: {
        subject: string;
        body: string;
      };
      applicationApproved: {
        subject: string;
        body: string;
      };
      applicationRejected: {
        subject: string;
        body: string;
      };
      informationRequested: {
        subject: string;
        body: string;
      };
    };
  };
  workflow: {
    defaultReviewDeadlineDays: number;
    autoEscalationEnabled: boolean;
    minCostForAdditionalApproval: number;
    maxTravellersPerApplication: number;
    maxTravelDurationDays: number;
  };
  uploads: {
    maxFileSizeMB: number;
    allowedFileTypes: string[];
    retentionDays: number;
  };
  security: {
    minPasswordLength: number;
    passwordExpirationDays: number;
    sessionTimeoutMinutes: number;
  };
  system: {
    maintenanceMode: boolean;
    maintenanceMessage: string;
    auditLogRetentionDays: number;
  };
  application: {
    expenseTypes: string[];
  };
}
