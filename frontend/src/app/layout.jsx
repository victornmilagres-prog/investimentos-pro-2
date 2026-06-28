'use client';
import './globals.css';
import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, TrendingUp, Building2, Landmark, Eye, Target, Bell, LogOut, Menu, X, ChevronRight, User } from 'lucide-react';
import api from '@/lib/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/acoes', label: 'Acoes', icon: TrendingUp },
  { href: '/fiis', label: 'FIIs', icon: Building2 },
  { href: '/renda-fixa', label: 'Renda Fixa', icon: Landmark },
  { href: '/watchlist', label: 'Watchlist', icon: Eye },
  { href: '/planejamento', label: 'Planejamento', icon: Target },
];

function LogoIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <polygon points="2,38 13,7 24,38" fill="none" stroke="#FFFFFF" strokeWidth="2.8" strokeLinejoin="round"/>
      <line x1="6" y1="27" x2="20" y2="27" stroke="#FFFFFF" strokeWidth="2.8"/>
      <circle cx="33" cy="8" r="4" fill="#C9A84C"/>
      <line x1="33" y1="14" x2="33" y2="38" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round"/>
      <line x1="2" y1="39.5" x2="37" y2="39.5" stroke="#C9A84C" strokeWidth="1.5"/>
    </svg>
  );
}

const S = {
  bg: '#0A0A0F',
  surface: '#0F0F1A',
  card: '#13131F',
  border: '#1E1E2E',
  gold: '#C9A84C',
  text: '#FFFFFF',
  muted: '#707088',
  dim: '#55556A',
};

