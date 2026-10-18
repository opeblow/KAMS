import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@nodeops-createos/sandbox";
import Stripe from "stripe";
import { z } from "zod";

const productInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(240).default(""),
  priceUsd: z.string().trim().regex(/^\d{1,5}(?:\.\d{1,2})?$/).refine((value) => {
    const cents = Math.round(Number(value) * 100);
    return cents >= 50 && cents <= 1_000_000;
  }),
}).strict();

const briefInputSchema = z.object({
  businessName: z.string().trim().min(1).max(80),
  businessType: z.string().trim().min(1).max(80),
  products: z.array(productInputSchema).min(1).max(6),
  description: z.string().trim().min(1).max(500),
  style: z.string().trim().min(1).max(120),
}).strict();

export const briefSchema = briefInputSchema.transform(({ products, ...brief }) => ({
  ...brief,
  products: products.map(({ priceUsd, ...product }) => ({
    ...product,
    priceCents: Math.round(Number(priceUsd) * 100),
  })),
}));
export type Brief = z.infer<typeof briefSchema>;
type Product = Brief["products"][number];

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
const productGridMarker = "<!-- KAMS_PRODUCT_GRID -->";
let retainedSandbox: { destroy: () => Promise<unknown> } | undefined;

function normalizedVisibleText(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/&amp;/gi, "&").replace(/&nbsp;/gi, " ").replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n))).replace(/\s+/g, " ").toLocaleLowerCase();
}

function containsBusinessName(markup: string, brief: Brief) {
  return normalizedVisibleText(markup).includes(normalizedVisibleText(brief.businessName));
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
  const markerCount = html.split(productGridMarker).length - 1;
  if (forbiddenHtml.test(html) || forbiddenCss.test(css) || hasUnsafeStylesheet || hasUnsafeLink || /<style\b/i.test(html)) {
    throw new Error("Generated page included active or remote content that Kams does not allow.");
  }
  if (!containsBusinessName(html, brief)) {
    throw new Error("The generated page is missing the business name or a product/service name.");
  }
  if (markerCount !== 1) {
    throw new Error("The generated page must include the product cards insertion point exactly once.");
  }
  return parsed;
}

