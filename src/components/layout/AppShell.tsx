import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { media } from '@/utils/responsive';

interface Props {
  children: ReactNode;
}

export function AppShell({ children }: Props) {
  return (
    <Root>
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      <Sidebar />
      <Stack>
        <Topbar />
        <Main id="main-content" tabIndex={-1}>
          {children}
        </Main>
        <MobileNav aria-label="Primary">
          <MobileNavLink to="/app" end>Overview</MobileNavLink>
          <MobileNavLink to="/holdings">Holdings</MobileNavLink>
          <MobileNavLink to="/markets">Markets</MobileNavLink>
          <MobileNavLink to="/transactions">Activity</MobileNavLink>
          <MobileNavLink to="/watchlist">Watchlist</MobileNavLink>
        </MobileNav>
      </Stack>
    </Root>
  );
}

const Root = styled.div`
  display: flex;
  min-height: 100vh;
  background: transparent;
`;

const Stack = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0; /* prevents grid blowouts inside flex */
`;

const Main = styled.main`
  flex: 1;
  min-width: 0;
  padding: ${({ theme }) => `${theme.space[5]} ${theme.space[4]} ${theme.space[10]}`};
  max-width: ${({ theme }) => theme.layout.contentMaxWidth};
  width: 100%;
  margin: 0 auto;
  animation: workspace-enter 480ms cubic-bezier(0.2, 0, 0, 1) both;

  @keyframes workspace-enter {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  &:focus {
    outline: none;
  }

  ${media.md`padding: ${({ theme }) => `${theme.space[6]} ${theme.space[8]}`};`}
`;

const MobileNav = styled.nav`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: ${({ theme }) => theme.space[1]};
  position: sticky;
  bottom: 0;
  z-index: ${({ theme }) => theme.z.sticky};
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[2]} calc(${theme.space[2]} + env(safe-area-inset-bottom))`};
  background: ${({ theme }) => theme.color.surface};
  border-top: 1px solid ${({ theme }) => theme.color.border};
  box-shadow: 0 -12px 36px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(18px);

  @media (max-width: 360px) { gap: 0; padding-left: 0; padding-right: 0; }
  ${media.md`display: none;`}
`;

const MobileNavLink = styled(NavLink)`
  min-width: 0;
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[1]}`};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.fontSize.xs};
  font-weight: ${({ theme }) => theme.fontWeight.medium};
  text-align: center;
  text-decoration: none;
  min-height: 44px;
  display: grid;
  place-items: center;
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.color.primary}; outline-offset: -2px; }
  transition: background ${({ theme }) => theme.motion.base}, color ${({ theme }) => theme.motion.base};

  &.active {
    background: color-mix(in srgb, ${({ theme }) => theme.color.primary} 12%, transparent);
    color: ${({ theme }) => theme.color.primary};
  }
`;

const SkipLink = styled.a`
  position: absolute;
  left: ${({ theme }) => theme.space[4]};
  top: ${({ theme }) => theme.space[4]};
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[3]}`};
  background: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.primaryText};
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: ${({ theme }) => theme.fontWeight.medium};
  text-decoration: none;
  z-index: ${({ theme }) => theme.z.toast};
  transform: translateY(-200%);
  transition: transform ${({ theme }) => theme.motion.fast};

  &:focus {
    transform: translateY(0);
  }
`;
