import { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type Props = {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export default function FormToggleSection({ title, description, defaultOpen = false, children }: Props) {
  return (
    <details open={defaultOpen} className="group rounded-xl border border-gray-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:content-none md:px-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {description ? <p className="text-xs text-gray-500">{description}</p> : null}
        </div>
        <ChevronDown className="h-4 w-4 text-gray-500 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-gray-100 p-4 md:p-5">{children}</div>
    </details>
  );
}
