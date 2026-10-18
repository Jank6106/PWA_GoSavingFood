---
name: GoSavingFood Landing
description: Photographic editorial storytelling for rescuing surplus food.
colors:
  paper: "#fff6e8"
  ink: "#30251f"
  muted-ink: "#526458"
  accent: "#c94324"
  lime: "#ffd278"
  line: "#c8cfc1"
  forest: "#234638"
  light-ink: "#fff6e8"
  light-muted: "#c8d8cd"
  flash: "#fffef5"
typography:
  display:
    fontFamily: "Be Vietnam Pro Bold, sans-serif"
    fontSize: "clamp(2.6rem, 5.5vw, 5.4rem)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-.04em"
  headline:
    fontFamily: "Be Vietnam Pro Bold, sans-serif"
    fontSize: "clamp(2.6rem, 5.6vw, 5.4rem)"
    fontWeight: 500
    lineHeight: 1.09
    letterSpacing: "-.04em"
  title:
    fontFamily: "Be Vietnam Pro Bold, sans-serif"
    fontSize: "clamp(1.55rem, 2.7vw, 2.4rem)"
    fontWeight: 500
    letterSpacing: "-.035em"
  body:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "clamp(.95rem, 1.2vw, 1.08rem)"
    fontWeight: 400
    lineHeight: 1.85
  label:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: ".88rem"
    fontWeight: 500
rounded:
  pill: "999px"
  install: "16px"
spacing:
  inline-gap: "14px"
  row-gap: "32px"
  section: "120px"
  section-mobile: "80px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "18px 26px"
  button-primary-hover:
    backgroundColor: "{colors.accent}"
  install-prompt:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.install}"
---

# Design System: GoSavingFood Landing

## Overview

The visual direction is photographic editorial: food footage, generous cream space, forest typography and lime emphasis. Large balanced headlines set the pace; workflow rows, a split calculator and asymmetric quotations provide distinct reading rhythms across the page. Motion is bold and smooth while native scrolling remains in control.

This document records the implemented landing surface, not a new product strategy or a specification for the customer and merchant applications. Its source is `app/landing.css`, loaded after `app/globals.css`, the font declarations in `app/layout.tsx`, and the landing components assembled by `app/page.tsx`. No PRODUCT.md was supplied or invented. Frontmatter tokens are normative for this landing system; the sidecar holds motion, breakpoint and component extensions.

Key characteristics:

- Photographic storytelling with readable foreground text.
- Open editorial sections with rules instead of repeated card grids.
- Locally hosted typography with Vietnamese support.
- Scroll-linked scenes with reduced-motion alternatives.

## Colors

Cream and deep greens establish a food-centered, calm foundation; lime carries emphasis over dark sections.

- **Primary:** `ink` for headings and primary buttons; `accent` for links, selected controls and small expressive details.
- **Secondary:** `lime` for dark-section emphasis, hero actions and the statement footer; `forest` for the impact section.
- **Neutral:** `paper` for page space, `muted-ink` for supporting copy and `line` for row dividers. `light-ink` and `light-muted` are the corresponding dark-surface foregrounds. `flash` is the brief exposure phase of the film dissolve.

The shared navigation retains its existing bright green logo/action treatments. Do not infer a replacement token for those literals from the editorial palette.

## Typography

Use Be Vietnam Pro Bold for headings, large numbers, quotations and the footer wordmark. Use Be Vietnam Pro for body copy and controls. Both are loaded with `next/font/local`; the font directory includes `Be Vietnam Pro Bold-OFL.txt` and `BeVietnamPro-OFL.txt`. Be Vietnam Pro ships regular, medium, semibold and bold files; Be Vietnam Pro Bold is variable at weights 200–800. Preserve the local files and licenses when distributing the site.

The main display and headline roles use weight 500, tight tracking and balanced wrapping. Hero text is limited to 19ch, supporting hero copy to 51ch, workflow copy to 55ch. The bridge statement reaches `clamp(2.6rem,6.3vw,6rem)` with a 1.18 line height. Featured quotations use `clamp(1.6rem,2.8vw,2.5rem)` at 1.45 line height. The calculator uses tabular numerals for changing output. At 600px and below, hero display becomes `clamp(2.25rem,9.8vw,3.6rem)` and section headings become 2.6rem.

## Layout

The editorial shell is `min(1280px, 100% - 112px)`. At 900px it becomes `calc(100% - 48px)`; at 600px it becomes `calc(100% - 40px)`. Standard sections use 120px vertical padding, reducing to 80px on mobile.

Desktop intros use a 1.5:1 split; the impact calculator uses equal columns with a 110px gap. Workflow rows use 90px / flexible content / supporting detail columns, switching to two columns at 900px. Testimonials use a 1.4:1 layout with the featured quote spanning two rows. Main split layouts stack at 600px. The footer invitation stacks at 900px. Preserve these varied arrangements rather than forcing a uniform grid.

Film sections use stable viewport height and a minimum height of 640px (620px on narrow screens). Reduced motion or viewport height at most 540px yields naturally stacked story panels. Navigation links switch to the mobile menu below 1100px; its action group appears above 700px.

## Elevation & Depth

Depth comes primarily from footage, a directional dark film overlay, tonal section changes and opacity. Content sections are flat. The install prompt is the small floating exception: `0 12px 35px rgb(25 59 44 / .12)`, with a fine line border. The final film dissolve has no box shadow. Existing shared-navigation shadows are outside the editorial section vocabulary.

