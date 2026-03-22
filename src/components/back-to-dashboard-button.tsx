"use client";

import { useRouter } from "next/navigation";

type BackToDashboardButtonProps = {
  className?: string;
  label?: string;
};

export default function BackToDashboardButton({
  className,
  label = "← Atrás",
}: BackToDashboardButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (typeof window !== "undefined") {
      const referrer = document.referrer;

      if (referrer) {
        try {
          const refUrl = new URL(referrer);
          const sameOrigin = refUrl.origin === window.location.origin;
          const isPublicLanding = refUrl.pathname === "/";

          if (sameOrigin && !isPublicLanding && window.history.length > 1) {
            router.back();
            return;
          }
        } catch {
          router.push("/dashboard");
          return;
        }
      }
    }

    router.push("/dashboard");
  };

  return (
    <button type="button" onClick={handleClick} className={className}>
      {label}
    </button>
  );
}
