import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export interface EmailNotification {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(notification: EmailNotification): Promise<boolean> {
  if (!resend) {
    console.log('[Email] Resend not configured, skipping email:', notification.subject);
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'IncidentCmd <onboarding@resend.dev>',
      to: notification.to,
      subject: notification.subject,
      html: notification.html,
    });

    if (error) {
      console.error('[Email] Error:', error);
      return false;
    }

    console.log('[Email] Sent successfully:', data?.id);
    return true;
  } catch (err) {
    console.error('[Email] Exception:', err);
    return false;
  }
}

export async function sendCriticalIncidentAlert(
  to: string,
  incident: {
    id: string;
    title: string;
    severity: string;
    rootCause: string;
  }
): Promise<boolean> {
  return sendEmail({
    to,
    subject: `🚨 Critical Incident: ${incident.title}`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">🚨 Critical Incident Alert</h2>
          
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <h3 style="margin: 0 0 8px 0; color: #991b1b;">${incident.title}</h3>
            <p style="margin: 0; color: #7f1d1d;"><strong>Severity:</strong> ${incident.severity.toUpperCase()}</p>
          </div>
          
          <h4 style="color: #374151;">Root Cause:</h4>
          <p style="color: #6b7280; background: #f9fafb; padding: 12px; border-radius: 6px;">${incident.rootCause}</p>
          
          <a href="${process.env.APP_URL || 'http://localhost:3000'}/incidents/${incident.id}" 
             style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
            View Incident
          </a>
        </body>
      </html>
    `
  });
}

export async function sendIncidentResolvedNotification(
  to: string,
  incident: {
    id: string;
    title: string;
    severity: string;
  }
): Promise<boolean> {
  return sendEmail({
    to,
    subject: `✅ Incident Resolved: ${incident.title}`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">✅ Incident Resolved</h2>
          
          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <h3 style="margin: 0 0 8px 0; color: #065f46;">${incident.title}</h3>
            <p style="margin: 0; color: #047857;"><strong>Severity:</strong> ${incident.severity.toUpperCase()}</p>
          </div>
          
          <a href="${process.env.APP_URL || 'http://localhost:3000'}/incidents/${incident.id}" 
             style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
            View Incident
          </a>
        </body>
      </html>
    `
  });
}
