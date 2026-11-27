import type { LucideIcon } from 'lucide-react';
import { ChevronDown, Lightbulb, PlayCircle } from 'lucide-react';
import './guide-page.css';

/** Tutoriel vidéo rangé dans public/videos/tutoriels/ (fichier .mp4 + image .jpg du même nom). */
export interface GuideVideo {
  fichier: string;
  titre: string;
}

export interface GuideSection {
  icon: LucideIcon;
  title: string;
  summary: string;
  steps: string[];
  tip?: string;
  videos?: GuideVideo[];
}

export interface GuidePageProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  sections: GuideSection[];
  videos?: GuideVideo[];
}

// preload="none" : rien n'est téléchargé avant que la personne appuie sur lecture
// (forfaits mobiles). Seule la petite image d'aperçu est chargée.
function GuideVideoPlayer({ video }: { video: GuideVideo }) {
  const base = `/videos/tutoriels/${video.fichier}`;
  return (
    <figure className="guide-video">
      <video controls preload="none" playsInline poster={`${base}.jpg`} aria-label={`Tutoriel vidéo : ${video.titre}`}>
        <source src={`${base}.mp4`} type="video/mp4" />
        Votre navigateur ne peut pas lire cette vidéo.{' '}
        <a href={`${base}.mp4`}>Télécharger la vidéo</a>
      </video>
      <figcaption>
        <PlayCircle className="w-3.5 h-3.5 shrink-0" />
        {video.titre}
      </figcaption>
    </figure>
  );
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// <details>/<summary> natif plutôt qu'un accordéon en useState — clavier et
// lecteurs d'écran gérés gratuitement par le navigateur, zéro JS côté client
// (voir la note perf sur PageHeader : éviter d'ajouter du poids à des pages
// montées sur tout un rôle).
export function GuidePage({ icon: HeroIcon, title, subtitle, sections, videos }: GuidePageProps) {
  return (
    <div className="guide-page">
      <div className="guide-hero">
        <div className="guide-hero-icon">
          <HeroIcon className="w-6 h-6" />
        </div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      {videos && videos.length > 0 && (
        <section className="guide-videos" aria-labelledby="guide-videos-titre">
          <h2 id="guide-videos-titre">Les tutoriels en vidéo</h2>
          <p>Environ 3 minutes chacun, dans l&apos;ordre où vous en aurez besoin.</p>
          <div className="guide-videos-grid">
            {videos.map((v) => (
              <GuideVideoPlayer key={v.fichier} video={v} />
            ))}
          </div>
        </section>
      )}

      <div className="guide-toc">
        {sections.map((s) => (
          <a key={s.title} href={`#${slug(s.title)}`} className="guide-toc-item">
            <s.icon className="w-3.5 h-3.5" />
            {s.title}
          </a>
        ))}
      </div>

      <div className="guide-grid">
        {sections.map((s) => (
          <details key={s.title} id={slug(s.title)} className="guide-card">
            <summary className="guide-card-summary">
              <span className="guide-card-icon">
                <s.icon className="w-[18px] h-[18px]" />
              </span>
              <span className="guide-card-heading">
                <span className="guide-card-title">{s.title}</span>
                <span className="guide-card-desc">{s.summary}</span>
              </span>
              <ChevronDown className="guide-card-chevron w-4 h-4" />
            </summary>
            <div className="guide-card-body">
              <ol>
                {s.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
              {s.tip && (
                <div className="guide-tip">
                  <Lightbulb className="w-3.5 h-3.5 shrink-0" />
                  <span>{s.tip}</span>
                </div>
              )}
              {s.videos?.map((v) => (
                <GuideVideoPlayer key={v.fichier} video={v} />
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
