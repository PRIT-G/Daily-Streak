import {
  ArrowDown, ArrowRight, BookOpenCheck, BriefcaseBusiness, Check, Code2, Flame, Github,
  Layers3, ShieldCheck, Sparkles, Trophy
} from 'lucide-react';

const PLATFORM_GROUPS = [
  { title: 'Coding activity', items: ['GitHub', 'LeetCode', 'Codeforces', 'GitLab'] },
  { title: 'Work & study', items: ['Jira', 'Notion', 'Study planner'] }
];

const FAQS = [
  ['Is Daily Streak free to use?', 'Yes. The product is free during early access. There is no checkout or payment collection in this release.'],
  ['Do I need to connect an account?', 'No. The study planner and personal dashboard work on their own. Connect public coding profiles when you want to bring activity together.'],
  ['What can Jira and Notion do?', 'Once the server owner configures provider OAuth apps, Jira can show assigned issues and allow status or assignee updates. Notion can browse pages and work with shared task databases.'],
  ['Is my activity public?', 'The dashboard is private to your account. The separate badge gallery is public only if you explicitly enable it. External provider data follows that provider’s visibility and API rules.'],
  ['Can I export or delete my account?', 'Yes. From Settings, download a JSON export of your account data or permanently delete your account after confirming your current password. Account verification and recovery emails are sent through the service’s configured email provider.']
];

function Logo({ light = false }) {
  return (
    <a className={`marketing-logo ${light ? 'light' : ''}`} href="#" aria-label="Daily Streak home">
      <span><Flame size={18} fill="currentColor" /></span>
      <strong>daily<span>streak</span></strong>
    </a>
  );
}

function ProductPreview() {
  return (
    <div className="marketing-preview" aria-label="Illustration of the Daily Streak dashboard">
      <div className="preview-topbar">
        <div><i /><i /><i /></div><span>SAMPLE DASHBOARD</span><strong>Mon — Sun</strong>
      </div>
      <div className="preview-main">
        <div className="preview-streak">
          <div><span className="preview-eyebrow">KEEPING YOUR RHYTHM</span><strong>12 <small>days</small></strong><p>A little progress adds up.</p></div>
          <span className="preview-flame"><Flame size={24} fill="currentColor" /></span>
        </div>
        <div className="preview-heatmap" aria-hidden="true">
          {Array.from({ length: 49 }, (_, index) => <i className={`heat-${(index * 7 + Math.floor(index / 7) * 3) % 5}`} key={index} />)}
        </div>
        <div className="preview-bottom">
          <div className="preview-today"><span><Code2 size={15} /> Today’s focus</span><strong>1 of 2 activity goals</strong><i><b /></i></div>
          <div className="preview-task"><span><BookOpenCheck size={14} /> Study plan</span><strong>Review data structures</strong><small>CS · Due tomorrow</small></div>
        </div>
      </div>
      <span className="preview-floating"><Check size={13} /> One place. Clear head.</span>
    </div>
  );
}

