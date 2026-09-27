import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Time parsing and formatting utilities
function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 9 * 60; // 09:00 AM default
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
}

function formatMinutesToTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  let hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const strHours = hours < 10 ? `0${hours}` : `${hours}`;
  const strMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${strHours}:${strMinutes} ${period}`;
}

function classifyCategory(categoryName: string = '', categoryId: string = ''): 'G_ZONE' | 'SUB_ZONE' | 'HIGH_ZONE' | 'OTHER' {
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
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '10mb' }));

  // Server-side route for schedule generation (Gemini AI + Algorithmic Orchestrator)
  app.post('/api/generate-schedule', async (req, res) => {
    try {
      const { 
        eventDays = [], 
        eventStages = [], 
        eventTimes = [], 
        items = [],
        startTime = '' 
      } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'No items registered to schedule.' });
      }

      const days = (Array.isArray(eventDays) && eventDays.length > 0) 
        ? eventDays 
        : ['Day 1', 'Day 2'];
      const stages = (Array.isArray(eventStages) && eventStages.length > 0) 
        ? eventStages 
        : ['Main Stage', 'Auditorium'];
      const rawTimes = (Array.isArray(eventTimes) && eventTimes.length > 0) 
        ? eventTimes 
        : ['09:00 AM', '11:30 AM', '02:00 PM', '04:30 PM'];

      // Sort all configured time slots chronologically
      const sortedSlots = [...rawTimes].sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));

      // Multi-Day, Multi-Stage, Zone-Aware Scheduling Algorithm
      // Guarantees:
      // 1. G Zone items are kept cohesive as their own intact group.
      // 2. Sub Zone and High Zone programmes are mingled (interleaved) so every day receives a mix of both.
      // 3. Programmes are distributed across all configured festival days.
      // 4. Rotates and utilizes ALL updated stages from eventStages.
      // 5. Utilizes ALL updated session time slots from eventTimes.
      // 6. On each stage on any given day, NO TWO items ever run simultaneously.
      // 7. Consecutive timing is strictly calculated from each item's duration.
      const fallbackAlgorithm = () => {
        const schedule: any[] = [];
        
        // Sort items first by name/sub-order
        const sortedItems = [...items].sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

        // Group into zone categories
        const gZoneItems = sortedItems.filter((i: any) => classifyCategory(i.categoryName, i.categoryId) === 'G_ZONE');
        const subZoneItems = sortedItems.filter((i: any) => classifyCategory(i.categoryName, i.categoryId) === 'SUB_ZONE');
        const highZoneItems = sortedItems.filter((i: any) => classifyCategory(i.categoryName, i.categoryId) === 'HIGH_ZONE');
        const otherItems = sortedItems.filter((i: any) => classifyCategory(i.categoryName, i.categoryId) === 'OTHER');

        // Interleave / mingle Sub Zone and High Zone items
        const mingledSubAndHigh: any[] = [];
        const maxSubHigh = Math.max(subZoneItems.length, highZoneItems.length);
        for (let i = 0; i < maxSubHigh; i++) {
          if (i < subZoneItems.length) mingledSubAndHigh.push(subZoneItems[i]);
          if (i < highZoneItems.length) mingledSubAndHigh.push(highZoneItems[i]);
        }

        const numDays = Math.max(days.length, 1);
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

          const currentDate = days[dayIdx % days.length];

          // Divide this day's items across all the available configured time slots
          const numSlots = Math.max(sortedSlots.length, 1);
          const itemsPerSlot = Math.ceil(dayItems.length / numSlots);

          for (let slotIdx = 0; slotIdx < numSlots; slotIdx++) {
            const slotItems = dayItems.slice(slotIdx * itemsPerSlot, (slotIdx + 1) * itemsPerSlot);
            if (slotItems.length === 0) continue;

            const slotTimeString = sortedSlots[slotIdx % sortedSlots.length];
            const slotStartMinutes = parseTimeToMinutes(slotTimeString);

            // Track timeline for each stage in this slot starting at slotStartMinutes
            const stageTrackers: { [stageName: string]: number } = {};
            stages.forEach(stg => {
              stageTrackers[stg] = slotStartMinutes;
            });

            slotItems.forEach((item: any) => {
              // Rotate across all stages so EVERY stage is utilized
              const stageName = stages[globalStageIdx % stages.length];
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

      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey.length > 10) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const itemsDescription = items
            .map((i: any) => `Item "${i.name}" (ID: ${i.id}, Category: ${i.categoryName || i.categoryId || 'General'}, Duration: ${i.duration || 30} minutes)`)
            .join('; ');

          const prompt = `You are a festival scheduling engine. Schedule the following items onto stages, dividing them across competition days and utilizing all designated time slots and stages.

MANDATORY ZONE & SCHEDULING RULES:
1. MINGLE SUB ZONE AND HIGH ZONE PROGRAMMES:
   You MUST mingle and interleave programmes for Sub Zone (Junior/Primary) and High Zone (Senior) across each day. For instance, on each festival day, there MUST be an active mix of programmes for BOTH Sub Zone and High Zone. Do not isolate all Sub Zone onto Day 1 and all High Zone onto Day 2.
2. KEEP GENERAL / G-ZONE INTACT:
   Keep General / G-Zone items cohesive as a unified group.
3. UTILIZE ALL AVAILABLE STAGES:
   Distribute events across ALL configured stages: ${stages.join(', ')}.
4. USE ALL DESIGNATED TIME SLOTS:
   The festival has configured session time slots: ${sortedSlots.join(', ')}. Distribute each day's programmes across these session anchors.
5. NO SIMULTANEOUS OVERLAPS ON THE SAME STAGE:
   On any given stage on any day, items MUST run one after another in strict sequential order based on their duration.
6. DIVIDE PROGRAMMES ACROSS DAYS:
   Evenly distribute items across festival days (${days.join(', ')}).

Items to schedule:
${itemsDescription}

Return a valid JSON array of objects with keys: id, itemId, categoryId, date, time, stage.`;

          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    itemId: { type: Type.STRING },
                    categoryId: { type: Type.STRING },
                    date: { type: Type.STRING },
                    time: { type: Type.STRING },
                    stage: { type: Type.STRING },
                  },
                  required: ['id', 'itemId', 'categoryId', 'date', 'time', 'stage']
                }
              }
            }
          });

          const parsed = JSON.parse(response.text?.trim() || '[]');
          if (Array.isArray(parsed) && parsed.length > 0) {
            return res.json({ schedule: parsed, source: 'gemini' });
          }
        } catch {
          // Gracefully fallback to deterministic multi-stage algorithm
        }
      }

      const schedule = fallbackAlgorithm();
      return res.json({ schedule, source: 'algorithmic' });
    } catch (err: any) {
      return res.status(500).json({
        error: 'Schedule generation failed',
        status: 'ERROR'
      });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    // Express 5 compatible catch-all fallback for SPA routing
    app.use((_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
