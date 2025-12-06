'use client'

import clsx from 'clsx'

type PaginationProps = {
  totalItems: number
  pageSize: number
  currentPage: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({
  totalItems,
  pageSize,
  currentPage,
  onPageChange,
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(Math.max(1, currentPage), totalPages)

  function goTo(page: number) {
    const next = Math.min(Math.max(1, page), totalPages)
    if (next !== safePage) {
      onPageChange(next)
    }
  }

  if (totalPages <= 1) return null

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <button
        aria-label="Previous page"
        disabled={safePage <= 1}
        onClick={() => goTo(safePage - 1)}
        className="grid h-10 w-10 place-items-center rounded-xl border border-gray-300 bg-white text-[color:var(--brand,_#00156B)] hover:bg-gray-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-300"
      >
        <span className="sr-only">Previous</span>
        ‹
      </button>

      {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNumber) => (
        <button
          key={pageNumber}
          onClick={() => goTo(pageNumber)}
          className={clsx(
            'h-10 w-10 rounded-xl border text-sm font-semibold transition',
            safePage === pageNumber
              ? 'border-transparent bg-[color:var(--brand,_#00156B)] text-white shadow-sm'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
          )}
          aria-current={safePage === pageNumber ? 'page' : undefined}
        >
          {pageNumber}
        </button>
      ))}

      <button
        aria-label="Next page"
        disabled={safePage >= totalPages}
        onClick={() => goTo(safePage + 1)}
        className="grid h-10 w-10 place-items-center rounded-xl border border-gray-300 bg-white text-[color:var(--brand,_#00156B)] hover:bg-gray-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-300"
      >
        <span className="sr-only">Next</span>
        ›
      </button>
    </div>
  )
}
