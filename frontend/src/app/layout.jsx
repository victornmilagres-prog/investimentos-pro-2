'use client';
import './globals.css';
import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard, TrendingUp, Building2, Landmark,
  Eye, Target, Bell, LogOut, Menu, X, User
} from 'lucide-react';
import api from '@/lib/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const NAV = [
  { href: '/planejamento', label: 'Planejamento Patrimonial', icon: Target },
  { href: '/dashboard',    label: 'Dashboard',                icon: LayoutDashboard },
  { href: '/acoes',        label: 'Carteira Ações',           icon: TrendingUp },
  { href: '/fiis',         label: 'Carteira FII',             icon: Building2 },
  { href: '/renda-fixa',   label: 'Carteira Renda Fixa',      icon: Landmark },
  { href: '/watchlist',    label: 'No Radar',                 icon: Eye },
];

const BOTTOM_NAV = [
  { href: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/acoes',      label: 'Ações',        icon: TrendingUp },
  { href: '/fiis',       label: 'FII',          icon: Building2 },
  { href: '/renda-fixa', label: 'Renda Fixa',   icon: Landmark },
  { href: '/watchlist',  label: 'Radar',        icon: Eye },
];

function LogoSidebar({ collapsed }) {
  const gold = '#C9A84C';
  const dark = '#1A1A2E';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <polygon points="2,38 13,7 24,38" fill="none" stroke={dark} strokeWidth="2.8" strokeLinejoin="round"/>
        <line x1="6" y1="27" x2="20" y2="27" stroke={dark} strokeWidth="2.8"/>
        <circle cx="33" cy="8" r="4" fill={gold}/>
        <line x1="33" y1="14" x2="33" y2="38" stroke={dark} strokeWidth="2.8" strokeLinecap="round"/>
        <line x1="2" y1="39.5" x2="37" y2="39.5" stroke={gold} strokeWidth="1.5"/>
      </svg>
      {!collapsed && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 800, color: dark, letterSpacing: '1.5px', lineHeight: 1.2 }}>INVESTIMENTOS</p>
          <p style={{ fontSize: 8, color: gold, fontWeight: 700, letterSpacing: '1px', marginTop: 1 }}>PRO 2.0</p>
        </div>
      )}
    </div>
  );
}

