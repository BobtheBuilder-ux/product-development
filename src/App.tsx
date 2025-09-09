import React, { useState } from "react";
import { supabase } from "./lib/supabase";
import { sendQuoteRequestEmails } from "./lib/emailService";

const SERVICE_CATEGORIES = [
  {
    id: "ideation",
    title: "Product Ideation & Research",
    description: "Market research, feasibility, validation and product concepting.",
    services: [
      { id: "market-research", title: "Market Research & Consumer Insights" },
      { id: "competitive-benchmark", title: "Competitive Benchmarking" },
      { id: "feasibility", title: "Feasibility Studies" },
      { id: "concept-dev", title: "Product Concept Development" },
      { id: "validation", title: "Validation & Pilot Testing" },
    ],
  },
  {
    id: "design",
    title: "Design & Creative Services",
    description: "Product design, visuals, photography, prototypes.",
    services: [
      { id: "industrial-design", title: "Industrial / Product Design" },
      { id: "graphic-design", title: "Graphic & Logo Design" },
      { id: "ux-ui", title: "UX / UI Design" },
      { id: "photo-video", title: "Product Photography & Videography" },
      { id: "prototyping", title: "Prototyping & 3D Rendering" },
    ],
  },
  {
    id: "branding",
    title: "Branding & Identity",
    description: "Strategy, messaging, brand guides and localization.",
    services: [
      { id: "brand-strategy", title: "Brand Strategy & Positioning" },
      { id: "logo-identity", title: "Logo & Identity" },
      { id: "messaging", title: "Messaging & Copywriting" },
      { id: "guidelines", title: "Brand Guidelines" },
      { id: "localization", title: "Multilingual Branding" },
    ],
  },
  {
    id: "packaging",
    title: "Packaging & Labeling",
    description: "Design, sourcing and compliance-ready labels.",
    services: [
      { id: "pack-design", title: "Packaging Design (structural + aesthetic)" },
      { id: "eco-pack", title: "Sustainable / Eco Packaging" },
      { id: "labeling", title: "Compliance Labeling" },
      { id: "smart-pack", title: "QR / Smart Packaging" },
      { id: "print-prod", title: "Print & Production Management" },
    ],
  },
  {
    id: "digital",
    title: "Digital Presence & Web",
    description: "Websites, ecommerce, SEO and catalogs.",
    services: [
      { id: "website", title: "Corporate Website Development" },
      { id: "ecommerce", title: "E-commerce Store Setup" },
      { id: "seo", title: "SEO & Listing Optimization" },
      { id: "landing", title: "Product Landing Pages" },
      { id: "catalog", title: "Digital Catalogs & Brochures" },
    ],
  },
  {
    id: "marketing",
    title: "Marketing & Go-to-Market",
    description: "Social, PR, ads, trade shows and partnerships.",
    services: [
      { id: "social", title: "Social Media Strategy & Content" },
      { id: "influencer", title: "Influencer & Affiliate Partnerships" },
      { id: "pr", title: "PR & Media Outreach" },
      { id: "ads", title: "Paid Advertising Campaigns" },
      { id: "tradeshows", title: "Trade Show Representation" },
    ],
  },
  {
    id: "compliance",
    title: "Compliance & Certification",
    description: "Certifications, IP and export doc support.",
    services: [
      { id: "certs", title: "Product Certification Support" },
      { id: "ip", title: "Intellectual Property Assistance" },
      { id: "export-docs", title: "Export Documentation Support" },
      { id: "safety", title: "Safety & Regulatory Compliance" },
    ],
  },
  {
    id: "manufacturing",
    title: "Manufacturing & Supply Chain",
    description: "Suppliers, contract manufacturing and QA.",
    services: [
      { id: "sourcing", title: "Supplier & Vendor Sourcing" },
      { id: "small-batch", title: "Small-Batch Production Setup" },
      { id: "contract-man", title: "Contract Manufacturing" },
      { id: "qa", title: "Quality Assurance & Testing" },
      { id: "inventory", title: "Inventory & Warehouse Consulting" },
    ],
  },
  {
    id: "finance",
    title: "Financing & Insurance",
    description: "Trade finance, grants and insurance advisory.",
    services: [
      { id: "trade-finance", title: "Trade Finance Access" },
      { id: "grants", title: "Grants & Funding Advisory" },
      { id: "insurance", title: "Export & Product Insurance" },
      { id: "liability", title: "Product Liability Insurance" },
    ],
  },
  {
    id: "growth",
    title: "Post-Launch Growth",
    description: "Distribution, iteration, scaling and licensing.",
    services: [
      { id: "distributor", title: "Distributor & Retailer Matchmaking" },
      { id: "feedback", title: "Customer Feedback Loops" },
      { id: "scaling", title: "Iteration & SKU Scaling" },
      { id: "licensing", title: "Licensing & Franchising" },
    ],
  },
];

