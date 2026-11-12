# GoSavingFood — Design System

> Applies to both Customer App (`apps/customer`) and Merchant App (`apps/merchant`). Defines visual style only, not user flows, features, or screen layouts.
> For the `apps/web` Landing Page's warm editorial palette and typography, see [`../apps/web/DESIGN.md`](../apps/web/DESIGN.md). Shared UI primitives live in [`../packages/ui`](../packages/ui).

## 1. Style

Modern, minimal, friendly, and food-first.

Inspired by Too Good To Go and Yindii while maintaining a distinct GoSavingFood identity.

* Natural green palette
* Light backgrounds
* Generous whitespace
* Rounded components
* Authentic food photography
* Soft visual depth
* Clean, consistent UI

Green is an accent color, not a full-screen background.

Both apps must share the same colors, typography, icons, spacing, and component styles.

Avoid neon colors, heavy gradients, dark backgrounds by default, glassmorphism, excessive shadows, and unnecessary decoration.

---

## 2. Colors

| Role           | Color     |
| -------------- | --------- |
| Primary        | `#166B4A` |
| Primary Hover  | `#11543A` |
| Soft Green     | `#E8F4EC` |
| Background     | `#F7F9F6` |
| Surface        | `#FFFFFF` |
| Text Primary   | `#172B22` |
| Text Secondary | `#5D6B63` |
| Border         | `#DDE5DE` |
| Input Border   | `#7C8B81` |
| Offer Accent   | `#F4C95D` |
| Offer Text     | `#493600` |
| Warning        | `#8A4B08` |
| Error          | `#B42318` |

Use white text on primary green.

Use yellow only for offers, discounts, or important highlights.

Do not create separate brand colors for Customer and Merchant apps.

---

## 3. Typography

Font:

`Inter, system-ui, sans-serif`

| Type            | Size / Line Height | Weight  |
| --------------- | ------------------ | ------- |
| Page Title      | `24 / 32`          | 600     |
| Section Heading | `20 / 28`          | 600     |
| Body / Input    | `16 / 24`          | 400     |
| Secondary       | `14 / 20`          | 400–500 |
| Badge           | `12 / 16`          | 500     |
| Highlight Price | —                  | 700     |

Typography must support Vietnamese characters.

Keep hierarchy simple and avoid excessive font sizes or weights.

---

## 4. Spacing & Shape

Spacing scale:

`4, 8, 12, 16, 24, 32, 48px`

Default:

* Card padding: `16px`
* Section spacing: `24px`
* Button/Input radius: `12px`
* Card radius: `16px`
* Dialog/Bottom Sheet radius: `24px`
* Chips/Avatars: fully rounded

Use generous whitespace and avoid placing elements too close together.

---

## 5. Components

### Button

Primary:

* Green background
* White text

Secondary:

* Soft green background
* Green text

Outline:

* White background
* Visible border

Destructive:

* Error color

Minimum height: `48px`

Buttons should remain visually consistent across both apps.

### Input

* White background
* Visible border
* `16px` text
* `12px` radius

Focus:

`2px` green focus ring with `2px` offset.

Errors use a red border and explanatory text.

### Card

* White background
* Subtle border
* `16px` radius
* Minimal shadow
* Clear content hierarchy

Food images should normally use a `16:9` ratio.

Sale prices should stand out; original prices should be smaller and struck through.

### Chip / Badge

Compact and fully rounded.

Selected state:

* Soft green background
* Green text
* Checkmark when appropriate

Never rely only on color to communicate state.

---

## 6. Images

Food photography is the main visual focus.

Images should be:

* High quality
* Naturally lit
* Warm and appetizing
* Realistic
* Minimally processed

Avoid dark images, excessive saturation, and obvious stock-photo styling.

---

## 7. Icons

Use **Lucide** only.

* Stroke: `2px`
* Size: `20–24px`
* Minimum touch target: `44×44px`

Do not mix icon libraries or visual styles.

---

## 8. Shadow

Default subtle shadow:

`0 2px 12px rgb(23 43 34 / 6%)`

Use shadows only to create light separation between layers.

Avoid stacked or heavy shadows.

---

## 9. Motion

Use subtle transitions for:

* Color
* Opacity
* State changes
* Small component movement

Duration:

`150–200ms`

Avoid unnecessary animations.

Respect `prefers-reduced-motion` and reduce or disable motion when required.

---

## 10. Core Rules

Every UI should follow these principles:

* One clear visual hierarchy
* Food imagery before decoration
* Generous whitespace
* Large enough touch targets
* Readable text
* Consistent component behavior
* Minimal use of accent colors
* No color-only state indicators
* Customer and Merchant apps must feel like parts of the same product

Overall feeling:

**Modern · Minimal · Natural · Friendly · Sustainable · Food-first**
