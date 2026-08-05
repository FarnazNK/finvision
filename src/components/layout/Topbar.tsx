import { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  liveFeedToggled,
  selectLiveFeed,
  selectThemeMode,
  themeModeChanged,
} from '@/features/ui/uiSlice';
import { selectLastUpdated } from '@/features/portfolio/portfolioSlice';
import { formatRelativeTime } from '@/utils/format';
import { Input } from '@/components/primitives/Input';
import { media } from '@/utils/responsive';

export function Topbar() {
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector(selectThemeMode);
  const liveFeed = useAppSelector(selectLiveFeed);
  const lastUpdated = useAppSelector(selectLastUpdated);

  // Re-render every 15s so the relative-time label stays fresh.
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  return (
    <Bar role="banner">
      <SearchWrap>
        <Input
          label="Search"
          hideLabel
          placeholder="Search holdings, transactions, symbols…"
          iconStart={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          }
        />
      </SearchWrap>

      <Right>
        <LiveStatus
          type="button"
          onClick={() => dispatch(liveFeedToggled())}
          aria-pressed={liveFeed}
          aria-label={liveFeed ? 'Pause live data feed' : 'Resume live data feed'}
        >
          <Dot $live={liveFeed} aria-hidden="true" />
          <LiveLabel>
            {liveFeed ? 'Live' : 'Paused'}
            {lastUpdated && (
              <LiveSub aria-hidden="true">{formatRelativeTime(lastUpdated)}</LiveSub>
            )}
          </LiveLabel>
        </LiveStatus>

        <ThemeToggle
          type="button"
          onClick={() => {
            const next =
              themeMode === 'light' ? 'dark' : themeMode === 'dark' ? 'system' : 'light';
            dispatch(themeModeChanged(next));
          }}
          aria-label={`Theme: ${themeMode}. Click to change.`}
          title={`Theme: ${themeMode}`}
        >
          {themeMode === 'light' ? '☀' : themeMode === 'dark' ? '☾' : '⌒'}
          <ThemeLabel>{themeMode}</ThemeLabel>
        </ThemeToggle>
      </Right>
    </Bar>
  );
}

const Bar = styled.header`
  position: sticky;
  top: 0;
  z-index: ${({ theme }) => theme.z.sticky};
  background: ${({ theme }) => theme.color.surface};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  height: ${({ theme }) => theme.layout.headerHeight};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[4]};
  padding: 0 ${({ theme }) => theme.space[4]};

  ${media.md`padding: 0 ${({ theme }) => theme.space[6]};`}
`;

const SearchWrap = styled.div`
  flex: 1;
  max-width: 480px;
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
  background: ${({ theme }) => theme.color.surfaceAlt};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.pill};
  color: ${({ theme }) => theme.color.text};
  font-size: ${({ theme }) => theme.fontSize.xs};
  cursor: pointer;
`;

const LiveLabel = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.space[2]};
  font-weight: ${({ theme }) => theme.fontWeight.medium};
`;

const LiveSub = styled.span`
  color: ${({ theme }) => theme.color.textMuted};
  font-weight: ${({ theme }) => theme.fontWeight.regular};
`;

const ThemeToggle = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  padding: ${({ theme }) => `6px ${theme.space[3]}`};
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.color.text};
  font-size: ${({ theme }) => theme.fontSize.sm};
  cursor: pointer;
  text-transform: capitalize;

  &:hover {
    background: ${({ theme }) => theme.color.surfaceAlt};
  }
`;

const ThemeLabel = styled.span`
  display: none;
  ${media.sm`display: inline;`}
`;
