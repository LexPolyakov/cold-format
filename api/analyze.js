export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(404).json({ error: 'Not found' })
  }

  const GROQ_KEY = process.env.GROQ_API_KEY
  const OPENAI_KEY = process.env.OPENAI_API_KEY

  try {
    const { prompt } = req.body || {}

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' })
    }

    let response
    if (GROQ_KEY) {
      response = await callGroq(prompt, GROQ_KEY)
    } else if (OPENAI_KEY) {
      response = await callOpenAI(prompt, OPENAI_KEY)
    } else {
      return res.status(500).json({
        error: 'No API key. Set GROQ_API_KEY or OPENAI_API_KEY in Vercel env vars'
      })
    }

    res.status(200).json({ response })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

async function callGroq(prompt, key) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
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

async function callOpenAI(prompt, key) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
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
