import React from 'react';
import ReactDOM from 'react-dom/client';
import '../styles.css';
import App from './App';
import { startVersionCheck } from './version-check';

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

// Avisa para recargar cuando se despliega una versión nueva del panel.
startVersionCheck();
