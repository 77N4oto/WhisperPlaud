import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuthFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  if (!requireAuthFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fileIds = searchParams.get('fileIds')?.split(',').filter(Boolean) || [];

  if (fileIds.length === 0) {
    return NextResponse.json({ jobs: [] });
  }

  const jobs = await prisma.job.findMany({
    where: {
      fileId: { in: fileIds },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ jobs });
}


