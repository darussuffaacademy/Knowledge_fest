import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '10mb' }));

  // Server-side route for schedule generation (Gemini AI + Algorithmic Orchestrator)
  app.post('/api/generate-schedule', async (req, res) => {
    try {
      const { eventDays = [], eventStages = [], eventTimes = [], items = [] } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'No items registered to schedule.' });
      }

      const days = (Array.isArray(eventDays) && eventDays.length > 0) 
        ? eventDays 
        : ['Day 1', 'Day 2'];
      const stages = (Array.isArray(eventStages) && eventStages.length > 0) 
        ? eventStages 
        : ['Main Stage', 'Auditorium'];
      const times = (Array.isArray(eventTimes) && eventTimes.length > 0) 
        ? eventTimes 
        : ['09:00 AM', '11:30 AM', '02:00 PM', '04:30 PM'];

      const fallbackAlgorithm = () => {
        const schedule: any[] = [];
        let dayIdx = 0;
        let timeIdx = 0;
        let stageIdx = 0;

        // Group by category to keep similar events clustered logically
        const sortedItems = [...items].sort((a: any, b: any) => {
          if (a.categoryId !== b.categoryId) return (a.categoryId || '').localeCompare(b.categoryId || '');
          return (a.name || '').localeCompare(b.name || '');
        });

        sortedItems.forEach((item: any, index: number) => {
          const date = days[dayIdx % days.length];
          const time = times[timeIdx % times.length];
          const stage = stages[stageIdx % stages.length];

          schedule.push({
            id: `sch_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
            itemId: item.id,
            categoryId: item.categoryId || '',
            date,
            time,
            stage
          });

          stageIdx++;
          if (stageIdx >= stages.length) {
            stageIdx = 0;
            timeIdx++;
            if (timeIdx >= times.length) {
              timeIdx = 0;
              dayIdx++;
            }
          }
        });
        return schedule;
      };

      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey.length > 10) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const prompt = `Generate a balanced schedule JSON array: [{id, itemId, categoryId, date, time, stage}]. Days: ${days.join(', ')}. Slots: ${times.join(', ')}. Stages: ${stages.join(', ')}. Items: ${items.map((i: any) => `${i.name} (ID: ${i.id}, Category: ${i.categoryId || 'General'})`).join('; ')}`;

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
          // Gracefully fallback to deterministic algorithm
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
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
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
