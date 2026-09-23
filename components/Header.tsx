
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Menu, LogOut, ChevronDown, Sun, Moon, Laptop, Search, X, ArrowLeft, Milestone, Gavel, Palette, BookText, Database, ShieldCheck, User as UserIcon, ClipboardList, LayoutList, Users, Hash, Medal, Info, Wifi, WifiOff, Cloud, Home, Layers } from 'lucide-react';
import { User, UserRole } from '../types';
import { useFirebase } from '../hooks/useFirebase';
import { PAGES_WITH_GLOBAL_FILTERS, TABS, TAB_DISPLAY_NAMES } from '../constants';
import UniversalFilter from './UniversalFilter';

interface HeaderProps {
    pageTitle: string;
    onMenuClick: () => void;
    handleLogout: () => void;
    currentUser: User | null;
    theme: 'light' | 'dark' | 'system';
    toggleTheme: (theme: 'light' | 'dark' | 'system') => void;
    isVisible?: boolean; 
    onTitleClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ pageTitle, onMenuClick, handleLogout, currentUser, theme, toggleTheme, isVisible = true, onTitleClick }) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [isSubNavOpen, setIsSubNavOpen] = useState(false);
    
    const profileRef = useRef<HTMLDivElement>(null);
    const themeRef = useRef<HTMLDivElement>(null);
    const subNavRef = useRef<HTMLDivElement>(null);
    const mobileSearchInputRef = useRef<HTMLInputElement>(null);
    
    const { 
        state, isOnline, setGlobalFilters, globalSearchTerm, setGlobalSearchTerm, 
        dataEntryView, setDataEntryView,
        itemsSubView, setItemsSubView,
        teamsSubView, setTeamsSubView,
        gradeSubView, setGradeSubView,
        judgesSubView, setJudgesSubView,
        settingsSubView, setSettingsSubView
    } = useFirebase();
    
    const showGlobalFilters = PAGES_WITH_GLOBAL_FILTERS.includes(pageTitle) || pageTitle === TABS.SCHEDULE;
    const displayTitle = TAB_DISPLAY_NAMES[pageTitle] || pageTitle;

    const isSearchablePage = [
        TABS.ITEMS, TABS.DATA_ENTRY, TABS.SCHEDULE, 
        TABS.SCORING_RESULTS, TABS.POINTS, TABS.GRADE_POINTS,
        TABS.ITEM_TIMER, TABS.JUDGES_MANAGEMENT
    ].includes(pageTitle);

    const hasSubNavigation = [
        TABS.DATA_ENTRY, TABS.ITEMS, TABS.TEAMS_CATEGORIES, TABS.GRADE_POINTS, TABS.JUDGES_MANAGEMENT, TABS.GENERAL_SETTINGS
    ].includes(pageTitle);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) setIsProfileOpen(false);
            if (themeRef.current && !themeRef.current.contains(event.target as Node)) setIsThemeMenuOpen(false);
            if (subNavRef.current && !subNavRef.current.contains(event.target as Node)) setIsSubNavOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getThemeIcon = () => {
        if (theme === 'light') return <Sun className="h-4 w-4" />;
        if (theme === 'dark') return <Moon className="h-4 w-4" />;
        return <Laptop className="h-4 w-4" />;
    };

    const cycleTheme = () => {
        if (theme === 'light') toggleTheme('dark');
        else if (theme === 'dark') toggleTheme('system');
        else toggleTheme('light');
    };

    const subNavOptions = useMemo(() => {
        switch(pageTitle) {
            case TABS.DATA_ENTRY:
                return [
                    { id: 'ITEMS', label: 'By Items', icon: ClipboardList, active: dataEntryView === 'ITEMS', onClick: () => setDataEntryView('ITEMS') },
                    { id: 'PARTICIPANTS', label: 'By Participants', icon: Users, active: dataEntryView === 'PARTICIPANTS', onClick: () => setDataEntryView('PARTICIPANTS') }
                ];
            case TABS.ITEMS:
                return [
                    { id: 'ITEMS', label: 'Item Registry', icon: LayoutList, active: itemsSubView === 'ITEMS', onClick: () => setItemsSubView('ITEMS') },
                    { id: 'PARTICIPANTS', label: 'Participants Registry', icon: Users, active: itemsSubView === 'PARTICIPANTS', onClick: () => setItemsSubView('PARTICIPANTS') }
                ];
            case TABS.TEAMS_CATEGORIES:
                return [
                    { id: 'TEAMS', label: 'Teams', icon: Users, active: teamsSubView === 'TEAMS', onClick: () => setTeamsSubView('TEAMS') },
                    { id: 'CATEGORIES', label: 'Categories', icon: Layers, active: teamsSubView === 'CATEGORIES', onClick: () => setTeamsSubView('CATEGORIES') }
                ];
            case TABS.GRADE_POINTS:
                return [
                    { id: 'CODES', label: 'Registry & Lots', icon: Hash, active: gradeSubView === 'CODES', onClick: () => setGradeSubView('CODES') },
                    { id: 'GRADES', label: 'Points Rules', icon: Medal, active: gradeSubView === 'GRADES', onClick: () => setGradeSubView('GRADES') }
                ];
            case TABS.JUDGES_MANAGEMENT:
                return [
                    { id: 'ASSIGNMENTS', label: 'Assignments', icon: ShieldCheck, active: judgesSubView === 'ASSIGNMENTS', onClick: () => setJudgesSubView('ASSIGNMENTS') },
                    { id: 'REGISTRY', label: 'Judge Registry', icon: UserIcon, active: judgesSubView === 'REGISTRY', onClick: () => setJudgesSubView('REGISTRY') }
                ];
            case TABS.GENERAL_SETTINGS:
                return [
                    { id: 'details', label: 'Event Details', icon: Info, active: settingsSubView === 'details', onClick: () => setSettingsSubView('details') },
                    { id: 'display', label: 'Display & Layout', icon: Palette, active: settingsSubView === 'display', onClick: () => setSettingsSubView('display') },
                    { id: 'users', label: 'Users & Access', icon: Users, active: settingsSubView === 'users', onClick: () => setSettingsSubView('users') },
                    { id: 'instructions', label: 'Instructions', icon: BookText, active: settingsSubView === 'instructions', onClick: () => setSettingsSubView('instructions') },
                    { id: 'data', label: 'Continuity', icon: Database, active: settingsSubView === 'data', onClick: () => setSettingsSubView('data') }
                ];
            default: return [];
        }
    }, [pageTitle, dataEntryView, itemsSubView, teamsSubView, gradeSubView, judgesSubView, settingsSubView]);

    return (
        <header className={`fixed md:relative top-0 left-0 right-0 z-40 w-full transition-all duration-300 ease-in-out transform-gpu bg-amazio-light-bg dark:bg-amazio-bg md:bg-transparent pt-[env(safe-area-inset-top)] ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 md:translate-y-0 md:opacity-100'}`}>
            <div className="md:bg-amazio-light-bg/90 md:dark:bg-amazio-bg/90 md:backdrop-blur-xl px-4 flex items-center justify-between gap-2 h-14 md:h-16 relative z-50">
                
                {isMobileSearchOpen && isSearchablePage ? (
                    <div className="flex items-center w-full gap-2 animate-in slide-in-from-right-4 duration-300 py-1">
                        <button onClick={() => { setIsMobileSearchOpen(false); setGlobalSearchTerm(''); }} className="p-2 rounded-xl text-zinc-500"><ArrowLeft size={20} /></button>
                        <div className="relative flex-grow flex items-center bg-zinc-100 dark:bg-white/5 rounded-2xl border border-indigo-500/30">
                            <Search className="absolute left-3 text-indigo-500" size={16} />
                            <input ref={mobileSearchInputRef} type="text" placeholder={`Search...`} value={globalSearchTerm} onChange={(e) => setGlobalSearchTerm(e.target.value)} className="w-full bg-transparent pl-10 pr-10 py-2 text-sm font-bold text-amazio-primary dark:text-zinc-100 outline-none" />
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-3 min-w-0">
                            {currentUser ? (
                                <button onClick={onMenuClick} className="lg:hidden p-1 rounded-lg text-zinc-800 dark:text-zinc-400 flex-shrink-0"><Menu className="h-5 w-5" /></button>
                            ) : (
                                <button 
                                    onClick={onTitleClick} 
                                    className="p-2 rounded-xl bg-[#C21D2E]/5 dark:bg-white/5 text-[#C21D2E] dark:text-white transition-all hover:scale-105 active:scale-95 flex items-center gap-2 border border-[#C21D2E]/10"
                                    title="Return to Landing Page"
                                >
                                    <ArrowLeft size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-widest hidden xs:inline">Exit</span>
                                </button>
                            )}
                            <h1 onClick={onTitleClick} className="text-sm md:text-lg font-black font-serif text-amazio-primary dark:text-white tracking-tight truncate cursor-pointer hover:opacity-80 transition-opacity">{displayTitle}</h1>
                            
                            <div className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ml-2 border ${isOnline ? 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900' : 'text-rose-600 bg-rose-50 border-rose-100 dark:bg-rose-950/30 dark:border-rose-900'}`}>
                                {isOnline ? <Wifi size={10}/> : <WifiOff size={10}/>}
                                <span className="hidden xs:inline">{isOnline ? 'Synced' : 'Offline'}</span>
                            </div>
                        </div>

                        {hasSubNavigation && (
                            <div className="hidden lg:flex items-center gap-1 mx-4 p-1 bg-zinc-100 dark:bg-black/20 rounded-2xl border border-amazio-primary/5 dark:border-white/5 shadow-inner">
                                {subNavOptions.map(opt => (
                                    <button 
                                        key={opt.id} 
                                        onClick={opt.onClick}
                                        className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${opt.active ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-amazio-primary/5' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                                    >
                                        <opt.icon size={14} /> {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex-grow"></div>

                        <div className="flex items-center gap-1 md:gap-3 flex-shrink-0">
                            {isSearchablePage && (
                                <div className="hidden md:flex items-center mx-2 max-w-xs animate-in fade-in duration-500">
                                    <div className="relative w-full group">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                                        <input 
                                            type="text" 
                                            placeholder="Search..." 
                                            value={globalSearchTerm}
                                            onChange={(e) => setGlobalSearchTerm(e.target.value)}
                                            className="w-full bg-white/50 dark:bg-black/20 border border-amazio-primary/10 dark:border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs font-bold text-amazio-primary dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/30 transition-all shadow-inner"
                                        />
                                    </div>
                                </div>
                            )}

                            {hasSubNavigation && (
                                <div className="relative lg:hidden" ref={subNavRef}>
                                    <button onClick={() => setIsSubNavOpen(!isSubNavOpen)} className={`p-2 rounded-xl transition-all flex items-center gap-2 border ${isSubNavOpen ? 'bg-indigo-600 text-white border-indigo-700' : 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200'}`}>
                                        <Milestone size={18} strokeWidth={2.5} />
                                        <ChevronDown size={12} className={`transition-transform duration-300 ${isSubNavOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isSubNavOpen && (
                                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#151816] border border-amazio-primary/10 dark:border-white/10 rounded-2xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 origin-top-right">
                                            {subNavOptions.map(opt => (
                                                <button key={opt.id} onClick={() => { opt.onClick(); setIsSubNavOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2.5 text-xs ${opt.active ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 font-bold' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5'}`}>
                                                    <div className="flex items-center gap-3"><opt.icon size={16} /><span>{opt.label}</span></div>
                                                    {opt.active && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {isSearchablePage && (
                                <button onClick={() => setIsMobileSearchOpen(true)} className="md:hidden p-2 rounded-xl text-zinc-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"><Search size={18} /></button>
                            )}

                            {showGlobalFilters && <UniversalFilter pageTitle={pageTitle} />}

                            <div className="relative" ref={themeRef}>
                                <button 
                                    onClick={cycleTheme}
                                    onContextMenu={(e) => { e.preventDefault(); setIsThemeMenuOpen(!isThemeMenuOpen); }}
                                    /**
                                     * Fixed unintentional comparison between 'system' and classes string.
                                     */
                                    className={`p-2 rounded-xl transition-all ${theme === 'light' ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/10' : theme === 'dark' ? 'text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10' : 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/10'}`}
                                    title={`Current Theme: ${theme}. Click to cycle.`}
                                >
                                    {getThemeIcon()}
                                </button>
                                {isThemeMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-[#151816] border border-amazio-primary/10 dark:border-white/10 rounded-xl shadow-xl py-1 z-50">
                                        <button onClick={() => { toggleTheme('light'); setIsThemeMenuOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs ${theme === 'light' ? 'text-amber-600 font-bold' : 'text-zinc-600 dark:text-zinc-400'}`}><Sun size={14} /> Light</button>
                                        <button onClick={() => { toggleTheme('dark'); setIsThemeMenuOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs ${theme === 'dark' ? 'text-emerald-400 font-bold' : 'text-zinc-600 dark:text-zinc-400'}`}><Moon size={14} /> Dark</button>
                                        <button onClick={() => { toggleTheme('system'); setIsThemeMenuOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs ${theme === 'system' ? 'text-indigo-500 font-bold' : 'text-zinc-600 dark:text-zinc-400'}`}><Laptop size={14} /> System</button>
                                    </div>
                                )}
                            </div>

                            {currentUser && (
                                <div className="relative" ref={profileRef}>
                                    <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-1.5 pl-0.5 pr-1 py-0.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 p-[1px]"><div className="w-full h-full rounded-full bg-white dark:bg-black flex items-center justify-center"><span className="font-bold text-[10px] text-emerald-600 uppercase">{currentUser?.username.substring(0,2)}</span></div></div>
                                        <ChevronDown size={12} className={`text-zinc-500 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isProfileOpen && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#151816] border border-amazio-primary/10 dark:border-white/10 rounded-xl shadow-xl py-1 z-50">
                                            <div className="px-3 py-2 border-b border-amazio-primary/5 dark:border-white/5">
                                                <p className="text-xs font-bold text-amazio-primary dark:text-white truncate">{currentUser?.username}</p>
                                                <p className="text-[10px] text-zinc-500 uppercase">{currentUser?.role}</p>
                                            </div>
                                            <button onClick={() => onTitleClick?.()} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-white/5"><Home size={14} /> Back to Home</button>
                                            <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50"><LogOut size={14} /> Sign Out</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </header>
    );
};

export default Header;
