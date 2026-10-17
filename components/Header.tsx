import React from "react";
import { Sparkles, Terminal, ShieldCheck } from "lucide-react";

export const Header: React.FC = () => {
  return (
    <header className="h-16 border-b border-slate-200/80 bg-white/90 backdrop-blur-sm px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-900 tracking-tight text-lg">Kams</span>
            <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
              Studio
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4 text-xs text-slate-500 font-medium">
        <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-slate-700">CreateOS Sandbox Engine</span>
        </div>
        <div className="hidden sm:flex items-center space-x-1 text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
          <span>Stripe Projects Integrated</span>
        </div>
      </div>
    </header>
  );
};
