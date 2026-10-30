import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled, { keyframes, useTheme } from 'styled-components';
import { useAppStore } from '@/app/hooks';
import {
  selectCurrency,
  selectLiveFeed,
  selectThemeMode,
  } from '@/features/ui/uiSlice';
import { selectLastUpdated } from '@/features/portfolio/portfolioSlice';
import { formatRelativeTime } from '@/utils/format';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { media } from '@/utils/responsive';
import { CommandPalette, Kbd, useCommandPaletteHotkey } from '@/components/command/CommandPalette';

export function Topbar() {
  const currencyChanged = useAppStore((s) => s.currencyChanged);
  const liveFeedToggled = useAppStore((s) => s.liveFeedToggled);
  const themeModeChanged = useAppStore((s) => s.themeModeChanged);
  const location = useLocation();
  const themeMode = useAppStore(selectThemeMode);
  const theme = useTheme();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && theme.name === 'dark');
  const liveFeed = useAppStore(selectLiveFeed);
  const currency = useAppStore(selectCurrency);
  const lastUpdated = useAppStore(selectLastUpdated);
  const [paletteOpen, setPaletteOpen] = useCommandPaletteHotkey();
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  // Re-render every 15s so the relative-time label stays fresh.
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  return (
    <Bar role="banner">
      <MobileBrand>
        <BrandLogo size={28} />
      </MobileBrand>
      <PageName>{pageName(location.pathname)}</PageName>

      <SearchTrigger
        type="button"
        onClick={() => setPaletteOpen(true)}
        aria-haspopup="dialog"
        aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <SearchText>Search or jump to…</SearchText>
        <SearchKeys aria-hidden="true">
          <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
          <Kbd>K</Kbd>
        </SearchKeys>
      </SearchTrigger>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      <Right>
        <CurrencySelect
          aria-label="Display currency"
          value={currency}
          onChange={(e) => currencyChanged(e.target.value)}
        >
          <option value="USD">USD</option>
          <option value="CAD">CAD</option>
          <option value="EUR">EUR</option>
        </CurrencySelect>
        <LiveStatus
          type="button"
          onClick={() => liveFeedToggled()}
          aria-pressed={liveFeed}
          aria-label={liveFeed ? 'Pause simulated price updates' : 'Resume simulated price updates'}
        >
          <Dot $live={liveFeed} aria-hidden="true" />
          <LiveLabel>
            {liveFeed ? 'Demo prices' : 'Demo paused'}
            {lastUpdated && (
              <LiveSub aria-hidden="true">{formatRelativeTime(lastUpdated)}</LiveSub>
            )}
          </LiveLabel>
        </LiveStatus>

        <ThemeToggle
          type="button"
          onClick={() => themeModeChanged(isDark ? 'light' : 'dark')}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" /></svg>
          )}
        </ThemeToggle>
        <SignInLink to="/auth">Sign in</SignInLink>
      </Right>
    </Bar>
  );
}

const Bar = styled.header`
  position: sticky;
  top: 0;
  z-index: ${({ theme }) => theme.z.sticky};
  background: color-mix(in srgb, ${({ theme }) => theme.color.bg} 55%, transparent);
  -webkit-backdrop-filter: ${({ theme }) => theme.glass.blur};
  backdrop-filter: ${({ theme }) => theme.glass.blur};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  min-height: ${({ theme }) => theme.layout.headerHeight};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  padding: 0 ${({ theme }) => theme.space[3]};

  ${media.sm`gap: ${({ theme }) => theme.space[4]}; padding: 0 ${({ theme }) => theme.space[4]};`}
  ${media.md`padding: 0 ${({ theme }) => theme.space[8]};`}
`;

const MobileBrand = styled.div`
  display: flex;
  ${media.md`display: none;`}
`;

const PageName = styled.div`
  display: none;
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: ${({ theme }) => theme.fontWeight.medium};
  ${media.md`display: block;`}
`;

const SearchTrigger = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  height: 36px;
  padding: 0 ${({ theme }) => theme.space[2]} 0 ${({ theme }) => theme.space[3]};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.surface};
  box-shadow: ${({ theme }) => theme.glass.highlight};
  color: ${({ theme }) => theme.color.textSubtle};
  font-size: ${({ theme }) => theme.fontSize.sm};
  transition: border-color ${({ theme }) => theme.motion.fast}, color ${({ theme }) => theme.motion.fast};

  &:hover {
    border-color: ${({ theme }) => theme.color.borderStrong};
    color: ${({ theme }) => theme.color.textMuted};
  }

  ${media.md`min-width: 280px; margin-left: ${({ theme }) => theme.space[4]};`}
`;

const SearchText = styled.span`
  display: none;
  flex: 1;
  text-align: left;
  ${media.md`display: inline;`}
`;

const SearchKeys = styled.span`
  display: none;
  gap: 3px;
  ${media.md`display: inline-flex;`}
`;

const Right = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  margin-left: auto;
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.6; }
`;

const Dot = styled.span<{ $live: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $live, theme }) =>
    $live ? theme.color.success : theme.color.textSubtle};
  animation: ${({ $live }) => ($live ? pulse : 'none')} 1.6s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const LiveStatus = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  padding: ${({ theme }) => `${theme.space[1]} ${theme.space[3]}`};
  height: 32px;
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.border};
  box-shadow: ${({ theme }) => theme.glass.highlight};
  border-radius: ${({ theme }) => theme.radius.pill};
  color: ${({ theme }) => theme.color.text};
  font-size: ${({ theme }) => theme.fontSize.xs};
  cursor: pointer;
`;

const LiveLabel = styled.span`
  /* On phones the pulsing dot alone carries the state; the button keeps its aria-label. */
  @media (max-width: 520px) { display: none; }
  white-space: nowrap;
  display: inline-flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.space[2]};
  font-weight: ${({ theme }) => theme.fontWeight.medium};
`;

const LiveSub = styled.span`
  @media (max-width: 520px) { display: none; }
  color: ${({ theme }) => theme.color.textMuted};
  font-weight: ${({ theme }) => theme.fontWeight.regular};
`;

const ThemeToggle = styled.button`
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.border};
  box-shadow: ${({ theme }) => theme.glass.highlight};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.color.text};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.color.surfaceAlt};
  }
`;

const SignInLink = styled(Link)`
  white-space: nowrap;
  padding: 6px ${({ theme }) => theme.space[3]};
  border-radius: ${({ theme }) => theme.radius.md};
  background: linear-gradient(135deg, ${({ theme }) => theme.color.primary}, ${({ theme }) => theme.color.accent});
  color: #fff;
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  text-decoration: none;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25),
    0 8px 20px -8px color-mix(in srgb, ${({ theme }) => theme.color.primary} 80%, transparent);

  &:hover {
    text-decoration: none;
    filter: brightness(1.08);
  }
`;

const CurrencySelect = styled.select`
  padding: 6px 8px;
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.text};

  @media (max-width: 520px) {
    display: none;
  }
`;

function pageName(path: string): string {
  const names: Record<string, string> = {
    '/app': 'Overview',
    '/holdings': 'Holdings',
    '/markets': 'Markets',
    '/transactions': 'Transactions',
    '/watchlist': 'Watchlist',
  };
  return names[path] ?? '';
}
