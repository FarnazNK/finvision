import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes, useTheme } from 'styled-components';
import { useAppStore } from '@/app/hooks';
import { selectCurrency, selectLiveFeed } from '@/features/ui/uiSlice';
import { glass } from '@/theme/glass';

export interface Command {
  id: string;
  label: string;
  group: 'Navigate' | 'Preferences';
  hint?: string;
  keywords?: string;
  run: () => void;
}

/**
 * Subsequence match with a score: consecutive and word-start hits rank higher,
 * so "hol" finds "Holdings" before "Watchlist · hold". Returns -1 for no match.
 */
export function scoreMatch(query: string, text: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const t = text.toLowerCase();
  let score = 0;
  let ti = 0;
  let prev = -2;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found === -1) return -1;
    score += found === prev + 1 ? 3 : 1;
    if (found === 0 || t[found - 1] === ' ') score += 2;
    prev = found;
    ti = found + 1;
  }
  return score;
}

/** Global ⌘K / Ctrl+K binding. Returns [open, setOpen]. */
export function useCommandPaletteHotkey() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return [open, setOpen] as const;
}

function useCommands(close: () => void): Command[] {
  const navigate = useNavigate();
  const theme = useTheme();
  const liveFeed = useAppStore(selectLiveFeed);
  const currency = useAppStore(selectCurrency);
  const themeModeChanged = useAppStore((s) => s.themeModeChanged);
  const liveFeedToggled = useAppStore((s) => s.liveFeedToggled);
  const currencyChanged = useAppStore((s) => s.currencyChanged);

  return useMemo(() => {
    const go = (path: string) => () => {
      navigate(path);
      close();
    };
    const act = (fn: () => void) => () => {
      fn();
      close();
    };
    const pages: Command[] = [
      { id: 'nav-overview', label: 'Overview', group: 'Navigate', keywords: 'home dashboard', run: go('/app') },
      { id: 'nav-holdings', label: 'Holdings', group: 'Navigate', keywords: 'positions portfolio', run: go('/holdings') },
      { id: 'nav-markets', label: 'Markets', group: 'Navigate', keywords: 'quotes movers', run: go('/markets') },
      { id: 'nav-transactions', label: 'Transactions', group: 'Navigate', keywords: 'activity history', run: go('/transactions') },
      { id: 'nav-watchlist', label: 'Watchlist', group: 'Navigate', keywords: 'favourites', run: go('/watchlist') },
    ];
    const prefs: Command[] = [
      {
        id: 'theme',
        label: theme.name === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
        group: 'Preferences',
        keywords: 'theme appearance',
        run: act(() => themeModeChanged(theme.name === 'dark' ? 'light' : 'dark')),
      },
      {
        id: 'feed',
        label: liveFeed ? 'Pause live prices' : 'Resume live prices',
        group: 'Preferences',
        keywords: 'feed ticker stream',
        run: act(liveFeedToggled),
      },
      ...(['USD', 'CAD', 'EUR'] as const)
        .filter((c) => c !== currency)
        .map<Command>((c) => ({
          id: `ccy-${c}`,
          label: `Show values in ${c}`,
          group: 'Preferences',
          keywords: 'currency',
          run: act(() => currencyChanged(c)),
        })),
    ];
    return [...pages, ...prefs];
  }, [navigate, close, theme.name, liveFeed, currency, themeModeChanged, liveFeedToggled, currencyChanged]);
}

const GROUP_RANK: Record<Command['group'], number> = { Navigate: 0, Preferences: 1 };

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return createPortal(<PaletteDialog onClose={onClose} />, document.body);
}

