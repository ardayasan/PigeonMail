import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { MailProvider } from './store'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MailProvider>
      <App />
    </MailProvider>
  </React.StrictMode>,
)
