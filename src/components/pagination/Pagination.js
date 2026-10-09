import React from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

// Builds e.g. [1, "...", 4, 5, 6, "...", 20]. Always shows first, last and
// current ± siblings; short lists are shown in full.
export function getPageItems(current, total, siblings = 1) {
  const maxFull = siblings * 2 + 5;
  if (total <= maxFull) return Array.from({ length: total }, (_, i) => i + 1);

  const left = Math.max(current - siblings, 2);
  const right = Math.min(current + siblings, total - 1);
  const items = [1];

  if (left > 2) items.push("start-ellipsis");
  for (let p = left; p <= right; p += 1) items.push(p);
  if (right < total - 1) items.push("end-ellipsis");
  items.push(total);

  // Keep a constant slot count so the bar doesn't jump near the edges.
  if (current <= siblings + 3) {
    const head = Array.from({ length: siblings * 2 + 3 }, (_, i) => i + 1);
    return [...head, "end-ellipsis", total];
  }
  if (current >= total - siblings - 2) {
    const tail = Array.from({ length: siblings * 2 + 3 }, (_, i) => total - (siblings * 2 + 2) + i);
    return [1, "start-ellipsis", ...tail];
  }
  return items;
}

const base =
  "flex items-center justify-center h-8 min-w-[32px] px-1 sm:h-10 sm:min-w-[40px] sm:px-2 rounded-full text-[14px] sm:text-[15px] font-fancy transition select-none";

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const items = getPageItems(currentPage, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className="mt-10 pt-6 border-t border-[#e6d9d0] flex justify-center"
    >
      <ul className="flex flex-nowrap items-center justify-center gap-0.5 sm:gap-2">
        <li>
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous page"
            className={`${base} text-[#8C7367] hover:bg-[#f3ebe5] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
        </li>

        {items.map((item) =>
          typeof item === "string" ? (
            <li key={item} aria-hidden="true" className={`${base} text-[#b49d91] px-0 min-w-[20px] sm:min-w-[32px]`}>
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                onClick={() => onPageChange(item)}
                aria-label={`Page ${item}`}
                aria-current={item === currentPage ? "page" : undefined}
                className={`${base} ${
                  item === currentPage
                    ? "bg-[#8C7367] text-white"
                    : "text-[#8C7367] hover:bg-[#f3ebe5]"
                }`}
              >
                {item}
              </button>
            </li>
          )
        )}

        <li>
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next page"
            className={`${base} text-[#8C7367] hover:bg-[#f3ebe5] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </li>
      </ul>
    </nav>
  );
}
