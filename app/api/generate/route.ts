import OpenAI from 'openai'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { resumeText, jobDesc, tone, role } = body as {
      resumeText: string
      jobDesc: string
      tone?: string
      role?: string
    }

    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY' }), { status: 400 })
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // (Optional) Keep schema for prompting (model will still be asked to return JSON)
    const schema = {
      name: "TailoredApplication",
      schema: {
        type: "object",
        properties: {
          resume_markdown: { type: "string", description: "ATS-friendly resume in Markdown" },
          cover_letter_markdown: { type: "string", description: "Cover letter in Markdown" },
          linkedin_summary: { type: "string", description: "Compelling LinkedIn About section" },
          key_skills: { type: "array", items: { type: "string" } },
          tweaks: { type: "array", items: { type: "string" }, description: "Suggestions to improve the source CV" }
        },
        required: ["resume_markdown", "cover_letter_markdown", "linkedin_summary", "key_skills"]
      },
      strict: true
    }

    const sys = [
      "You are an expert, ATS-savvy resume writer and career coach.",
      "Rewrite resumes to match the job while keeping truthful experience from the provided CV.",
      "Optimize for ATS (clear section headers, bullet points, measurable impact, targeted keywords).",
      "Keep it concise: 1-2 pages resume, 1 page cover letter.",
      "Use UK/International English by default unless the job location suggests otherwise.",
      "Never fabricate employment, dates, or skills."
    ].join("\n")

    const prompt = [
      `ROLE (optional): ${role || "unspecified"}`,
      `TONE (optional): ${tone || "professional, confident, friendly"}`,
      "",
      "SOURCE CV:",
      (resumeText || '').slice(0, 120000),
      "",
      "JOB DESCRIPTION:",
      (jobDesc || '').slice(0, 60000),
      "",
      "INSTRUCTIONS:",
      "Return **JSON only** that matches this schema keys: resume_markdown, cover_letter_markdown, linkedin_summary, key_skills, tweaks.",
      "Use Markdown formatting for resume and cover letter (headers, bullet points).",
      "Include a concise LinkedIn About summary (3-6 lines).",
      "Do not include any text outside of a single JSON object."
    ].join("\n")

    // ---- OpenAI call (no response_format) ----
    const resp = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      input: [
        { role: "system", content: sys },
        { role: "user", content: prompt }
      ],
      temperature: 0.6
    })

    // Robustly extract text from the Responses API output
    const jsonText =
      (resp as any).output_text ||
      (resp as any).output?.[0]?.content?.[0]?.text ||
      (resp as any).choices?.[0]?.message?.content

    if (!jsonText) {
      return new Response(JSON.stringify({ error: "No output from model" }), { status: 500 })
    }

    let data: any
    try {
      data = JSON.parse(jsonText)
    } catch (e) {
      // fallback: try to pull a JSON object substring
      const match = jsonText.match(/\{[\s\S]*\}/)
      if (match) data = JSON.parse(match[0])
      else throw e
    }

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  } catch (err: any) {
    console.error(err)
    return new Response(JSON.stringify({ error: err?.message || "Server error" }), { status: 500 })
  }
}
