# GoSavingFood landing page

This Next.js app owns the entire public landing page. Customer and merchant PWAs remain separate apps in the monorepo.

## Structure

- `app/page.tsx`: landing section order and customer/merchant destinations.
- `app/components/`: only components imported by the landing page or layout.
- `app/components/LandingMotion.tsx`: repeatable viewport reveals; observes dynamically mounted audience rows.
- `app/components/useScrollVideo.ts`: pinned video scrubbing and hero dissolve.
- `app/globals.css`: Tailwind and global defaults.
- `app/landing.css`: landing layout, brand tokens, header and motion styles.
- `app/fonts/`: local fonts and their OFL licenses.
- `public/media/`: `logo-mark.svg`, `hero-scrub.mp4` (video 1), `hero-poster.jpg`, `problem-scrub.mp4` (video 2), `problem-poster.jpg`, and `imagery/`.
- `public/manifest.json`, `public/sw.js`: PWA configuration. Video range requests pass directly to the network.
- `DESIGN.md`, `.impeccable/design.json`: design reference.

The supplied SVG uses embedded raster images/masks rather than editable vector paths. Preserve the source; a true path-based export can replace it later without changing component code.

## Development

From repository root: `pnpm --filter web dev`.
Within this folder: `pnpm dev`, `pnpm build`, `pnpm lint`.

Motion respects `prefers-reduced-motion`. Content is visible without JavaScript. Scrolling stays native, with smoothing limited to cinematic animation progress. Test both video directions when replacing either film.
