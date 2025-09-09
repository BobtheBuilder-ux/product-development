import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const storageBucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'application-documents';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Storage utility functions
export const uploadFile = async (file: File, path: string): Promise<{ url: string | null; error: string | null }> => {
  try {
    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(storageBucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      return { url: null, error: error.message }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(storageBucket)
      .getPublicUrl(data.path)

    return { url: publicUrl, error: null }
  } catch (error) {
    console.error('Upload exception:', error)
    return { url: null, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export const deleteFile = async (path: string): Promise<{ success: boolean; error: string | null }> => {
  try {
    const { error } = await supabase.storage
      .from(storageBucket)
      .remove([path])

    if (error) {
      console.error('Delete error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error('Delete exception:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export const generateStoragePath = (applicationId: string, fileName: string): string => {
  const timestamp = Date.now()
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `applications/${applicationId}/${timestamp}_${sanitizedFileName}`
}

// Database schema interfaces
export interface QuoteRequest {
  id?: string;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  budget?: string; // '<5k', '5k-20k', '>20k'
  timeline?: string; // '1-3', '3-6', 'flexible'
  message?: string;
  status?: string; // 'pending', 'reviewed', 'quoted', 'closed'
  priority?: string; // 'low', 'normal', 'high', 'urgent'
  assigned_to?: string;
  estimated_value?: number;
  notes?: string;
  submission_date?: string;
  last_contact_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceCategory {
  id: string;
  title: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Service {
  id: string;
  category_id: string;
  title: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface QuoteRequestService {
  id?: number;
  quote_request_id: string;
  service_id: string;
  estimated_cost?: number;
  estimated_hours?: number;
  notes?: string;
  created_at?: string;
}

export interface QuoteResponse {
  id?: string;
  quote_request_id: string;
  quote_number: string;
  total_amount: number;
  currency?: string;
  valid_until?: string;
  terms_conditions?: string;
  payment_terms?: string;
  delivery_timeline?: string;
  status?: string; // 'draft', 'sent', 'accepted', 'rejected', 'expired'
  sent_date?: string;
  response_date?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CommunicationLog {
  id?: number;
  quote_request_id: string;
  communication_type: string; // 'email', 'phone', 'meeting', 'note'
  direction: string; // 'inbound', 'outbound'
  subject?: string;
  content?: string;
  contact_person?: string;
  created_by?: string;
  created_at?: string;
}

// Types for the new comprehensive schema
export interface VendorData {
  id?: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone?: string;
  website?: string;
  description?: string;
  years_in_business?: number;
  number_of_employees?: number;
  annual_revenue?: number;
  capacity_per_month?: number;
  minimum_order_quantity?: number;
  lead_time_days?: number;
  certifications?: string[];
  budget_range?: string;
  preferred_communication?: string;
  created_at?: string;
  updated_at?: string;
}

export interface QuoteData {
  id?: string;
  vendor_id: string;
  quote_number?: string;
  status: string;
  total_amount?: number;
  currency?: string;
  valid_until?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DocumentMetadata {
  id?: string;
  vendor_id?: string;
  quote_id?: string;
  document_type_id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  uploaded_at?: string;
}

// Submit vendor data and create quote
export async function submitVendorQuote(vendorData: {
  companyInfo: {
    companyName: string;
    contactPerson: string;
    email: string;
    phone?: string;
    website?: string;
    description?: string;
    yearsInBusiness?: number;
    numberOfEmployees?: number;
    annualRevenue?: number;
  };
  productInfo: {
    capacityPerMonth?: number;
    minimumOrderQuantity?: number;
    leadTimeDays?: number;
    certifications?: string[];
  };
  businessTypes?: string[];
  productCategories?: string[];
  targetMarkets?: string[];
  preferredLocations?: string[];
  pricingModels?: string[];
  storeTiers?: string[];
  budgetRange?: string;
  preferredCommunication?: string;
  documentsMetadata?: Record<string, any>;
}): Promise<{ success: boolean; vendorId?: string; quoteId?: string; error?: string }> {
  try {
    // Insert vendor data
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .insert({
        company_name: vendorData.companyInfo.companyName,
        contact_person: vendorData.companyInfo.contactPerson,
        email: vendorData.companyInfo.email,
        phone: vendorData.companyInfo.phone,
        website: vendorData.companyInfo.website,
        description: vendorData.companyInfo.description,
        years_in_business: vendorData.companyInfo.yearsInBusiness,
        number_of_employees: vendorData.companyInfo.numberOfEmployees,
        annual_revenue: vendorData.companyInfo.annualRevenue,
        capacity_per_month: vendorData.productInfo.capacityPerMonth,
        minimum_order_quantity: vendorData.productInfo.minimumOrderQuantity,
        lead_time_days: vendorData.productInfo.leadTimeDays,
        certifications: vendorData.productInfo.certifications || [],
        budget_range: vendorData.budgetRange,
        preferred_communication: vendorData.preferredCommunication
      })
      .select('id')
      .single();

    if (vendorError) {
      console.error('Error creating vendor:', vendorError);
      return { success: false, error: vendorError.message };
    }

    // Create initial quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        vendor_id: vendor.id,
        status: 'draft'
      })
      .select('id')
      .single();

    if (quoteError) {
      console.error('Error creating quote:', quoteError);
      return { success: false, error: quoteError.message };
    }

    // Insert relationship data
    await insertVendorRelationships(vendor.id, {
      businessTypes: vendorData.businessTypes,
      productCategories: vendorData.productCategories,
      targetMarkets: vendorData.targetMarkets,
      preferredLocations: vendorData.preferredLocations
    });

    await insertQuoteRelationships(quote.id, {
      pricingModels: vendorData.pricingModels,
      storeTiers: vendorData.storeTiers
    });

    // Process documents if any
    if (vendorData.documentsMetadata) {
      await processDocuments(vendor.id, quote.id, vendorData.documentsMetadata);
    }

    return { success: true, vendorId: vendor.id, quoteId: quote.id };
  } catch (error) {
    console.error('Error in submitVendorQuote:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Helper function to insert vendor relationships
async function insertVendorRelationships(vendorId: string, relationships: {
  businessTypes?: string[];
  productCategories?: string[];
  targetMarkets?: string[];
  preferredLocations?: string[];
}) {
  const insertPromises = [];

  if (relationships.businessTypes?.length) {
    const businessTypeEntries = relationships.businessTypes.map(typeId => ({
      vendor_id: vendorId,
      business_type_id: typeId
    }));
    insertPromises.push(
      supabase.from('vendor_business_types').insert(businessTypeEntries)
    );
  }

  if (relationships.productCategories?.length) {
    const categoryEntries = relationships.productCategories.map(categoryId => ({
      vendor_id: vendorId,
      product_category_id: categoryId
    }));
    insertPromises.push(
      supabase.from('vendor_product_categories').insert(categoryEntries)
    );
  }

  if (relationships.targetMarkets?.length) {
    const marketEntries = relationships.targetMarkets.map(marketId => ({
      vendor_id: vendorId,
      target_market_id: marketId
    }));
    insertPromises.push(
      supabase.from('vendor_target_markets').insert(marketEntries)
    );
  }

  if (relationships.preferredLocations?.length) {
    const locationEntries = relationships.preferredLocations.map(locationId => ({
      vendor_id: vendorId,
      location_id: locationId
    }));
    insertPromises.push(
      supabase.from('vendor_preferred_locations').insert(locationEntries)
    );
  }

  await Promise.all(insertPromises);
}

// Helper function to insert quote relationships
async function insertQuoteRelationships(quoteId: string, relationships: {
  pricingModels?: string[];
  storeTiers?: string[];
}) {
  const insertPromises = [];

  if (relationships.pricingModels?.length) {
    const pricingModelEntries = relationships.pricingModels.map(modelId => ({
      quote_id: quoteId,
      pricing_model_id: modelId
    }));
    insertPromises.push(
      supabase.from('quote_pricing_models').insert(pricingModelEntries)
    );
  }

  if (relationships.storeTiers?.length) {
    const storeTierEntries = relationships.storeTiers.map(tierId => ({
      quote_id: quoteId,
      store_tier_id: tierId
    }));
    insertPromises.push(
      supabase.from('quote_store_tiers').insert(storeTierEntries)
    );
  }

  await Promise.all(insertPromises);
}

// Process document metadata and upload files to Supabase Storage
async function processDocuments(vendorId: string, quoteId: string, documentsMetadata: Record<string, any>) {
  const documentEntries = [];
  
  // Get document type IDs from the database
  const { data: documentTypes } = await supabase
    .from('document_types')
    .select('id, name');
  
  const documentTypeMap = new Map(
    documentTypes?.map((dt: { name: string; id: string }) => [dt.name.toLowerCase(), dt.id]) || []
  );
  
  // Process different types of document metadata
  for (const [key, value] of Object.entries(documentsMetadata)) {
    if (value && typeof value === 'object') {
      // Handle File objects or file metadata
      if (value instanceof File) {
        try {
          // Generate storage path for the file
          const storagePath = generateStoragePath(vendorId, value.name);
          
          // Upload file to Supabase Storage
          const uploadResult = await uploadFile(value, storagePath);
          
          // Determine document type ID
          const documentTypeName = key.toLowerCase().replace(/[^a-z]/g, '');
          const documentTypeId = documentTypeMap.get(documentTypeName) || documentTypeMap.get('other');
          
          if (uploadResult.url && !uploadResult.error && documentTypeId) {
            // File uploaded successfully, store metadata with URL
            documentEntries.push({
              vendor_id: vendorId,
              quote_id: quoteId,
              document_type_id: documentTypeId,
              file_name: value.name,
              file_path: storagePath,
              file_size: value.size,
              mime_type: value.type
            });
            console.log(`File uploaded successfully: ${value.name} -> ${uploadResult.url}`);
          } else {
            console.error(`Failed to upload file ${value.name}:`, uploadResult.error);
          }
        } catch (error) {
          console.error(`Error processing file ${value.name}:`, error);
        }
      } else if (value.name && value.type) {
        // Handle file metadata objects (no actual file to upload)
        const documentTypeName = key.toLowerCase().replace(/[^a-z]/g, '');
        const documentTypeId = documentTypeMap.get(documentTypeName) || documentTypeMap.get('other');
        
        if (documentTypeId) {
          documentEntries.push({
            vendor_id: vendorId,
            quote_id: quoteId,
            document_type_id: documentTypeId,
            file_name: value.name,
            file_path: '',
            file_size: value.size || 0,
            mime_type: value.type
          });
        }
      }
    }
  }

  if (documentEntries.length > 0) {
    const { error } = await supabase
      .from('documents')
      .insert(documentEntries);

    if (error) {
      console.error('Error inserting document metadata:', error);
      throw new Error(`Failed to save document metadata: ${error.message}`);
    } else {
      console.log(`Successfully processed ${documentEntries.length} documents for vendor ${vendorId}`);
    }
  }
}

// Get vendors with their details
export async function getVendors(page = 1, limit = 50) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from('vendor_details')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Error fetching vendors:', error);
    return { success: false, error: error.message };
  }

  return { 
    success: true, 
    data, 
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    }
  };
}

// Get vendor by ID with full details
export async function getVendorById(vendorId: string) {
  const { data, error } = await supabase
    .from('vendor_details')
    .select('*')
    .eq('id', vendorId)
    .single();

  if (error) {
    console.error('Error fetching vendor:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

// Get quotes for a vendor
export async function getQuotesByVendor(vendorId: string) {
  const { data, error } = await supabase
    .from('quotes')
    .select(`
      *,
      quote_pricing_models!inner(
        pricing_model_id,
        pricing_models!inner(*)
      ),
      quote_store_tiers!inner(
        store_tier_id,
        store_tiers!inner(*)
      )
    `)
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching quotes:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

// Update quote status
export async function updateQuoteStatus(quoteId: string, status: string) {
  const { data, error } = await supabase
    .from('quotes')
    .update({ status })
    .eq('id', quoteId)
    .select()
    .single();

  if (error) {
    console.error('Error updating quote status:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

// Get lookup data for forms
export async function getLookupData() {
  const [businessTypes, productCategories, targetMarkets, countries, locations, pricingModels, storeTiers] = await Promise.all([
    supabase.from('business_types').select('*').order('name'),
    supabase.from('product_categories').select('*').order('name'),
    supabase.from('target_markets').select('*').order('name'),
    supabase.from('countries').select('*').order('name'),
    supabase.from('locations').select('*').order('city'),
    supabase.from('pricing_models').select('*').order('name'),
    supabase.from('store_tiers').select('*').order('name')
  ]);

  return {
    businessTypes: businessTypes.data || [],
    productCategories: productCategories.data || [],
    targetMarkets: targetMarkets.data || [],
    countries: countries.data || [],
    locations: locations.data || [],
    pricingModels: pricingModels.data || [],
    storeTiers: storeTiers.data || []
  };
}

// Calculate pricing for a quote
export async function calculateQuotePricing(quoteId: string, selectedModels: string[], selectedTiers: string[]) {
  try {
    // Get pricing configurations for selected models and tiers
    const { data: pricingConfigs, error } = await supabase
      .from('pricing_configurations')
      .select(`
        *,
        pricing_models!inner(*),
        store_tiers!inner(*)
      `)
      .in('pricing_model_id', selectedModels)
      .in('store_tier_id', selectedTiers)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching pricing configurations:', error);
      return { success: false, error: error.message };
    }

    // Calculate total pricing
    let totalAmount = 0;
    const calculations = [];

    for (const config of pricingConfigs || []) {
      const calculation = {
        quote_id: quoteId,
        pricing_model_id: config.pricing_model_id,
        store_tier_id: config.store_tier_id,
        base_price: config.base_price,
        setup_fee: config.setup_fee || 0,
        monthly_fee: config.monthly_fee || 0,
        transaction_fee: config.transaction_fee || 0,
        total_amount: config.base_price + (config.setup_fee || 0)
      };
      
      calculations.push(calculation);
      totalAmount += calculation.total_amount;
    }

    // Save calculations
    const { data, error: insertError } = await supabase
      .from('quote_pricing_calculations')
      .upsert(calculations)
      .select();

    if (insertError) {
      console.error('Error saving pricing calculations:', insertError);
      return { success: false, error: insertError.message };
    }

    // Update quote total
    await supabase
      .from('quotes')
      .update({ total_amount: totalAmount })
      .eq('id', quoteId);

    return { success: true, data };
  } catch (error) {
    console.error('Error calculating pricing:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Get pricing configurations for a store tier
export async function getPricingConfigurations(storeTierId: string) {
  const { data, error } = await supabase
    .from('pricing_configurations')
    .select(`
      *,
      pricing_models!inner(*),
      store_tiers!inner(*)
    `)
    .eq('store_tier_id', storeTierId);

  if (error) {
    console.error('Error fetching pricing configurations:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

// Create or update pricing configuration
export async function savePricingConfiguration(configData: {
  storeTierId: string;
  pricingModelId: string;
  basePrice: number;
  setupFee?: number;
  monthlyFee?: number;
  transactionFee?: number;
  isActive?: boolean;
}) {
  try {
    const { data, error } = await supabase
      .from('pricing_configurations')
      .upsert({
        store_tier_id: configData.storeTierId,
        pricing_model_id: configData.pricingModelId,
        base_price: configData.basePrice,
        setup_fee: configData.setupFee || 0,
        monthly_fee: configData.monthlyFee || 0,
        transaction_fee: configData.transactionFee || 0,
        is_active: configData.isActive !== false
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving pricing configuration:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in savePricingConfiguration:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Add communication record
export async function addCommunication(communicationData: {
  vendorId?: string;
  quoteId?: string;
  communicationTypeId: string;
  subject: string;
  content: string;
  direction: 'inbound' | 'outbound';
  contactMethod: string;
}) {
  try {
    const { data, error } = await supabase
      .from('communications')
      .insert({
        vendor_id: communicationData.vendorId,
        quote_id: communicationData.quoteId,
        communication_type_id: communicationData.communicationTypeId,
        subject: communicationData.subject,
        content: communicationData.content,
        direction: communicationData.direction,
        contact_method: communicationData.contactMethod
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding communication:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in addCommunication:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}