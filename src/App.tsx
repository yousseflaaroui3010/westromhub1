import { useState } from 'react';
import { PublicHeader } from './components/PublicHeader';
import { PublicFooter } from './components/PublicFooter';
import { ApiKeyPrompt } from './components/ApiKeyPrompt';
import { HomeView } from './components/HomeView';
import { TaxView } from './components/TaxView';
import { InsuranceView } from './components/InsuranceView';

export type ViewState = 'home' | 'taxes' | 'insurance';

export default function App() {
  const [isKeySelected, setIsKeySelected] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('home');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {!isKeySelected && <ApiKeyPrompt onKeySelected={() => setIsKeySelected(true)} />}
      
      {/* Pass currentView and setCurrentView to header if we want navigation there, 
          but for now we'll just let the logo go home */}
      <PublicHeader onNavigateHome={() => setCurrentView('home')} currentView={currentView} onNavigate={setCurrentView} />

      <main className="flex-grow flex flex-col">
        {currentView === 'home' && <HomeView onNavigate={setCurrentView} />}
        {currentView === 'taxes' && <TaxView />}
        {currentView === 'insurance' && <InsuranceView />}
      </main>

      <PublicFooter />
    </div>
  );
}
