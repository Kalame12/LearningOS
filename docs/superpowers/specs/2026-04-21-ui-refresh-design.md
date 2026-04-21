# Saarthi AI — Full UI Refresh Design Spec

**Date:** 2026-04-21  
**Approach:** Component-by-component refresh (Approach A)  
**Style:** Clean & professional SaaS (Linear/Vercel vibes)  
**Motion:** Moderate — smooth transitions, fade-ins, satisfying feedback

---

## 1. Global Styles

### Color Palette
- Background: `#0a0a0a`
- Surface (cards): `#111111`
- Border: `#222222` (1px)
- Accent: `#6366f1` (indigo-500)
- Text primary: `#ffffff`
- Text secondary: `#a1a1aa` (zinc-400)
- Text muted: `#52525b` (zinc-600)

### Typography
- Font: Geist Sans (already installed)
- Base size: 16px, line-height: 1.6 for body, 1.2 for headings

### Base CSS Utilities (added to globals.css)
- `.card` — `rounded-xl border border-zinc-800 bg-zinc-950 p-6`
- `.btn-primary` — indigo background, white text, rounded-lg, hover scale
- `.btn-ghost` — transparent, zinc border, hover bg-zinc-800
- `.badge` — small pill, zinc-800 bg, zinc-400 text
- `.page-header` — large bold white heading with muted subtitle
- Background pattern: subtle dot/grid overlay on key pages (like Linear)

### Animations
- `fadeIn` — already in globals.css, apply to all page wrappers
- Framer Motion stagger for card lists (already installed)

---

## 2. Navbar

**File:** `components/Navbar.tsx`

- Background: `bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800`
- Logo: bold white wordmark "Saarthi AI" with a small indigo accent mark
- Nav links: Lucide icon + label per link, active state = indigo pill background
- Auth button: outlined style (`border border-zinc-700 hover:bg-zinc-800`) instead of stark white/black
- Profile image: indigo ring on hover

**Nav links with icons:**
| Link | Icon |
|------|------|
| Home | `Home` |
| My Goals | `Target` |
| Roadmap | `Map` |
| Learning | `BookOpen` |
| Upskill | `Zap` |
| Calendar | `Calendar` |
| Credentials | `Award` |
| About | `Info` |

---

## 3. Landing Page

**File:** `app/page.tsx`

- Keep two-column layout and Spline robot
- Background: replace radial blobs with subtle dot grid pattern
- Headline gradient: white-to-indigo (cleaner than current purple/blue/pink)
- CTA: indigo button with right-arrow icon + secondary ghost "See how it works" link
- Add 3 feature pills below CTA: "AI Roadmaps", "Progress Tracking", "Resource Links"

---

## 4. Onboarding Page

**File:** `app/onboarding/page.tsx`

- Centered card layout: `max-w-2xl mx-auto` with `.card` styling
- Step progress bar at top (grouped into 3 steps: Background → Interests → Goals)
- All fields get proper labels above them
- Inputs/selects: `border-zinc-700 bg-zinc-900 rounded-lg focus:ring-indigo-500`
- Submit button: full-width indigo with loading spinner
- Fade-in animation on card mount

---

## 5. Goals Page

**File:** `app/goals/page.tsx`, `components/GoalForm.tsx`, `components/TaskItem.tsx`

- Goal cards use `.card` with left indigo border accent (`border-l-4 border-indigo-500`)
- Task items get indigo-styled checkboxes
- Deadline shown as a `.badge`
- GoalForm inputs match onboarding input style

---

## 6. Roadmap Page

**File:** `app/roadmap/page.tsx`

- Keep RoadmapGraph (ReactFlow) untouched
- Consistent page padding and `.page-header`
- Add progress summary bar at top: "X of Y steps completed" with indigo fill

---

## 7. Remaining Pages

**Files:** `app/learning/page.tsx`, `app/upskill/page.tsx`, `app/calendar/page.tsx`, `app/credentials/page.tsx`, `app/about/page.tsx`

- Apply consistent `.card`, `.page-header`, and button styles
- No structural or logic changes
- Read each file during implementation and apply the design tokens

---

## 8. Dependencies

- `lucide-react` — install for icons (not yet in package.json)
- `framer-motion` — already installed, use for stagger animations

---

## Out of Scope

- No changes to API routes, Supabase queries, or authentication logic
- No structural changes to RoadmapGraph or ReactFlow
- No new pages or features
