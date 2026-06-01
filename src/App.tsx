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
    <nav className="text-white shadow-lg relative overflow-visible z-30" style={{
      background: 'linear-gradient(180deg, #1C1010 0%, #2A1515 50%, #8B1A1A 100%)',
      borderBottom: '2px solid rgba(201,168,76,0.4)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5), 0 1px 0 rgba(201,168,76,0.2)',
    }}>
      {/* Linha decorativa dourada superior */}
      <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.6), rgba(201,168,76,0.9), rgba(201,168,76,0.6), transparent)' }} />

      <div className="px-4 py-0 flex items-center gap-10 min-h-[40px]">
        {/* Logo/Brasão */}
        <NavButton to="/" className="flex items-center shrink-0 -my-1">
          <img
            src="/brasao.png"
            alt="Sem Tormento"
            className="h-20 w-auto object-contain drop-shadow-lg"
            style={{ position: 'relative', top: '8px', marginBottom: '-8px' }}
          />
        </NavButton>

        {/* Desktop links */}
        <NavButton to="/" className="hidden md:block text-sm text-white/80 hover:text-amber-300 transition-colors">Início</NavButton>
        <NavButton to="/magias" className="hidden md:block text-sm text-white/80 hover:text-amber-300 transition-colors">Magias</NavButton>
        {user && (
          <NavButton to="/fichas" className="hidden md:block text-sm text-white/80 hover:text-amber-300 transition-colors">Minhas Fichas</NavButton>
        )}
        <NavButton to="/compendio" className="hidden md:block text-sm text-white/80 hover:text-amber-300 transition-colors">Compêndio</NavButton>

        <div className="ml-auto hidden md:flex items-center gap-4">
          {user ? (
            <>
              <span className="text-xs max-w-[160px] truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{user.email}</span>
              <button onClick={onSignOut} className="text-sm text-white/80 hover:text-amber-300 transition-colors">
                Sair
              </button>
            </>
          ) : (
            <NavButton to="/login" className="btn-gold text-xs px-3 py-1.5">Entrar</NavButton>
          )}
        </div>

        <button
          className="ml-auto md:hidden text-lg leading-none focus:outline-none"
          style={{ color: '#C9A84C' }}
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Menu"
        >
          ☰
        </button>
      </div>

      {/* Linha decorativa dourada inferior */}
      <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.4), rgba(201,168,76,0.7), rgba(201,168,76,0.4), transparent)' }} />

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden flex flex-col gap-3 px-6 py-4" style={{
          background: 'linear-gradient(180deg, #2A1515 0%, #1C1010 100%)',
          borderTop: '1px solid rgba(201,168,76,0.2)',
        }}>
          <NavButton to="/" afterNavigate={close} className="text-sm text-white/80 hover:text-amber-300 transition-colors text-left">Início</NavButton>
          <NavButton to="/magias" afterNavigate={close} className="text-sm text-white/80 hover:text-amber-300 transition-colors text-left">Magias</NavButton>
          {user && (
            <NavButton to="/fichas" afterNavigate={close} className="text-sm text-white/80 hover:text-amber-300 transition-colors text-left">Minhas Fichas</NavButton>
          )}
          <NavButton to="/compendio" afterNavigate={close} className="text-sm text-white/80 hover:text-amber-300 transition-colors text-left">Compêndio</NavButton>
          {user ? (
            <>
              <span className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{user.email}</span>
              <button onClick={() => { onSignOut(); close() }} className="text-sm text-white/80 hover:text-amber-300 transition-colors text-left">Sair</button>
            </>
          ) : (
            <NavButton to="/login" afterNavigate={close} className="btn-gold text-sm w-fit px-4 py-2">Entrar</NavButton>
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
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-6 py-16 relative overflow-hidden">

      {/* Ornamento decorativo de fundo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #8B1A1A 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] opacity-[0.03] rounded-full"
          style={{ border: '1px solid #8B1A1A' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] opacity-[0.05] rounded-full"
          style={{ border: '1px solid #C9A84C' }} />
      </div>

      {/* Título */}
      <div className="text-center mb-12 relative">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="h-px w-16 sm:w-24" style={{ background: 'linear-gradient(90deg, transparent, #C9A84C)' }} />
          <span className="text-xs font-semibold tracking-[0.3em] uppercase text-stone-400">Bem-vindo a</span>
          <div className="h-px w-16 sm:w-24" style={{ background: 'linear-gradient(90deg, #C9A84C, transparent)' }} />
        </div>
        <h1 className="font-display text-5xl sm:text-6xl font-semibold mb-3"
          style={{
            background: 'linear-gradient(135deg, #8B1A1A 0%, #A52020 50%, #6B1414 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
          Sem Tormento
        </h1>
        <p className="text-stone-500 text-lg">Seu companheiro digital para aventuras em Arton</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl w-full">
        {[
          {
            to: '/magias',
            icon: <img src="/icone-magias.png" alt="Magias" className="w-16 h-16 object-contain mx-auto" />,
            title: 'Magias',
            desc: 'Biblioteca completa com filtros e grimório',
          },
          {
            to: '/fichas',
            icon: <img src="/icone-fichas.png" alt="Fichas" className="w-16 h-16 object-contain mx-auto" />,
            title: 'Fichas',
            desc: 'Crie e gerencie seus personagens',
          },
          {
            to: '/compendio',
            icon: <img src="/icone-compendio.png" alt="Compêndio" className="w-16 h-16 object-contain mx-auto" />,
            title: 'Compêndio',
            desc: 'Raças, classes, origens e poderes',
          },
        ].map(({ to, icon, title, desc }) => (
          <Link key={to} to={to}
            className="group relative bg-white rounded-xl p-6 text-center transition-all duration-300 cursor-pointer overflow-hidden"
            style={{
              border: '1px solid rgba(139,26,26,0.15)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget
              el.style.boxShadow = '0 8px 24px rgba(139,26,26,0.15), 0 0 0 1px rgba(201,168,76,0.3)'
              el.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget
              el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
              el.style.transform = 'translateY(0)'
            }}
          >
            {/* Linha dourada no topo ao hover */}
            <div className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)' }} />

            <div className="flex justify-center mb-4">{icon}</div>
            <h2 className="font-display text-tormenta-red font-semibold text-lg mb-1">{title}</h2>
            <p className="text-sm text-stone-500">{desc}</p>
          </Link>
        ))}
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
    <div className="min-h-screen" style={{ backgroundColor: '#F8F5F0' }}>
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
