"use client";

import { useState } from "react";
import { Header } from "../components/Header";
import { StorefrontForm } from "../components/StorefrontForm";
import { ExecutionPipeline } from "../components/ExecutionPipeline";
import { BrowserPreview } from "../components/BrowserPreview";
import type { BuildEvent, BuildProgress, BuildSuccess, PipelineStep, StorefrontBrief } from "../types";

const INITIAL_STEPS: PipelineStep[] = [
  { id: "brief", label: "Validate business brief", detail: "Checking the details you provided", status: "idle" },
  { id: "generate", label: "Generate storefront files", detail: "Writing and safety-checking static HTML and CSS", status: "idle" },
  { id: "sandbox", label: "Run in CreateOS Sandbox", detail: "Uploading files and starting the preview server", status: "idle" },
  { id: "checkout", label: "Connect Stripe test Checkout", detail: "Creating a one-time test payment for the featured offer", status: "idle" },
  { id: "verify", label: "Verify live preview", detail: "Checking the public page, business details, and Checkout link", status: "idle" },
];

function stepsForPhase(phase: string): PipelineStep[] {
  const runningIndex = phase === "generate" || phase === "repair" ? 1
    : phase === "sandbox" || phase === "upload" || phase === "run" ? 2
      : phase === "checkout" ? 3
        : phase === "check" ? 4 : -1;
  return INITIAL_STEPS.map((step, index) => ({
    ...step,
    status: phase === "done" || (runningIndex >= 0 && index < runningIndex)
      ? "completed"
      : index === runningIndex ? "running" : "idle",
  }));
}

export default function Home() {
  const [brief, setBrief] = useState<StorefrontBrief>({
    businessName: "",
    businessType: "",
    offer: "",
    description: "",
    style: "",
    priceUsd: "8.50",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [steps, setSteps] = useState<PipelineStep[]>(INITIAL_STEPS);
  const [statusMessage, setStatusMessage] = useState<string>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [summary, setSummary] = useState<string>();
  const [checks, setChecks] = useState<string[]>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setSteps(INITIAL_STEPS);
    setStatusMessage("Sending your brief to Kams.");
    setPreviewUrl(undefined);
    setSummary(undefined);
    setChecks(undefined);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify(brief),
      });
      if (!response.ok) {
        const failure = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(failure?.error ?? "Kams could not accept this brief. Check the fields and try again.");
      }
      if (!response.body) throw new Error("Kams could not open the build progress stream. Please try again.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completed = false;

      const processEvent = (block: string) => {
        const data = block.split(/\r?\n/).find((line) => line.startsWith("data: "))?.slice(6);
        if (!data) return;
        const message = JSON.parse(data) as BuildEvent;
        if (message.type === "progress") {
          const progress = message as BuildProgress;
          setSteps(stepsForPhase(progress.phase));
          setStatusMessage(progress.message);
        } else if (message.type === "success") {
          const result = message as BuildSuccess;
          setSteps(stepsForPhase("done"));
          setPreviewUrl(result.previewUrl);
          setSummary(result.summary);
          setChecks(result.checks);
          setStatusMessage("The live Sandbox preview passed its checks.");
          completed = true;
        } else {
          setErrorMessage(message.message);
          setSteps((current) => current.map((step) => step.status === "running" ? { ...step, status: "failed" } : step));
          setStatusMessage("The build stopped before a verified preview was ready.");
          completed = true;
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() ?? "";
        blocks.forEach(processEvent);
        if (done) break;
      }
      if (buffer.trim()) processEvent(buffer);
      if (!completed) throw new Error("The build ended before Kams returned a result. Please try again.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kams could not complete this build. Please try again.";
      setErrorMessage(message);
      setSteps((current) => current.map((step) => step.status === "running" ? { ...step, status: "failed" } : step));
      setStatusMessage("The build did not produce a verified preview.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/70">
      <Header />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:flex-row">
        <div className="w-full shrink-0 space-y-6 lg:w-[420px]">
          <StorefrontForm brief={brief} onChange={setBrief} onSubmit={handleSubmit} isLoading={isLoading} />
          <ExecutionPipeline steps={steps} active={isLoading} statusMessage={statusMessage} />
        </div>
        <div className="flex min-w-0 flex-1">
          <BrowserPreview previewUrl={previewUrl} isLoading={isLoading} summary={summary} checks={checks} errorMessage={errorMessage} />
        </div>
      </main>
    </div>
  );
}
