"use client";

import { ReactNode, useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";

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
  const [isPending, startTransition] = useTransition();

  /* ── Internal state for trigger mode ── */
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = "isOpen" in props && props.isOpen !== undefined;
  const isOpen = isControlled ? props.isOpen : internalOpen;

  const close = useCallback(() => {
    if (isPending) return;

    if (isControlled) {
      startTransition(() => {
        router.push((props as ControlledProps).closeHref, { scroll: false });
      });
    } else {
      startTransition(() => {
        setInternalOpen(false);
      });
    }
  }, [isControlled, isPending, props, router, startTransition]);

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
          onClick={() => {
            if (isPending) return;
            startTransition(() => {
              setInternalOpen(true);
            });
          }}
          disabled={isPending}
          className={
            props.buttonVariant === "secondary"
              ? `sx-btn sx-btn-secondary ${isPending ? "cursor-wait opacity-70" : ""}`
              : `sx-btn sx-btn-primary ${isPending ? "cursor-wait opacity-70" : ""}`
          }
        >
          {isPending ? <Loader2 size={18} className="animate-spin flex-shrink-0" /> : <Plus size={18} className="flex-shrink-0" />}
          <span>{isPending ? "Abriendo..." : props.buttonLabel}</span>
        </button>
      ) : null}

      {/* Modal overlay */}
      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm md:items-center"
          onClick={(e) => {
            if (!isPending && e.target === e.currentTarget) close();
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
            {isPending ? (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/75 backdrop-blur-[1px]">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
                  <Loader2 size={16} className="animate-spin" />
                  <span>Cerrando modal...</span>
                </div>
              </div>
            ) : null}
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
                disabled={isPending}
                className={`rounded-full p-1.5 text-gray-500 transition duration-200 hover:bg-gray-100 hover:text-gray-700 ${isPending ? "cursor-wait opacity-60" : ""}`}
                aria-label="Cerrar formulario"
              >
                {isPending ? <Loader2 size={20} className="animate-spin" /> : <X size={20} />}
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
