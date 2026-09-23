
import React, { useState } from 'react';
import { TABS, SIDEBAR_GROUPS, INITIALIZATION_SUB_PAGE_ICONS, TAB_DISPLAY_NAMES, TAB_COLORS, TAB_SEARCH_INDEX } from '../constants';
import { User } from '../types';
import { 
    LogOut, ChevronLeft, ChevronRight, LayoutDashboard, UserPlus, 
    Calendar, Edit3, BarChart2, FileText, Palette, Timer, Settings, 
    Medal, Home, Monitor, Search, Pin, PinOff
} from 'lucide-react';
import { useFirebase } from '../hooks/useFirebase';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isExpanded: boolean;
  isOpen: boolean;
  toggleSidebar: () => void;
  isMobile: boolean;
  handleLogout: () => void;
  currentUser: User;
  hasPermission: (tab: string) => boolean;
}

const iconMap: { [key: string]: React.ElementType } = {
    [TABS.LANDING]: Home,
    [TABS.DASHBOARD]: LayoutDashboard,
    [TABS.PROJECTOR]: Monitor,
    [TABS.GENERAL_SETTINGS]: Settings,
    [TABS.TEAMS_CATEGORIES]: INITIALIZATION_SUB_PAGE_ICONS['Teams & Categories'],
    [TABS.ITEMS]: INITIALIZATION_SUB_PAGE_ICONS['Items'],
    [TABS.GRADE_POINTS]: Medal,
    [TABS.JUDGES_MANAGEMENT]: INITIALIZATION_SUB_PAGE_ICONS['Judges & Assignments'],
    [TABS.DATA_ENTRY]: UserPlus,
    [TABS.SCHEDULE]: Calendar,
    [TABS.SCORING_RESULTS]: Edit3,
    [TABS.POINTS]: BarChart2,
    [TABS.REPORTS]: FileText,
    [TABS.CREATIVE_STUDIO]: Palette,
    [TABS.ITEM_TIMER]: Timer,
};

