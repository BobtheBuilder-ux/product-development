-- Migration: 001_initial_schema.sql
-- Description: Initial database schema for OneShopCentrale service quote request system
-- Created: 2024

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create service_categories table
CREATE TABLE IF NOT EXISTS service_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(100),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create services table
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2),
    price_unit VARCHAR(50), -- 'per hour', 'per project', 'per month', etc.
    estimated_duration VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category_id, name)
);

-- Create quote_requests table
CREATE TABLE IF NOT EXISTS quote_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_number VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    budget_range VARCHAR(100),
    timeline VARCHAR(100),
    message TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    assigned_to UUID, -- Reference to staff/admin user
    estimated_total DECIMAL(12,2),
    final_quote DECIMAL(12,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create quote_request_services table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS quote_request_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_request_id UUID NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    service_name VARCHAR(255) NOT NULL, -- Store name in case service is deleted
    custom_description TEXT,
    estimated_price DECIMAL(10,2),
    final_price DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quote_responses table
CREATE TABLE IF NOT EXISTS quote_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_request_id UUID NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
    response_type VARCHAR(50) DEFAULT 'quote', -- 'quote', 'clarification', 'rejection'
    subject VARCHAR(255),
    message TEXT NOT NULL,
    total_amount DECIMAL(12,2),
    valid_until DATE,
    terms_conditions TEXT,
    sent_by UUID, -- Reference to staff/admin user
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    client_viewed_at TIMESTAMP WITH TIME ZONE,
    client_responded_at TIMESTAMP WITH TIME ZONE
);

