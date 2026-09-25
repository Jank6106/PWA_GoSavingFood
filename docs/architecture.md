# GoSavingFood — Frontend Architecture

> Scope: Landing Page, Customer PWA, Merchant PWA.
> Goal: keep the codebase clear, vibe-coding friendly, visually consistent, easy to collaborate on, and easy to migrate from Mock API to a real Backend with minimal UI changes.

---

# 1. Overall Architecture

GoSavingFood uses a **monorepo**:

```text
apps/
├── web/          # Landing Page
├── customer/     # Customer PWA
└── merchant/     # Merchant PWA

packages/
├── ui/           # Shared UI components + design tokens
├── types/        # Shared domain types
├── api/          # Shared HTTP/API utilities when needed
└── config/       # Shared configuration

docs/
└── architecture.md
```

Managed with:

```text
pnpm workspaces
Turborepo
TypeScript
```

All three apps can be built and deployed independently.

---

# 2. Technology Stack

| Area         | Technology                        |
| ------------ | --------------------------------- |
| Landing Page | Next.js                           |
| Customer     | React + Vite + TypeScript + PWA   |
| Merchant     | React + Vite + TypeScript + PWA   |
| PWA Routing  | React Router                      |
| Styling      | Tailwind CSS + shadcn/ui          |
| Server State | TanStack Query                    |
| Validation   | Zod                               |
| Forms        | React Hook Form                   |
| Mock API     | MSW                               |
| Client State | React state / Zustand when needed |
| Unit Testing | Vitest + Testing Library          |
| E2E Testing  | Playwright                        |

Do not add libraries or abstractions unless they are actually needed.

---

# 3. Application Responsibilities

## `apps/web`

Landing Page responsibilities:

* introduce GoSavingFood
* SEO
* marketing content
* CTA
* link to Customer App
* link to Merchant App

It must not contain business logic from either PWA.

---

## `apps/customer`

For customers.

Expected features:

```text
auth
home
stores
products
cart
checkout
orders
profile
```

---

## `apps/merchant`

For merchants.

Expected features:

```text
auth
dashboard
products
orders
store
```

Only create new features when they are actually needed.

---

# 4. PWA Structure

Applies to both:

```text
apps/customer/src
apps/merchant/src
```

```text
src/
├── app/
│   ├── providers/
│   ├── router/
│   ├── layouts/
│   ├── config/
│   └── pwa/
│
├── features/
│   └── <feature>/
│
├── shared/
│   ├── components/
│   ├── hooks/
│   └── lib/
│
├── mocks/
│
└── main.tsx
```

### Responsibilities

```text
app/
```

Application-level configuration such as routing, providers, layouts, environment configuration, and PWA setup.

```text
features/
```

Business logic grouped by feature.

```text
shared/
```

Reusable code shared across multiple features inside the same app.

```text
mocks/
```

Mock API implementation using MSW.

---

# 5. Feature Structure

Example:

```text
features/products/
├── pages/
│   └── ProductListPage.tsx
│
├── components/
│   └── ProductCard.tsx
│
├── hooks/
│   └── useProducts.ts
│
├── api/
│   ├── product.api.ts
│   ├── product.schema.ts
│   └── product.mapper.ts
│
├── types.ts
└── index.ts
```

Not every file must be created immediately.

Only split files when there is real logic that belongs there.

---

# 6. Required Data Flow

```text
Page
 ↓
Feature Hook
 ↓
TanStack Query
 ↓
Feature API
 ↓
HTTP Client
 ↓
MSW or Backend
 ↓
Schema Validation
 ↓
Mapper
 ↓
Domain Model
 ↓
UI
```

The UI must **not call APIs directly**.

Presentation components should mainly receive:

```text
props
callbacks
```

---

# 7. Mock API

Use **MSW** to simulate the Backend.

```text
mocks/
├── browser.ts
├── handlers/
├── fixtures/
└── scenarios.ts
```

Pages and components must not import fixtures directly.

Do not write:

```ts
if (mock) {
  return mockProducts;
}
```

inside UI components or hooks.

The data flow must always remain:

```text
UI
→ Hook
→ API
→ HTTP
```

MSW only intercepts HTTP requests.

When the Backend is ready:

```text
MSW OFF
Backend ON
```

Ideally, the UI and hooks should not need to change.

---

# 8. DTO and Domain Model

Do not expose raw Backend response structures directly to the UI.

Example Backend response:

```json
{
  "product_name": "Banh mi",
  "sale_price": 15000
}
```

Frontend Domain Model:

```ts
type Product = {
  name: string;
  price: number;
};
```

Data transformation:

```text
DTO
↓
validate
↓
mapper
↓
Domain Model
```

JSX should only work with Domain Models.

---

# 9. State Management

