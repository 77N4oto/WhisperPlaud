import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await ctx.params

    const transcript = await prisma.transcript.findFirst({
      where: {
        fileId: fileId
      }
    })

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript not found' },
        { status: 404 }
      )
    }

    const safeParse = (val: string | null): any => {
      if (!val) return null
      try { return JSON.parse(val) } catch { return null }
    }

    const result = {
      ...transcript,
      segments: safeParse(transcript.segments) ?? [],
      words: safeParse(transcript.words) ?? [],
      speakers: safeParse(transcript.speakers) ?? {},
      corrections: safeParse(transcript.corrections) ?? [],
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Transcript fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transcript' },
      { status: 500 }
    )
  }
}
