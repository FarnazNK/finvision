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
    color-scheme: ${({ theme }) => theme.name};
    font-feature-settings: 'cv11', 'ss01', 'ss03';
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  /* Only <html> paints the base colour; an opaque <body> would cover the
     aurora layers, which sit at negative z-index in the root context. */
  body {
    background: transparent;
    overflow-x: hidden;
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

  input, select, textarea { font: inherit; }

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

  /*
   * Aurora backdrop. Glass only reads as glass when there is colour behind it,
   * so three soft blobs drift slowly under the whole app. Fixed + GPU-composited
   * (transform only), and frozen for reduced-motion users.
   */
  body::before {
    content: '';
    position: fixed;
    inset: -20vmax;
    pointer-events: none;
    z-index: -2;
    background:
      radial-gradient(38vmax 32vmax at 18% 12%, ${({ theme }) => theme.glass.aurora[0]}, transparent 70%),
      radial-gradient(34vmax 30vmax at 88% 22%, ${({ theme }) => theme.glass.aurora[1]}, transparent 70%),
      radial-gradient(40vmax 30vmax at 60% 96%, ${({ theme }) => theme.glass.aurora[2]}, transparent 70%);
    filter: blur(20px);
    animation: aurora-drift 28s ease-in-out infinite alternate;
    will-change: transform;
  }

  /* Hairline grid + vignette: gives the glass something to refract. */
  body::after {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: -1;
    background-image:
      linear-gradient(${({ theme }) => theme.color.chartGrid} 1px, transparent 1px),
      linear-gradient(90deg, ${({ theme }) => theme.color.chartGrid} 1px, transparent 1px);
    background-size: 56px 56px;
    -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, #000 30%, transparent 85%);
    mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, #000 30%, transparent 85%);
    opacity: 0.55;
  }

  @keyframes aurora-drift {
    0%   { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
    50%  { transform: translate3d(3vmax, -2vmax, 0) rotate(8deg) scale(1.06); }
    100% { transform: translate3d(-3vmax, 2vmax, 0) rotate(-6deg) scale(1.02); }
  }

  /* Native dropdown lists can't be translucent; keep them readable. */
  option {
    background: ${({ theme }) => theme.color.surfaceSolid};
    color: ${({ theme }) => theme.color.text};
  }

  .tabular { font-variant-numeric: tabular-nums; }

  button, a, input, select {
    -webkit-tap-highlight-color: transparent;
  }

  button:active:not(:disabled) {
    transform: scale(0.985);
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

  /* Visually hidden but still read by screen readers. */
  .sr-only {
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
