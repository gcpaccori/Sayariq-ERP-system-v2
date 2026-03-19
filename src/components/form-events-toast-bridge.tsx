"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Toaster, toast } from "sonner";

const RESULT_TOAST_DEDUPE_MS = 800;

type ToastId = string | number;

type FormField = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function normalizeLabel(value: string) {
  return value.replace(/\s+/g, " ").replace(/\*/g, "").trim();
}

function getFieldLabel(field: FormField) {
  const dataLabel = normalizeLabel(field.getAttribute("data-label") ?? "");
  if (dataLabel) return dataLabel;

  const ariaLabel = normalizeLabel(field.getAttribute("aria-label") ?? "");
  if (ariaLabel) return ariaLabel;

  if (field.id) {
    const relatedLabel = document.querySelector(`label[for="${CSS.escape(field.id)}"]`);
    const relatedText = normalizeLabel(relatedLabel?.textContent ?? "");
    if (relatedText) return relatedText;
  }

  const wrapperLabel = field.closest("label");
  const wrapperText = normalizeLabel(wrapperLabel?.textContent ?? "");
  if (wrapperText) return wrapperText;

  const placeholder = normalizeLabel(field.getAttribute("placeholder") ?? "");
  if (placeholder) return placeholder;

  const name = normalizeLabel(field.getAttribute("name") ?? "");
  if (name) return name;

  return "este campo";
}

function buildValidationMessage(field: FormField) {
  const label = getFieldLabel(field);
  const validity = field.validity;

  if (validity.valueMissing) {
    return `Completa el campo "${label}".`;
  }

  if (validity.typeMismatch) {
    return `El formato de "${label}" no es valido.`;
  }

  if (validity.patternMismatch) {
    return `El valor ingresado en "${label}" no cumple el formato esperado.`;
  }

  if (validity.tooShort) {
    return `El campo "${label}" tiene menos caracteres de los permitidos.`;
  }

  if (validity.tooLong) {
    return `El campo "${label}" supera la longitud permitida.`;
  }

  if (validity.rangeUnderflow || validity.rangeOverflow || validity.stepMismatch) {
    return `Revisa el valor numerico de "${label}".`;
  }

  const customMessage = normalizeLabel(field.validationMessage ?? "");
  return customMessage || `Revisa el campo "${label}".`;
}

function getFirstInvalidField(form: HTMLFormElement) {
  return form.querySelector<FormField>("input:invalid, select:invalid, textarea:invalid");
}

function getLoadingMessage(form: HTMLFormElement, submitter: HTMLElement | null) {
  const method = (form.getAttribute("method") || form.method || "GET").toUpperCase();
  const actionLabel = normalizeLabel(submitter?.textContent ?? "");

  if (actionLabel) {
    return `${actionLabel}...`;
  }

  if (method === "GET") {
    return "Aplicando filtros...";
  }

  return "Procesando formulario...";
}

export default function FormEventsToastBridge() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pendingToastIdRef = useRef<ToastId | null>(null);
  const pendingMethodRef = useRef<string | null>(null);
  const pendingTimeoutRef = useRef<number | null>(null);
  const lastResultToastRef = useRef<{ signature: string; at: number } | null>(
    null,
  );

  useEffect(() => {
    const handleSubmit = (event: Event) => {
      const submitEvent = event as SubmitEvent;

      if (!(event.target instanceof HTMLFormElement)) {
        return;
      }

      const form = event.target;

      if (!form.noValidate && !form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();

        const invalidField = getFirstInvalidField(form);
        if (invalidField) {
          invalidField.focus();
          toast.error(buildValidationMessage(invalidField));
          return;
        }

        toast.error("Revisa los campos obligatorios del formulario.");
        return;
      }

      const submitter = submitEvent.submitter instanceof HTMLElement ? submitEvent.submitter : null;

      if (pendingToastIdRef.current !== null) {
        toast.dismiss(pendingToastIdRef.current);
      }

      if (pendingTimeoutRef.current !== null) {
        window.clearTimeout(pendingTimeoutRef.current);
        pendingTimeoutRef.current = null;
      }

      pendingMethodRef.current = (form.getAttribute("method") || form.method || "GET").toUpperCase();
      pendingToastIdRef.current = toast.loading(getLoadingMessage(form, submitter));

      pendingTimeoutRef.current = window.setTimeout(() => {
        if (pendingToastIdRef.current !== null) {
          toast.dismiss(pendingToastIdRef.current);
          pendingToastIdRef.current = null;
          pendingMethodRef.current = null;
        }
      }, 15000);
    };

    document.addEventListener("submit", handleSubmit, true);
    return () => {
      document.removeEventListener("submit", handleSubmit, true);

      if (pendingTimeoutRef.current !== null) {
        window.clearTimeout(pendingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (pendingToastIdRef.current !== null) {
      toast.dismiss(pendingToastIdRef.current);
      pendingToastIdRef.current = null;
    }

    if (pendingTimeoutRef.current !== null) {
      window.clearTimeout(pendingTimeoutRef.current);
      pendingTimeoutRef.current = null;
    }

    const ok = normalizeLabel(searchParams.get("ok") ?? "");
    const error = normalizeLabel(searchParams.get("error") ?? "");
    const searchSnapshot = searchParams.toString();

    if (ok || error) {
      const signature = `${pathname}?${searchSnapshot}`;
      const now = Date.now();
      const isImmediateDuplicate =
        lastResultToastRef.current?.signature === signature &&
        now - lastResultToastRef.current.at < RESULT_TOAST_DEDUPE_MS;

      if (!isImmediateDuplicate) {
        if (error) {
          toast.error(error);
        }

        if (ok) {
          toast.success(ok);
        }

        lastResultToastRef.current = { signature, at: now };
      }

      pendingMethodRef.current = null;
      return;
    }

    if (pendingMethodRef.current === "GET") {
      toast.success("Formulario aplicado correctamente.");
      pendingMethodRef.current = null;
      return;
    }

    if (pendingMethodRef.current === "POST") {
      toast.success("Accion completada correctamente.");
      pendingMethodRef.current = null;
    }
  }, [pathname, searchParams]);

  return (
    <Toaster
      richColors
      closeButton
      position="top-right"
      toastOptions={{
        duration: 3500,
      }}
    />
  );
}
