import type { ReactNode } from 'react';
import styled from 'styled-components';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

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
  padding: ${({ theme }) => theme.space[6]};
  max-width: ${({ theme }) => theme.layout.contentMaxWidth};
  width: 100%;
  margin: 0 auto;

  &:focus {
    outline: none;
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
