import React from "react";
import { PipelineStep } from "@/types";
import { CheckCircle2, Clock, Loader2, AlertCircle, Terminal } from "lucide-react";

interface ExecutionPipelineProps {
  steps: PipelineStep[];
  active: boolean;
  statusMessage?: string;
}

export const ExecutionPipeline: React.FC<ExecutionPipelineProps> = ({ steps, active, statusMessage }) => {
  if (!active && steps.every((s) => s.status === "idle")) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
            Sandbox Execution Pipeline
          </h3>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">CreateOS Engine</span>
      </div>

      <div className="space-y-3">
        {steps.map((step, idx) => {
          return (
            <div
              key={step.id}
              className={`flex items-start space-x-3 text-xs transition-opacity ${
                step.status === "idle" ? "opacity-40" : "opacity-100"
              }`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {step.status === "completed" && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                )}
                {step.status === "running" && (
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                )}
                {step.status === "failed" && (
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                )}
                {step.status === "idle" && (
                  <Clock className="w-4 h-4 text-slate-300" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p
                    className={`font-medium ${
                      step.status === "completed"
                        ? "text-slate-800"
                        : step.status === "running"
                        ? "text-indigo-600 font-semibold"
                        : step.status === "failed"
                        ? "text-rose-600"
                        : "text-slate-500"
                    }`}
                  >
                    {step.label}
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono">Step {idx + 1}/{steps.length}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">{step.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
      {statusMessage && <p className="border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-600" role="status" aria-live="polite">{statusMessage}</p>}
    </div>
  );
};
