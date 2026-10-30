import { lazy, Suspense, useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styled, { css, keyframes, useTheme } from 'styled-components';
import { BrandLogo } from '@/components/brand/BrandLogo';

// three.js is ~150 kB gzipped, so the scene loads after the page text is on screen.
const PortfolioScene = lazy(() => import('@/components/three/PortfolioScene'));

const STACK = [
  {
    label: 'Frontend',
    items: ['React', 'TypeScript', 'Zustand', 'Zod', 'immer', 'three.js', 'Recharts'],
  },
  {
    label: 'Backend & AI',
    items: ['Python', 'FastAPI', 'Pydantic', 'SQLAlchemy', 'PostgreSQL', 'JWT auth', 'Anthropic tool use'],
  },
  {
    label: 'Delivery',
    items: ['Docker', 'Kubernetes', 'GitHub Actions', 'Jest', 'pytest', 'CodeQL', 'Prometheus/Grafana'],
  },
];

export function LandingPage() {
  const theme = useTheme();
  const sceneColors = useMemo(
    () => ({
      primary: theme.color.primary,
      success: theme.color.success,
      info: theme.color.info,
      grid: theme.color.borderStrong,
      text: theme.color.text,
    }),
    [theme],
  );

  return (
    <Page>
      <SkipLink href="#main">Skip to content</SkipLink>

      <Nav aria-label="Main">
        <BrandLogo />
        <NavLinks>
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <Link to="/markets">Markets</Link>
        </NavLinks>
        <NavActions>
          <TextLink to="/auth">Sign in</TextLink>
          <ButtonLink to="/auth?mode=register" $size="sm">Get started</ButtonLink>
        </NavActions>
      </Nav>

      <main id="main">
        <Hero>
          <HeroText>
            <Pill>
              <Dot aria-hidden="true" /> AI research with cited sources
            </Pill>
            <Title>
              See your whole portfolio <Gradient>in one clear view.</Gradient>
            </Title>
            <Subtitle>
              Track holdings, allocation and performance, follow the markets, and ask
              AI questions that are answered from your own data, with sources you can check.
            </Subtitle>
            <Actions>
              <ButtonLink to="/auth?mode=register" $size="lg">
                Create a free account
                <Arrow aria-hidden="true">→</Arrow>
              </ButtonLink>
              <ButtonLink to="/app" $size="lg" $variant="secondary">
                Try the live demo
              </ButtonLink>
            </Actions>
            <TrustList>
              <li><Check /> Free to start</li>
              <li><Check /> No brokerage login needed</li>
              <li><Check /> Your data stays private</li>
            </TrustList>
          </HeroText>

          <SceneWrap>
            <Glow aria-hidden="true" />
            <Suspense fallback={<SceneSkeleton aria-hidden="true" />}>
              <PortfolioScene colors={sceneColors} />
            </Suspense>
            <FloatCard $pos="top" aria-hidden="true">
              <FloatLabel>Demo portfolio</FloatLabel>
              <FloatValue>$248,310</FloatValue>
              <FloatDelta>▲ 12.4% this year</FloatDelta>
            </FloatCard>
            <FloatCard $pos="bottom" aria-hidden="true">
              <FloatLabel>Largest holding</FloatLabel>
              <AllocRow>
                <AllocBar><span style={{ width: '38%' }} /></AllocBar>
                <strong>38%</strong>
              </AllocRow>
              <FloatHint>Concentration check</FloatHint>
            </FloatCard>
          </SceneWrap>
        </Hero>

        <Stats aria-label="At a glance">
          <Stat><StatValue>5</StatValue><StatLabel>portfolio analytics tools</StatLabel></Stat>
          <Stat><StatValue>Cited</StatValue><StatLabel>AI answers show their sources</StatLabel></Stat>
          <Stat><StatValue>24/7</StatValue><StatLabel>access from any device</StatLabel></Stat>
          <Stat><StatValue>$0</StatValue><StatLabel>to get started</StatLabel></Stat>
        </Stats>

        <Section id="features" aria-labelledby="features-heading">
          <SectionHead>
            <Eyebrow>Features</Eyebrow>
            <SectionTitle id="features-heading">Everything you need to understand your investments</SectionTitle>
            <SectionIntro>No more spreadsheets or jumping between five market websites.</SectionIntro>
          </SectionHead>
          <FeatureGrid>
            <Feature
              icon={<path d="M4 19V9m6 10V5m6 14v-7m4 7H2" />}
              title="Portfolio overview"
              text="Total value, cost basis, daily and total returns, all calculated the same way every time."
            />
            <Feature
              icon={<><circle cx="12" cy="12" r="8" /><path d="M12 4v8l6 4" /></>}
              title="Allocation & risk"
              text="See how your money is split by asset and holding, and spot when one position gets too big."
            />
            <Feature
              icon={<path d="M3 17l5-5 4 4 8-9M15 7h5v5" />}
              title="Market monitoring"
              text="Quotes, price history and symbol search, with a watchlist for what you're following."
            />
            <Feature
              icon={<><path d="M4 5h16v11H8l-4 4z" /><path d="M8 9h8M8 12h5" /></>}
              title="AI that shows its work"
              text="Ask about your portfolio or a company. Every answer lists the tools and sources it used."
            />
            <Feature
              icon={<><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8M8 13h8M8 17h5" /></>}
              title="Transactions"
              text="A searchable history of buys, sells and dividends that feeds straight into your returns."
            />
            <Feature
              icon={<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></>}
              title="Private by design"
              text="Secure sign-in, your data scoped to your account, and no selling of personal information."
            />
          </FeatureGrid>
        </Section>

        <Section id="how-it-works" aria-labelledby="how-heading">
          <SectionHead>
            <Eyebrow>How it works</Eyebrow>
            <SectionTitle id="how-heading">From sign-up to insight in three steps</SectionTitle>
          </SectionHead>
          <Steps>
            <Step>
              <StepNum>1</StepNum>
              <StepTitle>Create your account</StepTitle>
              <StepText>Sign up with your email. It takes under a minute and costs nothing.</StepText>
            </Step>
            <Step>
              <StepNum>2</StepNum>
              <StepTitle>Add your holdings</StepTitle>
              <StepText>Enter your positions and transactions. FinVision does the math for you.</StepText>
            </Step>
            <Step>
              <StepNum>3</StepNum>
              <StepTitle>Ask and explore</StepTitle>
              <StepText>Review your dashboard, follow markets, and ask AI for context with sources.</StepText>
            </Step>
          </Steps>
        </Section>

        <Section id="stack" aria-labelledby="stack-heading">
          <SectionHead>
            <Eyebrow>Under the hood</Eyebrow>
            <SectionTitle id="stack-heading">How FinVision is built</SectionTitle>
            <SectionIntro>
              A typed React frontend and a Python API, tested on every change and shipped as containers.
            </SectionIntro>
          </SectionHead>
          <StackGrid>
            {STACK.map((group) => (
              <StackCard key={group.label}>
                <StackLabel>{group.label}</StackLabel>
                <TechList>
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </TechList>
              </StackCard>
            ))}
          </StackGrid>
          <SourceLink href="https://github.com/FarnazNK/finvision" target="_blank" rel="noreferrer">
            View the source on GitHub →
          </SourceLink>
        </Section>

        <Cta aria-labelledby="cta-heading">
          <div>
            <CtaTitle id="cta-heading">Start tracking your portfolio today</CtaTitle>
            <CtaText>Free to start. Explore the demo first if you'd like to look around.</CtaText>
          </div>
          <Actions>
            <ButtonLink to="/auth?mode=register" $size="lg" $variant="light">Create a free account</ButtonLink>
            <ButtonLink to="/app" $size="lg" $variant="outlineLight">Open demo</ButtonLink>
          </Actions>
        </Cta>
      </main>

      <Footer>
        <span>© {new Date().getFullYear()} FinVision</span>
        <Disclaimer>
          FinVision is informational software and does not provide investment advice.
          Market data may be delayed. Demo figures are illustrative.
        </Disclaimer>
      </Footer>
    </Page>
  );
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <FeatureCard>
      <FeatureIcon aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      </FeatureIcon>
      <FeatureTitle>{title}</FeatureTitle>
      <FeatureText>{text}</FeatureText>
    </FeatureCard>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.15" />
      <path d="M6 10.5l2.5 2.5L14 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------- motion ---------- */

const rise = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: none; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
`;

const shimmer = keyframes`
  from { background-position: -200% 0; }
  to { background-position: 200% 0; }
`;

const enter = (delay: number) => css`
  animation: ${rise} 600ms ${delay}ms cubic-bezier(0.2, 0, 0, 1) both;
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

/* ---------- layout ---------- */

const Page = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.space[5]};

  @media (max-width: 520px) {
    padding: 0 ${({ theme }) => theme.space[4]};
  }
`;

const SkipLink = styled.a`
  position: absolute;
  left: -9999px;
  &:focus { left: 16px; top: 16px; z-index: 10; padding: 8px 12px; background: ${({ theme }) => theme.color.surface}; }
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[4]};
  height: 72px;
`;

const NavLinks = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[6]};
  a {
    color: ${({ theme }) => theme.color.textMuted};
    font-size: ${({ theme }) => theme.fontSize.sm};
    font-weight: ${({ theme }) => theme.fontWeight.medium};
  }
  a:hover { color: ${({ theme }) => theme.color.text}; text-decoration: none; }

  @media (max-width: 760px) { display: none; }
`;

const NavActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[4]};
`;

const TextLink = styled(Link)`
  color: ${({ theme }) => theme.color.text};
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: ${({ theme }) => theme.fontWeight.medium};
`;

type BtnVariant = 'primary' | 'secondary' | 'light' | 'outlineLight';

const ButtonLink = styled(Link)<{ $size?: 'sm' | 'lg'; $variant?: BtnVariant }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space[2]};
  height: ${({ $size }) => ($size === 'sm' ? '36px' : '50px')};
  padding: 0 ${({ $size }) => ($size === 'sm' ? '14px' : '22px')};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid transparent;
  font-size: ${({ $size, theme }) => ($size === 'sm' ? theme.fontSize.sm : theme.fontSize.base)};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  white-space: nowrap;
  transition: transform ${({ theme }) => theme.motion.fast}, background ${({ theme }) => theme.motion.fast},
    box-shadow ${({ theme }) => theme.motion.fast};

  &:hover { text-decoration: none; transform: translateY(-1px); }
  &:active { transform: none; }

  ${({ $variant = 'primary', theme }) => {
    switch ($variant) {
      case 'secondary':
        return css`
          background: ${theme.color.surface};
          color: ${theme.color.text};
          border-color: ${theme.color.border};
          &:hover { border-color: ${theme.color.borderStrong}; }
        `;
      case 'light':
        return css`
          background: #fff;
          color: #0b1220;
          &:hover { box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2); }
        `;
      case 'outlineLight':
        return css`
          background: transparent;
          color: #fff;
          border-color: rgba(255, 255, 255, 0.5);
          &:hover { border-color: #fff; }
        `;
      default:
        return css`
          background: ${theme.color.primary};
          color: ${theme.color.primaryText};
          box-shadow: 0 6px 20px ${theme.color.primary}40;
          &:hover { background: ${theme.color.primaryHover}; box-shadow: 0 10px 28px ${theme.color.primary}55; }
        `;
    }
  }}

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover { transform: none; }
  }
`;

const Arrow = styled.span`
  transition: transform ${({ theme }) => theme.motion.fast};
  ${ButtonLink}:hover & { transform: translateX(3px); }
`;

/* ---------- hero ---------- */

const Hero = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
  align-items: center;
  gap: ${({ theme }) => theme.space[8]};
  padding: ${({ theme }) => `${theme.space[12]} 0 ${theme.space[16]}`};

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    padding-top: ${({ theme }) => theme.space[6]};
    gap: ${({ theme }) => theme.space[4]};
  }
