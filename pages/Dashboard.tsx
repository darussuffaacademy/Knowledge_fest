
import { Activity, ArrowRight, Award, Calendar, ClipboardList, Clock, Crown, ExternalLink, Flag, Monitor, Sparkles, TrendingUp, Trophy, Users, CheckCircle2, Circle, ListFilter, BookOpen, MapPin } from 'lucide-react';
import React, { useMemo } from 'react';
import Card from '../components/Card';
import { TABS } from '../constants';
import { useFirebase } from '../hooks/useFirebase';
import { ItemType, ResultStatus, UserRole } from '../types';

interface DashboardPageProps {
  setActiveTab: (tab: string) => void;
  theme: string;
}

const StatCard: React.FC<{ icon: React.ElementType, title: string, value: string | number, colorClass: string, onClick?: () => void, delay?: number }> = ({ icon: Icon, title, value, colorClass, onClick, delay = 0 }) => (
  <div 
    onClick={onClick} 
    className={`relative group p-5 sm:p-7 rounded-[2rem] sm:rounded-[2.5rem] bg-white dark:bg-zinc-900/50 hover:border-emerald-500/30 dark:hover:border-emerald-500/40 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 cursor-pointer overflow-hidden animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards`}
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-[80px] pointer-events-none opacity-20 dark:opacity-40 transition-colors duration-500 ${colorClass}`}></div>
    <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start mb-3 sm:mb-5">
             <div className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 group-hover:text-white transition-all duration-300 shadow-sm ${colorClass.replace('bg-', 'text-').replace('-500', '-600')} dark:${colorClass.replace('bg-', 'text-').replace('-500', '-400')} group-hover:${colorClass}`}>
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400">
                <ArrowRight size={14} />
            </div>
        </div>
        <div>
            <p className="text-3xl sm:text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tighter mb-0.5 sm:mb-1 transition-colors">{value}</p>
            <p className="text-[9px] sm:text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest group-hover:text-zinc-700 dark:group-hover:text-zinc-200">Total {title}</p>
        </div>
    </div>
  </div>
);

