import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let intervalId: NodeJS.Timeout | null = null;
      let isClosed = false;

      async function pushOnce() {
        if (isClosed) return;

        try {
          const job = await prisma.job.findUnique({ where: { id } });
          const payload = {
            status: job?.status ?? 'unknown',
            progress: job?.progress ?? 0,
            phase: job?.phase ?? null,
            error: job?.error ?? null,
          };
          
          if (!isClosed) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
          }

          if (!job || job.status === 'completed' || job.status === 'failed') {
            if (!isClosed) {
              isClosed = true;
              controller.close();
              if (intervalId) clearInterval(intervalId);
            }
          }
        } catch (error) {
          console.error('[SSE] Error in pushOnce:', error);
          if (!isClosed) {
            isClosed = true;
            controller.close();
            if (intervalId) clearInterval(intervalId);
          }
        }
      }

      intervalId = setInterval(pushOnce, 1000);
      void pushOnce();
    },
    cancel() {
      // Client disconnected
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
