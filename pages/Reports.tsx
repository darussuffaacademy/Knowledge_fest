import JSZip from 'jszip';
import { AlignJustify, Book, CheckSquare, Calendar, Download, File, FileCheck, FileDown, FileText, Grid3X3, Layers, Printer, Square, Stamp, Trophy, UserSquare2, Crown, MapPin, Phone, Mail, Globe, Info, Settings2, X, Check } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import Card from '../components/Card';
import ReportViewer from '../components/ReportViewer';
import { useFirebase } from '../hooks/useFirebase';
import { Item, ItemType, Participant, PerformanceType, ResultStatus, ScheduledEvent } from '../types';

const CountBadge = ({ count, label = '' }: { count: number, label?: string }) => (
    <div className="absolute top-2 right-2 bg-amazio-secondary dark:bg-amazio-accent text-white dark:text-amazio-bg text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10 border border-white dark:border-zinc-800 animate-in fade-in zoom-in duration-300">
        {count} {label}
    </div>
);

const ReportsPage: React.FC = () => {
  const { state, globalFilters } = useFirebase();
  const [reportContent, setReportContent] = useState<{ title: string; content: string; isSearchable: boolean; hideHeader?: boolean; hideFooter?: boolean } | null>(null);
  const [isPaginated, setIsPaginated] = useState(true);
  const [showEnrollmentMarks, setShowEnrollmentMarks] = useState(true);
  const [showWatermark, setShowWatermark] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Initialize from global settings if available
  const [showPrintHeader, setShowPrintHeader] = useState(state?.settings.reportSettings?.defaultShowHeader !== false);
  const [showPrintFooter, setShowPrintFooter] = useState(state?.settings.reportSettings?.defaultShowFooter !== false);
  
  const getTeamName = (id: string) => state?.teams.find(t => t.id === id)?.name || 'N/A';
  const getCategoryName = (id: string) => state?.categories.find(c => c.id === id)?.name || 'N/A';
  
  // --- Memoized Filtered Data ---

  const filteredParticipants = useMemo(() => {
      if (!state) return [];
      const itemTypeFilter = globalFilters.itemType || [];
      const hasGZoneSelected = globalFilters.categoryId.some(catId => {
          const c = state.categories.find(cat => cat.id === catId);
          return c && (c.isGeneralCategory || /g[\s_-]?zone|general/i.test(c.name));
      });

      return state.participants.filter(p => {
            const teamMatch = globalFilters.teamId.length === 0 || globalFilters.teamId.includes(p.teamId);
            const categoryMatch = globalFilters.categoryId.length === 0 || 
                hasGZoneSelected ||
                globalFilters.categoryId.includes(p.categoryId) ||
                p.itemIds.some(id => {
                    const item = state.items.find(i => i.id === id);
                    return item && globalFilters.categoryId.includes(item.categoryId);
                });
            if (!teamMatch || !categoryMatch) return false;

            const relevantItems = p.itemIds.map(id => state.items.find(i => i.id === id)).filter(Boolean) as Item[];

            if (globalFilters.itemId.length > 0 && !p.itemIds.some(id => globalFilters.itemId.includes(id))) return false;

            if (globalFilters.performanceType.length > 0) {
                const hasPerfMatch = relevantItems.some(item => globalFilters.performanceType.includes(item.performanceType));
                if (!hasPerfMatch) return false;
            }

            if (itemTypeFilter.length > 0) {
                const hasTypeMatch = relevantItems.some(item => itemTypeFilter.some(t => t.toLowerCase() === (item.type || '').toLowerCase()));
                if (!hasTypeMatch) return false;
            }

            return true;
        }).sort((a, b) => a.chestNumber.localeCompare(b.chestNumber, undefined, { numeric: true }));
  }, [state, globalFilters]);

  const filteredItems = useMemo(() => {
      if (!state) return [];
      const itemTypeFilter = globalFilters.itemType || [];
      return state.items.filter(item => 
            (globalFilters.categoryId.length === 0 || globalFilters.categoryId.includes(item.categoryId)) &&
            (globalFilters.performanceType.length === 0 || globalFilters.performanceType.includes(item.performanceType)) &&
            (itemTypeFilter.length === 0 || itemTypeFilter.some(t => t.toLowerCase() === (item.type || '').toLowerCase())) &&
            (globalFilters.itemId.length === 0 || globalFilters.itemId.includes(item.id))
          );
  }, [state, globalFilters]);

  const filteredSchedule = useMemo(() => {
      if (!state) return [];
      const itemTypeFilter = globalFilters.itemType || [];
      return state.schedule.filter(event => {
          const item = state.items.find(i => i.id === event.itemId);
          const category = state.categories.find(c => c.id === event.categoryId);
          if (!item) return false;

          if (globalFilters.categoryId.length > 0 && !globalFilters.categoryId.includes(category?.id || '')) return false;
          if (globalFilters.performanceType.length > 0 && !globalFilters.performanceType.includes(item?.performanceType || '')) return false;
          if (itemTypeFilter.length > 0 && !itemTypeFilter.some(t => t.toLowerCase() === (item?.type || '').toLowerCase())) return false;
          if (globalFilters.itemId.length > 0 && !globalFilters.itemId.includes(item.id)) return false;
          return true;
      });
  }, [state, globalFilters]);

  const filteredResults = useMemo(() => {
      if (!state) return [];
      const itemTypeFilter = globalFilters.itemType || [];
      return state.results.filter(r => {
           if (r.status !== ResultStatus.DECLARED) return false;
           const item = state.items.find(i => i.id === r.itemId);
           const category = state.categories.find(c => c.id === r.categoryId);
           if (!item || !category) return false;

           if (globalFilters.categoryId.length > 0 && !globalFilters.categoryId.includes(category?.id || '')) return false;
           if (globalFilters.performanceType.length > 0 && !globalFilters.performanceType.includes(item?.performanceType || '')) return false;
           if (itemTypeFilter.length > 0 && !itemTypeFilter.some(t => t.toLowerCase() === (item?.type || '').toLowerCase())) return false;
           if (globalFilters.itemId.length > 0 && !globalFilters.itemId.includes(item.id)) return false;
           return true;
      });
  }, [state, globalFilters]);

  // --- Styles & Headers ---

  const getStyles = () => `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Roboto+Slab:wght@400;500;600;700;800&display=swap');
      :root { --primary: #C21D2E; --secondary: #12A89D; --text-primary: #2C3628; --text-muted: #6D7568; --border: #E0E2D9; --table-header: #F7F3F0; --brand-green: #00A652; --accent-gold: #F9B344; }
      h1, h2, h3, h4, h5, h6 { font-family: 'Roboto Slab', serif; color: var(--primary) !important; }
      table, tr, td, p, li, div, span, a { color: var(--text-primary); font-family: 'Plus Jakarta Sans', sans-serif; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; font-size: 13px; border: 1px solid var(--border); table-layout: fixed; }
      th, td { border: 1px solid var(--border); padding: 8px 10px; text-align: left; word-wrap: break-word; } 
      thead { background-color: var(--table-header) !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
      th { font-weight: 700; color: var(--primary) !important; font-size: 11px; text-transform: uppercase; }
      tr:nth-child(even) { background-color: #FBFBFA !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page-break-before-always { page-break-before: always; }
      
      .enhanced-branding-header { position: relative; margin-bottom: 30px; text-align: center; }
      .institution-row { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 12px; margin-bottom: 15px; text-align: left; }
      .inst-details { flex-grow: 1; }
      .inst-name { font-size: 16px; font-weight: 800; text-transform: uppercase; color: var(--brand-green); margin: 0; line-height: 1.2; }
      .inst-meta { font-size: 10px; color: #777; margin-top: 2px; }
      .inst-logo { max-height: 50px; margin-right: 15px; }
      
      .festival-row { padding: 10px 0; }
      .festival-logo-main { max-height: 100px; margin-bottom: 10px; }
      .festival-title-main { font-size: 28pt; font-weight: 900; text-transform: uppercase; margin: 0; color: var(--primary); letter-spacing: -1px; line-height: 1; }
      .festival-desc { font-size: 14px; color: var(--secondary); font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px; }
      .festival-subtitle { font-size: 11px; color: #777; font-weight: 600; margin-top: 4px; }
      
      .decorative-divider { display: flex; align-items: center; justify-content: center; margin: 15px 0; }
      .decorative-divider::before, .decorative-divider::after { content: ""; height: 2px; flex-grow: 1; background: linear-gradient(to right, transparent, var(--accent-gold), transparent); }
      .decorative-dot { width: 8px; height: 8px; background: var(--accent-gold); border-radius: 50%; margin: 0 15px; }
      
      .report-title-badge { display: inline-block; padding: 5px 20px; background: var(--primary); color: white !important; border-radius: 4px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-top: 10px; }

      .item-row { margin-bottom: 4px; display: flex; gap: 6px; align-items: flex-start; }
      .item-num { font-weight: 900; font-size: 0.85em; opacity: 0.6; padding-top: 1px; }
      .section-divider { border-top: 4px double #C21D2E; margin: 40px 0; padding-top: 20px; }
    </style>
  `;

  const getBrandingHeaderHTML = (reportTitle: string = '') => {
    const inst = state?.settings.institutionDetails;
    const branding = state?.settings.branding;
    const festivalName = branding?.eventName || 'Art Fest';
    const festivalTheme = state?.settings.heading || 'Festival Theme';
    const festivalDesc = branding?.description || '';
    
    return `
      <div class="enhanced-branding-header">
        ${inst?.name ? `
        <div class="institution-row">
          ${inst.logoUrl ? `<img src="${inst.logoUrl}" class="inst-logo" />` : ''}
          <div class="inst-details">
            <h4 class="inst-name">${inst.name}</h4>
            <div class="inst-meta">
                ${inst.address ? `<span>${inst.address}</span>` : ''}
                ${inst.contactNumber ? ` | <span>${inst.contactNumber}</span>` : ''}
                ${inst.email ? ` | <span>${inst.email}</span>` : ''}
            </div>
          </div>
        </div>
        ` : ''}

        <div class="festival-row">
          ${branding?.typographyUrl ? `<img src="${branding.typographyUrl}" class="festival-logo-main" />` : ''}
          <h1 class="festival-title-main">${festivalName}</h1>
          <p class="festival-desc">${festivalTheme}</p>
          ${festivalDesc ? `<p class="festival-subtitle">${festivalDesc}</p>` : ''}
        </div>

        <div class="decorative-divider">
          <div class="decorative-dot"></div>
        </div>

        ${reportTitle ? `<div class="report-title-badge">${reportTitle}</div>` : ''}
      </div>
    `;
  };

  const getWatermarkHTML = () => {
    if (!showWatermark) return '';
    const text = state?.settings.branding?.eventName || state?.settings.heading || 'Art Fest';
    // Priority: typographyUrlLight -> typographyUrl -> null
    const logoUrl = state?.settings.branding?.typographyUrlLight || state?.settings.branding?.typographyUrl;
    return `
    <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-family: 'Roboto Slab', serif; font-weight: 900; color: #C21D2E; opacity: 0.04; pointer-events: none; z-index: 9999; white-space: nowrap; user-select: none; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 30px;" class="watermark-layer">
        ${logoUrl ? `<img src="${logoUrl}" style="max-width: 700px; width: 60vw; height: auto; object-fit: contain; filter: grayscale(100%);" />` : ''}
        <div style="font-size: 7vw; line-height: 1; text-transform: uppercase; letter-spacing: 0.2em;">${text}</div>
    </div>
    `;
  };

  // --- Report Generators ---
  
  const generateParticipantProfiles = (paginated: boolean) => {
    if (!state) return;
    const itemTypeFilter = globalFilters.itemType || [];
    const profileStyles = ` <style> .profile-wrapper { page-break-inside: avoid; margin-bottom: 2rem; border: 2px solid #C21D2E; border-radius: 12px; padding: 1.5rem; background: #FFFFFF; position: relative; overflow: hidden; z-index: 1; } .profile-header { text-align: center; border-bottom: 1px solid #E0E2D9; padding-bottom: 1rem; margin-bottom: 1rem; } .profile-name { font-family: 'Roboto Slab', serif; font-size: 1.75rem; font-weight: 700; color: #C21D2E; margin: 0; text-transform: uppercase; } .profile-chest { font-family: 'Roboto Slab', serif; font-size: 1.5rem; font-weight: 800; color: #12A89D; margin-top: 5px; } .profile-details { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.9rem; margin-bottom: 1rem; } </style> `;
    let html = `${getStyles()}${profileStyles}${getWatermarkHTML()}${getBrandingHeaderHTML('Participant Profiles')}`;
    filteredParticipants.forEach((p, index) => {
      const team = getTeamName(p.teamId); const category = getCategoryName(p.categoryId);
      const participantScheduledItems = p.itemIds.map(itemId => { 
          const item = state.items.find(i => i.id === itemId); 
          if (!item) return null;
          if (itemTypeFilter.length > 0 && !itemTypeFilter.some(t => t.toLowerCase() === (item.type || '').toLowerCase())) return null;
          const schedule = state.schedule.find(s => s.itemId === itemId && s.categoryId === p.categoryId); 
          return { item, schedule }; 
      }).filter(Boolean);
      
      const wrapperClass = (paginated && index > 0) ? 'report-block profile-wrapper page-break-before-always' : 'report-block profile-wrapper';
      html += ` <div class="${wrapperClass}"> <div class="profile-header"> <div class="profile-name">${p.name}</div> <div class="profile-chest">Chest No: ${p.chestNumber}</div> </div> <div class="profile-details"> <div><strong>Team:</strong> ${team}</div> <div><strong>Category:</strong> ${category}</div> </div> ${participantScheduledItems.length > 0 ? ` <h4>Registered Items</h4> <table> <thead><tr><th>Item</th><th>Type</th><th>Date</th><th>Time</th></tr></thead> <tbody> ${participantScheduledItems.map((si: any) => ` <tr> <td>${si.item?.name}</td> <td>${si.item?.type}</td> <td>${si.schedule?.date || '-'}</td> <td>${si.schedule?.time || '-'}</td> </tr> `).join('')} </tbody> </table> ` : '<p>No items registered.</p>'} </div> `;
    });
    setReportContent({ title: 'Participant Profiles', content: html, isSearchable: true, hideHeader: !showPrintHeader, hideFooter: !showPrintFooter });
  };

  const generateIDCards = () => {
    if (!state) return;
    const itemTypeFilter = globalFilters.itemType || [];
    const idCardStyles = `
      <style>
        .id-grid { display: flex; flex-wrap: wrap; gap: 25px; justify-content: center; z-index: 1; position: relative; padding: 20px; }
        .id-card { 
            width: 320px; 
            border: 2px solid #C21D2E; 
            border-radius: 16px; 
            background: #fff; 
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); 
            overflow: hidden; 
            page-break-inside: avoid; 
            margin-bottom: 15px; 
            position: relative;
        }
        .id-top-bar { height: 8px; background: #C21D2E; }
        .id-header { padding: 18px; border-bottom: 1px solid #f1f5f9; text-align: center; background: #fafafa; }
        .id-chest { 
            font-family: 'Roboto Slab', serif; 
            font-size: 1.8rem; 
            font-weight: 900; 
            color: #C21D2E; 
            letter-spacing: -1px;
            line-height: 1;
            margin-bottom: 6px;
        }
        .id-name { 
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 1rem; 
            font-weight: 800; 
            text-transform: uppercase; 
            color: #C21D2E;
            line-height: 1.2;
        }
        .id-meta { font-size: 0.75rem; color: #666; font-weight: 600; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
        
        .id-body { padding: 15px 18px; }
        .zone-group { margin-bottom: 12px; }
        .zone-title { 
            font-size: 9px; 
            font-weight: 900; 
            text-transform: uppercase; 
            letter-spacing: 1.5px; 
            color: #12A89D; 
            border-bottom: 1px solid #E0E2D9;
            padding-bottom: 4px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .type-subgroup { margin-bottom: 8px; padding-left: 4px; }
        .type-label { font-size: 8px; font-weight: 800; color: #999; margin-bottom: 4px; text-transform: uppercase; }
        
        .item-list { display: flex; flex-wrap: wrap; gap: 4px; }
        .item-chip { 
            font-size: 10px; 
            font-weight: 700;
            background: #f8fafc; 
            border: 1px solid #e2e8f0; 
            padding: 3px 8px; 
            border-radius: 6px; 
            color: #475569;
        }
        .id-footer { 
            padding: 10px; 
            background: #C21D2E; 
            color: white !important; 
            text-align: center; 
            font-size: 9px; 
            font-weight: 800; 
            text-transform: uppercase; 
            letter-spacing: 2px;
        }
      </style>
    `;

    let html = `${getStyles()}${idCardStyles}${getWatermarkHTML()}
      <div style="text-align:center; padding: 20px;">${getBrandingHeaderHTML('Official Identity Cards')}</div>
      <div class="id-grid">
    `;

    filteredParticipants.forEach((p) => {
        const team = getTeamName(p.teamId);
        const categoryName = getCategoryName(p.categoryId);
        const items = p.itemIds.map(id => state.items.find(i => i.id === id)).filter(Boolean) as Item[];
        const relevantItems = items.filter(i => itemTypeFilter.length === 0 || itemTypeFilter.some(t => t.toLowerCase() === (i.type || '').toLowerCase()));

        // Grouping: Zone (PerformanceType) -> Type (ItemType)
        const groupedItems: Record<string, Record<string, Item[]>> = {};
        relevantItems.forEach(item => {
            const zone = item.performanceType;
            const type = item.type;
            if (!groupedItems[zone]) groupedItems[zone] = {};
            if (!groupedItems[zone][type]) groupedItems[zone][type] = [];
            groupedItems[zone][type].push(item);
        });

        html += `
            <div class="id-card">
                <div class="id-top-bar"></div>
                <div class="id-header">
                    <div class="id-chest">${p.chestNumber}</div>
                    <div class="id-name">${p.name}</div>
                    <div class="id-meta">${team} <span style="opacity:0.3; margin: 0 4px;">|</span> ${categoryName}</div>
                </div>
                <div class="id-body">
                    ${Object.entries(groupedItems).sort(([z1], [z2]) => z1.localeCompare(z2)).map(([zone, types]) => `
                        <div class="zone-group">
                            <div class="zone-title">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                ${zone} Zone
                            </div>
                            ${Object.entries(types).sort(([t1], [t2]) => t1.localeCompare(t2)).map(([type, list]) => `
                                <div class="type-subgroup">
                                    <div class="type-label">${type}s</div>
                                    <div class="item-list">
                                        ${list.map(i => `<div class="item-chip">${i.name}</div>`).join('')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                    ${relevantItems.length === 0 ? '<div style="text-align:center; padding: 20px; color:#ccc; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:1px;">No Items Registered</div>' : ''}
                </div>
                <div class="id-footer">${state?.settings.branding?.eventName || 'Art Fest 2026'}</div>
            </div>
        `;
    });

    html += `</div>`;
    setReportContent({ title: 'Participant ID Cards', content: html, isSearchable: true, hideHeader: !showPrintHeader, hideFooter: !showPrintFooter });
  };

  const generateItemsChecklist = () => {
      if (!state) return;
      const items = [...filteredItems].sort((a, b) => a.name.localeCompare(b.name));
      let html = `${getStyles()}${getWatermarkHTML()}${getBrandingHeaderHTML('Reporting Checklist')}`;
      items.forEach((item, index) => {
          const category = state.categories.find(c => c.id === item.categoryId)?.name;
          const participants = state.participants
            .filter(p => p.itemIds.includes(item.id))
            .filter(p => globalFilters.teamId.length === 0 || globalFilters.teamId.includes(p.teamId));
          if (participants.length === 0) return;
          let displayEntries = [];
          if (item.type === ItemType.GROUP) {
              const groups: { [key: string]: Participant[] } = {};
              participants.forEach(p => {
                  const key = `${p.teamId}_${p.itemGroups?.[item.id] || 1}`;
                  if(!groups[key]) groups[key] = [];
                  groups[key].push(p);
              });
              displayEntries = Object.values(groups).map(members => {
                  let leader = members.find(p => p.groupLeaderItemIds?.includes(item.id)) || members[0];
                  return { id: leader.id, chestNumber: leader.groupChestNumbers?.[item.id] || leader.chestNumber, name: `${leader.name} & Party`, teamId: leader.teamId };
              }).sort((a,b) => a.chestNumber.localeCompare(b.chestNumber, undefined, {numeric: true}));
          } else {
              displayEntries = participants.map(p => ({ id: p.id, chestNumber: p.chestNumber, name: p.name, teamId: p.teamId })).sort((a,b) => a.chestNumber.localeCompare(b.chestNumber, undefined, {numeric: true}));
          }
          html += ` <div class="report-block" style="margin-bottom: 2rem; ${index > 0 && isPaginated ? 'page-break-before: always;' : ''}"> <div class="block-header" style="background: var(--table-header); padding: 10px; border: 1px solid #E0E2D9;"> <h3 style="margin:0;">${item.name} (${item.type})</h3> <p style="margin:0;">Category: ${category} | Duration: ${item.duration} min</p> </div> <table> <thead><tr><th>Sl</th><th>Code</th><th>Chest No</th><th>Name</th><th>Team</th><th>Signature</th></tr></thead> <tbody> ${displayEntries.map((p, i) => {
              const tab = state.tabulation.find(t => t.itemId === item.id && t.participantId === p.id);
              const code = tab?.codeLetter || '-';
              return ` <tr><td>${i+1}</td><td style="font-weight:bold;color:#6366f1">${code}</td><td style="font-weight:bold">${p.chestNumber}</td><td>${p.name}</td><td>${getTeamName(p.teamId)}</td><td></td></tr> `;
          }).join('')} </tbody> </table> </div> `;
      });
      setReportContent({ title: 'Reporting List', content: html, isSearchable: true, hideHeader: !showPrintHeader, hideFooter: !showPrintFooter });
  };

  const generateResultsReport = () => {
      if (!state) return;
      let html = `${getStyles()}${getWatermarkHTML()}${getBrandingHeaderHTML('Declared Results')}`;
      if (filteredResults.length === 0) html += `<p>No results match current filters.</p>`;
      else {
          filteredResults.forEach((result, index) => {
             const item = state.items.find(i => i.id === result.itemId);
             const category = state.categories.find(c => c.id === result.categoryId);
             html += ` <div class="report-block" style="margin-bottom: 2rem; ${index > 0 && isPaginated ? 'page-break-before: always;' : ''}"> <h4 class="block-header">${item?.name} (${category?.name}) - ${item?.type}</h4> <table> <thead><tr><th>Rank</th><th>Chest No</th><th>Name</th><th>Team</th><th>Mark</th><th>Grade</th></tr></thead> <tbody> ${result.winners.sort((a,b) => (a.position || 9) - (b.position || 9)).map(w => {
                 const p = state.participants.find(part => part.id === w.participantId);
                 const grade = w.gradeId ? (item?.type === ItemType.SINGLE ? state.gradePoints.single : state.gradePoints.group).find(g => g.id === w.gradeId)?.name : '-';
                 return `<tr><td>${w.position || '-'}</td><td>${p?.chestNumber}</td><td>${p?.name}</td><td>${getTeamName(p?.teamId || '')}</td><td>${w.mark?.toFixed(2)}</td><td>${grade}</td></tr>`;
             }).join('')} </tbody> </table> </div> `;
          });
      }
      setReportContent({ title: 'Declared Results', content: html, isSearchable: true, hideHeader: !showPrintHeader, hideFooter: !showPrintFooter });
  };
  
  const generateValuationSheet = () => {
    if (!state) return;
    let html = `${getStyles()}${getWatermarkHTML()}${getBrandingHeaderHTML('Valuation Sheets')}`;
    filteredItems.sort((a, b) => a.name.localeCompare(b.name)).forEach((item, index) => {
        const tabulation = state.tabulation.filter(t => t.itemId === item.id).sort((a, b) => a.codeLetter.localeCompare(b.codeLetter));
        if (tabulation.length === 0) return;
        html += ` <div class="report-block" style="margin-bottom: 2rem; ${index > 0 && isPaginated ? 'page-break-before: always;' : ''}"> <div class="block-header" style="background: var(--table-header); padding: 10px;"> <h3 style="margin:0;">${item.name} (${item.type})</h3> <p style="margin:0;">Category: ${getCategoryName(item.categoryId)}</p> </div> <table> <thead><tr><th>Sl</th><th>Code Letter</th><th>Criteria 1</th><th>Criteria 2</th><th>Criteria 3</th><th>Total</th></tr></thead> <tbody> ${tabulation.map((t, i) => `<tr><td>${i+1}</td><td style="font-weight:bold;text-align:center">${t.codeLetter}</td><td></td><td></td><td></td><td></td></tr>`).join('')} </tbody> </table> </div> `;
    });
    setReportContent({ title: 'Valuation Sheet', content: html, isSearchable: true, hideHeader: !showPrintHeader, hideFooter: !showPrintFooter });
  };

  const generateProgramManual = () => {
    if (!state) return;
    const itemTypeFilter = globalFilters.itemType || [];
    const festivalName = state.settings.heading; const orgTeam = state.settings.organizingTeam;
    const manualStyles = ` <style> .item-card { border: 1px solid #E0E2D9; border-radius: 12px; padding: 15px; margin-bottom: 15px; page-break-inside: avoid; } .badge { font-size: 9px; font-weight: 800; text-transform: uppercase; padding: 3px 8px; border-radius: 4px; border: 1px solid #eee; margin-right: 4px; } </style> `;
    let html = `${getStyles()}${manualStyles}${getWatermarkHTML()} <div style="text-align:center; padding: 50px 0;"> ${getBrandingHeaderHTML('Official Program Manual')} </div> `;
    state.categories.forEach(cat => {
        const items = state.items.filter(i => i.categoryId === cat.id && (itemTypeFilter.length === 0 || itemTypeFilter.some(t => t.toLowerCase() === (i.type || '').toLowerCase()))).sort((a,b) => a.name.localeCompare(b.name));
        if (items.length === 0) return;
        html += ` <div class="page-break-before-always"> <h3>${cat.name}</h3> ${items.map(item => ` <div class="item-card"> <h4>${item.name}</h4> <p style="font-size:12px;color:#666">${item.description || 'Event description.'}</p> <div> <span class="badge" style="background:#12A89D;color:white">${item.type}</span> <span class="badge">${item.performanceType}</span> <span class="badge">🕒 ${item.duration} MIN</span> </div> </div> `).join('')} </div> `;
    });
    setReportContent({ title: 'Program Manual', content: html, isSearchable: true, hideHeader: !showPrintHeader, hideFooter: !showPrintFooter });
  };

  const generatePrizeWinnersReport = () => {
    if (!state) return;
    
    // Aggregation of participant data
    const winnersMap = new Map<string, { 
        id: string, 
        name: string, 
        chest: string, 
        team: string, 
        category: string, 
        prizes: Record<number, string[]>, 
        total: number 
    }>();

    // Aggregation of item-wise data
    const itemWinners: any[] = [];

    // Use filteredResults which already respects Category, Performance Type, Item Type, and Item selection
    filteredResults.forEach(res => {
        const item = state.items.find(i => i.id === res.itemId);
        if (!item) return;

        const currentItemWinner: any = {
            name: item.name,
            category: getCategoryName(item.categoryId),
            prizes: { 1: [], 2: [], 3: [] }
        };

        let hasRelevantWinner = false;

        res.winners.forEach(w => {
            if (!w.position || w.position > 3) return;
            
            const participant = state.participants.find(p => p.id === w.participantId);
            if (!participant) return;

            // Apply Team Filter from universal filters
            if (globalFilters.teamId.length > 0 && !globalFilters.teamId.includes(participant.teamId)) return;

            hasRelevantWinner = true;
            const winnerSummary = `${participant.chestNumber}. ${participant.name}`;
            currentItemWinner.prizes[w.position].push(winnerSummary);

            if (!winnersMap.has(participant.id)) {
                winnersMap.set(participant.id, {
                    id: participant.id,
                    name: participant.name,
                    chest: participant.chestNumber,
                    team: getTeamName(participant.teamId),
                    category: getCategoryName(participant.categoryId),
                    prizes: { 1: [], 2: [], 3: [] },
                    total: 0
                });
            }

            const data = winnersMap.get(participant.id)!;
            data.prizes[w.position].push(item.name);
            
            // Calculate points for this win
            let points = 0;
            if (w.position === 1) points = item.points.first;
            else if (w.position === 2) points = item.points.second;
            else if (w.position === 3) points = item.points.third;
            
            // Add grade points if applicable
            if (w.gradeId) {
                const gradeConfig = item.type === ItemType.SINGLE ? state.gradePoints.single : state.gradePoints.group;
                const grade = gradeConfig.find(g => g.id === w.gradeId);
                if (grade) {
                    points += (item.gradePointsOverride?.[grade.id] ?? grade.points);
                }
            }

            data.total += points;
        });

        if (hasRelevantWinner) {
            itemWinners.push(currentItemWinner);
        }
    });

    // Updated: Sort by chest number instead of total points
    const sortedParticipants = Array.from(winnersMap.values()).sort((a, b) => a.chest.localeCompare(b.chest, undefined, { numeric: true }));
    const sortedItems = itemWinners.sort((a, b) => a.name.localeCompare(b.name));

    // Standard list formatter with numbering
    const formatItemList = (list: string[]) => {
        if (!list || list.length === 0) return '<span style="opacity:0.3">-</span>';
        return list.map((item, i) => `
            <div class="item-row">
                <span class="item-num">${i + 1}.</span>
                <span>${item}</span>
            </div>
        `).join('');
    };

    // New list formatter without index numbering (for item-wise table)
    const formatItemListSimple = (list: string[]) => {
        if (!list || list.length === 0) return '<span style="opacity:0.3">-</span>';
        return list.map((item) => `
            <div class="item-row">
                <span>${item}</span>
            </div>
        `).join('');
    };

    let html = `${getStyles()}${getWatermarkHTML()}${getBrandingHeaderHTML('Merit List - Prize Holders')}<h3>Individual Merit Standings</h3>`;
    html += `
        <table style="width: 100%;">
            <thead>
                <tr>
                    <th style="width: 25%;">Participant Identity</th>
                    <th style="width: 25%;">1st Place Items</th>
                    <th style="width: 25%;">2nd Place Items</th>
                    <th style="width: 25%;">3rd Place Items</th>
                </tr>
            </thead>
            <tbody>
                ${sortedParticipants.map(w => `
                    <tr>
                        <td>
                            <div class="font-bold">${w.name}</div>
                            <div style="font-size: 10px; color: #666;">
                                Chest: ${w.chest} | Team: ${w.team} <br/>
                                Category: ${w.category}
                            </div>
                        </td>
                        <td>${formatItemList(w.prizes[1])}</td>
                        <td>${formatItemList(w.prizes[2])}</td>
                        <td>${formatItemList(w.prizes[3])}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    // New Section: Item-wise Prize Holders
    html += `<div class="section-divider"></div><h3>Item-wise Winners</h3>`;
    html += `
        <table style="width: 100%;">
            <thead>
                <tr>
                    <th style="width: 20%;">Item & Category</th>
                    <th style="width: 26.6%;">1st Prize Holder</th>
                    <th style="width: 26.6%;">2nd Prize Holder</th>
                    <th style="width: 26.6%;">3rd Prize Holder</th>
                </tr>
            </thead>
            <tbody>
                ${sortedItems.map(item => `
                    <tr>
                        <td>
                            <div class="font-bold">${item.name}</div>
                            <div style="font-size: 9px; color: #666; text-transform: uppercase;">${item.category}</div>
                        </td>
                        <td>${formatItemListSimple(item.prizes[1])}</td>
                        <td>${formatItemListSimple(item.prizes[2])}</td>
                        <td>${formatItemListSimple(item.prizes[3])}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    if (sortedParticipants.length === 0) {
        html = `${getStyles()}${getWatermarkHTML()}${getBrandingHeaderHTML('Merit List')}<p class="text-center" style="padding: 50px; opacity: 0.5;">No prize holders recorded in declared results yet.</p>`;
    }

    setReportContent({ title: 'Prize Holders - Comprehensive Report', content: html, isSearchable: true, hideHeader: !showPrintHeader, hideFooter: !showPrintFooter });
  };

  const generateScheduleReport = () => {
    if (!state) return;
    let html = `${getStyles()}${getWatermarkHTML()}${getBrandingHeaderHTML('Official Schedule')}<h3>Event Timeline</h3>`;
    if (filteredSchedule.length === 0) html += `<p>No scheduled events match current filters.</p>`;
    else {
        html += ` <table> <thead><tr><th>Date</th><th>Time</th><th>Item</th><th>Category</th><th>Stage</th></tr></thead> <tbody> ${filteredSchedule.map(ev => {
                  const item = state.items.find(i => i.id === ev.itemId);
                  const category = state.categories.find(c => c.id === ev.categoryId);
                  return `<tr><td>${ev.date}</td><td>${ev.time}</td><td style="font-weight:bold">${item?.name || '-'}</td><td>${category?.name || '-'}</td><td>${ev.stage}</td></tr>`;
              }).join('')} </tbody> </table> `;
    }
    setReportContent({ title: 'Event Schedule', content: html, isSearchable: true, hideHeader: !showPrintHeader, hideFooter: !showPrintFooter });
  };

  const generateParticipantItemChecklist = () => {
    if (!state) return;
    const matrixStyles = `
      <style>
        .matrix-table { border-collapse: collapse; width: auto; min-width: 100%; font-size: 10px; }
        .matrix-table th, .matrix-table td { border: 1px solid #E0E2D9; padding: 4px; text-align: center; }
        .matrix-header-cell { height: 160px; vertical-align: bottom; padding: 10px 2px !important; width: 30px; min-width: 30px; position: relative; }
        .matrix-header-text-container {
            writing-mode: vertical-rl;
            transform: rotate(180deg);
            white-space: nowrap;
            text-align: left;
            font-weight: 800;
            font-size: 9px;
            color: var(--primary);
            text-transform: uppercase;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: flex-start;
        }
        .participant-name-cell { text-align: left !important; font-weight: 700; min-width: 200px; padding-left: 10px !important; }
        .check-mark { font-family: serif; font-weight: bold; color: var(--brand-green); font-size: 14px; }
      </style>
    `;
    let html = `${getStyles()}${matrixStyles}${getWatermarkHTML()}${getBrandingHeaderHTML('Registration Matrix')}<h3>Participant Registry Matrix</h3>`;
    
    state.categories.forEach(cat => {
        const catItems = state.items.filter(i => i.categoryId === cat.id && (globalFilters.itemType.length === 0 || globalFilters.itemType.some(t => t.toLowerCase() === (i.type || '').toLowerCase()))).sort((a,b) => a.name.localeCompare(b.name));
        if (catItems.length === 0) return;
        
        const isGZone = !!cat.isGeneralCategory || /g[\s_-]?zone|general/i.test(cat.name);
        const catItemIds = new Set(catItems.map(i => i.id));
        const catParticipants = filteredParticipants.filter(p => {
            if (isGZone) {
                // Encompass all participants from both Sub-Zone and High-Zone tiers
                return true;
            }
            return p.categoryId === cat.id || p.itemIds.some(id => catItemIds.has(id));
        }).sort((a, b) => a.chestNumber.localeCompare(b.chestNumber, undefined, { numeric: true }));

        if (catParticipants.length === 0) return;
        
        html += `
            <div class="report-block page-break-before-always">
                <h4 style="margin-top: 20px;">${cat.name}</h4>
                <table class="matrix-table">
                    <thead>
                        <tr>
                            <th style="width: 200px; text-align: left; padding-left: 10px;">Participant Identity</th>
                            ${catItems.map(item => `
                                <th class="matrix-header-cell">
                                    <div class="matrix-header-text-container">
                                        ${item.name}
                                    </div>
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${catParticipants.map(p => {
                            const isExternalCat = p.categoryId !== cat.id;
                            const extCatName = isExternalCat ? state.categories.find(c => c.id === p.categoryId)?.name : null;
                            const catBadge = extCatName ? `<span style="font-size: 8px; font-weight: 700; opacity: 0.7; margin-left: 4px; color: #6366f1;">(${extCatName})</span>` : '';
                            return `
                                <tr>
                                    <td class="participant-name-cell">${p.chestNumber} - ${p.name}${catBadge}</td>
                                    ${catItems.map(item => `
                                        <td>${p.itemIds.includes(item.id) && showEnrollmentMarks ? '<span class="check-mark">&#10003;</span>' : ''}</td>
                                    `).join('')}
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    });
    setReportContent({ title: 'Checklist Matrix', content: html, isSearchable: true, hideHeader: !showPrintHeader, hideFooter: !showPrintFooter });
  };

  const generateTemplatePage = (withLines: boolean) => {
    if (!state) return;
    const watermark = getWatermarkHTML();
    const branding = getBrandingHeaderHTML('Writing Template');
    let html = ` <div style="height: 1000px; padding: 50px; position: relative; ${withLines ? 'background-image: linear-gradient(#e5e7eb 1px, transparent 1px); background-size: 100% 1.5rem;' : ''}"> ${watermark} ${branding} </div> `;
    setReportContent({ title: 'Writing Template', content: html, isSearchable: false, hideHeader: !showPrintHeader, hideFooter: !showPrintFooter });
  };

  if (!state) return <div>Loading...</div>;

  const CustomizationModal = () => (
      ReactDOM.createPortal(
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setIsSettingsOpen(false)}>
            <div className="bg-white dark:bg-[#121412] w-full max-w-md rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-white/10 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-zinc-100 dark:border-white/5 flex justify-between items-center bg-zinc-50/50 dark:bg-white/[0.01]">
                    <div>
                        <h3 className="text-xl font-black font-serif uppercase tracking-tighter text-amazio-primary dark:text-white">Configure Layout</h3>
                        <p className="text-[10px] font-black uppercase text-zinc-400 mt-1 tracking-widest">Global Print Settings</p>
                    </div>
                    <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-xl transition-colors text-zinc-400"><X size={24}/></button>
                </div>
                <div className="p-8 space-y-6">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-3">
                            <Stamp size={18} className="text-indigo-500" />
                            <span className="text-xs font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">Show Watermark</span>
                        </div>
                        <button onClick={() => setShowWatermark(!showWatermark)} className={`relative w-10 h-5 rounded-full transition-colors ${showWatermark ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}>
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showWatermark ? 'left-6' : 'left-1'}`} />
                        </button>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-3">
                            <AlignJustify size={18} className="text-indigo-500" />
                            <span className="text-xs font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">Use Pagination</span>
                        </div>
                        <button onClick={() => setIsPaginated(!isPaginated)} className={`relative w-10 h-5 rounded-full transition-colors ${isPaginated ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}>
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isPaginated ? 'left-6' : 'left-1'}`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-3">
                            <Layers size={18} className="text-indigo-500" />
                            <span className="text-xs font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">Include Header</span>
                        </div>
                        <button onClick={() => setShowPrintHeader(!showPrintHeader)} className={`relative w-10 h-5 rounded-full transition-colors ${showPrintHeader ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}>
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showPrintHeader ? 'left-6' : 'left-1'}`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-3">
                            <Square size={18} className="text-indigo-500" />
                            <span className="text-xs font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">Include Footer</span>
                        </div>
                        <button onClick={() => setShowPrintFooter(!showPrintFooter)} className={`relative w-10 h-5 rounded-full transition-colors ${showPrintFooter ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}>
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showPrintFooter ? 'left-6' : 'left-1'}`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-800">
                        <div className="flex items-center gap-3">
                            <CheckSquare size={18} className="text-indigo-600 dark:text-indigo-400" />
                            <span className="text-xs font-bold uppercase tracking-widest text-indigo-700 dark:text-indigo-300">Registry Marks</span>
                        </div>
                        <button onClick={() => setShowEnrollmentMarks(!showEnrollmentMarks)} className={`relative w-10 h-5 rounded-full transition-colors ${showEnrollmentMarks ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}>
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showEnrollmentMarks ? 'left-6' : 'left-1'}`} />
                        </button>
                    </div>
                </div>
                <div className="p-6 border-t border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-white/[0.01]">
                    <button 
                        onClick={() => setIsSettingsOpen(false)}
                        className="w-full py-4 bg-amazio-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
                    >
                        Apply Changes
                    </button>
                </div>
            </div>
        </div>,
        document.body
      )
  );

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
             <h2 className="text-3xl font-bold text-zinc-800 dark:text-zinc-100">Reports Dashboard</h2>
             <div className="flex items-center gap-2">
                <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 transition-all shadow-sm group"
                >
                    <Settings2 size={16} className="group-hover:rotate-90 transition-transform duration-500" />
                    <span className="hidden sm:inline">Configure Layout</span>
                </button>
             </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             <Card title="Prize Holders" action={<button onClick={generatePrizeWinnersReport} className="text-indigo-600 hover:text-indigo-800"><Printer size={20}/></button>}> 
                <div className="text-center p-4"> 
                    <Crown className="h-12 w-12 mx-auto text-yellow-600 mb-2" /> 
                    <p className="text-sm text-zinc-500">Comprehensive list of winners by items and points.</p> 
                </div> 
             </Card>
             <Card title="Declared Results" action={<button onClick={generateResultsReport} className="text-indigo-600 hover:text-indigo-800"><Trophy size={20}/></button>}> {filteredResults.length > 0 && <CountBadge count={filteredResults.length} />} <div className="text-center p-4"> <Trophy className="h-12 w-12 mx-auto text-rose-400 mb-2" /> <p className="text-sm text-zinc-500">Published results by Single/Group.</p> </div> </Card>
             <Card title="Participants" action={<button onClick={() => generateParticipantProfiles(isPaginated)} className="text-indigo-600 hover:text-indigo-800"><Printer size={20}/></button>}> {filteredParticipants.length > 0 && <CountBadge count={filteredParticipants.length} />} <div className="text-center p-4"> <FileText className="h-12 w-12 mx-auto text-indigo-400 mb-2" /> <p className="text-sm text-zinc-500">Generate profiles for participants.</p> </div> </Card>
             <Card title="ID Cards" action={<button onClick={generateIDCards} className="text-indigo-600 hover:text-indigo-800"><UserSquare2 size={20}/></button>}> {filteredParticipants.length > 0 && <CountBadge count={filteredParticipants.length} />} <div className="text-center p-4"> <UserSquare2 className="h-12 w-12 mx-auto text-purple-400 mb-2" /> <p className="text-sm text-zinc-500">Printable ID cards for all participants.</p> </div> </Card>
             <Card title="Reporting List" action={<button onClick={generateItemsChecklist} className="text-indigo-600 hover:text-indigo-800"><CheckSquare size={20}/></button>}> {filteredItems.length > 0 && <CountBadge count={filteredItems.length} />} <div className="text-center p-4"> <Layers className="h-12 w-12 mx-auto text-emerald-400 mb-2" /> <p className="text-sm text-zinc-500">Checklists by single or group registry.</p> </div> </Card>
             <Card title="Valuation Sheet" action={<button onClick={generateValuationSheet} className="text-indigo-600 hover:text-indigo-800"><FileCheck size={20}/></button>}> {filteredItems.length > 0 && <CountBadge count={filteredItems.length} />} <div className="text-center p-4"> <FileCheck className="h-12 w-12 mx-auto text-amber-500 mb-2" /> <p className="text-sm text-zinc-500">Anonymous scoring sheets for judges.</p> </div> </Card>
             <Card title="Checklist Matrix" action={<button onClick={generateParticipantItemChecklist} className="text-indigo-600 hover:text-indigo-800"><Grid3X3 size={20}/></button>}> {filteredItems.length > 0 && <CountBadge count={filteredItems.length} />} <div className="text-center p-4"> <Grid3X3 className="h-12 w-12 mx-auto text-teal-400 mb-2" /> <p className="text-sm text-zinc-500">Cross-reference grid.</p> </div> </Card>
             <Card title="Writing Template" action={<button onClick={() => generateTemplatePage(true)} className="text-indigo-600 hover:text-indigo-800"><File size={20}/></button>}> <div className="text-center p-4"> <File className="h-12 w-12 mx-auto text-slate-400 mb-2" /> <p className="text-sm text-zinc-500">Blank or lined pages with event watermark.</p> </div> </Card>
             <Card title="Program Manual" action={<button onClick={generateProgramManual} className="text-indigo-600 hover:text-indigo-800"><Book size={20}/></button>}> {filteredItems.length > 0 && <CountBadge count={filteredItems.length} />} <div className="text-center p-4"> <Book className="h-12 w-12 mx-auto text-orange-400 mb-2" /> <p className="text-sm text-zinc-500">Handbook with rules and details.</p> </div> </Card>
             <Card title="Schedule" action={<button onClick={generateScheduleReport} className="text-indigo-600 hover:text-indigo-800"><Calendar size={20}/></button>}> {filteredSchedule.length > 0 && <CountBadge count={filteredSchedule.length} />} <div className="text-center p-4"> <Calendar className="h-12 w-12 mx-auto text-amber-400 mb-2" /> <p className="text-sm text-zinc-500">Detailed event schedule and timeline.</p> </div> </Card>
        </div>
        
        {isSettingsOpen && <CustomizationModal />}
        
        <ReportViewer isOpen={!!reportContent} onClose={() => setReportContent(null)} title={reportContent?.title || ''} content={reportContent?.content || ''} isSearchable={reportContent?.isSearchable} hideHeader={reportContent?.hideHeader} hideFooter={reportContent?.hideFooter} />
    </div>
  );
};

export default ReportsPage;