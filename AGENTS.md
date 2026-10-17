# Instructions for coding agents

## Project goal

Build **Kams**, a prompt-to-storefront agent for small business owners. It turns a business brief into a storefront, writes the page code, runs and checks it inside a CreateOS Sandbox, and returns a shareable preview URL. Stripe Projects must be part of the setup; the CreateOS sandbox is the required execution environment.

Read `plan.md` and `setup.md` before changing the app. These documents are the source of truth for scope and setup.

## Working rules

- Keep this repository clean and focused on the hackathon MVP. Do not copy or modify other projects in Documents, including the older `Kams`, `kams`, or `pre-order-agent` folders.
- Build application code from this folder during the event. Do not import pre-existing app code as the implementation.
- Prefer the smallest end-to-end vertical slice over extra features: prompt → Claude-generated files → CreateOS Sandbox execution → automated check → preview URL.
- Use Stripe Projects CLI for CreateOS provisioning and credential synchronization. Check project status before changing the service stack.
- Use free/test resources by default. Stop and explain before choosing any paid tier, accepting provider terms, enabling a live payment flow, or creating ongoing resources that may incur charges.
- Keep all secrets server-side and in ignored environment files. Never print, log, commit, or put secrets in browser code, generated files, screenshots, or demo output. Do not ask the user to paste API keys into chat.
- Keep `ANTHROPIC_API_KEY`, CreateOS credentials, and any Stripe test secret out of the sandbox unless the specific sandbox task needs them. The storefront generation task should not need provider secrets.
- Treat model-generated output and user prompts as untrusted input. Validate filenames and content size; allow only the expected static files; do not run model-supplied shell commands on the host.
- Run generated storefront code only inside CreateOS Sandbox. Give each job a timeout and bounded output. Do not silently retry forever.
- Do not expose the sandbox publicly until its server is ready. Return only the preview URL and useful status to the browser; never return credentials or internal control-plane data.
- Clean up temporary sandboxes when appropriate. Preserve the final preview only for the demo and explain its lifetime.
- Keep the interface accessible, responsive, and understandable to a non-technical business owner. Explain failures in plain language.
- Update `plan.md` or `setup.md` when a material scope or setup decision changes.

## Verification before calling a feature done

1. Run the local app and verify the main prompt form.
2. Exercise one successful generation and one failure path.
3. Confirm generated files are uploaded and executed in CreateOS Sandbox.
4. Confirm the health check succeeds and the returned preview URL opens.
5. Check Git status for `.env`, keys, generated secrets, and accidental unrelated files.

## Hackathon demo priority

Make the CreateOS and Stripe Projects usage visible and truthful. The demo must show code being written, run, checked, and previewed; do not simulate sandbox execution or claim production deployment when the result is a sandbox preview.

<!-- stripe-projects-cli managed:agents-md:start -->
## Stripe Projects CLI

This repository is initialized for the Stripe project "kams".

## Tools used

- [Stripe CLI](https://docs.stripe.com/stripe-cli) with the `projects` plugin to manage third-party services, credentials, and deployments for this project. Use the stripe-projects-cli to manage deploying and access to third party services.
<!-- stripe-projects-cli managed:agents-md:end -->

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
