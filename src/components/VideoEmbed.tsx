import { PlayCircle } from 'lucide-react';

interface VideoEmbedProps {
  url?: string;
  title: string;
}

export function VideoEmbed({ url, title }: VideoEmbedProps) {
  if (!url) {
    return (
      <div className="w-full aspect-video bg-primary rounded-xl flex flex-col items-center justify-center text-white p-6 text-center shadow-lg">
        <PlayCircle className="w-16 h-16 mb-4 opacity-50" />
        <h3 className="font-heading font-bold text-2xl mb-2">Video Coming Soon</h3>
        <p className="text-gray-300 max-w-md">
          We are currently recording a step-by-step walkthrough of the tax protest process. Check back soon!
        </p>
        <p className="mt-6 text-sm text-gray-400">
          Need immediate help? Contact Westrom at <a href="tel:817-445-1108" className="text-white hover:underline">(817) 445-1108</a>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full aspect-video rounded-xl overflow-hidden shadow-lg bg-gray-100">
      <iframe
        src={url}
        title={title}
        className="w-full h-full border-0"
        allowFullScreen
        loading="lazy"
      ></iframe>
    </div>
  );
}