-- Create communication_logs table
CREATE TABLE IF NOT EXISTS communication_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_request_id UUID NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
    communication_type VARCHAR(50) NOT NULL, -- 'email', 'phone', 'meeting', 'internal_note'
    direction VARCHAR(20) NOT NULL, -- 'inbound', 'outbound', 'internal'
    subject VARCHAR(255),
    content TEXT,
    sender_email VARCHAR(255),
    recipient_email VARCHAR(255),
    staff_member UUID, -- Reference to staff/admin user
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB -- Store additional data like email IDs, attachments, etc.
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_quote_requests_email ON quote_requests(email);
CREATE INDEX IF NOT EXISTS idx_quote_requests_created_at ON quote_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_quote_requests_company ON quote_requests(company);
CREATE INDEX IF NOT EXISTS idx_quote_request_services_quote_id ON quote_request_services(quote_request_id);
CREATE INDEX IF NOT EXISTS idx_quote_request_services_service_id ON quote_request_services(service_id);
CREATE INDEX IF NOT EXISTS idx_quote_responses_quote_request_id ON quote_responses(quote_request_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_quote_request_id ON communication_logs(quote_request_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_type ON communication_logs(communication_type);
CREATE INDEX IF NOT EXISTS idx_communication_logs_created_at ON communication_logs(created_at);

-- Create function to generate quote request numbers
CREATE OR REPLACE FUNCTION generate_quote_request_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    counter INTEGER;
BEGIN
    -- Get current year and month
    new_number := 'QR' || TO_CHAR(NOW(), 'YYYYMM');
    
    -- Get the count of requests this month
    SELECT COUNT(*) + 1 INTO counter
    FROM quote_requests
    WHERE request_number LIKE new_number || '%';
    
    -- Append counter with zero padding
    new_number := new_number || LPAD(counter::TEXT, 4, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to auto-generate request numbers
CREATE OR REPLACE FUNCTION set_quote_request_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
        NEW.request_number := generate_quote_request_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate request numbers
DROP TRIGGER IF EXISTS trigger_set_quote_request_number ON quote_requests;
CREATE TRIGGER trigger_set_quote_request_number
    BEFORE INSERT ON quote_requests
    FOR EACH ROW
    EXECUTE FUNCTION set_quote_request_number();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS trigger_update_service_categories_updated_at ON service_categories;
CREATE TRIGGER trigger_update_service_categories_updated_at
    BEFORE UPDATE ON service_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_services_updated_at ON services;
CREATE TRIGGER trigger_update_services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_quote_requests_updated_at ON quote_requests;
CREATE TRIGGER trigger_update_quote_requests_updated_at
    BEFORE UPDATE ON quote_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default service categories and services
INSERT INTO service_categories (name, description, icon, display_order) VALUES
('E-commerce Development', 'Complete online store solutions with payment integration and inventory management', '🛒', 1),
('Digital Marketing', 'Comprehensive marketing strategies to boost your online presence and sales', '📈', 2),
('Business Consulting', 'Expert guidance to optimize operations and accelerate business growth', '💼', 3),
('Design Services', 'Professional design solutions for branding, web, and marketing materials', '🎨', 4),
('Technology Solutions', 'Custom software development and IT infrastructure services', '💻', 5),
('Content Creation', 'High-quality content for websites, marketing, and social media platforms', '✍️', 6)
ON CONFLICT (name) DO NOTHING;

-- Insert services for E-commerce Development
INSERT INTO services (category_id, name, description, base_price, price_unit, estimated_duration, display_order)
SELECT 
    sc.id,
    services_data.service_name,
    services_data.service_description,
    services_data.base_price,
    services_data.price_unit,
    services_data.estimated_duration,
    services_data.display_order
FROM service_categories sc,
(
    VALUES 
    ('E-commerce Development', 'Shopify Store Setup', 'Complete Shopify store configuration with theme customization', 1500.00, 'per project', '1-2 weeks', 1),
    ('E-commerce Development', 'WooCommerce Development', 'Custom WordPress e-commerce solution with WooCommerce', 2500.00, 'per project', '2-3 weeks', 2),
    ('E-commerce Development', 'Custom E-commerce Platform', 'Fully custom e-commerce solution built from scratch', 8000.00, 'per project', '6-8 weeks', 3),
    ('E-commerce Development', 'Payment Gateway Integration', 'Secure payment processing setup with multiple gateways', 800.00, 'per integration', '3-5 days', 4),
    ('E-commerce Development', 'Inventory Management System', 'Advanced inventory tracking and management tools', 3000.00, 'per project', '2-4 weeks', 5),
    ('E-commerce Development', 'Mobile App Development', 'Native or hybrid mobile app for your e-commerce store', 12000.00, 'per project', '8-12 weeks', 6)
) AS services_data(category_name, service_name, service_description, base_price, price_unit, estimated_duration, display_order)
WHERE sc.name = services_data.category_name
ON CONFLICT (category_id, name) DO NOTHING;

-- Insert services for Digital Marketing
INSERT INTO services (category_id, name, description, base_price, price_unit, estimated_duration, display_order)
SELECT 
    sc.id,
    services_data.service_name,
    services_data.service_description,
    services_data.base_price,
    services_data.price_unit,
    services_data.estimated_duration,
    services_data.display_order
FROM service_categories sc,
(
    VALUES 
    ('Digital Marketing', 'SEO Optimization', 'Comprehensive search engine optimization to improve rankings', 1200.00, 'per month', 'Ongoing', 1),
    ('Digital Marketing', 'Google Ads Management', 'Professional Google Ads campaign setup and management', 800.00, 'per month', 'Ongoing', 2),
    ('Digital Marketing', 'Social Media Marketing', 'Complete social media strategy and content management', 1000.00, 'per month', 'Ongoing', 3),
    ('Digital Marketing', 'Email Marketing Campaigns', 'Automated email sequences and newsletter campaigns', 600.00, 'per month', 'Ongoing', 4),
    ('Digital Marketing', 'Content Marketing Strategy', 'Strategic content planning and creation for brand growth', 1500.00, 'per month', 'Ongoing', 5),
    ('Digital Marketing', 'Influencer Marketing', 'Influencer outreach and collaboration management', 2000.00, 'per campaign', '2-4 weeks', 6)
) AS services_data(category_name, service_name, service_description, base_price, price_unit, estimated_duration, display_order)
WHERE sc.name = services_data.category_name
ON CONFLICT (category_id, name) DO NOTHING;

-- Insert services for Business Consulting
INSERT INTO services (category_id, name, description, base_price, price_unit, estimated_duration, display_order)
SELECT 
    sc.id,
    services_data.service_name,
    services_data.service_description,
    services_data.base_price,
    services_data.price_unit,
    services_data.estimated_duration,
    services_data.display_order
FROM service_categories sc,
(
    VALUES 
    ('Business Consulting', 'Business Strategy Development', 'Comprehensive business planning and strategic roadmap creation', 3000.00, 'per project', '2-4 weeks', 1),
    ('Business Consulting', 'Market Research & Analysis', 'In-depth market analysis and competitive intelligence', 2000.00, 'per project', '1-3 weeks', 2),
    ('Business Consulting', 'Financial Planning & Analysis', 'Financial modeling, budgeting, and investment planning', 2500.00, 'per project', '2-3 weeks', 3),
    ('Business Consulting', 'Operations Optimization', 'Process improvement and operational efficiency enhancement', 1800.00, 'per project', '3-6 weeks', 4),
    ('Business Consulting', 'Digital Transformation', 'Technology adoption and digital business model development', 5000.00, 'per project', '4-8 weeks', 5),
    ('Business Consulting', 'Startup Mentorship', 'Ongoing guidance and support for early-stage businesses', 500.00, 'per hour', 'Ongoing', 6)
) AS services_data(category_name, service_name, service_description, base_price, price_unit, estimated_duration, display_order)
WHERE sc.name = services_data.category_name
ON CONFLICT (category_id, name) DO NOTHING;

-- Insert services for Design Services
INSERT INTO services (category_id, name, description, base_price, price_unit, estimated_duration, display_order)
SELECT 
    sc.id,
    services_data.service_name,
    services_data.service_description,
    services_data.base_price,
    services_data.price_unit,
    services_data.estimated_duration,
    services_data.display_order
FROM service_categories sc,
(
    VALUES 
    ('Design Services', 'Logo & Brand Identity', 'Complete brand identity package with logo and guidelines', 1200.00, 'per project', '1-2 weeks', 1),
    ('Design Services', 'Website Design (UI/UX)', 'Modern, responsive website design with user experience focus', 2500.00, 'per project', '2-4 weeks', 2),
    ('Design Services', 'Marketing Materials', 'Brochures, flyers, business cards, and promotional materials', 800.00, 'per project', '1-2 weeks', 3),
    ('Design Services', 'Package Design', 'Product packaging design and print-ready artwork', 1500.00, 'per project', '2-3 weeks', 4),
    ('Design Services', 'Social Media Graphics', 'Custom graphics and templates for social media platforms', 600.00, 'per month', 'Ongoing', 5),
    ('Design Services', 'Presentation Design', 'Professional presentation templates and custom slide decks', 400.00, 'per presentation', '3-5 days', 6)
) AS services_data(category_name, service_name, service_description, base_price, price_unit, estimated_duration, display_order)
WHERE sc.name = services_data.category_name
ON CONFLICT (category_id, name) DO NOTHING;

-- Insert services for Technology Solutions
INSERT INTO services (category_id, name, description, base_price, price_unit, estimated_duration, display_order)
SELECT 
    sc.id,
    services_data.service_name,
    services_data.service_description,
    services_data.base_price,
    services_data.price_unit,
    services_data.estimated_duration,
    services_data.display_order
FROM service_categories sc,
(
    VALUES 
    ('Technology Solutions', 'Custom Software Development', 'Tailored software solutions for specific business needs', 10000.00, 'per project', '8-16 weeks', 1),
    ('Technology Solutions', 'API Development & Integration', 'Custom APIs and third-party service integrations', 3000.00, 'per project', '2-4 weeks', 2),
    ('Technology Solutions', 'Database Design & Optimization', 'Database architecture and performance optimization', 2000.00, 'per project', '1-3 weeks', 3),
    ('Technology Solutions', 'Cloud Infrastructure Setup', 'AWS, Azure, or Google Cloud infrastructure deployment', 2500.00, 'per project', '1-2 weeks', 4),
    ('Technology Solutions', 'IT Security Assessment', 'Comprehensive security audit and vulnerability assessment', 3500.00, 'per project', '2-3 weeks', 5),
    ('Technology Solutions', 'Technical Support & Maintenance', 'Ongoing technical support and system maintenance', 150.00, 'per hour', 'Ongoing', 6)
) AS services_data(category_name, service_name, service_description, base_price, price_unit, estimated_duration, display_order)
WHERE sc.name = services_data.category_name
ON CONFLICT (category_id, name) DO NOTHING;

-- Insert services for Content Creation
INSERT INTO services (category_id, name, description, base_price, price_unit, estimated_duration, display_order)
SELECT 
    sc.id,
    services_data.service_name,
    services_data.service_description,
    services_data.base_price,
    services_data.price_unit,
    services_data.estimated_duration,
    services_data.display_order
FROM service_categories sc,
(
    VALUES 
    ('Content Creation', 'Website Copywriting', 'Professional website content and copy optimization', 1000.00, 'per project', '1-2 weeks', 1),
    ('Content Creation', 'Blog Content Writing', 'Regular blog posts and article creation for SEO', 200.00, 'per article', 'Ongoing', 2),
    ('Content Creation', 'Product Descriptions', 'Compelling product descriptions for e-commerce stores', 50.00, 'per product', 'Ongoing', 3),
    ('Content Creation', 'Video Production', 'Professional video content for marketing and training', 2500.00, 'per video', '1-3 weeks', 4),
    ('Content Creation', 'Photography Services', 'Product photography and lifestyle shoots', 800.00, 'per session', '1-2 days', 5),
    ('Content Creation', 'Technical Documentation', 'User manuals, API docs, and technical writing', 100.00, 'per hour', 'As needed', 6)
) AS services_data(category_name, service_name, service_description, base_price, price_unit, estimated_duration, display_order)
WHERE sc.name = services_data.category_name
ON CONFLICT (category_id, name) DO NOTHING;

-- Create views for easier data access
CREATE OR REPLACE VIEW quote_requests_with_services AS
SELECT 
    qr.*,
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', qrs.id,
                'service_name', qrs.service_name,
                'custom_description', qrs.custom_description,
                'estimated_price', qrs.estimated_price,
                'final_price', qrs.final_price
            )
        ) FILTER (WHERE qrs.id IS NOT NULL),
        '[]'::json
    ) AS services
