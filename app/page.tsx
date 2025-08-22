'use client'

import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { canUseToday, recordUse, remaining } from '@/lib/quota'
import { saveAs } from 'file-saver'


let mammoth: any = null
let pdfjsLib: any = null

type GenResult = {
  resume_markdown: string
  cover_letter_markdown: string
  linkedin_summary: string
  key_skills?: string[]
  tweaks?: string[]
}

export default function Page() {
  const { register, handleSubmit, setValue } = useForm()
  const [status, setStatus] = useState<string>('')
  const [result, setResult] = useState<GenResult | null>(null)
  const [limitLeft, setLimitLeft] = useState<number>(3) // default
useEffect(() => {
  setLimitLeft(remaining())
}, [])
  const fileInputCv = useRef<HTMLInputElement>(null)
  const fileInputJd = useRef<HTMLInputElement>(null)

  async function ensureLibs() {
    if (!mammoth) {
      mammoth = await import('mammoth/mammoth.browser')
    }
    if (!pdfjsLib) {
      const pdfjs = await import('pdfjs-dist')
      // @ts-ignore
      pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`
      pdfjsLib = pdfjs
    }
  }

  async function getTextFromFile(file: File): Promise<string> {
    const ext = file.name.toLowerCase()
    if (ext.endsWith('.txt')) return await file.text()
    if (ext.endsWith('.docx')) {
      await ensureLibs()
      const arrayBuffer = await file.arrayBuffer()
      const { value } = await mammoth.extractRawText({ arrayBuffer })
      return value
    }
    if (ext.endsWith('.pdf')) {
      await ensureLibs()
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      let text = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        const strings = content.items.map((it: any) => it.str)
        text += strings.join(' ') + '\n'
      }
      return text
    }
    throw new Error('Unsupported file type. Please upload PDF, DOCX, or TXT.')
  }

  async function onPickCv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setStatus('Reading CV…')
    const text = await getTextFromFile(file)
    setValue('resumeText', text)
    setStatus('CV loaded ✓')
  }

  async function onPickJd(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setStatus('Reading Job Description…')
    const text = await getTextFromFile(file)
    setValue('jobDesc', text)
    setStatus('Job Description loaded ✓')
  }

  async function onSubmit(data: any) {
    if (!canUseToday()) {
      alert('Daily free limit reached. Please try again tomorrow or click Upgrade (coming soon).')
      return
    }
    setStatus('Thinking…')
    setResult(null)

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resumeText: data.resumeText || '',
        jobDesc: data.jobDesc || '',
        tone: data.tone || 'professional, confident, friendly',
        role: data.role || ''
      })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setStatus('Error: ' + (err.error || res.statusText))
      return
    }

    const json = await res.json()
    setResult(json.data as GenResult)
    recordUse()
    setLimitLeft(remaining())
    setStatus('Done ✓')
  }

  function downloadDocx(filename: string, plainText: string) {
    import('docx').then(({ Document, Packer, Paragraph, TextRun, HeadingLevel }) => {
      const lines = plainText.split('\n')
      const children = lines.map((line) => {
        if (line.startsWith('# ')) return new Paragraph({ text: line.replace(/^#\s*/, ''), heading: HeadingLevel.HEADING_1 })
        if (line.startsWith('## ')) return new Paragraph({ text: line.replace(/^##\s*/, ''), heading: HeadingLevel.HEADING_2 })
        if (line.startsWith('- ')) return new Paragraph({ children: [new TextRun({ text: '• ' + line.slice(2) })] })
        return new Paragraph(line)
      })
      const doc = new Document({ sections: [{ properties: {}, children }] })
      Packer.toBlob(doc).then((blob) => saveAs(blob, filename))
    })
  }

  function copy(text: string) { navigator.clipboard.writeText(text) }

  const tabs = [
    { key: 'resume', label: 'Resume' },
    { key: 'cover', label: 'Cover Letter' },
    { key: 'linkedin', label: 'LinkedIn Summary' },
  ] as const
  const [tab, setTab] = useState<typeof tabs[number]['key']>('resume')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <section className="card">
        <h2 className="text-xl font-semibold mb-4">Tailor your application</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Upload CV (PDF, DOCX, or TXT)</label>
            <input ref={fileInputCv} type="file" accept=".pdf,.doc,.docx,.txt" onChange={onPickCv} className="input" />
            <textarea {...register('resumeText')} placeholder="…or paste your CV here" className="input mt-2" />
          </div>

          <div>
            <label className="label">Job description (paste or upload)</label>
            <input ref={fileInputJd} type="file" accept=".pdf,.doc,.docx,.txt" onChange={onPickJd} className="input" />
            <textarea {...register('jobDesc')} placeholder="Paste the job description here" className="input mt-2" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Target role (optional)</label>
              <input {...register('role')} placeholder="e.g., Senior ERP Manager" className="input" />
            </div>
            <div>
              <label className="label">Tone</label>
              <select {...register('tone')} className="input">
                <option>professional, confident, friendly</option>
                <option>concise, impact-focused</option>
                <option>warm, collaborative</option>
                <option>assertive, leadership-focused</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button className="btn btn-primary" type="submit">Generate</button>
            <div className="text-xs text-gray-500">Free uses left today: {limitLeft}</div>
          </div>

          <div className="text-sm text-gray-600">{status}</div>
          <div className="pt-1">
            <button type="button" className="btn" onClick={() => alert('Stripe-powered upgrade coming soon')}>
              Upgrade (coming soon)
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        {!result ? (
          <div className="text-gray-500">
            Your tailored resume, cover letter, and LinkedIn summary will appear here.
          </div>
        ) : (
          <div>
            <div className="mb-3 flex gap-2">
              {tabs.map(t => (
                <button key={t.key} className={`btn ${tab === t.key ? 'btn-primary' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
              ))}
            </div>

            {tab === 'resume' && (
              <OutputBlock
                title="Resume"
                text={result.resume_markdown}
                onCopy={() => copy(result.resume_markdown)}
                onDownload={() => downloadDocx('Tailored_Resume.docx', result.resume_markdown)}
              />
            )}
            {tab === 'cover' && (
              <OutputBlock
                title="Cover Letter"
                text={result.cover_letter_markdown}
                onCopy={() => copy(result.cover_letter_markdown)}
                onDownload={() => downloadDocx('Cover_Letter.docx', result.cover_letter_markdown)}
              />
            )}
            {tab === 'linkedin' && (
              <OutputBlock
                title="LinkedIn Summary"
                text={result.linkedin_summary}
                onCopy={() => copy(result.linkedin_summary)}
                onDownload={() => downloadDocx('LinkedIn_About.docx', result.linkedin_summary)}
              />
            )}

            {(result.key_skills?.length || result.tweaks?.length) && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.key_skills?.length ? (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <div className="font-medium mb-2">Key Skills matched</div>
                    <ul className="list-disc ml-5 text-sm text-gray-700">
                      {result.key_skills.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                ) : null}
                {result.tweaks?.length ? (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <div className="font-medium mb-2">Suggested tweaks to your CV</div>
                    <ul className="list-disc ml-5 text-sm text-gray-700">
                      {result.tweaks.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function OutputBlock({ title, text, onCopy, onDownload }: { title: string, text: string, onCopy: () => void, onDownload: () => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex gap-2">
          <button className="btn" onClick={onCopy}>Copy</button>
          <button className="btn" onClick={onDownload}>Download .docx</button>
        </div>
      </div>
      <pre className="whitespace-pre-wrap text-sm leading-relaxed bg-gray-50 border border-gray-200 rounded-xl p-3 max-h-[60vh] overflow-auto">{text}</pre>
    </div>
  )
}
