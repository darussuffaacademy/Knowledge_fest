import React, { useState, useMemo, useRef, useEffect } from 'react';
import Card from '../components/Card';
import { useFirebase } from '../hooks/useFirebase';
import { GoogleGenAI, Type } from "@google/genai";
import { ScheduledEvent, PerformanceType } from '../types';
import { 
    Calendar as CalendarIcon, Clock, MapPin, Sparkles, X, Plus, 
    ChevronDown, AlertCircle, Trash2, Edit2, Search, ChevronUp, 
    Check, RefreshCw, Layers, Settings2, CheckCircle2, ClipboardList,
    AlertTriangle, ArrowRightLeft, Layout
} from 'lucide-react';

// --- Color Helpers ---

const CUSTOM_PALETTE = ['#006994', '#d4a574', '#1b5e20', '#80deea'];

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
    ];
    return colors[Math.abs(hash) % colors.length];
};

const SectionTitle = ({ title, icon: Icon, accentColor = "indigo" }: { title: string, icon?: any, accentColor?: 'indigo' | 'emerald' | 'amber' }) => {
    const barColors = {
        indigo: 'bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.4)]',
        emerald: 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]',
        amber: 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]',
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
    const { state, setSchedule, addScheduleEvent, globalFilters, updateSettings, globalSearchTerm } = useFirebase();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [manualEntry, setManualEntry] = useState({ categoryId: '', itemId: '', date: '', time: '', stage: '' });
    const [hideScheduled, setHideScheduled] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState<ScheduledEvent | null>(null);

    const isTimePrimary = state?.settings.scheduleDisplayPriority === 'TIME_FIRST';

    const manualItemsGrouped = useMemo(() => {
        if (!state) return { onStage: [], offStage: [] };
        const scheduledItemIds = new Set(state.schedule.map(s => s.itemId));
        let items = state.items.filter(i => {
            if (manualEntry.categoryId && i.categoryId !== manualEntry.categoryId) return false;
            if (hideScheduled && scheduledItemIds.has(i.id)) return false;
            return true;
        });
        items.sort((a, b) => a.name.localeCompare(b.name));
        return {
            onStage: items.filter(i => i.performanceType === PerformanceType.ON_STAGE),
            offStage: items.filter(i => i.performanceType === PerformanceType.OFF_STAGE)
        };
    }, [state, manualEntry.categoryId, hideScheduled]);

    const processedSchedule = useMemo(() => {
        if (!state) return [];
        let data = [...state.schedule];
        if (globalFilters.stage.length > 0) data = data.filter(s => globalFilters.stage.includes(s.stage));
        if (globalFilters.date.length > 0) data = data.filter(s => globalFilters.date.includes(s.date));
        if (globalFilters.categoryId.length > 0) data = data.filter(s => globalFilters.categoryId.includes(s.categoryId));
        
        if (globalSearchTerm) {
            const q = globalSearchTerm.toLowerCase();
            data = data.filter(s => {
                const item = state.items.find(i => i.id === s.itemId);
                return item?.name.toLowerCase().includes(q) || s.stage.toLowerCase().includes(q) || s.date.toLowerCase().includes(q);
            });
        }
        
        const days = state.settings.eventDays || [];
        const times = state.settings.timeSlots || [];

        data.sort((a, b) => {
            const dIdxA = days.indexOf(a.date);
            const dIdxB = days.indexOf(b.date);
            if (dIdxA !== dIdxB) return dIdxA - dIdxB;
            const tIdxA = times.indexOf(a.time);
            const tIdxB = times.indexOf(b.time);
            return tIdxA - tIdxB;
        });
        
        return data;
    }, [state, globalFilters, globalSearchTerm]);

    const generateScheduleWithAI = async () => {
        if (!state || !process.env.API_KEY) { setError(state ? 'API key missing.' : 'Data not loaded.'); return; }
        const eventDays = state.settings.eventDays || [];
        const eventStages = state.settings.stages || [];
        const eventTimes = state.settings.timeSlots || [];
        if (eventDays.length === 0 || eventStages.length === 0 || eventTimes.length === 0) { 
            setError('Please finish Event Configuration first.'); return; 
        }
        setIsLoading(true); setError('');
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Create a schedule JSON array: [{id, itemId, categoryId, date, time, stage}]. Days: ${eventDays.join(', ')}. Slots: ${eventTimes.join(', ')}. Stages: ${eventStages.join(', ')}. Items: ${state.items.map(i => `${i.name} (ID:${i.id}, Cat:${i.categoryId})`).join('; ')}`;
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                 config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, itemId: { type: Type.STRING }, categoryId: { type: Type.STRING }, date: { type: Type.STRING }, time: { type: Type.STRING }, stage: { type: Type.STRING }, }, required: ['id', 'itemId', 'categoryId', 'date', 'time', 'stage'] } }, },
            });
            const schedule = JSON.parse(response.text?.trim() || '[]') as ScheduledEvent[];
            await setSchedule(schedule);
        } catch (e) { console.error(e); setError('Timeline generation failed.'); } finally { setIsLoading(false); }
    };

    const handleManualAdd = async () => {
        if (!state) return;
        const { itemId, date, time, stage } = manualEntry;
        if (!itemId || !date || !time || !stage) { alert("Complete all fields."); return; }
        const item = state.items.find(i => i.id === itemId);
        await addScheduleEvent({ id: `sch_${Date.now()}`, itemId, categoryId: item?.categoryId || '', date, time, stage });
        setManualEntry(prev => ({ ...prev, itemId: '' }));
    };

    const handleEditSave = () => { if (!state || !editFormData) return; setSchedule(state.schedule.map(s => s.id === editFormData.id ? editFormData : s)); setEditingId(null); };

    const togglePriority = async () => {
        const next = isTimePrimary ? 'DATE_FIRST' : 'TIME_FIRST';
        await updateSettings({ scheduleDisplayPriority: next });
    };

    if (!state) return <div className="p-10 text-center italic text-zinc-500">Synchronizing timeline...</div>;

    const selectClasses = "w-full appearance-none rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#151816] py-2 sm:py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all cursor-pointer";
    const labelClass = "block text-[8px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-zinc-400 mb-1 sm:mb-1.5 ml-1";

    return (
        <div className="space-y-6 sm:space-y-10 animate-in fade-in duration-500 pb-24">
            <div className="hidden md:flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h2 className="text-5xl font-black font-serif text-amazio-primary dark:text-white tracking-tighter uppercase leading-none">Event Schedule</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-3 font-medium text-lg italic">Timeline management and stage logistics.</p>
                </div>
            </div>

            <div className="bg-white/60 dark:bg-zinc-900/60 rounded-[1.5rem] sm:rounded-[2.5rem] border border-amazio-primary/5 dark:border-white/5 p-4 sm:p-8 shadow-glass-light dark:shadow-2xl">
                <SectionTitle title="1. Manual Entry" icon={Layers} accentColor="emerald" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 items-end">
                    <div className="lg:col-span-1">
                        <label className={labelClass}>Category</label>
                        <div className="relative">
                            <select value={manualEntry.categoryId} onChange={e => setManualEntry({ ...manualEntry, categoryId: e.target.value, itemId: '' })} className={selectClasses}>
                                <option value="">All Categories</option>
                                {state.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                        </div>
                    </div>
                    <div className="lg:col-span-1">
                        <div className="flex justify-between items-center mb-1 px-1">
                            <label className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Target Item</label>
                            <label className="flex items-center gap-1 cursor-pointer">
                                <input type="checkbox" checked={hideScheduled} onChange={e => setHideScheduled(e.target.checked)} className="rounded border-zinc-300 h-2.5 w-2.5" />
                                <span className="text-[7px] sm:text-[9px] font-black text-zinc-400 uppercase tracking-wider">Hide</span>
                            </label>
                        </div>
                        <div className="relative">
                            <select value={manualEntry.itemId} onChange={e => setManualEntry({ ...manualEntry, itemId: e.target.value })} className={selectClasses}>
                                <option value="">-- Choose Item --</option>
                                {manualItemsGrouped.onStage.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                {manualItemsGrouped.offStage.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
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
                            <label className={labelClass}>Stage</label>
                            <div className="relative">
                                <select value={manualEntry.stage} onChange={e => setManualEntry({...manualEntry, stage: e.target.value})} className={selectClasses}>
                                    <option value="">Stage</option>
                                    {(state.settings.stages || []).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                            </div>
                        </div>
                        <button onClick={handleManualAdd} className="h-[36px] sm:h-[48px] px-4 sm:px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-95"><Plus size={18} sm:size={22} strokeWidth={3}/></button>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-2 gap-4">
                    <SectionTitle title="2. Scheduled Events" icon={ClipboardList} accentColor="indigo" />
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button 
                            onClick={togglePriority}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-indigo-600 transition-all shadow-sm"
                        >
                            <ArrowRightLeft size={14} strokeWidth={3} />
                            <span>Swap Priority</span>
                        </button>
                        <div className="text-[8px] sm:text-[10px] font-black uppercase text-zinc-400 tracking-widest shrink-0">{processedSchedule.length} Entries</div>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                    {processedSchedule.map((event) => {
                        const isEditing = editingId === event.id;
                        const item = state.items.find(i => i.id === event.itemId);
                        const category = state.categories.find(c => c.id === event.categoryId);
                        const catColor = getCategoryColor(category?.name || '');
                        const stageColor = getDynamicColor(event.stage);

                        return (
                            <div key={event.id} className={`group relative bg-white dark:bg-[#151816] rounded-[1.2rem] sm:rounded-[2.5rem] border-2 transition-all duration-300 hover:-translate-y-1 ${isEditing ? 'border-indigo-500 shadow-md' : 'border-zinc-100 dark:border-white/5 hover:border-zinc-200'}`}>
                                {isEditing && editFormData ? (
                                    <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[8px] sm:text-[10px] font-black uppercase text-indigo-500 tracking-widest">Editing</span>
                                            <div className="flex gap-1.5">
                                                <button onClick={handleEditSave} className="p-1.5 bg-emerald-500 text-white rounded-lg shadow-sm"><Check size={14} strokeWidth={3}/></button>
                                                <button onClick={() => setEditingId(null)} className="p-1.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-500 rounded-lg"><X size={14} strokeWidth={3}/></button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                            <div className="relative">
                                                <select value={editFormData.date || ''} onChange={e => setEditFormData({...editFormData, date: e.target.value})} className="w-full appearance-none p-2 bg-zinc-50 dark:bg-zinc-900 border rounded-lg text-[10px] font-bold outline-none focus:ring-1 focus:ring-indigo-500">{(state.settings.eventDays || []).map(d => <option key={d} value={d}>{d}</option>)}</select>
                                                <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                                            </div>
                                            <div className="relative">
                                                <select value={editFormData.time || ''} onChange={e => setEditFormData({...editFormData, time: e.target.value})} className="w-full appearance-none p-2 bg-zinc-50 dark:bg-zinc-900 border rounded-lg text-[10px] font-bold outline-none focus:ring-1 focus:ring-indigo-500">{(state.settings.timeSlots || []).map(t => <option key={t} value={t}>{t}</option>)}</select>
                                                <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
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
                                                <div className="flex flex-col min-w-0">
                                                    {isTimePrimary ? (
                                                        <>
                                                            <span className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter leading-none truncate">{event.time}</span>
                                                            <span className="text-[8px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5 sm:mt-1 truncate">{event.date}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter leading-none truncate">{event.date}</span>
                                                            <span className="text-[8px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5 sm:mt-1 truncate">{event.time}</span>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => { setEditingId(event.id); setEditFormData(event); }} className="p-1.5 text-zinc-400 hover:text-indigo-600 transition-all"><Edit2 size={14}/></button>
                                                    <button onClick={() => { if(confirm("Delete?")) setSchedule(state.schedule.filter(s => s.id !== event.id)); }} className="p-1.5 text-zinc-400 hover:text-rose-600 transition-all"><Trash2 size={14}/></button>
                                                </div>
                                            </div>
                                            <div className="mb-3 sm:mb-4">
                                                <h4 className="text-sm sm:text-lg font-black text-amazio-primary dark:text-white uppercase tracking-tight leading-tight mb-1 sm:mb-2 line-clamp-1">{item?.name}</h4>
                                                <div className={`inline-block px-2 py-0.5 rounded-md text-[7px] sm:text-[9px] font-black uppercase tracking-widest border ${catColor}`}>{category?.name}</div>
                                            </div>
                                        </div>
                                        <div className="mt-auto p-4 sm:p-6 pt-3 sm:pt-4 border-t border-zinc-50 dark:border-white/5 flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <MapPin size={10} sm:size={14} style={{ color: stageColor }} />
                                                <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest truncate" style={{ color: stageColor }}>{event.stage}</span>
                                            </div>
                                            <div className="text-[7px] sm:text-[9px] font-bold text-zinc-400 uppercase shrink-0">{item?.performanceType === PerformanceType.ON_STAGE ? 'On' : 'Off'}</div>
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="bg-amber-50/30 dark:bg-zinc-900/30 rounded-[1.5rem] sm:rounded-[2.5rem] border border-dashed border-amber-200 p-6 sm:p-10">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 sm:gap-10">
                    <div className="max-w-2xl">
                        <SectionTitle title="AI Scheduler" icon={Sparkles} accentColor="amber" />
                        <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-lg leading-relaxed italic">Optimize competition distribution across stages automatically.</p>
                    </div>
                    <button 
                        onClick={generateScheduleWithAI} 
                        disabled={isLoading} 
                        className={`w-full lg:w-auto px-6 py-4 sm:px-10 sm:py-5 rounded-xl sm:rounded-[1.5rem] font-black uppercase tracking-widest sm:tracking-[0.2em] text-[10px] sm:text-sm shadow-xl transition-all flex items-center justify-center gap-2 sm:gap-3 ${isLoading ? 'bg-zinc-200 text-zinc-400' : 'bg-amazio-primary text-white shadow-amazio-primary/30'}`}
                    >
                        {isLoading ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} sm:size={20} />}
                        {isLoading ? 'Computing...' : 'Auto Timeline'}
                    </button>
                </div>
                {error && <div className="mt-4 p-3 rounded-xl bg-rose-50 text-rose-600 text-[10px] font-bold flex items-center gap-2 animate-in slide-in-from-top-2"><AlertTriangle size={14}/> {error}</div>}
            </div>

            <div className="bg-white/60 dark:bg-zinc-900/60 rounded-[1.5rem] sm:rounded-[2.5rem] border border-amazio-primary/5 dark:border-white/5 p-4 sm:p-8 shadow-glass-light dark:shadow-2xl">
                <SectionTitle title="3. Configuration" icon={Settings2} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-10 items-start">
                    <ChipInput label="Competition Days" description="Define the festival dates." values={state.settings.eventDays || []} onChange={(d) => updateSettings({ eventDays: d })} icon={CalendarIcon} colorScheme="indigo" />
                    <ChipInput label="Stages & Venues" description="Map performance areas." values={state.settings.stages || []} onChange={(s) => updateSettings({ stages: s })} icon={MapPin} colorScheme="emerald" />
                    <ChipInput label="Standard Slots" description="Time periods for sessions." values={state.settings.timeSlots || []} onChange={(t) => updateSettings({ timeSlots: t })} icon={Clock} colorScheme="amber" />
                </div>
                
                <div className="mt-8 pt-8 border-t border-zinc-100 dark:border-white/5">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-6 bg-zinc-50/50 dark:bg-black/20 rounded-[2rem] border border-zinc-100 dark:border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                                <Layout size={24} />
                            </div>
                            <div>
                                <h4 className="text-sm sm:text-base font-black uppercase tracking-tight text-amazio-primary dark:text-white">Primary Display Identity</h4>
                                <p className="text-[10px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400">Rearrange the visual order of Time and Date on schedule cards.</p>
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
        </div>
    );
};

export default SchedulePage;