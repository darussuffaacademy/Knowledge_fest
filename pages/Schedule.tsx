import React, { useState, useMemo, useRef, useEffect } from 'react';
import Card from '../components/Card';
import { useFirebase } from '../hooks/useFirebase';
import { ScheduledEvent, PerformanceType } from '../types';
import { 
    Calendar as CalendarIcon, Clock, MapPin, Sparkles, X, Plus, 
    ChevronDown, AlertCircle, Trash2, Edit2, Search, ChevronUp, 
    Check, RefreshCw, Layers, Settings2, CheckCircle2, ClipboardList,
    AlertTriangle, ArrowRightLeft, Layout, RotateCcw, ShieldAlert,
    SlidersHorizontal, Zap, CheckSquare, Filter, Target, LayoutGrid,
    FolderTree, Split, Mic, FileText, Building2, Eye, Timer
} from 'lucide-react';

// --- Time Helpers ---

export const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 9 * 60;
    const clean = timeStr.trim().toUpperCase();
    const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match12) {
        let hours = parseInt(match12[1], 10);
        const minutes = parseInt(match12[2], 10);
        const period = match12[3].toUpperCase();
        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
    }
    const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
        const hours = parseInt(match24[1], 10);
        const minutes = parseInt(match24[2], 10);
        return hours * 60 + minutes;
    }
    return 9 * 60;
};

