# UI Standards: Required Components & Forbidden Patterns

This is a binding rulebook for whoever (or whatever AI) builds the UI. It extends `05-ui-design.md` with a strict checklist so the result looks like real, shipped software — not a generic AI-generated template.

## 1. Required components (must be present)
These are baseline expectations for a real product, not optional extras:

| Component | Where it applies |
|---|---|
| Dark mode toggle | Global, persisted per user (not just OS-detected — give an explicit switch) |
| Skeleton loaders | Every screen that loads data (activity feed, drafts, analytics) — never a blank screen or bare spinner |
| Cookie banner | If deployed publicly / collecting any analytics — skip only if truly single-user local tool with zero tracking |
| Sticky header | Dashboard shell, so connection status/nav stays visible while scrolling long lists |
| Back-to-top button | Activity timeline, analytics, any long scrollable list |
| Skip-to-content link | Accessibility — first focusable element on every page |
| Responsive/mobile layout | Every screen must degrade gracefully, not just "not break" |
| Keyboard shortcuts | At minimum: approve draft, reject draft, navigate list items — document them in a visible "?" shortcuts panel |
| Open Graph preview | If any screen is ever shareable (e.g. a public post-performance link) |
| Empty states | Every list/feed needs a real empty state with explanation + next action, not a blank area |
| Hover states | All interactive elements — buttons, cards, list rows |
| Custom scrollbar styling | Consistent with the design system, not default browser scrollbar clashing with a dark theme |
| Expandable FAQs/help | Settings or onboarding — explain scopes, what auto-approve does, etc. |
| Toast notifications | Action confirmations (draft approved, connection saved, error occurred) |
| Copy-to-clipboard buttons | Draft text, post links, API-like values |
| Password visibility toggle | Anywhere a password field exists (app login, if used) |

Treat this table as a build checklist — each item should map to a ticket/task in the roadmap phases from `06-tech-stack-roadmap.md`, not be left implicit.

## 2. Forbidden patterns (do not use)
These are the tells of a generic, un-designed "AI vibe-coded" app. None of the following are allowed:

- Harsh/loud gradients
- Lucide icons used indiscriminately as decoration (fine functionally, not as filler)
- Pure white background (use a proper off-white/neutral or real dark theme — not `#FFFFFF` flat)
- Rainbow/neon coloring
- Drop shadows used as the default depth technique everywhere
- Feature cards laid out in a generic 3-across row with emojis as icons
- "Liquid glass" / glassmorphism as a default effect
- Em dashes used as a stylistic crutch in UI copy
- Inter/Geist/Space Grotesk used by default without a deliberate reason — pick a typeface intentionally, don't default to the "every AI app" font
- Colored left-border stripe on cards as a generic accent device
- Fake testimonials or fabricated social proof — this is a personal tool, don't invent fake users
- Bento grid layouts used reflexively
- Terminal-window visual motif used decoratively where it serves no function
- The "It's not X, it's Y" copywriting pattern
- Checkmark bullet lists as a default way to present any list
- Pricing tiers — not applicable, this isn't a sold product
- Placeholder/fake product demos — every screen shown must reflect real data/flows
- Soft, uniform corner radius applied everywhere by default without intention
- Purple-and-black as a default "techy AI" palette
- Missing skeleton loaders (see required list above — this is a hard requirement, not optional)
- Radial gradient orbs as background decoration
- Dot-grid background patterns
- Sparkle/magic-wand icons to signify "AI-powered"
- Animated arrows as a generic CTA device
- Missing Terms of Service / Privacy Policy — even for a personal tool, include a minimal one if it touches real user data/tokens
- Gratuitous hover animations with no functional purpose
- Neon color accents
- Generic pastel palettes used without a considered color system

## 3. How to apply this
- Before building any screen, check it against both tables: are the required components present? Are any forbidden patterns creeping in?
- The design system defined in `05-ui-design.md` (typography, spacing, color tokens) is the actual source of truth for *how things look* — this document is the enforcement layer that keeps the build honest and prevents default-template drift.
- If a coding AI is building this, paste this file directly into its context when generating UI code, and treat violations the same as a functional bug.
