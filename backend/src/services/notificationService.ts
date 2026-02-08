import nodemailer from 'nodemailer';
import { settingsService } from './settingsService.js';

export interface NotificationPayload {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export const notificationService = {
  async send(payload: NotificationPayload) {
    try {
      // Get settings from database
      const settings = await settingsService.getSettings();
      
      // Check if notifications are enabled
      if (!settings.email.notifications.enabled) {
        console.info('Email notifications are disabled. Skipping:', payload.subject);
        return;
      }

      // Validate SMTP configuration
      const smtpConfig = settings.email.smtp;
      if (!smtpConfig.host) {
        throw new Error('SMTP host is required. Please configure SMTP settings in the admin panel.');
      }

      // Port 465 uses SSL (secure: true), port 587 uses STARTTLS (secure: false)
      // Auto-detect based on port if secure flag seems wrong
      let secure = smtpConfig.secure;
      if (smtpConfig.port === 465 && !secure) {
        secure = true; // Port 465 requires SSL
      } else if (smtpConfig.port === 587 && secure) {
        secure = false; // Port 587 uses STARTTLS, not direct SSL
      } else if (smtpConfig.port === 1025) {
        secure = false; // Mailpit doesn't use SSL
      }

      // Build transporter config
      const transporterConfig: any = {
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: secure,
        tls: {
          rejectUnauthorized: false, // Set to true in production with valid certificates
        },
      };

      // Only add auth if username and password are provided (not required for Mailpit)
      if (smtpConfig.username && smtpConfig.password) {
        transporterConfig.auth = {
          user: smtpConfig.username,
          pass: smtpConfig.password,
        };
      }

      const transporter = nodemailer.createTransport(transporterConfig);

      // Format from address
      const fromAddress = smtpConfig.fromName 
        ? `${smtpConfig.fromName} <${smtpConfig.from}>`
        : smtpConfig.from;

      // Send email
      const info = await transporter.sendMail({
        from: fromAddress,
        to: payload.to,
        replyTo: payload.replyTo || smtpConfig.replyTo,
        subject: payload.subject,
        html: payload.html,
      });

      console.info('Email sent successfully:', {
        messageId: info.messageId,
        to: payload.to,
        subject: payload.subject,
      });

      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  },
};
