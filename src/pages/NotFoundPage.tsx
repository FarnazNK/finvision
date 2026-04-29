import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/primitives';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Wrap role="alert">
      <Code>404</Code>
      <Title>Page not found</Title>
      <Hint>The page you were looking for has moved or doesn't exist.</Hint>
      <Button variant="primary" onClick={() => navigate('/')}>
        Back to overview
      </Button>
    </Wrap>
  );
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: ${({ theme }) => theme.space[16]} ${({ theme }) => theme.space[6]};
  gap: ${({ theme }) => theme.space[3]};
`;

const Code = styled.div`
  font-size: ${({ theme }) => theme.fontSize['3xl']};
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  color: ${({ theme }) => theme.color.primary};
  letter-spacing: -0.04em;
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSize.xl};
`;

const Hint = styled.p`
  color: ${({ theme }) => theme.color.textMuted};
  margin-bottom: ${({ theme }) => theme.space[4]};
`;
