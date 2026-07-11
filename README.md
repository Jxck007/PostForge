# PostForge

PostForge is a personal LinkedIn content preparation tool for a student developer. It finds RSS topics, generates editable Gemini drafts, previews a shareable card, and keeps posting fully manual.

## Local development

```bash
npm install
npm run dev
```

The Vite development server renders the frontend and local drafts. API routes are Vercel serverless functions, so use `vercel dev` when testing live RSS and Gemini locally.

```bash
cp .env.example .env.local
# Add GEMINI_API_KEY to .env.local
npx vercel dev
```

Never use a `VITE_` prefix for `GEMINI_API_KEY`; it is read only by `api/generate-post.ts` on the server.

## Firebase setup

1. Create a Firebase project and register a Web app.
2. Enable **Google** under Firebase Authentication > Sign-in method.
3. Create a Cloud Firestore database.
4. Add the local host and deployed Vercel domain under Authentication > Settings > Authorized domains.
5. Put the Firebase Web app configuration values in the `VITE_FIREBASE_*` variables from `.env.example`.
6. Deploy [firestore.rules](./firestore.rules) before using the app in production. The rules permit each authenticated user to access only `users/{uid}/drafts/{draftId}` and `users/{uid}/settings/profile`.

The Firebase web configuration is intentionally client-visible. It is not a server secret; access is controlled by Firebase Authentication and Firestore Rules. `GEMINI_API_KEY` remains server-only.

To deploy the included rules with the Firebase CLI:

```bash
npx firebase-tools deploy --only firestore:rules
```

## Deploying to Vercel

1. Import this repository into Vercel and select the default Vite framework preset.
2. Keep the default install command, set the build command to `npm run build`, and use `dist` as the output directory.
3. Add these environment variables for Preview and Production:
   - `GEMINI_API_KEY` - server-side only. Do not prefix it with `VITE_`.
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
4. Deploy Firestore rules, then add the deployed Vercel domain to Firebase Authentication > Settings > Authorized domains.
5. Deploy the project. Vercel automatically serves `api/generate-post.ts` and `api/fetch-topics.ts` as serverless functions alongside the Vite frontend.

### Deployment Checklist

- [ ] `npm run build` and `npm run lint` pass locally.
- [ ] `GEMINI_API_KEY` is present only in Vercel environment variables, never in a `VITE_` variable or client source.
- [ ] All Firebase `VITE_FIREBASE_*` values match the Firebase Web app configuration.
- [ ] Google sign-in is enabled and the Vercel production domain is authorized in Firebase Auth.
- [ ] [firestore.rules](./firestore.rules) are deployed and owner-only access is verified.
- [ ] `/api/fetch-topics` returns topics in the deployed environment.
- [ ] `/api/generate-post` returns an editable draft when `GEMINI_API_KEY` is configured.
- [ ] Copy caption, download image, and open LinkedIn are manually tested.

### Production Guardrails

- LinkedIn posting remains manual: copy the caption, download the image, then open LinkedIn yourself.
- Do not add LinkedIn scraping, a LinkedIn API integration, browser automation, an iframe composer, auto-comments, auto-DMs, or auto-connect behavior.
- Gemini access remains server-side only through `api/generate-post.ts`; API keys never belong in frontend code.
- This V1 does not use Cloudflare, Firebase Storage, payments, or other paid product features.

## Verification

```bash
npm run build
npm run lint
```
