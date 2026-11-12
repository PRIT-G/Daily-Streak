import { ArrowUpRight, LoaderCircle, Unlink } from 'lucide-react';

export default function WorkSection({
  icon: Icon,
  title,
  description,
  connected,
  configured,
  identity,
  onConnect,
  onDisconnect,
  loading,
  children,
}) {
  return (
    <section className="work-card">
      <header className="work-card-heading">
        <span className="work-provider-icon">
          <Icon size={20} />
        </span>
        <div className="work-card-title">
          <h2>{title}</h2>
          <p>{connected ? identity || 'Connected' : description}</p>
        </div>
        {connected ? (
          <button className="small-button work-disconnect" onClick={onDisconnect}>
            <Unlink size={13} /> Disconnect
          </button>
        ) : configured ? (
          <button className="button button-dark" onClick={onConnect} disabled={loading}>
            {loading ? <LoaderCircle className="spin" size={14} /> : <ArrowUpRight size={14} />}{' '}
            Connect {title}
          </button>
        ) : (
          <span className="setup-config-tag optional">Not enabled yet</span>
        )}
      </header>
      {!connected && !configured && (
        <p className="work-owner-notice">
          {title} will be available after the app owner enables the shared integration. You do not
          need your own OAuth app or client credentials.
        </p>
      )}
      {connected ? children : null}
    </section>
  );
}
