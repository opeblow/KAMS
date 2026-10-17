# Kams — Build Plan

## Current implementation focus

The vertical slice includes a brief form, truthful SSE progress, and a responsive preview panel wired to `POST /api/build`. The server asks Claude for constrained static files, uploads them to an actual CreateOS Sandbox, starts the preview server, creates one Stripe test-mode Checkout Session for the featured offer, adds only the hosted Checkout URL to the storefront, and verifies the final preview. Stripe and CreateOS secrets remain server-side; no provider credentials enter the sandbox.

The UI shell was reused from `C:\Users\USER\Downloads\kams\kams` at the user's request and adapted to this API. `AGENTS.md` has a clean-start rule against importing pre-existing app code; confirm with the organizers whether this reuse is allowed for eligibility.

## Product

Kams helps a small business owner turn a plain-language brief into a usable storefront preview. The owner describes the business, products, and visual style; Kams drafts the page, writes its code, runs it inside a CreateOS Sandbox, checks that it works, and returns a shareable preview URL.

**One-line demo:** “Describe your business; Kams builds, checks, and publishes a live storefront preview.”

## User and problem

The first user is a small business owner who needs a simple online presence but does not have a developer or the time to learn a web framework. Kams should make the first useful draft quickly, with the owner’s business details visible in the result rather than a generic AI answer.

## Hackathon story

The core demonstration is an agent that writes code and runs that code in a CreateOS Sandbox. Stripe Projects connects the project to CreateOS and supplies its credentials. The sandbox is the execution boundary for generated code; the public preview URL makes the result easy to inspect. The project should be built from this clean directory during the hackathon.

## MVP flow

1. The owner enters a business name, business type, featured product or service, one-time USD price, short description, and preferred style.
2. The server asks Claude to produce a small storefront as constrained `index.html` and `styles.css` files, plus a short build summary.
3. The server creates a fresh CreateOS Sandbox with ingress disabled, uploads the generated files, and starts a simple web server bound to `0.0.0.0`.
4. Kams waits for the port, enables ingress, and checks that the public page responds successfully and contains the expected business details.
5. Kams creates a Stripe test-mode Checkout Session for the featured item, adds its hosted URL to the page, then checks the final page. The UI returns the preview link and a short summary of passed checks.

## Scope

### Must ship

- A polished single-page brief form with one useful sample prompt.
- A server-side generation flow using the Anthropic API; the API key never reaches browser code.
- Actual generated code uploaded to and run in CreateOS Sandbox.
- A real CreateOS ingress URL, plus a clear success or failure state.
- A basic automated check: server starts, preview responds, and generated page reflects the prompt.
- One-time USD Stripe test-mode Checkout for a priced featured item; the secret stays on the Kams server.
- A short, reliable demo path that can be repeated live.

### Stretch, only after the core loop works

- Save and revisit storefronts with a database/auth service provisioned through Stripe Projects.
- More repair iterations, screenshots, custom domains, or production deployment.

Do not add a database, authentication, or live payment flow before the end-to-end sandbox demo works. Stripe Projects is required for the project setup; extra paid services are not necessary for the MVP.

## Suggested implementation shape

- **Web app:** a small TypeScript app with a server-side API route and a simple responsive interface.
- **Agent:** one bounded server-side workflow: collect brief → generate files → validate shape/size → upload → run → check → optionally repair once.
- **Sandbox:** use `@nodeops-createos/sandbox`; enable ingress when creating the sandbox, run the preview server on a fixed port, and return `previewUrl(port)`.
- **Preview:** start with static HTML/CSS served by a known lightweight server. Do not run arbitrary dependency-install commands from model output in the host app.
- **Payments:** create Checkout only on the Kams server and use test mode only. Never put Stripe secret keys in generated storefront files or pass them into the preview sandbox.

## Acceptance checklist

- [ ] A fresh prompt produces a visibly tailored storefront.
- [ ] The generated source is written and executed in a CreateOS Sandbox, not on the developer laptop.
- [ ] The app reports test output and an understandable error if a run fails.
- [ ] A successful run returns a working public preview URL.
- [ ] The preview includes a working Stripe test-mode Checkout link for the selected price.
- [ ] The project uses Stripe Projects and CreateOS Sandbox in the demo.
- [ ] No API keys appear in client-side code, generated files, screenshots, or Git history.
- [ ] The app can be demoed twice from a clean state, and sandboxes are cleaned up after testing.

## Demo script

Use the prepared example “Butter & Bloom,” a neighborhood bakery. Enter its products, price, and visual style, click **Build storefront**, show Claude generating the code, CreateOS running it, Stripe creating a test Checkout Session, and the final preview check. Open the hosted preview and Checkout. Keep the payment in test mode.

## Risks and decisions

- **Generated code safety:** constrain output to static page files, cap file size and runtime, and execute it only in the sandbox. Never evaluate generated code on the host server.
- **Preview lifetime and cost:** each preview uses sandbox resources. Show when a preview may expire and clean up smoke-test sandboxes. Confirm current account limits before creating multiple sandboxes.
- **TLS timing:** a new ingress hostname may take a moment to receive its certificate; retry readiness checks and show a useful status instead of a broken link.
- **Hackathon freshness:** this directory contains planning/setup documents only. Write the application implementation during the event and follow the organizers’ interpretation of the clean-start rule.
- **Payments:** Checkout is test mode only. The generated storefront carries a build-time hosted Checkout Session URL and returns to distinct static success/cancellation pages in the preview. Sessions expire under Stripe's session lifetime. No webhook or fulfillment handling is included.

## References

- Hackathon brief: <https://createos.sh/hackathon>
- CreateOS Sandbox SDK tutorial for an AI app generator: <https://createos.sh/docs/Sandbox/SDK/Tutorial/>
- CreateOS public preview URLs: <https://createos.sh/docs/Sandbox/SDK/How-To/Expose-A-Service/>
- Stripe Projects: <https://docs.stripe.com/projects>
