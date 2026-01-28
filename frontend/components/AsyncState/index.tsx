'use client';

import { createContext, useContext, ReactNode } from 'react';

interface AsyncStateContextValue {
  loading: boolean;
  error: string | null;
  empty: boolean;
}

const AsyncStateContext = createContext<AsyncStateContextValue | null>(null);

interface AsyncStateProps {
  loading: boolean;
  error?: string | null;
  empty: boolean;
  children: ReactNode;
}

export function AsyncState({ loading, error, empty, children }: AsyncStateProps) {
  return (
    <AsyncStateContext.Provider value={{ loading, error: error ?? null, empty }}>
      {children}
    </AsyncStateContext.Provider>
  );
}

function Loading({ children }: { children: ReactNode }) {
  const ctx = useContext(AsyncStateContext);
  if (!ctx?.loading) return null;
  return <>{children}</>;
}

function Error({ children }: { children: ReactNode | ((error: string) => ReactNode) }) {
  const ctx = useContext(AsyncStateContext);
  if (!ctx?.error) return null;
  return <>{typeof children === 'function' ? children(ctx.error) : children}</>;
}

function Empty({ children }: { children: ReactNode }) {
  const ctx = useContext(AsyncStateContext);
  if (ctx?.loading || ctx?.error || !ctx?.empty) return null;
  return <>{children}</>;
}

function Success({ children }: { children: ReactNode }) {
  const ctx = useContext(AsyncStateContext);
  if (ctx?.loading || ctx?.error || ctx?.empty) return null;
  return <>{children}</>;
}

AsyncState.Loading = Loading;
AsyncState.Error = Error;
AsyncState.Empty = Empty;
AsyncState.Success = Success;
