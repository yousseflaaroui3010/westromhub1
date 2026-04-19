import { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { PublicHeader } from './components/PublicHeader';
import { PublicFooter } from './components/PublicFooter';
import { HomeView } from './components/HomeView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NotFoundView } from './components/NotFoundView';

const TaxView = lazy(() => import('./components/TaxView').then(m => ({ default: m.TaxView })));
const InsuranceView = lazy(() => import('./components/InsuranceView').then(m => ({ default: m.InsuranceView })));

export type ViewState = 'home' | 'taxes' | 'insurance';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentView = location.pathname === '/taxes' ? 'taxes' :
                      location.pathname === '/insurance' ? 'insurance' : 'home';

  const onNavigate = (view: ViewState) => {
    if (view === 'home') navigate('/');
    else if (view === 'taxes') navigate('/taxes');
    else if (view === 'insurance') navigate('/insurance');
  };

  useEffect(() => {
    let title = 'Westrom Owner Advisory Hub';
    let description = 'Self-service resources to help Texas rental property owners optimize property taxes and insurance.';
    
    if (location.pathname === '/') {
      title = 'Westrom Owner Advisory Hub | Property Tax & Insurance Tools';
      description = 'Self-service resources to help Texas rental property owners optimize property taxes and insurance.';
    } else if (location.pathname === '/taxes') {
      title = 'Property Tax Hub | Westrom Owner Advisory Hub';
      description = 'Analyze your property tax notice to determine if you should protest your Texas property taxes.';
    } else if (location.pathname === '/insurance') {
      title = 'Insurance Hub | Westrom Owner Advisory Hub';
      description = 'Review your property insurance coverage and instantly connect with specialized brokers for better rates.';
    }

    document.title = title;
    
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', description);
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
      >
        Skip to main content
      </a>

      <PublicHeader
        onNavigateHome={() => navigate('/')}
        currentView={currentView}
        onNavigate={onNavigate}
      />

      <main id="main-content" role="main" tabIndex={-1} className="flex-grow flex flex-col">
        <ErrorBoundary resetKey={location.pathname}>
          <Suspense fallback={
            <div className="flex-grow flex items-center justify-center p-12">
              <div className="w-full max-w-3xl space-y-4 animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-8"></div>
                <div className="h-64 bg-gray-100 rounded-2xl w-full"></div>
                <div className="h-32 bg-gray-100 rounded-2xl w-full"></div>
              </div>
            </div>
          }>
            <Routes>
              <Route path="/" element={<HomeView onNavigate={onNavigate} />} />
              <Route path="/taxes" element={<TaxView />} />
              <Route path="/insurance" element={<InsuranceView />} />
              <Route path="*" element={<NotFoundView />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>

      <PublicFooter />
    </div>
  );
}
