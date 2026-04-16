import { useState, useEffect, useRef } from 'react';
import { PlayCircle } from 'lucide-react';

interface VideoEmbedProps {
  url?: string;
  title: string;
}

function getThumbnail(url: string): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([^?&]+)/);
  if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`;

  const vimeoMatch = url.match(/vimeo\.com\/(?:embed\/)?(\d+)/);
  if (vimeoMatch) return `https://vumbnail.com/${vimeoMatch[1]}.jpg`;

  const loomMatch = url.match(/loom\.com\/(?:embed\/|share\/)([a-f0-9]+)/);
  if (loomMatch) return `https://cdn.loom.com/sessions/thumbnails/${loomMatch[1]}/tile.gif`;

  return null;
}

export function VideoEmbed({ url, title }: VideoEmbedProps) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Start loading the iframe 400px before it enters the viewport
  useEffect(() => {
    if (!url) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px' }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [url]);

  if (!url) {
    return (
      <div className="w-full aspect-video bg-primary rounded-xl flex flex-col items-center justify-center text-white p-6 text-center shadow-lg">
        <PlayCircle className="w-16 h-16 mb-4 opacity-50" />
        <h3 className="font-heading font-bold text-2xl mb-2">Video Coming Soon</h3>
        <p className="text-gray-300 max-w-md">
          We are currently recording a step-by-step walkthrough of the tax protest process. Check back soon!
        </p>
        <p className="mt-6 text-sm text-gray-400">
          Need immediate help? Contact Westrom at{' '}
          <a href="tel:817-445-1108" className="text-white hover:underline">
            (817) 445-1108
          </a>
        </p>
      </div>
    );
  }

  const thumbnail = getThumbnail(url);
  const showThumbnail = !iframeLoaded && thumbnail && !thumbnailError;
  const showFallback = !iframeLoaded && (!thumbnail || thumbnailError);

  return (
    <div ref={containerRef} className="w-full aspect-video rounded-xl overflow-hidden shadow-lg relative bg-gray-900">

      {/* Thumbnail — visible immediately while iframe loads */}
      {showThumbnail && (
        <div className="absolute inset-0 z-10">
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover"
            onError={() => setThumbnailError(true)}
          />
          <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <PlayCircle className="w-10 h-10 text-white" />
            </div>
          </div>
        </div>
      )}

      {/* Fallback if thumbnail fails */}
      {showFallback && (
        <div className="absolute inset-0 z-10 bg-gray-800 flex flex-col items-center justify-center gap-2">
          <PlayCircle className="w-14 h-14 text-white/60" />
          <span className="text-white/50 text-sm">Loading video…</span>
        </div>
      )}

      {/* Iframe — starts loading 400px before viewport, fades in when ready */}
      {shouldLoad && (
        <iframe
          src={url}
          title={title}
          className={`w-full h-full border-0 transition-opacity duration-500 ${
            iframeLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          allowFullScreen
          allow="autoplay; fullscreen"
          onLoad={() => setIframeLoaded(true)}
        />
      )}
    </div>
  );
}
