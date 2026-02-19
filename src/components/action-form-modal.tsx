"use client";

import {
  cloneElement,
  isValidElement,
  ReactElement,
  ReactNode,
  useEffect,
  useId,
  useRef,
} from "react";

type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

type ActionFormModalProps = {
  title: string;
  description?: string;
  trigger: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  size?: ModalSize;
};

const sizeClassMap: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
  full: "max-w-[96vw]",
};

export default function ActionFormModal({
  title,
  description,
  trigger,
  open,
  onOpenChange,
  children,
  size = "md",
}: ActionFormModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    const focusTarget = dialogRef.current?.querySelector<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
    );
    focusTarget?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, onOpenChange]);

  const openModal = () => onOpenChange(true);

  const triggerElement = isValidElement(trigger)
    ? cloneElement(trigger as ReactElement<{ onClick?: () => void }>, {
        onClick: openModal,
      })
    : (
      <button type="button" onClick={openModal}>
        {trigger}
      </button>
    );

  return (
    <>
      {triggerElement}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm md:items-center"
          onClick={() => onOpenChange(false)}
          aria-hidden="true"
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            className={`relative w-full ${sizeClassMap[size]} max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl md:m-4 md:rounded-2xl`}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-gray-200 bg-white/95 px-4 py-4 backdrop-blur-sm md:px-6">
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="text-lg font-bold tracking-tight text-gray-900 md:text-xl">
                  {title}
                </h2>
                {description && (
                  <p id={descriptionId} className="mt-1 text-xs font-medium text-gray-600 md:text-sm">
                    {description}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-md px-2 py-1 text-sm font-semibold text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                aria-label="Cerrar modal"
              >
                Cerrar
              </button>
            </header>

            <div className="min-w-0 px-4 py-4 md:px-6 md:py-5">{children}</div>
          </div>
        </div>
      )}
    </>
  );
}
