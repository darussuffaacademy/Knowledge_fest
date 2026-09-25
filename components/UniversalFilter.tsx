import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useFirebase } from '../hooks/useFirebase';
import { Filter, X, Check, ChevronDown, CheckSquare, Square, ListRestart, Award, ShieldCheck, Clock, Calendar, MapPin, ClipboardList, Tag, RefreshCw, Users, User } from 'lucide-react';
import { UserRole, PerformanceType, ResultStatus, ItemType } from '../types';
import { TABS } from '../constants';

interface MultiSelectProps {
    label: string;
    options: { id: string; name: string; icon?: React.ElementType }[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    disabled?: boolean;
    icon?: React.ElementType;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ label, options = [], selectedIds = [], onChange, disabled, icon: Icon }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const safeOptions = options || [];
    const safeSelected = selectedIds || [];

    const toggleOption = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (disabled) return;
        const next = safeSelected.includes(id) 
            ? safeSelected.filter(v => v !== id)
            : [...safeSelected, id];
        onChange(next);
    };

    const selectExclusive = (id: string) => {
        if (disabled) return;
        onChange([id]);
    };

    const handleSelectAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (safeSelected.length === safeOptions.length) onChange([]);
        else onChange(safeOptions.map(o => o.id));
    };

    const summary = useMemo(() => {
        if (safeSelected.length === 0) return `All ${label}s`;
        if (safeSelected.length === 1) return safeOptions.find(o => o.id === safeSelected[0])?.name || safeSelected[0];
        if (safeSelected.length === safeOptions.length) return `All ${label}s`;
        return `${safeSelected.length} ${label}s`;
    }, [safeSelected, safeOptions, label]);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`flex items-center justify-between w-full sm:w-48 appearance-none rounded-xl border py-2 pl-3 pr-4 text-xs font-bold transition-all shadow-inner
                    ${disabled ? 'opacity-50 cursor-not-allowed bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700' : 
                    safeSelected.length > 0 ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' :
                    'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-500'}`}
            >
                <div className="flex items-center gap-2 truncate pr-2">
                    {Icon && <Icon size={14} className="shrink-0" />}
                    <span className="truncate">{summary}</span>
                </div>
                <ChevronDown size={14} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 z-[100] mt-2 w-64 bg-white dark:bg-[#151816] border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top">
                    <div className="p-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-2">Filter {label}</span>
                         <button onClick={handleSelectAll} className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/30">
                            {safeSelected.length === safeOptions.length ? 'Clear All' : 'Select All'}
                         </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
                        {safeOptions.map((opt) => {
                            const isChecked = safeSelected.includes(opt.id);
                            const OptionIcon = opt.icon;
                            return (
                                <div 
                                    key={opt.id} 
                                    onClick={() => selectExclusive(opt.id)}
                                    className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${isChecked ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'hover:bg-zinc-50 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-400'}`}
                                >
                                    {/* Multiple Selection Control (Checkbox) */}
                                    <div 
                                        onClick={(e) => toggleOption(opt.id, e)}
                                        className={`shrink-0 w-5 h-5 rounded border transition-colors flex items-center justify-center ${isChecked ? 'bg-indigo-600 border-indigo-600 shadow-md' : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600'}`}
                                    >
                                        {isChecked && <Check size={14} className="text-white" strokeWidth={4} />}
                                    </div>
                                    
                                    {/* Shifting Control (Label Text) */}
                                    <div className="flex items-center gap-2 flex-grow min-w-0">
                                        {OptionIcon && <OptionIcon size={12} className="shrink-0 opacity-60" />}
                                        <span className="text-xs font-bold truncate tracking-tight select-none">{opt.name}</span>
                                    </div>
                                </div>
                            );
                        })}
                        {options.length === 0 && <div className="py-8 text-center text-[10px] font-black uppercase tracking-widest text-zinc-400 opacity-50">No items found</div>}
                    </div>
                </div>
            )}
        </div>
    );
};

interface UniversalFilterProps {
    pageTitle?: string;
}

