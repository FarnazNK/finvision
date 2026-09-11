import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Button, Card } from '@/components/primitives';

export function LandingPage() {
  return (
    <Page>
      <Hero>
        <Eyebrow>Public product demo</Eyebrow>
        <Title>Understand your portfolio with clarity.</Title>
        <Subtitle>
          FinVision is a production-minded portfolio analytics platform. This public
          demo shows the product experience while authenticated data and AI services
          remain behind a protected API.
        </Subtitle>
        <Actions>
          <Link to="/auth?mode=register">
            <Button size="lg">Create a free account</Button>
          </Link>
          <Link to="/markets">
            <Button size="lg" variant="secondary">Explore markets</Button>
          </Link>
        </Actions>
        <Disclaimer>
          Informational and educational software only. Market data may be delayed.
          FinVision does not provide investment advice.
        </Disclaimer>
      </Hero>

      <AccessPanel>
        <div>
          <Eyebrow>Protected workspace</Eyebrow>
          <AccessTitle>Ready to work with your own portfolio?</AccessTitle>
          <AccessText>
            Sign in to use the authenticated portfolio workflow. The public demo never
            presents seeded data as a personal account.
          </AccessText>
        </div>
        <Link to="/auth">
          <Button>Sign in</Button>
        </Link>
      </AccessPanel>

      <FeatureGrid>
        <Card title="Portfolio intelligence" description="Track holdings, allocation, cost basis, gains, and activity with auditable calculations." />
        <Card title="Market monitoring" description="Use provider-backed quotes, history, and symbol search through a server-side API boundary." />
        <Card title="Grounded AI research" description="Ask questions about indexed documents and receive source URLs, excerpts, and retrieval scores." />
      </FeatureGrid>

      <Story>
        <Eyebrow>Engineering showcase</Eyebrow>
        <StoryTitle>Staff-level engineering practices in a focused full-stack system.</StoryTitle>
        <StoryText>
          The architecture demonstrates React and Redux state management, typed FastAPI
          APIs, PostgreSQL-compatible persistence, JWT authentication, Docker, CI/CD,
          deterministic analytics, and retrieval-augmented generation. Use the demo,
          then sign in to exercise the protected workflow when an API is configured.
        </StoryText>
        <StoryLink>Engineering documentation is available with the project.</StoryLink>
      </Story>
    </Page>
  );
}

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[10]};
  max-width: 1080px;
  margin: 0 auto;
`;

const Hero = styled.section`
  padding: ${({ theme }) => `${theme.space[12]} ${theme.space[4]}`};
  max-width: 760px;
`;

const Eyebrow = styled.div`
  color: ${({ theme }) => theme.color.primary};
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Title = styled.h1`
  margin: ${({ theme }) => `${theme.space[3]} 0 ${theme.space[4]}`};
  font-size: clamp(2.5rem, 7vw, 5rem);
  line-height: 1;
  letter-spacing: -0.05em;
`;

const Subtitle = styled.p`
  max-width: 650px;
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.fontSize.lg};
  line-height: 1.6;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[3]};
  margin-top: ${({ theme }) => theme.space[6]};
`;

const Disclaimer = styled.p`
  margin-top: ${({ theme }) => theme.space[5]};
  color: ${({ theme }) => theme.color.textSubtle};
  font-size: ${({ theme }) => theme.fontSize.xs};
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: ${({ theme }) => theme.space[4]};
`;

const AccessPanel = styled.section`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[5]};
  padding: ${({ theme }) => theme.space[5]};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.surface};

  @media (max-width: 620px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

const AccessTitle = styled.h2`
  margin: ${({ theme }) => `${theme.space[2]} 0`};
  font-size: ${({ theme }) => theme.fontSize.xl};
`;

const AccessText = styled.p`
  max-width: 650px;
  margin: 0;
  color: ${({ theme }) => theme.color.textMuted};
  line-height: 1.6;
`;

const Story = styled.section`
  padding: ${({ theme }) => `${theme.space[8]} ${theme.space[4]}`};
  border-top: 1px solid ${({ theme }) => theme.color.border};
`;

const StoryTitle = styled.h2`
  max-width: 640px;
  margin: ${({ theme }) => `${theme.space[3]} 0`};
  font-size: ${({ theme }) => theme.fontSize['2xl']};
`;

const StoryText = styled.p`
  max-width: 680px;
  color: ${({ theme }) => theme.color.textMuted};
  line-height: 1.7;
`;

const StoryLink = styled.p`
  display: inline-block;
  margin-top: ${({ theme }) => theme.space[3]};
  color: ${({ theme }) => theme.color.primary};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
`;
