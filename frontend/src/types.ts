export type Role = 'USER' | 'REVIEWER' | 'MINISTER' | 'ADMIN';

export interface AppUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  department?: string;
  departmentHeadName?: string;
  departmentHeadEmail?: string;
  roles: Role[];
  mustChangePassword?: boolean;
}

export interface Traveller {
  name: string;
  role: string;
  firstName?: string;
  lastName?: string;
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
  action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'REQUEST_INFO' | 'REFERRED_TO_MINISTER' | 'MINISTER_APPROVED' | 'MINISTER_REJECTED';
  actorId: string;
  actorName: string;
  actorEmail: string;
  note?: string;
  timestamp: string;
}

export interface TravelApplication {
  id: string;
  applicationNumber?: string;
  requesterId?: string;
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
  ministerEmail?: string;
  requesterEmail: string;
  requesterFirstName: string;
  requesterLastName: string;
  phoneNumber: string;
  status: string;
  currentReviewerId?: string;
  submittedAt?: string;
  decidedAt?: string;
  archivedAt?: string;
  approvalLog?: ApprovalLog[];
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
