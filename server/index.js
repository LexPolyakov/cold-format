import http from 'http'
import { config } from 'dotenv'
import { Resend } from 'resend'

config()

const GROQ_KEY = process.env.GROQ_API_KEY
const RESEND_KEY = process.env.RESEND_API_KEY
const FEEDBACK_TO = 'alexey.polyakov123@gmail.com'
const OPENAI_KEY = process.env.OPENAI_API_KEY

const PORT = process.env.PORT || 3001

async function callGroq(prompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
      temperature: 0.7
    })
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.choices[0].message.content
}

async function callOpenAI(prompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
      temperature: 0.7
    })
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.choices[0].message.content
}

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }

  if (req.method === 'POST' && req.url === '/api/feedback') {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', async () => {
      try {
        const { text } = JSON.parse(body || '{}')
        if (!RESEND_KEY) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          return res.end(JSON.stringify({ error: 'RESEND_API_KEY not set' }))
        }
        const resend = new Resend(RESEND_KEY)
        const { data, error } = await resend.emails.send({
          from: 'Cold Format <onboarding@resend.dev>',
          to: [FEEDBACK_TO],
          subject: 'Обратная связь — Cold Format',
          text: (text && String(text).trim()) || '(пусто)'
        })
        if (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          return res.end(JSON.stringify({ error: error.message }))
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, id: data?.id }))
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: e.message }))
      }
    })
    return
  }

  if (req.method === 'POST' && req.url === '/api/analyze') {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', async () => {
      try {
        const { prompt } = JSON.parse(body)
        
        if (!prompt) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          return res.end(JSON.stringify({ error: 'Prompt is required' }))
        }

        let response
        if (GROQ_KEY) {
          response = await callGroq(prompt)
        } else if (OPENAI_KEY) {
          response = await callOpenAI(prompt)
        } else {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          return res.end(JSON.stringify({ 
            error: 'No API key configured. Set GROQ_API_KEY or OPENAI_API_KEY in .env' 
          }))
        }

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ response }))
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: e.message }))
      }
    })
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
})

server.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
  console.log(`Using: ${GROQ_KEY ? 'Groq' : OPENAI_KEY ? 'OpenAI' : 'NO API KEY SET'}`)
})
