import { css } from 'styled-components';

/**
 * Frosted-glass surface.
 *
 * - Translucent fill + backdrop blur from theme tokens.
 * - A 1px gradient "edge" drawn with a masked pseudo-element, so the border
 *   catches light at the top-left like real glass instead of being a flat line.
 * - Falls back to the solid surface where backdrop-filter is unsupported or
 *   the user asked for reduced transparency, keeping text contrast intact.
 *
 * The host needs `position: relative` (set here) and must not use ::before.
 */
export const glass = css`
  position: relative;
  background: ${({ theme }) => theme.color.surface};
  -webkit-backdrop-filter: ${({ theme }) => theme.glass.blur};
  backdrop-filter: ${({ theme }) => theme.glass.blur};
  border: 1px solid ${({ theme }) => theme.color.border};
  box-shadow: ${({ theme }) => theme.glass.highlight}, ${({ theme }) => theme.glass.shadow};

  &::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    padding: 1px;
    background: ${({ theme }) => theme.glass.edge};
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }

  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    background: ${({ theme }) => theme.color.surfaceSolid};
  }

  @media (prefers-reduced-transparency: reduce) {
    background: ${({ theme }) => theme.color.surfaceSolid};
    backdrop-filter: none;
  }
`;

/** Glass that lifts on hover. Use for interactive or primary panels. */
export const glassInteractive = css`
  ${glass}
  transition:
    transform ${({ theme }) => theme.motion.slow},
    box-shadow ${({ theme }) => theme.motion.slow},
    border-color ${({ theme }) => theme.motion.slow};

  &:hover {
    border-color: ${({ theme }) => theme.color.borderStrong};
    box-shadow: ${({ theme }) => theme.glass.highlight}, ${({ theme }) => theme.glass.shadow},
      ${({ theme }) => theme.glass.glow};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
