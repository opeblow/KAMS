import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@nodeops-createos/sandbox";
import Stripe from "stripe";
import { z } from "zod";

const briefInputSchema = z.object({
  businessName: z.string().trim().min(1).max(80),
  businessType: z.string().trim().min(1).max(80),
  offer: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(500),
  style: z.string().trim().min(1).max(120),
  priceUsd: z.string().trim().regex(/^\d{1,5}(?:\.\d{1,2})?$/).refine((value) => {
    const cents = Math.round(Number(value) * 100);
    return cents >= 50 && cents <= 1_000_000;
  }),
});
export const briefSchema = briefInputSchema.transform(({ priceUsd, ...brief }) => ({
  ...brief,
  priceCents: Math.round(Number(priceUsd) * 100),
}));
export type Brief = z.infer<typeof briefSchema>;

const outputSchema = z.object({
  files: z.object({
    "index.html": z.string().min(1).max(30_000),
    "styles.css": z.string().min(1).max(30_000),
  }).strict(),
  summary: z.string().min(1).max(500),
}).strict();

export type BuildEvent = { phase: string; message: string };
export type BuildResult = { previewUrl: string; summary: string; checks: string[] };
type Notify = (event: BuildEvent) => void;

const allowedFiles = new Set(["index.html", "styles.css"]);
let retainedSandbox: { destroy: () => Promise<unknown> } | undefined;

function normalizedVisibleText(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/&amp;/gi, "&").replace(/&nbsp;/gi, " ").replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n))).replace(/\s+/g, " ").toLocaleLowerCase();
}

function containsBriefDetails(markup: string, brief: Brief) {
  const text = normalizedVisibleText(markup);
  const offerTerms = [...new Set(normalizedVisibleText(brief.offer).match(/[a-z0-9]{4,}/g) ?? [])];
  const matchingTerms = offerTerms.filter((term) => text.includes(term)).length;
  const enoughOfferDetail = offerTerms.length === 0 || matchingTerms >= Math.min(2, Math.ceil(offerTerms.length * 0.6));
  return text.includes(normalizedVisibleText(brief.businessName)) && enoughOfferDetail;
}

function validateGenerated(value: unknown, brief: Brief) {
  const parsed = outputSchema.parse(value);
  for (const [filename, content] of Object.entries(parsed.files)) {
    if (!allowedFiles.has(filename) || content.length > 30_000) throw new Error("Generated files did not pass the safety check.");
  }
  const html = parsed.files["index.html"];
  const css = parsed.files["styles.css"];
  const forbiddenHtml = /<(script|iframe|object|embed|form|base|svg|img|picture|video|audio|source)\b|\son[a-z]+\s*=|\s(src|srcset|style)\s*=|javascript:|data:text\/html|<meta[^>]+http-equiv/i;
  const linkTags = [...html.matchAll(/<link\b[^>]*>/gi)].map(([tag]) => tag);
  const hasUnsafeStylesheet = linkTags.some((tag) => !/^<link\b(?=[^>]*\brel=["']stylesheet["'])(?=[^>]*\bhref=["'](?:\.\/)?styles\.css["'])[^>]*\/?>$/i.test(tag));
  const anchors = [...html.matchAll(/<a\b[^>]*>/gi)].map(([tag]) => tag);
  const hasUnsafeLink = anchors.some((tag) => {
    const href = tag.match(/\bhref\s*=\s*["']([^"']*)["']/i)?.[1];
    return !href?.startsWith("#");
  });
  const forbiddenCss = /@import|url\s*\(|expression\s*\(|-moz-binding/i;
  if (forbiddenHtml.test(html) || forbiddenCss.test(css) || hasUnsafeStylesheet || hasUnsafeLink || /<style\b/i.test(html)) {
    throw new Error("Generated page included active or remote content that Kams does not allow.");
  }
  if (!containsBriefDetails(html, brief)) {
    throw new Error("The generated page is missing the business name or offer.");
  }
  return parsed;
}

async function generate(brief: Brief, correction?: string) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Add ANTHROPIC_API_KEY to the local .env file before generating a storefront.");
  const anthropic = new Anthropic({ apiKey: key, timeout: 120_000, maxRetries: 0 });
  const result = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
    max_tokens: 8000,
    system: "Create a polished, responsive, static storefront for a small business. Return only the requested JSON tool input. Keep the HTML and CSS concise (about 100 lines each maximum). Use semantic HTML and local CSS. Do not include JavaScript, forms, external assets, remote URLs, or claims of real payment processing. Include the exact business name and offer in visible page text.",
    messages: [{ role: "user", content: `Business name: ${brief.businessName}\nBusiness type: ${brief.businessType}\nOffer: ${brief.offer}\nPrice: $${(brief.priceCents / 100).toFixed(2)} USD\nDescription: ${brief.description}\nVisual style: ${brief.style}${correction ? `\n\nCorrection required: The previous draft failed validation (${correction}). Regenerate both complete files. Link the stylesheet using only <link rel="stylesheet" href="styles.css">. Remove scripts, forms, images, SVG, embeds, iframes, inline style attributes/blocks, remote URLs, event attributes, and CSS url()/@import. Links must be local fragment links such as href="#details". Keep the exact business name and recognizable offer terms visible.` : ""}` }],
    tools: [{
      name: "write_storefront",
      description: "Return the two static storefront files and a concise summary.",
      input_schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          files: {
            type: "object", additionalProperties: false,
            properties: {
              "index.html": { type: "string" },
              "styles.css": { type: "string" },
            }, required: ["index.html", "styles.css"],
          },
          summary: { type: "string" },
        }, required: ["files", "summary"],
      },
    }],
    tool_choice: { type: "tool", name: "write_storefront" },
  });
  if (result.stop_reason !== "tool_use") throw new Error("Claude generation did not finish the storefront tool call.");
  const tool = result.content.find((part) => part.type === "tool_use");
  if (!tool || tool.type !== "tool_use") throw new Error("Claude did not return storefront files.");
  return validateGenerated(tool.input, brief);
}

