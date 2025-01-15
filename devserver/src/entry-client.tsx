import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import App from './App'
import React from 'react'

const rootElement = document.getElementById('root');
if (rootElement) {
    hydrateRoot(
        rootElement,
        <StrictMode>
            <App />
        </StrictMode>,
    );
}