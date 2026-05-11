import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, sceneId, characterId, projectId, videoId, orientation } = body;
  if (!type || !projectId) return NextResponse.json({ error: 'type and projectId required' }, { status: 400 });
  return NextResponse.json(await prisma.flowRequest.create({ data: { type, sceneId: sceneId || null, characterId: characterId || null, projectId, videoId: videoId || null, orientation: orientation || null } }), { status: 201 });
}
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const where: any = {};
  const s = searchParams.get('sceneId'); if (s) where.sceneId = s;
  const p = searchParams.get('projectId'); if (p) where.projectId = p;
  const st = searchParams.get('status'); if (st) where.status = st;
  return NextResponse.json(await prisma.flowRequest.findMany({ where, orderBy: { createdAt: 'asc' } }));
}
