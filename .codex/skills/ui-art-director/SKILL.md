---
name: ui-art-director
description: Art-direct and redesign PostForge into a distinctive, expressive, production-quality React product with strong information architecture, responsive behavior, and purposeful motion.
---

# PostForge UI Art Director

## Mission

PostForge must feel like an editorial creation studio, not a generic AI admin dashboard.

The interface should be memorable, focused, efficient, responsive, and visually coherent.

## Required workflow

Before changing code:

1. Inspect the current source structure.
2. Run the current app.
3. Inspect every existing route and interaction.
4. Identify information-architecture and navigation problems.
5. Search the connected 21st.dev catalog for relevant references.
6. Propose a design direction and component map.
7. Wait for approval before implementing a major redesign.

After implementation:

1. Run npm run lint.
2. Run npm run build.
3. Test with Playwright.
4. Inspect at 1366x768 desktop.
5. Inspect at 390x844 mobile.
6. Verify keyboard navigation.
7. Verify prefers-reduced-motion behavior.

## Visual direction

Design PostForge as an editorial studio and publishing workbench.

Use:
- near-black neutral surfaces rather than blue surfaces everywhere
- one electric blue/cyan primary accent
- one warm status accent used sparingly
- varied surface hierarchy
- restrained gradients
- subtle texture or grid atmosphere
- clear typography hierarchy
- compact navigation
- generous whitespace around primary actions
- asymmetrical compositions when appropriate
- responsive split-workspace layouts
- editorial rather than corporate copy

## Navigation

Desktop:
- compact collapsible icon rail
- contextual top command bar
- clear active-page indicator
- profile/settings access
- optional command palette

Mobile:
- bottom navigation
- drawers or sheets for secondary controls
- no permanent sidebar

Never show one active navigation item while displaying another page.

## Motion

Use Motion for React.

Motion must communicate:
- navigation changes
- loading
- hierarchy
- selection
- save completion
- preview updates

Allowed:
- 180-260ms page transitions
- spring active-nav movement
- staggered topic-card entry
- subtle hover elevation
- animated loading skeletons
- live-preview layout transitions
- success micro-interactions

Avoid:
- constant decorative motion
- excessive parallax
- bouncing controls
- animated backgrounds behind long-form editors
- motion that delays interaction

Respect prefers-reduced-motion.

## Anti-AI-slop rules

Do not:
- make every section a rounded card
- use identical border radius everywhere
- put tiny uppercase labels above every heading
- use cyan text for all secondary information
- use glassmorphism on every surface
- create a generic bento dashboard
- fill empty space with meaningless statistics
- apply gradients to every button
- add decorative icons without function
- use excessive marketing copy inside the application
- hide poor hierarchy behind animation
- copy a complete community template without adapting it

## Component sourcing

Use the 21st.dev MCP to search for references before creating major components.

Search for:
- compact app navigation
- command palette
- creative editor workspace
- AI composer input
- animated topic cards
- split-screen content editor
- floating mobile navigation
- activity timeline
- empty-state illustrations
- interactive preview panels

Review at least three candidates before choosing one.

Use community components as references or focused building blocks. Adapt them to the PostForge design system.

Use React Bits only for one or two signature visual moments.

## Engineering

- Preserve existing Firebase, Gemini, RSS, draft, and export functionality.
- Break the monolithic App.tsx into routed pages and focused components.
- Keep TypeScript types explicit.
- Avoid `any`.
- Use CSS variables/design tokens.
- Keep animations performant.
- Avoid unnecessary dependencies.
- Never expose credentials.
