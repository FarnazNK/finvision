import { type FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { Button, Input } from '@/components/primitives';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { authenticate } from '@/services/authClient';

export function AuthPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mode = params.get('mode') === 'register' ? 'register' : 'login';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authenticate(mode, email, password);
      navigate('/app');
    } catch (reason) {
      setError(reason instanceof globalThis.Error ? reason.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  const isLogin = mode === 'login';

  return (
    <Page>
      <Showcase aria-hidden="true">
        <BrandLogo size={34} />
        <ShowcaseBody>
          <ShowcaseTitle>Your whole portfolio, in one clear view.</ShowcaseTitle>
          <ShowcaseList>
            <li>Holdings, allocation and returns in one dashboard</li>
            <li>Market moves for everything you own and watch</li>
            <li>AI answers that show their sources</li>
          </ShowcaseList>
        </ShowcaseBody>
        <MiniChart viewBox="0 0 320 120" preserveAspectRatio="none">
          <defs>
            <linearGradient id="authFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 100 C40 92 60 70 100 74 S160 40 200 46 S260 18 320 10 L320 120 L0 120 Z" fill="url(#authFill)" />
          <path d="M0 100 C40 92 60 70 100 74 S160 40 200 46 S260 18 320 10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        </MiniChart>
      </Showcase>

      <FormSide>
        <TopRow>
          <MobileLogo><BrandLogo size={30} /></MobileLogo>
          <BackLink to="/">← Back to home</BackLink>
        </TopRow>
        <FormBox>
          <Heading>{isLogin ? 'Welcome back' : 'Create your account'}</Heading>
          <Lead>
            {isLogin ? 'Sign in to see your portfolio.' : 'Free to start. It takes under a minute.'}
          </Lead>
          <Form onSubmit={submit}>
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              hint="Use at least 12 characters."
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={12}
              required
            />
            {error && <AuthError role="alert">{error}</AuthError>}
            <Button type="submit" size="lg" fullWidth isLoading={loading}>
              {isLogin ? 'Sign in' : 'Create account'}
            </Button>
          </Form>
          <Switch>
            {isLogin ? (
              <>
                New to FinVision? <Link to="/auth?mode=register">Create an account</Link>
              </>
            ) : (
              <>
                Already have an account? <Link to="/auth">Sign in</Link>
              </>
            )}
          </Switch>
          <DemoHint>
            Just looking? <Link to="/app">Open the demo</Link> without signing in.
          </DemoHint>
        </FormBox>
      </FormSide>
    </Page>
  );
}

const Page = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-height: 100vh;

  @media (min-width: 900px) {
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1fr);
  }
`;

const Showcase = styled.aside`
  display: none;
  position: relative;
  overflow: hidden;
  flex-direction: column;
  justify-content: space-between;
  padding: ${({ theme }) => theme.space[10]};
  color: #fff;
  background:
    radial-gradient(500px 300px at 100% 0%, ${({ theme }) => theme.color.success}80, transparent),
    linear-gradient(150deg, #152e85, #244fdb 55%, #3366ff);

  /* Logo text sits on the blue panel here. */
  a, a span { color: #fff; }

  @media (min-width: 900px) {
    display: flex;
  }
`;

const ShowcaseBody = styled.div`
  position: relative;
  z-index: 1;
  max-width: 420px;
`;

const ShowcaseTitle = styled.h2`
  font-size: clamp(1.8rem, 2.6vw, 2.4rem);
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  letter-spacing: -0.03em;
  line-height: 1.1;
`;

const ShowcaseList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]};
  margin: ${({ theme }) => `${theme.space[6]} 0 0`};
  padding: 0;
  list-style: none;
  opacity: 0.92;

  li::before {
    content: '✓';
    display: inline-grid;
    place-items: center;
    width: 20px;
    height: 20px;
    margin-right: 10px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    font-size: 11px;
  }
`;

const MiniChart = styled.svg`
  width: 100%;
  height: 120px;
`;

const FormSide = styled.main`
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => `${theme.space[5]} ${theme.space[5]} ${theme.space[10]}`};

  @media (min-width: 900px) {
    padding: ${({ theme }) => theme.space[10]};
  }
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]};
`;

const MobileLogo = styled.div`
  @media (min-width: 900px) {
    visibility: hidden;
  }
`;

const BackLink = styled(Link)`
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.fontSize.sm};
  &:hover { color: ${({ theme }) => theme.color.text}; text-decoration: none; }
`;

const FormBox = styled.div`
  width: 100%;
  max-width: 400px;
  margin: auto;
  padding-top: ${({ theme }) => theme.space[10]};

  @media (min-width: 900px) {
    padding-top: 0;
  }
`;

const Heading = styled.h1`
  font-size: ${({ theme }) => theme.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  letter-spacing: -0.03em;
`;

const Lead = styled.p`
  margin: ${({ theme }) => `${theme.space[2]} 0 ${theme.space[6]}`};
  color: ${({ theme }) => theme.color.textMuted};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[4]};
`;

const AuthError = styled.p`
  margin: 0;
  padding: ${({ theme }) => `${theme.space[3]} ${theme.space[4]}`};
  border-radius: ${({ theme }) => theme.radius.md};
  background: color-mix(in srgb, ${({ theme }) => theme.color.danger} 10%, transparent);
  color: ${({ theme }) => theme.color.danger};
  font-size: ${({ theme }) => theme.fontSize.sm};
`;

const Switch = styled.p`
  margin: ${({ theme }) => `${theme.space[6]} 0 0`};
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.fontSize.sm};
  text-align: center;
`;

const DemoHint = styled.p`
  margin: ${({ theme }) => `${theme.space[3]} 0 0`};
  padding-top: ${({ theme }) => theme.space[4]};
  border-top: 1px solid ${({ theme }) => theme.color.border};
  color: ${({ theme }) => theme.color.textSubtle};
  font-size: ${({ theme }) => theme.fontSize.sm};
  text-align: center;
`;
