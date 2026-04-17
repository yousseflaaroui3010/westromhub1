import { ExternalLink, Building2, Wrench } from 'lucide-react';

interface ResourceCardProps {
  key?: string | number;
  title: string;
  url?: string;
  description?: string;
  type?: 'county' | 'tool';
}

export function ResourceCard({ title, url, description, type = 'county' }: ResourceCardProps) {
  const Icon = type === 'county' ? Building2 : Wrench;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-[0_12px_32px_-4px_rgba(0,32,69,0.08)] hover:-translate-y-[1px] motion-reduce:hover:translate-y-0 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 bg-background rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-colors">
          <Icon className="w-6 h-6" />
        </div>
        {url && <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />}
      </div>
      
      <h3 className="font-heading font-semibold text-lg text-primary mb-2">{title}</h3>
      
      {description && (
        <p className="text-on-surface-variant text-sm line-clamp-2">
          {description}
        </p>
      )}
      
      {url && (
        <div className="mt-4 text-sm font-medium text-primary flex items-center gap-1">
          Visit Website
        </div>
      )}
    </a>
  );
}
