import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { LyricsOverlay } from './components/LyricsOverlay.tsx'
import './index.css'

const isLyricsOverlay = window.location.hash === '#/lyrics-overlay';

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    {isLyricsOverlay ? <LyricsOverlay /> : <App />}
  </React.StrictMode>,
)