`;

const HeroText = styled.div`
  & > * { ${enter(0)} }
  & > *:nth-child(2) { animation-delay: 80ms; }
  & > *:nth-child(3) { animation-delay: 160ms; }
  & > *:nth-child(4) { animation-delay: 240ms; }
  & > *:nth-child(5) { animation-delay: 320ms; }
`;

const Pill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: ${({ theme }) => theme.fontWeight.medium};
`;

const Dot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.success};
  box-shadow: 0 0 0 4px ${({ theme }) => theme.color.success}33;
`;

const Title = styled.h1`
  margin: ${({ theme }) => `${theme.space[5]} 0 ${theme.space[4]}`};
  font-size: clamp(2.4rem, 5.6vw, 4.25rem);
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  line-height: 1.03;
  letter-spacing: -0.045em;
`;

const Gradient = styled.span`
  background: linear-gradient(100deg, ${({ theme }) => theme.color.primary} 10%, ${({ theme }) => theme.color.success} 90%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

const Subtitle = styled.p`
  max-width: 540px;
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.fontSize.md};
  line-height: 1.65;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[3]};
  margin-top: ${({ theme }) => theme.space[8]};

  @media (max-width: 420px) {
    a { width: 100%; }
  }
`;

const TrustList = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => `${theme.space[2]} ${theme.space[5]}`};
  margin: ${({ theme }) => `${theme.space[6]} 0 0`};
  padding: 0;
  list-style: none;
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.fontSize.sm};

  li { display: inline-flex; align-items: center; gap: 6px; }
  svg { color: ${({ theme }) => theme.color.success}; }