export default function RootLayout({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifCount, setNotifCount] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const isAuth = pathname === '/login' || pathname === '/register';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me').then(r => {
      setUser(r.data);
      setLoading(false);
    }).catch(() => {
      localStorage.removeItem('token');
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    api.get('/notificacoes').then(r => {
      setNotifCount(r.data.filter(n => !n.lida).length);
    }).catch(() => {});
  }, [user, pathname]);

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    router.push('/login');
  };

  if (loading) return (
    <html lang="pt-BR"><body style={{ background: '#F0F2F5' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, border: '2px solid #C9A84C', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}/>
          <p style={{ fontSize: 13, color: '#8896A8' }}>Carregando...</p>
        </div>
      </div>
    </body></html>
  );

  return (
    <html lang="pt-BR">
      <head>
        <title>Investimentos Pro 2.0</title>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @media (max-width: 767px) {
            .sidebar-desktop { display: none !important; }
            .bottom-nav { display: flex !important; }
            .main-content { padding-bottom: 64px !important; }
          }
          @media (min-width: 768px) {
            .bottom-nav { display: none !important; }
          }
        `}</style>
      </head>
      <body>
        <AuthContext.Provider value={{ user, setUser, logout }}>
          {isAuth || !user ? (
            <main style={{ minHeight: '100vh', background: '#F0F2F5' }}>{children}</main>
          ) : (
            <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F0F2F5' }}>
              {/* Sidebar — desktop only */}
              <aside className="sidebar-desktop" style={{
                width: sidebarOpen ? 240 : 64,
                background: '#FFFFFF',
                borderRight: '1px solid #E8ECF0',
                display: 'flex',
                flexDirection: 'column',
                transition: 'width 0.25s',
                flexShrink: 0,
                zIndex: 20,
                overflow: 'hidden',
              }}>
                {/* Logo */}
                <div style={{ padding: '18px 16px', borderBottom: '1px solid #E8ECF0', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <LogoSidebar collapsed={!sidebarOpen}/>
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
                  {NAV.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href || pathname.startsWith(href + '/');
                    return (
                      <a key={href} href={href} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '9px 12px',
                        borderRadius: 8,
                        marginBottom: 2,
                        fontSize: 13,
                        fontWeight: 500,
                        textDecoration: 'none',
                        borderLeft: `2px solid ${active ? '#C9A84C' : 'transparent'}`,
                        background: active ? 'rgba(201,168,76,0.08)' : 'transparent',
                        color: active ? '#C9A84C' : '#8896A8',
                        transition: 'all 0.15s',
                      }}>
                        <Icon size={18} style={{ flexShrink: 0 }}/>
                        {sidebarOpen && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
                      </a>
                    );
                  })}
                </nav>

                {/* Footer */}
                <div style={{ padding: '12px 8px', borderTop: '1px solid #E8ECF0' }}>
                  <a href="/notificacoes" style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                    borderRadius: 8, fontSize: 13, color: '#8896A8', textDecoration: 'none',
                    borderLeft: '2px solid transparent',
                  }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <Bell size={18}/>
                      {notifCount > 0 && (
                        <span style={{
                          position: 'absolute', top: -4, right: -4, width: 16, height: 16,
                          background: '#DC2626', borderRadius: '50%', color: '#fff',
                          fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{notifCount}</span>
                      )}
                    </div>
                    {sidebarOpen && <span>Notificações</span>}
                  </a>
                  {sidebarOpen && (
                    <div style={{ padding: '8px 12px', background: '#F8F9FA', borderRadius: 8, margin: '4px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={14} color="#2563EB"/>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: '#1A1A2E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.nome}</p>
                          <p style={{ fontSize: 11, color: '#8896A8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <button onClick={logout} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 8, fontSize: 13, color: '#DC2626',
                    background: 'none', border: 'none', cursor: 'pointer',
                    borderLeft: '2px solid transparent',
                  }}>
                    <LogOut size={18} style={{ flexShrink: 0 }}/>
                    {sidebarOpen && <span>Sair</span>}
                  </button>
                </div>
              </aside>

              {/* Main */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                {/* Topbar */}
                <header style={{
                  background: '#FFFFFF', borderBottom: '1px solid #E8ECF0',
                  padding: '0 24px', height: 52,
                  display: 'flex', alignItems: 'center', gap: 12,
                  position: 'sticky', top: 0, zIndex: 10,
                }}>
                  <button onClick={() => setSidebarOpen(!sidebarOpen)} className="sidebar-desktop" style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: 6, borderRadius: 8, color: '#8896A8',
                  }}>
                    {sidebarOpen ? <X size={18}/> : <Menu size={18}/>}
                  </button>
                  <h1 style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E' }}>
                    {NAV.find(n => pathname.startsWith(n.href))?.label || 'Investimentos Pro 2.0'}
                  </h1>
                </header>

                <main className="main-content" style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                  {children}
                </main>
              </div>

              {/* Bottom nav — mobile only */}
              <nav className="bottom-nav" style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                background: '#FFFFFF', borderTop: '1px solid #E8ECF0',
                height: 60, zIndex: 50,
                display: 'none',
                alignItems: 'stretch',
              }}>
                {BOTTOM_NAV.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(href + '/');
                  return (
                    <a key={href} href={href} style={{
                      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      gap: 3, textDecoration: 'none',
                      color: active ? '#C9A84C' : '#8896A8',
                      borderTop: `2px solid ${active ? '#C9A84C' : 'transparent'}`,
                    }}>
                      <Icon size={20}/>
                      <span style={{ fontSize: 10, fontWeight: 500 }}>{label}</span>
                    </a>
                  );
                })}
              </nav>
            </div>
          )}
        </AuthContext.Provider>
      </body>
    </html>
  );
}
