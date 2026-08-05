import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; }

  html, body {
    margin: 0;
    padding: 0;
    height: 100%;
    background: ${({ theme }) => theme.color.bg};
    color: ${({ theme }) => theme.color.text};
    font-family: ${({ theme }) => theme.font.sans};
    font-size: ${({ theme }) => theme.fontSize.base};
    line-height: ${({ theme }) => theme.lineHeight.normal};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  body {
    transition:
      background ${({ theme }) => theme.motion.base},
      color ${({ theme }) => theme.motion.base};
  }

  #root {
    min-height: 100%;
    isolation: isolate;
  }

  h1, h2, h3, h4, h5, h6 {
    margin: 0;
    font-weight: ${({ theme }) => theme.fontWeight.semibold};
    line-height: ${({ theme }) => theme.lineHeight.tight};
    letter-spacing: -0.01em;
  }

  p { margin: 0; }

  a {
    color: ${({ theme }) => theme.color.primary};
    text-decoration: none;
    border-radius: ${({ theme }) => theme.radius.xs};
  }

  a:hover { text-decoration: underline; }

  button { font-family: inherit; cursor: pointer; }

  /* High-contrast keyboard focus, hidden for mouse users — accessibility win. */
  :focus { outline: none; }
  :focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.focusRing};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radius.sm};
  }

  /* Respect user motion preferences. */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
      scroll-behavior: auto !important;
    }
  }

  /* Subtle, theme-aware scrollbars */
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.color.border};
    border-radius: ${({ theme }) => theme.radius.pill};
  }
  ::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.color.borderStrong};
  }

  /* Selection */
  ::selection {
    background: ${({ theme }) => theme.color.primary};
    color: ${({ theme }) => theme.color.primaryText};
  }

  /* Visually hidden helper — common a11y pattern */
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
`;
