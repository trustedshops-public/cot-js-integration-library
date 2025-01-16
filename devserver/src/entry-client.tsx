import React from 'react';
import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';

import App from './app/App';

const rootElement = document.getElementById('root');
if (rootElement) {
    hydrateRoot(
        rootElement,
        <StrictMode>
            <App />
        </StrictMode>,
    );
}