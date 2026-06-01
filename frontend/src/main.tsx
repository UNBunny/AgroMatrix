import React from 'react'
import ReactDOM from 'react-dom/client'
import AppRouter from './router/index.tsx'
import { AuthProvider } from './context/AuthContext'
import './styles/global.css'
import './styles/ndvi.css'
import './styles/admin.css'
import './styles/auth.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </React.StrictMode>,
)