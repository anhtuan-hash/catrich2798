import React from 'react';
import {
  ArrowRight,
  BookOpen,
  Clock3,
  Cloud,
  Play,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  UsersRound,
} from 'lucide-react';
import { normalizeHomeHeroConfig } from '../utils/homepageHeroCms.js';

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
  return String(value || '').split(/\n+/).map((line) => line.trim()).filter(Boolean).slice(0, 5);
}

function PreviewMedia({ background }) {
  if (!background.url || background.type === 'none') return <div className="hero-cms__empty-media" />;
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
    return <video className="hero-cms__media" style={style} src={background.url} poster={background.posterUrl || undefined} autoPlay loop muted playsInline />;
  }
  return <img className="hero-cms__media" style={style} src={background.url} alt="" />;
}

export default function HomeHeroCmsPreview({ config, language = 'vi', device = 'desktop' }) {
  const value = normalizeHomeHeroConfig(config);
  const headline = localized(value.content, language, 'headlineVi', 'headlineEn');
  const highlight = localized(value.content, language, 'highlightVi', 'highlightEn');
  const description = localized(value.content, language, 'descriptionVi', 'descriptionEn');
  const badge = localized(value.badge, language, 'textVi', 'textEn', 'ENGLISH HUB');
  const infoItems = value.infoItems.filter((item) => item.enabled).slice(0, 4);
  const style = {
    '--hero-min-height': `${value.layout.minHeight}px`,
    '--hero-content-width': `${value.layout.contentWidth}%`,
    '--hero-radius': `${value.layout.borderRadius}px`,
    '--hero-headline-color': value.content.headlineColor,
    '--hero-highlight-color': value.content.highlightColor,
    '--hero-description-color': value.content.descriptionColor,
    '--hero-badge-color': value.badge.color,
    '--hero-badge-background': value.badge.background,
    '--hero-overlay-color': value.overlay.color,
    '--hero-overlay-opacity': `${value.overlay.opacity}%`,
    '--hero-left-protection': `${value.overlay.leftProtection}%`,
    '--hero-left-width': `${value.overlay.leftProtectionWidth}%`,
  };

  return (
    <div className={`hero-editor-preview is-${device}`}>
      <section className="bha-hero hero-cms hero-cms--editor-preview" style={style} data-content-align={value.layout.contentAlign} data-vertical-align={value.layout.verticalAlign}>
        <div className="hero-cms__background">
          <PreviewMedia background={value.background} />
          {value.overlay.enabled ? <div className="hero-cms__overlay" /> : null}
        </div>
        <div className="hero-cms__content">
          {value.badge.enabled ? <span className="hero-cms__badge">{value.badge.logoUrl ? <img src={value.badge.logoUrl} alt="" /> : <i>B</i>}<strong>{badge}</strong></span> : null}
          <h1>{headlineLines(headline).map((line) => <span key={line}>{line}</span>)}</h1>
          {highlight ? <h2>{highlight}</h2> : null}
          {description ? <p>{description}</p> : null}
          <div className="hero-cms__actions">
            {value.buttons.filter((button) => button.enabled).map((button) => {
              const Icon = BUTTON_ICONS[button.icon];
              return <span key={button.id} className={`hero-cms__button is-${button.style}`} style={{ '--button-color': button.color }}>{Icon ? <Icon size={18} fill={button.icon === 'play' ? 'currentColor' : 'none'} /> : null}<span>{localized(button, language, 'labelVi', 'labelEn')}</span>{button.style === 'primary' ? <ArrowRight size={17} /> : null}</span>;
            })}
          </div>
          {infoItems.length ? <div className={`hero-cms__info hero-cms__info--${infoItems.length}`}>{infoItems.map((item) => {
            const Icon = INFO_ICONS[item.icon] || Star;
            return <span key={item.id} className="hero-cms__info-item" style={{ '--item-color': item.color }}><i>{item.icon === 'none' ? null : <Icon size={17} />}</i><span><strong>{localized(item, language, 'titleVi', 'titleEn')}</strong><small>{localized(item, language, 'textVi', 'textEn')}</small></span></span>;
          })}</div> : null}
        </div>
      </section>
    </div>
  );
}
