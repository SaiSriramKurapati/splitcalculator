import React from 'react';
import { Analytics } from '@vercel/analytics';
import './App.css';
import BillUploader from './components/BillUploader';
import BillUploaderMobile from './components/mobile/BillUploaderMobile';
import { useIsMobile } from './utils/deviceDetect';

function App() {
  const isMobileView = useIsMobile();

  return (
    <div className="App">
      {isMobileView ? <BillUploaderMobile /> : <BillUploader />}
      <Analytics />
    </div>
  );
}

export default App;
