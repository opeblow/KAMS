export interface StorefrontBrief {
  businessName: string;
  businessType: string;
  offer: string;
  description: string;
  style: string;
  priceUsd: string;
}

export type PipelineStepStatus = "idle" | "running" | "completed" | "failed";

export interface PipelineStep {
  id: string;
  label: string;
  detail: string;
  status: PipelineStepStatus;
}

export interface BuildSuccess {
  type: "success";
  previewUrl: string;
  summary: string;
  checks: string[];
}

export interface BuildProgress {
  type: "progress";
  phase: string;
  message: string;
}

export interface BuildFailure {
  type: "error";
  message: string;
}

export type BuildEvent = BuildSuccess | BuildProgress | BuildFailure;
