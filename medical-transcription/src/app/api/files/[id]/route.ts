import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuthFromRequest } from '@/lib/auth';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true,
});

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[Delete] Starting delete request');
    
    if (!requireAuthFromRequest(request)) {
      console.log('[Delete] Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await ctx.params;
    console.log(`[Delete] Deleting file ID: ${id}`);

    // Get file info
    const file = await prisma.file.findUnique({
      where: { id },
      include: {
        jobs: true,
        transcripts: true,
      },
    });
    
    console.log(`[Delete] File found:`, file ? 'Yes' : 'No');
    console.log(`[Delete] Jobs count: ${file?.jobs.length || 0}`);
    console.log(`[Delete] Transcripts count: ${file?.transcripts.length || 0}`);

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Delete from S3
    try {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: file.s3Key,
      }));
      console.log(`[Delete] Deleted S3 object: ${file.s3Key}`);
    } catch (s3Error) {
      console.error(`[Delete] Failed to delete S3 object:`, s3Error);
      // Continue anyway - file might not exist in S3
    }

    // Delete transcripts from S3
    if (file.transcripts && file.transcripts.length > 0) {
      try {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: `transcripts/${file.id}.json`,
        }));
        console.log(`[Delete] Deleted transcript from S3`);
      } catch (s3Error) {
        console.error(`[Delete] Failed to delete transcript from S3:`, s3Error);
      }
    }

    // Delete from database (cascade will delete jobs and transcripts)
    console.log(`[Delete] Deleting from database...`);
    await prisma.file.delete({
      where: { id },
    });

    console.log(`[Delete] ✅ Successfully deleted file ${id}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Delete] ❌ Error:', error);
    console.error('[Delete] Error details:', error.message);
    console.error('[Delete] Error stack:', error.stack);
    return NextResponse.json({ 
      error: 'Failed to delete file', 
      details: error.message 
    }, { status: 500 });
  }
}


