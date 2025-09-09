# Database Schema Documentation

This directory contains the database schema and migration scripts for the OneShopCentrale service quote request system.

## Overview

The database is designed to handle:
- Service categories and individual services
- Quote requests from potential clients
- Communication logs and quote responses
- Admin management of quotes and services

## Schema Structure

### Core Tables

#### `service_categories`
Stores the main service categories (e.g., E-commerce Development, Digital Marketing)
- `id` - UUID primary key
- `name` - Category name (unique)
- `description` - Category description
- `icon` - Icon identifier for UI
- `display_order` - Order for displaying categories
- `is_active` - Whether category is active

#### `services`
Stores individual services within categories
- `id` - UUID primary key
- `category_id` - Foreign key to service_categories
- `name` - Service name
- `description` - Service description
- `base_price` - Starting price for the service
- `price_unit` - Pricing unit (per hour, per project, etc.)
- `estimated_duration` - Estimated time to complete
- `is_active` - Whether service is active

#### `quote_requests`
Stores quote requests submitted through the form
- `id` - UUID primary key
- `request_number` - Auto-generated unique request number (QR202401XXXX)
- `name` - Client name
- `company` - Client company (optional)
- `email` - Client email
- `phone` - Client phone (optional)
- `budget_range` - Client's budget range
- `timeline` - Project timeline
- `message` - Additional message from client
- `status` - Request status (pending, in_progress, completed, etc.)
- `priority` - Request priority (low, medium, high)
- `assigned_to` - Staff member assigned to handle request
- `estimated_total` - Estimated quote total
- `final_quote` - Final quoted amount
- `notes` - Internal notes

#### `quote_request_services`
Many-to-many relationship between quote requests and services
- `id` - UUID primary key
- `quote_request_id` - Foreign key to quote_requests
- `service_id` - Foreign key to services (nullable)
- `service_name` - Service name (stored for historical purposes)
- `custom_description` - Custom service description
- `estimated_price` - Estimated price for this service
- `final_price` - Final price for this service

#### `quote_responses`
Stores responses sent to clients
- `id` - UUID primary key
- `quote_request_id` - Foreign key to quote_requests
- `response_type` - Type of response (quote, clarification, rejection)
- `subject` - Email subject
- `message` - Response message
- `total_amount` - Total quoted amount
- `valid_until` - Quote validity date
- `terms_conditions` - Terms and conditions
- `sent_by` - Staff member who sent response
- `sent_at` - When response was sent
- `client_viewed_at` - When client viewed response
- `client_responded_at` - When client responded

#### `communication_logs`
Logs all communications related to quote requests
- `id` - UUID primary key
- `quote_request_id` - Foreign key to quote_requests
- `communication_type` - Type (email, phone, meeting, internal_note)
- `direction` - Direction (inbound, outbound, internal)
- `subject` - Communication subject
- `content` - Communication content
- `sender_email` - Sender email address
- `recipient_email` - Recipient email address
- `staff_member` - Staff member involved
- `metadata` - Additional data (JSON)

### Views

#### `quote_requests_with_services`
Combines quote requests with their associated services in a single view

#### `services_with_categories`
Combines services with their category information

### Functions

#### `generate_quote_request_number()`
Generates unique request numbers in format: QR{YYYYMM}{NNNN}

#### `get_quote_request_stats()`
Returns statistics about quote requests (total, pending, completed, etc.)

#### `update_updated_at_column()`
Trigger function to automatically update `updated_at` timestamps

## Migration Files

### `001_initial_schema.sql`
Creates the complete initial database schema including:
- All tables with proper relationships
- Indexes for performance
- Triggers for auto-generated fields
- Default data for service categories and services
- Row Level Security (RLS) policies
- Views and functions

### `001_initial_schema_rollback.sql`
Rollback script to remove all objects created by the initial schema migration

## Setup Instructions

### For Supabase

1. **Create a new Supabase project** or use an existing one

2. **Run the migration script**:
   - Go to the Supabase Dashboard
   - Navigate to the SQL Editor
   - Copy and paste the contents of `001_initial_schema.sql`
   - Execute the script

