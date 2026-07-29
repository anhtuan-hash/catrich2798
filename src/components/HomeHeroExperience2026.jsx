import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Clock3,
  Cloud,
  Image as ImageIcon,
  Pencil,
  Play,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  UsersRound,
} from 'lucide-react';
import { isDepartmentLeaderRole } from '../utils/roles.js';
import {
  DEFAULT_HOME_HERO_CONFIG,
  HOME_HERO_EVENT,
  loadHomeHeroSettings,
  normalizeHomeHeroConfig,
  subscribeToPublishedHomeHero,
} from '../utils/homepageHeroCms.js';
import HomeHeroCmsEditor from './HomeHeroCmsEditor.jsx';

const INFO_ICONS = {
  shield: ShieldCheck,
  cloud: Cloud,
  users: UsersRound,
  book: BookOpen,
  star: Star,
  clock: Clock3,
};

const BUTTON_ICONS = {
  rocket: Rocket,
  play: Play,
  arrow: ArrowRight,
  sparkles: Sparkles,
};

function localized(config, language, viKey, enKey, fallback = '') {
  const primary = language === 'en' ? config?.[enKey] : config?.[viKey];
  const secondary = language === 'en' ? config?.[viKey] : config?.[enKey];
  return String(primary || secondary || fallback).trim();
}

