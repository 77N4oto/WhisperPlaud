import { NextRequest, NextResponse } from 'next/server';
import { s3Client } from '@/lib/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@/lib/db';
import { requireAuthFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    if (!requireAuthFromRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > parseInt(process.env.UPLOAD_SIZE_LIMIT || '500000000')) {
      return NextResponse.json({ error: 'File size exceeds limit' }, { status: 400 });
    }

    const timestamp = Date.now();
    const s3Key = `uploads/${timestamp}-${file.name}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const putCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: s3Key,
      Body: buffer,
      ContentType: file.type || 'application/octet-stream',
    });

    await s3Client.send(putCommand);

    const fileRecord = await prisma.file.create({
      data: {
        filename: file.name,
        originalName: file.name,
        s3Key,
        s3Bucket: process.env.S3_BUCKET!,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        status: 'uploaded',
      },
    });

    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    await prisma.job.create({
      data: {
        id: jobId,
        fileId: fileRecord.id,
        type: 'transcription',
        status: 'processing',
        progress: 0,
        phase: 'Upload complete. Processing started',
      },
    });

    setTimeout(async () => {
      try {
        await prisma.job.update({ where: { id: jobId }, data: { progress: 30, phase: 'Transcribing audio' } });

        setTimeout(async () => {
          await prisma.job.update({ where: { id: jobId }, data: { progress: 70, phase: 'Applying medical term corrections' } });

          setTimeout(async () => {
            await prisma.transcript.create({
              data: {
                id: `transcript_${jobId}`,
                fileId: fileRecord.id,
                language: 'ja',
                text: 'Sample transcript about diabetes treatment. Currently using Ozempic and HbA1c is stable.',
                segments: JSON.stringify([
                  { start: 0.0, end: 15.0, text: 'Discussion about diabetes treatment.', speaker: 'SPEAKER_00' },
                  { start: 15.0, end: 30.0, text: 'Using Ozempic, HbA1c trending well.', speaker: 'SPEAKER_01' },
                ]),
                words: JSON.stringify([]),
                speakers: JSON.stringify({
                  SPEAKER_00: { id: 'SPEAKER_00', label: 'Doctor', segments_count: 1, total_duration: 15.0 },
                  SPEAKER_01: { id: 'SPEAKER_01', label: 'MSL', segments_count: 1, total_duration: 15.0 },
                }),
                summaryShort: 'Brief: Ozempic in use, HbA1c stable.',
                summaryMedium: 'Summary\n- Treatment: Ozempic\n- HbA1c: stable\n- Plan: continue',
                summaryLong: 'Detailed summary\nRecording about patient diabetes treatment. GLP-1 agent Ozempic (semaglutide) in use with stable HbA1c. Plan to continue.',
                corrections: JSON.stringify(['オゼンビック -> オゼンピック', 'ヘモグロビンA1C -> HbA1c']),
                confidence: 0.95,
              }
            });

            await prisma.job.update({
              where: { id: jobId },
              data: { status: 'completed', progress: 100, phase: 'Completed' },
            });
          }, 3000);
        }, 2000);
      } catch (error) {
        console.error('Mock processing error:', error);
        await prisma.job.update({
          where: { id: jobId },
          data: { status: 'failed', progress: 0, phase: 'Error: processing failed' },
        });
      }
    }, 1000);

    return NextResponse.json({ success: true, fileId: fileRecord.id, jobId });

  } catch (error) {
    console.error('Direct upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