`;

const SceneWrap = styled.div`
  position: relative;
  height: clamp(340px, 46vw, 520px);
  ${enter(200)}
`;

const Glow = styled.div`
  position: absolute;
  inset: 10% 8%;
  border-radius: 50%;
  background: radial-gradient(closest-side, ${({ theme }) => theme.color.primary}38, transparent);
  filter: blur(30px);
  pointer-events: none;
`;

const SceneSkeleton = styled.div`
  width: 100%;
  height: 100%;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: linear-gradient(90deg, transparent, ${({ theme }) => theme.color.surfaceAlt}, transparent);
  background-size: 200% 100%;
  animation: ${shimmer} 1.6s linear infinite;
  opacity: 0.6;
`;

const FloatCard = styled.div<{ $pos: 'top' | 'bottom' }>`
  position: absolute;
  min-width: 170px;
  padding: ${({ theme }) => `${theme.space[3]} ${theme.space[4]}`};
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => (theme.name === 'dark' ? 'rgba(11, 18, 32, 0.72)' : 'rgba(255, 255, 255, 0.8)')};
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: ${({ theme }) => theme.shadow.lg};
  pointer-events: none;
  animation: ${float} 6s ease-in-out infinite;

  ${({ $pos }) =>
    $pos === 'top'
      ? css`top: 6%; left: 0;`
      : css`bottom: 8%; right: 0; animation-delay: -3s;`}

  @media (prefers-reduced-motion: reduce) { animation: none; }
  @media (max-width: 520px) {
    min-width: 0;
    padding: ${({ theme }) => `${theme.space[2]} ${theme.space[3]}`};
  }
