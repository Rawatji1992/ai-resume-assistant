# AI Resume & Job Application Assistant (Full Build)

A clean Next.js app that takes a CV and a Job Description and returns:
- Tailored **Resume** (Markdown)
- **Cover Letter** (Markdown)
- **LinkedIn About** summary
- Export to `.docx`
- Simple client-side **freemium** cap (3/day)

## Quick Deploy (Vercel)
1. Zip & upload to a GitHub repo.
2. In Vercel → New Project → Import repo.
3. Add Environment Variables:
   - `OPENAI_API_KEY` = your OpenAI API key
   - (optional) `OPENAI_MODEL` = `gpt-5-mini` or `gpt-4o-mini`
4. Deploy.

## Local Dev
```bash
pnpm i   # or npm i / yarn
pnpm dev # open http://localhost:3000
```

**Tech**
- Next.js 14 (App Router)
- OpenAI **Responses API** (structured JSON via JSON schema)
- Client-side parsing: pdf.js (PDF) + Mammoth (DOCX)
- Tailwind UI; DOCX export via `docx` + `file-saver`
