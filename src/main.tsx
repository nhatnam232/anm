import { createRoot } from 'react-dom/client'
import App from './App'
import { initSecurityHardening } from './lib/security'
import './index.css'

// Run security hardening BEFORE React mounts so console silencing catches
// even React's own dev warnings (in production builds, this strips a few KB
// of accidental log calls and adds the friendly "don't paste anything" note).
initSecurityHardening()

createRoot(document.getElementById('root')!).render(<App />)
