import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params

    // Try to find job by id first, then by fileId
    let job = await prisma.job.findUnique({ where: { id } })

    if (!job) {
      // Try to find the latest job for this fileId
      job = await prisma.job.findFirst({
        where: { fileId: id },
        orderBy: { createdAt: 'desc' },
      })
    }

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(job)

  } catch (error) {
    console.error('Job fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    )
  }
}
