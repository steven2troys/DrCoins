import { useState } from 'react'
import CoinTracker from './CoinTracker'

const PASS_HASH = "3dcdf498"; // hash of the password
const AUTH_KEY = "coin-tracker-auth";

// Simple hash — not crypto-grade, but fine for a personal gate
function simpleHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

// We store the hash so the password isn't in plain text in the source
function checkPassword(input) {
  return simpleHash(input) === PASS_HASH;
}

function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (checkPassword(password)) {
      sessionStorage.setItem(AUTH_KEY, 'true')
      onLogin()
    } else {
      setError(true)
      setTimeout(() => setError(false), 2000)
    }
  }

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }} className="min-h-screen bg-stone-950 flex items-center justify-center">
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet" />
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🪙</div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-xl text-amber-400 mb-1">Coin Collection Tracker</h1>
          <p className="text-xs text-stone-500">Enter password to continue</p>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 text-sm focus:outline-none focus:border-amber-500 placeholder-stone-600 mb-3"
          />
          <button
            type="submit"
            className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Enter
          </button>
          {error && (
            <p className="text-red-400 text-xs text-center mt-3">Incorrect password</p>
          )}
        </form>
      </div>
    </div>
  )
}

function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(AUTH_KEY) === 'true')

  if (!authed) {
    return <LoginScreen onLogin={() => setAuthed(true)} />
  }

  return <CoinTracker />
}

export default App