export default function MarketingPage({ onGetStarted, onSignIn }) {
  return (
    <div className="marketing-page">
      <header className="marketing-header">
        <Logo />
        <nav className="marketing-nav" aria-label="Product navigation">
          <a href="#features">What’s inside</a>
          <a href="#privacy">Your data</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="marketing-actions">
          <button className="marketing-signin" onClick={onSignIn}>Sign in</button>
          <button className="marketing-cta" onClick={onGetStarted}>Get early access <ArrowRight size={15} /></button>
        </div>
      </header>

      <main>
        <section className="marketing-hero">
          <div className="hero-copy">
            <div className="hero-kicker"><span /> FREE EARLY ACCESS <i /> MADE FOR YOUR MOMENTUM</div>
            <h1>Make room for<br /><em>the work that matters.</em></h1>
            <p className="hero-description">Coding practice, study plans, and the work waiting for you—together in one steady, personal workspace.</p>
            <div className="hero-actions">
              <button className="marketing-cta hero-primary" onClick={onGetStarted}>Create your free space <ArrowRight size={16} /></button>
              <a className="hero-secondary" href="#features">Take a look <ArrowDown size={14} /></a>
            </div>
            <div className="hero-note"><ShieldCheck size={15} /> No card. No paid plan during early access.</div>
          </div>
          <ProductPreview />
          <span className="hero-decoration decoration-one" /><span className="hero-decoration decoration-two" />
        </section>

        <section className="platform-strip" aria-label="Supported platforms">
          <span>YOUR ROUTINE, ALREADY IN MOTION</span>
          <div>{PLATFORM_GROUPS[0].items.map((item) => <strong key={item}>{item}</strong>)}</div>
          <small>Plus Jira, Notion, and your own study plan</small>
        </section>

        <section className="marketing-section features-section" id="features">
          <div className="marketing-section-heading">
            <span className="marketing-kicker">LESS CONTEXT SWITCHING</span>
            <h2>Everything you’re building,<br />in view.</h2>
            <p>Not another system to maintain. A simple home for showing up, keeping track, and moving forward.</p>
          </div>
          <div className="feature-grid">
            <article className="feature-card feature-wide">
              <span className="feature-icon green"><Code2 size={19} /></span>
              <span className="feature-index">01 / PRACTICE</span>
              <h3>See the days you put in.</h3>
              <p>Bring together public activity from GitHub, LeetCode, Codeforces, and GitLab. Follow your rhythm with a combined calendar and separate views by platform.</p>
              <div className="feature-platforms">{PLATFORM_GROUPS[0].items.map((item) => <span key={item}>{item}</span>)}</div>
            </article>
            <article className="feature-card">
              <span className="feature-icon sand"><BookOpenCheck size={19} /></span>
              <span className="feature-index">02 / STUDY</span>
              <h3>Give the week a shape.</h3>
              <p>Keep assignments, exams, courses, and study sessions together. Set due dates, mark progress, and see what’s next.</p>
            </article>
            <article className="feature-card">
              <span className="feature-icon lavender"><BriefcaseBusiness size={19} /></span>
              <span className="feature-index">03 / WORK</span>
              <h3>Your tools, connected.</h3>
              <p>Bring Jira issues and shared Notion tasks closer to your day. These connections are optional and need owner-configured OAuth apps.</p>
            </article>
            <article className="feature-card feature-wide feature-milestones">
              <span className="feature-icon peach"><Trophy size={19} /></span>
              <span className="feature-index">04 / MILESTONES</span>
              <h3>Keep a record of how far you’ve come.</h3>
              <p>Earn streak milestones automatically or keep images of awards you’ve earned elsewhere. Public sharing is off until you choose to turn it on.</p>
              <span className="milestone-ornament"><Sparkles size={26} /></span>
            </article>
          </div>
        </section>

        <section className="privacy-section" id="privacy">
          <div>
            <span className="marketing-kicker">BUILT WITH CARE</span>
            <h2>Your progress<br />belongs to you.</h2>
            <p>Daily Streak is designed as a private workspace. You choose which services to connect, and connecting them never requires sharing your provider password with this app.</p>
          </div>
          <div className="privacy-points">
            <article><span><ShieldCheck size={17} /></span><div><strong>Private by default</strong><p>Your dashboard and planner are account-scoped. Badge gallery sharing is a separate opt-in.</p></div></article>
            <article><span><Layers3 size={17} /></span><div><strong>Connect only what helps</strong><p>Public coding activity is optional. Jira and Notion connections require your authorization.</p></div></article>
            <article><span><Github size={17} /></span><div><strong>No provider passwords</strong><p>Public profiles use public data. Workspaces connect through OAuth, not scraped sessions.</p></div></article>
          </div>
          <p className="privacy-caveat">Account verification and password recovery depend on the service’s email configuration. Read the <a href="#terms">terms and data notes</a> before storing important information.</p>
        </section>

        <section className="marketing-section platform-details">
          <div className="marketing-section-heading">
            <span className="marketing-kicker">YOUR SPACE, YOUR MIX</span>
            <h2>Start simple.<br />Connect as you go.</h2>
            <p>You can use the planner without connecting anything. Add a profile or workspace when it fits your routine.</p>
          </div>
          <div className="platform-detail-list">
            <article><span className="platform-number">A</span><div><strong>Public coding activity</strong><p>Connect GitHub, LeetCode, Codeforces, or GitLab with a public username. Some activity sources have provider-specific history limits.</p></div></article>
            <article><span className="platform-number">B</span><div><strong>Jira & Notion</strong><p>Optional OAuth integrations. Availability depends on your app administrator configuring provider developer credentials and callback URLs.</p></div></article>
            <article><span className="platform-number">C</span><div><strong>Study planner & badges</strong><p>Private account features. Uploaded badge images stay private unless you explicitly enable their public gallery.</p></div></article>
          </div>
        </section>

        <section className="faq-section" id="faq">
          <div className="marketing-section-heading">
            <span className="marketing-kicker">GOOD TO KNOW</span>
            <h2>A few honest answers.</h2>
          </div>
          <div className="faq-list">
            {FAQS.map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}
          </div>
        </section>

        <section className="terms-section" id="terms">
          <div className="marketing-section-heading">
            <span className="marketing-kicker">BEFORE YOU BEGIN</span>
            <h2>Early access, clearly.</h2>
          </div>
          <div className="terms-grid">
            <article><strong>What the service stores</strong><p>Account name and email, a password hash, your study-planner entries, connected public-profile usernames and imported activity, uploaded badge images, and OAuth credentials encrypted by the app when you connect Jira or Notion.</p></article>
            <article><strong>Connected services</strong><p>Public activity comes from the coding providers you choose. Jira and Notion data is accessed only after you authorize the integration and is subject to those providers’ terms and availability.</p></article>
            <article><strong>Your control</strong><p>You can export your account data, permanently delete your account after password confirmation, disconnect supported providers, and disable a public badge gallery.</p></article>
            <article><strong>Account email</strong><p>Verification and password-recovery links are sent by the service’s configured email provider. Production deployments require email delivery to be configured.</p></article>
            <article><strong>Early-access limits</strong><p>The app is currently free, may change during development, and is provided without a guarantee of uninterrupted service or preservation of data. No payment is collected in this release.</p></article>
          </div>
          <p className="terms-disclaimer">This is an early-access data and service summary, not legal advice or a substitute for reviewed privacy terms. Before inviting the public or collecting data at scale, the owner should publish reviewed privacy, terms, support, retention, and deletion policies for the actual hosting setup.</p>
        </section>

        <section className="final-cta">
          <div className="final-cta-icon"><Flame size={21} fill="currentColor" /></div>
          <span className="marketing-kicker">A GOOD DAY TO BEGIN</span>
          <h2>Make a little space<br />for your next step.</h2>
          <p>Start your free early-access account. Bring your tools in when you’re ready.</p>
          <button className="marketing-cta hero-primary" onClick={onGetStarted}>Create your free space <ArrowRight size={16} /></button>
        </section>
      </main>

      <footer className="marketing-footer">
        <Logo light />
        <p>Daily Streak is an early-access productivity workspace for coding practice and student life.</p>
        <nav aria-label="Legal and product links"><a href="#features">Product</a><a href="#privacy">Privacy overview</a><a href="#faq">FAQ</a><a href="#terms">Early-access terms</a></nav>
        <small>Early access · Free to use · No payment collection</small>
      </footer>
    </div>
  );
}
