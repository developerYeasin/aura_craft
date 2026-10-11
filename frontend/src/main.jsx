import React from 'react';
import ReactDOM from 'react-dom/client';
import SiteSuspended from './SiteSuspended.jsx';

// Site suspended pending payment. To restore, render <App /> again (see git history).
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SiteSuspended />
  </React.StrictMode>
);
