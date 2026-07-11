---
name: api-builder
description: Build PostForge backend/API routes for Gemini, RSS fetching, validation, and server-only secrets.
---

# API Builder Skill

Use this skill for API routes and server logic.

## Read first
- AGENTS.md
- .codex/memory/guardrails.md
- .codex/memory/roadmap.md

## Rules
- Never expose API keys to frontend.
- Gemini key must use process.env.GEMINI_API_KEY.
- Validate request body.
- Return user-friendly errors.
- Return strict JSON.
- Do not call LinkedIn APIs in V1.
- Do not scrape LinkedIn.

## API routes
- /api/generate-post
- /api/fetch-topics

## Generate post output shape
{
  "postType": "",
  "caption": "",
  "hashtags": [],
  "imageTitle": "",
  "imageSubtitle": "",
  "sourceCredit": "",
  "linkedInQuestion": ""
}

## RSS topic output shape
{
  "topics": [
    {
      "id": "",
      "title": "",
      "summary": "",
      "source": "",
      "url": "",
      "matchedKeywords": [],
      "score": 0,
      "publishedAt": ""
    }
  ]
}