`;

const FloatLabel = styled.div`
  color: ${({ theme }) => theme.color.textSubtle};
  font-size: ${({ theme }) => theme.fontSize.xs};
  font-weight: ${({ theme }) => theme.fontWeight.medium};
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const FloatValue = styled.div`
  margin-top: 2px;
  font-size: ${({ theme }) => theme.fontSize.xl};
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
`;

const FloatDelta = styled.div`
  color: ${({ theme }) => theme.color.success};
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
`;

const FloatHint = styled.div`
  margin-top: 4px;
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.fontSize.xs};
`;

const AllocRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  margin-top: 6px;
  font-variant-numeric: tabular-nums;
`;

const AllocBar = styled.div`
  width: 110px;
  height: 8px;
  border-radius: 99px;
  background: ${({ theme }) => theme.color.surfaceAlt};
  overflow: hidden;
  span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: ${({ theme }) => theme.color.warn};
  }
`;

/* ---------- stats ---------- */

const Stats = styled.section`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.color.surface};
  overflow: hidden;

  @media (max-width: 760px) { grid-template-columns: repeat(2, 1fr); }
`;

const Stat = styled.div`
  padding: ${({ theme }) => `${theme.space[6]} ${theme.space[5]}`};
  & + & { border-left: 1px solid ${({ theme }) => theme.color.border}; }

  @media (max-width: 760px) {
    &:nth-child(3) { border-left: none; }
    &:nth-child(n + 3) { border-top: 1px solid ${({ theme }) => theme.color.border}; }
  }
`;

const StatValue = styled.div`
  font-size: ${({ theme }) => theme.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  letter-spacing: -0.03em;
`;

const StatLabel = styled.div`
  margin-top: 2px;
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.fontSize.sm};
`;

/* ---------- sections ---------- */

const Section = styled.section`
  padding: ${({ theme }) => `${theme.space[20]} 0 0`};
  scroll-margin-top: 24px;

  @media (max-width: 520px) { padding-top: ${({ theme }) => theme.space[16]}; }
`;

const SectionHead = styled.div`
  max-width: 640px;
  margin-bottom: ${({ theme }) => theme.space[10]};
`;

const Eyebrow = styled.div`
  color: ${({ theme }) => theme.color.primary};
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const SectionTitle = styled.h2`
  margin: ${({ theme }) => `${theme.space[3]} 0 0`};
  font-size: clamp(1.75rem, 3.6vw, 2.6rem);
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  letter-spacing: -0.035em;
`;

