import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, story, characters = [], scenes = [], orientation = 'VERTICAL', material } = body;
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const project = await prisma.flowProject.create({
    data: { name, story: story || null, material: material || null, characters: { create: characters.map((c: any) => ({ name: c.name, slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), entityType: c.entity_type || 'character', description: c.description || null })) } },
    include: { characters: true },
  });
  let video = null;
  if (scenes.length > 0) {
    video = await prisma.flowVideo.create({ data: { title: name, orientation, projectId: project.id, scenes: { create: scenes.map((s: any, i: number) => ({ displayOrder: i, prompt: s.prompt, characterNames: s.character_names || [] })) } }, include: { scenes: true } });
  }
  return NextResponse.json({ project, video }, { status: 201 });
}
export async function GET() { return NextResponse.json(await prisma.flowProject.findMany({ include: { characters: true, videos: { include: { scenes: true } } }, orderBy: { createdAt: 'desc' } })); }