export const formatMinutesToTime = (totalMinutes: number): string => {
    const normalized = ((totalMinutes % 1440) + 1440) % 1440;
    let hours = Math.floor(normalized / 60);
    const minutes = normalized % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const strHours = hours < 10 ? `0${hours}` : `${hours}`;
    const strMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${strHours}:${strMinutes} ${period}`;
};

// --- Color Helpers ---

const CUSTOM_PALETTE = ['#006994', '#d4a574', '#1b5e20', '#80deea', '#e11d48', '#7c3aed', '#d97706', '#0284c7'];

const getDynamicColor = (value: string) => {
    if (!value) return CUSTOM_PALETTE[0];
    let hash = 0;
    for (let i = 0; i < value.length; i++) hash = value.charCodeAt(i) + ((hash << 5) - hash);
    return CUSTOM_PALETTE[Math.abs(hash) % CUSTOM_PALETTE.length];
};

const getCategoryColor = (name: string) => {
    if (!name) return 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700';
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const colors = [
        'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800',
        'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
        'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
        'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800',
        'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
        'bg-cyan-50 text-cyan-700 border-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800',
        'bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800',
    ];
    return colors[Math.abs(hash) % colors.length];
};

const classifyCategory = (categoryName: string = '', categoryId: string = ''): 'G_ZONE' | 'SUB_ZONE' | 'HIGH_ZONE' | 'OTHER' => {
    const norm = `${categoryName} ${categoryId}`.toLowerCase().trim();
    if (norm.includes('general') || norm.includes('g-zone') || norm.includes('g zone') || norm.includes('gzone') || norm === 'g') {
        return 'G_ZONE';
    }
    if (norm.includes('sub') || norm.includes('junior') || norm.includes('primary') || norm.includes('minor') || norm.includes('kids')) {
        return 'SUB_ZONE';
    }
    if (norm.includes('high') || norm.includes('senior') || norm.includes('super senior') || norm.includes('major') || norm.includes('kulliyya')) {
        return 'HIGH_ZONE';
    }
    return 'OTHER';
};

const SectionTitle = ({ title, icon: Icon, accentColor = "indigo" }: { title: string, icon?: any, accentColor?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'purple' }) => {
    const barColors = {
        indigo: 'bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.4)]',
        emerald: 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]',
        amber: 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]',
        rose: 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]',
        purple: 'bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.4)]',
    };

    return (
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className={`h-4 sm:h-5 w-1.5 rounded-full ${barColors[accentColor]}`}></div>
            <h3 className="text-base sm:text-xl font-black font-serif text-amazio-primary dark:text-white uppercase tracking-tighter">
                {title}
            </h3>
            {Icon && <Icon className="text-zinc-400 ml-1" size={16} />}
        </div>
    );
};

interface ChipInputProps {
    label: string;
    description: string;
    values: string[];
    onChange: (newValues: string[]) => void;
    suggestions?: string[];
    placeholder?: string;
    icon?: React.ElementType;
    colorScheme: 'indigo' | 'emerald' | 'amber';
}

const ChipInput: React.FC<ChipInputProps> = ({ label, description, values, onChange, suggestions = [], placeholder, icon: Icon, colorScheme }) => {
    const [inputValue, setInputValue] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const schemes = {
        indigo: { 
            chip: 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800',
            add: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20'
        },
        emerald: { 
            chip: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
            add: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'
        },
        amber: { 
            chip: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
            add: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20'
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) setShowSuggestions(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAdd = (val: string) => {
        const trimmed = val.trim();
        if (trimmed && !values.includes(trimmed)) {
            onChange([...values, trimmed]);
            setInputValue('');
            inputRef.current?.focus();
            setShowSuggestions(false);
        }
    };

    return (
        <div className="w-full" ref={containerRef}>
            <div className="flex justify-between items-center mb-1.5 px-1">
                <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 flex items-center gap-1.5">
                    {Icon && <Icon size={11} />}
                    {label}
                </label>
                {values.length > 0 && (
                    <button onClick={() => onChange([])} className="text-[8px] font-black uppercase tracking-wider text-rose-500/60 hover:text-rose-500 transition-colors">
                        Clear
                    </button>
                )}
            </div>
            <div 
                className="relative flex flex-wrap items-center gap-1.5 p-2.5 sm:p-3 min-h-[44px] sm:min-h-[52px] rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-black/20 transition-all"
                onClick={() => inputRef.current?.focus()}
            >
                {values.map((val, idx) => (
                    <span key={idx} className={`inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-[10px] sm:text-xs font-bold border shadow-sm animate-in zoom-in-95 duration-200 ${schemes[colorScheme].chip}`}>
                        {val}
                        <button onClick={(e) => { e.stopPropagation(); onChange(values.filter((_, i) => i !== idx)); }} className="p-0.5 rounded-full hover:bg-black/5 transition-colors">
                            <X size={10} />
                        </button>
                    </span>
                ))}
                
                <div className="flex-grow relative min-w-[80px]">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(true); }}
                        onKeyDown={e => e.key === 'Enter' && handleAdd(inputValue)}
                        onFocus={() => setShowSuggestions(true)}
                        placeholder={values.length === 0 ? placeholder : '...'}
                        className="w-full bg-transparent outline-none text-[11px] sm:text-sm font-bold text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400"
                    />
                </div>
                {showSuggestions && inputValue.trim() && !values.includes(inputValue.trim()) && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl z-20 p-1">
                        <button onClick={() => handleAdd(inputValue)} className={`w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2 ${schemes[colorScheme].add}`}>
                            <Plus size={12} strokeWidth={3} /> Add "{inputValue}"
                        </button>
                    </div>
                )}
            </div>
            <p className="mt-1.5 text-[8px] sm:text-[9px] text-zinc-400 font-medium px-1 tracking-tight">{description}</p>
        </div>
    );
};

const SchedulePage: React.FC = () => {
    const { 
        state, 
        setSchedule, 
        addScheduleEvent, 
        deleteScheduleEvent, 
        clearSchedule, 
        globalFilters, 
        updateSettings, 
        globalSearchTerm 
    } = useFirebase();

    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    
    // Deletion states
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [showClearAllModal, setShowClearAllModal] = useState(false);
    const [lastDeletedEvent, setLastDeletedEvent] = useState<ScheduledEvent | null>(null);

    // AI Scheduler settings
    const [schedulerMode, setSchedulerMode] = useState<'REPLACE' | 'APPEND'>('REPLACE');
    const [schedulerStartTime, setSchedulerStartTime] = useState<string>('');

    // Categorization & View Modes for Scheduled Events
    const [scheduleGrouping, setScheduleGrouping] = useState<'CATEGORY' | 'STAGE_TYPE' | 'STAGE_VENUE' | 'FLAT'>('CATEGORY');
    const [scheduledTypeFilter, setScheduledTypeFilter] = useState<'ALL' | PerformanceType>('ALL');
    const [scheduledCategoryFilter, setScheduledCategoryFilter] = useState<string>('ALL');

    // Shared Manual Entry & AI Scheduler Target Filters
    const [manualEntry, setManualEntry] = useState({ 
        categoryId: '', 
        performanceType: 'ALL' as 'ALL' | PerformanceType, 
        itemId: '', 
        date: '', 
        time: '', 
        stage: '' 
    });
    const [hideScheduled, setHideScheduled] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState<ScheduledEvent | null>(null);

    const isTimePrimary = state?.settings.scheduleDisplayPriority === 'TIME_FIRST';

    // Auto-dismiss banners
    useEffect(() => {
        if (!successMessage) return;
        const timer = setTimeout(() => setSuccessMessage(''), 5000);
        return () => clearTimeout(timer);
    }, [successMessage]);

    useEffect(() => {
        if (!error) return;
        const timer = setTimeout(() => setError(''), 6000);
        return () => clearTimeout(timer);
    }, [error]);

    // Items filtered for Manual Dropdown
    const manualFilteredItems = useMemo(() => {
        if (!state) return [];
        const scheduledItemIds = new Set((state.schedule || []).map(s => s.itemId));
        let items = (state.items || []).filter(i => {
            if (manualEntry.categoryId && i.categoryId !== manualEntry.categoryId) return false;
            if (manualEntry.performanceType !== 'ALL' && i.performanceType !== manualEntry.performanceType) return false;
            if (hideScheduled && scheduledItemIds.has(i.id)) return false;
            return true;
        });
        items.sort((a, b) => a.name.localeCompare(b.name));
        return items;
    }, [state, manualEntry.categoryId, manualEntry.performanceType, hideScheduled]);

    // Items specifically targeted by AI Scheduler based on current Category & Performance Type
    const aiTargetItems = useMemo(() => {
        if (!state) return [];
        const scheduledItemIds = new Set((state.schedule || []).map(s => s.itemId));
        let items = (state.items || []).filter(i => {
            if (manualEntry.categoryId && i.categoryId !== manualEntry.categoryId) return false;
            if (manualEntry.performanceType !== 'ALL' && i.performanceType !== manualEntry.performanceType) return false;
            if (schedulerMode === 'APPEND' && scheduledItemIds.has(i.id)) return false;
            return true;
        });
        return items;
    }, [state, manualEntry.categoryId, manualEntry.performanceType, schedulerMode]);

    const activeCategoryName = useMemo(() => {
        if (!manualEntry.categoryId) return 'All Categories / Zones';
        const cat = (state?.categories || []).find(c => c.id === manualEntry.categoryId);
        return cat?.name || 'Selected Category';
    }, [state, manualEntry.categoryId]);

    const activePerformanceTypeName = useMemo(() => {
        if (manualEntry.performanceType === 'ALL') return 'All Types';
        return manualEntry.performanceType === PerformanceType.ON_STAGE ? 'On Stage' : 'Off Stage';
    }, [manualEntry.performanceType]);

    // Base Filtered & Sorted Schedule
    const processedSchedule = useMemo(() => {
        if (!state) return [];
        let data = [...(state.schedule || [])];

        // Global context filters
        if (globalFilters.stage.length > 0) data = data.filter(s => globalFilters.stage.includes(s.stage));
        if (globalFilters.date.length > 0) data = data.filter(s => globalFilters.date.includes(s.date));
        if (globalFilters.categoryId.length > 0) data = data.filter(s => globalFilters.categoryId.includes(s.categoryId));
        
        // Local in-page categorization filters
        if (scheduledCategoryFilter !== 'ALL') {
            data = data.filter(s => s.categoryId === scheduledCategoryFilter);
        }

        if (scheduledTypeFilter !== 'ALL') {
            data = data.filter(s => {
                const item = (state.items || []).find(i => i.id === s.itemId);
                return item?.performanceType === scheduledTypeFilter;
            });
        }

        // Global search term
        if (globalSearchTerm) {
            const q = globalSearchTerm.toLowerCase();
            data = data.filter(s => {
                const item = (state.items || []).find(i => i.id === s.itemId);
                const category = (state.categories || []).find(c => c.id === s.categoryId);
                return item?.name.toLowerCase().includes(q) || 
                       s.stage.toLowerCase().includes(q) || 
                       s.date.toLowerCase().includes(q) ||
                       category?.name.toLowerCase().includes(q);
            });
        }
        
        const days = state.settings.eventDays || [];

        data.sort((a, b) => {
            const dIdxA = days.indexOf(a.date);
            const dIdxB = days.indexOf(b.date);
            if (dIdxA !== dIdxB) return (dIdxA === -1 ? 999 : dIdxA) - (dIdxB === -1 ? 999 : dIdxB);
            const tA = parseTimeToMinutes(a.time);
            const tB = parseTimeToMinutes(b.time);
            return tA - tB;
        });
        
        return data;
    }, [state, globalFilters, globalSearchTerm, scheduledCategoryFilter, scheduledTypeFilter]);

    // Categorized Groupings for Display
    const scheduleByCategories = useMemo(() => {
        if (!state) return [];
        const catMap = new Map<string, { category: any; events: ScheduledEvent[]; onStageCount: number; offStageCount: number }>();

        // Pre-fill categories to maintain order
        (state.categories || []).forEach(cat => {
            catMap.set(cat.id, { category: cat, events: [], onStageCount: 0, offStageCount: 0 });
        });
        catMap.set('uncategorized', { 
            category: { id: 'uncategorized', name: 'General / Uncategorized' }, 
            events: [], 
            onStageCount: 0, 
            offStageCount: 0 
        });

        processedSchedule.forEach(evt => {
            const key = evt.categoryId && catMap.has(evt.categoryId) ? evt.categoryId : 'uncategorized';
            const group = catMap.get(key)!;
            group.events.push(evt);
            const item = (state.items || []).find(i => i.id === evt.itemId);
            if (item?.performanceType === PerformanceType.ON_STAGE) group.onStageCount++;
            else group.offStageCount++;
        });

        return Array.from(catMap.values()).filter(g => g.events.length > 0);
    }, [state, processedSchedule]);

    const scheduleByStageType = useMemo(() => {
        if (!state) return { onStage: [], offStage: [] };
        const onStage: ScheduledEvent[] = [];
        const offStage: ScheduledEvent[] = [];

        processedSchedule.forEach(evt => {
            const item = (state.items || []).find(i => i.id === evt.itemId);
            if (item?.performanceType === PerformanceType.ON_STAGE) {
                onStage.push(evt);
            } else {
                offStage.push(evt);
            }
        });

        return { onStage, offStage };
    }, [state, processedSchedule]);

    const scheduleByStageVenues = useMemo(() => {
        if (!state) return [];
        const venueMap = new Map<string, ScheduledEvent[]>();
        
        processedSchedule.forEach(evt => {
            const venue = evt.stage || 'Unassigned Venue';
            if (!venueMap.has(venue)) venueMap.set(venue, []);
            venueMap.get(venue)!.push(evt);
        });

        return Array.from(venueMap.entries()).map(([venue, events]) => ({
            venue,
            events
        }));
    }, [state, processedSchedule]);

    // Multi-Day, Multi-Slot & Zone-Aware Sequential Scheduling Algorithm (Client Fallback)
    const generateAlgorithmicSchedule = (
        itemsToSchedule: any[], 
        days: string[], 
        times: string[], 
        stages: string[],
        startingTimeStr: string
    ): ScheduledEvent[] => {
        const schedule: ScheduledEvent[] = [];
        
        // Sort items first by name
        const sortedItems = [...itemsToSchedule].sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

        // Group into zone categories
        const gZoneItems = sortedItems.filter((i: any) => {
            const cat = (state?.categories || []).find(c => c.id === i.categoryId);
            return classifyCategory(cat?.name, i.categoryId) === 'G_ZONE';
        });
        const subZoneItems = sortedItems.filter((i: any) => {
            const cat = (state?.categories || []).find(c => c.id === i.categoryId);
            return classifyCategory(cat?.name, i.categoryId) === 'SUB_ZONE';
        });
        const highZoneItems = sortedItems.filter((i: any) => {
            const cat = (state?.categories || []).find(c => c.id === i.categoryId);
            return classifyCategory(cat?.name, i.categoryId) === 'HIGH_ZONE';
        });
        const otherItems = sortedItems.filter((i: any) => {
            const cat = (state?.categories || []).find(c => c.id === i.categoryId);
            return classifyCategory(cat?.name, i.categoryId) === 'OTHER';
        });

        // Interleave / mingle Sub Zone and High Zone items so every day receives a balanced mix of both
        const mingledSubAndHigh: any[] = [];
        const maxSubHigh = Math.max(subZoneItems.length, highZoneItems.length);
        for (let i = 0; i < maxSubHigh; i++) {
            if (i < subZoneItems.length) mingledSubAndHigh.push(subZoneItems[i]);
            if (i < highZoneItems.length) mingledSubAndHigh.push(highZoneItems[i]);
        }

        const effectiveDays = days.length > 0 ? days : ['Day 1'];
        const effectiveStages = stages.length > 0 ? stages : ['Main Stage'];
        const rawTimes = times.length > 0 ? times : ['09:00 AM', '11:30 AM', '02:00 PM', '04:30 PM'];
        
        // Sort all time slots chronologically
        const sortedSlots = [...rawTimes].sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));

        const numDays = Math.max(effectiveDays.length, 1);
        const gZonePerDay = Math.ceil(gZoneItems.length / numDays);
        const subHighPerDay = Math.ceil(mingledSubAndHigh.length / numDays);
        const otherPerDay = Math.ceil(otherItems.length / numDays);

        let globalStageIdx = 0;

        for (let dayIdx = 0; dayIdx < numDays; dayIdx++) {
            const dayGZone = gZoneItems.slice(dayIdx * gZonePerDay, (dayIdx + 1) * gZonePerDay);
            const daySubHigh = mingledSubAndHigh.slice(dayIdx * subHighPerDay, (dayIdx + 1) * subHighPerDay);
            const dayOther = otherItems.slice(dayIdx * otherPerDay, (dayIdx + 1) * otherPerDay);

            // Combined day items: G-Zone kept intact, Sub/High mingled
            const dayItems = [...dayGZone, ...daySubHigh, ...dayOther];
            if (dayItems.length === 0) continue;

            const currentDate = effectiveDays[dayIdx % effectiveDays.length];

            // Distribute this day's items across all the available configured time slots
            const numSlots = Math.max(sortedSlots.length, 1);
            const itemsPerSlot = Math.ceil(dayItems.length / numSlots);

            for (let slotIdx = 0; slotIdx < numSlots; slotIdx++) {
                const slotItems = dayItems.slice(slotIdx * itemsPerSlot, (slotIdx + 1) * itemsPerSlot);
                if (slotItems.length === 0) continue;

                const slotTimeString = sortedSlots[slotIdx % sortedSlots.length];
                const slotStartMinutes = parseTimeToMinutes(slotTimeString);

                // Track timeline for each stage in this slot starting at slotStartMinutes
                const stageTrackers: { [stageName: string]: number } = {};
                effectiveStages.forEach(stg => {
                    stageTrackers[stg] = slotStartMinutes;
                });

                slotItems.forEach((item) => {
                    // Rotate across all stages so EVERY stage is utilized
                    const stageName = effectiveStages[globalStageIdx % effectiveStages.length];
                    globalStageIdx++;

                    const currentStageTime = stageTrackers[stageName] || slotStartMinutes;
                    const duration = (item.duration && Number(item.duration) > 0) ? Number(item.duration) : 30;

                    const startMinutes = Math.max(currentStageTime, slotStartMinutes);
                    const endMinutes = startMinutes + duration;
                    const time = formatMinutesToTime(startMinutes);

                    schedule.push({
                        id: `sch_${Date.now()}_${dayIdx}_${slotIdx}_${globalStageIdx}_${Math.random().toString(36).substring(2, 6)}`,
                        itemId: item.id,
                        categoryId: item.categoryId || '',
                        date: currentDate,
                        time,
                        stage: stageName
                    });

                    // Advance this specific stage's timeline so the next item starts after this item finishes
                    stageTrackers[stageName] = endMinutes;
                });
            }
        }

        return schedule;
    };

    // Auto Timeline Execution - Duration-Aware AI Scheduling
    const generateScheduleWithAI = async () => {
        if (!state) { 
            setError('System data not loaded.'); 
            return; 
        }

        let eventDays = state.settings.eventDays || [];
        let eventStages = state.settings.stages || [];
        let eventTimes = state.settings.timeSlots || [];

        // If configuration is empty, auto-populate recommended defaults
        if (eventDays.length === 0 || eventStages.length === 0 || eventTimes.length === 0) {
            const defaultDays = eventDays.length > 0 ? eventDays : ['Day 1 (Inaugural)', 'Day 2 (Grand Finale)'];
            const defaultStages = eventStages.length > 0 ? eventStages : ['Main Stage', 'Auditorium A', 'Mini Hall'];
            const defaultTimes = eventTimes.length > 0 ? eventTimes : ['09:00 AM', '11:30 AM', '02:00 PM', '04:30 PM'];

            await updateSettings({
                eventDays: defaultDays,
                stages: defaultStages,
                timeSlots: defaultTimes
            });

            eventDays = defaultDays;
            eventStages = defaultStages;
            eventTimes = defaultTimes;
        }

        const effectiveStartTime = schedulerStartTime || eventTimes[0] || '09:00 AM';
        const scheduledItemIds = new Set((state.schedule || []).map(s => s.itemId));

        // Filter items strictly matching currently active manual entry / scope selection
        const itemsToSchedule = (state.items || []).filter(i => {
            if (manualEntry.categoryId && i.categoryId !== manualEntry.categoryId) return false;
            if (manualEntry.performanceType !== 'ALL' && i.performanceType !== manualEntry.performanceType) return false;
            if (schedulerMode === 'APPEND' && scheduledItemIds.has(i.id)) return false;
            return true;
        });

        if ((state.items || []).length === 0) {
            setError('No competition items registered. Please add items in Data Entry first.');
            return;
        }

        if (itemsToSchedule.length === 0) {
            if (schedulerMode === 'APPEND') {
                setError(`All items for ${activeCategoryName} (${activePerformanceTypeName}) are already scheduled.`);
            } else {
                setError(`No items found matching ${activeCategoryName} (${activePerformanceTypeName}).`);
            }
            return;
        }

        setIsLoading(true); 
        setError('');
        setStatusMessage(`Calculating duration-based timeline for ${itemsToSchedule.length} items (Starting ${effectiveStartTime})...`);

        try {
            // Attach categoryName for AI model understanding
            const itemsWithMetadata = itemsToSchedule.map(item => {
                const cat = (state.categories || []).find(c => c.id === item.categoryId);
                return {
                    ...item,
                    categoryName: cat?.name || ''
                };
            });

            // Call server proxy with filtered items and duration context
            const response = await fetch('/api/generate-schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    eventDays, 
                    eventStages, 
                    eventTimes, 
                    items: itemsWithMetadata,
                    startTime: effectiveStartTime
                })
            });

            let finalEvents: ScheduledEvent[] = [];

            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data.schedule) && data.schedule.length > 0) {
                    finalEvents = data.schedule;
                }
            }

            // Fallback if API returned empty
            if (finalEvents.length === 0) {
                setStatusMessage('Applying duration-sequenced scheduling matrix...');
                finalEvents = generateAlgorithmicSchedule(itemsToSchedule, eventDays, eventTimes, eventStages, effectiveStartTime);
            }

            let resultingSchedule: ScheduledEvent[];
            const hasSpecificFilter = manualEntry.categoryId !== '' || manualEntry.performanceType !== 'ALL';

            if (schedulerMode === 'APPEND') {
                resultingSchedule = [...(state.schedule || []), ...finalEvents];
            } else if (hasSpecificFilter) {
                // Targeted Replace: Remove only the scheduled events for the targeted items, preserving other categories/types
                const targetItemIds = new Set(itemsToSchedule.map(i => i.id));
                const remainingSchedule = (state.schedule || []).filter(s => !targetItemIds.has(s.itemId));
                resultingSchedule = [...remainingSchedule, ...finalEvents];
            } else {
                // Complete replace
                resultingSchedule = finalEvents;
            }

            await setSchedule(resultingSchedule);
            setSuccessMessage(`Duration-aware timeline created for ${finalEvents.length} items (${activeCategoryName} · ${activePerformanceTypeName}) starting at ${effectiveStartTime}!`);
        } catch (e: any) {
            console.warn('AI schedule API error, applying deterministic fallback:', e);
            try {
                const fallbackSchedule = generateAlgorithmicSchedule(itemsToSchedule, eventDays, eventTimes, eventStages, effectiveStartTime);
                let resultingSchedule: ScheduledEvent[];
                const hasSpecificFilter = manualEntry.categoryId !== '' || manualEntry.performanceType !== 'ALL';

                if (schedulerMode === 'APPEND') {
                    resultingSchedule = [...(state.schedule || []), ...fallbackSchedule];
                } else if (hasSpecificFilter) {
                    const targetItemIds = new Set(itemsToSchedule.map(i => i.id));
                    const remainingSchedule = (state.schedule || []).filter(s => !targetItemIds.has(s.itemId));
                    resultingSchedule = [...remainingSchedule, ...fallbackSchedule];
                } else {
                    resultingSchedule = fallbackSchedule;
                }

                await setSchedule(resultingSchedule);
                setSuccessMessage(`Duration-sequenced timeline generated for ${fallbackSchedule.length} items (${activeCategoryName} · ${activePerformanceTypeName})!`);
            } catch (err: any) {
                console.error(err);
                setError('Timeline generation failed. Please verify stage configurations.');
            }
        } finally { 
            setIsLoading(false); 
            setStatusMessage('');
        }
    };

    // 1-Click Load Presets
    const handleLoadPresets = async () => {
        if (!state) return;
        await updateSettings({
            eventDays: ['Day 1', 'Day 2'],
            stages: ['Main Stage', 'Auditorium', 'Conference Hall'],
            timeSlots: ['09:00 AM', '11:30 AM', '02:00 PM', '04:00 PM', '06:00 PM']
        });
        setSuccessMessage('Standard festival dates, stages, and slots loaded!');
    };

    // Single Event Delete Handler
    const handleDeleteEvent = async (event: ScheduledEvent) => {
        setLastDeletedEvent(event);
        if (deleteScheduleEvent) {
            await deleteScheduleEvent(event.id);
        } else {
            const next = (state?.schedule || []).filter(s => s.id !== event.id);
            await setSchedule(next);
        }
        setConfirmDeleteId(null);
        setSuccessMessage(`Removed "${state?.items.find(i => i.id === event.itemId)?.name || 'Event'}" from schedule.`);
    };

    // Undo Delete Handler
    const handleUndoDelete = async () => {
        if (!lastDeletedEvent || !state) return;
        await addScheduleEvent(lastDeletedEvent);
        setLastDeletedEvent(null);
        setSuccessMessage('Restored event to schedule.');
    };

    // Clear All Schedule Handler
    const handleClearAllSchedule = async () => {
        if (clearSchedule) {
            await clearSchedule();
        } else {
            await setSchedule([]);
        }
        setShowClearAllModal(false);
        setSuccessMessage('Schedule timeline cleared.');
    };

    const handleManualAdd = async () => {
        if (!state) return;
        const { itemId, date, time, stage } = manualEntry;
        if (!itemId || !date || !time || !stage) { 
            setError("Please fill out Category, Item, Date, Time, and Stage."); 
            return; 
        }
        const item = state.items.find(i => i.id === itemId);
        await addScheduleEvent({ 
            id: `sch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, 
            itemId, 
            categoryId: item?.categoryId || '', 
            date, 
            time, 
            stage 
        });
        setManualEntry(prev => ({ ...prev, itemId: '' }));
        setSuccessMessage(`Added "${item?.name}" (${item?.duration || 30}m) to timeline.`);
    };

    const handleEditSave = async () => { 
        if (!state || !editFormData) return; 
        const next = (state.schedule || []).map(s => s.id === editFormData.id ? editFormData : s);
        await setSchedule(next); 
        setEditingId(null); 
        setSuccessMessage('Schedule entry updated.');
    };

    const togglePriority = async () => {
        const next = isTimePrimary ? 'DATE_FIRST' : 'TIME_FIRST';
        await updateSettings({ scheduleDisplayPriority: next });
    };

    if (!state) return <div className="p-10 text-center italic text-zinc-500">Synchronizing timeline...</div>;

    const selectClasses = "w-full appearance-none rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#151816] py-2 sm:py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all cursor-pointer";
    const labelClass = "block text-[8px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-zinc-400 mb-1 sm:mb-1.5 ml-1";

    // Reusable Event Card Component with Duration & End-Time Calculation
    const renderEventCard = (event: ScheduledEvent) => {
        const isEditing = editingId === event.id;
        const isConfirmingDelete = confirmDeleteId === event.id;
        const item = (state.items || []).find(i => i.id === event.itemId);
        const category = (state.categories || []).find(c => c.id === event.categoryId);
        const catColor = getCategoryColor(category?.name || '');
        const stageColor = getDynamicColor(event.stage);
        const isOnStage = item?.performanceType === PerformanceType.ON_STAGE;
        const duration = (item?.duration && Number(item.duration) > 0) ? Number(item.duration) : 30;
        
        const startMinutes = parseTimeToMinutes(event.time);
        const endMinutes = startMinutes + duration;
        const endTimeStr = formatMinutesToTime(endMinutes);

        return (
            <div 
                key={event.id} 
                className={`group relative bg-white dark:bg-[#151816] rounded-[1.2rem] sm:rounded-[2.2rem] border-2 transition-all duration-300 hover:-translate-y-1 shadow-sm flex flex-col justify-between ${
                    isEditing 
                        ? 'border-indigo-500 shadow-md ring-2 ring-indigo-500/10' 
                        : isConfirmingDelete
                            ? 'border-rose-500 ring-2 ring-rose-500/20'
                            : 'border-zinc-100 dark:border-white/5 hover:border-zinc-200 dark:hover:border-zinc-700'
                }`}
            >
                {isEditing && editFormData ? (
                    <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[8px] sm:text-[10px] font-black uppercase text-indigo-500 tracking-widest">Editing Entry</span>
                            <div className="flex gap-1.5">
                                <button onClick={handleEditSave} className="p-1.5 bg-emerald-500 text-white rounded-lg shadow-sm hover:bg-emerald-600 transition-colors"><Check size={14} strokeWidth={3}/></button>
                                <button onClick={() => setEditingId(null)} className="p-1.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-500 rounded-lg hover:bg-zinc-300 transition-colors"><X size={14} strokeWidth={3}/></button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                            <div className="relative">
                                <select value={editFormData.date || ''} onChange={e => setEditFormData({...editFormData, date: e.target.value})} className="w-full appearance-none p-2 bg-zinc-50 dark:bg-zinc-900 border rounded-lg text-[10px] font-bold outline-none focus:ring-1 focus:ring-indigo-500">{(state.settings.eventDays || []).map(d => <option key={d} value={d}>{d}</option>)}</select>
                                <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                            </div>
                            <div className="relative">
                                <input 
                                    type="text"
                                    value={editFormData.time || ''} 
                                    onChange={e => setEditFormData({...editFormData, time: e.target.value})} 
                                    placeholder="04:00 PM"
                                    className="w-full p-2 bg-zinc-50 dark:bg-zinc-900 border rounded-lg text-[10px] font-bold outline-none focus:ring-1 focus:ring-indigo-500" 
                                />
                            </div>
                            <div className="relative col-span-2">
                                <select value={editFormData.stage || ''} onChange={e => setEditFormData({...editFormData, stage: e.target.value})} className="w-full appearance-none p-2 bg-zinc-50 dark:bg-zinc-900 border rounded-lg text-[10px] font-bold outline-none focus:ring-1 focus:ring-indigo-500">{(state.settings.stages || []).map(s => <option key={s} value={s}>{s}</option>)}</select>
                                <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="p-4 sm:p-6 pb-0">
                            <div className="flex justify-between items-start mb-2 sm:mb-4">
                                <div className="flex flex-col min-w-0 pr-2">
                                    {isTimePrimary ? (
                                        <>
                                            <div className="flex items-baseline gap-1.5 flex-wrap">
                                                <span className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter leading-none">
                                                    {event.time}
                                                </span>
                                                <span className="text-[10px] sm:text-xs font-bold text-zinc-400">
                                                    → {endTimeStr}
                                                </span>
                                            </div>
                                            <span className="text-[8px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5 sm:mt-1 truncate">{event.date}</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter leading-none truncate">{event.date}</span>
                                            <div className="flex items-baseline gap-1.5 mt-0.5 sm:mt-1 flex-wrap">
                                                <span className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tight">
                                                    {event.time}
                                                </span>
                                                <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400">
                                                    → {endTimeStr}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Event Card Actions */}
                                <div className="flex items-center gap-1 shrink-0">
                                    {isConfirmingDelete ? (
                                        <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 p-1 rounded-xl border border-rose-200 dark:border-rose-900 animate-in zoom-in-95">
                                            <button 
                                                onClick={() => handleDeleteEvent(event)} 
                                                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors shadow-sm"
                                                title="Confirm Deletion"
                                            >
                                                Delete
                                            </button>
                                            <button 
                                                onClick={() => setConfirmDeleteId(null)} 
                                                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                                                title="Cancel"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <button 
                                                onClick={() => { setEditingId(event.id); setEditFormData(event); }} 
                                                className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-zinc-800 rounded-lg transition-all"
                                                title="Edit Event Schedule"
                                            >
                                                <Edit2 size={14}/>
                                            </button>
                                            <button 
                                                onClick={() => setConfirmDeleteId(event.id)} 
                                                className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-zinc-800 rounded-lg transition-all"
                                                title="Delete Event from Schedule"
                                            >
                                                <Trash2 size={14}/>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="mb-3 sm:mb-4">
                                <h4 className="text-sm sm:text-lg font-black text-amazio-primary dark:text-white uppercase tracking-tight leading-tight mb-1 sm:mb-2 line-clamp-1">
                                    {item?.name || 'Unassigned Item'}
                                </h4>
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className={`inline-block px-2 py-0.5 rounded-md text-[7px] sm:text-[9px] font-black uppercase tracking-widest border ${catColor}`}>
                                        {category?.name || 'General Zone'}
                                    </span>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[7px] sm:text-[9px] font-black uppercase tracking-widest border ${
                                        isOnStage 
                                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' 
                                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
                                    }`}>
                                        {isOnStage ? <Mic size={9} /> : <FileText size={9} />}
                                        {isOnStage ? 'On Stage' : 'Off Stage'}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[7px] sm:text-[9px] font-black uppercase tracking-widest border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">
                                        <Timer size={9} />
                                        {duration}m
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto p-4 sm:p-6 pt-3 sm:pt-4 border-t border-zinc-50 dark:border-white/5 flex items-center justify-between bg-zinc-50/40 dark:bg-black/10 rounded-b-[1.2rem] sm:rounded-b-[2.2rem]">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <MapPin size={12} style={{ color: stageColor }} />
                                <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest truncate" style={{ color: stageColor }}>
                                    {event.stage}
                                </span>
                            </div>
                            <div className="text-[7px] sm:text-[9px] font-bold text-zinc-400 uppercase tracking-wider shrink-0">
                                {event.date}
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 sm:space-y-10 animate-in fade-in duration-500 pb-24 relative">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h2 className="text-3xl sm:text-5xl font-black font-serif text-amazio-primary dark:text-white tracking-tighter uppercase leading-none">Event Schedule</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-2 sm:mt-3 font-medium text-sm sm:text-lg italic">Duration-aware timeline management, categorized stage scheduling, and festival logistics.</p>
                </div>
                {lastDeletedEvent && (
                    <button 
                        onClick={handleUndoDelete}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
                    >
                        <RotateCcw size={14} /> Undo Last Delete
                    </button>
                )}
            </div>

            {/* Notifications */}
            {successMessage && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-bold flex items-center justify-between shadow-sm animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2.5">
                        <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
                        <span>{successMessage}</span>
                    </div>
                    <button onClick={() => setSuccessMessage('')} className="p-1 hover:bg-emerald-500/20 rounded-lg transition-colors">
                        <X size={14} />
                    </button>
                </div>
            )}

            {error && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-bold flex items-center justify-between shadow-sm animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2.5">
                        <AlertTriangle size={18} className="shrink-0 text-rose-500" />
                        <span>{error}</span>
                    </div>
                    <button onClick={() => setError('')} className="p-1 hover:bg-rose-500/20 rounded-lg transition-colors">
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* AI Scheduler & Auto Timeline Card */}
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:bg-zinc-900/50 rounded-[1.5rem] sm:rounded-[2.5rem] border border-amber-500/30 p-6 sm:p-10 shadow-glass-light dark:shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Sparkles size={140} className="text-amber-500" />
                </div>
                
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 sm:gap-10 relative z-10">
                    <div className="max-w-2xl space-y-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-500 text-white shadow-sm flex items-center gap-1">
                                    <Zap size={10} fill="currentColor" /> Duration-Aware Intelligent Orchestrator
                                </span>
                            </div>
                            <SectionTitle title="Auto Timeline & AI Scheduler" icon={Sparkles} accentColor="amber" />
                            <p className="text-zinc-600 dark:text-zinc-400 text-xs sm:text-base leading-relaxed font-medium">
                                Mingles Sub Zone & High Zone programmes evenly across competition days while keeping G-Zone intact, utilizing all updated time slots ({(state.settings.timeSlots || []).join(', ') || 'configured slots'}) and stages with zero simultaneous stage overlaps.
                            </p>
                        </div>

                        {/* Active Scope Badge and Controls */}
                        <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-amber-500 text-white rounded-xl shadow-sm">
                                    <Target size={16} />
                                </div>
                                <div>
                                    <div className="text-[9px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
                                        Active Scheduling Scope & Slots
                                    </div>
                                    <div className="text-xs sm:text-sm font-black text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5 flex-wrap">
                                        <span className="text-indigo-600 dark:text-indigo-400">{activeCategoryName}</span>
                                        <span className="text-zinc-400">•</span>
                                        <span className="text-emerald-600 dark:text-emerald-400">{activePerformanceTypeName}</span>
                                        <span className="text-zinc-400">•</span>
                                        <span className="text-amber-600 dark:text-amber-400">{(state.settings.timeSlots || []).length} Active Slots</span>
                                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                                            {aiTargetItems.length} items targeted
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex items-center bg-white dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm shrink-0">
                                    <button 
                                        onClick={() => setSchedulerMode('REPLACE')}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${schedulerMode === 'REPLACE' ? 'bg-amber-500 text-white shadow' : 'text-zinc-400 hover:text-zinc-600'}`}
                                    >
                                        {manualEntry.categoryId || manualEntry.performanceType !== 'ALL' ? 'Replace Scope' : 'Replace All'}
                                    </button>
                                    <button 
                                        onClick={() => setSchedulerMode('APPEND')}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${schedulerMode === 'APPEND' ? 'bg-amber-500 text-white shadow' : 'text-zinc-400 hover:text-zinc-600'}`}
                                    >
                                        Append Unscheduled
                                    </button>
                                </div>
                            </div>
                        </div>

                        {((state.settings.eventDays || []).length === 0 || (state.settings.stages || []).length === 0) && (
                            <button 
                                onClick={handleLoadPresets}
                                className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white dark:bg-zinc-800 border border-amber-300 text-amber-700 dark:text-amber-400 hover:bg-amber-50 transition-all shadow-sm flex items-center gap-1.5"
                            >
                                <SlidersHorizontal size={12} /> Auto-Load Default Venues & Days
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
                        <button 
                            onClick={generateScheduleWithAI} 
                            disabled={isLoading || aiTargetItems.length === 0} 
                            className={`w-full sm:w-auto px-6 py-4 sm:px-8 sm:py-5 rounded-2xl font-black uppercase tracking-widest text-xs sm:text-sm shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2.5 ${
                                isLoading || aiTargetItems.length === 0
                                    ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed shadow-none' 
                                    : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-amber-500/25 ring-2 ring-amber-400/50'
                            }`}
                        >
                            {isLoading ? (
                                <>
                                    <RefreshCw className="animate-spin" size={18} />
                                    <span>{statusMessage || 'Computing Timeline...'}</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles size={18} />
                                    <span>
                                        {aiTargetItems.length === 0 
                                            ? 'No Items In Scope' 
                                            : `Schedule Scope (${aiTargetItems.length})`}
                                    </span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* 1. Manual Entry */}
            <div className="bg-white/60 dark:bg-zinc-900/60 rounded-[1.5rem] sm:rounded-[2.5rem] border border-amazio-primary/5 dark:border-white/5 p-4 sm:p-8 shadow-glass-light dark:shadow-2xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                    <SectionTitle title="1. Manual Entry & Scope Filters" icon={Layers} accentColor="emerald" />
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Type Scope:</span>
                        <div className="inline-flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700">
                            <button 
                                type="button"
                                onClick={() => setManualEntry(prev => ({ ...prev, performanceType: 'ALL', itemId: '' }))}
                                className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${manualEntry.performanceType === 'ALL' ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
                            >
                                All
                            </button>
                            <button 
                                type="button"
                                onClick={() => setManualEntry(prev => ({ ...prev, performanceType: PerformanceType.ON_STAGE, itemId: '' }))}
                                className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${manualEntry.performanceType === PerformanceType.ON_STAGE ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
                            >
                                On Stage
                            </button>
                            <button 
                                type="button"
                                onClick={() => setManualEntry(prev => ({ ...prev, performanceType: PerformanceType.OFF_STAGE, itemId: '' }))}
                                className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${manualEntry.performanceType === PerformanceType.OFF_STAGE ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
                            >
                                Off Stage
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 items-end">
                    <div className="lg:col-span-1">
                        <label className={labelClass}>Category / Zone</label>
                        <div className="relative">
                            <select value={manualEntry.categoryId} onChange={e => setManualEntry({ ...manualEntry, categoryId: e.target.value, itemId: '' })} className={selectClasses}>
                                <option value="">All Categories / Zones</option>
                                {(state.categories || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <label className={labelClass}>Stage Performance</label>
                        <div className="relative">
                            <select 
                                value={manualEntry.performanceType} 
                                onChange={e => setManualEntry({ ...manualEntry, performanceType: e.target.value as any, itemId: '' })} 
                                className={selectClasses}
                            >
                                <option value="ALL">All Types</option>
                                <option value={PerformanceType.ON_STAGE}>On Stage</option>
                                <option value={PerformanceType.OFF_STAGE}>Off Stage</option>
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="flex justify-between items-center mb-1 px-1">
                            <label className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Target Item ({manualFilteredItems.length})</label>
                            <label className="flex items-center gap-1 cursor-pointer">
                                <input type="checkbox" checked={hideScheduled} onChange={e => setHideScheduled(e.target.checked)} className="rounded border-zinc-300 h-2.5 w-2.5" />
                                <span className="text-[7px] sm:text-[9px] font-black text-zinc-400 uppercase tracking-wider">Hide</span>
                            </label>
                        </div>
                        <div className="relative">
                            <select value={manualEntry.itemId} onChange={e => setManualEntry({ ...manualEntry, itemId: e.target.value })} className={selectClasses}>
                                <option value="">-- Choose Item --</option>
                                {manualFilteredItems.map(i => (
                                    <option key={i.id} value={i.id}>
                                        {i.name} ({i.duration || 30}m) ({i.performanceType === PerformanceType.ON_STAGE ? 'On-Stage' : 'Off-Stage'})
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 lg:col-span-2">
                        <div>
                            <label className={labelClass}>Date</label>
                            <div className="relative">
                                <select value={manualEntry.date} onChange={e => setManualEntry({...manualEntry, date: e.target.value})} className={selectClasses}>
                                    <option value="">Date</option>
                                    {(state.settings.eventDays || []).map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Time</label>
                            <div className="relative">
                                <select value={manualEntry.time} onChange={e => setManualEntry({...manualEntry, time: e.target.value})} className={selectClasses}>
                                    <option value="">Time</option>
                                    {(state.settings.timeSlots || []).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <div className="flex-grow">
                            <label className={labelClass}>Stage / Venue</label>
                            <div className="relative">
                                <select value={manualEntry.stage} onChange={e => setManualEntry({...manualEntry, stage: e.target.value})} className={selectClasses}>
                                    <option value="">Stage</option>
                                    {(state.settings.stages || []).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                            </div>
                        </div>
                        <button 
                            onClick={handleManualAdd} 
                            title="Add Scheduled Event"
                            className="h-[36px] sm:h-[48px] px-4 sm:px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-95 shrink-0"
                        >
                            <Plus size={20} strokeWidth={3}/>
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. Scheduled Events with Categorization by Zones and Stages */}
            <div className="space-y-6">
                <div className="bg-white/60 dark:bg-zinc-900/60 rounded-[1.5rem] sm:rounded-[2.5rem] border border-amazio-primary/5 dark:border-white/5 p-4 sm:p-6 shadow-glass-light dark:shadow-2xl">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div>
                            <SectionTitle title="2. Scheduled Events Matrix" icon={ClipboardList} accentColor="indigo" />
                            <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium -mt-3">
                                Sequenced timeline of events showing calculated start and end times based on item durations.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
                            {/* Grouping Mode Switcher */}
                            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-inner">
                                <button
                                    onClick={() => setScheduleGrouping('CATEGORY')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                        scheduleGrouping === 'CATEGORY' 
                                            ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                                            : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                                    }`}
                                    title="Categorize by Zones / Categories"
                                >
                                    <FolderTree size={13} />
                                    <span>By Zones</span>
                                </button>
                                <button
                                    onClick={() => setScheduleGrouping('STAGE_TYPE')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                        scheduleGrouping === 'STAGE_TYPE' 
                                            ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                                            : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                                    }`}
                                    title="Categorize by On Stage vs Off Stage"
                                >
                                    <Split size={13} />
                                    <span>On/Off Stage</span>
                                </button>
                                <button
                                    onClick={() => setScheduleGrouping('STAGE_VENUE')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                        scheduleGrouping === 'STAGE_VENUE' 
                                            ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                                            : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                                    }`}
                                    title="Categorize by Stage Venues"
                                >
                                    <Building2 size={13} />
                                    <span>By Venue</span>
                                </button>
                                <button
                                    onClick={() => setScheduleGrouping('FLAT')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                        scheduleGrouping === 'FLAT' 
                                            ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                                            : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                                    }`}
                                    title="Unified Timeline View"
                                >
                                    <LayoutGrid size={13} />
                                    <span>All</span>
                                </button>
                            </div>

                            <button 
                                onClick={togglePriority}
                                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 transition-all shadow-sm"
                            >
                                <ArrowRightLeft size={13} strokeWidth={2.5} />
                                <span>{isTimePrimary ? 'Time First' : 'Date First'}</span>
                            </button>

                            {(state.schedule || []).length > 0 && (
                                <button 
                                    onClick={() => setShowClearAllModal(true)}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-all shadow-sm"
                                >
                                    <Trash2 size={13} />
                                    <span>Clear</span>
                                </button>
                            )}

                            <div className="text-[9px] sm:text-[10px] font-black uppercase text-zinc-400 tracking-widest px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl shrink-0">
                                {processedSchedule.length} Entries
                            </div>
                        </div>
                    </div>

                    {/* Secondary Filter Pills */}
                    <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1">
                            <Filter size={10} /> Quick Filter:
                        </span>

                        {/* Stage Performance Filter */}
                        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/60 p-0.5 rounded-lg border border-zinc-200/60 dark:border-zinc-700/60">
                            <button 
                                onClick={() => setScheduledTypeFilter('ALL')}
                                className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${scheduledTypeFilter === 'ALL' ? 'bg-white dark:bg-zinc-900 text-indigo-600 shadow-xs' : 'text-zinc-500'}`}
                            >
                                Both Types
                            </button>
                            <button 
                                onClick={() => setScheduledTypeFilter(PerformanceType.ON_STAGE)}
                                className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${scheduledTypeFilter === PerformanceType.ON_STAGE ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-xs' : 'text-zinc-500'}`}
                            >
                                <Mic size={9} /> On Stage
                            </button>
                            <button 
                                onClick={() => setScheduledTypeFilter(PerformanceType.OFF_STAGE)}
                                className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${scheduledTypeFilter === PerformanceType.OFF_STAGE ? 'bg-white dark:bg-zinc-900 text-emerald-600 shadow-xs' : 'text-zinc-500'}`}
                            >
                                <FileText size={9} /> Off Stage
                            </button>
                        </div>

                        {/* Category Filter Pills */}
                        <div className="flex items-center gap-1 overflow-x-auto max-w-full py-0.5">
                            <button 
                                onClick={() => setScheduledCategoryFilter('ALL')}
                                className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all ${
                                    scheduledCategoryFilter === 'ALL' 
                                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-xs' 
                                        : 'bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800'
                                }`}
                            >
                                All Zones
                            </button>
                            {(state.categories || []).map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setScheduledCategoryFilter(cat.id)}
                                    className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all ${
                                        scheduledCategoryFilter === cat.id 
                                            ? 'bg-indigo-600 text-white border-transparent shadow-sm' 
                                            : 'bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                                    }`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Grouped View Content */}
                {processedSchedule.length === 0 ? (
                    <div className="py-16 text-center rounded-[2rem] border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20">
                        <CalendarIcon size={36} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
                        <h4 className="text-sm font-black uppercase tracking-widest text-zinc-400">No Scheduled Events In Current View</h4>
                        <p className="text-xs text-zinc-400 mt-1">Adjust your filters or use the Auto Timeline button to generate events.</p>
                    </div>
                ) : scheduleGrouping === 'CATEGORY' ? (
                    /* 1. Categorized by Zones / Categories */
                    <div className="space-y-8 animate-in fade-in duration-300">
                        {scheduleByCategories.map((group) => {
                            const catColor = getCategoryColor(group.category?.name || '');
                            return (
                                <div key={group.category.id} className="bg-white/40 dark:bg-zinc-900/40 rounded-[2rem] border border-zinc-100 dark:border-white/5 p-4 sm:p-8 space-y-4 shadow-sm">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-zinc-100 dark:border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="h-4 w-1.5 rounded-full bg-indigo-500"></div>
                                            <h3 className="text-lg sm:text-xl font-black font-serif text-amazio-primary dark:text-white uppercase tracking-tight">
                                                {group.category.name}
                                            </h3>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${catColor}`}>
                                                Zone Group
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200 dark:border-blue-900/50 flex items-center gap-1">
                                                <Mic size={11} /> {group.onStageCount} On Stage
                                            </span>
                                            <span className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-1">
                                                <FileText size={11} /> {group.offStageCount} Off Stage
                                            </span>
                                            <span className="px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] font-black">
                                                {group.events.length} Total
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 pt-2">
                                        {group.events.map(event => renderEventCard(event))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : scheduleGrouping === 'STAGE_TYPE' ? (
                    /* 2. Categorized by Stage (On Stage vs Off Stage) */
                    <div className="space-y-10 animate-in fade-in duration-300">
                        {/* On Stage Section */}
                        <div className="bg-blue-500/5 dark:bg-blue-950/20 rounded-[2rem] border border-blue-500/20 p-4 sm:p-8 space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-blue-500/20">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-blue-500 text-white rounded-2xl shadow-sm">
                                        <Mic size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl sm:text-2xl font-black font-serif text-blue-900 dark:text-blue-100 uppercase tracking-tight">
                                            On-Stage Competitions
                                        </h3>
                                        <p className="text-xs text-blue-700/70 dark:text-blue-300/70 font-medium">
                                            Stage presentations, elocutions, dramatics, songs, and main venue items.
                                        </p>
                                    </div>
                                </div>
                                <span className="px-3 py-1.5 rounded-xl bg-blue-500 text-white text-xs font-black uppercase tracking-wider shadow-sm">
                                    {scheduleByStageType.onStage.length} Events
                                </span>
                            </div>

                            {scheduleByStageType.onStage.length === 0 ? (
                                <p className="text-xs text-zinc-400 py-6 text-center italic">No on-stage events scheduled.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 pt-2">
                                    {scheduleByStageType.onStage.map(event => renderEventCard(event))}
                                </div>
                            )}
                        </div>

                        {/* Off Stage Section */}
                        <div className="bg-emerald-500/5 dark:bg-emerald-950/20 rounded-[2rem] border border-emerald-500/20 p-4 sm:p-8 space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-emerald-500/20">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-emerald-500 text-white rounded-2xl shadow-sm">
                                        <FileText size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl sm:text-2xl font-black font-serif text-emerald-900 dark:text-emerald-100 uppercase tracking-tight">
                                            Off-Stage Competitions
                                        </h3>
                                        <p className="text-xs text-emerald-700/70 dark:text-emerald-300/70 font-medium">
                                            Written competitions, arts, calligraphy, and hall assignments.
                                        </p>
                                    </div>
                                </div>
                                <span className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-black uppercase tracking-wider shadow-sm">
                                    {scheduleByStageType.offStage.length} Events
                                </span>
                            </div>

                            {scheduleByStageType.offStage.length === 0 ? (
                                <p className="text-xs text-zinc-400 py-6 text-center italic">No off-stage events scheduled.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 pt-2">
                                    {scheduleByStageType.offStage.map(event => renderEventCard(event))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : scheduleGrouping === 'STAGE_VENUE' ? (
                    /* 3. Categorized by Stage Venues */
                    <div className="space-y-8 animate-in fade-in duration-300">
                        {scheduleByStageVenues.map((group) => {
                            const stageColor = getDynamicColor(group.venue);
                            return (
                                <div key={group.venue} className="bg-white/40 dark:bg-zinc-900/40 rounded-[2rem] border border-zinc-100 dark:border-white/5 p-4 sm:p-8 space-y-4 shadow-sm">
                                    <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-white/5">
                                        <div className="flex items-center gap-2.5">
                                            <MapPin size={18} style={{ color: stageColor }} />
                                            <h3 className="text-lg sm:text-xl font-black font-serif text-amazio-primary dark:text-white uppercase tracking-tight">
                                                {group.venue}
                                            </h3>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] font-black">
                                            {group.events.length} Events
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 pt-2">
                                        {group.events.map(event => renderEventCard(event))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* 4. Unified Flat Timeline */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 animate-in fade-in duration-300">
                        {processedSchedule.map(event => renderEventCard(event))}
                    </div>
                )}
            </div>

            {/* 3. Configuration */}
            <div className="bg-white/60 dark:bg-zinc-900/60 rounded-[1.5rem] sm:rounded-[2.5rem] border border-amazio-primary/5 dark:border-white/5 p-4 sm:p-8 shadow-glass-light dark:shadow-2xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <SectionTitle title="3. Stage & Timeline Configuration" icon={Settings2} />
                    <button 
                        onClick={handleLoadPresets}
                        className="text-[10px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1"
                    >
                        <RotateCcw size={12} /> Reset to Recommended Defaults
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-10 items-start">
                    <ChipInput label="Competition Days" description="Define the festival dates (e.g. Day 1, Day 2)." values={state.settings.eventDays || []} onChange={(d) => updateSettings({ eventDays: d })} icon={CalendarIcon} colorScheme="indigo" />
                    <ChipInput label="Stages & Venues" description="Map performance areas (e.g. Main Stage, Hall A)." values={state.settings.stages || []} onChange={(s) => updateSettings({ stages: s })} icon={MapPin} colorScheme="emerald" />
                    <ChipInput label="Standard Slots / Starting Times" description="Time periods or session starting anchors (e.g. 09:00 AM, 04:00 PM)." values={state.settings.timeSlots || []} onChange={(t) => updateSettings({ timeSlots: t })} icon={Clock} colorScheme="amber" />
                </div>
                
                <div className="mt-8 pt-8 border-t border-zinc-100 dark:border-white/5">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-6 bg-zinc-50/50 dark:bg-black/20 rounded-[2rem] border border-zinc-100 dark:border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                                <Layout size={24} />
                            </div>
                            <div>
                                <h4 className="text-sm sm:text-base font-black uppercase tracking-tight text-amazio-primary dark:text-white">Primary Display Identity</h4>
                                <p className="text-[10px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400">Toggle whether Time or Date is shown most prominently on schedule cards.</p>
                            </div>
                        </div>
                        <div className="flex bg-white dark:bg-zinc-900 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm shrink-0">
                            <button 
                                onClick={() => updateSettings({ scheduleDisplayPriority: 'TIME_FIRST' })}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isTimePrimary ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-600'}`}
                            >
                                Time First
                            </button>
                            <button 
                                onClick={() => updateSettings({ scheduleDisplayPriority: 'DATE_FIRST' })}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isTimePrimary ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-600'}`}
                            >
                                Date First
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom Clear All Schedule Confirmation Modal */}
            {showClearAllModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2rem] shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 text-rose-500">
                            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl">
                                <ShieldAlert size={28} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight text-amazio-primary dark:text-white">Clear Schedule Timeline?</h3>
                                <p className="text-xs text-zinc-500">This will remove all {state.schedule?.length || 0} scheduled events.</p>
                            </div>
                        </div>

                        <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
                            Are you sure you want to remove all events from the schedule timeline? You can regenerate them anytime using the Auto Timeline button.
                        </p>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button 
                                onClick={() => setShowClearAllModal(false)}
                                className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleClearAllSchedule}
                                className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20 transition-all active:scale-95"
                            >
                                Clear All
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SchedulePage;
