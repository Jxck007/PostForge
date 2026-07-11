---
name: reviewer
description: Review code changes for correctness, security, UX quality, TypeScript errors, and product guardrail violations.
---

# Reviewer Skill

Use this skill before finishing meaningful changes.

## Checklist
- Does the app still build?
- Are TypeScript types clean?
- Are API keys protected?
- Did we avoid LinkedIn automation?
- Is the UI responsive?
- Are error states handled?
- Are LocalStorage operations safe?
- Are generated posts editable by the user?
- Did we avoid overengineering?

## Commands
Run:
npm run build

If lint exists:
npm run lint

## Report format
- What changed
- What was checked
- Build/lint result
- Remaining issues
