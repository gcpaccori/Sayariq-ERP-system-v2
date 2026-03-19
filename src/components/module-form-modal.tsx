"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

type MaxWidth = "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";

const MAX_WIDTH_MAP: Record<MaxWidth, string> = {
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
};

/* ─── Trigger-mode props: renders its own button ─── */
type TriggerProps = {
  buttonLabel: string;
  buttonVariant?: "primary" | "secondary";
  isOpen?: never;
  closeHref?: never;
};

/* ─── Controlled-mode props: server passes a URL to navigate on close ─── */
type ControlledProps = {
  buttonLabel?: never;
  buttonVariant?: never;
  isOpen: boolean;
  /** URL to navigate to when the modal is closed (e.g. "?tab=x" without the trigger param). */
  closeHref: string;
};

type Props = (TriggerProps | ControlledProps) & {
  title: string;
  description?: string;
  maxWidth?: MaxWidth;
  children: ReactNode;
};

export default function ModuleFormModal(props: Props) {
  const { title, description, maxWidth = "4xl", children } = props;
  const router = useRouter();

  /* ── Internal state for trigger mode ── */
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = "isOpen" in props && props.isOpen !== undefined;
  const isOpen = isControlled ? props.isOpen : internalOpen;

  const close = useCallback(() => {
    if (isControlled) {
      router.push((props as ControlledProps).closeHref);
    } else {
      setInternalOpen(false);
    }
  }, [isControlled, props, router]);

  /* ── Close on Escape ── */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, close]);

  /* ── Lock body scroll when open ── */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const widthClass = MAX_WIDTH_MAP[maxWidth] ?? MAX_WIDTH_MAP["4xl"];

  return (
    <>
      {/* Trigger button — only rendered in trigger mode */}
      {!isControlled && props.buttonLabel ? (
        <button
          type="button"
          onClick={() => setInternalOpen(true)}
          className={
            props.buttonVariant === "secondary"
              ? "sx-btn sx-btn-secondary"
              : "sx-btn sx-btn-primary"
          }
        >
          <Plus size={18} className="flex-shrink-0" />
          <span>{props.buttonLabel}</span>
        </button>
      ) : null}

      {/* Modal overlay */}
      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm md:items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`relative ${widthClass} max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl md:m-4 md:rounded-2xl`}
            style={{
              animation: "sx-modal-enter 0.25s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-gray-200 bg-gradient-to-r from-white to-gray-50 px-6 py-5 md:rounded-t-2xl">
              <div className="flex-1">
                <h2 className="text-xl font-bold tracking-tight text-gray-900">
                  {title}
                </h2>
                {description ? (
                  <p className="mt-1 text-xs font-medium text-gray-600">
                    {description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-full p-1.5 text-gray-500 transition duration-200 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Cerrar formulario"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5">{children}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
