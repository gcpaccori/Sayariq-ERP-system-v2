"use client";

import { ReactNode, useState } from "react";
import ActionFormModal from "@/components/action-form-modal";

type Props = {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export default function FormToggleSection({ title, description, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <ActionFormModal
      title={title}
      description={description}
      open={open}
      onOpenChange={setOpen}
      size="lg"
      trigger={
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-[#1A73E8] bg-[#1A73E8] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1765CC]"
        >
          Abrir formulario
        </button>
      }
    >
      <div className="min-w-0">{children}</div>
    </ActionFormModal>
  );
}
