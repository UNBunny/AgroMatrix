import React from 'react'
import ReactDOM from 'react-dom/client'
import AppRouter from './router/index.tsx'
import './styles/global.css'
import './styles/ndvi.css'
import './styles/admin.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>,
)