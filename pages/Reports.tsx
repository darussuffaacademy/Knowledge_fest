import JSZip from 'jszip';
import { AlignJustify, Book, CheckSquare, Calendar, Download, File, FileCheck, FileDown, FileText, Grid3X3, Layers, Printer, Square, Stamp, Trophy, UserSquare2, Crown, MapPin, Phone, Mail, Globe, Info, Settings2, X, Check, Users } from 'lucide-react';
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

  const filteredTeams = useMemo(() => {
      if (!state) return [];
      const teamFilter = globalFilters?.teamId || [];
      return (state.teams || []).filter(t => teamFilter.length === 0 || teamFilter.includes(t.id))
          .sort((a, b) => a.name.localeCompare(b.name));
  }, [state, globalFilters?.teamId]);

  const filteredParticipants = useMemo(() => {
      if (!state) return [];
      const itemTypeFilter = globalFilters?.itemType || [];
      const categoryFilter = globalFilters?.categoryId || [];
      const teamFilter = globalFilters?.teamId || [];
      const itemFilter = globalFilters?.itemId || [];
      const perfFilter = globalFilters?.performanceType || [];

      const hasGZoneSelected = categoryFilter.some(catId => {
          const c = (state.categories || []).find(cat => cat.id === catId);
          return c && (c.isGeneralCategory || /g[\s_-]?zone|general/i.test(c.name));
      });

      return (state.participants || []).filter(p => {
            const teamMatch = teamFilter.length === 0 || teamFilter.includes(p.teamId);
            const categoryMatch = categoryFilter.length === 0 || 
                hasGZoneSelected ||
                categoryFilter.includes(p.categoryId) ||
                (p.itemIds || []).some(id => {
                    const item = (state.items || []).find(i => i.id === id);
                    return item && categoryFilter.includes(item.categoryId);
                });
            if (!teamMatch || !categoryMatch) return false;

            const relevantItems = (p.itemIds || []).map(id => (state.items || []).find(i => i.id === id)).filter(Boolean) as Item[];

            if (itemFilter.length > 0 && !(p.itemIds || []).some(id => itemFilter.includes(id))) return false;

            if (perfFilter.length > 0) {
                const hasPerfMatch = relevantItems.some(item => perfFilter.includes(item.performanceType));
                if (!hasPerfMatch) return false;
            }

            if (itemTypeFilter.length > 0) {
                const hasTypeMatch = relevantItems.some(item => itemTypeFilter.some(t => t.toLowerCase() === (item.type || '').toLowerCase()));
                if (!hasTypeMatch) return false;
            }

            return true;
        }).sort((a, b) => (a.chestNumber || '').localeCompare(b.chestNumber || '', undefined, { numeric: true }));
  }, [state, globalFilters]);

  const filteredItems = useMemo(() => {
      if (!state) return [];
      const itemTypeFilter = globalFilters?.itemType || [];
      const categoryFilter = globalFilters?.categoryId || [];
      const itemFilter = globalFilters?.itemId || [];
      const perfFilter = globalFilters?.performanceType || [];

      return (state.items || []).filter(item => 
            (categoryFilter.length === 0 || categoryFilter.includes(item.categoryId)) &&
            (perfFilter.length === 0 || perfFilter.includes(item.performanceType)) &&
            (itemTypeFilter.length === 0 || itemTypeFilter.some(t => t.toLowerCase() === (item.type || '').toLowerCase())) &&
            (itemFilter.length === 0 || itemFilter.includes(item.id))
          );
  }, [state, globalFilters]);

  const filteredSchedule = useMemo(() => {
      if (!state) return [];
      const itemTypeFilter = globalFilters?.itemType || [];
      const categoryFilter = globalFilters?.categoryId || [];
      const itemFilter = globalFilters?.itemId || [];
      const perfFilter = globalFilters?.performanceType || [];

      return (state.schedule || []).filter(event => {
          const item = (state.items || []).find(i => i.id === event.itemId);
          const category = (state.categories || []).find(c => c.id === event.categoryId);
          if (!item) return false;

          if (categoryFilter.length > 0 && !categoryFilter.includes(category?.id || '')) return false;
          if (perfFilter.length > 0 && !perfFilter.includes(item?.performanceType || '')) return false;
          if (itemTypeFilter.length > 0 && !itemTypeFilter.some(t => t.toLowerCase() === (item?.type || '').toLowerCase())) return false;
          if (itemFilter.length > 0 && !itemFilter.includes(item.id)) return false;
          return true;
      });
  }, [state, globalFilters]);

  const filteredResults = useMemo(() => {
      if (!state) return [];
      const itemTypeFilter = globalFilters?.itemType || [];
      const categoryFilter = globalFilters?.categoryId || [];
      const itemFilter = globalFilters?.itemId || [];
      const perfFilter = globalFilters?.performanceType || [];

      return (state.results || []).filter(r => {
           if (r.status !== ResultStatus.DECLARED) return false;
           const item = (state.items || []).find(i => i.id === r.itemId);
           const category = (state.categories || []).find(c => c.id === r.categoryId);
           if (!item || !category) return false;

           if (categoryFilter.length > 0 && !categoryFilter.includes(category?.id || '')) return false;
           if (perfFilter.length > 0 && !perfFilter.includes(item?.performanceType || '')) return false;
           if (itemTypeFilter.length > 0 && !itemTypeFilter.some(t => t.toLowerCase() === (item?.type || '').toLowerCase())) return false;
           if (itemFilter.length > 0 && !itemFilter.includes(item.id)) return false;
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
      const participantScheduledItems = (p.itemIds || []).map(itemId => { 
          const item = (state.items || []).find(i => i.id === itemId); 
          if (!item) return null;
          if (itemTypeFilter.length > 0 && !itemTypeFilter.some(t => t.toLowerCase() === (item.type || '').toLowerCase())) return null;
          const schedule = (state.schedule || []).find(s => s.itemId === itemId && s.categoryId === p.categoryId); 
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
        const items = (p.itemIds || []).map(id => (state.items || []).find(i => i.id === id)).filter(Boolean) as Item[];
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
          const category = (state.categories || []).find(c => c.id === item.categoryId)?.name;
          const participants = (state.participants || [])
            .filter(p => (p.itemIds || []).includes(item.id))
            .filter(p => (globalFilters?.teamId || []).length === 0 || (globalFilters?.teamId || []).includes(p.teamId));
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
              const tab = (state.tabulation || []).find(t => t.itemId === item.id && t.participantId === p.id);
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
             const item = (state.items || []).find(i => i.id === result.itemId);
             const category = (state.categories || []).find(c => c.id === result.categoryId);
             const winnersList = result.winners || [];
             html += ` <div class="report-block" style="margin-bottom: 2rem; ${index > 0 && isPaginated ? 'page-break-before: always;' : ''}"> <h4 class="block-header">${item?.name} (${category?.name}) - ${item?.type}</h4> <table> <thead><tr><th>Rank</th><th>Chest No</th><th>Name</th><th>Team</th><th>Mark</th><th>Grade</th></tr></thead> <tbody> ${[...winnersList].sort((a,b) => (a.position || 9) - (b.position || 9)).map(w => {
                 const p = (state.participants || []).find(part => part.id === w.participantId);
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

        (res.winners || []).forEach(w => {
            if (!w.position || w.position > 3) return;
            
            const participant = (state.participants || []).find(p => p.id === w.participantId);
            if (!participant) return;

            // Apply Team Filter from universal filters
            if ((globalFilters?.teamId || []).length > 0 && !(globalFilters?.teamId || []).includes(participant.teamId)) return;

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

  const generateTeamsAndParticipantsReport = (paginated: boolean) => {
    if (!state) return;

    const teamReportStyles = `
      <style>
        .team-report-block { margin-bottom: 2.5rem; page-break-inside: avoid; }
        .team-banner { 
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border: 2px solid var(--primary);
            border-radius: 12px;
            padding: 16px 20px;
            margin-bottom: 15px;
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
        }
        .team-title-group { display: flex; align-items: center; gap: 14px; }
        .team-badge-circle {
            width: 44px;
            height: 44px;
            background: var(--primary);
            color: #fff;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            font-weight: 900;
            font-family: 'Roboto Slab', serif;
            text-transform: uppercase;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .team-name-text { 
            font-family: 'Roboto Slab', serif; 
            font-size: 20px; 
            font-weight: 800; 
            color: var(--primary); 
            text-transform: uppercase; 
            margin: 0;
            letter-spacing: -0.5px;
        }
        .team-leaders-line { font-size: 11px; color: #475569; margin-top: 4px; font-weight: 600; }
        .team-stats-pills { display: flex; flex-wrap: wrap; gap: 8px; }
        .stat-pill { 
            background: #fff; 
            border: 1px solid var(--border); 
            padding: 5px 12px; 
            border-radius: 20px; 
            font-size: 11px; 
            font-weight: 700; 
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: 5px;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }
        .role-pill {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 8px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-left: 6px;
            vertical-align: middle;
        }
        .role-leader { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
        .role-assistant { background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; }
        .item-chip-small {
            display: inline-block;
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            padding: 2px 7px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 600;
            color: #334155;
            margin: 1px 2px;
        }
        .item-chip-group { background: #fef3c7; border-color: #fde68a; color: #92400e; }
        .overview-table th { background: #f1f5f9 !important; }
      </style>
    `;

    let html = `${getStyles()}${teamReportStyles}${getWatermarkHTML()}${getBrandingHeaderHTML('Teams & Participants Directory')}`;

    if (filteredTeams.length === 0) {
      html += `<p class="text-center" style="padding: 50px; opacity: 0.5;">No teams match the active filters.</p>`;
      setReportContent({ title: 'Teams & Participants Roster', content: html, isSearchable: true, hideHeader: !showPrintHeader, hideFooter: !showPrintFooter });
      return;
    }

    // --- 1. Master Delegation Summary Overview Table ---
    html += `
      <div style="margin-bottom: 2.5rem;">
        <h3 style="margin-bottom: 10px;">Delegation Summary Overview</h3>
        <table class="overview-table">
          <thead>
            <tr>
              <th style="width: 5%;">Sl</th>
              <th style="width: 25%;">Team Name</th>
              <th style="width: 20%;">Team Leader</th>
              <th style="width: 20%;">Assistant Coordinator</th>
              <th style="width: 15%; text-align: center;">Enrolled Delegates</th>
              <th style="width: 15%; text-align: center;">Unique Items</th>
            </tr>
          </thead>
          <tbody>
            ${filteredTeams.map((team, idx) => {
              const teamParts = (state.participants || []).filter(p => p.teamId === team.id);
              const leader = teamParts.find(p => p.role === 'leader');
              const assistant = teamParts.find(p => p.role === 'assistant');
              const teamItemIds = new Set<string>();
              teamParts.forEach(p => (p.itemIds || []).forEach(id => teamItemIds.add(id)));

              return `
                <tr>
                  <td>${idx + 1}</td>
                  <td style="font-weight: 800; color: var(--primary); text-transform: uppercase;">${team.name}</td>
                  <td>${leader ? `<span style="font-weight:700;">${leader.name}</span>` : '<span style="opacity:0.4;">Not Assigned</span>'}</td>
                  <td>${assistant ? `<span style="font-weight:700;">${assistant.name}</span>` : '<span style="opacity:0.4;">Not Assigned</span>'}</td>
                  <td style="text-align: center; font-weight: 800; font-size: 13px; color: var(--secondary);">${teamParts.length}</td>
                  <td style="text-align: center; font-weight: 700;">${teamItemIds.size}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    // --- 2. Detailed Roster for Each Team ---
    filteredTeams.forEach((team, teamIndex) => {
      const teamParticipants = filteredParticipants
        .filter(p => p.teamId === team.id)
        .sort((a, b) => (a.chestNumber || '').localeCompare(b.chestNumber || '', undefined, { numeric: true }));

      const allTeamParts = (state.participants || []).filter(p => p.teamId === team.id);
      const leader = allTeamParts.find(p => p.role === 'leader');
      const assistant = allTeamParts.find(p => p.role === 'assistant');

      const uniqueItems = new Set<string>();
      teamParticipants.forEach(p => (p.itemIds || []).forEach(id => uniqueItems.add(id)));

      // Category breakdown
      const catCount: Record<string, number> = {};
      teamParticipants.forEach(p => {
        const cName = getCategoryName(p.categoryId);
        catCount[cName] = (catCount[cName] || 0) + 1;
      });
      const catSpread = Object.entries(catCount)
        .map(([c, count]) => `${c}: <strong>${count}</strong>`)
        .join(' &nbsp;•&nbsp; ');

      const wrapperClass = (paginated && teamIndex > 0) ? 'team-report-block page-break-before-always' : 'team-report-block';

      html += `
        <div class="${wrapperClass}">
          <div class="team-banner">
            <div class="team-title-group">
              <div class="team-badge-circle">${team.name.charAt(0)}</div>
              <div>
                <h3 class="team-name-text">${team.name}</h3>
                <div class="team-leaders-line">
                  <strong>Official Leader:</strong> ${leader ? leader.name : '<span style="opacity:0.5;">None</span>'} 
                  ${assistant ? ` &nbsp;|&nbsp; <strong>Assistant:</strong> ${assistant.name}` : ''}
                </div>
              </div>
            </div>
            <div class="team-stats-pills">
              <div class="stat-pill"><strong>${teamParticipants.length}</strong> Delegates</div>
              <div class="stat-pill"><strong>${uniqueItems.size}</strong> Items Registered</div>
              ${catSpread ? `<div class="stat-pill" style="opacity:0.9;">${catSpread}</div>` : ''}
            </div>
          </div>

          ${teamParticipants.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th style="width: 5%;">Sl</th>
                  <th style="width: 10%;">Chest No</th>
                  <th style="width: 24%;">Participant Name</th>
                  <th style="width: 14%;">Category</th>
                  <th style="width: 12%;">Place</th>
                  <th style="width: 27%;">Registered Items</th>
                  <th style="width: 8%; text-align: center;">Count</th>
                </tr>
              </thead>
              <tbody>
                ${teamParticipants.map((p, pIdx) => {
                  const categoryName = getCategoryName(p.categoryId);
                  const enrolledItems = (p.itemIds || []).map(id => (state.items || []).find(i => i.id === id)).filter(Boolean) as Item[];
                  
                  let roleBadge = '';
                  if (p.role === 'leader') {
                    roleBadge = '<span class="role-pill role-leader">Leader</span>';
                  } else if (p.role === 'assistant') {
                    roleBadge = '<span class="role-pill role-assistant">Assistant</span>';
                  }

                  return `
                    <tr>
                      <td>${pIdx + 1}</td>
                      <td style="font-weight: 800; color: var(--primary);">${p.chestNumber || '-'}</td>
                      <td>
                        <div style="font-weight: 700; display: inline-flex; align-items: center;">
                          ${p.name} ${roleBadge}
                        </div>
                      </td>
                      <td>${categoryName}</td>
                      <td>${p.place || '-'}</td>
                      <td>
                        ${enrolledItems.length > 0 ? enrolledItems.map(item => `
                          <span class="item-chip-small ${item.type === ItemType.GROUP ? 'item-chip-group' : ''}" title="${item.type} • ${item.performanceType}">
                            ${item.name}
                          </span>
                        `).join('') : '<span style="opacity: 0.35; font-size: 11px;">No items</span>'}
                      </td>
                      <td style="text-align: center; font-weight: 800; color: var(--secondary);">${enrolledItems.length}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          ` : '<p style="padding: 15px; font-style: italic; opacity: 0.5;">No participants found for this team matching current filters.</p>'}
        </div>
      `;
    });

    setReportContent({ 
      title: 'Teams & Participants Roster', 
      content: html, 
      isSearchable: true, 
      hideHeader: !showPrintHeader, 
      hideFooter: !showPrintFooter 
    });
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
    
    (state.categories || []).forEach(cat => {
        const itemTypeFilter = globalFilters?.itemType || [];
        const catItems = (state.items || []).filter(i => i.categoryId === cat.id && (itemTypeFilter.length === 0 || itemTypeFilter.some(t => t.toLowerCase() === (i.type || '').toLowerCase()))).sort((a,b) => a.name.localeCompare(b.name));
        if (catItems.length === 0) return;
        
        const isGZone = !!cat.isGeneralCategory || /g[\s_-]?zone|general/i.test(cat.name);
        const catItemIds = new Set(catItems.map(i => i.id));
        const catParticipants = filteredParticipants.filter(p => {
            if (isGZone) {
                // Encompass all participants from both Sub-Zone and High-Zone tiers
                return true;
            }
            return p.categoryId === cat.id || (p.itemIds || []).some(id => catItemIds.has(id));
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
                            const extCatName = isExternalCat ? (state.categories || []).find(c => c.id === p.categoryId)?.name : null;
                            const catBadge = extCatName ? `<span style="font-size: 8px; font-weight: 700; opacity: 0.7; margin-left: 4px; color: #6366f1;">(${extCatName})</span>` : '';
                            return `
                                <tr>
                                    <td class="participant-name-cell">${p.chestNumber} - ${p.name}${catBadge}</td>
                                    ${catItems.map(item => `
                                        <td>${(p.itemIds || []).includes(item.id) && showEnrollmentMarks ? '<span class="check-mark">&#10003;</span>' : ''}</td>
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

  const generateTeamChecklistMatrix = (selectedTeamId?: string) => {
    if (!state) return;

    const teamsToProcess = selectedTeamId 
      ? filteredTeams.filter(t => t.id === selectedTeamId)
      : filteredTeams;

    if (teamsToProcess.length === 0) {
      const html = `${getStyles()}${getWatermarkHTML()}${getBrandingHeaderHTML('Team Checklist Matrix')}<p style="padding: 50px; text-align: center; opacity: 0.5;">No teams match the current filters.</p>`;
      setReportContent({
        title: 'Team Checklist Matrix',
        content: html,
        isSearchable: true,
        hideHeader: !showPrintHeader,
        hideFooter: !showPrintFooter
      });
      return;
    }

    // Classify categories into: Sub Zone, High Zone, and G-Zone (General)
    const gZoneCats = (state.categories || []).filter(c => c.isGeneralCategory || /g[\s_-]?zone|general/i.test(c.name));
    const nonGCats = (state.categories || []).filter(c => !gZoneCats.some(g => g.id === c.id));

    const subCats = nonGCats.filter(c => /sub/i.test(c.name));
    const highCats = nonGCats.filter(c => !subCats.some(s => s.id === c.id) && /high|senior/i.test(c.name));

    // Robust fallbacks if category names don't literally contain 'sub' or 'high'
    const remainingNonGCats = nonGCats.filter(c => !subCats.some(s => s.id === c.id) && !highCats.some(h => h.id === c.id));
    if (subCats.length === 0 && remainingNonGCats.length > 0) {
      subCats.push(remainingNonGCats.shift()!);
    }
    if (highCats.length === 0 && remainingNonGCats.length > 0) {
      highCats.push(remainingNonGCats.shift()!);
    }
    if (remainingNonGCats.length > 0) {
      highCats.push(...remainingNonGCats);
    }

    const subCatIds = new Set(subCats.map(c => c.id));
    const highCatIds = new Set(highCats.map(c => c.id));
    const gZoneCatIds = new Set(gZoneCats.map(c => c.id));

    const itemTypeFilter = globalFilters?.itemType || [];
    const perfFilter = globalFilters?.performanceType || [];
    const itemFilter = globalFilters?.itemId || [];

    const filterItem = (i: Item) => {
      if (itemFilter.length > 0 && !itemFilter.includes(i.id)) return false;
      if (perfFilter.length > 0 && !perfFilter.includes(i.performanceType)) return false;
      if (itemTypeFilter.length > 0 && !itemTypeFilter.some(t => t.toLowerCase() === (i.type || '').toLowerCase())) return false;
      return true;
    };

    const subItems = (state.items || []).filter(i => subCatIds.has(i.categoryId) && filterItem(i)).sort((a,b) => a.name.localeCompare(b.name));
    const highItems = (state.items || []).filter(i => highCatIds.has(i.categoryId) && filterItem(i)).sort((a,b) => a.name.localeCompare(b.name));
    const gZoneItems = (state.items || []).filter(i => gZoneCatIds.has(i.categoryId) && filterItem(i)).sort((a,b) => a.name.localeCompare(b.name));

    const matrixReportStyles = `
      <style>
        .team-matrix-container { margin-bottom: 3.5rem; page-break-inside: avoid; }
        .team-matrix-banner {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border: 2px solid var(--primary);
            border-radius: 14px;
            padding: 16px 20px;
            margin-bottom: 18px;
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
        }
        .team-matrix-title-group { display: flex; align-items: center; gap: 14px; }
        .team-avatar-box {
            width: 46px;
            height: 46px;
            background: var(--primary);
            color: #fff;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            font-weight: 900;
            font-family: 'Roboto Slab', serif;
            text-transform: uppercase;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .team-name-heading {
            font-family: 'Roboto Slab', serif;
            font-size: 20px;
            font-weight: 900;
            color: var(--primary);
            text-transform: uppercase;
            margin: 0;
            letter-spacing: -0.5px;
        }
        .team-subline { font-size: 11px; color: #475569; margin-top: 3px; font-weight: 600; }
        .team-pills { display: flex; flex-wrap: wrap; gap: 6px; }
        .team-pill {
            background: #fff;
            border: 1px solid var(--border);
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 10px;
            font-weight: 700;
            color: var(--text-primary);
            box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        }
        .zone-matrix-section {
            margin-top: 18px;
            margin-bottom: 26px;
            page-break-inside: avoid;
        }
        .zone-header-strip {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 9px 15px;
            border-radius: 8px;
            margin-bottom: 8px;
            border: 1px solid var(--border);
        }
        .zone-strip-sub { background: #ecfdf5; border-color: #a7f3d0; color: #065f46; }
        .zone-strip-high { background: #eef2ff; border-color: #c7d2fe; color: #3730a3; }
        .zone-strip-gzone { background: #fff7ed; border-color: #fed7aa; color: #9a3412; }
        .zone-title-text { font-family: 'Roboto Slab', serif; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
        .zone-meta-text { font-size: 10px; font-weight: 700; opacity: 0.85; text-transform: uppercase; }
        
        .matrix-scroll-wrapper {
            overflow-x: auto;
            max-width: 100%;
            border: 1px solid var(--border);
            border-radius: 8px;
            background: #fff;
            margin-bottom: 12px;
            -webkit-overflow-scrolling: touch;
        }
        .team-matrix-table {
            border-collapse: collapse;
            width: 100%;
            min-width: 100%;
            font-size: 10px;
            table-layout: auto !important;
        }
        .team-matrix-table th, .team-matrix-table td {
            border: 1px solid var(--border);
            padding: 4px 6px;
            text-align: center;
        }
        .team-matrix-header-cell {
            height: 155px;
            vertical-align: bottom;
            padding: 8px 2px !important;
            width: 32px;
            min-width: 30px;
            max-width: 36px;
            position: relative;
            background: #f8fafc;
        }
        .team-matrix-header-text {
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
        .part-id-cell {
            text-align: left !important;
            font-weight: 700;
            min-width: 180px;
            max-width: 230px;
            padding-left: 8px !important;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            background: #fff;
        }
        .tier-pill {
            display: inline-block;
            font-size: 8px;
            font-weight: 800;
            text-transform: uppercase;
            padding: 1px 5px;
            border-radius: 4px;
            margin-left: 4px;
            vertical-align: middle;
        }
        .tier-sub { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
        .tier-high { background: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe; }
        .tier-general { background: #ffedd5; color: #9a3412; border: 1px solid #fed7aa; }
        .check-mark {
            font-family: serif;
            font-weight: 900;
            color: var(--brand-green);
            font-size: 13px;
            line-height: 1;
            display: inline-block;
        }
        .empty-box {
            display: inline-block;
            width: 11px;
            height: 11px;
            border: 1px solid #cbd5e1;
            border-radius: 2px;
        }
        .total-badge-col {
            font-weight: 800;
            background: #f8fafc;
            color: var(--secondary);
            font-size: 10px;
            min-width: 44px;
        }
        .summary-row td {
            background: #f1f5f9 !important;
            font-weight: 800;
            font-size: 10px;
            color: var(--primary);
            border-top: 2px solid var(--border);
        }
        .team-nav-anchors {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 8px;
            justify-content: center;
            margin-bottom: 25px;
            padding: 10px 14px;
            background: #f8fafc;
            border: 1px solid var(--border);
            border-radius: 10px;
        }
        .team-nav-btn {
            display: inline-block;
            padding: 5px 12px;
            border-radius: 6px;
            background: #fff;
            border: 1px solid var(--border);
            font-size: 10px;
            font-weight: 800;
            color: var(--primary);
            text-transform: uppercase;
            text-decoration: none;
            transition: all 0.2s ease;
        }
        .team-nav-btn:hover {
            background: var(--primary);
            color: #fff !important;
        }
        @media print {
            .matrix-scroll-wrapper { overflow: visible !important; border: none; }
            .team-matrix-container { page-break-inside: avoid; }
            .zone-matrix-section { page-break-inside: avoid; }
            .team-nav-anchors { display: none !important; }
        }
      </style>
    `;

    const renderZoneTableHTML = (
      zoneName: string,
      zoneBadgeClass: string,
      zoneItems: Item[],
      zoneParticipants: Participant[],
      isGZone: boolean
    ) => {
      if (zoneItems.length === 0) {
        return `
          <div class="zone-matrix-section">
              <div class="zone-header-strip ${zoneBadgeClass}">
                  <span class="zone-title-text">${zoneName} Matrix</span>
                  <span class="zone-meta-text">0 Items Configured</span>
              </div>
              <p style="padding: 10px; font-style: italic; color: #888; font-size: 11px;">No items configured for this zone matching active filters.</p>
          </div>
        `;
      }

      if (zoneParticipants.length === 0) {
        return `
          <div class="zone-matrix-section">
              <div class="zone-header-strip ${zoneBadgeClass}">
                  <span class="zone-title-text">${zoneName} Matrix</span>
                  <span class="zone-meta-text">${zoneItems.length} Items &nbsp;•&nbsp; 0 Delegates</span>
              </div>
              <p style="padding: 10px; font-style: italic; color: #888; font-size: 11px;">No participants enrolled for this team in ${zoneName}.</p>
          </div>
        `;
      }

      // Precompute item enrolled counts
      const itemEnrolledCounts: Record<string, number> = {};
      zoneItems.forEach(item => {
        let count = 0;
        zoneParticipants.forEach(p => {
          if ((p.itemIds || []).includes(item.id)) count++;
        });
        itemEnrolledCounts[item.id] = count;
      });

      return `
        <div class="zone-matrix-section">
            <div class="zone-header-strip ${zoneBadgeClass}">
                <span class="zone-title-text">${zoneName} Checklist Matrix</span>
                <span class="zone-meta-text">${zoneItems.length} Items &nbsp;•&nbsp; ${zoneParticipants.length} Delegates ${isGZone ? '(Combined Tier)' : ''}</span>
            </div>
            <div class="matrix-scroll-wrapper">
                <table class="team-matrix-table">
                    <thead>
                        <tr>
                            <th class="part-id-cell" style="background: #f8fafc;">
                                Participant Identity (Chest No & Name)
                            </th>
                            ${zoneItems.map(item => `
                                <th class="team-matrix-header-cell" title="${item.name} (${item.type} - ${item.performanceType})">
                                    <div class="team-matrix-header-text">
                                        ${item.code ? `<span style="opacity: 0.6; font-size: 8px;">#${item.code} </span>` : ''}
                                        <span>${item.name}</span>
                                        <span style="opacity: 0.6; font-size: 8px; margin-top: 2px;">(${item.type === ItemType.GROUP ? 'G' : 'S'})</span>
                                    </div>
                                </th>
                            `).join('')}
                            <th class="total-badge-col" style="vertical-align: middle; padding: 4px;">
                                Total
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        ${zoneParticipants.map(p => {
                            const enrolledCount = zoneItems.filter(i => (p.itemIds || []).includes(i.id)).length;
                            let tierPill = '';
                            if (isGZone) {
                                const isSubTier = subCatIds.has(p.categoryId);
                                const isHighTier = highCatIds.has(p.categoryId);
                                if (isSubTier) tierPill = '<span class="tier-pill tier-sub">Sub</span>';
                                else if (isHighTier) tierPill = '<span class="tier-pill tier-high">High</span>';
                                else tierPill = '<span class="tier-pill tier-general">G-Zone</span>';
                            }

                            return `
                                <tr>
                                    <td class="part-id-cell">
                                        <span style="font-weight: 800; color: var(--primary); margin-right: 4px;">${p.chestNumber || '-'}</span>
                                        <span style="color: var(--text-primary); font-weight: 700;">${p.name}</span>
                                        ${tierPill}
                                    </td>
                                    ${zoneItems.map(item => {
                                        const isEnrolled = (p.itemIds || []).includes(item.id);
                                        return `
                                            <td>
                                                ${isEnrolled 
                                                    ? (showEnrollmentMarks ? '<span class="check-mark">&#10004;</span>' : '<span class="empty-box"></span>') 
                                                    : ''}
                                            </td>
                                        `;
                                    }).join('')}
                                    <td class="total-badge-col" style="font-weight: 800; color: ${enrolledCount > 0 ? 'var(--secondary)' : '#aaa'};">
                                        ${enrolledCount}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="summary-row">
                            <td class="part-id-cell" style="font-weight: 800; text-transform: uppercase;">
                                Team Enrolled Total
                            </td>
                            ${zoneItems.map(item => `
                                <td>${itemEnrolledCounts[item.id] || 0}</td>
                            `).join('')}
                            <td class="total-badge-col" style="color: var(--primary);">
                                ${zoneParticipants.reduce((sum, p) => sum + zoneItems.filter(i => (p.itemIds || []).includes(i.id)).length, 0)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
      `;
    };

    let html = `${getStyles()}${matrixReportStyles}${getWatermarkHTML()}${getBrandingHeaderHTML('Team Checklist Matrix - Sub, High & G Zones')}`;

    if (teamsToProcess.length > 1) {
      html += `
        <div class="team-nav-anchors">
            <span style="font-size: 10px; font-weight: 800; color: #64748b; margin-right: 4px; text-transform: uppercase;">Jump to Team:</span>
            ${teamsToProcess.map(t => `<a href="#team-${t.id}" class="team-nav-btn">${t.name}</a>`).join('')}
        </div>
      `;
    }

    teamsToProcess.forEach((team, teamIndex) => {
      const allTeamParts = (state.participants || []).filter(p => p.teamId === team.id);
      const leader = allTeamParts.find(p => p.role === 'leader');
      const assistant = allTeamParts.find(p => p.role === 'assistant');

      // Sub Zone participants of this team:
      const subParts = allTeamParts.filter(p => 
        subCatIds.has(p.categoryId) || (p.itemIds || []).some(id => subItems.some(i => i.id === id))
      ).sort((a, b) => (a.chestNumber || '').localeCompare(b.chestNumber || '', undefined, { numeric: true }));

      // High Zone participants of this team:
      const highParts = allTeamParts.filter(p => 
        highCatIds.has(p.categoryId) || (p.itemIds || []).some(id => highItems.some(i => i.id === id))
      ).sort((a, b) => (a.chestNumber || '').localeCompare(b.chestNumber || '', undefined, { numeric: true }));

      // G-Zone participants of this team:
      const enrolledGParts = allTeamParts.filter(p => 
        gZoneCatIds.has(p.categoryId) || (p.itemIds || []).some(id => gZoneItems.some(i => i.id === id))
      ).sort((a, b) => (a.chestNumber || '').localeCompare(b.chestNumber || '', undefined, { numeric: true }));
      const gParts = enrolledGParts.length > 0 ? enrolledGParts : allTeamParts.sort((a, b) => (a.chestNumber || '').localeCompare(b.chestNumber || '', undefined, { numeric: true }));

      const uniqueTeamItems = new Set<string>();
      allTeamParts.forEach(p => (p.itemIds || []).forEach(id => uniqueTeamItems.add(id)));

      const wrapperClass = (isPaginated && teamIndex > 0) ? 'report-block team-matrix-container page-break-before-always' : 'report-block team-matrix-container';

      html += `
        <div class="${wrapperClass}" id="team-${team.id}">
          <div class="team-matrix-banner">
            <div class="team-matrix-title-group">
              <div class="team-avatar-box">${team.name.charAt(0)}</div>
              <div>
                <h3 class="team-name-heading">${team.name}</h3>
                <div class="team-subline">
                  <strong>Official Leader:</strong> ${leader ? leader.name : '<span style="opacity:0.5;">None</span>'} 
                  ${assistant ? ` &nbsp;|&nbsp; <strong>Assistant:</strong> ${assistant.name}` : ''}
                </div>
              </div>
            </div>
            <div class="team-pills">
              <div class="team-pill"><strong>${allTeamParts.length}</strong> Total Delegates</div>
              <div class="team-pill" style="color: #065f46; border-color: #a7f3d0;"><strong>${subParts.length}</strong> Sub Zone</div>
              <div class="team-pill" style="color: #3730a3; border-color: #c7d2fe;"><strong>${highParts.length}</strong> High Zone</div>
              <div class="team-pill" style="color: #9a3412; border-color: #fed7aa;"><strong>${gParts.length}</strong> G-Zone</div>
              <div class="team-pill"><strong>${uniqueTeamItems.size}</strong> Items Registered</div>
            </div>
          </div>

          <!-- 1. Sub Zone Matrix -->
          ${renderZoneTableHTML('Sub Zone', 'zone-strip-sub', subItems, subParts, false)}

          <!-- 2. High Zone Matrix -->
          ${renderZoneTableHTML('High Zone', 'zone-strip-high', highItems, highParts, false)}

          <!-- 3. G-Zone Matrix -->
          ${renderZoneTableHTML('G-Zone', 'zone-strip-gzone', gZoneItems, gParts, true)}
        </div>
      `;
    });

    const reportTitle = selectedTeamId 
      ? `Team Checklist Matrix - ${getTeamName(selectedTeamId)}`
      : 'Teams Checklist Matrix (Sub, High & G Zones)';

    setReportContent({
      title: reportTitle,
      content: html,
      isSearchable: true,
      hideHeader: !showPrintHeader,
      hideFooter: !showPrintFooter
    });
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
             <Card title="Teams & Participants" action={<button onClick={() => generateTeamsAndParticipantsReport(isPaginated)} className="text-indigo-600 hover:text-indigo-800" title="Generate Teams & Participants Directory"><Users size={20}/></button>}> 
                {filteredTeams.length > 0 && <CountBadge count={filteredTeams.length} label="Teams" />} 
                <div className="text-center p-4"> 
                    <Users className="h-12 w-12 mx-auto text-blue-600 dark:text-blue-400 mb-2" /> 
                    <p className="text-sm text-zinc-500">Roster of all teams with enrolled participants and item details.</p> 
                </div> 
             </Card>
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
             <Card 
                title="Team Checklist Matrix" 
                action={
                    <button 
                        onClick={() => generateTeamChecklistMatrix()} 
                        className="text-indigo-600 hover:text-indigo-800 transition-colors" 
                        title="Generate Team Checklist Matrix (Sub, High & G Zones)"
                    >
                        <CheckSquare size={20}/>
                    </button>
                }
             > 
                {filteredTeams.length > 0 && <CountBadge count={filteredTeams.length} label="Teams" />} 
                <div className="p-4 flex flex-col justify-between h-full"> 
                    <div className="text-center mb-3"> 
                        <CheckSquare className="h-12 w-12 mx-auto text-emerald-500 dark:text-emerald-400 mb-2" /> 
                        <p className="text-sm text-zinc-500">Separate checklist matrix for each team across Sub, High & G Zones.</p> 
                    </div> 
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex flex-wrap items-center justify-center gap-1.5">
                        <button
                            onClick={() => generateTeamChecklistMatrix()}
                            className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-all active:scale-95 cursor-pointer"
                            title="Generate checklist matrix for all teams separated"
                        >
                            All Teams
                        </button>
                        {filteredTeams.map(t => (
                            <button
                                key={t.id}
                                onClick={() => generateTeamChecklistMatrix(t.id)}
                                className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 truncate max-w-[100px] transition-all active:scale-95 cursor-pointer"
                                title={`Generate checklist matrix specifically for ${t.name}`}
                            >
                                {t.name}
                            </button>
                        ))}
                    </div>
                </div> 
             </Card>
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