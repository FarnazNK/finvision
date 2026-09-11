import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Button, Card } from '@/components/primitives';

export function LandingPage() {
  return (
    <Page>
      <Brand to="/" aria-label="FinVision home">
        <BrandMark aria-hidden="true">F</BrandMark>
        <BrandWord>FinVision</BrandWord>
      </Brand>
      <Hero>
        <Eyebrow>FinVision portfolio workspace</Eyebrow>
        <Title>Understand your portfolio with clarity.</Title>
        <Subtitle>
          Monitor holdings, market movement, transactions, allocation, and research
          in one consistent workspace. Sign in to connect your own portfolio data.
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
            Sign in to use the authenticated portfolio workflow. Demo data is clearly
            labeled and is never presented as a personal account.
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

      <ProfileSection>
        <Eyebrow>Your portfolio profile</Eyebrow>
        <ProfileTitle>Everything a person needs to understand their investments.</ProfileTitle>
        <ProfileIntro>
          A personal workspace brings the important details together without requiring
          spreadsheets or switching between multiple market websites.
        </ProfileIntro>
        <ProfileGrid>
          <ProfileCard>
            <ProfileCardTitle>See your position</ProfileCardTitle>
            <ProfileList>
              <li>Total portfolio value and cost basis</li>
              <li>Daily and total gains with percentage returns</li>
              <li>Allocation by asset class and holding</li>
              <li>Concentration and diversification signals</li>
            </ProfileList>
          </ProfileCard>
          <ProfileCard>
            <ProfileCardTitle>Track what changes</ProfileCardTitle>
            <ProfileList>
              <li>Holdings, transactions, and watchlists</li>
              <li>Price history and portfolio performance curves</li>
              <li>Search across symbols and account activity</li>
              <li>Currency, theme, and live-feed preferences</li>
            </ProfileList>
          </ProfileCard>
          <ProfileCard>
            <ProfileCardTitle>Ask AI for context</ProfileCardTitle>
            <ProfileList>
              <li>Summarize a company, filing, or market event</li>
              <li>Explain movements using your portfolio snapshot</li>
              <li>Compare exposure, allocation, and historical trends</li>
              <li>Show document excerpts and source citations</li>
            </ProfileList>
          </ProfileCard>
        </ProfileGrid>
        <ProfileNote>
          AI responses are informational summaries grounded in available data and
          sources. They are not personalized investment recommendations.
        </ProfileNote>
      </ProfileSection>
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

const Brand = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  width: fit-content;
  padding: ${({ theme }) => `${theme.space[5]} ${theme.space[4]} 0`};
  color: ${({ theme }) => theme.color.text};
  text-decoration: none;
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
`;

const BrandMark = styled.span`
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.primaryText};
  font-size: ${({ theme }) => theme.fontSize.sm};
`;

const BrandWord = styled.span`
  font-size: ${({ theme }) => theme.fontSize.lg};
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

const ProfileSection = styled.section`
  padding: ${({ theme }) => `${theme.space[8]} ${theme.space[4]}`};
  border-top: 1px solid ${({ theme }) => theme.color.border};
`;

const ProfileTitle = styled.h2`
  max-width: 700px;
  margin: ${({ theme }) => `${theme.space[3]} 0 ${theme.space[2]}`};
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  letter-spacing: -0.03em;
`;

const ProfileIntro = styled.p`
  max-width: 700px;
  margin: 0;
  color: ${({ theme }) => theme.color.textMuted};
  line-height: 1.7;
`;

const ProfileGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: ${({ theme }) => theme.space[4]};
  margin-top: ${({ theme }) => theme.space[6]};
`;

const ProfileCard = styled.article`
  padding: ${({ theme }) => theme.space[5]};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.surface};
`;

const ProfileCardTitle = styled.h3`
  margin: 0 0 ${({ theme }) => theme.space[4]};
  font-size: ${({ theme }) => theme.fontSize.lg};
`;

const ProfileList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]};
  margin: 0;
  padding-left: ${({ theme }) => theme.space[5]};
  color: ${({ theme }) => theme.color.textMuted};
  line-height: 1.5;
`;

const ProfileNote = styled.p`
  margin: ${({ theme }) => `${theme.space[5]} 0 0`};
  color: ${({ theme }) => theme.color.textSubtle};
  font-size: ${({ theme }) => theme.fontSize.sm};
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
