import React from "react";
import { StorefrontBrief } from "@/types";
import { Sparkles, Wand2, RefreshCw, Layers } from "lucide-react";

interface StorefrontFormProps {
  brief: StorefrontBrief;
  onChange: (brief: StorefrontBrief) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

const PRESETS = [
  {
    name: "Butter & Bloom Bakery",
      brief: {
      businessName: "Butter & Bloom",
      businessType: "Artisan Bakery & Botanical Cafe",
      offer: "Sourdough loaves and seasonal pastries",
      description: "A neighborhood bakery making naturally leavened sourdough, pastries, and matcha each morning.",
      style: "Warm rustic minimalism with editorial serif typography and soft wheat tones",
      priceUsd: "8.50",
    },
  },
  {
    name: "The Cut & Co. Barber",
      brief: {
      businessName: "The Cut & Co.",
      businessType: "Modern Barber Shop",
      offer: "Skin fades and hot towel beard trims",
      description: "A neighborhood grooming studio offering precise cuts, beard care, and a relaxed appointment experience.",
      style: "Clean monochrome with high-contrast typography and subtle slate accents",
      priceUsd: "35.00",
    },
  },
];

export const StorefrontForm: React.FC<StorefrontFormProps> = ({
  brief,
  onChange,
  onSubmit,
  isLoading,
}) => {
  const handlePresetSelect = (preset: typeof PRESETS[0]["brief"]) => {
    onChange(preset);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6">
      {/* Header & Preset Shortcuts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Storefront Brief
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Specify your brand profile to generate an instant sandboxed preview.
            </p>
          </div>
        </div>

        {/* Quick Sample Presets */}
        <div className="pt-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Instant Demo Presets
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handlePresetSelect(preset.brief)}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200/80 transition-colors disabled:opacity-50"
              >
                <Wand2 className="w-3 h-3 text-indigo-500" />
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Business Name */}
        <div>
          <label htmlFor="business-name" className="block text-xs font-medium text-slate-700 mb-1.5">
            Brand Name
          </label>
          <input
            id="business-name"
            type="text"
            required
            maxLength={80}
            value={brief.businessName}
            onChange={(e) => onChange({ ...brief, businessName: e.target.value })}
            placeholder="e.g. Butter & Bloom"
            disabled={isLoading}
            className="w-full text-sm rounded-lg border border-slate-300/80 px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition bg-white disabled:bg-slate-50"
          />
        </div>

        {/* Business Type */}
        <div>
          <label htmlFor="business-type" className="block text-xs font-medium text-slate-700 mb-1.5">
            Business Category
          </label>
          <input
            id="business-type"
            type="text"
            required
            maxLength={80}
            value={brief.businessType}
            onChange={(e) => onChange({ ...brief, businessType: e.target.value })}
            placeholder="e.g. Artisan Bakery & Cafe"
            disabled={isLoading}
            className="w-full text-sm rounded-lg border border-slate-300/80 px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition bg-white disabled:bg-slate-50"
          />
        </div>

        {/* Products */}
        <div>
          <label htmlFor="business-offer" className="block text-xs font-medium text-slate-700 mb-1.5">
            Main Product or Service
          </label>
          <textarea
            id="business-offer"
            rows={3}
            required
            maxLength={160}
            value={brief.offer}
            onChange={(e) => onChange({ ...brief, offer: e.target.value })}
            placeholder="e.g. Sourdough bread and seasonal pastries"
            disabled={isLoading}
            className="w-full text-sm rounded-lg border border-slate-300/80 px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition bg-white resize-none disabled:bg-slate-50"
          />
        </div>

        <div>
          <label htmlFor="business-price" className="block text-xs font-medium text-slate-700 mb-1.5">
            Featured Item Price (USD)
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-2.5 text-sm text-slate-500">$</span>
            <input
              id="business-price"
              type="number"
              required
              min="0.50"
              max="10000"
              step="0.01"
              value={brief.priceUsd}
              onChange={(e) => onChange({ ...brief, priceUsd: e.target.value })}
              placeholder="8.50"
              disabled={isLoading}
              className="w-full text-sm rounded-lg border border-slate-300/80 pl-7 pr-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition bg-white disabled:bg-slate-50"
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">One-time payment; checkout is in Stripe test mode.</p>
        </div>

        {/* Aesthetic Style */}
        <div>
          <label htmlFor="business-description" className="block text-xs font-medium text-slate-700 mb-1.5">
            Business Description
          </label>
          <textarea
            id="business-description"
            rows={3}
            required
            maxLength={500}
            value={brief.description}
            onChange={(e) => onChange({ ...brief, description: e.target.value })}
            placeholder="What makes the business and its offer special?"
            disabled={isLoading}
            className="w-full text-sm rounded-lg border border-slate-300/80 px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition bg-white disabled:bg-slate-50"
          />
        </div>

        <div>
          <label htmlFor="business-style" className="block text-xs font-medium text-slate-700 mb-1.5">
            Design Direction
          </label>
          <input
            id="business-style"
            type="text"
            required
            maxLength={120}
            value={brief.style}
            onChange={(e) => onChange({ ...brief, style: e.target.value })}
            placeholder="e.g. Warm editorial, soft earthy colors"
            disabled={isLoading}
            className="w-full text-sm rounded-lg border border-slate-300/80 px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition bg-white disabled:bg-slate-50"
          />
        </div>

        {/* Primary Action Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-medium text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                <span>Executing Sandbox Pipeline...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-indigo-400 transition-transform group-hover:scale-110" />
                <span>Generate Storefront Preview</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