const UniversalFilter: React.FC<UniversalFilterProps> = ({ pageTitle }) => {
    const { state, globalFilters, setGlobalFilters, currentUser } = useFirebase();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const isTeamLeader = currentUser?.role === UserRole.TEAM_LEADER;
    const showItemFilter = pageTitle === TABS.REPORTS;
    const isScoringPage = pageTitle === TABS.SCORING_RESULTS;
    const isSchedulePage = pageTitle === TABS.SCHEDULE;
    const isCodesPage = pageTitle === TABS.GRADE_POINTS;
    const isPointsPage = pageTitle === TABS.POINTS;

    const activeCount = [
        !isScoringPage && !isTeamLeader && !isSchedulePage && !isCodesPage && (globalFilters?.teamId || []).length > 0,
        isScoringPage && (globalFilters?.status || []).length > 0,
        isSchedulePage && (globalFilters?.date || []).length > 0,
        isSchedulePage && (globalFilters?.stage || []).length > 0,
        isCodesPage && (globalFilters?.assignmentStatus || []).length > 0,
        (globalFilters?.categoryId || []).length > 0,
        (globalFilters?.performanceType || []).length > 0,
        (globalFilters?.itemType || []).length > 0,
        showItemFilter && (globalFilters?.itemId || []).length > 0
    ].filter(Boolean).length;

    const filteredItems = useMemo(() => {
        if (!state) return [];
        const catFilter = globalFilters?.categoryId || [];
        return (state.items || [])
            .filter(i => catFilter.length === 0 || catFilter.includes(i.categoryId))
            .sort((a,b) => a.name.localeCompare(b.name));
    }, [state?.items, globalFilters?.categoryId]);

    const handleReset = () => {
        setGlobalFilters({
            teamId: isTeamLeader && currentUser?.teamId ? [currentUser.teamId] : [],
            categoryId: [],
            performanceType: [],
            itemType: [],
            itemId: [],
            status: [],
            date: [],
            stage: [],
            assignmentStatus: []
        });
        setIsMobileOpen(false);
    };

    if (!state) return null;

    const teamOptions = (state.teams || []).map(t => ({ id: t.id, name: t.name }));
    const categoryOptions = (state.categories || []).map(c => ({ id: c.id, name: c.name }));
    const itemOptions = (filteredItems || []).map(i => ({ id: i.id, name: i.name }));
    const performanceOptions = [
        { id: PerformanceType.ON_STAGE, name: 'On Stage', icon: MapPin },
        { id: PerformanceType.OFF_STAGE, name: 'Off Stage', icon: MapPin }
    ];
    const itemTypeOptions = [
        { id: ItemType.SINGLE, name: 'Single', icon: User },
        { id: ItemType.GROUP, name: 'Group', icon: Users }
    ];
    const statusOptions = [
        { id: ResultStatus.DECLARED, name: 'Declared', icon: ShieldCheck },
        { id: ResultStatus.UPDATED, name: 'Updated', icon: RefreshCw },
        { id: ResultStatus.UPLOADED, name: 'Draft', icon: Award },
        { id: ResultStatus.NOT_UPLOADED, name: 'Not Uploaded', icon: Clock }
    ];
    const assignmentOptions = [
        { id: 'ASSIGNED', name: 'Assigned', icon: Tag },
        { id: 'UNASSIGNED', name: 'Unassigned', icon: ClipboardList }
    ];
    
    // Schedule specific options
    const dateOptions = (state?.settings?.eventDays || []).map(d => ({ id: d, name: d }));
    const stageOptions = (state?.settings?.stages || []).map(s => ({ id: s, name: s }));

    const DesktopFilterContent = () => (
        <div className="flex flex-row gap-2.5 items-center bg-white/30 dark:bg-black/20 p-1.5 rounded-2xl border border-amazio-primary/5 dark:border-white/5 backdrop-blur-md">
            {isScoringPage && (
                <MultiSelect 
                    label="Status" 
                    options={statusOptions} 
                    selectedIds={globalFilters.status} 
                    onChange={ids => setGlobalFilters(prev => ({ ...prev, status: ids as ResultStatus[] }))} 
                />
            )}

            {isCodesPage && (
                <MultiSelect 
                    label="Assignment" 
                    options={assignmentOptions} 
                    selectedIds={globalFilters.assignmentStatus} 
                    onChange={ids => setGlobalFilters(prev => ({ ...prev, assignmentStatus: ids }))} 
                />
            )}
            
            {!isScoringPage && !isSchedulePage && !isCodesPage && (
                <MultiSelect 
                    label="Team" 
                    options={teamOptions} 
                    selectedIds={globalFilters.teamId} 
                    onChange={ids => setGlobalFilters(prev => ({ ...prev, teamId: ids }))} 
                    disabled={isTeamLeader}
                />
            )}

            {isSchedulePage && (
                <>
                    <MultiSelect 
                        label="Date" 
                        options={dateOptions} 
                        selectedIds={globalFilters.date} 
                        onChange={ids => setGlobalFilters(prev => ({ ...prev, date: ids }))}
                        icon={Calendar} 
                    />
                    <MultiSelect 
                        label="Stage" 
                        options={stageOptions} 
                        selectedIds={globalFilters.stage} 
                        onChange={ids => setGlobalFilters(prev => ({ ...prev, stage: ids }))}
                        icon={MapPin}
                    />
                </>
            )}

            <MultiSelect 
                label="Category" 
                options={categoryOptions} 
                selectedIds={globalFilters.categoryId} 
                onChange={ids => setGlobalFilters(prev => ({ ...prev, categoryId: ids, itemId: [] }))} 
            />
            
            {!isSchedulePage && (
                <>
                    <MultiSelect 
                        label="Venue" 
                        options={performanceOptions} 
                        selectedIds={globalFilters.performanceType} 
                        onChange={ids => setGlobalFilters(prev => ({ ...prev, performanceType: ids }))} 
                        icon={MapPin}
                    />
                    <MultiSelect 
                        label="Event Type" 
                        options={itemTypeOptions} 
                        selectedIds={globalFilters.itemType} 
                        onChange={ids => setGlobalFilters(prev => ({ ...prev, itemType: ids }))} 
                        icon={Users}
                    />
                </>
            )}

            {showItemFilter && (
                <MultiSelect 
                    label="Item" 
                    options={itemOptions} 
                    selectedIds={globalFilters.itemId} 
                    onChange={ids => setGlobalFilters(prev => ({ ...prev, itemId: ids }))} 
                />
            )}
            {activeCount > 0 && (
                 <button 
                    onClick={handleReset}
                    className="h-9 w-9 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20 transition-all group"
                    title="Clear All Filters"
                >
                    <ListRestart size={16} className="group-hover:rotate-180 transition-transform duration-500" />
                </button>
            )}
        </div>
    );

    return (
        <>
            <div className="hidden lg:block">
                <DesktopFilterContent />
            </div>

            <div className="lg:hidden">
                <button
                    onClick={() => setIsMobileOpen(true)}
                    className={`relative p-2.5 rounded-xl flex items-center gap-2 transition-all border ${
                        activeCount > 0 
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg shadow-indigo-500/20' 
                        : 'bg-white/40 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 border-amazio-primary/10 dark:border-white/10'
                    }`}
                >
                    <Filter size={18} />
                    {activeCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white shadow-lg border-2 border-white dark:border-amazio-bg">
                            {activeCount}
                        </span>
                    )}
                </button>
            </div>

            {isMobileOpen && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[100] lg:hidden flex flex-col justify-end">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileOpen(false)} />
                    <div className="relative w-full bg-white dark:bg-[#0F1210] rounded-t-[2.5rem] shadow-2xl p-6 pt-8 animate-in slide-in-from-bottom duration-300 border-t border-white/10 max-h-[85vh] overflow-y-auto custom-scrollbar">
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black font-serif text-amazio-primary dark:text-white uppercase tracking-tighter">Filter Criteria</h3>
                            <button onClick={handleReset} className="text-[10px] font-black uppercase tracking-widest text-red-500 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-900/10"><ListRestart size={12}/> Reset</button>
                        </div>
                        
                        <div className="space-y-6">
                            {isScoringPage && (
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Result Status</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {statusOptions.map(s => (
                                            <button 
                                                key={s.id} 
                                                onClick={() => {
                                                    const next = globalFilters.status.includes(s.id as ResultStatus) 
                                                        ? globalFilters.status.filter(id => id !== s.id) 
                                                        : [...globalFilters.status, s.id as ResultStatus];
                                                    setGlobalFilters(prev => ({ ...prev, status: next }));
                                                }}
                                                className={`px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-tight text-center border transition-all ${globalFilters.status.includes(s.id as ResultStatus) ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-500 border-zinc-100 dark:border-zinc-800'}`}
                                            >
                                                {s.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {isCodesPage && (
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Assignment Status</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {assignmentOptions.map(s => (
                                            <button 
                                                key={s.id} 
                                                onClick={() => {
                                                    const next = globalFilters.assignmentStatus.includes(s.id) 
                                                        ? globalFilters.assignmentStatus.filter(id => id !== s.id) 
                                                        : [...globalFilters.assignmentStatus, s.id];
                                                    setGlobalFilters(prev => ({ ...prev, assignmentStatus: next }));
                                                }}
                                                className={`px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-tight text-center border transition-all ${globalFilters.assignmentStatus.includes(s.id) ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-500 border-zinc-100 dark:border-zinc-800'}`}
                                            >
                                                {s.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {isSchedulePage && (
                                <>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Event Date</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {dateOptions.map(d => (
                                                <button 
                                                    key={d.id} 
                                                    onClick={() => {
                                                        const next = globalFilters.date.includes(d.id) ? globalFilters.date.filter(id => id !== d.id) : [...globalFilters.date, d.id];
                                                        setGlobalFilters(prev => ({ ...prev, date: next }));
                                                    }}
                                                    className={`px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-tight text-center border transition-all ${globalFilters.date.includes(d.id) ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-500 border-zinc-100 dark:border-zinc-800'}`}
                                                >
                                                    {d.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Venue Stage</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {stageOptions.map(s => (
                                                <button 
                                                    key={s.id} 
                                                    onClick={() => {
                                                        const next = globalFilters.stage.includes(s.id) ? globalFilters.stage.filter(id => id !== s.id) : [...globalFilters.stage, s.id];
                                                        setGlobalFilters(prev => ({ ...prev, stage: next }));
                                                    }}
                                                    className={`px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-tight text-center border transition-all ${globalFilters.stage.includes(s.id) ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-500 border-zinc-100 dark:border-zinc-800'}`}
                                                >
                                                    {s.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {!isScoringPage && !isSchedulePage && !isCodesPage && (
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Team Scopes</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {teamOptions.map(t => (
                                            <button 
                                                key={t.id} 
                                                disabled={isTeamLeader}
                                                onClick={() => {
                                                    const next = globalFilters.teamId.includes(t.id) ? globalFilters.teamId.filter(id => id !== t.id) : [...globalFilters.teamId, t.id];
                                                    setGlobalFilters(prev => ({ ...prev, teamId: next }));
                                                }}
                                                className={`px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-tight text-center border transition-all ${globalFilters.teamId.includes(t.id) ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-500 border-zinc-100 dark:border-zinc-800'}`}
                                            >
                                                {t.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Level / Category</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {categoryOptions.map(c => (
                                        <button 
                                            key={c.id} 
                                            onClick={() => {
                                                const next = globalFilters.categoryId.includes(c.id) ? globalFilters.categoryId.filter(id => id !== c.id) : [...globalFilters.categoryId, c.id];
                                                setGlobalFilters(prev => ({ ...prev, categoryId: next, itemId: [] }));
                                            }}
                                            className={`px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-tight text-center border transition-all ${globalFilters.categoryId.includes(c.id) ? 'bg-amber-500 text-white border-amber-600 shadow-md' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-500 border-zinc-100 dark:border-zinc-800'}`}
                                        >
                                            {c.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {!isSchedulePage && (
                                <>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Performance Venue</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {performanceOptions.map(t => (
                                                <button 
                                                    key={t.id} 
                                                    onClick={() => {
                                                        const next = globalFilters.performanceType.includes(t.id) ? globalFilters.performanceType.filter(id => id !== t.id) : [...globalFilters.performanceType, t.id];
                                                        setGlobalFilters(prev => ({ ...prev, performanceType: next }));
                                                    }}
                                                    className={`px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-tight text-center border transition-all ${globalFilters.performanceType.includes(t.id) ? 'bg-purple-600 text-white border-purple-700 shadow-md' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-500 border-zinc-100 dark:border-zinc-800'}`}
                                                >
                                                    {t.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Event Type</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {itemTypeOptions.map(t => (
                                                <button 
                                                    key={t.id} 
                                                    onClick={() => {
                                                        const next = globalFilters.itemType.includes(t.id) ? globalFilters.itemType.filter(id => id !== t.id) : [...globalFilters.itemType, t.id];
                                                        setGlobalFilters(prev => ({ ...prev, itemType: next }));
                                                    }}
                                                    className={`px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-tight text-center border transition-all ${globalFilters.itemType.includes(t.id) ? 'bg-emerald-600 text-white border-emerald-700 shadow-md' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-500 border-zinc-100 dark:border-zinc-800'}`}
                                                >
                                                    {t.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {showItemFilter && (
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Specific Items</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {itemOptions.map(i => (
                                            <button 
                                                key={i.id} 
                                                onClick={() => {
                                                    const next = globalFilters.itemId.includes(i.id) ? globalFilters.itemId.filter(id => id !== i.id) : [...globalFilters.itemId, i.id];
                                                    setGlobalFilters(prev => ({ ...prev, itemId: next }));
                                                }}
                                                className={`px-3 py-3 rounded-xl text-[11px] font-black uppercase tracking-tight text-left border transition-all flex items-center justify-between ${globalFilters.itemId.includes(i.id) ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-500 border-zinc-100 dark:border-zinc-800'}`}
                                            >
                                                <span className="truncate pr-2">{i.name}</span>
                                                {globalFilters.itemId.includes(i.id) && <Check size={14} strokeWidth={4} />}
                                            </button>
                                        ))}
                                        {itemOptions.length === 0 && <div className="py-8 text-center text-[10px] font-black uppercase tracking-widest text-zinc-400 opacity-50">Choose a category first</div>}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-10 pb-6">
                            <button 
                                onClick={() => setIsMobileOpen(false)}
                                className="w-full py-4 bg-amazio-primary text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
                            >
                                Apply Modifications
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default UniversalFilter;