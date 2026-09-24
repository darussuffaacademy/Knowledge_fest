import { 
    Award, BarChart2, CheckCircle2, ChevronDown, ChevronRight, 
    Filter, GraduationCap, Info, Layers, Layout, ListFilter, 
    PieChart, Search, SearchX, Trophy, User, Users, Zap, 
    Check, TrendingUp, BookOpen, UserCheck, ArrowUpRight,
    MapPin, X, ExternalLink, ArrowUp, ArrowDown, RotateCcw, AlertTriangle, ShieldAlert, Loader2
} from 'lucide-react';
import React, { useMemo, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useFirebase } from '../hooks/useFirebase';
import { ItemType, PerformanceType, ResultStatus, UserRole } from '../types';

// --- Helper Components & Utils ---

const getThemeColor = (str: string) => {
    if (!str) return { bg: 'bg-zinc-100', text: 'text-zinc-600', border: 'border-zinc-200', light: 'bg-zinc-50 dark:bg-zinc-900/30', shadow: 'shadow-zinc-500/10' };
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0; 
    }
    const themes = [
        { bg: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800', light: 'bg-indigo-50 dark:bg-indigo-900/20', shadow: 'shadow-indigo-500/10' },
        { bg: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', light: 'bg-emerald-50 dark:bg-indigo-900/20', shadow: 'shadow-indigo-500/10' },
        { bg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', light: 'bg-amber-50 dark:bg-amber-900/10', shadow: 'shadow-amber-500/10' },
        { bg: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800', light: 'bg-rose-50 dark:bg-rose-900/20', shadow: 'shadow-rose-500/10' },
        { bg: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800', light: 'bg-purple-50 dark:bg-fuchsia-900/20', shadow: 'shadow-purple-500/10' },
        { bg: 'bg-sky-500', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-200 dark:border-sky-800', light: 'bg-sky-50 dark:bg-sky-900/20', shadow: 'shadow-sky-500/10' },
        { bg: 'bg-teal-500', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800', light: 'bg-teal-50 dark:bg-teal-900/20', shadow: 'shadow-teal-500/10' },
        { bg: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800', light: 'bg-orange-50 dark:bg-orange-900/20', shadow: 'shadow-orange-500/10' },
    ];
    return themes[Math.abs(hash) % themes.length];
};

const StatBox = ({ label, value, icon: Icon, colorClass }: { label: string, value: number | string, icon: any, colorClass: string }) => (
    <div className={`p-4 rounded-3xl border bg-white dark:bg-zinc-900/50 flex items-center gap-4 transition-all hover:shadow-md ${colorClass}`}>
        <div className="p-3 rounded-2xl bg-white dark:bg-black/20 shadow-sm shrink-0">
            <Icon size={24} />
        </div>
        <div>
            <div className="text-[10px] font-black uppercase tracking-wider opacity-60">{label}</div>
            <div className="text-2xl sm:text-3xl font-black tabular-nums leading-none">{value}</div>
        </div>
    </div>
);

const PointChip = ({ type, value, label }: { type: 'rank' | 'grade' | 'total', value: number, label?: string }) => {
    if (value === 0 && type !== 'total') return null;
    const styles = {
        rank: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
        grade: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
        total: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
    };
    const Icon = type === 'rank' ? Trophy : type === 'grade' ? GraduationCap : Layers;
    return (
        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-bold ${styles[type]}`} title={label}>
            <Icon size={12} />
            <span>{value}</span>
        </div>
    );
};

const DetailModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    title: string; 
    subtitle?: string; 
    icon: any; 
    children: React.ReactNode 
}> = ({ isOpen, onClose, title, subtitle, icon: Icon, children }) => {
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white dark:bg-[#121412] w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-white/10 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                <div className="p-7 border-b border-zinc-100 dark:border-white/5 flex justify-between items-center bg-zinc-50/50 dark:bg-white/[0.01]">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg">
                            <Icon size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black font-serif uppercase tracking-tighter leading-none text-amazio-primary dark:text-white">{title}</h3>
                            {subtitle && <p className="text-[10px] font-black uppercase text-zinc-400 mt-1.5 tracking-widest">{subtitle}</p>}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-xl transition-colors text-zinc-400"><X size={24}/></button>
                </div>
                <div className="flex-grow overflow-y-auto p-8 custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};

const PointsPage: React.FC = () => {
    const { state, globalSearchTerm, globalFilters, resetPoints, currentUser } = useFirebase();
    const [viewMode, setViewMode] = useState<'STANDINGS' | 'ITEMS' | 'PARTICIPANTS'>('STANDINGS');
    const [viewFilter, setViewFilter] = useState<'BOTH' | 'RANK' | 'GRADE'>('BOTH');
    
    // Reset Points Modal State
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [confirmPhrase, setConfirmPhrase] = useState('');
    const [notification, setNotification] = useState<string | null>(null);

    // Selection for Modals
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [selectedParticipant, setSelectedParticipant] = useState<any | null>(null);

    // Drill-down State (Standings)
    const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set()); // Key: teamId-categoryId
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set()); // Key: teamId-catId-itemId

    const { teams, categories, participants, results, items, gradePoints, tabulation } = state || {};

    const analytics = useMemo(() => {
        if (!teams || !results || !items || !participants || !gradePoints || !categories || !tabulation) return null;
        
        // Map tabulation for quick lookup of code letters
        const codeMap = new Map<string, string>();
        tabulation.forEach(t => codeMap.set(`${t.itemId}-${t.participantId}`, t.codeLetter));

        const teamData: { [teamId: string]: any } = {};
        teams.forEach(t => { 
            teamData[t.id] = { 
                teamId: t.id, 
                teamName: t.name, 
                totalPoints: 0, 
                totalRankPoints: 0, 
                totalGradePoints: 0, 
                rankCount: 0, 
                participantCount: 0, 
                categories: {} 
            }; 
        });

        const activeItemIds = new Set<string>();
        const participantRawEntries: any[] = [];
        const itemAggregate: Record<string, any> = {};

        results.forEach(result => {
            if (result.status !== ResultStatus.DECLARED && result.status !== ResultStatus.UPDATED) return;
            
            const item = items.find(i => i.id === result.itemId);
            const category = categories.find(c => c.id === result.categoryId);
            if (!item || !category) return;

            // Apply Filters: Category, Performance Type, Item ID, Item Type (Robust check)
            const matchesCat = globalFilters.categoryId.length === 0 || globalFilters.categoryId.includes(item.categoryId);
            const matchesPerf = globalFilters.performanceType.length === 0 || globalFilters.performanceType.includes(item.performanceType);
            const matchesItemType = globalFilters.itemType.length === 0 || globalFilters.itemType.some(t => t.toLowerCase() === (item.type || '').toLowerCase());
            const matchesItemId = globalFilters.itemId.length === 0 || globalFilters.itemId.includes(item.id);

            if (!matchesCat || !matchesPerf || !matchesItemType || !matchesItemId) return;
            
            activeItemIds.add(item.id);
            if (!itemAggregate[item.id]) {
                itemAggregate[item.id] = { 
                    item, 
                    category, 
                    winners: [],
                    totalPoints: 0 
                };
            }

            result.winners.forEach(winner => {
                const p = participants.find(part => part.id === winner.participantId);
                if (!p) return;
                
                const team = teamData[p.teamId];
                if (!team) return;

                let rankPts = 0;
                if (winner.position === 1) rankPts = item.points.first;
                else if (winner.position === 2) rankPts = item.points.second;
                else if (winner.position === 3) rankPts = item.points.third;

                let gradePts = 0; 
                let gradeName = '-';
                if (winner.gradeId) {
                    const gradeConfig = item.type === ItemType.SINGLE ? (gradePoints.single || []) : (gradePoints.group || []);
                    const grade = gradeConfig.find(g => g.id === winner.gradeId);
                    if (grade) { 
                        gradeName = grade.name; 
                        gradePts = (item.gradePointsOverride && item.gradePointsOverride[grade.id] !== undefined) 
                            ? item.gradePointsOverride[grade.id] 
                            : (grade.points || 0); 
                    }
                }

                const entryTotal = rankPts + gradePts;

                if (entryTotal > 0) {
                    if (!team.categories[category.id]) {
                        team.categories[category.id] = { 
                            categoryId: category.id, 
                            categoryName: category.name, 
                            rankTotal: 0, 
                            gradeTotal: 0, 
                            total: 0, 
                            items: {} 
                        };
                    }
                    const catData = team.categories[category.id];
                    
                    if (!catData.items[item.id]) {
                        catData.items[item.id] = { 
                            itemId: item.id, 
                            itemName: item.name, 
                            itemType: item.type, 
                            performanceType: item.performanceType, 
                            rankTotal: 0, 
                            gradeTotal: 0, 
                            total: 0, 
                            contributors: [] 
                        };
                    }
                    const itemData = catData.items[item.id];
                    
                    itemData.rankTotal += rankPts; 
                    itemData.gradeTotal += gradePts; 
                    itemData.total += entryTotal;
                    
                    catData.rankTotal += rankPts; 
                    catData.gradeTotal += gradePts; 
                    catData.total += entryTotal;
                    
                    team.totalRankPoints += rankPts; 
                    team.totalGradePoints += gradePts; 
                    team.totalPoints += entryTotal;
                    
                    if (rankPts > 0) team.rankCount++; 
                    team.participantCount++;

                    const contributor = { 
                        participantId: p.id, 
                        participantName: item.type === ItemType.GROUP ? `${p.name} & Party` : p.name, 
                        chestNumber: p.chestNumber, 
                        codeLetter: codeMap.get(`${item.id}-${p.id}`) || '',
                        teamId: p.teamId, 
                        teamName: team.teamName,
                        rank: winner.position, 
                        rankPoints: rankPts, 
                        gradeName: gradeName, 
                        gradePoints: gradePts, 
                        total: entryTotal,
                        itemName: item.name,
                        categoryName: category.name
                    };

                    itemData.contributors.push(contributor);
                    itemAggregate[item.id].winners.push(contributor);
                    itemAggregate[item.id].totalPoints += entryTotal;

                    participantRawEntries.push({ 
                        participant: p, 
                        item: item, 
                        category: category, 
                        rank: winner.position, 
                        rankPoints: rankPts, 
                        gradeName: gradeName, 
                        gradePoints: gradePts, 
                        total: entryTotal 
                    });
                }
            });
        });

        // Filter: Team Selection
        let finalTeamData = Object.values(teamData);
        if (globalFilters.teamId.length > 0) finalTeamData = finalTeamData.filter(t => globalFilters.teamId.includes(t.teamId));

        // Filter: Item Aggregate (Search + Active filters already applied)
        let finalItemAggregate = Object.values(itemAggregate);
        if (globalSearchTerm) {
            const q = globalSearchTerm.toLowerCase();
            finalItemAggregate = finalItemAggregate.filter(agg => agg.item.name.toLowerCase().includes(q));
        }
        if (globalFilters.teamId.length > 0) {
            finalItemAggregate = finalItemAggregate.map(agg => ({
                ...agg,
                winners: agg.winners.filter((w: any) => globalFilters.teamId.includes(w.teamId)),
                totalPoints: agg.winners.filter((w: any) => globalFilters.teamId.includes(w.teamId)).reduce((s: number, w: any) => s + w.total, 0)
            })).filter(agg => agg.winners.length > 0);
        }

        // Filter: Participant Entries (Team + Search)
        let finalParticipantEntries = [...participantRawEntries];
        if (globalFilters.teamId.length > 0) finalParticipantEntries = finalParticipantEntries.filter(e => globalFilters.teamId.includes(e.participant.teamId));
        if (globalSearchTerm) {
            const q = globalSearchTerm.toLowerCase();
            finalParticipantEntries = finalParticipantEntries.filter(e => 
                e.participant.name.toLowerCase().includes(q) || e.participant.chestNumber.toLowerCase().includes(q)
            );
        }

        return { 
            teamData: finalTeamData, 
            participantRawEntries: finalParticipantEntries, 
            itemAggregate: finalItemAggregate.sort((a,b) => b.totalPoints - a.totalPoints),
            stats: { 
                updatedCount: activeItemIds.size, 
                contributorsCount: new Set(finalParticipantEntries.map(e => e.participant.id)).size, 
                totalEntries: finalParticipantEntries.length,
                totalPoints: finalTeamData.reduce((sum, t) => sum + t.totalPoints, 0)
            } 
        };
    }, [teams, categories, participants, results, items, gradePoints, tabulation, globalFilters, globalSearchTerm]);

    const sortedTeams = useMemo(() => {
        if (!analytics) return [];
        return analytics.teamData.sort((a: any, b: any) => {
            const valA = viewFilter === 'RANK' ? a.totalRankPoints : viewFilter === 'GRADE' ? a.totalGradePoints : a.totalPoints;
            const valB = viewFilter === 'RANK' ? b.totalRankPoints : viewFilter === 'GRADE' ? b.totalGradePoints : b.totalPoints;
            return valB - valA;
        });
    }, [analytics, viewFilter]);

    const participantsAggregated = useMemo(() => {
        if (!analytics) return [];
        const map = new Map<string, any>();
        analytics.participantRawEntries.forEach(entry => {
            if (!map.has(entry.participant.id)) {
                map.set(entry.participant.id, { 
                    ...entry.participant, 
                    total: 0, 
                    items: [], 
                    displayTeam: teams?.find(t => t.id === entry.participant.teamId)?.name || 'N/A' 
                });
            }
            const p = map.get(entry.participant.id);
            // Modified: If a filter is active, we should show the points within that filtered context.
            // If No filter is active, we only count Single for individual leaderboard logic.
            if (globalFilters.itemType.length > 0) {
                 p.total += entry.total;
            } else if (entry.item.type === ItemType.SINGLE) {
                 p.total += entry.total;
            }
            p.items.push(entry);
        });
        return Array.from(map.values()).sort((a,b) => b.total - a.total);
    }, [analytics, teams, globalFilters.itemType]);

    if (!state || !analytics) return <div className="p-12 text-center text-zinc-500">Calculating standings...</div>;

    const toggleTeam = (tid: string) => setExpandedTeams(prev => { const n = new Set(prev); if(n.has(tid)) n.delete(tid); else n.add(tid); return n; });
    const toggleCat = (tid: string, cid: string) => setExpandedCategories(prev => { const key = `${tid}-${cid}`; const n = new Set(prev); if(n.has(key)) n.delete(key); else n.add(key); return n; });
    const toggleItem = (tid: string, cid: string, iid: string) => setExpandedItems(prev => { const key = `${tid}-${cid}-${iid}`; const n = new Set(prev); if(n.has(key)) n.delete(key); else n.add(key); return n; });

    const handleResetPoints = async () => {
        setIsResetting(true);
        try {
            await resetPoints();
            setIsResetModalOpen(false);
            setConfirmPhrase('');
            setNotification('All festival points and results have been successfully reset to 0.');
            setTimeout(() => setNotification(null), 5000);
        } catch (err) {
            console.error('Failed to reset points:', err);
            alert('Failed to reset points. Please try again.');
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <div className="space-y-6 sm:space-y-10 animate-in fade-in duration-500 pb-24">
            {/* Notification Alert */}
            {notification && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center justify-between shadow-sm animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="text-xs font-bold uppercase tracking-wider">{notification}</span>
                    </div>
                    <button onClick={() => setNotification(null)} className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg text-emerald-600 dark:text-emerald-400">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="hidden md:flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h2 className="text-5xl font-black font-serif text-amazio-primary dark:text-white tracking-tighter uppercase leading-none">Point Tallies</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-3 font-medium text-lg italic">Global standings and contribution analysis.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-white/40 dark:bg-black/20 p-1.5 rounded-2xl border border-amazio-primary/5 shadow-inner">
                        <button onClick={() => setViewMode('STANDINGS')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'STANDINGS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-500'}`}>Leaderboard</button>
                        <button onClick={() => setViewMode('ITEMS')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'ITEMS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-500'}`}>By Item</button>
                        <button onClick={() => setViewMode('PARTICIPANTS')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'PARTICIPANTS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-500'}`}>By Participant</button>
                    </div>
                    <button
                        onClick={() => { setConfirmPhrase(''); setIsResetModalOpen(true); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 group shrink-0"
                        title="Reset all festival points & declared results"
                    >
                        <RotateCcw size={14} className="group-hover:-rotate-90 transition-transform duration-300" />
                        <span>Reset Points</span>
                    </button>
                </div>
            </div>

            {/* Mobile View Toggles & Reset Button */}
            <div className="md:hidden flex items-center gap-2">
                <div className="flex-1 flex bg-white/40 dark:bg-black/20 p-1 rounded-xl border border-amazio-primary/5">
                    <button onClick={() => setViewMode('STANDINGS')} className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg ${viewMode === 'STANDINGS' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-500'}`}>Stats</button>
                    <button onClick={() => setViewMode('ITEMS')} className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg ${viewMode === 'ITEMS' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-500'}`}>Items</button>
                    <button onClick={() => setViewMode('PARTICIPANTS')} className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg ${viewMode === 'PARTICIPANTS' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-500'}`}>People</button>
                </div>
                <button
                    onClick={() => { setConfirmPhrase(''); setIsResetModalOpen(true); }}
                    className="p-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 rounded-xl text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
                    title="Reset points"
                >
                    <RotateCcw size={14} />
                    <span className="text-[9px] font-bold uppercase">Reset</span>
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
                <StatBox label="Updated Results" value={analytics.stats.updatedCount} icon={CheckCircle2} colorClass="text-emerald-700 border-emerald-100 bg-emerald-50/50" />
                <StatBox label="Festival Points" value={analytics.stats.totalPoints} icon={Zap} colorClass="text-amber-700 border-amber-100 bg-amber-50/50" />
                <StatBox label="Contributors" value={analytics.stats.contributorsCount} icon={Users} colorClass="text-indigo-700 border-indigo-100 bg-indigo-50/50" />
                <StatBox label="Scoring Entries" value={analytics.stats.totalEntries} icon={PieChart} colorClass="text-rose-700 border-rose-100 bg-rose-50/50" />
            </div>

            {/* View Mode: Leaderboard */}
            {viewMode === 'STANDINGS' && (
                <div className="space-y-6 animate-in slide-in-from-left duration-500">
                    <div className="flex justify-between items-center px-2">
                        <div className="flex items-center gap-3">
                            <Trophy size={20} className="text-amber-500" />
                            <h3 className="text-xl font-black font-serif uppercase text-amazio-primary dark:text-white">Unit Standings</h3>
                        </div>
                        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-black/20 p-1 rounded-xl border border-amazio-primary/5">
                            {['BOTH', 'RANK', 'GRADE'].map(f => (
                                <button key={f} onClick={() => setViewFilter(f as any)} className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase transition-all ${viewFilter === f ? 'bg-white dark:bg-zinc-800 text-amazio-primary dark:text-white shadow-sm' : 'text-zinc-400'}`}>{f}</button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        {sortedTeams.map((team: any, idx) => {
                            const isTExpanded = expandedTeams.has(team.teamId);
                            const currentPoints = viewFilter === 'RANK' ? team.totalRankPoints : viewFilter === 'GRADE' ? team.totalGradePoints : team.totalPoints;
                            
                            return (
                                <div key={team.teamId} className={`rounded-[1.5rem] sm:rounded-[2.5rem] border transition-all overflow-hidden bg-white dark:bg-[#121412] ${isTExpanded ? 'border-indigo-500/30 shadow-xl' : 'border-zinc-100 dark:border-white/5 shadow-sm'}`}>
                                    <div onClick={() => toggleTeam(team.teamId)} className="p-4 sm:p-6 flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/[0.01] transition-colors">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-black text-lg sm:text-2xl ${idx === 0 ? 'bg-amber-400 text-amber-950 shadow-lg' : idx === 1 ? 'bg-slate-200 text-slate-700' : 'bg-zinc-100 text-zinc-400'}`}>{idx + 1}</div>
                                            <div className="min-w-0">
                                                <h4 className="text-base sm:text-2xl font-black uppercase text-amazio-primary dark:text-white truncate">{team.teamName}</h4>
                                                <div className="flex gap-2 mt-1">
                                                    <PointChip type="rank" value={team.totalRankPoints} />
                                                    <PointChip type="grade" value={team.totalGradePoints} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 sm:gap-8">
                                            <div className="text-right">
                                                <div className="text-2xl sm:text-5xl font-black text-indigo-600 leading-none tabular-nums">{currentPoints}</div>
                                                <div className="text-[8px] font-black uppercase text-zinc-400 mt-1 tracking-widest">Total Points</div>
                                            </div>
                                            <div className={`p-2 rounded-xl bg-zinc-50 dark:bg-white/5 transition-transform ${isTExpanded ? 'rotate-180' : ''}`}><ChevronDown size={20} /></div>
                                        </div>
                                    </div>

                                    {isTExpanded && (
                                        <div className="px-4 pb-4 sm:px-12 sm:pb-8 space-y-2 animate-in slide-in-from-top-4 duration-300">
                                            {Object.values(team.categories).sort((a:any, b:any) => b.total - a.total).map((cat: any) => {
                                                const isCExpanded = expandedCategories.has(`${team.teamId}-${cat.categoryId}`);
                                                return (
                                                    <div key={cat.categoryId} className="bg-zinc-50 dark:bg-black/20 rounded-[1.5rem] border border-zinc-100 dark:border-white/5 overflow-hidden">
                                                        <div onClick={() => toggleCat(team.teamId, cat.categoryId)} className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/50 transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 bg-white dark:bg-zinc-800 rounded-xl shadow-sm"><Layers size={14} className="text-zinc-400"/></div>
                                                                <span className="text-xs sm:text-sm font-black uppercase tracking-tight text-zinc-700 dark:text-zinc-300">{cat.categoryName}</span>
                                                            </div>
                                                            <div className="flex items-center gap-6">
                                                                <span className="text-base sm:text-xl font-black text-indigo-500 tabular-nums">{cat.total}</span>
                                                                <ChevronDown size={14} className={`text-zinc-400 transition-transform ${isCExpanded ? 'rotate-180' : ''}`} />
                                                            </div>
                                                        </div>
                                                        {isCExpanded && (
                                                            <div className="px-4 pb-4 space-y-1.5">
                                                                {Object.values(cat.items).sort((a:any,b:any) => b.total - a.total).map((item: any) => {
                                                                    const isIExpanded = expandedItems.has(`${team.teamId}-${cat.categoryId}-${item.itemId}`);
                                                                    return (
                                                                        <div key={item.itemId} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 rounded-xl overflow-hidden shadow-sm">
                                                                            <div onClick={() => toggleItem(team.teamId, cat.categoryId, item.itemId)} className="p-3 flex items-center justify-between cursor-pointer hover:bg-zinc-50 transition-colors">
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                                                    <span className="text-[11px] sm:text-xs font-bold uppercase text-zinc-600 dark:text-zinc-300">{item.itemName}</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-4">
                                                                                    <span className="text-sm font-black text-indigo-400 tabular-nums">{item.total}</span>
                                                                                    <ChevronRight size={12} className={`text-zinc-300 transition-transform ${isIExpanded ? 'rotate-90' : ''}`} />
                                                                                </div>
                                                                            </div>
                                                                            {isIExpanded && (
                                                                                <div className="p-3 pt-0 border-t border-zinc-50 dark:border-white/5 space-y-1 bg-zinc-50/30">
                                                                                    {item.contributors.map((c: any) => (
                                                                                        <div key={c.participantId} className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-white transition-colors">
                                                                                            <div className="flex items-center gap-3">
                                                                                                <span className="text-[9px] font-black text-zinc-400 w-8">#{c.chestNumber}</span>
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">{c.participantName}</span>
                                                                                                    {c.codeLetter && <span className="text-[8px] font-black bg-zinc-100 dark:bg-zinc-800 px-1 rounded text-indigo-500 shadow-sm border border-zinc-200 dark:border-zinc-700">CODE: {c.codeLetter}</span>}
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="flex items-center gap-2">
                                                                                                {c.rank > 0 && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100">Rank {c.rank}</span>}
                                                                                                {c.gradeName !== '-' && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">{c.gradeName}</span>}
                                                                                                <span className="text-xs font-black text-emerald-600 tabular-nums ml-2">+{c.total}</span>
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* View Mode: Items Analysis */}
            {viewMode === 'ITEMS' && (
                <div className="space-y-6 animate-in slide-in-from-right duration-500">
                    <div className="flex items-center gap-3 px-2">
                        <BookOpen size={20} className="text-emerald-500" />
                        <h3 className="text-xl font-black font-serif uppercase text-amazio-primary dark:text-white">Item Analytics</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {analytics.itemAggregate.map(agg => (
                            <div 
                                key={agg.item.id} 
                                onClick={() => setSelectedItem(agg)}
                                className="bg-white dark:bg-[#121412] p-6 rounded-[2rem] border border-zinc-100 dark:border-white/5 shadow-sm group hover:shadow-xl transition-all cursor-pointer flex flex-col hover:-translate-y-1"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-black uppercase text-zinc-500 border border-zinc-200 dark:border-zinc-700">{agg.category.name}</div>
                                    <div className="text-2xl font-black text-indigo-500 tabular-nums">{agg.totalPoints}</div>
                                </div>
                                <h4 className="text-lg font-black uppercase text-amazio-primary dark:text-white tracking-tight leading-tight mb-4">{agg.item.name}</h4>
                                <div className="mt-auto flex items-center justify-between text-[10px] font-black uppercase text-zinc-400 tracking-widest pt-4 border-t border-zinc-50 dark:border-white/5">
                                    <span>{agg.winners.length} Scorers</span>
                                    <span className="flex items-center gap-1 group-hover:text-indigo-500 transition-colors">Details <ExternalLink size={10}/></span>
                                </div>
                            </div>
                        ))}
                        {analytics.itemAggregate.length === 0 && (
                            <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-30 italic text-xs uppercase font-bold tracking-[0.2em] border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2rem]">
                                <SearchX size={48} className="mb-4" />
                                No matching items
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* View Mode: Participant Analysis */}
            {viewMode === 'PARTICIPANTS' && (
                <div className="space-y-6 animate-in zoom-in-95 duration-500">
                    <div className="flex items-center gap-3 px-2">
                        <UserCheck size={20} className="text-indigo-500" />
                        <h3 className="text-xl font-black font-serif uppercase text-amazio-primary dark:text-white">Contributor Registry</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {participantsAggregated.map(p => {
                            const theme = getThemeColor(p.displayTeam);
                            return (
                                <div 
                                    key={p.id} 
                                    onClick={() => setSelectedParticipant(p)}
                                    className="relative bg-white dark:bg-[#121412] p-7 rounded-[2.5rem] border border-zinc-100 dark:border-white/5 shadow-sm hover:shadow-xl hover:border-zinc-300 transition-all duration-300 cursor-pointer overflow-hidden group min-h-[160px] flex flex-col justify-between"
                                >
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center font-black text-white text-xl shadow-lg transition-transform group-hover:scale-110 shrink-0 ${theme.bg}`}>
                                                {p.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-lg font-black uppercase text-amazio-primary dark:text-white truncate leading-tight group-hover:text-indigo-500 transition-colors mb-1">{p.name}</h4>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-[11px] font-black bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 px-2.5 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-800">#{p.chestNumber}</span>
                                                    {p.place && <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 italic truncate"><MapPin size={10}/> {p.place}</div>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                                                <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums leading-none mb-1">{p.total}</div>
                                                <div className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">Points</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-50 dark:border-white/5">
                                        <p className={`text-[10px] font-black uppercase tracking-widest truncate ${theme.text}`}>{p.displayTeam}</p>
                                        <span className="text-zinc-400 group-hover:text-indigo-500 transition-all flex items-center gap-1 text-[9px] font-black uppercase tracking-widest">Matrix <ExternalLink size={12}/></span>
                                    </div>
                                </div>
                            );
                        })}
                        {participantsAggregated.length === 0 && (
                            <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-30 italic text-xs uppercase font-bold tracking-[0.2em] border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2rem]">
                                <SearchX size={48} className="mb-4" />
                                No matching contributors
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Detail Modal: By Item (Points Order) */}
            <DetailModal 
                isOpen={!!selectedItem} 
                onClose={() => setSelectedItem(null)}
                title={selectedItem?.item.name || ''}
                subtitle={`${selectedItem?.category.name} Analysis`}
                icon={BookOpen}
            >
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-4 py-3 bg-zinc-50 dark:bg-black/20 rounded-2xl border border-zinc-100 dark:border-white/5 mb-6">
                        <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Total Contribution</span>
                        <span className="text-2xl font-black text-indigo-500 tabular-nums">{selectedItem?.totalPoints}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-4 px-2">
                        <ArrowDown size={14} className="text-indigo-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Winners (Points Descending)</span>
                    </div>

                    <div className="space-y-3">
                        {/* Sort by total points descending */}
                        {[...(selectedItem?.winners || [])].sort((a: any, b: any) => b.total - a.total).map((w: any) => (
                            <div key={w.participantId} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 rounded-[1.5rem] shadow-sm hover:border-indigo-500/20 transition-all">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${w.rank === 1 ? 'bg-amber-400 text-amber-950' : 'bg-zinc-100 text-zinc-400'}`}>
                                        {w.rank || '-'}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h5 className="font-black text-amazio-primary dark:text-zinc-100 uppercase text-sm truncate">{w.participantName}</h5>
                                            {w.codeLetter && (
                                                <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[9px] font-black border border-indigo-100 dark:border-indigo-800 shadow-sm">
                                                    {w.codeLetter}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                                            #{w.chestNumber} • {w.teamName}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-black text-emerald-600 tabular-nums">+{w.total}</div>
                                    <div className="flex gap-1 justify-end">
                                        {w.rankPoints > 0 && <span className="text-[7px] font-black text-amber-600 bg-amber-50 px-1 rounded uppercase">Rank {w.rank}</span>}
                                        {w.gradeName !== '-' && <span className="text-[7px] font-black text-indigo-500 bg-indigo-50 px-1 rounded uppercase">{w.gradeName}</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {selectedItem?.winners.length === 0 && (
                            <div className="py-20 text-center opacity-30 italic uppercase text-[10px] font-black tracking-widest">No contributors recorded</div>
                        )}
                    </div>
                </div>
            </DetailModal>

            {/* Detail Modal: By Participant (Contribution Sources) */}
            <DetailModal 
                isOpen={!!selectedParticipant} 
                onClose={() => setSelectedParticipant(null)}
                title={selectedParticipant?.name || ''}
                subtitle={`${selectedParticipant?.displayTeam} Performance`}
                icon={UserCheck}
            >
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-4 py-3 bg-zinc-50 dark:bg-black/20 rounded-2xl border border-zinc-100 dark:border-white/5 mb-6">
                        <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Personal Tally</span>
                        <span className="text-2xl font-black text-indigo-500 tabular-nums">{selectedParticipant?.total}</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 flex items-start gap-3 mb-6">
                        <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-bold text-amber-800 dark:text-amber-200 uppercase leading-relaxed">Individual tallies prioritize performance from Single items. Group item points are listed for history and are included in calculations only when the "Group" filter is active.</p>
                    </div>

                    <div className="text-[10px] font-black uppercase text-zinc-500 tracking-widest px-2 mb-4">Contribution Matrix</div>

                    <div className="grid grid-cols-1 gap-3">
                        {selectedParticipant?.items.map((e: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 rounded-[1.5rem] shadow-sm">
                                <div className="min-w-0 pr-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                        <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">{e.category.name}</span>
                                    </div>
                                    <h5 className="text-sm font-black uppercase text-amazio-primary dark:text-zinc-100 truncate">{e.item.name}</h5>
                                    <div className="flex gap-2 mt-1.5">
                                        {e.rank > 0 && <span className="text-[8px] font-black px-2 py-0.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">Rank {e.rank}</span>}
                                        {e.gradeName !== '-' && <span className="text-[8px] font-black px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">{e.gradeName}</span>}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-lg font-black tabular-nums ${e.item.type === ItemType.GROUP && globalFilters.itemType.length === 0 ? 'text-zinc-400 line-through decoration-zinc-400/50' : 'text-emerald-600'}`}>
                                        +{e.total}
                                    </div>
                                    <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-tighter">
                                        {e.item.type === ItemType.GROUP && globalFilters.itemType.length === 0 ? 'Group (Excluded)' : 'Points Earned'}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {selectedParticipant?.items.length === 0 && (
                            <div className="py-20 text-center opacity-30 italic uppercase text-[10px] font-black tracking-widest">Registry query pending</div>
                        )}
                    </div>
                </div>
            </DetailModal>

            {/* Reset Points Confirmation Modal */}
            {isResetModalOpen && ReactDOM.createPortal(
                <div 
                    className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200" 
                    onClick={() => !isResetting && setIsResetModalOpen(false)}
                >
                    <div 
                        className="bg-white dark:bg-[#141614] w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-rose-100 dark:border-rose-900/30 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]" 
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-6 sm:p-7 bg-rose-50/60 dark:bg-rose-950/20 border-b border-rose-100/60 dark:border-rose-900/20 flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-rose-500 text-white rounded-2xl shadow-lg shadow-rose-500/20 shrink-0">
                                    <RotateCcw size={24} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black uppercase text-rose-600 dark:text-rose-400 tracking-widest bg-rose-100/80 dark:bg-rose-900/50 px-2 py-0.5 rounded-md">Safety Action</span>
                                    </div>
                                    <h3 className="text-xl font-black font-serif uppercase tracking-tight text-zinc-900 dark:text-white mt-1">Reset Points</h3>
                                </div>
                            </div>
                            <button 
                                disabled={isResetting} 
                                onClick={() => setIsResetModalOpen(false)} 
                                className="p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-xl transition-colors text-zinc-400 disabled:opacity-40"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar">
                            {/* Stats Impact Preview */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block mb-1">Current Points</span>
                                    <span className="text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums">{analytics.stats.totalPoints}</span>
                                    <span className="text-[10px] text-zinc-400 block mt-0.5">Will become 0</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block mb-1">Declared Results</span>
                                    <span className="text-2xl font-black text-zinc-700 dark:text-zinc-300 tabular-nums">{analytics.stats.updatedCount} items</span>
                                    <span className="text-[10px] text-zinc-400 block mt-0.5">Will be cleared</span>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-amber-700 dark:text-amber-400">
                                    <AlertTriangle size={14} /> Confirmation Details:
                                </div>
                                <p className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-300 font-medium">
                                    This operation will clear all published/declared competition results. All team standings, rank tallies, and individual points across the leaderboard, live projector screen, and merit list will reset to zero.
                                </p>
                                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide pt-1">
                                    ✓ Participants, teams, items, and schedule entries remain completely safe and untouched.
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    disabled={isResetting}
                                    onClick={() => setIsResetModalOpen(false)}
                                    className="flex-1 py-3.5 px-4 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={isResetting}
                                    onClick={handleResetPoints}
                                    className="flex-1 py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isResetting ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            <span>Resetting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <RotateCcw size={16} />
                                            <span>Yes, Reset Points</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default PointsPage;