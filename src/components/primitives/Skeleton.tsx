import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
`;

export const Skeleton = styled.div<{ $w?: string; $h?: string; $radius?: string }>`
  display: inline-block;
  width: ${({ $w }) => $w ?? '100%'};
  height: ${({ $h }) => $h ?? '14px'};
  border-radius: ${({ $radius, theme }) => $radius ?? theme.radius.sm};
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.color.surfaceAlt} 0%,
    color-mix(in srgb, ${({ theme }) => theme.color.surfaceAlt} 60%, ${({ theme }) => theme.color.surface}) 50%,
    ${({ theme }) => theme.color.surfaceAlt} 100%
  );
  background-size: 200px 100%;
  background-repeat: no-repeat;
  animation: ${shimmer} 1.4s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
