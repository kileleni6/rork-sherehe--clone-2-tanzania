# Deploy SHEREHE Supabase backend (run after `supabase login`)
# Project ref: yvlzmhmnmipofmrubuhd

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "Linking to Supabase project yvlzmhmnmipofmrubuhd..."
supabase link --project-ref yvlzmhmnmipofmrubuhd

Write-Host "Applying migrations..."
supabase db push

Write-Host "Deploying edge functions..."
supabase functions deploy send-email --no-verify-jwt
supabase functions deploy send-sms --no-verify-jwt
supabase functions deploy purge-event-photos --no-verify-jwt

Write-Host ""
Write-Host "Done. Confirm secrets in Dashboard -> Edge Functions -> Secrets:"
Write-Host "  RESEND_API_KEY, RESEND_FROM, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, OPEN_AI_API_KEY"
Write-Host "Optional: SHEREHE_APP_BASE_URL (for email/SMS deep links)"
