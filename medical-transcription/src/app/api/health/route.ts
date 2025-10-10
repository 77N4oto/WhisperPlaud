import { NextResponse } from 'next/server';
import { testS3Connection } from '@/lib/s3';
import { prisma } from '@/lib/db';

export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: { status: 'unknown' as 'healthy' | 'unhealthy' | 'unknown', error: null as string | null },
      s3: { status: 'unknown' as 'healthy' | 'unhealthy' | 'unknown', error: null as string | null, buckets: [] as string[] },
    },
  };

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.services.database.status = 'healthy';
  } catch (error: any) {
    health.services.database.status = 'unhealthy';
    health.services.database.error = error.message;
    health.status = 'degraded';
  }

  // Check S3
  const s3Result = await testS3Connection();
  if (s3Result.success) {
    health.services.s3.status = 'healthy';
    health.services.s3.buckets = s3Result.buckets || [];
  } else {
    health.services.s3.status = 'unhealthy';
    health.services.s3.error = s3Result.error || 'Unknown error';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}


