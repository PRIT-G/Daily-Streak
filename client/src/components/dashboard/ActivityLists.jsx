import { useEffect, useState } from 'react';
import { apiBlob, apiUrl } from '../../api/index.js';
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  Copy,
  Flame,
  ImagePlus,
  Link2,
  Trash2,
  Trophy,
  Unlink,
} from 'lucide-react';
import { providerLabel } from '../../features/providers/catalog.js';

function dateLabel(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function RecentActivityPanel({ dashboard, onOpenSettings, limit = 8, onViewAll }) {
  const connectedProviders = Object.entries(dashboard.providers).filter(
    ([, provider]) => provider.username
  );
  const recent = dashboard.recent.slice(0, limit);

  return (
    <article className="panel recent-panel">
      <div className="panel-heading compact">
        <div>
          <div className="panel-kicker">THE LITTLE WINS</div>
          <h2>Recent activity</h2>
        </div>
        {onViewAll ? (
          <a className="link-button" href="#activity">
            All activity <ArrowUpRight size={14} />
          </a>
        ) : (
          <button className="link-button" onClick={onOpenSettings}>
            Connections <ArrowUpRight size={14} />
          </button>
        )}
      </div>
      {recent.length ? (
        <div className="recent-list">
          {recent.map((day) => (
            <div className="recent-row" key={day.date}>
              <span className="recent-day-icon">
                <CalendarDays size={16} />
              </span>
              <span className="recent-date">
                <strong>{dateLabel(day.date)}</strong>
                <small>
                  {Object.entries(
                    day.sources || {
                      github: day.github,
                      leetcode: day.leetcode,
                      manual: day.manual,
                    }
                  )
                    .filter(([, count]) => Number(count) > 0)
                    .map(([provider, count]) => `${count} ${providerLabel(provider)}`)
                    .join(' · ') || 'Coding activity'}
                </small>
              </span>
              <span
                className={`activity-count ${day.total >= dashboard.goal.dailyTarget ? 'complete' : ''}`}
              >
                {day.total}
                <small> {day.total === 1 ? 'item' : 'items'}</small>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-activity">
          <span>
            <CalendarDays size={20} />
          </span>
          <strong>
            {connectedProviders.length
              ? 'No public coding activity found yet.'
              : 'Your story starts here.'}
          </strong>
          <p>
            {connectedProviders.length
              ? 'The connected profile did not return coding events in the available public activity window. Check its sync status in Connections.'
              : 'Connect a public profile and refresh to see your coding activity.'}
          </p>
          {connectedProviders.map(
            ([name, provider]) =>
              provider.message && (
                <p key={name}>
                  {providerLabel(name)}: {provider.message}
                </p>
              )
          )}
          {connectedProviders.length > 0 && (
            <button className="link-button" onClick={onOpenSettings}>
              Check connection status <ArrowUpRight size={14} />
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export function MilestonesPanel({
  token,
  badges = [],
  uploadedBadges = [],
  publicBadgeGalleryId = '',
  onUploadBadge,
  onDeleteUploadedBadge,
  onSetPublicBadgeGallery,
}) {
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('');
  const [imageData, setImageData] = useState('');
  const [imageType, setImageType] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const [badgeImageUrls, setBadgeImageUrls] = useState({});
  const [badgeImageError, setBadgeImageError] = useState(false);

  useEffect(() => {
    let active = true;
    const objectUrls = [];

    async function loadBadgeImages() {
      const results = await Promise.all(
        uploadedBadges.map(async (badge) => {
          try {
            const blob = await apiBlob(badge.imageUrl, { token });
            if (!active) return null;
            const imageUrl = URL.createObjectURL(blob);
            objectUrls.push(imageUrl);
            return [badge.id, imageUrl];
          } catch {
            if (active) setBadgeImageError(true);
            return null;
          }
        })
      );
      if (active) setBadgeImageUrls(Object.fromEntries(results.filter(Boolean)));
    }

    setBadgeImageUrls({});
    setBadgeImageError(false);
    loadBadgeImages();
    return () => {
      active = false;
      objectUrls.forEach((imageUrl) => URL.revokeObjectURL(imageUrl));
    };
  }, [token, uploadedBadges]);

  async function chooseImage(event) {
    const file = event.target.files?.[0];
    setError('');
    setImageData('');
    setImageType('');
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Choose a PNG, JPEG, or WebP image.');
      event.target.value = '';
      return;
    }
    if (file.size > 1024 * 1024) {
      setError('Badge images must be smaller than 1 MB.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageData(reader.result);
        setImageType(file.type);
      } else {
        setError('This image could not be read. Please choose another file.');
      }
    };
    reader.onerror = () => setError('This image could not be read. Please choose another file.');
    reader.readAsDataURL(file);
  }

  async function submitBadge(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!imageData) {
      setError('Choose an image for this badge.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const saved = await onUploadBadge({ title, platform, imageData, imageType });
      if (saved) {
        setTitle('');
        setPlatform('');
        setImageData('');
        setImageType('');
        formElement.reset();
      }
    } finally {
      setSaving(false);
    }
  }

  const totalBadges = badges.length + uploadedBadges.length;
  const galleryUrl = publicBadgeGalleryId ? apiUrl(`/public/badges/${publicBadgeGalleryId}`) : '';

  async function setGalleryEnabled(enabled) {
    setGalleryBusy(true);
    try {
      await onSetPublicBadgeGallery(enabled);
    } finally {
      setGalleryBusy(false);
    }
  }

  async function copyText(value, label) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(`${label} copied.`);
    } catch {
      setCopyMessage('Clipboard access is unavailable. Select and copy the link instead.');
    }
  }

  return (
    <article className="panel badges-panel" aria-labelledby="milestones-title">
      <div className="panel-heading compact">
        <div>
          <div className="panel-kicker">MOMENTS WORTH NOTICING</div>
          <h2 id="milestones-title">Your milestones</h2>
          <p>Celebrate your streaks and collect the badges you’ve earned elsewhere.</p>
        </div>
        <span className="badge-count">{totalBadges} earned</span>
      </div>
      <form className="badge-upload-form" onSubmit={submitBadge}>
        <div className="badge-upload-copy">
          <ImagePlus size={17} />
          <span>
            <strong>Add a badge you earned</strong>
            <small>
              Upload a badge image from another platform. PNG, JPEG, or WebP · up to 1 MB.
            </small>
          </span>
        </div>
        <div className="badge-upload-fields">
          <label>
            Badge name
            <input
              required
              maxLength="80"
              placeholder="e.g. Problem Solving"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label>
            Platform
            <input
              maxLength="40"
              placeholder="e.g. HackerRank"
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
            />
          </label>
          <label className="badge-file-input">
            Badge image
            <input
              required
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={chooseImage}
            />
          </label>
          <button className="small-button" disabled={saving || !imageData}>
            {saving ? 'Uploading…' : 'Upload badge'}
          </button>
        </div>
        {imageData && (
          <img className="badge-upload-preview" src={imageData} alt="Badge upload preview" />
        )}
        {error && (
          <p className="badge-upload-error" role="alert">
            {error}
          </p>
        )}
      </form>
      <section className="public-gallery-settings" aria-label="Public badge gallery API">
        <div className="public-gallery-heading">
          <span>
            <Link2 size={16} />
          </span>
          <div>
            <strong>Public badge API</strong>
            <small>
              Anyone with the link can see uploaded badge names, platform names, and images. Your
              account details and automatic streak badges stay private.
            </small>
          </div>
        </div>
        {publicBadgeGalleryId ? (
          <>
            <label className="public-gallery-link">
              Gallery API URL
              <input readOnly value={galleryUrl} onFocus={(event) => event.target.select()} />
            </label>
            <div className="public-gallery-actions">
              <button
                type="button"
                className="small-button"
                onClick={() => copyText(galleryUrl, 'Gallery URL')}
              >
                <Copy size={13} /> Copy gallery URL
              </button>
              <button
                type="button"
                className="small-button gallery-disable"
                disabled={galleryBusy}
                onClick={() => setGalleryEnabled(false)}
              >
                <Unlink size={13} /> {galleryBusy ? 'Updating…' : 'Disable public gallery'}
              </button>
            </div>
            {copyMessage && (
              <small className="gallery-copy-message" role="status">
                {copyMessage}
              </small>
            )}
          </>
        ) : (
          <button
            type="button"
            className="small-button gallery-enable"
            disabled={galleryBusy}
            onClick={() => setGalleryEnabled(true)}
          >
            <Link2 size={13} /> {galleryBusy ? 'Enabling…' : 'Enable public gallery'}
          </button>
        )}
      </section>
      {totalBadges ? (
        <div className="badge-list">
          {badgeImageError && (
            <p className="badge-image-error" role="status">
              Some uploaded badge images could not be loaded. Please try again.
            </p>
          )}
          {uploadedBadges.map((badge) => (
            <div className="badge-row uploaded-badge-row" key={`uploaded-${badge.id}`}>
              {badgeImageUrls[badge.id] ? (
                <img src={badgeImageUrls[badge.id]} alt="" className="uploaded-badge-image" />
              ) : (
                <span className="uploaded-badge-placeholder" aria-hidden="true">
                  <Trophy size={16} />
                </span>
              )}
              <span>
                <strong>{badge.title}</strong>
                <small>
                  {badge.platform || 'Uploaded badge'} · Added{' '}
                  {new Date(badge.createdAt).toLocaleDateString()}
                </small>
              </span>
              {publicBadgeGalleryId && (
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`Copy direct image URL for ${badge.title}`}
                  title="Copy public image URL"
                  onClick={() =>
                    copyText(
                      apiUrl(`/public/badges/${publicBadgeGalleryId}/${badge.id}/image`),
                      'Image URL'
                    )
                  }
                >
                  <Copy size={14} />
                </button>
              )}
              <button
                className="icon-button uploaded-badge-delete"
                type="button"
                aria-label={`Remove ${badge.title} badge`}
                onClick={() => onDeleteUploadedBadge(badge.id)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {badges.map((badge) => (
            <div className="badge-row" key={badge.id}>
              <span className="badge-medal">
                <Trophy size={17} />
              </span>
              <span>
                <strong>{badge.title}</strong>
                <small>{badge.description}</small>
              </span>
              <span className="badge-check">
                <Check size={14} />
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-badges">
          <div className="badge-orbit">
            <Trophy size={23} />
          </div>
          <strong>Good things take practice.</strong>
          <p>Keep showing up. Your first badge is closer than it feels.</p>
          <div className="badge-preview">
            <span>
              <Flame size={13} /> Week on fire
            </span>
            <small>7-day streak</small>
          </div>
        </div>
      )}
    </article>
  );
}
