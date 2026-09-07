import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { NoiseOverlay } from './components/NoiseOverlay';
import { LandingPage } from './pages/LandingPage';
import { WorkspacePage } from './pages/WorkspacePage';

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        {/* Subtle inline SVG turbulence noise grain (~3% opacity) over page background */}
        <NoiseOverlay />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/workspace" element={<WorkspacePage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
