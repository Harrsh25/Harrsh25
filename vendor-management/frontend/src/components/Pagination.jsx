import { useMemo, useState } from "react";
import { IconChevronLeft, IconChevronRight } from "./Icons.jsx";

const PAGE_SIZE = 8;

// Real client-side pagination over an already-fetched list — the backend
// has no pagination yet (every list endpoint returns everything), so this
// slices in the browser rather than faking page controls that do nothing.
export function usePagination(items, pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const total = items?.length ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(page, pageCount);
  const start = (clampedPage - 1) * pageSize;
  const pageItems = useMemo(() => items?.slice(start, start + pageSize) ?? [], [items, start, pageSize]);
  return { page: clampedPage, setPage, pageCount, total, start, pageItems };
}

export function TableFooter({ page, setPage, pageCount, total, start, pageSize = PAGE_SIZE, completedCount, addLabel, onAdd }) {
  const end = Math.min(start + pageSize, total);
  return (
    <div className="table-footer">
      {onAdd ? (
        <button onClick={onAdd}>+ {addLabel}</button>
      ) : completedCount !== undefined ? (
        <span>{completedCount} / {total} Completed</span>
      ) : (
        <span />
      )}
      <div className="pagination">
        <span>{total === 0 ? "0" : `${start + 1}-${end}`} of {total}</span>
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}><IconChevronLeft /></button>
        <button disabled={page >= pageCount} onClick={() => setPage(page + 1)}><IconChevronRight /></button>
      </div>
    </div>
  );
}