function PaletteDialog({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const commands = useCommands(onClose);

  // Restore focus to whatever opened the palette.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return commands;
    return commands
      .map((c) => ({ c, s: Math.max(scoreMatch(query, c.label), scoreMatch(query, c.keywords ?? '') - 1) }))
      .filter((r) => r.s >= 0)
      .sort((a, b) => b.s - a.s)
      .map((r) => r.c)
      // Array#sort is stable: this keeps groups contiguous (so each header
      // renders once) while preserving score order inside each group.
      .sort((a, b) => GROUP_RANK[a.group] - GROUP_RANK[b.group]);
  }, [commands, query]);

  useEffect(() => setActive(0), [query]);

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((i) => (results.length ? (i + 1) % results.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        results[active]?.run();
      }
    },
    [results, active, onClose],
  );

  let lastGroup = '';
  const optionId = (i: number) => `${listId}-opt-${i}`;

  return (
    <Overlay onMouseDown={onClose}>
      <Panel
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(e: ReactMouseEvent) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <SearchRow>
          <SearchIcon />
          <SearchInput
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results.length ? optionId(active) : undefined}
            aria-autocomplete="list"
            placeholder="Jump to a page or change a setting…"
            value={query}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          />
          <Kbd>Esc</Kbd>
        </SearchRow>
        <List id={listId} role="listbox" aria-label="Commands">
          {results.length === 0 && <Empty>No commands match “{query}”.</Empty>}
          {results.map((c, i) => {
            const header: ReactNode =
              c.group !== lastGroup ? <GroupLabel role="presentation">{c.group}</GroupLabel> : null;
            lastGroup = c.group;
            return (
              <li key={c.id} role="presentation">
                {header}
                <Option
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === active}
                  $active={i === active}
                  onMouseMove={() => setActive(i)}
                  onClick={c.run}
                >
                  {c.label}
                  {i === active && <Kbd aria-hidden="true">↵</Kbd>}
                </Option>
              </li>
            );
          })}
        </List>
        <Footer aria-hidden="true">
          <span><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
          <span><Kbd>↵</Kbd> select</span>
          <span><Kbd>⌘</Kbd><Kbd>K</Kbd> toggle</span>
        </Footer>
      </Panel>
    </Overlay>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`;
const rise = keyframes`
  from { opacity: 0; transform: translateY(8px) scale(0.985); }
  to { opacity: 1; transform: none; }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.z.modal};
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 14vh ${({ theme }) => theme.space[4]} ${({ theme }) => theme.space[4]};
  background: color-mix(in srgb, ${({ theme }) => theme.color.bg} 45%, transparent);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  animation: ${fadeIn} 140ms ease-out;
`;

const Panel = styled.div`
  ${glass}
  width: min(620px, 100%);
  border-radius: ${({ theme }) => theme.radius.xl};
  background: color-mix(in srgb, ${({ theme }) => theme.color.surfaceSolid} 78%, transparent);
  box-shadow: ${({ theme }) => theme.glass.highlight}, 0 40px 80px -20px rgba(0, 0, 0, 0.55),
    ${({ theme }) => theme.glass.glow};
  overflow: hidden;
  animation: ${rise} 180ms cubic-bezier(0.2, 0, 0, 1);

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => `${theme.space[4]} ${theme.space[5]}`};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  color: ${({ theme }) => theme.color.textMuted};
`;

const SearchInput = styled.input`
  flex: 1;
  min-width: 0;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.color.text};
  font-size: ${({ theme }) => theme.fontSize.md};
  &::placeholder { color: ${({ theme }) => theme.color.textSubtle}; }
  &:focus-visible { outline: none; }
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: ${({ theme }) => theme.space[2]};
  max-height: min(52vh, 380px);
  overflow-y: auto;
`;

const GroupLabel = styled.div`
  padding: ${({ theme }) => `${theme.space[3]} ${theme.space[3]} ${theme.space[1]}`};
  font-size: ${({ theme }) => theme.fontSize.xs};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.textSubtle};
`;

const Option = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => `${theme.space[3]} ${theme.space[3]}`};
  border-radius: ${({ theme }) => theme.radius.md};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme, $active }) => ($active ? theme.color.text : theme.color.textMuted)};
  background: ${({ theme, $active }) =>
    $active
      ? `linear-gradient(100deg, color-mix(in srgb, ${theme.color.primary} 22%, transparent), color-mix(in srgb, ${theme.color.accent} 8%, transparent))`
      : 'transparent'};
  box-shadow: ${({ theme, $active }) =>
    $active ? `inset 0 0 0 1px color-mix(in srgb, ${theme.color.primary} 30%, transparent)` : 'none'};
`;

const Empty = styled.li`
  padding: ${({ theme }) => theme.space[6]};
  text-align: center;
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.fontSize.sm};
`;

const Footer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[4]};
  padding: ${({ theme }) => `${theme.space[3]} ${theme.space[5]}`};
  border-top: 1px solid ${({ theme }) => theme.color.border};
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.color.textSubtle};
  span { display: inline-flex; align-items: center; gap: 4px; }
`;

export const Kbd = styled.kbd`
  display: inline-grid;
  place-items: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.color.borderStrong};
  background: ${({ theme }) => theme.color.surfaceAlt};
  color: ${({ theme }) => theme.color.textMuted};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 11px;
  line-height: 1;
`;
