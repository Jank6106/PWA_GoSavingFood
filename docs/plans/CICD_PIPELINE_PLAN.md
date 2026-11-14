# CICD_PIPELINE_PLAN.md — Kế hoạch Triển khai Tự động hóa CI/CD (GitHub Actions)

> **Mục tiêu**: Xây dựng hệ thống CI/CD tự động toàn diện qua GitHub Actions, biến toàn bộ kim tự tháp kiểm thử (Unit Test, Local DB Integration, Playwright E2E và Monorepo Turbo Build) thành **Cổng kiểm soát chất lượng (Quality Gate)** bắt buộc. Mọi Pull Request và commit trước khi vào nhánh chính (`master`) đều phải xanh 100%, bảo vệ hệ thống tuyệt đối khi nhóm bắt đầu tích hợp các tính năng AI.
>
> **Đối tượng thực hiện**: Codex / AI Coding Agent hoặc DevOps/Lead Developer.  
> **Quy chuẩn bắt buộc**: Tuân thủ nghiêm ngặt [`AGENTS.md`](../../AGENTS.md), [`docs/TESTING.md`](../TESTING.md), và các quyết định kiến trúc tại [`docs/adr/ADR-006-local-database-bootstrap.md`](../adr/ADR-006-local-database-bootstrap.md), [`docs/adr/ADR-007-local-browser-e2e.md`](../adr/ADR-007-local-browser-e2e.md).

---

## 1. Hiện trạng & Định hướng Kiến trúc

```mermaid
flowchart TD
    subgraph TriggerEvent["Sự kiện Kích hoạt (Git Events)"]
        PR["Mở Pull Request vào master"]
        Push["Push trực tiếp vào master"]
    end

    subgraph GitHubRunner["GitHub Actions Runner (ubuntu-latest)"]
        subgraph Job1["Job 1: Fast Quality Gate (~1.5 phút)"]
            Lint["pnpm lint (Code Quality)"]
            Unit["pnpm test:offline (14 Vitest Units)"]
            Build["pnpm build (Turbo: Web, Customer, Merchant, UI)"]
        end

        subgraph Job2["Job 2: Database Integration Test (~2.5 phút)"]
            SupabaseDocker["Khởi động Supabase Container (npx supabase start)"]
            MigrateSeed["Tự động chạy 42 Migrations + seed.sql"]
            LocalDBTest["pnpm test:local (42 RLS & RPC Tests)"]
        end

        subgraph Job3["Job 3: End-to-End Browser Test (~3-4 phút)"]
            PlaywrightSetup["Cài đặt Playwright Chromium (có cache)"]
            E2ERunner["pnpm test:e2e (9 Ca test Multi-Context)"]
            Artifacts["Upload Traces/Screenshots nếu có lỗi"]
        end
    end

    subgraph Delivery["Giai đoạn CD: Triển khai Tự động (Vercel)"]
        VercelDeploy["Vercel Production Auto-Deploy\n(gosavingfood.app, PWA Customer, PWA Merchant)"]
        Block["Chặn Merge PR / Gửi cảnh báo về Discord/GitHub"]
    end

    TriggerEvent --> GitHubRunner
    Job1 --> Job2
    Job2 --> Job3
    Job3 -->|Tất cả Xanh (Pass 100%)| VercelDeploy
    Job1 -.->|Thất bại| Block
    Job2 -.->|Thất bại| Block
    Job3 -.->|Thất bại| Block
```

### 1.1. Ưu thế vượt trội của Môi trường CI hiện tại
* **100% Zero-Cloud Dependency**: CI không gọi ra Supabase Cloud thật (`lblwvbedtlxjtkcuxmsf`) hay PayOS. Mọi thứ chạy trên Docker container cục bộ ngay trên máy ảo GitHub runner.
* **Không tốn phí (Zero Cost)**: GitHub Actions miễn phí 2.000 phút/tháng cho public/private repositories.
* **Thời gian chạy tối ưu (~4-6 phút)**: Nhờ tận dụng bộ nhớ đệm (Cache) của pnpm store, Turborepo cache và Playwright browser cache.

---

## 2. Thiết kế Chi tiết Pipeline GitHub Actions

Pipeline được định nghĩa tại file: `.github/workflows/ci.yml`.

### Job 1: `quality-check` (Kiểm tra Tĩnh & Unit Test)
* **Mục đích**: Phát hiện sớm các lỗi cú pháp, gãy kiểu dữ liệu hoặc gãy Unit test trong vòng 90 giây trước khi khởi động Docker.
* **Các bước thực thi**:
  1. `actions/checkout@v4`.
  2. `pnpm/action-setup@v4` (cố định phiên bản `11.13.1` theo `package.json`).
  3. `actions/setup-node@v4` (Node.js 22.x, cache pnpm store).
  4. Cài đặt dependencies: `pnpm install --frozen-lockfile`.
  5. Chạy Unit test: `pnpm test:offline` (14 tests).
  6. Chạy Build toàn bộ monorepo: `pnpm build` (xác nhận cả 3 apps `web`, `customer`, `merchant` đều biên dịch được).
  7. *(Tùy chọn cấu hình)*: Chạy `pnpm lint` với cờ cảnh báo (hoặc chạy chặn sau khi dọn xong 113 lỗi ESLint của Merchant).