export async function buildStorefront(brief: Brief, notify: Notify): Promise<BuildResult> {
  const apiKey = process.env.CREATEOS_API_KEY || process.env.CREATEOS_SANDBOX_API_KEY;
  if (!apiKey) throw new Error("Stripe Projects has not supplied CREATEOS_API_KEY. Check the Kams project setup locally.");
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) throw new Error("Add STRIPE_SECRET_KEY from your Stripe test-mode API keys to the ignored local .env file.");
  if (!stripeKey.startsWith("sk_test_")) throw new Error("Kams only accepts a Stripe test-mode secret key. Do not use a live key.");
  notify({ phase: "generate", message: "Asking Claude to write the storefront files." });
  let generated: ReturnType<typeof validateGenerated>;
  try {
    generated = await generate(brief);
  } catch (error) {
    const repairable = error instanceof z.ZodError || (error instanceof Error && [
      "Claude generation did not finish the storefront tool call.",
      "Generated files did not pass the safety check.",
      "Generated page included active or remote content that Kams does not allow.",
      "The generated page is missing the business name or offer.",
    ].includes(error.message));
    if (!repairable) throw error;
    notify({ phase: "repair", message: "The first draft missed an automated content check; asking Claude for one corrected draft." });
    generated = await generate(brief, error instanceof Error ? error.message : "the output schema was invalid");
  }

  notify({ phase: "sandbox", message: "Creating a free CreateOS Sandbox for this storefront." });
  const client = createClient({ apiKey });
  const sandbox = await client.createSandbox({
    name: `kams-${Date.now()}`,
    shape: "s-1vcpu-1gb",
    rootfs: "devbox:1",
    ingress_enabled: false,
  });
  const stripe = new Stripe(stripeKey);
  let keep = false;
  let checkoutSessionId: string | undefined;
  try {
    notify({ phase: "upload", message: "Uploading the checked HTML and CSS to CreateOS." });
    const directory = await sandbox.runCommand("mkdir", ["-p", "/tmp/kams-site"]);
    if (directory.result.exit_code !== 0) throw new Error("The Sandbox could not prepare a directory for the storefront.");
    await sandbox.files.upload("/tmp/kams-site/index.html", generated.files["index.html"]);
    await sandbox.files.upload("/tmp/kams-site/styles.css", generated.files["styles.css"]);

    notify({ phase: "run", message: "Starting the static web server inside the Sandbox." });
    const command = "nohup python3 -m http.server 4173 --bind 0.0.0.0 --directory /tmp/kams-site >/tmp/kams-http.log 2>&1 </dev/null &";
    const start = await sandbox.runCommand("sh", ["-c", command], { timeoutMs: 10_000 });
    if (start.result.exit_code !== 0) throw new Error("The Sandbox could not start its web server.");

    notify({ phase: "check", message: "Waiting for the server, then checking its response." });
    await sandbox.waitForPortReady(4173, { timeoutMs: 45_000 });
    await sandbox.setIngress(true);
    const previewUrl = sandbox.previewUrl(4173, { scheme: "https" });
    notify({ phase: "checkout", message: "Creating a Stripe test-mode Checkout Session for the featured offer." });
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: brief.priceCents,
          product_data: {
            name: `${brief.businessName}: ${brief.offer}`.slice(0, 250),
            description: brief.description.slice(0, 500),
          },
        },
      }],
      success_url: `${previewUrl}/checkout-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${previewUrl}/checkout-cancelled.html`,
      metadata: { business_name: brief.businessName },
    });
    checkoutSessionId = session.id;
    if (!session.url || !session.url.startsWith("https://checkout.stripe.com/")) {
      throw new Error("Stripe did not return a hosted test Checkout URL.");
    }
    const checkoutMarkup = `\n<section class="kams-checkout" aria-label="Stripe test checkout"><p><strong>Demo checkout — Stripe test mode</strong></p><p>One ${escapeHtml(brief.offer)} for $${(brief.priceCents / 100).toFixed(2)} USD.</p><a class="kams-checkout-button" href="${escapeHtml(session.url)}" target="_blank" rel="noopener noreferrer">Continue to secure checkout</a></section>\n`;
    const checkoutHtml = generated.files["index.html"].replace(/<\/body\s*>/i, `${checkoutMarkup}</body>`);
    if (checkoutHtml === generated.files["index.html"]) throw new Error("The generated page did not include a body element for the Checkout button.");
    const checkoutCss = `\n.kams-checkout{margin:2rem auto;padding:1.25rem;max-width:40rem;border:1px solid #cbd5e1;border-radius:1rem;background:#f8fafc;color:#0f172a}.kams-checkout-button{display:inline-block;padding:.8rem 1.1rem;border-radius:.7rem;background:#4f46e5;color:#fff;text-decoration:none;font-weight:700}.kams-return-page{margin:10vh auto;padding:2rem;max-width:42rem;border:1px solid #cbd5e1;border-radius:1.25rem;background:#fff;color:#0f172a;box-shadow:0 18px 50px #0f172a12}.kams-return-label{color:#4f46e5;font-size:.8rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase}\n`;
    await sandbox.files.upload("/tmp/kams-site/index.html", checkoutHtml);
    await sandbox.files.upload("/tmp/kams-site/styles.css", `${generated.files["styles.css"]}${checkoutCss}`);
    await sandbox.files.upload("/tmp/kams-site/checkout-success.html", checkoutReturnPage("success", brief.businessName));
    await sandbox.files.upload("/tmp/kams-site/checkout-cancelled.html", checkoutReturnPage("cancelled", brief.businessName));
    notify({ phase: "check", message: "Checking the public storefront and its Stripe Checkout link." });
    let response: Response | undefined;
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        response = await fetch(previewUrl, { signal: AbortSignal.timeout(8_000), cache: "no-store" });
        if (response.ok) break;
      } catch { /* ingress and TLS can take a moment to become ready */ }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    if (!response?.ok) throw new Error("The preview server started, but its public URL did not respond successfully.");
    const served = await response.text();
    if (!containsBriefDetails(served, brief) || !served.includes(escapeHtml(session.url))) {
      throw new Error("The preview responded, but the business details or Stripe Checkout link were missing from the served page.");
    }
    const [successResponse, cancelledResponse] = await Promise.all([
      fetch(`${previewUrl}/checkout-success.html`, { signal: AbortSignal.timeout(8_000), cache: "no-store" }),
      fetch(`${previewUrl}/checkout-cancelled.html`, { signal: AbortSignal.timeout(8_000), cache: "no-store" }),
    ]);
    if (!successResponse.ok || !(await successResponse.text()).includes("Test checkout complete")) {
      throw new Error("The Stripe success return page was not available in the preview.");
    }
    if (!cancelledResponse.ok || !(await cancelledResponse.text()).includes("Checkout cancelled")) {
      throw new Error("The Stripe cancellation return page was not available in the preview.");
    }
    keep = true;
    const previous = retainedSandbox;
    retainedSandbox = sandbox;
    if (previous) void previous.destroy().catch(() => undefined);
    notify({ phase: "done", message: "The storefront passed its live preview check." });
    return { previewUrl, summary: generated.summary, checks: ["CreateOS Sandbox server started", "Public preview returned HTTP success", "Business name and offer appeared in served HTML", "Stripe test-mode Checkout link verified", "Stripe success and cancellation return pages verified"] };
  } finally {
    if (!keep) {
      if (checkoutSessionId) await stripe.checkout.sessions.expire(checkoutSessionId).catch(() => undefined);
      await sandbox.destroy().catch(() => undefined);
    }
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

function checkoutReturnPage(state: "success" | "cancelled", businessName: string) {
  const success = state === "success";
  const title = success ? "Test checkout complete" : "Checkout cancelled";
  const message = success
    ? "Your Stripe test checkout was completed. No real payment was taken."
    : "No payment was made. You can return to the storefront whenever you are ready.";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} | ${escapeHtml(businessName)}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <main class="kams-return-page" role="main">
    <p class="kams-return-label">Stripe test mode</p>
    <h1>${title}</h1>
    <p>${message}</p>
    <a class="kams-checkout-button" href="/">Back to ${escapeHtml(businessName)}</a>
  </main>
</body>
</html>`;
}
