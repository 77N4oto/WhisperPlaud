import { NextRequest, NextResponse } from 'next/server';
import { generatePresignedUploadUrl } from '@/lib/s3';
import { prisma } from '@/lib/db';
import { requireAuthFromRequest } from '@/lib/auth';
import Redis from 'ioredis';

export async function POST(request: NextRequest) {
  try {
    if (!requireAuthFromRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { filename, contentType, size } = await request.json();

    if (!filename || !contentType || typeof size !== 'number') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    if (size > parseInt(process.env.UPLOAD_SIZE_LIMIT || '500000000')) {
      return NextResponse.json({ error: 'File size exceeds limit' }, { status: 400 });
    }

    const timestamp = Date.now();
    const s3Key = `uploads/${timestamp}-${filename}`;
    const uploadUrl = await generatePresignedUploadUrl(s3Key, contentType);

    const file = await prisma.file.create({
      data: {
        filename,
        originalName: filename,
        s3Key,
        s3Bucket: process.env.S3_BUCKET!,
        size,
        mimeType: contentType,
        status: 'uploading',
      },
    });

    return NextResponse.json({ fileId: file.id, uploadUrl, s3Key });
  } catch (error) {
    console.error('Upload preparation error:', error);
    return NextResponse.json({ error: 'Failed to prepare upload' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!requireAuthFromRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileId } = await request.json();
    if (!fileId) {
      return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
    }

    const file = await prisma.file.update({
      where: { id: fileId },
      data: { status: 'uploaded' },
    });

    // Create job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Create job record in database
    await prisma.job.create({
      data: {
        id: jobId,
        fileId: file.id,
        type: 'transcription',
        status: 'pending',
        progress: 0,
        phase: 'Upload complete. Waiting for worker...',
      },
    });

    // Notify Python worker via Redis pub/sub
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    await redis.publish('job:new', JSON.stringify({
      jobId,
      fileId: file.id,
      s3Key: file.s3Key,
      timestamp: Date.now(),
    }));
    redis.disconnect();

    console.log(`[Upload] Notified worker of job ${jobId} for file ${file.id}`);

    return NextResponse.json({ success: true, jobId });
  } catch (error) {
    console.error('Upload completion error:', error);
    return NextResponse.json({ error: 'Failed to complete upload' }, { status: 500 });
  }
}