const DashboardPage: React.FC<DashboardPageProps> = ({ setActiveTab, theme }) => {
  const { state, currentUser } = useFirebase();

  const logoUrl = useMemo(() => {
    if (!state?.settings.branding) return null;
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const { typographyUrl, typographyUrlLight, typographyUrlDark } = state.settings.branding;
    if (isDark) return typographyUrlDark || typographyUrl;
    return typographyUrlLight || typographyUrl;
  }, [state?.settings.branding, theme]);

  const hasJudgeAccess = useMemo(() => {
      if (!state || !currentUser || currentUser.role !== UserRole.JUDGE || !currentUser.judgeId) return () => true;
      const assignments = state.judgeAssignments || [];
      const myItemIds = new Set(assignments.filter(a => (a.judgeIds || []).includes(currentUser.judgeId!)).map(a => a.itemId));
      return (itemId: string) => myItemIds.has(itemId);
  }, [state?.judgeAssignments, currentUser]);

  const upcomingEvents = useMemo(() => {
    if (!state) return [];
    return (state.schedule || []).filter(s => hasJudgeAccess(s.itemId)).slice(0, 6);
  }, [state?.schedule, hasJudgeAccess]);
  
  const recentResult = useMemo(() => {
    if (!state) return null;
    const validDeclaredResults = (state.results || []).filter(r => r.status === ResultStatus.DECLARED && hasJudgeAccess(r.itemId));
    const lastDeclared = validDeclaredResults[validDeclaredResults.length - 1]; 
    if (!lastDeclared) return null;
    const item = (state.items || []).find(i => i.id === lastDeclared.itemId);
    const category = (state.categories || []).find(c => c.id === lastDeclared.categoryId);
    if (!item || !category) return null;
    const winners = (lastDeclared.winners || []).slice().sort((a, b) => (a.position || 99) - (b.position || 99)).slice(0, 5).map(winner => {
        const p = (state.participants || []).find(part => part.id === winner.participantId);
        const t = p ? (state.teams || []).find(tm => tm.id === p.teamId) : null;
        return { ...winner, participantName: p?.name || 'N/A', teamName: t?.name || 'N/A' };
    });
    return { itemName: item.name, categoryName: category.name, winners };
  }, [state, hasJudgeAccess]);

  const stats = useMemo(() => {
    if (!state) return { participants: 0, teams: 0, items: 0, resultsDeclared: 0 };
    const activeItemIds = new Set((state.items || []).map(i => i.id));
    return {
      participants: (state.participants || []).length,
      teams: (state.teams || []).length,
      items: (state.items || []).filter(i => hasJudgeAccess(i.id)).length,
      resultsDeclared: (state.results || []).filter(r => 
        r.status === ResultStatus.DECLARED && 
        activeItemIds.has(r.itemId) && 
        hasJudgeAccess(r.itemId)
      ).length
    };
  }, [state, hasJudgeAccess]);

  return (
    <div className="space-y-4 sm:space-y-8 animate-in fade-in duration-700 pb-24 max-w-5xl mx-auto">
       <div className="relative w-full rounded-[2rem] sm:rounded-[3.5rem] bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden group transition-all duration-700">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] to-indigo-500/[0.03] dark:from-emerald-500/[0.05] dark:to-indigo-500/[0.05] pointer-events-none"></div>
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 items-center p-6 sm:p-14 gap-8 sm:gap-10">
              <div className="lg:col-span-7 flex flex-col items-start gap-4 sm:gap-6">
                  <div className="flex items-center gap-2.5 px-4 py-2 bg-zinc-50/80 dark:bg-zinc-800/80 backdrop-blur-md rounded-full border border-zinc-200 dark:border-zinc-700 shadow-sm">
                     <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>
                     <span className="text-[10px] font-black tracking-[0.2em] uppercase text-zinc-600 dark:text-zinc-400">Terminal Operational</span>
                  </div>
                  <div className="py-1">
                      {logoUrl ? (
                          <img src={logoUrl} alt={state.settings.heading} className="h-auto max-h-20 sm:max-h-36 w-auto object-contain filter drop-shadow-xl" />
                      ) : (
                          <h1 className="text-4xl sm:text-7xl font-black font-serif tracking-tighter leading-tight text-zinc-900 dark:text-zinc-100 uppercase">{state?.settings.heading || 'AMAZIO 2026'}</h1>
                      )}
                  </div>
                  <p className="text-base sm:text-xl text-zinc-600 dark:text-zinc-400 font-medium italic tracking-wide max-w-xl">"{state?.settings.description || "The official management terminal."}"</p>
                  <div className="mt-4 sm:mt-8 flex flex-wrap gap-3 sm:gap-4">
                     <button onClick={() => setActiveTab(TABS.SCHEDULE)} className="flex items-center gap-2.5 px-6 py-3.5 sm:px-10 sm:py-5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black rounded-xl sm:rounded-2xl shadow-xl hover:scale-[1.03] transition-all text-[10px] sm:text-xs uppercase tracking-widest">Global Timeline <ArrowRight size={14}/></button>
                     <button onClick={() => setActiveTab(TABS.PROJECTOR)} className="flex items-center gap-2.5 px-6 py-3.5 sm:px-10 sm:py-5 bg-emerald-600 text-white font-black rounded-xl sm:rounded-2xl shadow-xl hover:scale-[1.03] transition-all text-[10px] sm:text-xs uppercase tracking-widest">Projector Mode <Monitor size={14}/></button>
                  </div>
              </div>
              <div className="lg:col-span-5 flex justify-center lg:justify-end">
                  <div className="relative group cursor-default">
                      <div className="relative w-40 h-40 sm:w-64 sm:h-64 rounded-[2.5rem] sm:rounded-[3.5rem] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 backdrop-blur-xl shadow-2xl flex flex-col items-center justify-center transition-all group-hover:scale-105">
                          <p className="text-[10px] sm:text-[12px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-2">Disciplines</p>
                          <p className="text-6xl sm:text-9xl font-black text-zinc-900 dark:text-zinc-100 leading-none tracking-tighter tabular-nums">{stats.items}</p>
                          <div className="absolute -bottom-1 -right-1 sm:-bottom-3 sm:-right-3 w-10 h-10 sm:w-16 sm:h-16 bg-emerald-500 text-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg"><Activity size={20} sm:size={32} strokeWidth={2.5} /></div>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard icon={Users} title="Delegates" value={stats.participants} colorClass="bg-emerald-500" onClick={() => setActiveTab(TABS.DATA_ENTRY)} />
          <StatCard icon={Flag} title="Units" value={stats.teams} colorClass="bg-indigo-600" onClick={() => setActiveTab(TABS.TEAMS_CATEGORIES)} delay={100} />
          <StatCard icon={BookOpen} title="Events" value={stats.items} colorClass="bg-amber-500" onClick={() => setActiveTab(TABS.ITEMS)} delay={200} />
          <StatCard icon={Trophy} title="Declared" value={stats.resultsDeclared} colorClass="bg-rose-500" onClick={() => setActiveTab(TABS.SCORING_RESULTS)} delay={300} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 items-start">
          <div className="lg:col-span-8">
              <Card title="Program Timeline" className="!border-none" action={<button onClick={() => setActiveTab(TABS.SCHEDULE)} className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2 hover:translate-x-1 transition-all">Full Schedule <ArrowRight size={14}/></button>}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                    {upcomingEvents.length > 0 ? upcomingEvents.map((ev, i) => (
                        <div key={ev.id} className="flex items-start gap-4 sm:gap-6 p-5 sm:p-7 bg-zinc-50 dark:bg-zinc-800/40 rounded-[1.5rem] sm:rounded-[2.5rem] group transition-all hover:bg-white dark:hover:bg-zinc-800 hover:shadow-md">
                            <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-xl sm:rounded-[1.5rem] bg-zinc-900 dark:bg-emerald-500/20 flex items-center justify-center text-white dark:text-emerald-400 shrink-0 shadow-lg transition-transform group-hover:scale-105">
                                <Clock size={24} sm:size={36} strokeWidth={2.5} />
                            </div>
                            <div className="min-w-0 flex-grow">
                                <h4 className="font-black text-emerald-600 dark:text-emerald-400 text-[11px] sm:text-sm uppercase tracking-widest mb-1 group-hover:translate-x-1 transition-transform">
                                    {ev.time}
                                </h4>
                                <div className="font-black text-zinc-900 dark:text-zinc-100 text-base sm:text-xl uppercase tracking-tight truncate leading-tight mb-2 sm:mb-4">
                                    {(state.items || []).find(i => i.id === ev.itemId)?.name}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                    <span className="px-3 py-1 rounded-lg bg-white dark:bg-zinc-900 text-[8px] sm:text-[10px] font-black text-zinc-500 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 uppercase tracking-widest">
                                        {(state.categories || []).find(c => c.id === ev.categoryId)?.name}
                                    </span>
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-[8px] sm:text-[10px] font-black text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 uppercase tracking-widest">
                                        <MapPin size={10} sm:size={12} strokeWidth={3} /> {ev.stage}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )) : <div className="col-span-full py-16 sm:py-24 text-center opacity-30 italic text-[10px] sm:text-xs uppercase font-bold tracking-[0.3em] flex flex-col items-center gap-4 sm:gap-6"><Calendar size={48} sm:size={64} strokeWidth={1}/> Awaiting scheduled events</div>}
                </div>
              </Card>
          </div>
          <div className="lg:col-span-4 space-y-6 sm:space-y-10">
               <Card title="Latest Verdict" className="!border-none">
                {recentResult ? (
                  <div className="space-y-5 sm:space-y-7">
                    <div className="text-center mb-4 sm:mb-8">
                      <span className="px-4 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-xl text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em]">{recentResult.categoryName}</span>
                      <h3 className="text-2xl sm:text-4xl font-black text-zinc-900 dark:text-zinc-100 mt-4 sm:mt-6 uppercase tracking-tighter leading-none">{recentResult.itemName}</h3>
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                        {(recentResult.winners || []).map((winner, idx) => (
                            <div key={idx} className="flex items-center gap-4 sm:gap-5 p-3.5 sm:p-5 rounded-2xl sm:rounded-[2.5rem] bg-zinc-50 dark:bg-zinc-800/40 transition-all group/winner hover:bg-white dark:hover:bg-zinc-800 hover:shadow-md">
                                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center font-black text-base sm:text-xl ${winner.position === 1 ? 'bg-amber-400 text-amber-950 shadow-lg' : 'bg-white dark:bg-zinc-700 text-zinc-500 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-600 shadow-sm'}`}>{winner.position}</div>
                                <div className="min-w-0 flex-grow">
                                    <p className="font-black text-sm sm:text-base text-zinc-900 dark:text-zinc-100 truncate uppercase group-hover/winner:text-emerald-600 dark:group-hover/winner:text-emerald-400 transition-colors">{winner.participantName}</p>
                                    <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-bold">{winner.teamName}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setActiveTab(TABS.SCORING_RESULTS)} className="w-full py-4 sm:py-6 mt-4 sm:mt-8 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl sm:rounded-[2.5rem] text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-zinc-800 dark:hover:bg-zinc-100 shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2.5"><Trophy size={16}/> All Declared Results</button>
                  </div>
                ) : <div className="text-center py-20 sm:py-32 opacity-30 italic text-[10px] sm:text-xs uppercase font-bold tracking-[0.3em] flex flex-col items-center gap-4 sm:gap-6"><Award size={64} sm:size={80} strokeWidth={1}/> No results yet</div>}
              </Card>
          </div>
      </div>
      <div className="text-center pt-8 sm:pt-12">
          <p className="text-[9px] sm:text-[10px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.4em]">© 2026 AMAZIO • ART FEST TERMINAL v6.5</p>
      </div>
    </div>
  );
};

export default DashboardPage;
