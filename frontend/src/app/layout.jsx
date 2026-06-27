'use client';
import './globals.css';
import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
LayoutDashboard, TrendingUp, Building2, Landmark,
Eye, Target, Bell, LogOut, Menu, X, ChevronRight, User
} from 'lucide-react';
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

// Fecha sidebar ao navegar no mobile
useEffect(() => { setSidebarOpen(false); }, [pathname]);

const logout = () => {
localStorage.removeItem('token');
setUser(null);
router.push('/login');
};

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
<title>Investimentos Pro 2.0</title>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
</head>
<body>
<AuthContext.Provider value={{ user, setUser, logout }}>
{isAuth || !user ? (
<main className="min-h-screen bg-slate-50">{children}</main>
) : (
<div className="flex h-screen overflow-hidden bg-slate-50">

{/* Overlay mobile */}
{sidebarOpen && (
<div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)}/>
)}

{/* Sidebar */}
<aside className={`
fixed lg:relative inset-y-0 left-0 flex flex-col bg-white border-r border-slate-200
transition-transform duration-300 z-40 w-64
${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
lg:w-60
`}>
{/* Logo */}
<div className="flex items-center justify-between px-4 py-5 border-b border-slate-100">
<div className="flex items-center gap-3">
<div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
<TrendingUp size={16} className="text-white"/>
</div>
<div>
<p className="text-sm font-bold text-slate-900 leading-tight">Investimentos</p>
<p className="text-xs text-brand-600 font-semibold">Pro 2.0</p>
</div>
</div>
<button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded text-slate-400 hover:text-slate-600">
<X size={18}/>
</button>
</div>

{/* Nav */}
<nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
{NAV.map(({ href, label, icon: Icon }) => {
const active = pathname === href || pathname.startsWith(href + '/');
return (
<a key={href} href={href} className={`
flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
${active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
`}>
<Icon size={18} className="flex-shrink-0"/>
<span className="truncate">{label}</span>
{active && <ChevronRight size={14} className="ml-auto opacity-60"/>}
</a>
);
})}
</nav>

{/* Footer sidebar */}
<div className="px-2 pb-4 border-t border-slate-100 pt-3 space-y-1">
<a href="/notificacoes" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
<div className="relative flex-shrink-0">
<Bell size={18}/>
{notifCount > 0 && (
<span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
{notifCount}
</span>
)}
</div>
<span>Notificacoes</span>
</a>
<div className="px-3 py-2 bg-slate-50 rounded-lg">
<div className="flex items-center gap-2">
<div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center">
<User size={14} className="text-brand-700"/>
</div>
<div className="flex-1 min-w-0">
<p className="text-xs font-medium text-slate-900 truncate">{user?.nome}</p>
<p className="text-xs text-slate-500 truncate">{user?.email}</p>
</div>
</div>
</div>
<button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors">
<LogOut size={18} className="flex-shrink-0"/>
<span>Sair</span>
</button>
</div>
</aside>

{/* Main */}
<div className="flex-1 flex flex-col min-w-0 overflow-hidden">
{/* Topbar */}
<header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
<button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
<Menu size={20}/>
</button>
<button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden lg:block p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
<Menu size={18}/>
</button>
<div className="flex-1">
<h1 className="text-sm font-semibold text-slate-900">
{NAV.find(n => pathname.startsWith(n.href))?.label || 'Investimentos Pro 2.0'}
</h1>
</div>
<a href="/notificacoes" className="relative p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
<Bell size={18}/>
{notifCount > 0 && (
<span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
{notifCount}
</span>
)}
</a>
</header>

{/* Content - com padding bottom no mobile para a bottom nav */}
<main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
{children}
</main>
</div>

{/* Bottom Navigation - apenas mobile */}
<nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 flex">
{NAV.slice(0, 5).map(({ href, label, icon: Icon }) => {
const active = pathname === href || pathname.startsWith(href + '/');
return (
<a key={href} href={href} className={`
flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors
${active ? 'text-brand-600' : 'text-slate-400'}
`}>
<Icon size={20}/>
<span className="text-[10px]">{label.split(' ')[0]}</span>
</a>
);
})}
<button onClick={logout} className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium text-slate-400">
<LogOut size={20}/>
<span className="text-[10px]">Sair</span>
</button>
</nav>

</div>
)}
</AuthContext.Provider>
</body>
</html>
);
}