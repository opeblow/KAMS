# Kams — Setup Guide

## Run the app

Install dependencies with `npm install`, then start the app with `npm run dev`. Open `http://localhost:3000` for the brief form and verified preview panel. The form calls `POST /api/build`, which streams real build progress and a verified preview URL, or a safe error. Each successful build creates a CreateOS Sandbox and one Stripe test Checkout Session per listed item, so keep requests to one at a time while demoing.

Example request body (PowerShell):

```powershell
$brief = @{
  businessName = 'Butter & Bloom'
  businessType = 'neighborhood bakery'
  products = @(
    @{ name = 'Country Sourdough Loaf'; description = 'Naturally leavened and baked fresh each morning.'; priceUsd = '8.50' },
    @{ name = 'Seasonal Pastry Box'; description = 'Six pastries made with seasonal ingredients.'; priceUsd = '18.00' }
  )
  description = 'A neighborhood bakery making naturally leavened sourdough and fresh pastries every morning.'
  style = 'warm editorial, cream and sage green'
} | ConvertTo-Json -Depth 4
Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3000/api/build' -Method Post -ContentType 'application/json' -Body $brief
```

This guide sets up the Kams workspace with Stripe Projects and CreateOS Sandbox. Run commands from this directory. The steps below use free/test resources; review any provider terms when prompted. Do not use live payment credentials for the demo.

Use a terminal on macOS, Linux, or Windows. Install the Stripe CLI and its Projects plugin using Stripe's current installation instructions for your platform. The app itself uses the CreateOS TypeScript Sandbox SDK, so a separate CreateOS CLI installation is optional for running Kams. The app supplies the Stripe Projects CreateOS credential to the SDK on the server.

## 1. Prerequisites

- Node.js 20.9 or newer, npm, and Git.
- Stripe CLI with the Projects plugin.
- A Stripe account authorized for the **Kams** project/account.
- A CreateOS Sandbox API key or CreateOS credentials provisioned through Stripe Projects.
- An Anthropic API key available locally.

Check what is installed:

```powershell
node --version
npm --version
stripe --version
stripe projects --help
createos version
```

Install or update the Stripe CLI and Projects plugin if needed, using Stripe’s official instructions: <https://docs.stripe.com/cli/install> and <https://docs.stripe.com/projects>. The documented plugin command is:

```bash
stripe plugin install projects
```

Install the CreateOS CLI if missing, using its official guide: <https://createos.sh/docs/Sandbox/CLI/Overview/>. On macOS with Homebrew:

```bash
brew tap nodeops-app/tap
brew install createos
```

## 2. Connect Stripe Projects to this clean directory

From the root of this repository:

```bash
stripe projects init kams
stripe projects add createos/project
```

Stripe CLI authorization was previously completed for the Kams account. If this new directory asks you to authorize again, finish the browser flow yourself and do not share a one-time code in chat. Confirm any provider terms before accepting them; never use an automatic terms-acceptance flag.

This workspace is initialized as the Stripe Project `kams`. Stripe Projects has linked CreateOS and provisioned the free plan plus the CreateOS project service in the default environment. The CLI synchronized credentials to the ignored `.env` file. Keep the Stripe CLI context on live only for Stripe Projects administration; storefront payments remain test mode. On a new workspace, check project status first, inspect the CreateOS catalog, and follow the CLI's required plan/service order. Accept CreateOS terms only after an authorized person has reviewed them.

```bash
stripe projects status
stripe projects env
createos whoami
```

`stripe projects env` lists variable names without showing values. Do not paste `.env` or vault contents into chat. Stripe Projects automatically ignores credential files; verify the local `.gitignore` before committing.

## 3. Add the Anthropic key securely

The app will call Claude from its server. Put the key in the local `.env` file using a trusted local editor or secure prompt. Do not commit it and do not place it in frontend variables such as `VITE_*` or `NEXT_PUBLIC_*`.

Expected server-only variable:

```dotenv
ANTHROPIC_API_KEY=...local_secret...
```

If the `.env` file does not exist yet, create it locally. Add `.env` and `.env.*` to `.gitignore` (while keeping a safe `.env.example` with empty values if the app later needs one). Never print the value when checking setup.

