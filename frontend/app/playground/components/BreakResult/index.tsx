import { BreakResultEmpty } from './BreakResultEmpty';
import { BreakResultNoExpenses } from './BreakResultNoExpenses';
import { BreakResultNeverRunsOut } from './BreakResultNeverRunsOut';
import { BreakResultInsufficientSavings } from './BreakResultInsufficientSavings';
import { BreakResultRunsOutImmediately } from './BreakResultRunsOutImmediately';
import { BreakResultNormal } from './BreakResultNormal';

export const BreakResult = {
  Empty: BreakResultEmpty,
  NoExpenses: BreakResultNoExpenses,
  NeverRunsOut: BreakResultNeverRunsOut,
  InsufficientSavings: BreakResultInsufficientSavings,
  RunsOutImmediately: BreakResultRunsOutImmediately,
  Normal: BreakResultNormal,
};

export type { BreakResultProps } from './types';
