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
6. Deploy [firestore.rules](./firestore.rules) before using the app in production. The rules permit each authenticated user to read and write only `users/{uid}`.

The Firebase web configuration is intentionally client-visible. It is not a server secret; access is controlled by Firebase Authentication and Firestore Rules. `GEMINI_API_KEY` remains server-only.

To deploy the included rules with the Firebase CLI:

```bash
npx firebase-tools deploy --only firestore:rules
```

## Deploying to Vercel

1. Import the repository into Vercel.
2. Set `GEMINI_API_KEY` and every `VITE_FIREBASE_*` variable from `.env.example` in the project environment variables.
3. Add the deployed Vercel domain to Firebase Authentication's authorized domains.
4. Deploy with the standard Vite build command: `npm run build`.

Vercel automatically serves `api/generate-post.ts` and `api/fetch-topics.ts`. No LinkedIn API, browser automation, scraping, or automatic publishing is used.

## Verification

```bash
npm run build
npm run lint
```
