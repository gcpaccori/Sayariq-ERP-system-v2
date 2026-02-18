'use client';

import { ReactNode } from 'react';

interface EstadoCuentaClientWrapperProps {
  children: ReactNode;
}

export function EstadoCuentaClientWrapper({ children }: EstadoCuentaClientWrapperProps) {
  return <>{children}</>;
}
