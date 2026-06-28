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
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </head>
      <body>
        <AuthContext.Provider value={{ user, setUser, logout }}>
          {isAuth || !user ? (
            <main style={{ minHeight: '100vh', background: '#F0F2F5' }}>{children}</main>
          ) : (
            <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F0F2F5' }}>
              {/* Sidebar */}
              <aside style={{
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
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#C9A84C', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <TrendingUp size={16} color="#fff"/>
                  </div>
                  {sidebarOpen && (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 800, color: '#1A1A2E', letterSpacing: '1.5px', lineHeight: 1.2 }}>INVESTIMENTOS</p>
                      <p style={{ fontSize: 8, color: '#C9A84C', fontWeight: 700, letterSpacing: '1px', marginTop: 1 }}>PRO 2.0</p>
                    </div>
                  )}
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
                  <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: 6, borderRadius: 8, color: '#8896A8',
                  }}>
                    {sidebarOpen ? <X size={18}/> : <Menu size={18}/>}
                  </button>
                  <h1 style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E' }}>
                    {NAV.find(n => pathname.startsWith(n.href))?.label || 'Investimentos Pro 2.0'}
                  </h1>
                </header>

                <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                  {children}
                </main>
              </div>
            </div>
          )}
        </AuthContext.Provider>
      </body>
    </html>
  );
}