export default function ProductBouquet() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]); // array of service ids
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    budget: "",
    timeline: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleService(serviceId: string) {
    setSelected((prev) =>
      prev.includes(serviceId) ? prev.filter((s) => s !== serviceId) : [...prev, serviceId]
    );
  }

  function isSelected(serviceId: string) {
    return selected.includes(serviceId);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name || !form.email || selected.length === 0) {
      setError("Please provide your name, email and select at least one service.");
      return;
    }
    setSubmitting(true);
    const payload = {
      contact: form,
      services: selected,
      timestamp: new Date().toISOString(),
    };

    try {
      // Insert quote request into Supabase
       const { data: quoteData, error: quoteError } = await supabase
         .from('quote_requests')
         .insert({
           name: form.name,
           email: form.email,
           phone: form.phone || null,
           company: form.company || null,
           message: form.message || null,
           status: 'pending',
           request_number: `REQ-${Date.now()}`,
           created_at: new Date().toISOString()
         })
         .select()
         .single();

      if (quoteError) {
        console.error('Database error:', quoteError);
        throw new Error('Failed to save quote request');
      }

      // Insert selected services
       if (selected.length > 0) {
         const serviceInserts = selected.map(serviceId => {
            // Find the service details from SERVICE_CATEGORIES
            let serviceDetails = null;
            
            for (const category of SERVICE_CATEGORIES) {
              const service = category.services.find(s => s.id === serviceId);
              if (service) {
                serviceDetails = service;
                break;
              }
            }
            
            return {
              quote_request_id: quoteData.id,
              service_name: serviceDetails?.title || serviceId,
              custom_description: null,
              estimated_price: null,
              final_price: null
            };
          });

         const { error: servicesError } = await supabase
           .from('quote_request_services')
           .insert(serviceInserts);

         if (servicesError) {
           console.error('Services insert error:', servicesError);
           throw new Error('Failed to save selected services');
         }
       }

      // Send email notifications
      const emailData = {
        name: form.name,
        company: form.company,
        email: form.email,
        phone: form.phone,
        budget: form.budget,
        timeline: form.timeline,
        message: form.message,
        selectedServices: selected.map(serviceId => {
          for (const category of SERVICE_CATEGORIES) {
            const service = category.services.find(s => s.id === serviceId);
            if (service) return service.title;
          }
          return serviceId;
        }),
        timestamp: new Date().toISOString()
      };

      const emailResult = await sendQuoteRequestEmails(emailData);
      if (!emailResult.success) {
        console.warn('Email sending failed:', emailResult.message);
      }

      setSuccess("Request sent successfully. Our team will contact you shortly.");
      setSelected([]);
      setForm({ name: "", company: "", email: "", phone: "", budget: "", timeline: "", message: "" });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "We couldn't submit your request. Try again later.");
    } finally {
      setSubmitting(false);
    }
  }

  function serviceTitleById(id: string) {
    for (const cat of SERVICE_CATEGORIES) {
      for (const s of cat.services) if (s.id === id) return s.title;
    }
    return id;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-12">
      <div className="max-w-7xl mx-auto">
        {/* Hero */}
        <header className="rounded-xl bg-white p-8 shadow-sm mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-extrabold">Build your product. Brand your business. Go global.</h1>
              <p className="mt-2 text-gray-600">Choose from our bouquet of services and request a custom quote.</p>
            </div>
            <div>
              <button
                onClick={() => window.scrollTo({ top: 500, behavior: "smooth" })}
                className="inline-flex items-center px-5 py-3 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left: catalogue */}
          <main className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {SERVICE_CATEGORIES.map((cat) => (
                <article key={cat.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold">{cat.title}</h3>
                      <p className="mt-1 text-sm text-gray-500">{cat.description}</p>
                    </div>
                    <div>
                      <button
                        onClick={() => setExpandedCategory((c) => (c === cat.id ? null : cat.id))}
                        className="text-sm text-indigo-600 hover:underline transition-colors"
                      >
                        {expandedCategory === cat.id ? "Hide" : "View"}
                      </button>
                    </div>
                  </div>

                  {expandedCategory === cat.id && (
                    <div className="mt-4 border-t pt-4">
                      <ul className="space-y-3">
                        {cat.services.map((s) => (
                          <li key={s.id} className="flex items-start gap-3">
                            <label className="flex items-center gap-3 cursor-pointer select-none hover:bg-gray-50 p-2 rounded transition-colors">
                              <input
                                type="checkbox"
                                checked={isSelected(s.id)}
                                onChange={() => toggleService(s.id)}
                                className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <div>
                                <div className="font-medium">{s.title}</div>
                                {/* optional short tooltip/desc area can be added here */}
                              </div>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </main>

          {/* Right: sticky quote cart */}
          <aside className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              <div className="bg-white rounded-lg shadow p-5">
                <h4 className="text-lg font-semibold">Quote Request</h4>
                <p className="text-sm text-gray-500 mt-1">Selected services</p>

                <div className="mt-4">
                  {selected.length === 0 ? (
                    <div className="text-sm text-gray-500">No services selected. Click "View" on a category to pick services.</div>
                  ) : (
                    <ul className="max-h-40 overflow-auto space-y-2">
                      {selected.map((s) => (
                        <li key={s} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <div className="text-sm">{serviceTitleById(s)}</div>
                          <button 
                            onClick={() => toggleService(s)} 
                            className="text-xs text-red-500 hover:text-red-700 transition-colors"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Full name *"
                    className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    name="company"
                    value={form.company}
                    onChange={handleChange}
                    placeholder="Company (optional)"
                    className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Email *"
                    className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Phone"
                    className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <select 
                      name="budget" 
                      value={form.budget} 
                      onChange={handleChange} 
                      className="border rounded px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Budget</option>
                      <option value="<5k">Less than $5K</option>
                      <option value="5k-20k">$5K - $20K</option>
                      <option value=">20k">$20K+</option>
                    </select>

                    <select 
                      name="timeline" 
                      value={form.timeline} 
                      onChange={handleChange} 
                      className="border rounded px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Timeline</option>
                      <option value="1-3">1 - 3 months</option>
                      <option value="3-6">3 - 6 months</option>
                      <option value="flexible">Flexible</option>
                    </select>
                  </div>

                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Project details / message"
                    className="w-full border rounded px-3 py-2 text-sm h-20 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />

                  {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
                  {success && <div className="text-sm text-green-600 bg-green-50 p-2 rounded">{success}</div>}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-60 hover:bg-indigo-700 transition-colors"
                  >
                    {submitting ? "Submitting..." : "Request Quote"}
                  </button>
                </form>
              </div>

              {/* Quick notes / contact card */}
              <div className="bg-white rounded-lg shadow p-4 text-sm">
                <div className="font-medium">Need help?</div>
                <p className="text-gray-600">Email <a href="mailto:sales@9qcinc.com" className="text-indigo-600 hover:underline">sales@9qcinc.com</a> or call +1 (639) 994-4721</p>
              </div>

              <div className="bg-white rounded-lg shadow p-4 text-xs text-gray-500">
                <div className="font-semibold">Privacy</div>
                <p className="mt-1">We will only use your contact details to reply to this quote request. For production, add GDPR / privacy policy links and consent checkboxes as needed.</p>
              </div>
            </div>
          </aside>
        </div>

        {/* Footer with simple summary */}
        <footer className="mt-10 text-sm text-gray-600">
          <div className="bg-white rounded-lg p-6 shadow">
            <h5 className="font-semibold">How it works</h5>
            <ol className="mt-2 list-decimal list-inside space-y-1">
              <li>Pick services from our bouquet.</li>
              <li>Complete the quote request form and submit.</li>
              <li>Our team reviews and will contact you with a tailored scope and quote.</li>
            </ol>
          </div>
        </footer>
      </div>
    </div>
  );
}