## 4. Smoke-test CreateOS Sandbox

First inspect available sandbox shapes and use the free-plan size. The hackathon's quickstart uses `s-1vcpu-1gb` with `devbox:1`:

On macOS or Linux with the CreateOS CLI installed:

```bash
createos sandbox shapes
createos sandbox create --shape s-1vcpu-1gb --name kams-smoke-test --rootfs devbox:1
createos sandbox exec kams-smoke-test -- python3 -c 'print(6 * 7)'
```

The expected output is `42`. Remove the smoke-test sandbox when finished:

```bash
createos sandbox rm kams-smoke-test --force
```

The app uses the CreateOS SDK for its Sandbox smoke test rather than depending on a separate CreateOS CLI install. The SDK normally reads `CREATEOS_SANDBOX_API_KEY`, while the current Stripe Projects integration provides `CREATEOS_API_KEY`. Pass that value explicitly as the server-side `apiKey` option; leave the SDK base URL at its Sandbox default unless a Sandbox-specific URL is configured. Do not create a second key or copy credentials into source files.

## 5. Application environment and dependencies

The app uses the CreateOS TypeScript SDK from the server:

```bash
npm install @nodeops-createos/sandbox @anthropic-ai/sdk
```

The SDK accepts an explicit `apiKey` and otherwise reads `CREATEOS_SANDBOX_API_KEY`; its Sandbox base URL defaults to `https://api.sb.createos.sh`. The app accepts the Stripe Projects key under either `CREATEOS_API_KEY` or `CREATEOS_SANDBOX_API_KEY` and passes it directly to `createClient({ apiKey })`. Keep `ANTHROPIC_API_KEY` server-side. The preview sandbox should receive only the generated site files; it should not receive Claude or Stripe secrets.

## 6. Preview behavior

For each storefront build, the app creates a sandbox with ingress disabled, uploads the generated page, starts a server bound to `0.0.0.0`, waits for the port, enables ingress, checks the page, and returns the SDK’s `previewUrl(port)`. Use a short readiness retry because a fresh preview URL may take time to become ready.

The CreateOS SDK tutorial shows the complete AI-generator pattern: generate code, upload it to a sandbox, run a server, and return a public URL: <https://createos.sh/docs/Sandbox/SDK/Tutorial/>. Ingress details: <https://createos.sh/docs/Sandbox/SDK/How-To/Expose-A-Service/>.

## 7. Stripe test-mode Checkout per item

The build creates a hosted Stripe Checkout Session for each listed product or service and places its URL in that item's **Pay now** button. Each session has its own price and Stripe product details. Enter a test-mode secret key from Stripe Dashboard → Developers → API keys into the local ignored `.env` file:

```dotenv
STRIPE_SECRET_KEY=sk_test_...
```

Kams rejects live keys. Keep this key server-side; never place it in generated storefront files, client code, or the Sandbox. A successful test Checkout returns to a clear confirmation page inside the preview; cancelling returns to a separate cancellation page. Use Stripe's test card `4242 4242 4242 4242`, any future expiration date, and any CVC to exercise test Checkout. Each generated URL is a build-time Checkout Session and expires; rebuild to create fresh sessions. This MVP does not fulfill orders or verify payment webhooks.

## 8. Before a demo or commit

```bash
stripe projects status
createos whoami
git status --short
```

Confirm the project uses the Kams Stripe account, CreateOS is connected, no paid service was selected, and no `.env`, vault, or key file is staged. Keep the demo to one known prompt and clean up temporary sandboxes after testing.

## Official references

- Stripe Projects CLI: <https://docs.stripe.com/projects>
- CreateOS on Stripe Projects: <https://createos.sh/docs/Services/Stripe-Projects/>
- CreateOS Sandbox quickstart: <https://createos.sh/docs/Sandbox/Quickstart/>
- CreateOS Sandbox SDK overview: <https://createos.sh/docs/Sandbox/SDK/Overview/>
- CreateOS hackathon instructions: <https://createos.sh/hackathon>