| State Type                | Tool                          |
| ------------------------- | ----------------------------- |
| Server data               | TanStack Query                |
| Local UI state            | useState / useReducer         |
| Filters / Pagination      | URL search params             |
| Form state                | React Hook Form               |
| Cross-screen client state | Context / Zustand when needed |

Examples of server state:

```text
products
orders
stores
inventory
profile
```

Do not copy server state into Zustand.

---

# 10. Component Sharing Rules

## Used by only one feature

```text
features/<feature>/components
```

## Used by multiple features in one app

```text
shared/components
```

## Used across Customer, Merchant, or Web

```text
packages/ui
```

Examples:

```text
Button
Input
Dialog
Badge
Skeleton
EmptyState
ErrorState
```

Do not force two different business components into one shared component just for the sake of reuse.

---

# 11. Dependency Rules

Allowed dependency direction:

```text
feature
 ↓
shared
 ↓
packages
```

Do not reverse it.

Not allowed:

```text
shared → feature
packages → app
customer → merchant
merchant → customer
```

Other features should preferably import through:

```ts
features/products/index.ts
```

Avoid deep imports into another feature's internal files.

---

# 12. Design System

Shared design tokens and base UI components belong in:

```text
packages/ui
```

Example tokens:

```text
primary
surface
background
text
text-muted
border
success
warning
danger
```

Customer and Merchant may use different layouts, but should share:

```text
colors
spacing
border radius
typography
buttons
inputs
dialogs
feedback components
```

---

# 13. API and Error Handling

The HTTP Client handles:

```text
baseURL
headers
timeout
cancellation
HTTP errors
```

The API Layer handles:

```text
request
response
schema validation
mapping
```

Minimum error categories:

```text
network
timeout
unauthorized
forbidden
not-found
validation
conflict
server
invalid-response
```

The HTTP Client must not automatically:

```text
show toast
navigate
render UI
```

The Page decides how errors are presented.

---

# 14. Environment Configuration

For PWAs:

```env
VITE_API_BASE_URL=
VITE_ENABLE_MOCKS=
```

For the Landing Page:

```env
NEXT_PUBLIC_CUSTOMER_URL=
NEXT_PUBLIC_MERCHANT_URL=
```

Do not put secrets inside:

```text
VITE_*
NEXT_PUBLIC_*
```

Production must never silently fall back to Mock API.

---

# 15. PWA Rules

Customer and Merchant must have their own:

```text
manifest
icons
name
service worker
scope
```

Initial offline support only needs:

* app shell caching
* static asset caching
* offline state
* retry actions

Do not queue offline operations for:

```text
placing orders
payments
inventory updates
```

These actions must require a Backend connection for confirmation.

---

# 16. UI Rules

Every screen should consider:

```text
loading
success
empty
error
offline, when relevant
permission, when relevant
```

Do not design only for the success state.

Pages handle orchestration.

Presentation components should preferably follow:

```text
props in
events out
```

Presentation components must not call APIs directly.

---

# 17. AI Coding Rules

When vibe coding, AI must follow these rules:

1. Do not change the architecture unless explicitly requested.
2. Do not create unnecessary abstractions.
3. Do not call APIs directly from UI components.
4. Do not import mock data directly into the UI.
5. Keep feature-specific logic inside its feature.
6. Move code to `shared` only when multiple features need it.
7. Move code to `packages` only when multiple apps genuinely share it.
8. Use TanStack Query for server state.
9. Prefer React state for local UI state.
10. Do not use `any` to bypass TypeScript.
11. Do not transform DTO fields directly inside JSX.
12. Do not invent API contracts that have not been confirmed.
13. Do not create empty folders or files only because the architecture mentions them.
14. Prefer simple and extensible code over complex abstractions.

---

# 18. Adding a New Feature

Example:

```text
favorites
```

Create:

```text
features/favorites/
├── pages/
├── components/
├── hooks/
├── api/
├── types.ts
└── index.ts
```

Only create the directories that are actually needed.

Recommended flow:

```text
API
↓
Hook
↓
Page
↓
Component
```

---

# 19. Migrating from Mock to Backend

When the Backend is ready:

```text
1. Compare the API contract
2. Update DTO/schema
3. Update mapper if needed
4. Set VITE_API_BASE_URL
5. Disable MSW
6. Test against the Backend
```

Do not modify the UI if the Domain Model remains unchanged.

---

# 20. Final Principles

Prioritize:

```text
Simple
→ Clear
→ Consistent
→ Extendable
```

Avoid:

```text
Over-engineering
→ too many abstractions
→ too many layers
→ empty folders
```

The architecture should make it clear to both developers and AI:

```text
Where should this code go?
How does data flow?
Which components should be shared?
How does Mock API switch to Backend?
Where should a new feature be added?
```

If an important architectural decision changes, update `architecture.md` together with the code.
