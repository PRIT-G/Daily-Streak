import { Activity, Code2, Github, Gitlab } from 'lucide-react';

export default function ProviderMark({ provider }) {
  const icon =
    provider === 'github' ? (
      <Github size={17} />
    ) : provider === 'leetcode' ? (
      <span className="leetcode-mark">L</span>
    ) : provider === 'gitlab' ? (
      <Gitlab size={17} />
    ) : provider === 'codeforces' ? (
      <Code2 size={17} />
    ) : (
      <Activity size={17} />
    );

  return <span className={`provider-mark provider-mark-${provider}`}>{icon}</span>;
}
