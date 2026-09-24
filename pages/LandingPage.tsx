
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Sparkles, ArrowRight, Trophy, Palette, 
    Monitor, Users, Lock, User, 
    Sun, Moon, Laptop, Eye, EyeOff, LogOut, AlertCircle,
    Layers, Calendar, TreePine, Leaf, CheckCircle2, Star, BookOpen, MapPin, LayoutDashboard, Home, Activity
} from 'lucide-react';
import { useFirebase } from '../hooks/useFirebase';
import { Settings } from '../types';
import { TABS } from '../constants';

// Added missing LandingPageProps interface
interface LandingPageProps {
    theme: 'light' | 'dark' | 'system';
    toggleTheme: (theme: 'light' | 'dark' | 'system') => void;
    settings: Settings;
}

const LandingStatCard: React.FC<{ icon: React.ElementType, title: string, value: string | number, colorClass: string }> = ({ icon: Icon, title, value, colorClass }) => (
    <div className="relative group p-8 rounded-[3.5rem] bg-white/70 dark:bg-white/5 border border-[#C21D2E]/10 dark:border-white/5 backdrop-blur-xl shadow-xl transition-all duration-500 hover:-translate-y-1 overflow-hidden">
        <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-[80px] pointer-events-none opacity-20 dark:opacity-40 transition-colors duration-500 ${colorClass}`}></div>
        <div className="relative z-10">
            <div className={`w-14 h-14 bg-[#C21D2E] dark:bg-[#F9B344] text-white dark:text-[#C21D2E] rounded-2xl flex items-center justify-center mb-8 shadow-lg transition-transform group-hover:scale-110`}>
                <Icon size={28} />
            </div>
            <h3 className="text-5xl font-black text-[#C21D2E] dark:text-white mb-1 uppercase tracking-tighter tabular-nums">{value}</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#12A89D] dark:text-[#F9B344] opacity-60">Total {title}</p>
        </div>
    </div>
);

const LandingPage: React.FC<LandingPageProps> = ({ theme, toggleTheme, settings }) => {
    const { login, logout, firebaseUser, currentUser, state } = useFirebase();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const isUnassigned = firebaseUser && !currentUser;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(username, password, true);
        } catch (err: any) {
            setError('Authorization failed. Check handle and access key.');
        } finally {
            setLoading(false);
        }
    };

    const navigateTo = (tab: string) => {
        window.location.hash = encodeURIComponent(tab);
    };

    const getThemeIcon = () => {
        if (theme === 'light') return <Sun size={18} />;
        if (theme === 'dark') return <Moon size={18} />;
        return <Laptop size={18} />;
    };

    const cycleTheme = () => {
        if (theme === 'light') toggleTheme('dark');
        else if (theme === 'dark') toggleTheme('system');
        else toggleTheme('light');
    };

    const homeConfig = settings.homePage || {};
    const badgeText = homeConfig.badgeText !== undefined ? homeConfig.badgeText : 'The Rooted Tree';
    const editionText = homeConfig.editionText !== undefined ? homeConfig.editionText : '2026 EDITION';
    const heroTitle = homeConfig.heroTitle || settings.branding?.eventName || 'AMAZIO';
    const heroQuote = homeConfig.heroQuote !== undefined ? homeConfig.heroQuote : '"Where Art Meets Orchestration"';
    const heroDescription = homeConfig.heroDescription !== undefined ? homeConfig.heroDescription : 'Welcome to the official management terminal for the Art Fest. Explore live results, schedules, and the creative studio through our public channels.';
    const portalTitle = homeConfig.portalTitle || 'Operator Access';
    const portalSubtitle = homeConfig.portalSubtitle || 'Secure Core Authentication';
    const showStats = homeConfig.showStats !== false;
    const showLiveDashboardBtn = homeConfig.showLiveDashboardBtn !== false;
    const showLiveProjectorBtn = homeConfig.showLiveProjectorBtn !== false;
    const showCreativeStudioBtn = homeConfig.showCreativeStudioBtn !== false;
    const customHeroBannerUrl = homeConfig.customHeroBannerUrl;

    const logoUrl = useMemo(() => {
        if (customHeroBannerUrl) return customHeroBannerUrl;
        if (!settings.branding) return null;
        const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        const { typographyUrl, typographyUrlLight, typographyUrlDark } = settings.branding;
        if (isDark) return typographyUrlDark || typographyUrl;
        return typographyUrlLight || typographyUrl;
    }, [settings.branding, theme, customHeroBannerUrl]);

    const landingStats = useMemo(() => {
        if (!state) return { participants: 0, declared: 0, items: 0, scheduled: 0 };
        const activeItemIds = new Set(state.items.map(i => i.id));
        return {
            participants: state.participants.length,
            items: state.items.length,
            scheduled: state.schedule.length,
            // Filtering out orphaned results
            declared: state.results.filter(r => r.status === 'Declared' && activeItemIds.has(r.itemId)).length
        };
    }, [state]);

    return (
        <div className="min-h-screen bg-[#F7F3F0] dark:bg-[#09090b] text-[#C21D2E] dark:text-white selection:bg-[#F9B344] selection:text-[#C21D2E] overflow-x-hidden font-slab transition-colors duration-1000">
            
            {/* Consistent Noise Overlay */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-[0.05] dark:opacity-[0.08]">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
            </div>

            {/* Ambient Background Glows */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] bg-[#C21D2E]/10 dark:bg-[#C21D2E]/30 rounded-full blur-[160px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-[#F9B344]/20 dark:bg-[#F9B344]/10 rounded-full blur-[140px] animate-pulse" style={{ animationDelay: '3s' }}></div>
            </div>

            <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-700 ${scrolled ? 'bg-[#F7F3F0]/90 dark:bg-[#09090b]/90 backdrop-blur-2xl border-b border-[#C21D2E]/5 dark:border-white/5 py-4' : 'bg-transparent py-10'}`}>
                <div className="max-w-5xl mx-auto px-6 flex justify-between items-center">
                    <div className="flex items-center gap-4 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        {logoUrl ? (
                            <img src={logoUrl} alt={heroTitle} className="h-10 w-auto object-contain transition-all" />
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-[#C21D2E] flex items-center justify-center font-slab text-xl font-black shadow-2xl text-white transform rotate-3">
                                    {heroTitle.charAt(0) || 'A'}
                                </div>
                                <span className="text-2xl font-black tracking-tighter uppercase hidden sm:block text-[#C21D2E] dark:text-white">{heroTitle}</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={cycleTheme}
                            className="p-3 rounded-full hover:bg-[#C21D2E]/5 dark:hover:bg-white/5 text-[#12A89D] dark:text-zinc-400 transition-all"
                            title={`Current theme: ${theme}. Click to cycle.`}
                        >
                            {getThemeIcon()}
                        </button>
                        {currentUser ? (
                             <button onClick={() => navigateTo(TABS.DASHBOARD)} className="px-8 py-3 bg-[#C21D2E] dark:bg-white text-white dark:text-[#C21D2E] rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-[#C21D2E]/30 flex items-center gap-2">
                                <LayoutDashboard size={14} /> Open Console
                             </button>
                        ) : (
                            <a href="#portal" className="px-8 py-3 bg-[#C21D2E] dark:bg-white text-white dark:text-[#C21D2E] rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-[#C21D2E]/30">
                                {portalTitle}
                            </a>
                        )}
                    </div>
                </div>
            </nav>

            <section className="relative z-10 pt-48 pb-32 px-6">
                <div className="max-w-5xl mx-auto text-center">
                    <div className="inline-flex flex-col items-center animate-in fade-in slide-in-from-bottom-6 duration-700">
                        {badgeText && (
                            <div className="inline-flex items-center gap-3 px-6 py-2 bg-white/40 dark:bg-[#F9B344]/10 backdrop-blur-md rounded-full border border-[#C21D2E]/10 dark:border-[#F9B344]/20 mb-8 shadow-sm">
                                <TreePine size={18} className="text-[#C21D2E] dark:text-[#F9B344]" />
                                <span className="text-[12px] font-black uppercase tracking-with-[0.5em] text-[#C21D2E] dark:text-[#F9B344]">{badgeText}</span>
                            </div>
                        )}
                        
                        <div className="relative mb-8">
                            {logoUrl ? (
                                <img src={logoUrl} 
                                alt={heroTitle} 
                                className="h-auto max-h-48 md:max-h-72 w-auto object-contain filter drop-shadow-2xl hover:scale-[1.02] transition-all duration-700 select-none" 
                                />
                            ) : (
                                <h1 className="text-7xl md:text-[14vh] font-black leading-none tracking-tighter uppercase text-[#C21D2E] dark:text-white drop-shadow-xl select-none">
                                    {heroTitle}
                                </h1>
                            )}
                        </div>

                        {editionText && (
                            <div className="inline-block px-10 py-3 bg-[#F9B344] text-[#C21D2E] rounded-full text-sm font-black uppercase tracking-[0.4em] shadow-lg mb-12">
                                {editionText}
                            </div>
                        )}
                    </div>
                    
                    {(heroQuote || heroDescription) && (
                        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                            {heroQuote && (
                                <p className="text-[#C21D2E] dark:text-[#F9B344] text-2xl md:text-4xl font-bold italic tracking-tight leading-snug">
                                    {heroQuote}
                                </p>
                            )}
                            {heroDescription && (
                                <p className="text-[#12A89D] dark:text-[#F9B344] text-base md:text-lg font-normal max-w-2xl mx-auto leading-relaxed opacity-80 font-sans">
                                    {heroDescription}
                                </p>
                            )}
                        </div>
                    )}

                    {(showLiveDashboardBtn || showLiveProjectorBtn || showCreativeStudioBtn) && (
                        <div className="flex flex-wrap justify-center gap-4 mt-16 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
                            {showLiveDashboardBtn && (
                                <button 
                                    onClick={() => navigateTo(TABS.DASHBOARD)} 
                                    className="px-10 py-6 bg-[#C21D2E] dark:bg-[#F9B344] text-white dark:text-[#C21D2E] rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-xs flex items-center gap-4 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-[#C21D2E]/40 dark:shadow-[#F9B344]/30"
                                >
                                    <LayoutDashboard size={20} /> Live Dashboard
                                </button>
                            )}
                            {showLiveProjectorBtn && (
                                <button 
                                    onClick={() => navigateTo(TABS.PROJECTOR)} 
                                    className="px-10 py-6 bg-indigo-600 text-white rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-xs flex items-center gap-4 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-indigo-600/30"
                                >
                                    <Monitor size={20} /> Live Projector
                                </button>
                            )}
                            {showCreativeStudioBtn && (
                                <button 
                                    onClick={() => navigateTo(TABS.CREATIVE_STUDIO)} 
                                    className="px-10 py-6 bg-white/40 dark:bg-white/5 border-2 border-[#C21D2E]/10 dark:border-[#F9B344]/20 text-[#C21D2E] dark:text-white rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-xs hover:bg-white dark:hover:bg-white/10 transition-all backdrop-blur-xl flex items-center gap-4"
                                >
                                    <Palette size={20} /> Creative Studio
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </section>

            {showStats && (
                <section className="relative z-10 max-w-5xl mx-auto px-6 py-32 border-t border-[#C21D2E]/5 dark:border-white/5">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <LandingStatCard icon={Users} title="Delegates" value={landingStats.participants} colorClass="bg-emerald-500" />
                        <LandingStatCard icon={Trophy} title="Declared" value={landingStats.declared} colorClass="bg-rose-500" />
                        <LandingStatCard icon={BookOpen} title="Events" value={landingStats.items} colorClass="bg-amber-500" />
                        <LandingStatCard icon={Calendar} title="Scheduled" value={landingStats.scheduled} colorClass="bg-indigo-500" />
                    </div>
                </section>
            )}

            <section id="portal" className="relative z-10 max-w-5xl mx-auto px-6 py-48 text-center flex flex-col items-center">
                <div className="max-w-md w-full">
                    <div className="mb-16">
                        <div className="w-16 h-1 bg-[#F9B344] mx-auto mb-6 rounded-full"></div>
                        <h2 className="text-5xl font-black uppercase tracking-tighter mb-4 text-[#C21D2E] dark:text-white">{portalTitle}</h2>
                        <p className="text-[#12A89D] dark:text-[#F9B344] font-bold uppercase tracking-[0.3em] text-[10px]">{portalSubtitle}</p>
                    </div>

                    {isUnassigned ? (
                        <div className="p-12 rounded-[3.5rem] bg-white/80 dark:bg-white/5 border border-[#C21D2E]/10 dark:border-white/10 backdrop-blur-3xl shadow-2xl">
                             <AlertCircle size={56} className="mx-auto mb-8 text-amber-600" />
                             <h3 className="text-2xl font-black mb-4 text-[#C21D2E] dark:text-white uppercase tracking-tight">Access Pending</h3>
                             <p className="text-[#12A89D] dark:text-[#F9B344] text-sm mb-10 leading-relaxed font-medium">
                                Registry entry for <strong className="text-[#C21D2E] dark:text-white">{firebaseUser?.email}</strong> is not yet authorized.
                             </p>
                             <button onClick={logout} className="w-full py-5 bg-[#C21D2E] dark:bg-white text-white dark:text-[#C21D2E] rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl transition-all">
                                <LogOut size={18} className="inline mr-2" /> Log Out
                             </button>
                        </div>
                    ) : currentUser ? (
                        <div className="p-12 rounded-[3.5rem] bg-white/80 dark:bg-white/5 border border-[#C21D2E]/10 dark:border-white/10 backdrop-blur-3xl shadow-2xl">
                             <CheckCircle2 size={56} className="mx-auto mb-8 text-[#00A652]" />
                             <h3 className="text-2xl font-black mb-4 text-[#C21D2E] dark:text-white uppercase tracking-tight">Already Signed In</h3>
                             <p className="text-[#12A89D] dark:text-[#F9B344] text-sm mb-10 leading-relaxed font-medium">
                                Active session detected for <strong className="text-[#C21D2E] dark:text-white">{currentUser.username}</strong>.
                             </p>
                             <div className="flex flex-col gap-3">
                                <button onClick={() => navigateTo(TABS.DASHBOARD)} className="w-full py-5 bg-[#C21D2E] dark:bg-[#F9B344] text-white dark:text-[#C21D2E] rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl transition-all">
                                    Continue to Console
                                </button>
                                <button onClick={logout} className="w-full py-5 text-zinc-400 hover:text-rose-500 font-black uppercase text-[9px] tracking-widest transition-all">
                                    Sign Out & Exit
                                </button>
                             </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="p-12 rounded-[3.5rem] bg-white/80 dark:bg-white/5 border border-[#C21D2E]/10 dark:border-white/10 backdrop-blur-3xl shadow-2xl">
                            <div className="space-y-5">
                                <div className="relative">
                                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-[#12A89D] opacity-50" size={20} />
                                    <input 
                                        type="text" 
                                        placeholder="Operator Handle" 
                                        required 
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        className="w-full pl-14 pr-6 py-5 rounded-[2rem] bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 outline-none transition-all font-bold text-sm text-[#C21D2E] dark:text-white focus:ring-2 focus:ring-[#F9B344]/20 shadow-inner"
                                    />
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-[#12A89D] opacity-50" size={20} />
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        placeholder="Access Key" 
                                        required 
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full pl-14 pr-14 py-5 rounded-[2rem] bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 outline-none transition-all font-bold text-sm text-[#C21D2E] dark:text-white focus:ring-2 focus:ring-[#F9B344]/20 shadow-inner"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-[#C21D2E] dark:hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                                    </button>
                                </div>
                            </div>

                            {error && <div className="mt-6 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest animate-pulse">{error}</div>}

                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full py-6 bg-[#C21D2E] dark:bg-[#F9B344] text-white dark:text-[#C21D2E] rounded-[1.5rem] font-black uppercase tracking-[0.4em] text-[10px] shadow-2xl mt-10 active:scale-95 transition-all shadow-[#C21D2E]/30 dark:shadow-[#F9B344]/20"
                            >
                                {loading ? 'Authorizing...' : 'Enter System'}
                            </button>
                            
                            <p className="mt-8 text-[9px] font-black text-[#12A89D] dark:text-zinc-600 uppercase tracking-[0.5em]">
                                V6.2.0 • CORE OPS
                            </p>
                        </form>
                    )}
                </div>
            </section>

            <footer className="relative z-10 py-20 border-t border-[#C21D2E]/5 dark:border-white/5">
                <div className="max-w-5xl mx-auto px-6 text-center">
                    <p className="text-[#C21D2E] dark:text-white text-lg font-black uppercase tracking-tighter">{heroTitle} {editionText}</p>
                    <p className="text-[#12A89D] dark:text-[#F9B344] text-[10px] font-black uppercase tracking-[0.4em] mt-2">{badgeText ? `${badgeText} • ` : ''}Art Fest Edition</p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
