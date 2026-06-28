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

function LogoIcon({ size = 32, dark = true }) {
  const stroke = dark ? '#FFFFFF' : '#0F0F1A';
  const gold = '#C9A84C';
  const s = size;
  const scale = s / 32;
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points={`${2*scale},${30*scale} ${10*scale},${6*scale} ${18*scale},${30*scale}`} fill="none" stroke={stroke} strokeWidth="2.2" strokeLinejoin="round"/>
      <line x1={`${5*scale}`} y1={`${21*scale}`} x2={`${15*scale}`} y2={`${21*scale}`} stroke={stroke} strokeWidth="2.2"/>
      <circle cx={`${26*scale}`} cy={`${7*scale}`} r={`${3*scale}`} fill={gold}/>
      <line x1={`${26*scale}`} y1={`${12*scale}`} x2={`${26*scale}`} y2={`${30*scale}`} stroke={stroke} strokeWidth="2.2" strokeLinecap="round"/>
      <line x1={`${2*scale}`} y1={`${31.5*scale}`} x2={`${29*scale}`} y2={`${31.5*scale}`} stroke={gold} strokeWidth="1.2"/>
    </svg>
  );
}

function LogoFull({ dark = true }) {
  const stroke = dark ? '#FFFFFF' : '#0F0F1A';
  const gold = '#C9A84C';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <LogoIcon size={36} dark={dark}/>
      <div>
        <div style={{ fontSize: '13px', fontWeight: '800', color: dark ? '#FFFFFF' : '#0F0F1A', letterSpacing: '2px', lineHeight: 1.1 }}>AI INVESTIMENTOS</div>
        <div style={{ fontSize: '8px', color: gold, letterSpacing: '1.5px', marginTop: '1px' }}>SEU COPILOTO INTELIGENTE PARA INVESTIR</div>
      </div>
    </div>
  );
}

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
    <html lang="pt-BR"><body>
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"/>
          <p className="text-sm text-slate-500">Carregando...</p>
        </div>
      </div>
    </body></html>
  );

  return (
    <html lang="pt-BR">
      <head>
        <title>AI Investimentos — Seu copiloto inteligente para investir</title>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <meta name="theme-color" content="#0A0A0F"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
        <meta name="apple-mobile-web-app-title" content="AI Investimentos"/>
        <link rel="manifest" href="/manifest.json"/>
      </head>
      <body>
        <AuthContext.Provider value={{ user, setUser, logout }}>
          {isAuth || !user ? (
            <main className="min-h-screen bg-slate-50">{children}</main>
          ) : (
            <div className="flex h-screen overflow-hidden bg-slate-50">
              {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)}/>}

              <aside className={`fixed lg:relative inset-y-0 left-0 flex flex-col bg-slate-900 transition-transform duration-300 z-40 w-64 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="flex items-center justify-between px-4 py-5 border-b border-slate-800">
                  <LogoFull dark={true}/>
                  <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded text-slate-400 hover:text-white"><X size={18}/></button>
                </div>
                <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                  {NAV.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href || pathname.startsWith(href + '/');
                    return (
                      <a key={href} href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-amber-900/30 text-amber-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <Icon size={18} className="flex-shrink-0"/>
                        <span className="truncate">{label}</span>
                        {active && <ChevronRight size={14} className="ml-auto opacity-60"/>}
                      </a>
                    );
                  })}
                </nav>
                <div className="px-2 pb-4 border-t border-slate-800 pt-3 space-y-1">
                  <a href="/notificacoes" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
                    <div className="relative flex-shrink-0">
                      <Bell size={18}/>
                      {notifCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full text-white text-xs flex items-center justify-center">{notifCount}</span>}
                    </div>
                    <span>Notificacoes</span>
                  </a>
                  <div className="px-3 py-2 bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-amber-900/40 flex items-center justify-center"><User size={14} className="text-amber-400"/></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{user?.nome}</p>
                        <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                      </div>
                    </div>
                  </div>
                  <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-900/20 transition-colors">
                    <LogOut size={18} className="flex-shrink-0"/><span>Sair</span>
                  </button>
                </div>
              </aside>

              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center gap-3">
                  <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-400"><Menu size={20}/></button>
                  <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden lg:block p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-400"><Menu size={18}/></button>
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-white">{NAV.find(n => pathname.startsWith(n.href))?.label || 'AI Investimentos'}</span>
                  </div>
                  <a href="/notificacoes" className="relative p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-400">
                    <Bell size={18}/>
                    {notifCount > 0 && <span className="absolute top-0 right-0 w-4 h-4 bg-amber-500 rounded-full text-white text-xs flex items-center justify-center">{notifCount}</span>}
                  </a>
                </header>
                <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">{children}</main>
              </div>

              <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-30 flex">
                {NAV.slice(0, 5).map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(href + '/');
                  return (
                    <a key={href} href={href} className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${active ? 'text-amber-400' : 'text-slate-500'}`}>
                      <Icon size={20}/>
                      <span className="text-[10px] font-medium">{label.split(' ')[0]}</span>
                    </a>
                  );
                })}
                <button onClick={logout} className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-slate-500">
                  <LogOut size={20}/><span className="text-[10px] font-medium">Sair</span>
                </button>
              </nav>
            </div>
          )}
        </AuthContext.Provider>
      </body>
    </html>
  );
}