### Job 2: `database-integration` (Kiểm thử Tích hợp Database)
* **Phụ thuộc**: Chạy sau khi `quality-check` thành công.
* **Các bước thực thi**:
  1. Setup môi trường Node.js & pnpm tương tự Job 1.
  2. Cài đặt Supabase CLI và khởi động container:
     ```bash
     npx supabase start
     ```
  3. Xác thực trạng thái database: Container PostgreSQL 17 và Realtime engine sẵn sàng trên cổng `54321` và `54322`.
  4. Nạp cấu hình `.env.test` từ mẫu `.env.test.example`.
  5. Chạy test tích hợp backend: `pnpm test:local` (42 tests).
  6. Dọn dẹp: `npx supabase stop`.

### Job 3: `e2e-playwright` (Kiểm thử Toàn trình Giao diện & Realtime)
* **Phụ thuộc**: Chạy sau khi `database-integration` thành công.
* **Các bước thực thi**:
  1. Khởi động lại cụm Docker Supabase sạch (`npx supabase start`).
  2. Cache & Cài đặt Playwright browser:
     ```bash
     npx playwright install chromium --with-deps
     ```
  3. Chạy toàn bộ 9 ca test E2E:
     ```bash
     pnpm test:e2e
     ```
  4. Lưu vết sự cố (Artifact): Nếu có bài test fail, tự động nén thư mục `playwright-report/` và `test-results/` tải lên GitHub Actions Artifacts để developer tải về xem video/ảnh chụp màn hình debug.

---

## 3. Kế hoạch Triển khai Từng Bước cho Codex (Step-by-Step)

### Bước 1: Tạo file cấu hình Workflow [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)
Tạo thư mục `.github/workflows/` và viết file `ci.yml` chuẩn hóa theo mẫu:

```yaml
name: CI Quality Gate

on:
  push:
    branches: [ master, main ]
  pull_request:
    branches: [ master, main ]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality-check:
    name: Fast Quality Gate & Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 11.13.1

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Install Dependencies
        run: pnpm install --frozen-lockfile

      - name: Run Offline Unit Tests
        run: pnpm test:offline

      - name: Run Monorepo Build
        run: pnpm build

  database-integration:
    name: Docker Supabase Integration Tests
    needs: quality-check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 11.13.1

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Install Dependencies
        run: pnpm install --frozen-lockfile

      - name: Start Docker Supabase
        run: |
          npx supabase start
          cp .env.test.example .env.test

      - name: Run Local Database Tests
        run: pnpm test:local

  e2e-playwright:
    name: E2E Playwright Tests
    needs: database-integration
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 11.13.1

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Install Dependencies
        run: pnpm install --frozen-lockfile

      - name: Start Docker Supabase
        run: |
          npx supabase start
          cp .env.test.example .env.test

      - name: Install Playwright Chromium
        run: npx playwright install chromium --with-deps

      - name: Run E2E Tests
        run: pnpm test:e2e

      - name: Upload Playwright Report on Failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: |
            playwright-report/
            test-results/
          retention-days: 7
```

---

### Bước 2: Tinh chỉnh Script Headless cho CI trong [`package.json`](../../package.json)
* Đảm bảo các script `pnpm test:local` và `pnpm test:e2e` tự động nhận diện môi trường CI (cờ `CI=true`) để không mở giao diện tương tác UI.
* Kiểm tra `scripts/test-e2e.mjs` để chắc chắn nó tự động cấp phát cổng và khởi chạy server Next.js + Vite mượt mà trên môi trường Linux Ubuntu của GitHub Actions.

---

### Bước 3: Thiết lập Cổng Bảo vệ (Branch Protection Rules trên GitHub)
Sau khi workflow được đẩy lên GitHub:
1. Vào **Settings** của GitHub Repository $\rightarrow$ Chọn **Branches**.
2. Thêm rule cho nhánh `master`:
   * Tick chọn: **Require status checks to pass before merging**.
   * Chọn các checks bắt buộc:
     * `Fast Quality Gate & Build`
     * `Docker Supabase Integration Tests`
     * `E2E Playwright Tests`
   * Tick chọn: **Require branches to be up to date before merging**.
3. **Kết quả**: Bất kỳ ai (kể cả Tech Lead) nếu commit code làm gãy 1 bài test E2E hay build lỗi, nút **Merge Pull Request** sẽ bị khóa màu xám, hoàn toàn không thể merge vào `master`.

---

### Bước 4: Khóa luồng Triển khai Tự động (CD - Continuous Delivery)
* Dự án hiện tại đã liên kết Vercel với Git repository (qua 3 dự án `gosavingfood.app`, `gsf-customer-pwa`, `gsf-merchant-pwa`).
* **Cơ chế CD chuẩn**:
  * Khi mở PR: Vercel tự động tạo **Preview Deployment** tạm thời để xem trước giao diện.
  * Chỉ khi toàn bộ 3 Job CI bên trên **PASS 100%** và PR được merge vào `master`, Vercel mới tiến hành build và đẩy lên **Production**.

---

## 4. Tiêu chuẩn Nghiệm thu CI/CD (Acceptance Criteria)

- [ ] File `.github/workflows/ci.yml` được tạo đúng chuẩn cú pháp GitHub Actions.
- [ ] Chạy giả lập hoặc push thử lên branch test $\rightarrow$ Cả 3 jobs đều chạy thành công trên máy ảo `ubuntu-latest`.
- [ ] Thời gian toàn bộ pipeline hoàn tất dưới **6 phút**.
- [ ] Không rò rỉ secret hoặc token thật lên log của GitHub Actions.
- [ ] Khi có 1 bài test cố tình bị làm fail $\rightarrow$ Workflow ngắt ngay lập tức và upload artifact report.
- [ ] Cập nhật tài liệu [`docs/DEPLOYMENT.md`](../DEPLOYMENT.md) và [`docs/CHANGELOG.md`](../CHANGELOG.md).
