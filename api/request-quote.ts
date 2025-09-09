import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Email service using Resend
const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FROM_EMAIL = process.env.VITE_FROM_EMAIL || 'noreply@example.com';
const ADMIN_EMAIL = process.env.VITE_ADMIN_EMAIL || 'admin@example.com';

interface QuoteRequestData {
  contact: {
    name: string;
    company?: string;
    email: string;
    phone?: string;
    budget: string;
    timeline: string;
    message?: string;
  };
  services: Array<{
    id: string;
    name: string;
    category: string;
    description?: string;
  }>;
  timestamp: string;
}

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Email sending failed: ${error}`);
  }

  return response.json();
}

function generateAdminEmailHTML(data: QuoteRequestData, requestNumber: string): string {
  const servicesHTML = data.services.map(service => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${service.name}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${service.category}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${service.description || 'N/A'}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">New Quote Request - ${requestNumber}</h2>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #333; margin-top: 0;">Contact Information</h3>
        <p><strong>Name:</strong> ${data.contact.name}</p>
        <p><strong>Company:</strong> ${data.contact.company || 'N/A'}</p>
        <p><strong>Email:</strong> ${data.contact.email}</p>
        <p><strong>Phone:</strong> ${data.contact.phone || 'N/A'}</p>
        <p><strong>Budget:</strong> ${data.contact.budget}</p>
        <p><strong>Timeline:</strong> ${data.contact.timeline}</p>
        ${data.contact.message ? `<p><strong>Message:</strong> ${data.contact.message}</p>` : ''}
      </div>

      <div style="margin: 20px 0;">
        <h3 style="color: #333;">Requested Services</h3>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Service</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Category</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Description</th>
            </tr>
          </thead>
          <tbody>
            ${servicesHTML}
          </tbody>
        </table>
      </div>

      <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #1565c0;"><strong>Submitted:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
      </div>
    </div>
  `;
}

function generateClientEmailHTML(data: QuoteRequestData, requestNumber: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Thank you for your quote request!</h2>
      
      <p>Dear ${data.contact.name},</p>
      
      <p>We've received your quote request (Reference: <strong>${requestNumber}</strong>) and our team will review it shortly.</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #333; margin-top: 0;">What happens next?</h3>
        <ul style="color: #666;">
          <li>Our team will review your requirements within 24 hours</li>
          <li>We'll prepare a detailed quote based on your selected services</li>
          <li>You'll receive a personalized proposal via email</li>
          <li>We'll schedule a consultation call to discuss your project</li>
        </ul>
      </div>

      <p>If you have any urgent questions, please don't hesitate to contact us.</p>
      
      <p>Best regards,<br>OneShopCentrale Team</p>
    </div>
  `;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data: QuoteRequestData = req.body;

    // Validate required fields
    if (!data.contact?.name || !data.contact?.email || !data.services?.length) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Insert quote request into database
    const { data: quoteRequest, error: dbError } = await supabase
      .from('quote_requests')
      .insert({
        name: data.contact.name,
        company: data.contact.company,
        email: data.contact.email,
        phone: data.contact.phone,
        budget_range: data.contact.budget,
        timeline: data.contact.timeline,
        message: data.contact.message,
        status: 'pending',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({ error: 'Failed to save quote request' });
    }

    // Insert selected services
    if (data.services.length > 0) {
      const serviceInserts = data.services.map(service => ({
        quote_request_id: quoteRequest.id,
        service_name: service.name,
        custom_description: service.description,
      }));

      const { error: servicesError } = await supabase
        .from('quote_request_services')
        .insert(serviceInserts);

      if (servicesError) {
        console.error('Services insert error:', servicesError);
      }
    }

    // Send emails
    try {
      // Send admin notification
      await sendEmail(
        ADMIN_EMAIL,
        `New Quote Request - ${quoteRequest.request_number}`,
        generateAdminEmailHTML(data, quoteRequest.request_number)
      );

      // Send client confirmation
      await sendEmail(
        data.contact.email,
        `Quote Request Received - ${quoteRequest.request_number}`,
        generateClientEmailHTML(data, quoteRequest.request_number)
      );
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Don't fail the request if email fails
    }

    return res.status(200).json({
      success: true,
      requestNumber: quoteRequest.request_number,
      message: 'Quote request submitted successfully'
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}