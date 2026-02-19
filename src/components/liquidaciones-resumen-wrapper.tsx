"use client";
// M5-PR-SYNC: cambio de traza para consolidar PR del módulo 5

import type { ComponentProps } from "react";
import LiquidacionesResumenTable from "./liquidaciones-resumen-table";

type LiquidacionesResumenWrapperProps = ComponentProps<typeof LiquidacionesResumenTable>;

export default function LiquidacionesResumenWrapper(props: LiquidacionesResumenWrapperProps) {
  return <LiquidacionesResumenTable {...props} />;
}
