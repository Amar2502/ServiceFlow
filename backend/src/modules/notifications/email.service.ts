import { Resend } from "resend";
import { config } from "../../config/config";

const resend = new Resend(config.RESEND_API_KEY || "re_dummy_key");

export interface IngestionEmailOptions {
  to: string;
  customerName: string;
  complaintId: string;
  title: string;
  priority: string;
  slaDueAt: Date;
}

export interface ResolutionEmailOptions {
  to: string;
  customerName: string;
  complaintId: string;
  title: string;
  resolutionMessage: string;
}

export interface SlaBreachEmailOptions {
  customerEmail?: string;
  adminEmail?: string;
  complaintId: string;
  title: string;
  priority: string;
  slaDueAt: Date;
}

export class EmailService {
  private static defaultFrom = "ServiceFlow Support <notifications@serviceflow.io>";

  /**
   * [1] Automated Ingestion Email Notification:
   * Dispatches instant email to customer upon complaint creation with reference ID, priority, and SLA target.
   */
  static async sendIngestionConfirmationEmail(options: IngestionEmailOptions): Promise<boolean> {
    if (!config.RESEND_API_KEY) {
      console.warn("[EmailService] RESEND_API_KEY missing. Skipping email dispatch.");
      return false;
    }

    try {
      const formattedSla = options.slaDueAt ? new Date(options.slaDueAt).toLocaleString() : "N/A";

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #2563eb; margin-top: 0;">ServiceFlow Complaint Logged</h2>
          <p>Hello <strong>${options.customerName}</strong>,</p>
          <p>Your complaint has been successfully received and routed to our internal resolution team.</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Complaint Reference:</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${options.complaintId}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Title:</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${options.title}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Assigned Priority:</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><span style="background-color: #eff6ff; color: #1d4ed8; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${options.priority}</span></td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Target SLA Resolution:</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${formattedSla}</td>
            </tr>
          </table>

          <p>Our internal team is actively working on your issue. You will receive an official update once resolved.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #777;">ServiceFlow Automated Complaint System</p>
        </div>
      `;

      const response = await resend.emails.send({
        from: this.defaultFrom,
        to: [options.to],
        subject: `[ServiceFlow] Complaint Received - #${options.complaintId.slice(0, 8)}`,
        html: htmlContent,
      });

      console.log(`[EmailService Success] Ingestion confirmation email sent to ${options.to}:`, response.data?.id);
      return true;
    } catch (error) {
      console.error(`[EmailService Error] Failed sending ingestion email to ${options.to}:`, error);
      return false;
    }
  }

  /**
   * [2] 1-Click AI Draft Resolution Email:
   * Dispatches official resolution email to customer when agent/admin approves resolution.
   */
  static async sendResolutionEmail(options: ResolutionEmailOptions): Promise<boolean> {
    if (!config.RESEND_API_KEY) {
      console.warn("[EmailService] RESEND_API_KEY missing. Skipping resolution email dispatch.");
      return false;
    }

    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #16a34a; margin-top: 0;">ServiceFlow Complaint Resolved</h2>
          <p>Hello <strong>${options.customerName}</strong>,</p>
          <p>We are pleased to inform you that your complaint has been officially resolved by our support team.</p>

          <div style="background-color: #f8fafc; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0;">
            <h4 style="margin: 0 0 8px 0; color: #0f172a;">Complaint: ${options.title}</h4>
            <p style="margin: 0; color: #334155; white-space: pre-wrap;">${options.resolutionMessage}</p>
          </div>

          <p>If you have any further questions or if this issue persists, please feel free to reply to this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #777;">ServiceFlow Enterprise Resolution System</p>
        </div>
      `;

      const response = await resend.emails.send({
        from: this.defaultFrom,
        to: [options.to],
        subject: `[ServiceFlow Resolved] #${options.complaintId.slice(0, 8)} - ${options.title}`,
        html: htmlContent,
      });

      console.log(`[EmailService Success] Resolution email sent to ${options.to}:`, response.data?.id);
      return true;
    } catch (error) {
      console.error(`[EmailService Error] Failed sending resolution email to ${options.to}:`, error);
      return false;
    }
  }

  /**
   * [3] SLA Delay Alert Email:
   * Dispatches automated alert email to customer and admin when SLA target is breached.
   */
  static async sendSlaBreachAlertEmail(options: SlaBreachEmailOptions): Promise<boolean> {
    if (!config.RESEND_API_KEY) {
      return false;
    }

    try {
      const recipients: string[] = [];
      if (options.customerEmail) recipients.push(options.customerEmail);
      if (options.adminEmail) recipients.push(options.adminEmail);

      if (recipients.length === 0) return false;

      const formattedSla = options.slaDueAt ? new Date(options.slaDueAt).toLocaleString() : "N/A";

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #dc2626; margin-top: 0;">⚠️ ServiceFlow SLA Target Update</h2>
          <p>Notice: Complaint <strong>#${options.complaintId.slice(0, 8)}</strong> (${options.title}) required additional time beyond the initial target resolution time of ${formattedSla}.</p>
          <p>The ticket has been elevated to <strong style="color: #dc2626;">URGENT</strong> priority and reassigned directly to a Senior Tenant Administrator for immediate action.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #777;">ServiceFlow SLA Escalation Engine</p>
        </div>
      `;

      await resend.emails.send({
        from: this.defaultFrom,
        to: recipients,
        subject: `[SLA Alert] Complaint #${options.complaintId.slice(0, 8)} Elevated to Urgent`,
        html: htmlContent,
      });

      console.log(`[EmailService Success] SLA breach alert email sent to ${recipients.join(", ")}`);
      return true;
    } catch (error) {
      console.error("[EmailService Error] Failed sending SLA breach email:", error);
      return false;
    }
  }
}
