-- Disable RLS for quote_requests table to allow public submissions
-- This script should be run in Supabase SQL Editor

-- Disable Row Level Security for quote_requests to allow public access
ALTER TABLE quote_requests DISABLE ROW LEVEL SECURITY;

-- Disable Row Level Security for quote_request_services to allow public access
ALTER TABLE quote_request_services DISABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT INSERT ON quote_requests, quote_request_services TO anon;
GRANT SELECT ON quote_requests, quote_request_services TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

SELECT 'RLS disabled and permissions granted successfully' AS status;