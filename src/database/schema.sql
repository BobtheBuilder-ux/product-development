-- OneShopCentrale Database Schema for Project 7
-- Service Quote Request System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Service categories table
CREATE TABLE service_categories (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual services table
CREATE TABLE services (
  id VARCHAR(50) PRIMARY KEY,
  category_id VARCHAR(50) REFERENCES service_categories(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quote requests table - main form submissions
CREATE TABLE quote_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  budget VARCHAR(20), -- '<5k', '5k-20k', '>20k'
  timeline VARCHAR(20), -- '1-3', '3-6', 'flexible'
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'reviewed', 'quoted', 'closed'
  priority VARCHAR(10) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  assigned_to VARCHAR(255), -- team member handling the request
  estimated_value DECIMAL(12,2), -- internal estimate
  notes TEXT, -- internal notes
  submission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_contact_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quote request services junction table
CREATE TABLE quote_request_services (
  id SERIAL PRIMARY KEY,
  quote_request_id UUID REFERENCES quote_requests(id) ON DELETE CASCADE,
  service_id VARCHAR(50) REFERENCES services(id) ON DELETE CASCADE,
  estimated_cost DECIMAL(10,2), -- internal cost estimate per service
  estimated_hours INTEGER, -- estimated hours for this service
  notes TEXT, -- service-specific notes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(quote_request_id, service_id)
);

-- Quote responses table - formal quotes sent to clients
CREATE TABLE quote_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_request_id UUID REFERENCES quote_requests(id) ON DELETE CASCADE,
  quote_number VARCHAR(50) UNIQUE NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  valid_until DATE,
  terms_conditions TEXT,
  payment_terms VARCHAR(100),
  delivery_timeline VARCHAR(100),
  status VARCHAR(20) DEFAULT 'sent', -- 'draft', 'sent', 'accepted', 'rejected', 'expired'
  sent_date TIMESTAMP WITH TIME ZONE,
  response_date TIMESTAMP WITH TIME ZONE,
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quote response line items
CREATE TABLE quote_response_items (
  id SERIAL PRIMARY KEY,
  quote_response_id UUID REFERENCES quote_responses(id) ON DELETE CASCADE,
  service_id VARCHAR(50) REFERENCES services(id),
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  display_order INTEGER DEFAULT 0
);

-- Communication log for tracking interactions
CREATE TABLE communication_log (
  id SERIAL PRIMARY KEY,
  quote_request_id UUID REFERENCES quote_requests(id) ON DELETE CASCADE,
  communication_type VARCHAR(20) NOT NULL, -- 'email', 'phone', 'meeting', 'note'
  direction VARCHAR(10) NOT NULL, -- 'inbound', 'outbound'
  subject VARCHAR(255),
  content TEXT,
  contact_person VARCHAR(255),
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- File attachments for quote requests
CREATE TABLE quote_attachments (
  id SERIAL PRIMARY KEY,
  quote_request_id UUID REFERENCES quote_requests(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_by VARCHAR(255),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_quote_requests_email ON quote_requests(email);
CREATE INDEX idx_quote_requests_status ON quote_requests(status);
CREATE INDEX idx_quote_requests_submission_date ON quote_requests(submission_date);
CREATE INDEX idx_quote_requests_assigned_to ON quote_requests(assigned_to);
CREATE INDEX idx_quote_request_services_quote_id ON quote_request_services(quote_request_id);
CREATE INDEX idx_quote_responses_quote_request_id ON quote_responses(quote_request_id);
CREATE INDEX idx_quote_responses_status ON quote_responses(status);
CREATE INDEX idx_communication_log_quote_request_id ON communication_log(quote_request_id);
CREATE INDEX idx_services_category_id ON services(category_id);

-- Triggers to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_service_categories_updated_at BEFORE UPDATE ON service_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quote_requests_updated_at BEFORE UPDATE ON quote_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quote_responses_updated_at BEFORE UPDATE ON quote_responses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert service categories and services data
INSERT INTO service_categories (id, title, description, display_order) VALUES
('ideation', 'Product Ideation & Research', 'Market research, feasibility, validation and product concepting.', 1),
('design', 'Design & Creative Services', 'Product design, visuals, photography, prototypes.', 2),
('branding', 'Branding & Identity', 'Strategy, messaging, brand guides and localization.', 3),
('packaging', 'Packaging & Labeling', 'Design, sourcing and compliance-ready labels.', 4),
('digital', 'Digital Presence & Web', 'Websites, ecommerce, SEO and catalogs.', 5),
('marketing', 'Marketing & Go-to-Market', 'Social, PR, ads, trade shows and partnerships.', 6),
('compliance', 'Compliance & Certification', 'Certifications, IP and export doc support.', 7),
('manufacturing', 'Manufacturing & Supply Chain', 'Suppliers, contract manufacturing and QA.', 8),
('finance', 'Financing & Insurance', 'Trade finance, grants and insurance advisory.', 9),
('growth', 'Post-Launch Growth', 'Distribution, iteration, scaling and licensing.', 10);

INSERT INTO services (id, category_id, title, display_order) VALUES
-- Ideation services
('market-research', 'ideation', 'Market Research & Consumer Insights', 1),
('competitive-benchmark', 'ideation', 'Competitive Benchmarking', 2),
('feasibility', 'ideation', 'Feasibility Studies', 3),
('concept-dev', 'ideation', 'Product Concept Development', 4),
('validation', 'ideation', 'Validation & Pilot Testing', 5),

-- Design services
('industrial-design', 'design', 'Industrial / Product Design', 1),
('graphic-design', 'design', 'Graphic & Logo Design', 2),
('ux-ui', 'design', 'UX / UI Design', 3),
('photo-video', 'design', 'Product Photography & Videography', 4),
('prototyping', 'design', 'Prototyping & 3D Rendering', 5),

-- Branding services
('brand-strategy', 'branding', 'Brand Strategy & Positioning', 1),
('logo-identity', 'branding', 'Logo & Identity', 2),
('messaging', 'branding', 'Messaging & Copywriting', 3),
('guidelines', 'branding', 'Brand Guidelines', 4),
('localization', 'branding', 'Multilingual Branding', 5),

-- Packaging services
('pack-design', 'packaging', 'Packaging Design (structural + aesthetic)', 1),
('eco-pack', 'packaging', 'Sustainable / Eco Packaging', 2),
('labeling', 'packaging', 'Compliance Labeling', 3),
('smart-pack', 'packaging', 'QR / Smart Packaging', 4),
('print-prod', 'packaging', 'Print & Production Management', 5),

-- Digital services
('website', 'digital', 'Corporate Website Development', 1),
('ecommerce', 'digital', 'E-commerce Store Setup', 2),
('seo', 'digital', 'SEO & Listing Optimization', 3),
('landing', 'digital', 'Product Landing Pages', 4),
('catalog', 'digital', 'Digital Catalogs & Brochures', 5),

-- Marketing services
('social', 'marketing', 'Social Media Strategy & Content', 1),
('influencer', 'marketing', 'Influencer & Affiliate Partnerships', 2),
('pr', 'marketing', 'PR & Media Outreach', 3),
('ads', 'marketing', 'Paid Advertising Campaigns', 4),
('tradeshows', 'marketing', 'Trade Show Representation', 5),

-- Compliance services
('certs', 'compliance', 'Product Certification Support', 1),
('ip', 'compliance', 'Intellectual Property Assistance', 2),
('export-docs', 'compliance', 'Export Documentation Support', 3),
('safety', 'compliance', 'Safety & Regulatory Compliance', 4),

-- Manufacturing services
('sourcing', 'manufacturing', 'Supplier & Vendor Sourcing', 1),
('small-batch', 'manufacturing', 'Small-Batch Production Setup', 2),
('contract-man', 'manufacturing', 'Contract Manufacturing', 3),
('qa', 'manufacturing', 'Quality Assurance & Testing', 4),
('inventory', 'manufacturing', 'Inventory & Warehouse Consulting', 5),

-- Finance services
('trade-finance', 'finance', 'Trade Finance Access', 1),
('grants', 'finance', 'Grants & Funding Advisory', 2),
('insurance', 'finance', 'Export & Product Insurance', 3),
('liability', 'finance', 'Product Liability Insurance', 4),

-- Growth services
('distributor', 'growth', 'Distributor & Retailer Matchmaking', 1),
('feedback', 'growth', 'Customer Feedback Loops', 2),
('scaling', 'growth', 'Iteration & SKU Scaling', 3),
('licensing', 'growth', 'Licensing & Franchising', 4);

-- Create views for easier querying
CREATE VIEW quote_requests_with_services AS
SELECT 
  qr.*,
  ARRAY_AGG(s.title ORDER BY s.title) as selected_services,
  ARRAY_AGG(qrs.service_id ORDER BY s.title) as service_ids,
  COUNT(qrs.service_id) as service_count
FROM quote_requests qr
LEFT JOIN quote_request_services qrs ON qr.id = qrs.quote_request_id
LEFT JOIN services s ON qrs.service_id = s.id
GROUP BY qr.id;

CREATE VIEW quote_summary AS
SELECT 
  DATE_TRUNC('day', submission_date) as date,
  COUNT(*) as total_requests,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
  COUNT(CASE WHEN status = 'quoted' THEN 1 END) as quoted_requests,
  AVG(estimated_value) as avg_estimated_value
FROM quote_requests
GROUP BY DATE_TRUNC('day', submission_date)
ORDER BY date DESC;

-- Security: Row Level Security (RLS) policies
ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_request_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_log ENABLE ROW LEVEL SECURITY;

-- Basic RLS policy for authenticated users (adjust based on your auth system)
CREATE POLICY "Allow authenticated users to view quote requests" ON quote_requests
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert quote requests" ON quote_requests
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow service users to update quote requests" ON quote_requests
  FOR UPDATE USING (auth.role() = 'service_role');

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON service_categories, services TO anon, authenticated;
GRANT ALL ON quote_requests, quote_request_services TO authenticated;
GRANT ALL ON quote_responses, quote_response_items, communication_log, quote_attachments TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;