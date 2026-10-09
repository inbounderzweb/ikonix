import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

// Back button + breadcrumb trail. items: [{ label, to? }]; last item is the current page.
export default function PageNav({ items, fallback = "/", className = "" }) {
  const navigate = useNavigate();
  const location = useLocation();

  // location.key is "default" on a fresh load, i.e. nothing to go back to.
  const goBack = () => {
    if (location.key !== "default") navigate(-1);
    else navigate(fallback);
  };

  return (
    <div className={`flex items-center gap-3 font-fancy text-sm text-[#6C5950]/80 ${className}`}>
      <button
        type="button"
        onClick={goBack}
        aria-label="Go back"
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#e6d9d0] text-[#8C7367] transition hover:bg-[#f3ebe5]"
      >
        <ArrowLeftIcon className="h-4 w-4" />
      </button>

      <nav aria-label="Breadcrumb" className="min-w-0">
        <ol className="flex min-w-0 items-center">
          {items.map((item, i) => {
            const last = i === items.length - 1;
            return (
              <li key={`${item.label}-${i}`} className={`flex items-center ${last ? "min-w-0" : "flex-shrink-0"}`}>
                {last || !item.to ? (
                  <span aria-current={last ? "page" : undefined} className="truncate font-medium text-[#53443D]">
                    {item.label}
                  </span>
                ) : (
                  <Link to={item.to} className="hover:underline">
                    {item.label}
                  </Link>
                )}
                {!last && <ChevronRightIcon className="mx-1.5 h-3.5 w-3.5 flex-shrink-0 text-[#b49d91]" />}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
