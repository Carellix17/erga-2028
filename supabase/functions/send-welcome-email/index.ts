import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

function redactEmail(email: string | null | undefined): string {
  if (!email) return '***'
  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return '***'
  return `${localPart[0]}***@${domain}`
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables')
    return jsonResponse({ error: 'Server configuration error' }, 500)
  }

  // Recipient is derived from the authenticated caller — never from the body.
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { data: userData, error: userError } = await supabase.auth.getUser(
    authHeader.slice('Bearer '.length).trim(),
  )

  const user = userData?.user
  if (userError || !user?.email) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const recipient = user.email
  const templateName = 'welcome'

  let name: string | undefined
  try {
    const body = await req.json()
    if (typeof body?.name === 'string' && body.name.trim()) {
      name = body.name.trim().slice(0, 120)
    }
  } catch {
    // No body is fine — the template falls back to a generic greeting.
  }

  try {
    const result = await sendTemplateEmail(templateName, recipient, {
      templateData: { name },
      idempotencyKey: `welcome-${user.id}`,
    })

    if (!result.sent) {
      const { error: logError } = await supabase.from('email_send_log').insert({
        message_id: null,
        template_name: templateName,
        recipient_email: recipient,
        status: 'suppressed',
      })
      if (logError) {
        console.error('Failed to log suppressed welcome email', {
          code: logError.code,
          message: logError.message,
        })
      }
      return jsonResponse({ success: false, reason: 'recipient_suppressed' })
    }

    const { error: logError } = await supabase.from('email_send_log').insert({
      message_id: null,
      template_name: templateName,
      recipient_email: recipient,
      status: 'sent',
    })
    if (logError) {
      console.error('Failed to log sent welcome email', {
        code: logError.code,
        message: logError.message,
      })
    }

    console.log('Welcome email sent', { recipient_redacted: redactEmail(recipient) })
    return jsonResponse({ success: true })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('Welcome email send failed', {
      recipient_redacted: redactEmail(recipient),
      error: errorMsg,
    })

    const { error: logError } = await supabase.from('email_send_log').insert({
      message_id: null,
      template_name: templateName,
      recipient_email: recipient,
      status: 'failed',
      error_message: errorMsg.slice(0, 1000),
    })
    if (logError) {
      console.error('Failed to log failed welcome email', {
        code: logError.code,
        message: logError.message,
      })
    }

    return jsonResponse({ error: 'Failed to send welcome email' }, 500)
  }
})
