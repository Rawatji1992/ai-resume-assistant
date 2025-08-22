import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Resume & Job Application Assistant',
  description: 'Tailor resumes, cover letters, and LinkedIn summaries for any job.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-gray-200">
            <div className="container flex items-center justify-between py-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-black" />
                <h1 className="text-lg font-semibold">AI Resume Assistant</h1>
              </div>
              <div className="text-sm text-gray-500">MVP • Freemium ready</div>
            </div>
          </header>
          <main className="container py-8">{children}</main>
          <footer className="border-t border-gray-200">
            <div className="container py-6 text-xs text-gray-500">
              Built with Next.js • OpenAI Responses API • Client-side parsing
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
