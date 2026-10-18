import React from "react";
import { StorefrontBrief, StorefrontProduct } from "@/types";
import { Layers, Plus, RefreshCw, Sparkles, Trash2, Wand2 } from "lucide-react";

interface StorefrontFormProps {
  brief: StorefrontBrief;
  onChange: (brief: StorefrontBrief) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

const PRESETS: { name: string; brief: StorefrontBrief }[] = [
  {
    name: "Butter & Bloom Bakery",
    brief: {
      businessName: "Butter & Bloom",
      businessType: "Artisan Bakery & Botanical Cafe",
      products: [
        { id: "sourdough", name: "Country Sourdough Loaf", description: "Naturally leavened and baked fresh each morning.", priceUsd: "8.50" },
        { id: "pastry-box", name: "Seasonal Pastry Box", description: "A box of six pastries made with seasonal ingredients.", priceUsd: "18.00" },
        { id: "matcha", name: "Iced Matcha Latte", description: "Ceremonial matcha whisked with your choice of milk.", priceUsd: "6.50" },
      ],
      description: "A neighborhood bakery making naturally leavened sourdough, pastries, and matcha each morning.",
      style: "Warm rustic minimalism with editorial serif typography and soft wheat tones",
    },
  },
  {
    name: "The Cut & Co. Barber",
    brief: {
      businessName: "The Cut & Co.",
      businessType: "Modern Barber Shop",
      products: [
        { id: "skin-fade", name: "Skin Fade", description: "A clean, tailored fade finished with a hot towel.", priceUsd: "35.00" },
        { id: "beard-trim", name: "Beard Trim", description: "Shape and detail with a straight-razor finish.", priceUsd: "20.00" },
      ],
      description: "A neighborhood grooming studio offering precise cuts, beard care, and a relaxed appointment experience.",
      style: "Clean monochrome with high-contrast typography and subtle slate accents",
    },
  },
];

const fieldClass = "w-full text-sm rounded-lg border border-slate-300/80 px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition bg-white disabled:bg-slate-50";

export const StorefrontForm: React.FC<StorefrontFormProps> = ({ brief, onChange, onSubmit, isLoading }) => {
  const handlePresetSelect = (preset: StorefrontBrief) => onChange(preset);

  function updateProduct(id: string, changes: Partial<StorefrontProduct>) {
    onChange({
      ...brief,
      products: brief.products.map((product) => product.id === id ? { ...product, ...changes } : product),
    });
  }

  function addProduct() {
    if (brief.products.length >= 6) return;
    onChange({
      ...brief,
      products: [...brief.products, { id: crypto.randomUUID(), name: "", description: "", priceUsd: "" }],
    });
  }

  function removeProduct(id: string) {
    if (brief.products.length <= 1) return;
    onChange({ ...brief, products: brief.products.filter((product) => product.id !== id) });
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6">
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" /> Storefront Brief
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Describe your business and the items customers can buy.</p>
        </div>
        <div className="pt-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Instant Demo Presets</div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button key={preset.name} type="button" onClick={() => handlePresetSelect(preset.brief)} disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200/80 transition-colors disabled:opacity-50">
                <Wand2 className="w-3 h-3 text-indigo-500" /> {preset.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="business-name" className="block text-xs font-medium text-slate-700 mb-1.5">Brand Name</label>
          <input id="business-name" type="text" required maxLength={80} value={brief.businessName}
            onChange={(e) => onChange({ ...brief, businessName: e.target.value })} placeholder="e.g. Butter & Bloom"
            disabled={isLoading} className={fieldClass} />
        </div>

        <div>
          <label htmlFor="business-type" className="block text-xs font-medium text-slate-700 mb-1.5">Business Category</label>
          <input id="business-type" type="text" required maxLength={80} value={brief.businessType}
            onChange={(e) => onChange({ ...brief, businessType: e.target.value })} placeholder="e.g. Artisan Bakery & Cafe"
            disabled={isLoading} className={fieldClass} />
        </div>

        <section aria-labelledby="products-heading" className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h3 id="products-heading" className="text-xs font-semibold text-slate-800">Products & services</h3>
              <p className="mt-1 text-[11px] text-slate-500">Each item gets its own Stripe test-mode Pay now button.</p>
            </div>
            <span className="shrink-0 text-[11px] text-slate-400">{brief.products.length}/6</span>
          </div>

          <div className="space-y-3">
            {brief.products.map((product, index) => (
              <fieldset key={product.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
                <legend className="sr-only">Product or service {index + 1}</legend>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Item {index + 1}</span>
                  <button type="button" onClick={() => removeProduct(product.id)} disabled={isLoading || brief.products.length <= 1}
                    aria-label={`Remove item ${index + 1}`} className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div>
                  <label htmlFor={`product-name-${product.id}`} className="block text-[11px] font-medium text-slate-700 mb-1">Name</label>
                  <input id={`product-name-${product.id}`} type="text" required maxLength={100} value={product.name}
                    onChange={(e) => updateProduct(product.id, { name: e.target.value })} placeholder="e.g. Country Sourdough Loaf"
                    disabled={isLoading} className={fieldClass} />
                </div>
                <div>
                  <label htmlFor={`product-description-${product.id}`} className="block text-[11px] font-medium text-slate-700 mb-1">Short description <span className="font-normal text-slate-400">(optional)</span></label>
                  <textarea id={`product-description-${product.id}`} rows={2} maxLength={240} value={product.description}
                    onChange={(e) => updateProduct(product.id, { description: e.target.value })} placeholder="A brief detail customers should know"
                    disabled={isLoading} className={`${fieldClass} resize-none`} />
                </div>
                <div>
                  <label htmlFor={`product-price-${product.id}`} className="block text-[11px] font-medium text-slate-700 mb-1">Price (USD)</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-2.5 text-sm text-slate-500">$</span>
                    <input id={`product-price-${product.id}`} type="number" required min="0.50" max="10000" step="0.01" value={product.priceUsd}
                      onChange={(e) => updateProduct(product.id, { priceUsd: e.target.value })} placeholder="8.50"
                      disabled={isLoading} className={`${fieldClass} pl-7`} />
                  </div>
                </div>
              </fieldset>
            ))}
          </div>

          <button type="button" onClick={addProduct} disabled={isLoading || brief.products.length >= 6}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
            <Plus className="h-3.5 w-3.5" /> Add product or service
          </button>
          <p className="text-[11px] text-slate-500">One-time payments. Stripe stays in test mode.</p>
        </section>

        <div>
          <label htmlFor="business-description" className="block text-xs font-medium text-slate-700 mb-1.5">Business Description</label>
          <textarea id="business-description" rows={3} required maxLength={500} value={brief.description}
            onChange={(e) => onChange({ ...brief, description: e.target.value })} placeholder="What makes the business special?"
            disabled={isLoading} className={`${fieldClass} resize-none`} />
        </div>

        <div>
          <label htmlFor="business-style" className="block text-xs font-medium text-slate-700 mb-1.5">Design Direction</label>
          <input id="business-style" type="text" required maxLength={120} value={brief.style}
            onChange={(e) => onChange({ ...brief, style: e.target.value })} placeholder="e.g. Warm editorial, soft earthy colors"
            disabled={isLoading} className={fieldClass} />
        </div>

        <div className="pt-2">
          <button type="submit" disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-medium text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer">
            {isLoading ? <><RefreshCw className="w-4 h-4 animate-spin text-indigo-400" /><span>Executing Sandbox Pipeline...</span></>
              : <><Sparkles className="w-4 h-4 text-indigo-400 transition-transform group-hover:scale-110" /><span>Generate Storefront Preview</span></>}
          </button>
        </div>
      </form>
    </div>
  );
};
