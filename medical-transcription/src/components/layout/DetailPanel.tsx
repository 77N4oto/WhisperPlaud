'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'

interface Job {
  id: string
  status: string
  progress: number
  phase: string | null
  fileId: string
}

interface Transcript {
  id: string
  language: string
  text: string
  segments: Array<{
    start: number
    end: number
    text: string
    speaker: string
  }>
  speakers: Record<string, {
    id: string
    label: string
    segments_count: number
    total_duration: number
  }>
  summaryShort: string
  summaryMedium: string
  summaryLong: string
  corrections: string[]
  confidence: number
}

export function DetailPanel({ selectedFileId }: { selectedFileId: string | null }) {
  const [job, setJob] = useState<Job | null>(null)
  const [transcript, setTranscript] = useState<Transcript | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedFileId) return

    let es: EventSource | null = null

    const fetchJobStatus = async () => {
      try {
        setLoading(true)
        const jobResponse = await fetch(`/api/jobs/${selectedFileId}`)
        if (jobResponse.ok) {
          const jobData: Job = await jobResponse.json()
          setJob(jobData)

          if (jobData.status === 'completed') {
            const transcriptResponse = await fetch(`/api/transcripts/${selectedFileId}`)
            if (transcriptResponse.ok) {
              const transcriptData = await transcriptResponse.json()
              setTranscript(transcriptData)
            }
          }

          if (jobData.status === 'processing') {
            es = new EventSource(`/api/jobs/${jobData.id}/events`)
            const watchdog = setTimeout(() => { try { clearTimeout(watchdog); es?.close() } catch {} }, 5 * 60 * 1000)
            es.onmessage = (event) => {
              const data = JSON.parse(event.data)
              setJob((prev) => ({ ...(prev ?? data), ...data }))
              if (data.status === 'completed') {
                clearTimeout(watchdog); es?.close()
                fetch(`/api/transcripts/${selectedFileId}`)
                  .then(res => res.json())
                  .then(setTranscript)
                  .catch(console.error)
              } else if (data.status === 'failed') {
                clearTimeout(watchdog); es?.close()
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch job status:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchJobStatus()
    // Cleanup function
    return () => {
      if (es) {
        es.close();
      }
    }
  }, [selectedFileId])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!selectedFileId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        ファイルを選択してください
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="h-full p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>処理状況</CardTitle>
        </CardHeader>
        <CardContent>
          {job ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span>ステータス:</span>
                <Badge variant={
                  job.status === 'completed' ? 'default' :
                  job.status === 'processing' ? 'secondary' :
                  job.status === 'failed' ? 'destructive' : 'outline'
                }>
                  {job.status === 'completed' ? '完了' :
                   job.status === 'processing' ? '処理中' :
                   job.status === 'failed' ? 'エラー' : job.status}
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>進捗</span>
                  <span>{job.progress}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {job.phase}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">処理情報がありません</p>
          )}
        </CardContent>
      </Card>

      {transcript && (
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              文字起こし結果
              <Badge variant="outline">信頼度: {(transcript.confidence * 100).toFixed(1)}%</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="transcript" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="transcript">全文</TabsTrigger>
                <TabsTrigger value="segments">話者別</TabsTrigger>
                <TabsTrigger value="summary">要約</TabsTrigger>
                <TabsTrigger value="corrections">補正</TabsTrigger>
              </TabsList>
              
              <TabsContent value="transcript" className="space-y-4">
                <div className="max-h-96 overflow-y-auto">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {transcript.text}
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="segments" className="space-y-4">
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {transcript.segments.map((segment, index) => (
                    <div key={index} className="border-l-4 border-primary/20 pl-4 py-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Badge variant="outline" className="text-xs">
                          {transcript.speakers[segment.speaker]?.label || segment.speaker}
                        </Badge>
                        <span>{formatTime(segment.start)} - {formatTime(segment.end)}</span>
                      </div>
                      <p className="text-sm">{segment.text}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="summary" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">簡潔要約</h4>
                    <p className="text-sm text-muted-foreground">{transcript.summaryShort}</p>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">詳細要約</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{transcript.summaryMedium}</p>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">完全要約</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{transcript.summaryLong}</p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="corrections" className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">医療用語補正 ({transcript.corrections.length}件)</h4>
                  {transcript.corrections.length > 0 ? (
                    <div className="space-y-1">
                      {transcript.corrections.map((correction, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="text-xs">補正</Badge>
                          <span className="font-mono">{correction}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">補正された用語はありません</p>
                  )}
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <h4 className="font-medium">話者情報</h4>
                  <div className="space-y-2">
                    {Object.values(transcript.speakers).map((speaker) => (
                      <div key={speaker.id} className="flex items-center justify-between text-sm">
                        <span>{speaker.label}</span>
                        <div className="text-muted-foreground">
                          {speaker.segments_count}発言 ({formatTime(speaker.total_duration)})
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

