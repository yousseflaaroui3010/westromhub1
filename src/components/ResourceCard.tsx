import { ArrowUpRight } from 'lucide-react';

interface ResourceCardProps {
  title: string;
  url?: string;
  description?: string;
}

/** Compact external-link card (county sites, evidence tools). Opens in a new tab. */
export function ResourceCard({ title, url, description }: ResourceCardProps) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="card-link group flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-heading font-bold text-ink">{title}</h3>
        <ArrowUpRight
          className="h-5 w-5 shrink-0 text-on-surface-variant transition-colors group-hover:text-primary"
          aria-hidden="true"
        />
      </div>
      {description && <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">{description}</p>}
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
