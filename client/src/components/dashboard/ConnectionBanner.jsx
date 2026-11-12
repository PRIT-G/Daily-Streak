import { ArrowUpRight, Code2, Github, Gitlab } from 'lucide-react';

export default function ConnectionBanner({ onOpenSettings }) {
  return (
    <section className="connect-banner">
      <div className="connect-illustration">
        <Github size={21} />
        <span>+</span>
        <span className="connect-extra">
          <Code2 size={13} />
          <Gitlab size={13} />
        </span>
      </div>
      <div className="connect-copy">
        <h2>Let your activity tell the story.</h2>
        <p>
          Connect GitHub, LeetCode, Codeforces, or GitLab to bring your coding activity together.
        </p>
      </div>
      <button className="button button-dark" onClick={onOpenSettings}>
        Connect an account <ArrowUpRight size={16} />
      </button>
    </section>
  );
}
