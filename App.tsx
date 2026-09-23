
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TABS, SIDEBAR_GROUPS } from './constants';
import { useFirebase } from './hooks/useFirebase';
import { User, UserRole } from './types';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DataEntryPage from './pages/DataEntry';
import SchedulePage from './pages/Schedule';
import JudgementPage from './pages/JudgementPage';
import PointsPage from './pages/Points';
import ReportsPage from './pages/Reports';
import DashboardPage from './pages/Dashboard';
import CreativeStudio from './pages/CreativeStudio'; 
import ItemTimerPage from './pages/ItemTimer';
import ProjectorView from './pages/ProjectorView'; 
import LandingPage from './pages/LandingPage';
import InstructionDisplay from './components/InstructionDisplay';
import FloatingNavRail from './components/FloatingNavRail';
import GlobalFontManager from './components/GlobalFontManager';

import GeneralSettings from './pages/initialization/GeneralSettings';
import TeamsAndCategories from './pages/initialization/TeamsAndCategories';
import ItemsManagement from './pages/initialization/ItemsManagement';
import GradePoints from './pages/initialization/GradePoints';
import JudgesManagement from './pages/initialization/JudgesManagement';

type Theme = 'light' | 'dark' | 'system';

const App: React.FC = () => {
  const { 
    state, currentUser, loading, logout, hasPermission,
    dataEntryView, setDataEntryView,
    itemsSubView, setItemsSubView,
    teamsSubView, setTeamsSubView,
    gradeSubView, setGradeSubView,
    judgesSubView, setJudgesSubView,
    settingsSubView, setSettingsSubView,
    setGlobalFilters, setGlobalSearchTerm
  } = useFirebase();

  const [activeTab, setActiveTab] = useState<string>(() => {
    const hash = decodeURIComponent(window.location.hash.substring(1));
    return hash && Object.values(TABS).includes(hash) ? hash : TABS.LANDING;
  });

  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const mainContentRef = useRef<HTMLElement>(null);
  const lastWidth = useRef(window.innerWidth);

  const isProjectorMode = activeTab === TABS.PROJECTOR;

  useEffect(() => {
    setGlobalFilters({
        teamId: currentUser?.role === UserRole.TEAM_LEADER && currentUser?.teamId ? [currentUser.teamId] : [],
        categoryId: [],
        performanceType: [],
        itemType: [],
        itemId: [],
        status: [],
        date: [],
        stage: [],
        assignmentStatus: []
    });
    setGlobalSearchTerm('');

    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
      setIsHeaderVisible(true);
    }
  }, [activeTab, currentUser, setGlobalFilters, setGlobalSearchTerm]);

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('theme') as Theme;
        return stored || 'system'; 
    }
    return 'system';
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      document.documentElement.classList.remove('preload');
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');

    const applyTheme = (t: Theme) => {
        let effectiveTheme = t;
        if (t === 'system') {
            effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        
        root.classList.remove('light', 'dark');
        root.classList.add(effectiveTheme);

        if (metaThemeColor) {
            const hexColor = effectiveTheme === 'dark' ? '#0F1210' : '#F7F3F0';
            metaThemeColor.setAttribute('content', hexColor);
        }
    };

    applyTheme(theme);
    localStorage.setItem('theme', theme);

    if (theme === 'system') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => applyTheme('system');
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme]);

  const toggleTheme = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const mobile = width < 768;
      
      if (width === lastWidth.current) return;
      lastWidth.current = width;

      setIsMobile(mobile);
      
      if (width >= 1024) {
          if (!isSidebarExpanded) setIsSidebarExpanded(true);
      } else if (mobile) {
          if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
              return;
          }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarExpanded]);

  useEffect(() => {
    if (currentUser && activeTab !== TABS.LANDING && !hasPermission(activeTab)) {
      setActiveTab(TABS.DASHBOARD);
    }
  }, [currentUser, activeTab, hasPermission]);
  
  useEffect(() => {
    const handleHashChange = () => {
      const hash = decodeURIComponent(window.location.hash.substring(1));
      if (hash && Object.values(TABS).includes(hash)) {
        if (hasPermission(hash)) {
            setActiveTab(hash);
        } else if (currentUser) {
            setActiveTab(TABS.DASHBOARD);
        } else {
            setActiveTab(TABS.LANDING);
        }
      } else {
        setActiveTab(TABS.LANDING);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [hasPermission, currentUser]);

  const handleSetActiveTab = (tab: string) => {
    if (hasPermission(tab)) {
      setActiveTab(tab);
      window.location.hash = encodeURIComponent(tab);
      // Auto-hide sidebar on mobile after clicking a tab
      if (isMobile) {
        setIsSidebarExpanded(false);
      }
    }
  };

  const navigateSubView = useCallback((direction: 'next' | 'prev') => {
    const delta = direction === 'next' ? 1 : -1;
    switch(activeTab) {
      case TABS.DATA_ENTRY: {
        const views: ('ITEMS' | 'PARTICIPANTS')[] = ['ITEMS', 'PARTICIPANTS'];
        const idx = views.indexOf(dataEntryView);
        const nextIdx = (idx + delta + views.length) % views.length;
        setDataEntryView(views[nextIdx]);
        break;
      }
      case TABS.ITEMS: {
        const views: ('ITEMS' | 'PARTICIPANTS')[] = ['ITEMS', 'PARTICIPANTS'];
        const idx = views.indexOf(itemsSubView);
        const nextIdx = (idx + delta + views.length) % views.length;
        setItemsSubView(views[nextIdx]);
        break;
      }
      case TABS.TEAMS_CATEGORIES: {
        const views: ('TEAMS' | 'CATEGORIES')[] = ['TEAMS', 'CATEGORIES'];
        const idx = views.indexOf(teamsSubView);
        const nextIdx = (idx + delta + views.length) % views.length;
        setTeamsSubView(views[nextIdx]);
        break;
      }
      case TABS.GRADE_POINTS: {
        const views: ('CODES' | 'GRADES')[] = ['CODES', 'GRADES'];
        const idx = views.indexOf(gradeSubView);
        const nextIdx = (idx + delta + views.length) % views.length;
        setGradeSubView(views[nextIdx]);
        break;
      }
      case TABS.JUDGES_MANAGEMENT: {
        const views: ('ASSIGNMENTS' | 'REGISTRY' | 'OVERVIEW')[] = ['ASSIGNMENTS', 'REGISTRY', 'OVERVIEW'];
        const idx = views.indexOf(judgesSubView);
        const nextIdx = (idx + delta + views.length) % views.length;
        setJudgesSubView(views[nextIdx]);
        break;
      }
      case TABS.GENERAL_SETTINGS: {
        const views = ['details', 'display', 'users', 'instructions', 'data'];
        const idx = views.indexOf(settingsSubView);
        const nextIdx = (idx + delta + views.length) % views.length;
        setSettingsSubView(views[nextIdx]);
        break;
      }
    }
  }, [activeTab, dataEntryView, itemsSubView, teamsSubView, gradeSubView, judgesSubView, settingsSubView, setDataEntryView, setItemsSubView, setTeamsSubView, setGradeSubView, setJudgesSubView, setSettingsSubView]);

  const navigateMainTab = useCallback((direction: 'next' | 'prev') => {
    const flatTabs = SIDEBAR_GROUPS.flatMap(g => g.tabs).filter(t => hasPermission(t));
    const idx = flatTabs.indexOf(activeTab);
    if (idx === -1) return; 
    const delta = direction === 'next' ? 1 : -1;
    const nextIdx = (idx + delta + flatTabs.length) % flatTabs.length;
    handleSetActiveTab(flatTabs[nextIdx]);
  }, [activeTab, hasPermission, handleSetActiveTab]);

  useEffect(() => {
    if (!isMobile) return;
    let startX = 0; let startY = 0; let fingerCount = 0;
    const handleTouchStart = (e: TouchEvent) => {
      fingerCount = e.touches.length;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      if (Math.abs(deltaY) > Math.abs(deltaX) || Math.abs(deltaX) < 50) return;
      if (fingerCount === 1) {
        if (!isSidebarExpanded && deltaX > 70) setIsSidebarExpanded(true);
        else if (isSidebarExpanded && deltaX < -70) setIsSidebarExpanded(false);
      } 
      else if (fingerCount === 2) {
        if (deltaX < -70) navigateSubView('next');
        else if (deltaX > 70) navigateSubView('prev');
      }
      else if (fingerCount === 3) {
        if (deltaX < -70) navigateMainTab('next');
        else if (deltaX > 70) navigateMainTab('prev');
      }
    };
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, isSidebarExpanded, navigateSubView, navigateMainTab]);

  const toggleSidebarExpansion = () => setIsSidebarExpanded(prev => !prev);
  const handleBackdropClick = () => {
      if (document.activeElement?.tagName === 'INPUT') return;
      setIsSidebarExpanded(false);
  };

  const handleMainScroll = (e: React.UIEvent<HTMLElement>) => {
    if (!isMobile) return;
    const currentScrollY = e.currentTarget.scrollTop;
    const deltaY = currentScrollY - lastScrollY.current;
    if (currentScrollY > 60) {
        if (deltaY > 10) { if (isHeaderVisible) setIsHeaderVisible(false); }
        else if (deltaY < -10) { if (!isHeaderVisible) setIsHeaderVisible(true); }
    } else { if (!isHeaderVisible) setIsHeaderVisible(true); }
    lastScrollY.current = currentScrollY;
  };

  const handleContentClick = (e: React.MouseEvent) => {
    if (!isMobile) return;
    const target = e.target as HTMLElement;
    const interactive = target.closest('button, a, input, select, textarea, [role="button"]');
    if (interactive) return;
    setIsHeaderVisible(prev => !prev);
  };

  const renderContent = () => {
    if (!hasPermission(activeTab)) {
      return (
        <div className="p-8 text-center bg-red-50 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-red-500/20 m-8">
          <h2 className="text-2xl font-bold text-red-500 dark:text-red-400">Permission Denied</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">You do not have access to this page.</p>
        </div>
      );
    }
    switch (activeTab) {
      case TABS.LANDING: return <LandingPage theme={theme} toggleTheme={(t) => toggleTheme(t)} settings={state.settings} />;
      case TABS.GENERAL_SETTINGS: return <GeneralSettings />;
      case TABS.TEAMS_CATEGORIES: return <TeamsAndCategories />;
      case TABS.ITEMS: return <ItemsManagement />;
      case TABS.GRADE_POINTS: return <GradePoints />;
      case TABS.JUDGES_MANAGEMENT: return <JudgesManagement />;
      case TABS.DATA_ENTRY: return <DataEntryPage currentUser={currentUser} />;
      case TABS.SCHEDULE: return <SchedulePage />;
      case TABS.SCORING_RESULTS: return <JudgementPage isMobile={isMobile} />;
      case TABS.ITEM_TIMER: return <ItemTimerPage />;
      case TABS.POINTS: return <PointsPage />;
      case TABS.REPORTS: return <ReportsPage />;
      case TABS.CREATIVE_STUDIO: return <CreativeStudio isMobile={isMobile} />;
      case TABS.PROJECTOR: return <ProjectorView onNavigate={handleSetActiveTab} />;
      case TABS.DASHBOARD: return <DashboardPage setActiveTab={handleSetActiveTab} theme={theme} />;
      default: return <LandingPage theme={theme} toggleTheme={(t) => toggleTheme(t)} settings={state.settings} />;
    }
  };

  if (loading || !state) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-amazio-light-bg dark:bg-amazio-bg transition-colors">
        <div className="text-center relative">
          <div className="absolute inset-0 bg-emerald-500/10 blur-xl rounded-full"></div>
          <svg className="animate-spin h-12 w-12 text-emerald-600 dark:text-emerald-400 mx-auto relative z-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-6 text-amazio-primary dark:text-zinc-400 font-medium tracking-wide relative z-10">INITIALIZING AMAZIO OS...</p>
        </div>
      </div>
    );
  }

  if (activeTab === TABS.LANDING) {
     return <LandingPage theme={theme} toggleTheme={(t) => toggleTheme(t)} settings={state.settings} />;
  }

  if (!currentUser && !hasPermission(activeTab)) {
    return <LandingPage theme={theme} toggleTheme={(t) => toggleTheme(t)} settings={state.settings} />;
  }

  if (isProjectorMode) {
    return (
        <div className="min-h-screen bg-black overflow-hidden relative">
            <GlobalFontManager />
            {renderContent()}
        </div>
    );
  }

  const isMobileSticky = isMobile && state.settings.mobileSidebarMode === 'sticky';
  const isFullHeightTab = activeTab === TABS.CREATIVE_STUDIO || activeTab === TABS.ITEM_TIMER;

  return (
    <div className="relative min-h-screen flex font-sans overflow-hidden text-amazio-primary dark:text-zinc-100 bg-amazio-light-bg dark:bg-amazio-bg">
      <GlobalFontManager />
      {currentUser && isMobile && state.settings.enableFloatingNav === true && !isSidebarExpanded && !isMobileSticky && (
        <FloatingNavRail activeTab={activeTab} setActiveTab={handleSetActiveTab} hasPermission={hasPermission} />
      )}
      {currentUser && isMobile && !isMobileSticky && (
        <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[998] transition-opacity duration-500 ease-in-out ${isSidebarExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={handleBackdropClick} aria-hidden="true" />
      )}
      {currentUser && (
        <Sidebar activeTab={activeTab} setActiveTab={handleSetActiveTab} isExpanded={isSidebarExpanded} isOpen={isSidebarOpen} toggleSidebar={toggleSidebarExpansion} isMobile={isMobile} handleLogout={logout} currentUser={currentUser} hasPermission={hasPermission} />
      )}
      <div className={`flex-1 flex flex-col h-screen max-w-full overflow-hidden relative transition-all duration-500 ease-in-out ${currentUser && state.settings.enableFloatingNav === true && isMobile && !isSidebarExpanded && !isMobileSticky ? 'pl-0' : ''} ${currentUser && isMobileSticky ? 'pl-[50px]' : ''}`}>
        <Header pageTitle={activeTab} onMenuClick={toggleSidebarExpansion} handleLogout={logout} currentUser={currentUser} theme={theme} toggleTheme={toggleTheme} isVisible={isHeaderVisible} onTitleClick={() => handleSetActiveTab(TABS.LANDING)} />
        <main ref={mainContentRef} onScroll={handleMainScroll} onClick={handleContentClick} className={`flex-1 overflow-y-auto relative scroll-smooth custom-scrollbar ${isFullHeightTab ? 'p-0' : 'px-4 py-4 md:px-6 md:py-6'} pb-[env(safe-area-inset-bottom)]`}>
            <div className={`transition-all ${isFullHeightTab ? 'flex-1 h-full flex flex-col' : 'max-w-5xl mx-auto md:space-y-8 sm:space-y-6'}`}>
                {!isFullHeightTab && (
                  <div className="md:hidden">
                    <div className="h-14"></div>
                  </div>
                )}
                {activeTab !== TABS.CREATIVE_STUDIO && activeTab !== TABS.ITEM_TIMER && <InstructionDisplay pageTitle={activeTab} />}
                {renderContent()}
            </div>
            {!isFullHeightTab && <div className="h-12 md:h-16"></div>}
        </main>
      </div>
    </div>
  );
};

export default App;
