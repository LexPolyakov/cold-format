import { Resend } from 'resend'

const RESEND_KEY = process.env.RESEND_API_KEY
const FEEDBACK_TO = 'alexey.polyakov123@gmail.com'

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

  try {
    const { text } = req.body || {}
    if (!RESEND_KEY) {
      return res.status(500).json({ error: 'RESEND_API_KEY not set' })
    }
    const resend = new Resend(RESEND_KEY)
    const { data, error } = await resend.emails.send({
      from: 'Cold Format <onboarding@resend.dev>',
      to: [FEEDBACK_TO],
      subject: 'Обратная связь — Cold Format',
      text: (text && String(text).trim()) || '(пусто)'
    })
    if (error) {
      return res.status(500).json({ error: error.message })
    }
    return res.status(200).json({ ok: true, id: data?.id })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
