import type { TravelApplication, User } from '../types.js';
import { config } from '../config.js';

export interface TemplateVariables {
  application?: TravelApplication;
  applicant?: User;
  reviewer?: User;
  note?: string;
  reason?: string;
}

// Format date as dd/mm/yyyy in Nauru timezone (UTC+12)
const formatDateNauru = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';

    // Nauru is UTC+12, so we add 12 hours to get local time
    const nauruDate = new Date(date.getTime() + (12 * 60 * 60 * 1000));

    const day = nauruDate.getUTCDate().toString().padStart(2, '0');
    const month = (nauruDate.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = nauruDate.getUTCFullYear();

    return `${day}/${month}/${year}`;
  } catch (error) {
    return 'Invalid date';
  }
};

export const emailTemplateService = {
  /**
   * Replace template variables with actual values
   * Available variables:
   * - {{applicationNumber}} - Application number (e.g., 06-2024-001)
   * - {{applicationLink}} - Link to view application details
   * - {{statusLink}} - Link to check application status
   * - {{eventTitle}} - Event title
   * - {{applicantName}} - Applicant full name
   * - {{applicantEmail}} - Applicant email
   * - {{department}} - Department name
   * - {{startDate}} - Travel start date (formatted as dd/mm/yyyy in Nauru timezone)
   * - {{endDate}} - Travel end date (formatted as dd/mm/yyyy in Nauru timezone)
   * - {{durationDays}} - Duration in days
   * - {{numberOfTravellers}} - Number of travellers
   * - {{totalCost}} - Total GoN cost (formatted as currency)
   * - {{reasonForParticipation}} - Reason for participation
   * - {{reviewerName}} - Reviewer name (if applicable)
   * - {{reviewerEmail}} - Reviewer email (if applicable)
   * - {{note}} - Reviewer note (if applicable)
   * - {{reason}} - Rejection reason (if applicable)
   * 
   * Conditional blocks:
   * - {{#if reason}}...{{/if}} - Shows content only if reason is provided
   * - {{#if note}}...{{/if}} - Shows content only if note is provided
   * - {{#if reviewerName}}...{{/if}} - Shows content only if reviewer is provided
   */
  replaceVariables(template: string, variables: TemplateVariables): string {
    let result = template;
    const { application, applicant, reviewer, note, reason } = variables;

    // Add current date in Nauru timezone
    const now = new Date();
    const nauruDate = new Date(now.getTime() + (12 * 60 * 60 * 1000));
    const currentDate = `${nauruDate.getUTCDate().toString().padStart(2, '0')}/${(nauruDate.getUTCMonth() + 1).toString().padStart(2, '0')}/${nauruDate.getUTCFullYear()}`;
    result = result.replace(/\{\{currentDate\}\}/g, currentDate);

    if (application) {
      const applicationNumber = application.applicationNumber || application.id.slice(0, 8);
      const applicationLink = `${config.clientUrl}/#/my-applications`;
      const statusLink = `${config.clientUrl}/#/my-applications`;

      result = result.replace(/\{\{applicationNumber\}\}/g, applicationNumber);
      result = result.replace(/\{\{applicationLink\}\}/g, applicationLink);
      result = result.replace(/\{\{statusLink\}\}/g, statusLink);
      result = result.replace(/\{\{eventTitle\}\}/g, application.eventTitle || '');
      result = result.replace(/\{\{department\}\}/g, application.department || '');
      result = result.replace(/\{\{startDate\}\}/g, formatDateNauru(application.startDate));
      result = result.replace(/\{\{endDate\}\}/g, formatDateNauru(application.endDate));
      result = result.replace(/\{\{durationDays\}\}/g, String(application.durationDays || 0));
      result = result.replace(/\{\{numberOfTravellers\}\}/g, String(application.numberOfTravellers || 0));
      result = result.replace(/\{\{totalCost\}\}/g, `$${application.totalGonCost?.toLocaleString() || '0'}`);
      result = result.replace(/\{\{reasonForParticipation\}\}/g, application.reasonForParticipation || '');
    }

    if (applicant) {
      result = result.replace(/\{\{applicantName\}\}/g, `${applicant.firstName} ${applicant.lastName}`);
      result = result.replace(/\{\{applicantEmail\}\}/g, applicant.email || '');
    } else if (application) {
      result = result.replace(/\{\{applicantName\}\}/g, `${application.requesterFirstName} ${application.requesterLastName}`);
      result = result.replace(/\{\{applicantEmail\}\}/g, application.requesterEmail || '');
    }

    if (reviewer) {
      result = result.replace(/\{\{reviewerName\}\}/g, `${reviewer.firstName} ${reviewer.lastName}`);
      result = result.replace(/\{\{reviewerEmail\}\}/g, reviewer.email || '');
    }

    if (note) {
      result = result.replace(/\{\{note\}\}/g, note);
    }

    if (reason) {
      result = result.replace(/\{\{reason\}\}/g, reason);
      // Handle conditional blocks for reason
      result = result.replace(/\{\{#if reason\}\}(.*?)\{\{\/if\}\}/gs, '$1');
    } else {
      // Remove conditional blocks if reason is not provided
      result = result.replace(/\{\{#if reason\}\}.*?\{\{\/if\}\}/gs, '');
    }

    // Handle conditional blocks for note
    if (note) {
      result = result.replace(/\{\{#if note\}\}(.*?)\{\{\/if\}\}/gs, '$1');
    } else {
      result = result.replace(/\{\{#if note\}\}.*?\{\{\/if\}\}/gs, '');
    }

    // Handle conditional blocks for reviewer
    if (reviewer) {
      result = result.replace(/\{\{#if reviewerName\}\}(.*?)\{\{\/if\}\}/gs, '$1');
    } else {
      result = result.replace(/\{\{#if reviewerName\}\}.*?\{\{\/if\}\}/gs, '');
    }

    return result;
  },

  getDefaultTemplates() {
    return {
      applicationSubmitted: {
        subject: 'Travel Application Submitted - {{applicationNumber}}',
        body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.5; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background-color: #f97316; color: white; padding: 16px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; }
    .content { padding: 20px; background-color: #fafafa; }
    .details { background-color: white; padding: 16px; margin: 16px 0; border-left: 3px solid #f97316; }
    .details h3 { margin: 0 0 12px 0; color: #f97316; font-size: 16px; }
    .detail-row { margin: 8px 0; font-size: 14px; }
    .detail-label { font-weight: 600; color: #555; }
    .button { display: inline-block; padding: 10px 20px; background-color: #f97316; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Travel Application Submitted</h1>
    </div>
    <div class="content">
      <p>Dear {{applicantName}},</p>
      <p>Your travel application has been submitted successfully and is now pending review.</p>
      
      <div class="details">
        <h3>Application Details</h3>
        <div class="detail-row">
          <span class="detail-label">Application Number:</span> 
          <a href="{{applicationLink}}" style="color: #f97316; text-decoration: none; font- weight: 600;">{{applicationNumber}}</a>
        </div>
        <div class="detail-row"><span class="detail-label">Event:</span> {{eventTitle}}</div>
        <div class="detail-row"><span class="detail-label">Department:</span> {{department}}</div>
        <div class="detail-row"><span class="detail-label">Travel Dates:</span> {{startDate}} to {{endDate}} ({{durationDays}} days)</div>
        <div class="detail-row"><span class="detail-label">Travellers:</span> {{numberOfTravellers}}</div>
        <div class="detail-row"><span class="detail-label">Total Cost:</span> {{totalCost}}</div>
      </div>
      
      <p style="font-size: 14px;">You will be notified once your application has been reviewed.</p>
      
      <div style="text-align: center;">
        <a href="{{statusLink}}" class="button">Check Application Status</a>
      </div>
    </div>
  </div>
</body>
</html>`,
      },
      applicationSubmittedReviewer: {
        subject: 'New Travel Application Submitted: {{eventTitle}}',
        body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.5; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background-color: #f97316; color: white; padding: 16px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; }
    .content { padding: 20px; background-color: #fafafa; }
    .details { background-color: white; padding: 16px; margin: 16px 0; border-left: 3px solid #f97316; }
    .details h3 { margin: 0 0 12px 0; color: #f97316; font-size: 16px; }
    .detail-row { margin: 8px 0; font-size: 14px; }
    .detail-label { font-weight: 600; color: #555; }
    .button { display: inline-block; padding: 10px 20px; background-color: #f97316; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Travel Application Submitted</h1>
    </div>
    <div class="content">
      <p>A new travel application has been submitted and requires your review.</p>
      
      <div class="details">
        <h3>Application Details</h3>
        <div class="detail-row"><span class="detail-label">Application Number:</span> {{applicationNumber}}</div>
        <div class="detail-row"><span class="detail-label">Event:</span> {{eventTitle}}</div>
        <div class="detail-row"><span class="detail-label">Applicant:</span> {{applicantName}} ({{applicantEmail}})</div>
        <div class="detail-row"><span class="detail-label">Department:</span> {{department}}</div>
        <div class="detail-row"><span class="detail-label">Travel Dates:</span> {{startDate}} to {{endDate}} ({{durationDays}} days)</div>
        <div class="detail-row"><span class="detail-label">Travellers:</span> {{numberOfTravellers}}</div>
        <div class="detail-row"><span class="detail-label">Total Cost:</span> {{totalCost}}</div>
      </div>
      
      <div style="text-align: center;">
        <a href="{{applicationLink}}" class="button">Review Application</a>
      </div>
    </div>
  </div>
</body>
</html>`,
      },
      applicationApproved: {
        subject: 'Travel Application Approved: {{eventTitle}}',
        body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @media print {
      .no-print { display: none !important; }
      body { margin: 0; padding: 20px; }
      .container { max-width: 100%; box-shadow: none; border: none; }
    }
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #000; margin: 0; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; padding: 30px; border: 2px solid #059669; background: white; }
    .header { background-color: #059669; color: white; padding: 20px; text-align: center; margin: -30px -30px 30px -30px; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 0; }
    .details { background-color: #f9fafb; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb; }
    .details h3 { margin-top: 0; color: #059669; border-bottom: 2px solid #059669; padding-bottom: 10px; }
    .detail-row { margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { font-weight: bold; color: #1f2937; display: inline-block; width: 200px; }
    .detail-value { color: #374151; }
    .button { display: inline-block; padding: 12px 24px; background-color: #059669; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .note { background-color: #ecfdf5; padding: 15px; border: 1px solid #059669; margin: 15px 0; }
    .approval-section { margin-top: 30px; padding-top: 20px; border-top: 2px solid #059669; }
    .approval-section h3 { color: #059669; margin-top: 0; }
    .signature-line { margin-top: 60px; border-top: 1px solid #000; width: 300px; }
    .signature-label { margin-top: 5px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✓ TRAVEL APPLICATION APPROVED</h1>
    </div>
    <div class="content">
      <p><strong>Date:</strong> {{currentDate}}</p>
      <p>Dear {{applicantName}},</p>
      <p style="font-size: 16px; color: #059669; font-weight: bold; margin: 20px 0;">Your travel application has been approved!</p>
      
      <div class="details">
        <h3>Application Details</h3>
        <div class="detail-row">
          <span class="detail-label">Application Number:</span>
          <span class="detail-value">{{applicationNumber}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Event Title:</span>
          <span class="detail-value">{{eventTitle}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Department:</span>
          <span class="detail-value">{{department}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Travel Dates:</span>
          <span class="detail-value">{{startDate}} to {{endDate}} ({{durationDays}} days)</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Number of Travellers:</span>
          <span class="detail-value">{{numberOfTravellers}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Total GoN Cost:</span>
          <span class="detail-value"><strong>{{totalCost}}</strong></span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Reason for Participation:</span>
          <span class="detail-value">{{reasonForParticipation}}</span>
        </div>
      </div>
      
      {{#if note}}
      <div class="note">
        <strong>Reviewer Note:</strong><br>
        {{note}}
      </div>
      {{/if}}
      
      <div class="approval-section">
        <h3>Approval Information</h3>
        {{#if reviewerName}}
        <p><strong>Approved by:</strong> {{reviewerName}}</p>
        <p><strong>Reviewer Email:</strong> {{reviewerEmail}}</p>
        {{/if}}
        <p><strong>Approval Date:</strong> {{currentDate}}</p>
      </div>
      
      <p style="margin-top: 30px;">Please proceed with your travel arrangements. This approval may be attached to payment instructions.</p>
      
      <div class="no-print" style="text-align: center; margin-top: 30px;">
        <a href="{{statusLink}}" class="button">View Application Details Online</a>
      </div>
      
      <p class="no-print" style="margin-top: 20px; font-size: 12px; color: #6b7280;">Thank you for using the Travel Application System.</p>
    </div>
  </div>
</body>
</html>`,
      },
      applicationRejected: {
        subject: 'Travel Application Rejected: {{eventTitle}}',
        body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.5; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background-color: #dc2626; color: white; padding: 16px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; }
    .content { padding: 20px; background-color: #fafafa; }
    .details { background-color: white; padding: 16px; margin: 16px 0; border-left: 3px solid #dc2626; }
    .details h3 { margin: 0 0 12px 0; color: #dc2626; font-size: 16px; }
    .detail-row { margin: 8px 0; font-size: 14px; }
    .detail-label { font-weight: 600; color: #555; }
    .reason-box { background-color: #fef2f2; padding: 12px; margin: 16px 0; border-left: 3px solid #dc2626; }
    .button { display: inline-block; padding: 10px 20px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Travel Application Rejected</h1>
    </div>
    <div class="content">
      <p>Dear {{applicantName}},</p>
      <p>We regret to inform you that your travel application has been rejected.</p>
      
      <div class="details">
        <h3>Application Details</h3>
        <div class="detail-row">
          <span class="detail-label">Application Number:</span> 
          <a href="{{applicationLink}}" style="color: #dc2626; text-decoration: none; font-weight: 600;">{{applicationNumber}}</a>
        </div>
        <div class="detail-row"><span class="detail-label">Event:</span> {{eventTitle}}</div>
        <div class="detail-row"><span class="detail-label">Travel Dates:</span> {{startDate}} to {{endDate}} ({{durationDays}} days)</div>
        <div class="detail-row"><span class="detail-label">Travellers:</span> {{numberOfTravellers}}</div>
        <div class="detail-row"><span class="detail-label">Total Cost:</span> {{totalCost}}</div>
      </div>
      
      {{#if note}}
      <div class="reason-box">
        <strong>Reason for Rejection:</strong><br>
        {{note}}
      </div>
      {{/if}}
      
      {{#if reviewerName}}
      <p style="font-size: 14px;"><strong>Reviewed by:</strong> {{reviewerName}}</p>
      {{/if}}
      
      <p style="font-size: 14px;">If you have questions about this decision, please contact the reviewer.</p>
      
      <div style="text-align: center;">
        <a href="{{statusLink}}" class="button">View Application Details</a>
      </div>
    </div>
  </div>
</body>
</html>`,
      },
      informationRequested: {
        subject: 'Additional Information Required: {{eventTitle}}',
        body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .details { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #f59e0b; }
    .detail-row { margin: 10px 0; }
    .detail-label { font-weight: bold; color: #4b5563; }
    .button { display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .info-box { background-color: #fffbeb; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #f59e0b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Additional Information Required</h1>
    </div>
    <div class="content">
      <p>Dear {{applicantName}},</p>
      <p>The reviewer has requested additional information for your travel application.</p>
      
      <div class="details">
        <h3 style="margin-top: 0; color: #f59e0b;">Application Details</h3>
        <div class="detail-row">
          <span class="detail-label">Application Number:</span> 
          <a href="{{applicationLink}}" style="color: #f59e0b; text-decoration: none; font-weight: bold;">{{applicationNumber}}</a>
        </div>
        <div class="detail-row"><span class="detail-label">Event:</span> {{eventTitle}}</div>
        <div class="detail-row"><span class="detail-label">Travel Dates:</span> {{startDate}} to {{endDate}} ({{durationDays}} days)</div>
      </div>
      
      {{#if note}}
      <div class="info-box">
        <strong>Information Requested:</strong><br>
        {{note}}
      </div>
      {{/if}}
      
      {{#if reviewerName}}
      <p><strong>Reviewed by:</strong> {{reviewerName}} ({{reviewerEmail}})</p>
      {{/if}}
      
      <div style="text-align: center;">
        <a href="{{statusLink}}" class="button">Provide Additional Information</a>
      </div>
    </div>
  </div>
</body>
</html>`,
      },
    };
  },
};

