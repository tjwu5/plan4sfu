import { useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist/build/pdf'
import { useCompletedCourses } from '../../hooks/useCompletedCourses'
import { usePreferences } from '../../hooks/usePreferences'
import { useProfile } from '../../hooks/useProfile'
import { parseTranscriptText } from '../../lib/transcript/transcriptParser'

const pdfWorkerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc

type PdfTextItem = {
  str: string
  transform: number[]
}

const extractPdfText = async (file: File) => {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const pageTexts: string[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const items = content.items as PdfTextItem[]
    const lineMap = new Map<number, PdfTextItem[]>()

    items.forEach((item) => {
      const y = Math.round(item.transform[5])
      const lineItems = lineMap.get(y) ?? []
      lineItems.push(item)
      lineMap.set(y, lineItems)
    })

    const lines = Array.from(lineMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([, lineItems]) =>
        lineItems
          .sort((a, b) => a.transform[4] - b.transform[4])
          .map((item) => item.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim(),
      )
      .filter(Boolean)

    pageTexts.push(lines.join('\n'))
  }

  return pageTexts.join('\n')
}

export default function TranscriptUpload() {
  const [status, setStatus] = useState<string | null>(null)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const [courses, setCourses] = useCompletedCourses()
  const [profile, setProfile] = useProfile()
  const [preferences] = usePreferences()

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    if (!file) return
    setSelectedFileName(file.name)
    setStatus('Reading transcript...')

    try {
      if (
        file.type !== 'application/pdf' &&
        !file.name.toLowerCase().endsWith('.pdf')
      ) {
        setStatus('Please upload a PDF transcript.')
        return
      }

      if (preferences.lockEdits && courses.length > 0) {
        setStatus('Edits are locked. Unlock to re-parse.')
        return
      }

      const text = await extractPdfText(file)
      const parsed = parseTranscriptText(text)
      setProfile({ ...profile, ...parsed.profile })
      setCourses(parsed.courses)

      if (parsed.courses.length === 0) {
        setStatus('No courses found. Try a different transcript format.')
        return
      }

      setStatus(`Parsed ${parsed.courses.length} courses.`)
    } catch (error) {
      console.error(error)
      setStatus('Unable to parse this PDF. Try a different file.')
    }
  }

  return (
    <div className="card stack">
      <h3>Transcript Upload</h3>
      <label className="upload-drop" htmlFor="transcript-upload">
        <span className="upload-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M7 13l6-6a3 3 0 014 4l-7 7a5 5 0 01-7-7l7-7"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="upload-copy">
          <span className="upload-title">
            {selectedFileName ?? 'Upload your unofficial transcript (PDF)'}
          </span>
          <span className="muted">
            We parse locally and keep your data on this device.
          </span>
        </span>
        <input
          id="transcript-upload"
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="visually-hidden"
        />
      </label>
      {status && (
        <span
          className={`status ${
            status.toLowerCase().includes('no courses') ||
            status.toLowerCase().includes('unable')
              ? 'status-error'
              : 'status-ok'
          }`}
        >
          {status}
        </span>
      )}
    </div>
  )
}
