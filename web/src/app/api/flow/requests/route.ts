import { prisma } from '../../../../../src/infrastructure/db/prisma-client.js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, sceneId, characterId, projectId, videoId, orientation } = body;
  if (!type || !projectId) return NextResponse.json({ error: 'type and projectId required' }, { status: 400 });
  const request = await prisma.flowRequest.create({ data: { type, sceneId: sceneId || null, characterId: characterId || null, projectId, videoId: videoId || null, orientation: orientation || null } });
  return NextResponse.json(request, { status: 201 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const where: any = {};
  const s = searchParams.get('sceneId'), p = searchParams.get('projectId'), st = searchParams.get('status'), v = searchParams.get('videoId');
  if (s) where.sceneId = s; if (p) where.projectId = p; if (st) where.status = st; if (v) where.videoId = v;
  return NextResponse.json(await prisma.flowRequest.findMany({ where, orderBy: { createdAt: 'asc' } }));
}
