import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Filter,
  Loader2,
  MapPin,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Button, EmptyState, ErrorState, Skeleton } from '@gosavingfood/ui';
import { useCustomerFinder } from '../../../hooks/useCustomerFinder';
import type { Merchant, SurpriseBag } from '../../../shared/types/customer.types';
import { FinderCriteriaChips } from '../components/FinderCriteriaChips';
import { FinderQueryForm } from '../components/FinderQueryForm';
import { FinderResultCard } from '../components/FinderResultCard';
import { FinderWarnings } from '../components/FinderWarnings';
import './finder-page.css';

export interface FinderPageProps {
  bags: SurpriseBag[];
  merchants: Merchant[];
  coords?: { lat: number; lng: number } | null;
  currentLocation: string;
  catalogLoading?: boolean;
  catalogError?: string | null;
  onBack: () => void;
  onOpenBag: (bag: SurpriseBag) => void;
  onOpenLocation?: () => void;
  onRetryCatalog?: () => void;
  onBrowseAll?: () => void;
}

export function FinderPage({
  bags,
  merchants,
  coords,
  currentLocation,
  catalogLoading = false,
  catalogError = null,
  onBack,
  onOpenBag,
  onOpenLocation,
  onRetryCatalog,
  onBrowseAll,
}: FinderPageProps) {
  const {
    apiEnabled,
    query,
    setQuery,
    response,
    isLoading,
    error,
    search,
    searchLocal,
    reset,
  } = useCustomerFinder({
    bags,
    merchants,
    coords,
  });

  // Lưu trữ query đã submit gần nhất để gắn kết kết quả với query tương ứng
  const [submittedQuery, setSubmittedQuery] = useState<string>('');
  const resultsRef = useRef<HTMLDivElement>(null);

  // Cuộn tới vùng kết quả tôn trọng tùy chọn reduced motion của người dùng
  const scrollToResults = useCallback(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    resultsRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }, []);

  // Xử lý gửi tìm kiếm
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const trimmed = query.trim();
      if (!trimmed || isLoading || catalogLoading) return;
      setSubmittedQuery(trimmed);
      await search();
      scrollToResults();
    },
    [query, isLoading, catalogLoading, search, scrollToResults]
  );

  // Xử lý khi bấm vào câu mẫu từ biên bản họp
  const handleSelectExample = useCallback(
    async (exampleText: string) => {
      setQuery(exampleText);
      setSubmittedQuery(exampleText);
      await search(exampleText);
      scrollToResults();
    },
    [setQuery, search, scrollToResults]
  );

  // Xử lý fallback cục bộ tường minh khi AI lỗi hoặc muốn dùng bộ lọc offline (giữ nguyên input)
  const handleFallbackLocal = useCallback(async () => {
    const trimmed = query.trim();
    if (trimmed) {
      setSubmittedQuery(trimmed);
    }
    if (searchLocal) {
      await searchLocal();
    } else {
      await search();
    }
  }, [query, searchLocal, search]);

  // Xử lý đặt lại tìm kiếm
  const handleReset = useCallback(() => {
    setSubmittedQuery('');
    reset();
  }, [reset]);

  // Lọc kết quả khả dụng theo danh mục hiện có:
  // Hook chịu trách nhiệm revalidation đầy đủ stock/price.
  // UI chỉ loại bỏ missing/unknown bag, tuyệt đối không tự chắp vá snapshot giá khác nhau.
  const currentBagIds = useMemo(() => new Set(bags.map((b) => b.id)), [bags]);

  const availableResults = useMemo(() => {
    if (!response?.results) return [];
    if (bags.length === 0) return response.results;
    return response.results.filter((res) => currentBagIds.has(res.bag.id));
  }, [response, bags, currentBagIds]);

  return (
    <div className="gsf-finder-screen">
      {/* 1. Header điều hướng */}
      <header className="gsf-finder-topbar">
        <button
          type="button"
          className="gsf-finder-back-btn"
          onClick={onBack}
          aria-label="Quay lại"
          title="Quay lại"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>

        <div className="gsf-finder-topbar-title-block">
          <h1 className="gsf-finder-topbar-title">Tìm món theo nhu cầu</h1>
          {onOpenLocation ? (
            <button
              type="button"
              className="gsf-finder-location-trigger"
              onClick={onOpenLocation}
              aria-label={`Vị trí hiện tại: ${currentLocation || 'Hà Nội'}. Bấm để đổi vị trí`}
            >
              <MapPin size={12} className="gsf-finder-inline-icon" aria-hidden="true" />
              <span className="gsf-finder-location-text">{currentLocation || 'Hà Nội'}</span>
              <ChevronRight size={12} aria-hidden="true" />
            </button>
          ) : (
            <div className="gsf-finder-location-trigger is-static">
              <MapPin size={12} className="gsf-finder-inline-icon" aria-hidden="true" />
              <span className="gsf-finder-location-text">{currentLocation || 'Hà Nội'}</span>
            </div>
          )}
        </div>
      </header>

      <div className="gsf-finder-container">
        {/* 2. Trạng thái tải hoặc lỗi của danh mục hệ thống */}
        {catalogLoading && (
          <div className="gsf-finder-catalog-loading" role="status">
            <Loader2 size={20} className="gsf-finder-spin" aria-hidden="true" />
            <span>Đang đồng bộ danh mục cửa hàng mới nhất...</span>
          </div>
        )}

        {catalogError && (
          <div className="gsf-finder-section">
            <ErrorState
              title="Không thể tải danh mục cửa hàng"
              message={catalogError}
              onRetry={onRetryCatalog}
              retryText="Thử tải lại"
            />
          </div>
        )}

        {/* 3. Form nhập câu tự nhiên + Ví dụ từ biên bản họp */}
        <section className="gsf-finder-section">
          <FinderQueryForm
            query={query}
            onQueryChange={setQuery}
            onSubmit={handleSubmit}
            onSelectExample={handleSelectExample}
            isLoading={isLoading || catalogLoading}
          />
        </section>

        {/* 4. Thông báo chế độ (Local Filter vs AI) - Ngắn gọn, trung thực */}
        <section className="gsf-finder-section" aria-label="Chế độ xử lý">
          {response?.mode === 'ai' || (apiEnabled && !response) ? (
            <div className="gsf-finder-mode-banner gsf-finder-mode-banner--ai">
              <div className="gsf-finder-mode-header">
                <Sparkles size={16} className="gsf-finder-mode-icon" aria-hidden="true" />
                <span className="gsf-finder-mode-title">{response?.mode === 'ai' ? 'Chế độ: AI hiểu yêu cầu' : 'Chế độ: Tìm kiếm bằng AI'}</span>
              </div>
              <p className="gsf-finder-mode-desc">
                {response?.mode === 'ai'
                  ? `Đã phân tích yêu cầu bằng ${response.model || 'OpenAI'}. Kết quả lấy từ danh mục hiện có.`
                  : 'Gửi yêu cầu để OpenAI phân tích. Bạn cần đăng nhập để sử dụng AI.'}
              </p>
            </div>
          ) : (
            <div className="gsf-finder-mode-banner gsf-finder-mode-banner--local">
              <div className="gsf-finder-mode-header">
                <Filter size={16} className="gsf-finder-mode-icon" aria-hidden="true" />
                <span className="gsf-finder-mode-title">Chế độ: Bộ lọc theo nhu cầu</span>
              </div>
              <p className="gsf-finder-mode-desc">
                Tìm theo quy tắc trong danh mục hiện có, không gọi AI.
              </p>
            </div>
          )}
        </section>

        {/* 5. Vùng kết quả tìm kiếm */}
        <div ref={resultsRef} className="gsf-finder-results-anchor">
          {/* Trạng thái đang tìm kiếm */}
          {isLoading && (
            <section className="gsf-finder-section" role="status" aria-live="polite">
              <div className="gsf-finder-loading-state">
                <div className="gsf-finder-loading-text">
                  <Loader2 size={24} className="gsf-finder-spin" aria-hidden="true" />
                  <span>Đang phân tích tiêu chí và tìm món phù hợp...</span>
                </div>
                <div className="gsf-finder-skeletons">
                  <div className="gsf-finder-skeleton-card">
                    <Skeleton height="180px" />
                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <Skeleton width="60%" height="18px" />
                      <Skeleton width="90%" height="14px" />
                      <Skeleton width="40%" height="16px" />
                    </div>
                  </div>
                  <div className="gsf-finder-skeleton-card">
                    <Skeleton height="180px" />
                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <Skeleton width="60%" height="18px" />
                      <Skeleton width="90%" height="14px" />
                      <Skeleton width="40%" height="16px" />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Trạng thái lỗi tìm kiếm (offline / network error / AI server error) - Giữ nguyên query */}
          {!isLoading && error && (
            <section className="gsf-finder-section">
              <ErrorState
                title="Không thể hoàn tất tìm kiếm"
                message={error}
                onRetry={() => search()}
                retryText="Thử lại"
              />
              <div className="gsf-finder-error-fallback-actions">
                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={handleFallbackLocal}
                  leftIcon={<Filter size={16} />}
                >
                  Dùng Bộ lọc theo nhu cầu (Cục bộ)
                </Button>
                {onBrowseAll && (
                  <Button
                    variant="ghost"
                    size="md"
                    fullWidth
                    onClick={onBrowseAll}
                  >
                    Xem tất cả túi cứu trợ
                  </Button>
                )}
              </div>
            </section>
          )}

          {/* Trạng thái có phản hồi tìm kiếm */}
          {!isLoading && !error && response && (
            <section className="gsf-finder-section" aria-label="Kết quả tìm kiếm">
              {/* Tiêu chí đã nhận diện */}
              <FinderCriteriaChips constraints={response.constraints} />

              {/* Cảnh báo riêng (chỉ hiển thị khi có warnings) */}
              <FinderWarnings warnings={response.warnings} />

              {/* Nếu danh mục đang loading hoặc đang lỗi, không hiển thị EmptyState khẳng định hết món */}
              {catalogLoading ? (
                <div className="gsf-finder-catalog-loading" role="status">
                  <Loader2 size={20} className="gsf-finder-spin" aria-hidden="true" />
                  <span>Đang tải danh mục cửa hàng, vui lòng chờ...</span>
                </div>
              ) : catalogError ? (
                <div className="gsf-finder-section">
                  <ErrorState
                    title="Chưa thể tìm kiếm vì lỗi tải danh mục cửa hàng"
                    message={catalogError}
                    onRetry={onRetryCatalog}
                    retryText="Thử tải lại danh mục"
                  />
                </div>
              ) : availableResults.length > 0 ? (
                <div className="gsf-finder-results-container">
                  <div className="gsf-finder-results-header">
                    <h3 className="gsf-finder-results-count">
                      Tìm thấy <strong>{availableResults.length}</strong> món phù hợp
                      {submittedQuery ? (
                        <> cho yêu cầu: <em>"{submittedQuery}"</em></>
                      ) : null}
                    </h3>
                    {submittedQuery && query.trim() !== submittedQuery && (
                      <p className="gsf-finder-stale-query-notice">
                        (Đang chỉnh sửa yêu cầu mới. Bấm &quot;Tìm món phù hợp&quot; để cập nhật kết quả)
                      </p>
                    )}
                  </div>

                  <div className="gsf-finder-results-grid">
                    {availableResults.map((result) => (
                      <FinderResultCard
                        key={result.bag.id}
                        result={result}
                        onOpenBag={onOpenBag}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="Không tìm thấy món phù hợp"
                  description="Không có túi giải cứu nào khớp với toàn bộ tiêu chí (ngân sách, số lượng khả dụng, khung giờ nhận hoặc khu vực). Bạn hãy thử điều chỉnh ngân sách, đổi giờ nhận hoặc duyệt toàn bộ danh mục."
                  action={
                    <div className="gsf-finder-empty-actions">
                      <Button
                        variant="primary"
                        size="md"
                        onClick={handleReset}
                        leftIcon={<RefreshCw size={16} />}
                      >
                        Đặt lại tìm kiếm
                      </Button>
                      {onBrowseAll && (
                        <Button
                          variant="outline"
                          size="md"
                          onClick={onBrowseAll}
                        >
                          Xem tất cả túi cứu trợ
                        </Button>
                      )}
                    </div>
                  }
                />
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default FinderPage;
