import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useFirebase } from '../hooks/useFirebase';
import { 
    Download, ChevronDown, 
    Loader2, Image as ImageIcon, Palette, 
    Plus, Check, Layers, X,
    Settings2, Leaf, CheckCircle2, Type, RefreshCw
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { ResultStatus, ItemType } from '../types';

// --- Utils ---

const compressBgImage = (base64Str: string, maxWidth = 1080, maxHeight = 1080, quality = 0.4): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
            } else {
                if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
            }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);
            }
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(base64Str); 
    });
};

// --- Types ---

interface PosterData {
    itemId: string;
    itemName: string;
    categoryName: string;
    resultNumber: string; 
    winners: {
        rank: number;
        name: string;
        place?: string;
        team: string;
        grade?: string;
        points: number;
    }[];
}

// --- Components ---

const PosterCanvas: React.FC<{ 
    data: PosterData; 
    id?: string;
    customBg?: string | null;
    fontFamily?: string;
    isDownloadMode?: boolean;
}> = ({ data, id, customBg, fontFamily = 'font-slab', isDownloadMode = false }) => {
    const parts = data.categoryName.split(' ');
    const prefix = parts[0] || '';
    const suffix = parts.slice(1).join(' ');

    // Precise font family name mapping
    let resolvedFont = fontFamily;
    if (fontFamily === 'font-slab') resolvedFont = 'Roboto Slab';
    else if (fontFamily === 'font-serif') resolvedFont = 'Playfair Display';
    else if (fontFamily === 'font-sans') resolvedFont = 'Inter';

    const textStyle: React.CSSProperties = { 
        fontFamily: resolvedFont ? `'${resolvedFont}', sans-serif` : 'inherit',
    };

    return (
        <div 
            id={id}
            className={`relative flex flex-col overflow-hidden bg-[#F7F3F0] text-[#C21D2E] studio-canvas-root`}
            style={{ 
                width: '1080px', 
                height: '1080px', 
                flexShrink: 0,
                ...textStyle
            }}
        >
            {/* Background Layer */}
            {customBg && (
                <img src={customBg} className="absolute inset-0 w-full h-full object-cover z-0" alt="Official Background" />
            )}

            {/* Dynamic Content Overlay */}
            <div className="relative z-10 w-full h-full flex flex-col p-0">
                
                {/* Header Zone: Category (Prefix/Suffix) & Item Name */}
                <div className="mt-[232px] ml-[82px] space-y-0">
                    <div className="flex items-center gap-3">
                         <h2 className="text-[108px] font-black tracking-tighter leading-[0.9]" style={textStyle}>
                            <span className="text-[#C21D2E]">{prefix}</span>
                            {suffix && <span className="text-[#F9B344] ml-4">{suffix}</span>}
                         </h2>
                         <Leaf className="w-[62px] h-[62px] text-[#F9B344] fill-current -mt-4" />
                    </div>
                    <h3 className="text-[52px] font-bold tracking-tight text-[#12A89D] mt-[-10px] ml-2" style={textStyle}>
                        #{data.itemName}
                    </h3>
                </div>

                {/* Winners Zone - Gaps set to exactly 30px. 
                    Using leading-none and explicit padding/margins for consistent rasterization across environments.
                 */}
                <div className="mt-[30px] ml-[205px] pr-[110px] space-y-[30px]">
                    {(data.winners || []).slice(0, 3).map((winner, idx) => (
                        <div key={idx} className="min-w-0 flex flex-col">
                            <h4 
                                className={`text-[46px] font-black uppercase tracking-tighter leading-tight text-[#C21D2E] whitespace-nowrap mb-1 ${isDownloadMode ? 'overflow-visible' : 'truncate'}`} 
                                style={textStyle}
                            >
                                {winner.name}
                            </h4>
                            <div className="flex items-center gap-3">
                                <p className="text-[21px] font-black text-[#12A89D] uppercase tracking-[0.2em] leading-tight" style={textStyle}>
                                    {winner.place}
                                </p>
                                <span className="text-zinc-400 font-light text-xl">|</span>
                                <p className="text-[17px] font-medium italic opacity-70 leading-tight" style={textStyle}>
                                    {winner.team}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- Main Page Component ---
const CreativeStudio: React.FC<{ isMobile: boolean }> = ({ isMobile }) => {
    const { state, updateCustomBackgrounds } = useFirebase();
    const [selectedItemId, setSelectedItemId] = useState<string>('');
    const [selectedBgUrl, setSelectedBgUrl] = useState<string | null>(null);
    const [selectedFont, setSelectedFont] = useState<string>('font-slab');
    const [scale, setScale] = useState(0.5);
    const [isControlsOpen, setIsControlsOpen] = useState(!isMobile);
    const [hasInitialized, setHasInitialized] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const mainContainerRef = useRef<HTMLDivElement>(null);
    const bgInputRef = useRef<HTMLInputElement>(null);

    const toggleControls = () => setIsControlsOpen(!isControlsOpen);

    useEffect(() => {
        const calculateScale = () => {
            if (mainContainerRef.current) {
                const padding = window.innerWidth >= 768 ? 80 : 32;
                const availableWidth = mainContainerRef.current.offsetWidth - padding; 
                const availableHeight = mainContainerRef.current.offsetHeight - padding;
                const widthScale = availableWidth / 1080;
                const heightScale = availableHeight / 1080;
                const newScale = Math.min(widthScale, heightScale, 1);
                setScale(newScale);
            }
        };

        const timerId = setTimeout(calculateScale, 100);
        window.addEventListener('resize', calculateScale);
        return () => {
            clearTimeout(timerId);
            window.removeEventListener('resize', calculateScale);
        };
    }, [selectedItemId, isMobile, selectedBgUrl, isControlsOpen]);

    const declaredItems = useMemo(() => {
        if (!state) return [];
        const results = state.results || [];
        const items = state.items || [];
        return results
            .filter(r => r.status === ResultStatus.DECLARED)
            .map(r => {
                const item = items.find(i => i.id === r.itemId);
                return item ? {
                    id: r.itemId,
                    name: item.name,
                    result: r
                } : null;
            })
            .filter((entry): entry is { id: string; name: string; result: any } => entry !== null);
    }, [state]);

    useEffect(() => {
        if (state && !hasInitialized) {
            if (declaredItems.length > 0) {
                setSelectedItemId(declaredItems[declaredItems.length - 1].id);
            }
            if (state.customBackgrounds?.length) {
                setSelectedBgUrl(state.customBackgrounds[0]);
            }
            setHasInitialized(true);
        }
    }, [state, declaredItems, hasInitialized]);

    const posterData = useMemo(() => {
        if (!state || !selectedItemId) return null;
        
        const listIndex = declaredItems.findIndex(i => i.id === selectedItemId);
        if (listIndex === -1) return null;

        const result = declaredItems[listIndex].result;
        const items = state.items || [];
        const categories = state.categories || [];
        const participants = state.participants || [];
        const teams = state.teams || [];
        const item = items.find(i => i.id === selectedItemId);
        const category = categories.find(c => c.id === item?.categoryId);
        
        const winners = (result?.winners || [])
            .filter((w: any) => w.position > 0)
            .sort((a: any, b: any) => a.position - b.position)
            .map((w: any) => {
                const p = participants.find(part => part.id === w.participantId);
                const t = teams.find(team => team.id === p?.teamId);
                
                let pointsWon = 0;
                if (w.position === 1) pointsWon += item?.points?.first || 0;
                else if (w.position === 2) pointsWon += item?.points?.second || 0;
                else if (w.position === 3) pointsWon += item?.points?.third || 0;

                const gConfig = item?.type === ItemType.SINGLE ? (state.gradePoints?.single || []) : (state.gradePoints?.group || []);
                const g = w.gradeId ? gConfig.find(grade => grade.id === w.gradeId) : null;
                if (g) pointsWon += (item?.gradePointsOverride?.[g.id] ?? (g.points || 0));

                return {
                    rank: w.position,
                    name: item?.type === ItemType.GROUP ? `${p?.name} & Party` : (p?.name || 'Unknown'),
                    place: p?.place,
                    team: t?.name || 'Unknown',
                    grade: g?.name,
                    points: pointsWon
                };
            });

        return {
            itemId: selectedItemId,
            itemName: item?.name || '',
            categoryName: category?.name || '',
            resultNumber: String(listIndex + 1),
            winners
        } as PosterData;
    }, [state, selectedItemId, declaredItems]);

    const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !state) return;
        
        setIsUploading(true);
        try {
            const reader = new FileReader();
            const result = await new Promise<string>((resolve) => {
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });

            const compressed = await compressBgImage(result);
            const existingBgs = state.customBackgrounds || [];
            
            await updateCustomBackgrounds([...existingBgs, compressed]);
            setSelectedBgUrl(compressed);
        } catch (err: any) {
            console.error("Upload failed", err);
            alert(err.message || "Failed to process background image.");
        } finally {
            setIsUploading(false);
            if (bgInputRef.current) bgInputRef.current.value = '';
        }
    };

    const handleDeleteBg = async (idx: number) => {
        if (!state) return;
        const bgs = [...(state.customBackgrounds || [])];
        const removed = bgs.splice(idx, 1)[0];
        if (selectedBgUrl === removed) setSelectedBgUrl(null);
        await updateCustomBackgrounds(bgs);
    };

    const handleDownload = async () => {
        const sourceElement = document.getElementById('poster-canvas-render-target');
        if (!sourceElement) return;
        
        setIsDownloading(true);
        try {
            // Delay slightly for font assets to settle
            await new Promise(r => setTimeout(r, 600));

            const captured = await html2canvas(sourceElement, { 
                scale: 1, // Capture at native 1080px (we force 1:1 below)
                useCORS: true, 
                backgroundColor: null, 
                logging: false,
                width: 1080,
                height: 1080,
                onclone: (clonedDoc) => {
                    const el = clonedDoc.getElementById('poster-canvas-render-target');
                    if (el) {
                        // CRITICAL: Ensure the cloned element is exactly 1080x1080 at 1:1 scale.
                        // This bypasses scaling transforms from the preview UI.
                        el.style.transform = 'none';
                        el.style.width = '1080px';
                        el.style.height = '1080px';
                        el.style.position = 'fixed';
                        el.style.top = '0';
                        el.style.left = '0';
                        el.style.zIndex = '9999';
                        el.style.overflow = 'visible';
                        
                        // Strip transforms from all parent wrappers in the cloned document
                        let parent = el.parentElement;
                        while (parent) {
                            parent.style.transform = 'none';
                            parent.style.overflow = 'visible';
                            parent = parent.parentElement;
                        }

                        // Remove specific manual overrides that were shifting text vertically.
                        // We rely on the core component's styles for "exact" look.
                        const winners = el.querySelectorAll('h4');
                        winners.forEach(w => {
                            w.style.overflow = 'visible';
                            w.style.whiteSpace = 'nowrap';
                        });
                    }
                }
            });
            
            const link = document.createElement('a');
            link.download = `amazio-poster-${selectedItemId}.jpg`;
            // Using image/jpeg with high quality
            link.href = captured.toDataURL('image/jpeg', 0.95);
            link.click();
        } catch (err) {
            console.error("Capture failed:", err);
            alert("Failed to generate image. Please try again.");
        } finally {
            setIsDownloading(false);
        }
    };

    if (!state) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-zinc-400" size={48} /></div>;

    const availableFonts = [
        { label: 'System Slab', value: 'font-slab' },
        { label: 'System Serif', value: 'font-serif' },
        { label: 'System Sans', value: 'font-sans' },
        ...(state.customFonts?.englishPrimary?.family ? [{ label: `Primary: ${state.customFonts.englishPrimary.family}`, value: 'EnglishPrimary' }] : []),
        ...(state.customFonts?.englishSecondary?.family ? [{ label: `Secondary: ${state.customFonts.englishSecondary.family}`, value: 'EnglishSecondary' }] : []),
        ...(state.generalCustomFonts || []).map(f => ({ label: f.family, value: f.family })),
    ];

    return (
        <div className="flex flex-col h-full bg-amazio-light-bg dark:bg-amazio-bg animate-in fade-in duration-500 overflow-hidden relative">
            
            {/* Header Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 sm:p-5 bg-white dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 z-30">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/20 shrink-0">
                        <Palette size={20} className="sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-base sm:text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100 leading-none truncate font-serif">Poster Studio</h2>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-1">Registry-Populated Graphics</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-grow md:flex-none group">
                        <select 
                            value={selectedItemId} 
                            onChange={(e) => setSelectedItemId(e.target.value)}
                            className="w-full appearance-none bg-zinc-100 dark:bg-zinc-800 border-2 border-transparent focus:border-indigo-500 rounded-xl pl-3 pr-8 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer md:min-w-[240px]"
                        >
                            <option value="">-- Choose Item --</option>
                            {declaredItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={12} />
                    </div>
                    
                    <button 
                        disabled={!selectedItemId || isDownloading}
                        onClick={handleDownload} 
                        className="bg-amazio-primary text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-amazio-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-2 shrink-0"
                    >
                        {isDownloading ? <RefreshCw className="animate-spin" size={14}/> : <Download size={14} strokeWidth={3} />}
                        <span className="hidden sm:inline">Download JPG</span>
                    </button>
                </div>
            </div>
            
            {/* Main Content Area */}
            <div className="flex-grow flex flex-col md:flex-row overflow-hidden relative">
                
                {/* Mobile Backdrop for Sidebar */}
                {isMobile && isControlsOpen && (
                    <div 
                        className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-40 animate-in fade-in duration-300"
                        onClick={() => setIsControlsOpen(false)}
                    />
                )}

                {/* Sidebar - Settings */}
                <aside className={`
                    fixed md:relative bottom-0 left-0 right-0 md:right-auto md:w-72 lg:w-80
                    bg-white dark:bg-[#121412] border-t md:border-t-0 md:border-r border-zinc-200 dark:border-zinc-800 
                    flex flex-col z-50 transition-transform duration-300 ease-out
                    ${isMobile ? (isControlsOpen ? 'translate-y-0 h-[60vh] rounded-t-[2.5rem] shadow-2xl' : 'translate-y-full h-0') : 'h-full translate-y-0'}
                `}>
                    {isMobile && (
                        <div className="flex justify-center p-3" onClick={() => setIsControlsOpen(false)}>
                            <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                        </div>
                    )}

                    <div className="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-8">
                        {/* Background Selection */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                    <ImageIcon size={14} className="text-indigo-500" />
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Background Layers</h3>
                                </div>
                                <button 
                                    onClick={() => bgInputRef.current?.click()} 
                                    disabled={isUploading}
                                    className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:scale-110 transition-transform disabled:opacity-50"
                                >
                                    {isUploading ? <RefreshCw className="animate-spin" size={16}/> : <Plus size={16}/>}
                                </button>
                                <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={handleBgUpload} />
                            </div>
                            
                            <div className="grid grid-cols-4 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                <button 
                                    onClick={() => setSelectedBgUrl(null)}
                                    className={`aspect-square rounded-2xl border-2 flex items-center justify-center transition-all ${!selectedBgUrl ? 'border-indigo-500 bg-indigo-50 shadow-inner' : 'border-zinc-100 bg-zinc-50 dark:bg-white/5 dark:border-white/5'}`}
                                >
                                    <Layers size={18} className="text-zinc-400" />
                                </button>
                                {(state.customBackgrounds || []).map((bg, idx) => (
                                    <div key={idx} className="relative aspect-square">
                                        <img 
                                            src={bg} 
                                            onClick={() => setSelectedBgUrl(bg)}
                                            className={`w-full h-full object-cover rounded-2xl cursor-pointer border-2 transition-all ${selectedBgUrl === bg ? 'border-indigo-500 scale-95 shadow-lg' : 'border-transparent'}`} 
                                            alt={`BG ${idx + 1}`}
                                        />
                                        <button 
                                            onClick={() => handleDeleteBg(idx)}
                                            className="absolute -top-1 -right-1 bg-rose-500 text-white p-1 rounded-full shadow-lg hover:scale-110 transition-transform"
                                        >
                                            <X size={10} strokeWidth={4}/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Font Selection */}
                        <div className="pt-6 border-t border-zinc-100 dark:border-white/5">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                                <Type size={14} className="text-indigo-500" /> Poster Typography
                            </h3>
                            <div className="relative group">
                                <select 
                                    value={selectedFont}
                                    onChange={(e) => setSelectedFont(e.target.value)}
                                    className="w-full appearance-none bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-100 dark:border-zinc-700 rounded-xl px-4 py-3 text-xs font-bold transition-all focus:border-indigo-500 outline-none"
                                >
                                    {availableFonts.map((f, i) => (
                                        <option key={i} value={f.value}>{f.label}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={14} />
                            </div>
                            <p className="mt-2 text-[8px] text-zinc-500 uppercase font-medium leading-relaxed">
                                Applied globally to the rendering canvas. Registry fonts auto-detected.
                            </p>
                        </div>
                    </div>
                </aside>

                {/* Main Canvas Area */}
                <main ref={mainContainerRef} className="flex-grow overflow-hidden flex flex-col items-center justify-center bg-zinc-200/50 dark:bg-black/80 relative p-4 sm:p-8 lg:p-12">
                    {posterData ? (
                        <div className="relative flex flex-col items-center animate-in zoom-in-95 duration-700">
                            <div 
                                className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-[2rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] overflow-hidden border border-white/10"
                                style={{ 
                                    width: `${1080 * scale}px`, 
                                    height: `${1080 * scale}px`,
                                    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                }}
                            >
                                <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                                    <PosterCanvas 
                                        id="poster-canvas-render-target"
                                        data={posterData} 
                                        customBg={selectedBgUrl}
                                        fontFamily={selectedFont}
                                        isDownloadMode={false}
                                    />
                                </div>
                            </div>
                            
                            {/* Meta Info */}
                            <p className="mt-8 text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 dark:text-zinc-600 hidden md:block">
                                High Resolution Preview • 1080x1080px
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center opacity-20 text-zinc-500 text-center px-6 max-w-sm">
                            <div className="w-24 h-24 rounded-[2.5rem] bg-zinc-100 dark:bg-white/5 flex items-center justify-center mb-8">
                                <ImageIcon size={48} strokeWidth={1} />
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Awaiting Data</h3>
                            <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">Choose an item from the top toolbar.</p>
                        </div>
                    )}
                </main>

                {/* Mobile FAB */}
                {isMobile && (
                    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-[60]">
                        <button 
                            onClick={toggleControls}
                            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 border-4 border-white dark:border-zinc-800 ${isControlsOpen ? 'bg-zinc-900 text-white' : 'bg-indigo-600 text-white'}`}
                        >
                            {isControlsOpen ? <X size={20} strokeWidth={3} /> : <Settings2 size={20} strokeWidth={3} />}
                        </button>
                    </div>
                )}
            </div>
            
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default CreativeStudio;