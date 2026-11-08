import { createContext } from 'react';

export interface TransitionCtx {
  exiting: boolean;
  go: (to: string, ms?: number) => void;
}

export const Ctx = createContext<TransitionCtx>({ exiting: false, go: () => {} });
