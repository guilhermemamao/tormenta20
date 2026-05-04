import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Mode = 'login' | 'signup' | 'forgot'

const INPUT = 'w-full px-3 py-2 text-sm border border-stone-200 rounded-lg bg-stone-50 focus:outline-none focus:ring-1 focus:ring-tormenta-red focus:border-tormenta-red'

export default function AuthPage() {
  const navigate = useNavigate()
  const [mode, setMode]                   = useState<Mode>('login')
  const [email, setEmail]                 = useState('')
  const [password, setPassword]           = useState('')
  const [confirmPassword, setConfirm]     = useState('')
  const [username, setUsername]           = useState('')
  const [city, setCity]                   = useState('')
  const [error, setError]                 = useState<string | null>(null)
  const [loading, setLoading]             = useState(false)
  const [signedUp, setSignedUp]           = useState(false)
  const [forgotSent, setForgotSent]       = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setConfirm('')
    setUsername('')
    setCity('')
    setForgotSent(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (mode === 'signup' && password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else navigate('/')
    } else if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/login',
      })
      if (error) setError(error.message)
      else setForgotSent(true)
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username, city: city || null } },
      })
      if (error) {
        setError(error.message)
      } else {
        if (data.user) {
          await supabase.from('profiles').insert({
            id: data.user.id,
            username,
            city: city || null,
          })
        }
        setSignedUp(true)
      }
    }

    setLoading(false)
  }

  const isSignup = mode === 'signup'

  return (
    <div className="min-h-[calc(100vh-48px)] bg-stone-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-xl shadow-sm border border-stone-200 w-full max-w-sm p-8 border-t-4 transition-colors ${
        isSignup ? 'border-t-emerald-500' : 'border-t-tormenta-red'
      }`}>

        <h1 className="font-display text-2xl font-semibold text-tormenta-red mb-1 text-center">
          {isSignup ? 'Criar Conta' : mode === 'forgot' ? 'Redefinir senha' : 'Bem-vindo de volta'}
        </h1>
        <p className="text-sm text-stone-500 text-center mb-8">
          {isSignup ? 'Junte-se à aventura em Arton' : mode === 'forgot' ? 'Enviaremos um link para seu email' : 'Entre na sua conta para continuar'}
        </p>

        {signedUp ? (
          <div className="text-center space-y-4 py-2">
            <CheckCircle size={52} className="text-emerald-500 mx-auto" />
            <div>
              <h2 className="font-display text-lg font-semibold text-emerald-700 mb-1">Conta criada!</h2>
              <p className="text-sm text-stone-600 leading-relaxed">
                Verifique seu email e clique no link de confirmação antes de entrar.
              </p>
            </div>
            <button
              onClick={() => { setSignedUp(false); switchMode('login') }}
              className="btn-primary w-full justify-center mt-2"
            >
              Ir para o login
            </button>
          </div>
        ) : forgotSent ? (
          <div className="text-center space-y-4 py-2">
            <CheckCircle size={52} className="text-emerald-500 mx-auto" />
            <div>
              <h2 className="font-display text-lg font-semibold text-emerald-700 mb-1">Email enviado!</h2>
              <p className="text-sm text-stone-600 leading-relaxed">
                Verifique seu email para redefinir sua senha.
              </p>
            </div>
            <button
              onClick={() => switchMode('login')}
              className="btn-primary w-full justify-center mt-2"
            >
              Voltar ao login
            </button>
          </div>
        ) : mode === 'forgot' ? (
          <>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className={INPUT}
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-60 bg-tormenta-red hover:bg-tormenta-red-dark"
              >
                {loading ? 'Aguarde…' : 'Enviar link'}
              </button>
            </form>

            <p className="text-xs text-stone-400 text-center mt-6">
              Lembrou a senha?{' '}
              <button
                onClick={() => switchMode('login')}
                className="text-tormenta-red hover:underline"
              >
                Voltar ao login
              </button>
            </p>
          </>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              {isSignup && (
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    Nome de usuário <span className="text-tormenta-red">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="aventureiro_arton"
                    className={INPUT}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className={INPUT}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Senha</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={INPUT}
                />
              </div>

              {mode === 'login' && (
                <button type="button" onClick={() => switchMode('forgot')}
                  className="text-xs text-stone-400 hover:text-tormenta-red text-right w-full transition-colors">
                  Esqueceu a senha?
                </button>
              )}

              {isSignup && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">
                      Confirmar senha <span className="text-tormenta-red">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="••••••••"
                      className={INPUT}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">
                      Cidade{' '}
                      <span className="text-stone-400 font-normal">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      placeholder="Ex: Valkaria"
                      className={INPUT}
                    />
                  </div>
                </>
              )}

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-60 ${
                  isSignup
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-tormenta-red hover:bg-tormenta-red-dark'
                }`}
              >
                {loading ? 'Aguarde…' : isSignup ? 'Criar conta' : 'Entrar'}
              </button>
            </form>

            <p className="text-xs text-stone-400 text-center mt-6">
              {isSignup ? 'Já tem conta?' : 'Não tem conta?'}
              {' '}
              <button
                onClick={() => switchMode(isSignup ? 'login' : 'signup')}
                className="text-tormenta-red hover:underline"
              >
                {isSignup ? 'Entrar' : 'Cadastre-se'}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
