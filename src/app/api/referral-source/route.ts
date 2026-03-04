import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const webhookUrl = process.env.SLACK_USER_SIGNUP_WEBHOOK_URL
  if (!webhookUrl) {
    return NextResponse.json(
      { error: 'Slack webhook not configured' },
      { status: 500 }
    )
  }

  const { email, source } = await req.json()

  if (!email) {
    return NextResponse.json({ error: 'Missing email' }, { status: 400 })
  }

  const message = `:mag: *Referral Source*\n*User:* ${email}\n*Source:* ${source || 'Skipped'}`

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'user-signups',
        text: message,
      }),
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to send Slack message:', error)
    return NextResponse.json(
      { error: 'Failed to send Slack message' },
      { status: 500 }
    )
  }
}
