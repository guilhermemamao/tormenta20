import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import SpellsPage from './pages/SpellsPage'
import CreateSpellPage from './pages/CreateSpellPage'
import CharacterPage from './pages/CharacterPage'
import CharactersListPage from './pages/CharactersListPage'
import CompendiumPage from './pages/CompendiumPage'
import AuthPage from './pages/AuthPage'
import { useAuth } from './hooks/useAuth'
import { supabase } from './lib/supabase'

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar({ user, onSignOut }: { user: User | null; onSignOut: () => void }) {
  return (
    <nav className="bg-tormenta-red text-white px-6 py-3 flex items-center gap-8 shadow-md">
      <span className="font-display text-lg font-semibold tracking-wide">Tormenta 20</span>
      <Link to="/" className="text-sm hover:text-amber-200 transition-colors">Início</Link>
      <Link to="/magias" className="text-sm hover:text-amber-200 transition-colors">Magias</Link>
      {user && (
        <Link to="/fichas" className="text-sm hover:text-amber-200 transition-colors">Minhas Fichas</Link>
      )}
      <Link to="/compendio" className="text-sm hover:text-amber-200 transition-colors">Compêndio</Link>
      <div className="ml-auto flex items-center gap-4">
        {user ? (
          <>
            <span className="text-xs text-white/70 max-w-[160px] truncate">{user.email}</span>
            <button onClick={onSignOut} className="text-sm hover:text-amber-200 transition-colors">
              Sair
            </button>
          </>
        ) : (
          <Link to="/login" className="text-sm hover:text-amber-200 transition-colors">Entrar</Link>
        )}
      </div>
    </nav>
  )
}

// ─── Route guard ──────────────────────────────────────────────────────────────

function ProtectedRoute({ user, loading, children }: {
  user: User | null
  loading: boolean
  children: React.ReactNode
}) {
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

// ─── Home ─────────────────────────────────────────────────────────────────────

function Home() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 text-center">
      <h1 className="font-display text-4xl font-semibold text-tormenta-red mb-4">Tormenta 20</h1>
      <p className="text-stone-600 text-lg mb-12">Seu companheiro digital para aventuras em Arton</p>
      <div className="grid grid-cols-3 gap-6">
        <Link to="/magias" className="card hover:shadow-md transition-shadow cursor-pointer group">
          <div className="text-3xl mb-3">🔮</div>
          <h2 className="font-display text-tormenta-red font-medium mb-1">Magias</h2>
          <p className="text-sm text-stone-500">Biblioteca completa com filtros e grimório</p>
        </Link>
        <Link to="/fichas" className="card hover:shadow-md transition-shadow cursor-pointer group">
          <div className="text-3xl mb-3">📜</div>
          <h2 className="font-display text-tormenta-red font-medium mb-1">Fichas</h2>
          <p className="text-sm text-stone-500">Crie e gerencie seus personagens</p>
        </Link>
        <Link to="/compendio" className="card hover:shadow-md transition-shadow cursor-pointer group">
          <div className="text-3xl mb-3">📖</div>
          <h2 className="font-display text-tormenta-red font-medium mb-1">Compêndio</h2>
          <p className="text-sm text-stone-500">Raças, classes, origens e poderes</p>
        </Link>
      </div>
    </div>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

function AppLayout({ user, loading, onSignOut }: {
  user: User | null
  loading: boolean
  onSignOut: () => void
}) {
  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar user={user} onSignOut={onSignOut} />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
        <Route path="/" element={<Home />} />
        <Route path="/magias" element={<SpellsPage />} />
        <Route path="/compendio" element={<CompendiumPage />} />
        <Route
          path="/magias/criar"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <CreateSpellPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/magias/editar/:id"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <CreateSpellPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fichas"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <CharactersListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ficha/:id"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <CharacterPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  const { user, loading } = useAuth()

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <BrowserRouter>
      <AppLayout user={user} loading={loading} onSignOut={handleSignOut} />
    </BrowserRouter>
  )
}

export default App
