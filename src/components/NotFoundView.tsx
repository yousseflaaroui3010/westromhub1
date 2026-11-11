import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

export function NotFoundView() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Page Not Found | Westrom Owner Advisory Hub";
  }, []);

  return (
    <div className="container-page flex flex-grow items-center justify-center py-20">
      <div className="max-w-lg text-center">
        <p className="eyebrow">Error 404</p>
        <h1 className="mt-3 font-heading text-4xl font-extrabold tracking-tight text-ink">Page not found</h1>
        <p className="lead mt-4">
          We couldn&apos;t find the page you&apos;re looking for. It may have moved or no longer exists.
        </p>
        <button type="button" onClick={() => navigate('/')} className="btn-primary mt-8">
          <Home className="h-5 w-5" aria-hidden="true" />
          Back to home
        </button>
      </div>
    </div>
  );
}
