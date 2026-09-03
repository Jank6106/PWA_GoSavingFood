# GoSavingFood — Visual Style

> Applies only to the Customer App and Merchant App. Does not define user flows, features, or screen layouts.

## 1. Style Direction

Natural green, modern, minimal, and friendly. Inspired by Too Good To Go and Yindii, with a distinct identity. Use light backgrounds, generous whitespace, and authentic food photography. Green is an accent, not a full-interface background. Both apps share the same colors, typography, and component styles.

## 2. Colors

| Role | Color |
| --- | --- |
| Primary / hover | `#166B4A` / `#11543A` |
| Soft green background / text | `#E8F4EC` / `#166B4A` |
| Page background / card | `#F7F9F6` / `#FFFFFF` |
| Primary text / secondary text | `#172B22` / `#5D6B63` |
| Subtle border / input border | `#DDE5DE` / `#7C8B81` |
| Offer accent / text | `#F4C95D` / `#493600` |
| Success / warning / error | `#166B4A` / `#8A4B08` / `#B42318` |

Use white text on primary green; use yellow sparingly. Do not introduce separate brand colors for each app.

## 3. Typography and Spacing

- Font: **Inter**, including Vietnamese character support; fallback `system-ui, sans-serif`.
- Font size/line-height: page title `24/32`, section heading `20/28`, body/input `16/24`, secondary text `14/20`, badge `12/16` px.
- Font weights: body 400, labels 500, headings/buttons 600, highlighted prices 700.
- Spacing: `4, 8, 12, 16, 24, 32, 48px`; card padding 16px, spacing between groups 24px.
- Corner radius: buttons/inputs 12px, cards 16px, dialogs/sheets 24px, fully rounded chips/avatars.
- Subtle shadow: `0 2px 12px rgb(23 43 34 / 6%)`; avoid stacking shadows.

## 4. Component Styles

- **Button:** primary green with white text; secondary soft green with green text; outline white with the input border color; destructive actions use the error color. Minimum height 48px.
- **Input:** white background, visible border, 16px text; focus uses a 2px green ring with a 2px offset; errors use a red border and an explanatory label.
- **Card:** white background, subtle border, images follow the card's rounded corners; food images use a 16:9 ratio and natural colors. Names are moderately bold; sale prices stand out, original prices are smaller and struck through.
- **Chip/Badge:** compact; selected states use a soft green background, green text, and a checkmark. Do not rely on color alone to distinguish states.
- **Icon:** Lucide, 2px stroke, 20–24px size, minimum 44×44px touch target; do not mix icon styles.
- **Motion:** subtle color/opacity transitions lasting 150–200ms; reduce or disable when the user prefers reduced motion.

**Avoid:** neon, glassmorphism, decorative gradients, dark backgrounds by default, tiny text, heavy shadows, and excessive accents. Keep text readable, spacing generous, and component styling consistent across both apps.
