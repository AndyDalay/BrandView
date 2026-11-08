import { useContext } from 'react';
import { Ctx } from './transitionContext';

export function useTransition() {
  return useContext(Ctx);
}
