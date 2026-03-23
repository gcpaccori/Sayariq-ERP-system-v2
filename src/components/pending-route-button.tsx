"use client";

import { ReactNode, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type Props = {
  href: string;
  className?: string;
  children: ReactNode;
  pendingLabel?: ReactNode;
  disabled?: boolean;
  preserveScroll?: boolean;
};

export default function PendingRouteButton({
  href,
  className,
  children,
  pendingLabel,
  disabled = false,
  preserveScroll = true,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={disabled || isPending}
      onClick={() => {
        if (disabled || isPending) return;
        startTransition(() => {
          router.push(href, { scroll: !preserveScroll });
        });
      }}
      className={`${className ?? ""} ${disabled || isPending ? "cursor-wait disabled:opacity-60" : ""}`.trim()}
    >
      {isPending ? (
        <>
          <Loader2 size={14} className="animate-spin" />
          <span>{pendingLabel ?? children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
