# GoSavingFood AI Development Rules

Before implementing a feature, read:

- docs/architecture.md
- docs/design-system.md

## Architecture

Follow feature-based architecture.

Do not introduce a new architecture without approval.

## UI

Reuse components from packages/ui.

Before creating:

Button
Input
Card
Modal
Badge

check whether it already exists.

Do not duplicate shared components.

## Styling

Follow design-system.md.

Do not hard-code arbitrary colors,
spacing or border radius.

Mobile-first.

## Data

Components must never import mock data directly.

Correct:

Page
→ Hook
→ Service
→ Mock/API

Wrong:

Page
→ mockProducts.json

## API

UI must not depend on backend response format directly.

Map API response into frontend domain types.

## TypeScript

Do not use `any` unless unavoidable.

## Refactoring

Do not rewrite unrelated files.

Do not change existing architecture when implementing
a small feature.

## New files

Before creating a file,
check whether an equivalent file/component already exists.

## Scope

Only modify files required for the requested feature.
