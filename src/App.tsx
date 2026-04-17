import { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { PublicHeader } from './components/PublicHeader';
import { PublicFooter } from './components/PublicFooter';
import { HomeView } from './components/HomeView';
import { TaxView } from './components/TaxView';
import { InsuranceView } from './components/InsuranceView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NotFoundView } from './components/NotFoundView';

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
        className="absolute -top-9999 left-0 z-[100] bg-primary text-white px-4 py-2 opacity-0 focus:opacity-100 focus:top-0 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary transition-opacity"
      >
        Skip to main content
      </a>

      <PublicHeader
        onNavigateHome={() => navigate('/')}
        currentView={currentView}
        onNavigate={onNavigate}
      />

      <main id="main-content" tabIndex={-1} className="flex-grow flex flex-col focus:outline-none">
        <ErrorBoundary resetKey={location.pathname}>
          <Routes>
            <Route path="/" element={<HomeView onNavigate={onNavigate} />} />
            <Route path="/taxes" element={<TaxView />} />
            <Route path="/insurance" element={<InsuranceView />} />
            <Route path="*" element={<NotFoundView />} />
          </Routes>
        </ErrorBoundary>
      </main>

      <PublicFooter />
    </div>
  );
}