const SectionIntro = styled.p`
  margin-top: ${({ theme }) => theme.space[3]};
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.fontSize.md};
  line-height: 1.6;
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.space[4]};

  @media (max-width: 900px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 560px) { grid-template-columns: 1fr; }
`;

const FeatureCard = styled.article`
  padding: ${({ theme }) => theme.space[6]};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.color.surface};
  transition: transform ${({ theme }) => theme.motion.base}, border-color ${({ theme }) => theme.motion.base},
    box-shadow ${({ theme }) => theme.motion.base};

  &:hover {
    transform: translateY(-3px);
    border-color: ${({ theme }) => theme.color.borderStrong};
    box-shadow: ${({ theme }) => theme.shadow.md};
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover { transform: none; }
  }
`;

const FeatureIcon = styled.div`
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  color: ${({ theme }) => theme.color.primary};
  background: ${({ theme }) => theme.color.primary}1a;
`;

const FeatureTitle = styled.h3`
  margin: ${({ theme }) => `${theme.space[4]} 0 ${theme.space[2]}`};
  font-size: ${({ theme }) => theme.fontSize.md};
`;

const FeatureText = styled.p`
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.fontSize.sm};
  line-height: 1.6;
`;

const Steps = styled.ol`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.space[6]};
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: none;

  @media (max-width: 760px) { grid-template-columns: 1fr; }
`;

const Step = styled.li`
  position: relative;
  padding-top: ${({ theme }) => theme.space[5]};
  border-top: 2px solid ${({ theme }) => theme.color.border};
`;

const StepNum = styled.div`
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: ${({ theme }) => theme.color.primaryText};
  background: ${({ theme }) => theme.color.primary};
  font-weight: ${({ theme }) => theme.fontWeight.bold};
`;

const StepTitle = styled.h3`
  margin: ${({ theme }) => `${theme.space[4]} 0 ${theme.space[2]}`};
  font-size: ${({ theme }) => theme.fontSize.lg};
`;

const StepText = styled.p`
  color: ${({ theme }) => theme.color.textMuted};
  line-height: 1.6;
`;

const StackGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: ${({ theme }) => theme.space[4]};

  @media (min-width: 760px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const StackCard = styled.div`
  padding: ${({ theme }) => theme.space[6]};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.color.surface};
`;

const StackLabel = styled.h3`
  margin: 0 0 ${({ theme }) => theme.space[4]};
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.color.textMuted};
`;

const TechList = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]};
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    padding: 4px 10px;
    border: 1px solid ${({ theme }) => theme.color.border};
    border-radius: 999px;
    color: ${({ theme }) => theme.color.text};
    font-size: ${({ theme }) => theme.fontSize.sm};
  }
`;

const SourceLink = styled.a`
  display: inline-block;
  margin-top: ${({ theme }) => theme.space[6]};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
`;

const Cta = styled.section`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[6]};
  margin-top: ${({ theme }) => theme.space[20]};
  padding: ${({ theme }) => `${theme.space[12]} ${theme.space[10]}`};
  border-radius: 24px;
  color: #fff;
  background:
    radial-gradient(60% 55% at 15% 5%, rgba(109, 148, 255, 0.7), transparent 70%),
    radial-gradient(55% 55% at 95% 30%, rgba(167, 139, 250, 0.55), transparent 70%),
    radial-gradient(50% 45% at 30% 100%, rgba(34, 211, 238, 0.4), transparent 70%),
    #0a0f26;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 40px 80px -30px rgba(109, 148, 255, 0.5);

  ${Actions} { margin-top: 0; }

  @media (max-width: 520px) {
    padding: ${({ theme }) => `${theme.space[8]} ${theme.space[5]}`};
  }
`;

const CtaTitle = styled.h2`
  font-size: clamp(1.5rem, 3vw, 2.2rem);
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  letter-spacing: -0.03em;
`;

const CtaText = styled.p`
  margin-top: ${({ theme }) => theme.space[2]};
  opacity: 0.85;
`;

const Footer = styled.footer`
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[3]};
  margin-top: ${({ theme }) => theme.space[12]};
  padding: ${({ theme }) => `${theme.space[6]} 0 ${theme.space[8]}`};
  border-top: 1px solid ${({ theme }) => theme.color.border};
  color: ${({ theme }) => theme.color.textSubtle};
  font-size: ${({ theme }) => theme.fontSize.sm};
`;

const Disclaimer = styled.p`
  max-width: 620px;
  font-size: ${({ theme }) => theme.fontSize.xs};
  line-height: 1.6;
`;