FROM quote_requests qr
LEFT JOIN quote_request_services qrs ON qr.id = qrs.quote_request_id
GROUP BY qr.id;

CREATE OR REPLACE VIEW services_with_categories AS
SELECT 
    s.*,
    sc.name AS category_name,
    sc.description AS category_description,
    sc.icon AS category_icon
FROM services s
JOIN service_categories sc ON s.category_id = sc.id
WHERE s.is_active = true AND sc.is_active = true
ORDER BY sc.display_order, s.display_order;

-- Enable Row Level Security (RLS) for data protection
ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_request_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic policies - adjust based on your authentication system)
-- Allow public to insert quote requests (for form submissions)
CREATE POLICY "Allow public quote request submission" ON quote_requests
    FOR INSERT TO anon
    WITH CHECK (true);

-- Allow public to insert quote request services (for form submissions)
CREATE POLICY "Allow public quote request services submission" ON quote_request_services
    FOR INSERT TO anon
    WITH CHECK (true);

-- Allow authenticated users to view their own quote requests
CREATE POLICY "Users can view own quote requests" ON quote_requests
    FOR SELECT TO authenticated
    USING (email = auth.jwt() ->> 'email');

-- Allow authenticated users to view their own quote request services
CREATE POLICY "Users can view own quote request services" ON quote_request_services
    FOR SELECT TO authenticated
    USING (
        quote_request_id IN (
            SELECT id FROM quote_requests 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Allow service categories and services to be publicly readable
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to service categories" ON service_categories
    FOR SELECT TO anon, authenticated
    USING (is_active = true);

CREATE POLICY "Allow public read access to services" ON services
    FOR SELECT TO anon, authenticated
    USING (is_active = true);

-- Create function to get quote request statistics
CREATE OR REPLACE FUNCTION get_quote_request_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT JSON_BUILD_OBJECT(
        'total_requests', COUNT(*),
        'pending_requests', COUNT(CASE WHEN status = 'pending' THEN 1 END),
        'in_progress_requests', COUNT(CASE WHEN status = 'in_progress' THEN 1 END),
        'completed_requests', COUNT(CASE WHEN status = 'completed' THEN 1 END),
        'this_month_requests', COUNT(CASE WHEN created_at >= DATE_TRUNC('month', NOW()) THEN 1 END),
        'avg_response_time_hours', 
            EXTRACT(EPOCH FROM AVG(CASE WHEN responded_at IS NOT NULL THEN responded_at - created_at END))/3600
    )
    INTO result
    FROM quote_requests;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON service_categories, services TO anon, authenticated;
GRANT INSERT ON quote_requests, quote_request_services TO anon, authenticated;
GRANT SELECT ON quote_requests, quote_request_services TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Create indexes for full-text search
CREATE INDEX IF NOT EXISTS idx_quote_requests_search ON quote_requests 
USING gin(to_tsvector('english', name || ' ' || COALESCE(company, '') || ' ' || COALESCE(message, '')));

CREATE INDEX IF NOT EXISTS idx_services_search ON services 
USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Migration completed successfully
SELECT 'Migration 001_initial_schema.sql completed successfully' AS status;