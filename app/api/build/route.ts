import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { briefSchema, buildStorefront, type BuildEvent } from "../../../lib/storefront";

export const runtime = "nodejs";
export const maxDuration = 300;
let buildRunning = false;

export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 8_000) return Response.json({ error: "The business brief is too large." }, { status: 413 });
  let input: unknown;
  try { input = JSON.parse(raw); }
  catch { return Response.json({ error: "Send the business brief as JSON." }, { status: 400 }); }
  const parsed = briefSchema.safeParse(input);
  if (!parsed.success) return Response.json({ error: "Add a business name and type, at least one product or service with a name and price, a description, and a style within the field limits." }, { status: 400 });
  if (buildRunning) return Response.json({ error: "A storefront build is already running. Wait for it to finish before starting another." }, { status: 429 });
  buildRunning = true;

  const encoder = new TextEncoder();
  let disconnected = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: object) => {
        if (!disconnected) controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      let stage = "starting";
      void (async () => {
        try {
          const result = await buildStorefront(parsed.data, (event: BuildEvent) => {
            stage = event.phase;
            send({ type: "progress", ...event });
          });
          send({ type: "success", ...result });
        } catch (error) {
          const providerError = error as Error & { status?: number; statusCode?: number; code?: string; retryAfterSeconds?: number; cause?: { code?: string } };
          const knownBuildErrors = [
            "Claude generation did not finish the storefront tool call.",
            "Claude did not return storefront files.",
            "Generated files did not pass the safety check.",
            "Generated page included active or remote content that Kams does not allow.",
            "The generated page is missing the business name or a product/service name.",
            "The generated page must include the product cards insertion point exactly once.",
            "The Sandbox could not prepare a directory for the storefront.",
            "The Sandbox could not start its web server.",
            "The preview server started, but its public URL did not respond successfully.",
            "The preview responded, but the business details, products, or Stripe Pay now links were missing from the served page.",
          ];
          const knownReason = error instanceof Error && knownBuildErrors.includes(error.message) ? error.message : undefined;
          const providerMessage = providerError?.message;
          const connectionFailure = providerError?.name === "APIConnectionError" || providerMessage === "Connection error.";
          const stripeFailure = stage === "checkout";
          const sandboxRateLimit = stage === "sandbox" && (providerError?.statusCode === 429 || providerError?.name === "CreateosSandboxRateLimitError");
          const liveStripeKeyRejected = providerMessage === "Kams only accepts a Stripe test-mode secret key. Do not use a live key.";
          console.warn("Kams build failed:", {
            stage,
            name: providerError?.name,
            status: providerError?.statusCode ?? providerError?.status,
            retryAfterSeconds: providerError?.retryAfterSeconds,
            code: providerError?.code ?? providerError?.cause?.code,
            reason: knownReason ?? (connectionFailure ? "The server could not connect to the AI provider." : stripeFailure ? "Stripe test Checkout setup failed." : liveStripeKeyRejected ? "A non-test Stripe key was rejected." : undefined),
          });
          const safeMessage = error instanceof ZodError
            ? "Generated storefront files did not match the allowed format."
            : connectionFailure
              ? "Kams could not reach Claude. Check that this computer's network allows the local server to make outbound API requests, then try again."
            : stripeFailure
              ? "Stripe could not create the test Checkout page. Check the local Stripe test-mode key and account setup."
            : sandboxRateLimit
              ? "CreateOS is rate-limiting new Sandboxes. Check the number of running Sandboxes and your account limit, then try again."
            : liveStripeKeyRejected
              ? "The Stripe key in .env is not a test-mode key. Select the KAMS test environment in Stripe Dashboard and use its test secret key (starts with sk_test_)."
            : error instanceof Error && /ANTHROPIC_API_KEY|CREATEOS_API_KEY|STRIPE_SECRET_KEY/.test(error.message)
              ? error.message
              : knownReason
                ? knownReason
              : "Kams could not complete this build. Check the local server logs and try again.";
          if (error instanceof ZodError) {
            console.warn("Kams generated-output validation:", error.issues.map((issue) => ({ path: issue.path.join("."), code: issue.code })));
          }
          send({ type: "error", message: safeMessage });
        } finally {
          buildRunning = false;
          if (!disconnected) controller.close();
        }
      })();
    },
    cancel() { disconnected = true; },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Content-Type-Options": "nosniff" } });
}
