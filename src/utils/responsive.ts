import { css, type CSSObject, type Interpolation } from 'styled-components';
import type { AppTheme } from '@/theme/tokens';

/**
 * Mobile-first media-query helper.
 *
 *     ${media.md`padding: ${({theme}) => theme.space[8]};`}
 *
 * Generates `@media (min-width: ${theme.breakpoint.md})` blocks.
 */
type Breakpoint = keyof AppTheme['breakpoint'];

type CssLiteral = (
  strings: TemplateStringsArray,
  ...interpolations: Array<Interpolation<{ theme: AppTheme }>>
) => ReturnType<typeof css>;

export const media: Record<Breakpoint, CssLiteral> = (() => {
  const keys: Breakpoint[] = ['sm', 'md', 'lg', 'xl'];
  const out = {} as Record<Breakpoint, CssLiteral>;
  for (const k of keys) {
    out[k] = (strings, ...interp) => css`
      @media (min-width: ${({ theme }) => theme.breakpoint[k]}) {
        ${css(strings, ...(interp as Interpolation<object>[]))}
      }
    `;
  }
  return out;
})();

/** Truncate text to a single line. */
export const truncate: CSSObject = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};
