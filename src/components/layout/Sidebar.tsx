import { NavLink } from 'react-router-dom';
import styled, { css } from 'styled-components';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { selectSidebarCollapsed, sidebarToggled } from '@/features/ui/uiSlice';
import { media } from '@/utils/responsive';

interface NavItem {
  to: string;
  label: string;
  /** Inline SVG keeps the bundle lean — no icon library needed. */
  icon: JSX.Element;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Overview', icon: iconHome() },
  { to: '/holdings', label: 'Holdings', icon: iconBriefcase() },
  { to: '/markets', label: 'Markets', icon: iconChart() },
  { to: '/transactions', label: 'Transactions', icon: iconReceipt() },
  { to: '/watchlist', label: 'Watchlist', icon: iconStar() },
];

export function Sidebar() {
  const collapsed = useAppSelector(selectSidebarCollapsed);
  const dispatch = useAppDispatch();

  return (
    <Aside aria-label="Primary" $collapsed={collapsed}>
      <Brand>
        <BrandMark aria-hidden="true">M</BrandMark>
        {!collapsed && <BrandWord>Portfolio</BrandWord>}
      </Brand>

      <Nav>
        <ul>
          {NAV.map((item) => (
            <li key={item.to}>
              <NavItemLink to={item.to} end={item.to === '/'}>
                <span aria-hidden="true">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </NavItemLink>
            </li>
          ))}
        </ul>
      </Nav>

      <CollapseBtn
        type="button"
        onClick={() => dispatch(sidebarToggled())}
        aria-expanded={!collapsed}
        aria-controls="primary-nav"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <span aria-hidden="true">{collapsed ? '›' : '‹'}</span>
      </CollapseBtn>
    </Aside>
  );
}

const Aside = styled.aside<{ $collapsed: boolean }>`
  position: sticky;
  top: 0;
  height: 100vh;
  width: ${({ theme, $collapsed }) =>
    $collapsed ? '72px' : theme.layout.sidebarWidth};
  flex-shrink: 0;
  background: ${({ theme }) => theme.color.surface};
  border-right: 1px solid ${({ theme }) => theme.color.border};
  display: none;
  flex-direction: column;
  padding: ${({ theme }) => `${theme.space[5]} ${theme.space[3]}`};
  gap: ${({ theme }) => theme.space[6]};
  transition: width ${({ theme }) => theme.motion.base};

  ${media.md`display: flex;`}
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  padding: 0 ${({ theme }) => theme.space[2]};
  height: 32px;
`;

const BrandMark = styled.div`
  width: 28px;
  height: 28px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.primaryText};
  display: grid;
  place-items: center;
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  font-size: 14px;
  letter-spacing: -0.02em;
`;

const BrandWord = styled.div`
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  font-size: ${({ theme }) => theme.fontSize.md};
  letter-spacing: -0.01em;
`;

const Nav = styled.nav`
  flex: 1;
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
`;

const linkBase = css`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[3]}`};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: ${({ theme }) => theme.fontWeight.medium};
  text-decoration: none;
  transition: background ${({ theme }) => theme.motion.fast},
    color ${({ theme }) => theme.motion.fast};

  &:hover {
    background: ${({ theme }) => theme.color.surfaceAlt};
    color: ${({ theme }) => theme.color.text};
    text-decoration: none;
  }

  svg {
    flex-shrink: 0;
  }
`;

const NavItemLink = styled(NavLink)`
  ${linkBase}
  &.active {
    background: color-mix(in srgb, ${({ theme }) => theme.color.primary} 12%, transparent);
    color: ${({ theme }) => theme.color.primary};
  }
`;

const CollapseBtn = styled.button`
  align-self: flex-end;
  width: 28px;
  height: 28px;
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.textMuted};
  border-radius: ${({ theme }) => theme.radius.sm};
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 14px;

  &:hover {
    color: ${({ theme }) => theme.color.text};
    background: ${({ theme }) => theme.color.surfaceAlt};
  }
`;

// ----- Inline SVG icons -----
function iconHome() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}
function iconBriefcase() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
function iconChart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 3 3 5-6" />
    </svg>
  );
}
function iconReceipt() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3h14v18l-3-2-3 2-3-2-3 2-2-1.4Z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}
function iconStar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l2.7 5.5 6 .9-4.4 4.3 1 6L12 17l-5.4 2.7 1-6L3.3 9.4l6-.9z" />
    </svg>
  );
}
