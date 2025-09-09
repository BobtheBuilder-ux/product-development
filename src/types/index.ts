export interface VendorData {
  company: string;
  contact: string;
  email: string;
  phone: string;
  website: string;
  country: string;
  businessType: string[];
  businessTypeOther: string;
  productName: string;
  productCategory: string[];
  productCategoryOther: string;
  targetMarket: string[];
  capacity: number;
  leadTime: string;
  certifications: string;
  models: string[];
  tiers: string[];
  locations: string[];
  compliance: string;
  samples: string;
  budget: number;
  comments: string;
  signature: string;
  date: string;
}

export interface PricingModel {
  name: string;
  value: string;
  id: number;
  description: string;
}

export interface StoreTier {
  name: string;
  value: string;
  description: string;
  services: string[];
  pricing: {
    [modelId: number]: {
      monthlyMin: number;
      monthlyMax: number;
      oneTimeMin: number;
      oneTimeMax: number;
      commissionMin: number;
      commissionMax: number;
    };
  };
}