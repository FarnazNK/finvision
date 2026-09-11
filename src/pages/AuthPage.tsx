import { type FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { Button, Card, Input } from '@/components/primitives';
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
      navigate('/');
    } catch (reason) {
      setError(reason instanceof globalThis.Error ? reason.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page>
      <Card title={mode === 'login' ? 'Sign in to FinVision' : 'Create your FinVision account'}>
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
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            hint="Use at least 12 characters."
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={12}
            required
          />
          {error && <AuthError role="alert">{error}</AuthError>}
          <Button type="submit" fullWidth isLoading={loading}>
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
          <Switch>
            {mode === 'login' ? (
              <>
                Need an account? <Link to="/auth?mode=register">Create one</Link>
              </>
            ) : (
              <>
                Already registered? <Link to="/auth">Sign in</Link>
              </>
            )}
          </Switch>
        </Form>
      </Card>
    </Page>
  );
}

const Page = styled.div`
  max-width: 440px;
  margin: ${({ theme }) => `${theme.space[12]} auto`};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[4]};
`;

const AuthError = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.color.danger};
  font-size: ${({ theme }) => theme.fontSize.sm};
`;

const Switch = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.fontSize.sm};
  text-align: center;
`;