## Shapes

Primary actions are pills. Content regions are open, with thin horizontal rules on workflow rows and calculator facts. The install prompt uses 16px corners. Avoid wrapping every paragraph or quotation in a rounded container. Large arrow marks and the oversized footer wordmark provide shape without ornamental panels.

## Components

**Actions:** Primary buttons use the frontmatter values, a 28px internal gap and a 250ms background/transform transition. Hover lifts 2px; active returns to rest. Arrow icons move 3px right and 3px up with a 350ms eased transition. Text links use a thin underline offset 7px. Focus outlines are 2px with a 6px offset, green on cream and lime on film/forest surfaces.

**Audience switch and workflow:** Text controls use a 2px green bottom border when `aria-pressed` is true. Rows have 40px vertical padding (28px on mobile), numbered introductions, content and a compact detail. Their viewport entrance is 900ms; hover gently rotates and lifts the detail icon.

**Impact calculator:** A native range input uses lime accent on forest. Large meal and saving values sit above three compact facts and a calculation note. Output has a 300ms entrance. Keep labels, assumptions and units visible alongside the numbers.

**Community:** The full-width food-category strip takes 38 seconds per linear loop and pauses outside the viewport. It has no visible pause control and respects reduced motion. Quotes use asymmetric scale and placement, without enclosing cards.

**Film and reveal motion:** `useScrollVideo` pins each scene for 3.2 times its section height and uses a 0.45-second scrub. A single clock controls video seeking and story text; the final 12% allows the cream dissolve and exposure bloom where the dissolve element exists. Inactive story panels are removed from interaction. `LandingMotion` supplies repeatable 900ms, 48px rise reveals (30px on mobile), scrubbed word opacity, arrow movement and the footer wordmark reveal. Reduced motion disables these enhancements and preserves readable content; short viewports also bypass film pinning.

**Navigation:** The fixed header is transparent at the top of the hero and becomes forest after scrolling. The supplied logo is rendered white against the dark header. The mobile menu exposes expanded state, and links close it on selection. Keep text and controls legible across both header states.

## Do's and Don'ts

- **Do** use real food imagery and generous editorial spacing.
- **Do** preserve Vietnamese diacritics, balanced headings and the local font licenses.
- **Do** keep native scrolling, visible focus and the reduced-motion reading path.
- **Do** use lime emphasis on dark surfaces and green emphasis on cream.
- **Don't** replace the varied workflow, calculator and quote layouts with identical cards.
- **Don't** introduce decorative gradients, glass panels or extra badges across the content sections.
- **Don't** hide essential content behind animation or require movement to operate controls.



## October 2026 food direction
Cream #fff6e8, tomato #c94324, butter #ffd278 and basil #234638 form the landing palette. Be Vietnam Pro Bold is the headline face; Barlow Condensed Bold is self-hosted exclusively for the food divider. Hero primary action reads “Trải nghiệm ứng dụng ngay”; header action reads “Mở ứng dụng”. Inline benefits use weight and color, with the hero discount at 1.18 times body size. FoodMarquee sits after feedback and before the dark basil footer, lists 13 categories and loops in 65 seconds. Reduced motion remains static; the loop pauses offscreen. The hero uses a warm directional overlay to preserve natural food colors.
Palette restored to cream #f4f1e8, forest #163e2e, green #00784c and lime #d8ed9b. Typography and CTA updates retained. All background videos have posters and explicit cover bounds. Problem footage is served as H.264 faststart for cross-browser compatibility.
Mobile QA update: path-only BrandMark replaces embedded bitmap masks. Feedback uses consistent body-size quotes, footer links form a 2-column grid below 700px. Video scrub uses 960px H.264 with keyframes every 3 frames, 0.7s scroll easing and gesture-based Safari decoder priming. Real iPhone verification remains user-side.

## 18 October 2026 — Landing imagery

Four image placements extend the existing editorial rhythm: bakery closing photograph in StoryBridge, a real app screen inside a CSS phone frame in Solution, a transparent PNG bag-and-pastry cutout in Impact, and a contextual handover photograph in Community. Only the landing application is in scope. Customer and Merchant source remain unchanged.

The phone and bag have no rectangular photographic backdrop. Their physical contours and restrained shadows supply depth; the two narrative photographs retain their real setting. Images are locally stored in public/media/imagery and loaded lazily. Narrative photographs use next/image with responsive sizes; both app screens use the user-supplied screenshots. The handover image is identified as illustrative, separate from the quotations. Desktop uses a split photo/copy bridge and phone/instructions layout; these stack at 700px. Preserve both existing video scenes and the calculator behavior.

The bakery and handover photographs share an off-white photographic mat: 8px padding, 16px outer corners, 10px image corners and a restrained downward shadow. Below 700px use 6px padding, 14px outer and 8px inner corners. Captions remain outside the frame. This treatment applies only to the two contextual photographs; the transparent bag and device keep their existing silhouettes.

The phone mockups use both user-supplied screenshots at their native 1179 × 2556 resolution, encoded as lossless WebP with pixel equality verified. Serve these two small-screen assets unoptimized to preserve UI lettering instead of applying another lossy optimization pass. A responsive black Dynamic Island sits within the empty center of the existing status bar on both screens, with a subtle camera aperture; it is decorative and does not intercept input. Source applications are untouched. Superseded local backups and unused screenshot variants have been removed at the user's request.