3. **Verify the setup**:
   ```sql
   -- Check if tables were created
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('service_categories', 'services', 'quote_requests');
   
   -- Check if default data was inserted
   SELECT COUNT(*) FROM service_categories;
   SELECT COUNT(*) FROM services;
   ```

4. **Configure Row Level Security**:
   - The migration includes basic RLS policies
   - Adjust policies based on your authentication requirements
   - Test policies with your application

### For Local Development

1. **Install PostgreSQL** (version 12 or higher)

2. **Create a database**:
   ```bash
   createdb oneshop_quotes
   ```

3. **Run the migration**:
   ```bash
   psql -d oneshop_quotes -f src/database/migrations/001_initial_schema.sql
   ```

4. **Verify the setup**:
   ```bash
   psql -d oneshop_quotes -c "\dt"
   ```

## Environment Variables

Make sure your application has the following environment variables configured:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Email Configuration
VITE_ADMIN_EMAIL=admin@oneshopcentrale.com
VITE_FROM_EMAIL=noreply@oneshopcentrale.com
```

## Usage Examples

### Inserting a Quote Request

```sql
-- Insert a new quote request
INSERT INTO quote_requests (name, email, company, phone, budget_range, timeline, message)
VALUES (
    'John Doe',
    'john@example.com',
    'Example Corp',
    '+1-555-0123',
    '$5,000 - $10,000',
    '2-3 months',
    'Looking for a complete e-commerce solution'
);

-- Get the generated request number
SELECT request_number, id FROM quote_requests 
WHERE email = 'john@example.com' 
ORDER BY created_at DESC LIMIT 1;
```

### Adding Services to a Quote Request

```sql
-- Add services to the quote request
INSERT INTO quote_request_services (quote_request_id, service_id, service_name)
SELECT 
    'quote_request_uuid_here',
    s.id,
    s.name
FROM services s
JOIN service_categories sc ON s.category_id = sc.id
WHERE s.name IN ('Shopify Store Setup', 'SEO Optimization');
```

### Querying Quote Requests with Services

```sql
-- Get all quote requests with their services
SELECT * FROM quote_requests_with_services
WHERE status = 'pending'
ORDER BY created_at DESC;

-- Get quote request statistics
SELECT get_quote_request_stats();
```

## Security Considerations

1. **Row Level Security (RLS)** is enabled on sensitive tables
2. **Public access** is allowed only for:
   - Reading service categories and services
   - Inserting new quote requests (form submissions)
3. **Authenticated access** allows users to view their own quote requests
4. **Admin access** should be configured separately based on your authentication system

## Maintenance

### Regular Tasks

1. **Monitor quote request volume**:
   ```sql
   SELECT get_quote_request_stats();
   ```

2. **Clean up old communication logs** (optional):
   ```sql
   DELETE FROM communication_logs 
   WHERE created_at < NOW() - INTERVAL '1 year';
   ```

3. **Update service pricing** as needed:
   ```sql
   UPDATE services 
   SET base_price = new_price, updated_at = NOW()
   WHERE id = 'service_uuid';
   ```

### Backup Recommendations

1. **Regular database backups** (Supabase handles this automatically)
2. **Export important data** periodically
3. **Test restore procedures** regularly

## Troubleshooting

### Common Issues

1. **Permission denied errors**:
   - Check RLS policies
   - Verify user authentication
   - Ensure proper grants are in place

2. **Duplicate key errors**:
   - Check for existing data before inserting
   - Use `ON CONFLICT` clauses where appropriate

3. **Performance issues**:
   - Check if indexes are being used
   - Monitor query execution plans
   - Consider adding additional indexes for frequent queries

### Useful Queries

```sql
-- Check table sizes
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public';

-- Check index usage
SELECT 
    indexrelname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes;

-- Monitor active connections
SELECT count(*) FROM pg_stat_activity;
```

## Support

For questions or issues with the database schema:
1. Check this documentation first
2. Review the migration scripts
3. Test queries in a development environment
4. Contact the development team for assistance