const getTabTheme = (color: string, isActive: boolean) => {
    const themes: Record<string, any> = {
        emerald: { active: 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20', icon: 'text-emerald-500' },
        sky: { active: 'bg-sky-600 text-white shadow-lg shadow-sky-600/20', icon: 'text-sky-500' },
        purple: { active: 'bg-purple-600 text-white shadow-lg shadow-purple-600/20', icon: 'text-purple-500' },
        orange: { active: 'bg-orange-600 text-white shadow-lg shadow-orange-600/20', icon: 'text-orange-500' },
        rose: { active: 'bg-rose-600 text-white shadow-lg shadow-rose-600/20', icon: 'text-rose-500' },
        amber: { active: 'bg-amber-500 text-white shadow-lg shadow-amber-500/20', icon: 'text-amber-500' },
        indigo: { active: 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20', icon: 'text-indigo-500' },
        yellow: { active: 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20', icon: 'text-yellow-500' },
        cyan: { active: 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20', icon: 'text-cyan-500' },
        pink: { active: 'bg-pink-600 text-white shadow-lg shadow-pink-600/20', icon: 'text-pink-500' },
        teal: { active: 'bg-teal-600 text-white shadow-lg shadow-teal-600/20', icon: 'text-teal-500' },
        zinc: { active: 'bg-zinc-700 text-white shadow-lg shadow-zinc-700/20', icon: 'text-zinc-500' },
    };
    
    const t = themes[color] || themes.zinc;
    return isActive ? t.active : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/5';
};

const GROUP_TITLE_COLORS: Record<string, string> = {
    'Core': 'text-sky-500 dark:text-sky-400',
    'Setup & Registry': 'text-emerald-500 dark:text-emerald-400',
    'Live Operations': 'text-amber-500 dark:text-amber-400',
    'Analytics & Media': 'text-rose-500 dark:text-rose-400'
};

const Sidebar: React.FC<SidebarProps> = ({ 
    activeTab, 
    setActiveTab, 
    isExpanded,
    toggleSidebar, 
    isMobile,
    handleLogout, 
    currentUser, 
    hasPermission 
}) => {
  const { state, updateSettings } = useFirebase();
  const [searchTerm, setSearchTerm] = useState('');
  const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();

  const isStickyMode = isMobile && state?.settings.mobileSidebarMode === 'sticky';
  const widthClass = isExpanded ? 'w-72' : 'w-[84px]';
  const isNavCollapsed = !isExpanded || isStickyMode;
  
  const containerClasses = isStickyMode 
    ? `fixed left-0 top-0 h-full z-40 bg-white/95 dark:bg-amazio-bg/95 backdrop-blur-3xl border-r border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col transition-all duration-300 w-[64px]`
    : `${widthClass} fixed md:relative z-[999] h-screen transition-[width] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex flex-col transform-gpu ${isMobile && !isExpanded ? '-translate-x-full' : 'translate-x-0'} md:translate-x-0`;

  const innerContainerClasses = isStickyMode 
    ? `flex flex-col h-full overflow-hidden`
    : `absolute inset-0 m-2 md:m-3 rounded-[2rem] md:rounded-[2.5rem] bg-white/80 dark:bg-amazio-surface/95 md:backdrop-blur-3xl border border-zinc-200/50 dark:border-white/5 shadow-2xl flex flex-col overflow-hidden transition-all duration-500`;

  const toggleMobileSticky = async () => {
    if (!state) return;
    const newMode = state.settings.mobileSidebarMode === 'sticky' ? 'floating' : 'sticky';
    await updateSettings({ mobileSidebarMode: newMode });
  };

  const handleTabClick = (tab: string) => {
    // Rely on handleSetActiveTab in App.tsx to manage sidebar collapse logic for mobile
    setActiveTab(tab);
  };

  return (
    <aside className={containerClasses}>
      <div className={innerContainerClasses}>
        
        {/* Brand Header */}
        <div className={`flex items-center transition-all duration-500 ${isExpanded && !isStickyMode ? 'px-6 py-5' : 'justify-center py-4'}`}>
            <div 
                onClick={() => setActiveTab(TABS.LANDING)}
                className="relative flex items-center justify-center cursor-pointer group"
            >
                <div className={`bg-gradient-to-br from-[#C21D2E] to-[#12A89D] dark:from-emerald-500 dark:to-teal-800 rounded-2xl flex items-center justify-center font-serif font-black text-white shadow-xl group-hover:rotate-12 transition-all duration-500 ${isNavCollapsed ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-xl'}`}>
                    A
                </div>
                {isExpanded && !isStickyMode && (
                    <div className="ml-3 animate-in fade-in slide-in-from-left-4 duration-500">
                        <h1 className="text-base font-black font-serif tracking-tight text-amazio-primary dark:text-zinc-100 leading-none">
                            AMAZIO <span className="text-amazio-accent">OS.</span>
                        </h1>
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500 mt-1">Terminal 6.5</p>
                    </div>
                )}
            </div>
        </div>

        {/* Global Search Interface */}
        {isExpanded && !isStickyMode && (
            <div className="px-5 mb-4">
                <div className="relative group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-amazio-accent transition-colors" />
                    <input 
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search system..."
                        className="w-full pl-10 pr-3 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 focus:border-amazio-accent/30 rounded-2xl text-sm font-bold outline-none transition-all placeholder:text-zinc-500 dark:text-zinc-200"
                    />
                </div>
            </div>
        )}

        {/* Navigation Core */}
        <nav className={`flex-1 overflow-y-auto no-scrollbar scroll-smooth ${isExpanded && !isStickyMode ? 'px-4 py-2 space-y-3' : 'px-2 py-1 space-y-1'}`}>
             {SIDEBAR_GROUPS.map((group) => {
                const visibleTabs = group.tabs.filter(tab => {
                    if (!hasPermission(tab)) return false;
                    if (!lowerCaseSearchTerm) return true;
                    const display = (TAB_DISPLAY_NAMES[tab] || tab).toLowerCase();
                    const keywords = TAB_SEARCH_INDEX[tab] || [];
                    return display.includes(lowerCaseSearchTerm) || keywords.some(k => k.toLowerCase().includes(lowerCaseSearchTerm));
                });

                if (visibleTabs.length === 0) return null;

                const groupColorClass = GROUP_TITLE_COLORS[group.title] || 'text-zinc-500';

                return (
                    <div key={group.title} className={`${isNavCollapsed ? 'mb-2' : 'mb-4'} space-y-0`}>
                        {isExpanded && !isStickyMode && (
                            <h3 className={`px-4 text-[10px] font-black uppercase tracking-[0.2em] mb-1.5 mt-2 ${groupColorClass}`}>
                                {group.title}
                            </h3>
                        )}
                        <div className={`space-y-1 ${isNavCollapsed ? 'flex flex-col items-center' : ''}`}>
                            {visibleTabs.map(tab => {
                                const Icon = iconMap[tab] || Settings;
                                const isActive = activeTab === tab;
                                const colorKey = TAB_COLORS[tab] || 'zinc';
                                const displayName = TAB_DISPLAY_NAMES[tab] || tab;
                                const themeClass = getTabTheme(colorKey, isActive);

                                return (
                                    <button
                                        key={tab}
                                        onClick={() => handleTabClick(tab)}
                                        className={`
                                            group relative flex items-center w-full rounded-2xl transition-all duration-300
                                            ${themeClass}
                                            ${isExpanded && !isStickyMode ? 'px-4 py-3' : 'justify-center py-2.5'}
                                        `}
                                    >
                                        <div className={`
                                            transition-all duration-300 flex-shrink-0
                                            ${isActive ? 'scale-110' : 'group-hover:scale-110'}
                                            ${isExpanded && !isStickyMode ? 'mr-3.5' : 'mr-0'}
                                        `}>
                                            <Icon 
                                                className={`${isNavCollapsed ? 'h-[18px] w-[18px]' : 'h-4 w-4'}`}
                                                strokeWidth={isActive ? 3 : 2.5}
                                            />
                                        </div>
                                        
                                        {isExpanded && !isStickyMode && (
                                            <span className={`
                                                whitespace-nowrap overflow-hidden transition-all duration-300 text-sm tracking-tight
                                                ${isActive ? 'font-black' : 'font-bold'}
                                            `}>
                                                {displayName}
                                            </span>
                                        )}

                                        {isNavCollapsed && !isMobile && (
                                            <div className="absolute left-full ml-4 px-3 py-1.5 bg-zinc-900 text-white text-[10px] font-black uppercase rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-[1000] shadow-2xl">
                                                {displayName}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
             })}
        </nav>

        {/* User Identity Section */}
        <div className={`mt-auto transition-all duration-500 ${isExpanded && !isStickyMode ? 'p-4 mb-2' : 'p-2 mb-4'}`}>
            <div className={`
                relative flex items-center bg-zinc-50 dark:bg-black/20 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 overflow-hidden transition-all duration-500
                ${isExpanded && !isStickyMode ? 'p-3' : 'p-1.5 flex-col justify-center gap-2'}
            `}>
                <div className={`
                    shrink-0 rounded-full bg-gradient-to-tr from-[#C21D2E] to-amazio-accent p-[1.5px] transition-all duration-500
                    ${isExpanded && !isStickyMode ? 'w-10 h-10' : 'w-8 h-8'}
                `}>
                    <div className="w-full h-full rounded-full bg-white dark:bg-[#0F1210] flex items-center justify-center font-black text-xs text-amazio-primary dark:text-amazio-accent uppercase">
                        {currentUser.username.substring(0, 2)}
                    </div>
                </div>

                {isExpanded && !isStickyMode && (
                    <div className="ml-3 min-w-0 flex-grow animate-in fade-in duration-500">
                        <p className="text-sm font-black text-amazio-primary dark:text-zinc-100 truncate uppercase tracking-tight leading-none">{currentUser.username}</p>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1.5">{currentUser.role.replace('_', ' ')}</p>
                    </div>
                )}

                <div className={`flex items-center gap-1 ${isNavCollapsed ? 'flex-col' : ''}`}>
                    {!isMobile && (
                        <button 
                            onClick={toggleSidebar}
                            className="p-2 rounded-xl text-zinc-500 hover:text-amazio-primary dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 transition-all"
                            title={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
                        >
                            {isExpanded ? <ChevronLeft size={18}/> : <ChevronRight size={18}/>}
                        </button>
                    )}

                    {(isExpanded && !isStickyMode) || isStickyMode ? (
                        <>
                             {isMobile && (
                                <button 
                                    onClick={toggleMobileSticky}
                                    className="p-2 rounded-xl text-zinc-500 hover:text-amazio-accent hover:bg-amazio-accent/10 transition-all"
                                    title={isStickyMode ? "Floating Mode" : "Pin to Rail"}
                                >
                                    {isStickyMode ? <PinOff size={18} /> : <Pin size={18} />}
                                </button>
                            )}
                            <button 
                                onClick={handleLogout}
                                className="p-2 rounded-xl text-zinc-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
                                title="Sign Out"
                            >
                                <LogOut size={18} />
                            </button>
                        </>
                    ) : null}
                </div>
            </div>
        </div>
      </div>
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </aside>
  );
};

export default Sidebar;
