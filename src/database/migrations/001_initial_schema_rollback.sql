-- Rollback Migration: 001_initial_schema_rollback.sql
-- Description: Rollback script for initial database schema
-- This script will remove all tables, functions, and objects created in 001_initial_schema.sql

-- Drop views first (they depend on tables)
DROP VIEW IF EXISTS quote_requests_with_services;
DROP VIEW IF EXISTS services_with_categories;

-- Drop functions
DROP FUNCTION IF EXISTS get_quote_request_stats();
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS set_quote_request_number() CASCADE;
DROP FUNCTION IF EXISTS generate_quote_request_number();

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS communication_logs;
DROP TABLE IF EXISTS quote_responses;
DROP TABLE IF EXISTS quote_request_services;
DROP TABLE IF EXISTS quote_requests;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS service_categories;

-- Note: We don't drop extensions as they might be used by other parts of the system
-- DROP EXTENSION IF EXISTS "uuid-ossp";
-- DROP EXTENSION IF EXISTS "pgcrypto";

-- Rollback completed
SELECT 'Rollback 001_initial_schema_rollback.sql completed successfully' AS status;