function headlineLines(value) {
  return String(value || '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function isExternalTarget(target) {
  return /^https:\/\//i.test(String(target || ''));
}

function BackgroundMedia({ background, motionEnabled }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [background.url, background.type]);
  if (!background.url || background.type === 'none' || failed) return <div className="hero-cms__empty-media" aria-hidden="true" />;

  const className = `hero-cms__media${motionEnabled ? ' has-motion' : ''}`;
  const style = {
    '--media-x': `${background.positionX}%`,
    '--media-y': `${background.positionY}%`,
    '--media-scale': background.scale / 100,
    '--media-opacity': background.opacity / 100,
    '--media-brightness': background.brightness / 100,
    '--media-blur': `${background.blur}px`,
    '--media-fit': background.fit,
  };

  if (background.type === 'video') {
    return (
      <video
        className={className}
        style={style}
        src={background.url}
        poster={background.posterUrl || undefined}
        autoPlay={background.autoplay}
        loop={background.loop}
        muted
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <img
      className={className}
      style={style}
      src={background.url}
      alt=""
      draggable="false"
      onError={() => setFailed(true)}
    />
  );
}

function HeroInfoItem({ item, language }) {
  const Icon = INFO_ICONS[item.icon] || Star;
  return (
    <span className="hero-cms__info-item" style={{ '--item-color': item.color }}>
      <i>{item.icon === 'none' ? null : <Icon size={17} strokeWidth={2.15} />}</i>
      <span>
        <strong>{localized(item, language, 'titleVi', 'titleEn')}</strong>
        <small>{localized(item, language, 'textVi', 'textEn')}</small>
      </span>
    </span>
  );
}

function HeroButton({ button, language, onActivate }) {
  if (!button.enabled) return null;
  const Icon = BUTTON_ICONS[button.icon];
  return (
    <button
      type="button"
      className={`hero-cms__button is-${button.style}`}
      style={{ '--button-color': button.color }}
      onClick={(event) => onActivate(button, event)}
    >
      {Icon ? <Icon size={18} fill={button.icon === 'play' ? 'currentColor' : 'none'} strokeWidth={2.2} /> : null}
      <span>{localized(button, language, 'labelVi', 'labelEn')}</span>
      {button.style === 'primary' ? <ArrowRight size={17} /> : null}
    </button>
  );
}

export default function HomeHeroExperience2026({
  currentUser,
  language = 'vi',
  t,
  onStart,
  onGuide,
  onLaunch,
}) {
  const [settings, setSettings] = useState(() => ({
    draft: normalizeHomeHeroConfig(DEFAULT_HOME_HERO_CONFIG),
    published: normalizeHomeHeroConfig(DEFAULT_HOME_HERO_CONFIG),
    databaseReady: false,
  }));
  const [previewConfig, setPreviewConfig] = useState(null);
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [editorOpen, setEditorOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const canEdit = isDepartmentLeaderRole(currentUser?.role);
  const activeConfig = normalizeHomeHeroConfig(previewConfig || settings.published);
  const vi = language !== 'en';

  useEffect(() => {
    let active = true;
    loadHomeHeroSettings()
      .then((result) => {
        if (!active) return;
        setSettings(result);
      })
      .catch((error) => console.warn('Could not load homepage Hero settings:', error))
      .finally(() => active && setLoading(false));

    const unsubscribe = subscribeToPublishedHomeHero((config) => {
      if (!active) return;
      setSettings((previous) => ({ ...previous, published: config }));
    });
    const handleUpdate = (event) => {
      if (event.detail?.mode !== 'published' || !event.detail?.config) return;
      setSettings((previous) => ({ ...previous, published: normalizeHomeHeroConfig(event.detail.config) }));
    };
    window.addEventListener(HOME_HERO_EVENT, handleUpdate);
    return () => {
      active = false;
      unsubscribe?.();
      window.removeEventListener(HOME_HERO_EVENT, handleUpdate);
    };
  }, []);

  const headline = localized(activeConfig.content, language, 'headlineVi', 'headlineEn', t.headline);
  const highlight = localized(activeConfig.content, language, 'highlightVi', 'highlightEn', t.highlight);
  const description = localized(activeConfig.content, language, 'descriptionVi', 'descriptionEn', t.subtitle);
  const badgeText = localized(activeConfig.badge, language, 'textVi', 'textEn', t.badge);
  const visibleInfoItems = useMemo(
    () => activeConfig.infoItems.filter((item) => item.enabled).slice(0, 4),
    [activeConfig.infoItems],
  );

  const handleButton = (button, event) => {
    const target = button.target || '#/apps';
    if (isExternalTarget(target) && button.newTab) {
      window.open(target, '_blank', 'noopener,noreferrer');
      return;
    }
    if (onLaunch) {
      onLaunch(target, localized(button, language, 'labelVi', 'labelEn'), button.color, event);
      return;
    }
    if (button.id === 'primary') onStart?.(event);
    else onGuide?.(event);
  };

  const heroStyle = {
    '--hero-min-height': `${activeConfig.layout.minHeight}px`,
    '--hero-content-width': `${activeConfig.layout.contentWidth}%`,
    '--hero-radius': `${activeConfig.layout.borderRadius}px`,
    '--hero-headline-color': activeConfig.content.headlineColor,
    '--hero-highlight-color': activeConfig.content.highlightColor,
    '--hero-description-color': activeConfig.content.descriptionColor,
    '--hero-badge-color': activeConfig.badge.color,
    '--hero-badge-background': activeConfig.badge.background,
    '--hero-overlay-color': activeConfig.overlay.color,
    '--hero-overlay-opacity': activeConfig.overlay.opacity / 100,
    '--hero-left-protection': activeConfig.overlay.leftProtection / 100,
    '--hero-left-width': `${activeConfig.overlay.leftProtectionWidth}%`,
  };

  return (
    <>
      <section
        className={`bha-hero hero-cms${loading ? ' is-loading' : ''}${activeConfig.animation.enabled ? ' has-animation' : ''}${activeConfig.animation.contentReveal ? ' has-reveal' : ''}${activeConfig.animation.buttonPulse ? ' has-button-pulse' : ''}${previewConfig ? ` is-preview is-preview-${previewDevice}` : ''}`}
        style={heroStyle}
        data-content-align={activeConfig.layout.contentAlign}
        data-vertical-align={activeConfig.layout.verticalAlign}
        aria-label={vi ? 'Hero trang chủ English Hub' : 'English Hub homepage Hero'}
      >
        <div className="hero-cms__background" aria-hidden="true">
          <BackgroundMedia background={activeConfig.background} motionEnabled={activeConfig.animation.enabled && activeConfig.animation.mediaMotion} />
          {activeConfig.overlay.enabled ? <div className="hero-cms__overlay" /> : null}
        </div>

        <div className="hero-cms__content">
          {activeConfig.badge.enabled ? (
            <span className="hero-cms__badge">
              {activeConfig.badge.logoUrl ? <img src={activeConfig.badge.logoUrl} alt="" /> : <i>B</i>}
              <strong>{badgeText}</strong>
            </span>
          ) : null}

          <h1>{headlineLines(headline).map((line) => <span key={line}>{line}</span>)}</h1>
          {highlight ? <h2>{highlight}</h2> : null}
          {description ? <p>{description}</p> : null}

          <div className="hero-cms__actions">
            {activeConfig.buttons.map((button) => <HeroButton key={button.id} button={button} language={language} onActivate={handleButton} />)}
          </div>

          {visibleInfoItems.length ? (
            <div className={`hero-cms__info hero-cms__info--${visibleInfoItems.length}`}>
              {visibleInfoItems.map((item) => <HeroInfoItem key={item.id} item={item} language={language} />)}
            </div>
          ) : null}
        </div>

        {canEdit ? (
          <button type="button" className="hero-cms__edit" onClick={() => setEditorOpen(true)}>
            <Pencil size={16} /><span>{vi ? 'Chỉnh sửa Hero' : 'Edit Hero'}</span>
          </button>
        ) : null}

        {!activeConfig.background.url && canEdit ? (
          <button type="button" className="hero-cms__empty-action" onClick={() => setEditorOpen(true)}>
            <ImageIcon size={22} /><span><strong>{vi ? 'Nền Hero đang để trống' : 'Hero background is empty'}</strong><small>{vi ? 'Tải ảnh, GIF hoặc video để phủ vào lớp nền.' : 'Upload an image, GIF or video as the background.'}</small></span>
          </button>
        ) : null}
      </section>

      <HomeHeroCmsEditor
        open={editorOpen}
        currentUser={currentUser}
        language={language}
        initialConfig={settings.draft || settings.published}
        databaseReady={settings.databaseReady}
        onClose={() => {
          setEditorOpen(false);
          setPreviewConfig(null);
          setPreviewDevice('desktop');
        }}
        onPreview={(config, device) => {
          setPreviewConfig(config);
          setPreviewDevice(device || 'desktop');
        }}
        onPublished={(config) => {
          setSettings((previous) => ({ ...previous, draft: config, published: config }));
          setPreviewConfig(config);
        }}
      />
    </>
  );
}
