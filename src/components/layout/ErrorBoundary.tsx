import { Component, type ErrorInfo, type ReactNode } from 'react';
import styled from 'styled-components';

interface Props { children: ReactNode }
interface State { hasError: boolean }

/**
 * Contain unexpected rendering failures so users can recover without seeing a blank page.
 * Avoid displaying exception details, which can expose implementation or user data.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Production monitoring (e.g. Application Insights) can be wired here.
    if (import.meta.env.DEV) console.error('FinVision rendering error', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <Container role="alert">
        <Panel>
          <Eyebrow>FinVision · Recovery</Eyebrow>
          <h1>We couldn't display this workspace.</h1>
          <p>Your dashboard encountered an unexpected error. Reload to try again.</p>
          <button type="button" onClick={() => window.location.reload()}>Reload workspace</button>
        </Panel>
      </Container>
    );
  }
}

const Container = styled.main`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: ${({ theme }) => theme.color.bg};
  color: ${({ theme }) => theme.color.text};
`;
const Panel = styled.section`
  width: min(100%, 520px);
  padding: clamp(24px, 5vw, 48px);
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.color.surface};
  box-shadow: ${({ theme }) => theme.shadow.md};
  h1 { font-size: ${({ theme }) => theme.fontSize['2xl']}; line-height: 1.2; margin: 12px 0; }
  p { color: ${({ theme }) => theme.color.textMuted}; line-height: 1.6; }
  button {
    margin-top: 20px;
    padding: 12px 18px;
    border: 0;
    border-radius: ${({ theme }) => theme.radius.md};
    background: ${({ theme }) => theme.color.primary};
    color: ${({ theme }) => theme.color.primaryText};
    font-weight: 600;
    cursor: pointer;
  }
  button:focus-visible { outline: 3px solid ${({ theme }) => theme.color.focusRing}; outline-offset: 3px; }
`;
const Eyebrow = styled.span`
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.textMuted};
`;
