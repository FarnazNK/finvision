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
          <MobileNavLink to="/" end>Overview</MobileNavLink>
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
  background: ${({ theme }) => theme.color.bg};
`;

const Stack = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0; /* prevents grid blowouts inside flex */
`;

const Main = styled.main`
  flex: 1;
  padding: ${({ theme }) => `${theme.space[5]} ${theme.space[4]} ${theme.space[10]}`};
  max-width: ${({ theme }) => theme.layout.contentMaxWidth};
  width: 100%;
  margin: 0 auto;

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
