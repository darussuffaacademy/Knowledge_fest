
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useFirebase } from '../hooks/useFirebase';
import { X, Printer, Search } from 'lucide-react';
import { getGlobalFontCSS } from './GlobalFontManager';

interface ReportViewerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  isSearchable?: boolean;
  hideHeader?: boolean;
  hideFooter?: boolean;
}

const ReportViewer: React.FC<ReportViewerProps> = ({ isOpen, onClose, title, content, isSearchable = false, hideHeader = false, hideFooter = false }) => {
  const { state } = useFirebase();
  const [searchTerm, setSearchTerm] = useState('');
  const reportContentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
      setSearchTerm(''); // Reset search on open
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isSearchable || !reportContentRef.current) return;
    const term = searchTerm.toLowerCase().trim();

    // Strategy: Search in standardized blocks first, then rows.
    const blocks = reportContentRef.current.querySelectorAll('.report-block');
    
    if (blocks.length > 0) {
        blocks.forEach(block => {
            const el = block as HTMLElement;
            // Enhanced header matching: look for any textual header or specific profile/block headers
            const headerElement = el.querySelector('h1, h2, h3, h4, h5, h6, .block-header, .profile-header, .profile-name, .block-title');
            const blockHeaderText = headerElement?.textContent?.toLowerCase() || '';
            const blockFullText = (el.textContent || '').toLowerCase();
            
            const matchesHeader = blockHeaderText.includes(term);
            const matchesFullContent = blockFullText.includes(term);

            if (term === '' || matchesFullContent) {
                el.style.display = '';
                
                // Fine-grained row filtering
                // If the header (e.g. Item Name or Participant Name) matches, show all rows for context.
                // Otherwise, filter the table rows based on content.
                const rows = el.querySelectorAll('tbody tr');
                if (rows.length > 0) {
                    rows.forEach(row => {
                        const rowEl = row as HTMLElement;
                        const rowText = (rowEl.textContent || '').toLowerCase();
                        if (term === '' || matchesHeader || rowText.includes(term)) {
                            rowEl.style.display = '';
                        } else {
                            rowEl.style.display = 'none';
                        }
                    });
                }
            } else {
                el.style.display = 'none';
            }
        });
    } else {
        // Fallback for flat reports (just a table)
        const rows = reportContentRef.current.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const rowEl = row as HTMLElement;
            const rowText = (rowEl.textContent || '').toLowerCase();
            rowEl.style.display = (term === '' || rowText.includes(term)) ? '' : 'none';
        });
    }
  }, [searchTerm, isSearchable, content]);

  useEffect(() => {
    if (!isOpen || !reportContentRef.current) return;

    const tables = reportContentRef.current.querySelectorAll('table');
    if (tables.length === 0) return;

    const clickHandler = (e: Event) => {
      const header = e.currentTarget as HTMLElement;
      const table = header.closest('table');
      if (!table) return;

      const columnIndex = parseInt(header.dataset.columnIndex || '0', 10);
      const currentDirection = header.dataset.sortDirection;
      const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
      
      table.querySelectorAll('thead th[data-sortable="true"]').forEach(th => {
        if (th !== header) {
          delete (th as HTMLElement).dataset.sortDirection;
          const indicator = th.querySelector('.sort-indicator');
          if (indicator) indicator.innerHTML = ' &#x2195;'; 
        }
      });

      header.dataset.sortDirection = newDirection;
      const indicator = header.querySelector('.sort-indicator');
      if (indicator) {
        indicator.innerHTML = newDirection === 'asc' ? ' &#x2191;' : ' &#x2193;'; 
      }

      const tbody = table.querySelector('tbody');
      if (!tbody) return;

      const rows = Array.from(tbody.querySelectorAll('tr'));
      const sortedRows = rows.sort((a, b) => {
        const aVal = a.cells[columnIndex]?.innerText || '';
        const bVal = b.cells[columnIndex]?.innerText || '';
        const aNum = parseFloat(aVal.replace(/,/g, ''));
        const bNum = parseFloat(bVal.replace(/,/g, ''));

        let comparison = 0;
        if (!isNaN(aNum) && !isNaN(bNum)) {
          comparison = aNum - bNum;
        } else {
          comparison = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
        }
        
        return newDirection === 'asc' ? comparison : -comparison;
      });

      sortedRows.forEach(row => tbody.appendChild(row));
    };
    
    const headers: NodeListOf<HTMLElement>[] = [];
    tables.forEach(table => {
      const tableHeaders = table.querySelectorAll('thead th[data-sortable="true"]') as NodeListOf<HTMLElement>;
      tableHeaders.forEach(header => {
        header.style.cursor = 'pointer';
        if (!header.querySelector('.sort-indicator')) {
            const indicator = document.createElement('span');
            indicator.className = 'sort-indicator';
            indicator.style.display = 'inline-block';
            indicator.innerHTML = ' &#x2195;'; 
            header.appendChild(indicator);
        }
        header.addEventListener('click', clickHandler);
      });
      headers.push(tableHeaders);
    });
    
    return () => {
      headers.forEach(tableHeaders => {
          tableHeaders.forEach(header => {
              header.removeEventListener('click', clickHandler);
          });
      });
    };
  }, [isOpen, content]);


  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
        alert('Could not open print window. Please ensure pop-up blockers are disabled for this site.');
        return;
    }
    
    const contentToPrint = reportContentRef.current?.innerHTML || content;
    const globalFontCss = getGlobalFontCSS(state);

    const reportHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Roboto+Slab:wght@400;500;600;700;800&display=swap" rel="stylesheet">
          <style> 
            ${globalFontCss}
            @page {
                margin: 0.8in 0.5in;
                counter-increment: page;
                @bottom-center {
                    content: ${hideFooter ? '""' : `"Generated by Knowledge Fest Manager System - Page " counter(page)`};
                    font-family: 'Plus Jakarta Sans', sans-serif;
                    font-size: 8pt;
                    color: #999;
                }
            }
            body { 
                -webkit-font-smoothing: antialiased; 
                -moz-osx-font-smoothing: grayscale; 
                font-family: 'Plus Jakarta Sans', sans-serif; 
                color: #1a1a1a;
                margin: 0;
                padding: 20px;
                background-color: #ffffff;
            }
            .print-ui-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                gap: 12px;
            }
            .print-btn {
                background-color: #C21D2E; 
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                font-family: 'Plus Jakarta Sans', sans-serif;
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                transition: background-color 0.2s;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .print-btn:hover { background-color: #a81726; }
            .print-btn.back-btn { background-color: #f4f4f5; color: #18181b; border: 1px solid #e4e4e7; }
            .print-btn.back-btn:hover { background-color: #e4e4e7; }
            h1, h2, h3, h4, h5, h6 { font-family: 'Roboto Slab', serif; color: #C21D2E; }
            .report-container { max-width: 100%; margin: 0 auto; }
            .sort-indicator { display: none !important; } 
            .no-wrap { white-space: nowrap; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; border: 1px solid #e5e7eb; }
            th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
            th { background-color: #F7F3F0 !important; color: #C21D2E !important; font-weight: 700; font-family: 'Roboto Slab', serif; letter-spacing: 0.5px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            tr:nth-child(even) { background-color: #FBFBFA !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            
            ${hideHeader ? '.enhanced-branding-header { display: none !important; }' : ''}
            
            .print-footer-info {
                display: none;
            }

            @media print {
                .print-ui-container { display: none !important; }
                body { padding: 0; background-color: white; }
                .report-container { width: 100%; }
                .page-break-before-always { page-break-before: always; }
                th, td { padding: 4px 6px !important; }
                table { margin-bottom: 0.75rem !important; }
                -webkit-print-color-adjust: exact; print-color-adjust: exact;
                
                ${hideFooter ? '' : `
                .print-footer-info {
                    display: block;
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    text-align: center;
                    font-size: 8pt;
                    color: #999;
                    padding: 10px 0;
                }
                `}
            }
          </style>
        </head>
        <body>
          <div class="print-ui-container">
            <button class="print-btn back-btn" onclick="window.close()">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
                Back
            </button>
            <button class="print-btn" onclick="window.print()">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                Print Report
            </button>
          </div>
          <div class="report-container">
            <div>${contentToPrint}</div>
          </div>
          <div class="print-footer-info">
             Generated by Knowledge Fest Manager System
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(reportHtml);
    printWindow.document.close();
  };

  if (!isOpen) return null;
  
  return ReactDOM.createPortal(
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose} aria-modal="true" role="dialog">
        <div className="relative flex flex-col w-full h-full max-w-5xl max-h-[95vh] bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl overflow-hidden border border-white/10" onClick={e => e.stopPropagation()}>
          <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800 gap-6 bg-zinc-50 dark:bg-zinc-900/50">
             {isSearchable ? (
                <div className="flex-grow max-w-md relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search Item or Participant..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-xl border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 pl-10 pr-4 py-2.5 text-sm font-bold shadow-inner focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    />
                </div>
            ) : <h2 className="text-xl font-black text-zinc-800 dark:text-zinc-100">{title}</h2>}

            <div className="flex items-center gap-3">
              <button onClick={handlePrint} className="flex items-center gap-2 px-5 py-2.5 bg-amazio-primary text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"><Printer size={16} /> Print</button>
              <button onClick={onClose} className="p-2.5 rounded-xl text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"><X size={24} /></button>
            </div>
          </div>
          <div className="flex-grow overflow-y-auto p-10 bg-white text-zinc-900 custom-scrollbar" ref={reportContentRef} style={{ backgroundColor: 'white' }}>
            <div dangerouslySetInnerHTML={{ __html: content }} />
          </div>
        </div>
      </div>,
      document.body
  );
};

export default ReportViewer;
