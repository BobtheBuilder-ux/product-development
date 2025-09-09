import jsPDF from 'jspdf';

// Admin email configuration
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;
const FROM_EMAIL = import.meta.env.VITE_FROM_EMAIL;

interface QuoteRequestData {
  name: string;
  company?: string;
  email: string;
  phone?: string;
  budget?: string;
  timeline?: string;
  message?: string;
  selectedServices: string[];
  timestamp: string;
}

interface EmailData {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: string;
    encoding: string;
  }>;
}

interface EmailResult {
  success: boolean;
  message: string;
  emailId?: string;
}

class EmailService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = import.meta.env.VITE_API_URL || '/api';
  }

  async sendQuoteRequestEmail(quoteData: QuoteRequestData): Promise<boolean> {
    try {
      // Generate PDF attachment
      const pdfContent = this.generateQuoteRequestPDF(quoteData);
      
      const emailPayload = {
        from: FROM_EMAIL,
        to: [ADMIN_EMAIL],
        subject: `New Quote Request - ${quoteData.company || quoteData.name}`,
        html: this.generateQuoteRequestEmailHTML(quoteData),
        attachments: [
          {
            filename: `quote-request-${(quoteData.company || quoteData.name).replace(/\s+/g, '-')}.pdf`,
            content: pdfContent,
            content_type: 'application/pdf'
          }
        ]
      };

      const response = await fetch('/api/resend/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Resend API error: ${response.status} - ${errorData}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to send quote request email:', error);
      return false;
    }
  }

  /**
   * Generates a formatted PDF from quote request data
   */
  generateQuoteRequestPDF(data: QuoteRequestData): string {
    const doc = new jsPDF();
    let yPosition = 20;
    const lineHeight = 8;
    const sectionSpacing = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // Helper function to add text with word wrapping
    const addText = (text: string, x: number, y: number, options?: { fontSize?: number; fontStyle?: string; maxWidth?: number }) => {
      const fontSize = options?.fontSize || 10;
      const fontStyle = options?.fontStyle || 'normal';
      const maxWidth = options?.maxWidth || contentWidth;
      
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', fontStyle);
      
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y);
      return y + (lines.length * lineHeight);
    };

    // Helper function to add section header
    const addSectionHeader = (title: string, y: number) => {
      doc.setFillColor(59, 130, 246); // Blue background
      doc.rect(margin, y - 5, contentWidth, 12, 'F');
      doc.setTextColor(255, 255, 255); // White text
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin + 5, y + 3);
      doc.setTextColor(0, 0, 0); // Reset to black
      return y + 20;
    };

    // Helper function to add field
    const addField = (label: string, value: string | string[], y: number) => {
      if (value === undefined || value === null || value === '') return y;
      
      let displayValue = '';
      if (Array.isArray(value)) {
        displayValue = value.length > 0 ? value.join(', ') : 'None specified';
      } else {
        displayValue = String(value);
      }
      
      if (displayValue.trim() === '') return y;
      
      // Add label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`${label}:`, margin, y);
      
      // Add value with word wrapping
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(displayValue, contentWidth - 60);
      doc.text(lines, margin + 60, y);
      
      return y + (lines.length * lineHeight) + 3;
    };

    // Check if we need a new page
    const checkNewPage = (currentY: number, requiredSpace: number = 30) => {
      if (currentY + requiredSpace > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        return 20;
      }
      return currentY;
    };

    // Document Header
    doc.setFillColor(31, 41, 55); // Dark gray background
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('OneShopCentrale', margin, 20);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Service Quote Request', margin, 28);
    doc.setTextColor(0, 0, 0);
    
    yPosition = 50;

    // Submission Date
    yPosition = addText(`Submitted: ${new Date(data.timestamp).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, margin, yPosition, { fontSize: 10, fontStyle: 'italic' });
    yPosition += sectionSpacing;

    // Contact Information Section
    yPosition = checkNewPage(yPosition);
    yPosition = addSectionHeader('Contact Information', yPosition);
    yPosition = addField('Name', data.name, yPosition);
    yPosition = addField('Company', data.company || 'Not provided', yPosition);
    yPosition = addField('Email', data.email, yPosition);
    yPosition = addField('Phone', data.phone || 'Not provided', yPosition);
    yPosition += sectionSpacing;

    // Project Details Section
    yPosition = checkNewPage(yPosition);
    yPosition = addSectionHeader('Project Details', yPosition);
    yPosition = addField('Budget Range', data.budget || 'Not specified', yPosition);
    yPosition = addField('Timeline', data.timeline || 'Not specified', yPosition);
    yPosition += sectionSpacing;

    // Selected Services Section
    yPosition = checkNewPage(yPosition);
    yPosition = addSectionHeader('Requested Services', yPosition);
    if (data.selectedServices && data.selectedServices.length > 0) {
      data.selectedServices.forEach((service, index) => {
        yPosition = addField(`Service ${index + 1}`, service, yPosition);
      });
    } else {
      yPosition = addField('Services', 'No services selected', yPosition);
    }
    yPosition += sectionSpacing;

    // Additional Information Section
    if (data.message && data.message.trim()) {
      yPosition = checkNewPage(yPosition);
      yPosition = addSectionHeader('Additional Information', yPosition);
      yPosition = addField('Message', data.message, yPosition);
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Page ${i} of ${pageCount} | Generated by OneShopCentrale System`,
        margin,
        doc.internal.pageSize.getHeight() - 10
      );
    }

    // Convert to base64
    return doc.output('datauristring').split(',')[1];
  }

  /**
   * Generates HTML email content for quote request
   */
  generateQuoteRequestEmailHTML(data: QuoteRequestData): string {
    const servicesHtml = data.selectedServices && data.selectedServices.length > 0 
      ? data.selectedServices.map(service => `<li style="margin: 5px 0;">${service}</li>`).join('')
      : '<li style="margin: 5px 0; color: #6b7280;">No services selected</li>';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">OneShopCentrale</h1>
          <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">New Quote Request Received</p>
        </div>
        
        <div style="padding: 30px;">
          <div style="background-color: #f8fafc; padding: 25px; border-radius: 12px; margin-bottom: 25px; border-left: 4px solid #3b82f6;">
            <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 20px;">Contact Information</h2>
            <div style="display: grid; gap: 12px;">
              <p style="margin: 0;"><strong style="color: #374151;">Name:</strong> <span style="color: #6b7280;">${data.name}</span></p>
              <p style="margin: 0;"><strong style="color: #374151;">Company:</strong> <span style="color: #6b7280;">${data.company || 'Not provided'}</span></p>
              <p style="margin: 0;"><strong style="color: #374151;">Email:</strong> <span style="color: #3b82f6;">${data.email}</span></p>
              <p style="margin: 0;"><strong style="color: #374151;">Phone:</strong> <span style="color: #6b7280;">${data.phone || 'Not provided'}</span></p>
            </div>
          </div>
          
          <div style="background-color: #fef3c7; padding: 25px; border-radius: 12px; margin-bottom: 25px; border-left: 4px solid #f59e0b;">
            <h2 style="color: #92400e; margin: 0 0 20px 0; font-size: 20px;">Project Details</h2>
            <div style="display: grid; gap: 12px;">
              <p style="margin: 0;"><strong style="color: #92400e;">Budget Range:</strong> <span style="color: #78350f;">${data.budget || 'Not specified'}</span></p>
              <p style="margin: 0;"><strong style="color: #92400e;">Timeline:</strong> <span style="color: #78350f;">${data.timeline || 'Not specified'}</span></p>
            </div>
          </div>
          
          <div style="background-color: #ecfdf5; padding: 25px; border-radius: 12px; margin-bottom: 25px; border-left: 4px solid #10b981;">
            <h2 style="color: #065f46; margin: 0 0 20px 0; font-size: 20px;">Requested Services</h2>
            <ul style="margin: 0; padding-left: 20px; color: #047857;">
              ${servicesHtml}
            </ul>
          </div>
          
          ${data.message && data.message.trim() ? `
          <div style="background-color: #fef7ff; padding: 25px; border-radius: 12px; margin-bottom: 25px; border-left: 4px solid #a855f7;">
            <h2 style="color: #7c2d12; margin: 0 0 15px 0; font-size: 20px;">Additional Message</h2>
            <p style="color: #8b5cf6; margin: 0; line-height: 1.6; white-space: pre-wrap;">${data.message}</p>
          </div>
          ` : ''}
          
          <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <p style="margin: 0; color: #475569; font-size: 14px; text-align: center;">
              📎 <strong>Complete quote request details are attached as a PDF document.</strong>
            </p>
          </div>
        </div>
        
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 12px;">
            This email was automatically generated by the OneShopCentrale quote request system.<br>
            Submitted on: ${new Date(data.timestamp).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZoneName: 'short'
            })}
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Sends confirmation email to the client
   */
  async sendClientConfirmationEmail(quoteData: QuoteRequestData): Promise<boolean> {
    try {
      const emailPayload = {
        from: FROM_EMAIL,
        to: [quoteData.email],
        subject: 'Quote Request Received - OneShopCentrale',
        html: this.generateClientConfirmationHTML(quoteData)
      };

      const response = await fetch('/api/resend/emails', {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${import.meta.env.VITE_RESEND_API_KEY}`,
           'Content-Type': 'application/json',
         },
         body: JSON.stringify(emailPayload)
       });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Resend API error: ${response.status} - ${errorData}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to send client confirmation email:', error);
      return false;
    }
  }

  /**
   * Generates HTML for client confirmation email
   */
  generateClientConfirmationHTML(data: QuoteRequestData): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">OneShopCentrale</h1>
          <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">Quote Request Confirmation</p>
        </div>
        
        <div style="padding: 30px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0;">Thank you, ${data.name}!</h2>
          
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 25px;">
            We've successfully received your quote request and our team will review it shortly. 
            You can expect to hear back from us within 24-48 hours.
          </p>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #0ea5e9; margin-bottom: 25px;">
            <h3 style="color: #0c4a6e; margin: 0 0 15px 0;">What happens next?</h3>
            <ul style="color: #075985; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Our team will review your requirements</li>
              <li style="margin-bottom: 8px;">We'll prepare a customized quote for your project</li>
              <li style="margin-bottom: 8px;">You'll receive a detailed proposal via email</li>
              <li>We'll schedule a consultation call to discuss next steps</li>
            </ul>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <h3 style="color: #374151; margin: 0 0 15px 0;">Your Request Summary:</h3>
            <p style="margin: 5px 0; color: #6b7280;"><strong>Services:</strong> ${data.selectedServices.length} service(s) selected</p>
            <p style="margin: 5px 0; color: #6b7280;"><strong>Budget:</strong> ${data.budget || 'Not specified'}</p>
            <p style="margin: 5px 0; color: #6b7280;"><strong>Timeline:</strong> ${data.timeline || 'Not specified'}</p>
          </div>
        </div>
        
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0 0 10px 0; color: #374151; font-weight: bold;">Questions? We're here to help!</p>
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            Email us at <a href="mailto:${ADMIN_EMAIL}" style="color: #3b82f6;">${ADMIN_EMAIL}</a>
          </p>
        </div>
      </div>
    `;
  }
}

// Create and export a singleton instance
const emailService = new EmailService();
export default emailService;

// Export the class for direct instantiation if needed
export { EmailService };

// Export types
export type { QuoteRequestData, EmailResult };

/**
 * Validates quote request data
 */
export function validateQuoteRequestData(data: Partial<QuoteRequestData>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.name || data.name.trim().length === 0) {
    errors.push('Name is required');
  }
  
  if (!data.email || data.email.trim().length === 0) {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Valid email address is required');
  }
  
  if (!data.selectedServices || data.selectedServices.length === 0) {
    errors.push('At least one service must be selected');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Utility function to send both admin and client emails
 */
export async function sendQuoteRequestEmails(data: QuoteRequestData): Promise<EmailResult> {
  try {
    // Validate data first
    const validation = validateQuoteRequestData(data);
    if (!validation.isValid) {
      return {
        success: false,
        message: `Validation failed: ${validation.errors.join(', ')}`
      };
    }

    // Send admin notification
    const adminEmailSent = await emailService.sendQuoteRequestEmail(data);
    
    // Send client confirmation
    const clientEmailSent = await emailService.sendClientConfirmationEmail(data);
    
    if (adminEmailSent && clientEmailSent) {
      return {
        success: true,
        message: 'Quote request emails sent successfully'
      };
    } else if (adminEmailSent) {
      return {
        success: true,
        message: 'Admin notification sent, but client confirmation failed'
      };
    } else {
      return {
        success: false,
        message: 'Failed to send quote request emails'
      };
    }
  } catch (error) {
    console.error('Error sending quote request emails:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}