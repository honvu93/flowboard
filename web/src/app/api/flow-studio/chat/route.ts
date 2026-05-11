import { NextRequest } from 'next/server';

const SYSTEM_PROMPT = `You are Flow Studio, AutoVeoup's AI video creation assistant. Help users create AI-generated videos through natural conversation in Vietnamese or English.

CAPABILITIES: Extract story, characters, locations from user descriptions. Design scene storyboards. Generate reference images, scene images, and video clips. Monitor progress.

RULES:
- Character/location descriptions = APPEARANCE ONLY
- Scene prompts = ACTION ONLY (use entity NAMES)
- Always present extracted plan for user confirmation before generating
- Entity types: character, location, visual_asset, creature
- Visual styles: realistic, 3d_pixar, anime, stop_motion, minecraft, oil_painting
- Respond in user's language. Be concise but friendly.`;

const TOOLS = [
  { name: 'create_flow_project', description: 'Create video project with characters, locations, scenes', input_schema: { type: 'object', properties: { name: { type: 'string' }, story: { type: 'string' }, orientation: { type: 'string', enum: ['VERTICAL', 'HORIZONTAL'] }, material: { type: 'string' }, characters: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, entity_type: { type: 'string', enum: ['character', 'location', 'visual_asset', 'creature'] }, description: { type: 'string' } }, required: ['name', 'entity_type', 'description'] } }, scenes: { type: 'array', items: { type: 'object', properties: { prompt: { type: 'string' }, character_names: { type: 'array', items: { type: 'string' } } }, required: ['prompt', 'character_names'] } } }, required: ['name', 'story', 'orientation', 'characters', 'scenes'] } },
  { name: 'generate_reference_images', description: 'Generate reference images for entities', input_schema: { type: 'object', properties: { projectId: { type: 'string' } }, required: ['projectId'] } },
  { name: 'generate_scene_images', description: 'Generate images for all scenes', input_schema: { type: 'object', properties: { projectId: { type: 'string' }, videoId: { type: 'string' } }, required: ['projectId', 'videoId'] } },
  { name: 'generate_video_clips', description: 'Generate 8-second video clips', input_schema: { type: 'object', properties: { projectId: { type: 'string' }, videoId: { type: 'string' } }, required: ['projectId', 'videoId'] } },
  { name: 'get_project_status', description: 'Get generation progress', input_schema: { type: 'object', properties: { projectId: { type: 'string' } }, required: ['projectId'] } },
];

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return new Response('data: {"error":"ANTHROPIC_API_KEY not configured"}\n\n', { headers: { 'Content-Type': 'text/event-stream' } });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: string, d: any) => controller.enqueue(encoder.encode('event: ' + e + '\ndata: ' + JSON.stringify(d) + '\n\n'));
      try {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 4096, system: SYSTEM_PROMPT, tools: TOOLS, messages: [{ role: 'user', content: message }], stream: true }),
        });
        if (!resp.ok) { send('error', { message: 'Claude API error: ' + resp.status }); controller.close(); return; }
        const reader = resp.body?.getReader(); if (!reader) { controller.close(); return; }
        const decoder = new TextDecoder(); let buffer = '';
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n'); buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.startsWith('data: ')) { const d = line.slice(6); if (d === '[DONE]') continue; try { send('claude', JSON.parse(d)); } catch {} }
          }
        }
        send('done', {});
      } catch (err: any) { send('error', { message: err.message }); }
      controller.close();
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } });
}
