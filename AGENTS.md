# PostForge Agent Instructions

## Project
PostForge is a personal LinkedIn content assistant for a student developer.

It helps generate LinkedIn-ready posts from tech topics and creates clean visual cards for manual posting.

Core flow:
RSS/topic input -> generate LinkedIn caption -> generate image/card text -> preview -> copy caption -> download image -> open LinkedIn manually.

## Hard boundaries
- Do not implement LinkedIn auto-posting.
- Do not implement browser automation for LinkedIn.
- Do not scrape LinkedIn.
- Do not iframe the LinkedIn composer.
- Do not expose API keys in frontend code.
- Do not add Firebase until explicitly requested.
- Do not add paid services unless explicitly requested.
- Do not add extra AI providers until Gemini V1 works.

## Current V1 stack
- React
- TypeScript
- Vite
- Tailwind CSS
- LocalStorage for interests and drafts
- Mock topics first
- Gemini API later through server route only
- Browser image card first using HTML/CSS
- PNG export with html-to-image first

## Development rules
- Before coding, inspect relevant files.
- Make focused changes only.
- Prefer simple, readable code over clever abstractions.
- Keep components small and named clearly.
- After edits, run:
  - npm run build
  - npm run lint if available
- If a command fails, explain the failure and fix the root cause.
- Do not silently ignore TypeScript errors.
- Do not delete existing user work unless explicitly asked.

## UI direction
- Clean dark dashboard.
- Cyan/blue accent.
- Responsive layout.
- Student-developer friendly.
- Not spammy.
- Should feel like a serious productivity tool, not an AI gimmick.

## Product language
Use "draft", "preview", "copy", "download", "open LinkedIn".
Avoid "auto-post", "growth hack", "spam", "bot", "engagement farming".

## Code style
- TypeScript strict-minded code.
- Avoid `any` unless justified.
- Use clear interfaces/types.
- Use functional React components.
- Keep state predictable.
- Persist only safe user settings in LocalStorage.

## Security
- Never put API keys in client code.
- Environment variables for server-side keys only.
- Treat article content and generated text as untrusted input.
- Sanitize/escape where needed.


## UI Redesign V2

PostForge is undergoing a full visual and structural redesign.

Before modifying UI:
- use the ui-art-director skill
- inspect the running application
- use 21st.dev MCP to find real design references
- produce an implementation plan before coding

The target is an editorial publishing studio, not a generic dashboard.

The existing visual layout may be replaced, but working business logic must be preserved.

Do not treat a passing build as proof of UI quality.

For meaningful UI changes, verify:
- 1366x768 desktop
- 390x844 mobile
- active navigation state
- responsive overflow
- keyboard focus
- reduced-motion behavior