async function generate(brief: Brief, correction?: string) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Add ANTHROPIC_API_KEY to the local .env file before generating a storefront.");
  const anthropic = new Anthropic({ apiKey: key, timeout: 120_000, maxRetries: 0 });
  const itemBrief = brief.products.map((product, index) => `${index + 1}. ${product.name}${product.description ? ` — ${product.description}` : ""} ($${(product.priceCents / 100).toFixed(2)} USD)`).join("\n");
  const result = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
    max_tokens: 8000,
    system: `Create a polished, responsive, static storefront for a small business. Return only the requested JSON tool input. Keep the HTML and CSS concise (about 100 lines each maximum). Use semantic HTML and local CSS. Do not include JavaScript, forms, external assets, remote URLs, or claims of real payment processing. Include the exact business name and product/service names in visible page text. Include the exact literal HTML comment ${productGridMarker} exactly once inside the product/service section where product cards should appear. Do not create payment buttons or checkout links; Kams inserts one trusted Pay now button for each listed item.`,
    messages: [{ role: "user", content: `Business name: ${brief.businessName}\nBusiness type: ${brief.businessType}\nProducts and services (each will have its own price and Pay now button):\n${itemBrief}\nBusiness description: ${brief.description}\nVisual style: ${brief.style}${correction ? `\n\nCorrection required: The previous draft failed validation (${correction}). Regenerate both complete files. Link the stylesheet using only <link rel="stylesheet" href="styles.css">. Include ${productGridMarker} exactly once in the product area. Remove scripts, forms, images, SVG, embeds, iframes, inline style attributes/blocks, remote URLs, event attributes, and CSS url()/@import. Links must be local fragment links such as href="#details". Keep the exact business name visible.` : ""}` }],
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
      "The generated page is missing the business name or a product/service name.",
      "The generated page must include the product cards insertion point exactly once.",
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
  const checkoutSessionIds: string[] = [];
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

    notify({ phase: "run", message: "Waiting for the Sandbox server, then enabling the public preview." });
    await sandbox.waitForPortReady(4173, { timeoutMs: 45_000 });
    await sandbox.setIngress(true);
    const previewUrl = sandbox.previewUrl(4173, { scheme: "https" });

    notify({ phase: "checkout", message: `Creating Stripe test-mode Checkout links for ${brief.products.length} item${brief.products.length === 1 ? "" : "s"}.` });
    const checkoutUrls: string[] = [];
    for (const product of brief.products) {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: product.priceCents,
            product_data: {
              name: product.name,
              ...(product.description ? { description: product.description } : {}),
            },
          },
        }],
        success_url: `${previewUrl}/checkout-success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${previewUrl}/checkout-cancelled.html`,
        metadata: { business_name: brief.businessName, item_name: product.name },
      });
      checkoutSessionIds.push(session.id);
      if (!session.url || !session.url.startsWith("https://checkout.stripe.com/")) {
        throw new Error("Stripe did not return a hosted test Checkout URL.");
      }
      checkoutUrls.push(session.url);
    }

    const productCards = brief.products.map((product, index) => productCard(product, checkoutUrls[index], index)).join("\n");
    const checkoutHtml = generated.files["index.html"].replace(productGridMarker, `<div class="kams-product-grid" aria-label="Products and services">\n${productCards}\n</div>`);
    if (checkoutHtml === generated.files["index.html"]) throw new Error("The generated page did not include a product cards insertion point.");
    const checkoutCss = `\n.kams-product-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr));gap:1rem;margin-block:1.5rem}.kams-product-card{display:flex;flex-direction:column;gap:.75rem;padding:1.25rem;border:1px solid #dbe2ea;border-radius:1rem;background:#fff;box-shadow:0 8px 24px #0f172a0a}.kams-product-card h3{margin:0;font-size:1.15rem;line-height:1.3}.kams-product-card p{margin:0;line-height:1.55}.kams-product-card .kams-product-price{margin-top:auto;padding-top:.4rem;font-size:1.35rem;font-weight:700}.kams-pay-now{display:inline-flex;align-items:center;justify-content:center;min-height:2.8rem;padding:.75rem 1rem;border-radius:.7rem;background:#4f46e5;color:#fff;text-decoration:none;font-weight:700;text-align:center;transition:background .15s ease,transform .15s ease}.kams-pay-now:hover{background:#4338ca;transform:translateY(-1px)}.kams-test-label{margin:0!important;color:#64748b;font-size:.72rem;line-height:1.3!important}.kams-return-page{margin:10vh auto;padding:2rem;max-width:42rem;border:1px solid #cbd5e1;border-radius:1.25rem;background:#fff;color:#0f172a;box-shadow:0 18px 50px #0f172a12}.kams-return-label{color:#4f46e5;font-size:.8rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase}.kams-return-link{display:inline-block;margin-top:1rem;color:#4f46e5;font-weight:700;text-decoration:underline}\n`;
    await sandbox.files.upload("/tmp/kams-site/index.html", checkoutHtml);
    await sandbox.files.upload("/tmp/kams-site/styles.css", `${generated.files["styles.css"]}${checkoutCss}`);
    await sandbox.files.upload("/tmp/kams-site/checkout-success.html", checkoutReturnPage("success", brief.businessName));
    await sandbox.files.upload("/tmp/kams-site/checkout-cancelled.html", checkoutReturnPage("cancelled", brief.businessName));
    notify({ phase: "check", message: "Checking the public storefront and every Stripe Pay now link." });

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
    const allItemsPresent = brief.products.every((product) => served.includes(escapeHtml(product.name)));
    const allCheckoutLinksPresent = checkoutUrls.every((url) => served.includes(escapeHtml(url)));
    if (!containsBusinessName(served, brief) || !allItemsPresent || !allCheckoutLinksPresent) {
      throw new Error("The preview responded, but the business details, products, or Stripe Pay now links were missing from the served page.");
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
    return {
      previewUrl,
      summary: generated.summary,
      checks: [
        "CreateOS Sandbox server started",
        "Public preview returned HTTP success",
        "Business name and every product/service appeared in served HTML",
        `Stripe test-mode Checkout links verified for all ${brief.products.length} items`,
        "Stripe success and cancellation return pages verified",
      ],
    };
  } finally {
    if (!keep) {
      await Promise.all(checkoutSessionIds.map((sessionId) => stripe.checkout.sessions.expire(sessionId).catch(() => undefined)));
      await sandbox.destroy().catch(() => undefined);
    }
  }
}

function productCard(product: Product, checkoutUrl: string, index: number) {
  return `<article class="kams-product-card" data-kams-product="${index + 1}">
  <h3>${escapeHtml(product.name)}</h3>
  ${product.description ? `<p>${escapeHtml(product.description)}</p>` : ""}
  <p class="kams-product-price">$${(product.priceCents / 100).toFixed(2)} <span>USD</span></p>
  <a class="kams-pay-now" href="${escapeHtml(checkoutUrl)}" target="_blank" rel="noopener noreferrer">Pay now</a>
  <p class="kams-test-label">Stripe test mode</p>
</article>`;
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
    <a class="kams-return-link" href="/">Back to ${escapeHtml(businessName)}</a>
  </main>
</body>
</html>`;
}
