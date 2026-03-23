"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  confirmMessage: string;
};

export default function ConfirmSubmitButton({
  children,
  className,
  confirmMessage,
}: Props) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
