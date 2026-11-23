import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { applySystemTheme } from './lib/theme'
import { store } from './store/store'

// The service worker only handles Web Push (no offline cache); it is registered when the page has loaded.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // push is optional: the app works the same without a service worker
    })
  })
}

// Keep light/dark in sync with the system setting (index.html sets the first value before paint).
applySystemTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
)