export default function RootLayout({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const isAuth = pathname === '/login' || pathname === '/register' || pathname === '/esqueci-senha';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me').then(r => { setUser(r.data); setLoading(false); }).catch(() => { localStorage.removeItem('token'); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!user) return;
    api.get('/notificacoes').then(r => setNotifCount(r.data.filter(n => !n.lida).length)).catch(() => {});
  }, [user, pathname]);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  const logout = () => { localStorage.removeItem('token'); setUser(null); router.push('/login'); };

  if (loading) return (
    <html lang="pt-BR">
      <body style={{ background: S.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', border: `2px solid ${S.gold}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}/>
          <p style={{ color: S.dim, fontSize: '13px', margin: 0 }}>Carregando...</p>
        </div>
      </body>
    </html>
  );

  return (
    <html lang="pt-BR">
      <head>
        <title>AI Investimentos — Seu copiloto inteligente para investir</title>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <meta name="theme-color" content="#0A0A0F"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-title" content="AI Investimentos"/>
        <link rel="manifest" href="/manifest.json"/>
      </head>
      <body style={{ background: S.bg, margin: 0, padding: 0 }}>
        <AuthContext.Provider value={{ user, setUser, logout }}>
          {isAuth || !user ? (
            <main style={{ minHeight: '100vh', background: S.bg }}>{children}</main>
          ) : (
            <div style={{ display: 'flex', minHeight: '100vh', background: S.bg }}>

              {/* Overlay mobile */}
              {sidebarOpen && (
                <div onClick={() => setSidebarOpen(false)} style={{
                  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 30,
                  display: 'block'
                }} className="lg:hidden"/>
              )}

              {/* Sidebar — fixed, 240px */}
              <aside style={{
                width: '240px',
                background: S.surface,
                borderRight: `1px solid ${S.border}`,
                display: 'flex',
                flexDirection: 'column',
                position: 'fixed',
                top: 0, bottom: 0, left: 0,
                zIndex: 40,
                transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.25s ease',
              }} className="lg:translate-x-0">

                <div style={{ padding: '18px 14px', borderBottom: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <LogoIcon size={32}/>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: '800', color: S.text, letterSpacing: '2px' }}>AI INVESTIMENTOS</div>
                      <div style={{ fontSize: '7px', color: S.gold, letterSpacing: '1px', marginTop: '2px' }}>SEU COPILOTO INTELIGENTE</div>
                    </div>
                  </div>
                  <button onClick={() => setSidebarOpen(false)} className="lg:hidden"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.muted, padding: '2px' }}>
                    <X size={16}/>
                  </button>
                </div>

                <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
                  {NAV.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href || pathname.startsWith(href + '/');
                    return (
                      <a key={href} href={href} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '9px 12px', borderRadius: '8px', marginBottom: '2px',
                        fontSize: '13px', fontWeight: '500', textDecoration: 'none',
                        background: active ? 'rgba(201,168,76,0.1)' : 'transparent',
                        color: active ? S.gold : S.muted,
                        borderLeft: `2px solid ${active ? S.gold : 'transparent'}`,
                        transition: 'all 0.15s',
                      }}>
                        <Icon size={17} style={{ flexShrink: 0 }}/>
                        <span>{label}</span>
                        {active && <ChevronRight size={13} style={{ marginLeft: 'auto', opacity: 0.5 }}/>}
                      </a>
                    );
                  })}
                </nav>

                <div style={{ padding: '8px 8px 14px', borderTop: `1px solid ${S.border}` }}>
                  <a href="/notificacoes" style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px',
                    borderRadius: '8px', fontSize: '13px', color: S.muted, textDecoration: 'none', marginBottom: '4px'
                  }}>
                    <div style={{ position: 'relative' }}>
                      <Bell size={17}/>
                      {notifCount > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-5px', width: '14px', height: '14px', background: S.gold, borderRadius: '50%', color: S.bg, fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>{notifCount}</span>}
                    </div>
                    <span>Notificacoes</span>
                  </a>
                  <div style={{ padding: '9px 12px', background: S.card, borderRadius: '8px', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(201,168,76,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <User size={14} style={{ color: S.gold }}/>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: '12px', fontWeight: '600', color: S.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.nome}</p>
                        <p style={{ fontSize: '10px', color: S.dim, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
                      </div>
                    </div>
                  </div>
                  <button onClick={logout} style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px',
                    borderRadius: '8px', fontSize: '13px', color: '#EF4444',
                    background: 'none', border: 'none', cursor: 'pointer', width: '100%',
                  }}>
                    <LogOut size={17}/><span>Sair</span>
                  </button>
                </div>
              </aside>

              {/* Conteudo — margem esquerda de 240px no desktop */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, marginLeft: 0 }} className="lg:ml-60">

                {/* Header */}
                <header style={{
                  background: S.surface, borderBottom: `1px solid ${S.border}`,
                  padding: '0 16px', height: '52px',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  position: 'sticky', top: 0, zIndex: 20, flexShrink: 0,
                }}>
                  <button onClick={() => setSidebarOpen(true)} className="lg:hidden"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.muted, padding: '4px' }}>
                    <Menu size={20}/>
                  </button>
                  <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden lg:block"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.muted, padding: '4px' }}>
                    <Menu size={18}/>
                  </button>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: S.text }}>
                      {NAV.find(n => pathname.startsWith(n.href))?.label || 'AI Investimentos'}
                    </span>
                  </div>
                  <a href="/notificacoes" style={{ position: 'relative', color: S.muted, textDecoration: 'none', padding: '4px' }}>
                    <Bell size={18}/>
                    {notifCount > 0 && <span style={{ position: 'absolute', top: 0, right: 0, width: '14px', height: '14px', background: S.gold, borderRadius: '50%', color: S.bg, fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>{notifCount}</span>}
                  </a>
                </header>

                {/* Conteudo da pagina */}
                <main style={{
                  flex: 1, overflowY: 'auto', background: S.bg,
                  padding: '20px 16px', paddingBottom: '80px',
                }} className="lg:p-6 lg:pb-6">
                  {children}
                </main>
              </div>

              {/* Bottom nav mobile */}
              <nav className="lg:hidden" style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                background: S.surface, borderTop: `1px solid ${S.border}`,
                display: 'flex', zIndex: 30, height: '58px',
              }}>
                {NAV.slice(0, 5).map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(href + '/');
                  return (
                    <a key={href} href={href} style={{
                      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', gap: '2px', textDecoration: 'none',
                      color: active ? S.gold : S.dim, fontSize: '10px', fontWeight: '500',
                    }}>
                      <Icon size={20}/>
                      <span>{label.split(' ')[0]}</span>
                    </a>
                  );
                })}
                <button onClick={logout} style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: '2px', color: S.dim,
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: '500',
                }}>
                  <LogOut size={20}/><span>Sair</span>
                </button>
              </nav>

            </div>
          )}
        </AuthContext.Provider>
      </body>
    </html>
  );
}