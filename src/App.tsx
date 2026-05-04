import { useState } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import SpellsPage from './pages/SpellsPage'
import CreateSpellPage from './pages/CreateSpellPage'
import CharacterPage from './pages/CharacterPage'
import CharactersListPage from './pages/CharactersListPage'
import CompendiumPage from './pages/CompendiumPage'
import AuthPage from './pages/AuthPage'
import { useAuth } from './hooks/useAuth'
import { supabase } from './lib/supabase'
import { DirtyProvider, useDirty } from './contexts/DirtyContext'

// ─── NavButton ────────────────────────────────────────────────────────────────

function NavButton({ to, children, className = 'text-sm hover:text-amber-200 transition-colors', afterNavigate }: {
  to: string
  children: React.ReactNode
  className?: string
  afterNavigate?: () => void
}) {
  const navigate = useNavigate()
  const { isDirtyRef } = useDirty()
  const [showModal, setShowModal] = useState(false)

  function handleClick() {
    if (isDirtyRef.current) {
      setShowModal(true)
    } else {
      afterNavigate?.()
      navigate(to)
    }
  }

  return (
    <>
      <button onClick={handleClick} className={className}>
        {children}
      </button>
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-tormenta-red">Alterações não salvas</h2>
            <p className="text-sm text-stone-600">Você tem alterações não salvas. O que deseja fazer?</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setShowModal(false); isDirtyRef.current = false; afterNavigate?.(); navigate(to) }}
                className="w-full px-4 py-2 text-sm border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors text-stone-600"
              >
                Sair sem salvar
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="w-full px-4 py-2 text-sm text-stone-400 hover:text-stone-600 transition-colors"
              >
                Continuar editando
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar({ user, onSignOut }: { user: User | null; onSignOut: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const close = () => setMenuOpen(false)

  return (
    <nav className="bg-tormenta-red text-white shadow-md">
      <div className="px-6 py-3 flex items-center gap-8">
        <span className="font-display text-lg font-semibold tracking-wide">Tormenta 20</span>

        {/* Desktop links */}
        <NavButton to="/" className="hidden md:block text-sm hover:text-amber-200 transition-colors">Início</NavButton>
        <NavButton to="/magias" className="hidden md:block text-sm hover:text-amber-200 transition-colors">Magias</NavButton>
        {user && (
          <NavButton to="/fichas" className="hidden md:block text-sm hover:text-amber-200 transition-colors">Minhas Fichas</NavButton>
        )}
        <NavButton to="/compendio" className="hidden md:block text-sm hover:text-amber-200 transition-colors">Compêndio</NavButton>
        <div className="ml-auto hidden md:flex items-center gap-4">
          {user ? (
            <>
              <span className="text-xs text-white/70 max-w-[160px] truncate">{user.email}</span>
              <button onClick={onSignOut} className="text-sm hover:text-amber-200 transition-colors">
                Sair
              </button>
            </>
          ) : (
            <NavButton to="/login" className="text-sm hover:text-amber-200 transition-colors">Entrar</NavButton>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="ml-auto md:hidden text-lg leading-none focus:outline-none"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Menu"
        >
          ☰
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden flex flex-col gap-3 px-6 py-4 border-t border-white/20">
          <NavButton to="/" afterNavigate={close} className="text-sm hover:text-amber-200 transition-colors">Início</NavButton>
          <NavButton to="/magias" afterNavigate={close} className="text-sm hover:text-amber-200 transition-colors">Magias</NavButton>
          {user && (
            <NavButton to="/fichas" afterNavigate={close} className="text-sm hover:text-amber-200 transition-colors">Minhas Fichas</NavButton>
          )}
          <NavButton to="/compendio" afterNavigate={close} className="text-sm hover:text-amber-200 transition-colors">Compêndio</NavButton>
          {user ? (
            <>
              <span className="text-xs text-white/70 truncate">{user.email}</span>
              <button onClick={() => { onSignOut(); close() }} className="text-sm text-left hover:text-amber-200 transition-colors">
                Sair
              </button>
            </>
          ) : (
            <NavButton to="/login" afterNavigate={close} className="text-sm hover:text-amber-200 transition-colors">Entrar</NavButton>
          )}
        </div>
      )}
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
      <DirtyProvider>
        <AppLayout user={user} loading={loading} onSignOut={handleSignOut} />
      </DirtyProvider>
    </BrowserRouter>
  )
}

export default App
