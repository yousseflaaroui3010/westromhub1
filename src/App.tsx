import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { PublicHeader } from './components/PublicHeader';
import { PublicFooter } from './components/PublicFooter';
import { HomeView } from './components/HomeView';
import { TaxView } from './components/TaxView';
import { InsuranceView } from './components/InsuranceView';
import { ErrorBoundary } from './components/ErrorBoundary';

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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader
        onNavigateHome={() => navigate('/')}
        currentView={currentView}
        onNavigate={onNavigate}
      />

      <main className="flex-grow flex flex-col">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<HomeView onNavigate={onNavigate} />} />
            <Route path="/taxes" element={<TaxView />} />
            <Route path="/insurance" element={<InsuranceView />} />
          </Routes>
        </ErrorBoundary>
      </main>

      <PublicFooter />
    </div>
  );
}
