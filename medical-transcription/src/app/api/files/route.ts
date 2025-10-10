import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuthFromRequest } from '@/lib/auth';
import { subscribeToJobProgress } from '@/lib/job-progress';

// Ensure job progress subscription is active (workaround for instrumentation issues)
subscribeToJobProgress();

export async function GET(request: NextRequest) {
  if (!requireAuthFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const files = await prisma.file.findMany({
    orderBy: { uploadedAt: 'desc' },
    take: 100,
  });
  return NextResponse.json({ files });
}
