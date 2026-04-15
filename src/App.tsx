import { useCallback, useState } from 'react';
import { OllamaStatus } from './components/OllamaStatus';
import { PublicHeader } from './components/PublicHeader';
import { PublicFooter } from './components/PublicFooter';
import { HomeView } from './components/HomeView';
import { TaxView } from './components/TaxView';
import { InsuranceView } from './components/InsuranceView';

export type ViewState = 'home' | 'taxes' | 'insurance';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const handleReady = useCallback(() => setIsReady(true), []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {!isReady && <OllamaStatus onReady={handleReady} />}

      <PublicHeader
        onNavigateHome={() => setCurrentView('home')}
        currentView={currentView}
        onNavigate={setCurrentView}
      />

      <main className="flex-grow flex flex-col">
        {currentView === 'home' && <HomeView onNavigate={setCurrentView} />}
        {currentView === 'taxes' && <TaxView />}
        {currentView === 'insurance' && <InsuranceView />}
      </main>

      <PublicFooter />
    </div>
  );
}
