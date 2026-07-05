// SHEREHE — transactional SMS edge function via Twilio.
//
// Handles: invitation texts, RSVP confirmations, gallery-live alerts,
// check-in confirmations, and photo-expiry warnings.
//
// Deploy with:
//   supabase functions deploy send-sms --no-verify-jwt
//
// Required secrets (set with `supabase secrets set`):
//   TWILIO_ACCOUNT_SID          — your Twilio Account SID
//   TWILIO_AUTH_TOKEN           — your Twilio Auth Token
//   TWILIO_PHONE_NUMBER         — your Twilio phone number (E.164 format, e.g. +1234567890)
//   SHEREHE_APP_BASE_URL        — the base URL of your app (for deep links in texts)
//
// Usage from the app:
//   supabase.functions.invoke("send-sms", { body: { kind, payload } })

// deno-lint-ignore-file no-explicit-any

interface SmsRequest {
  kind: string;
  payload: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// SMS body templates
// ---------------------------------------------------------------------------

function invitationSms(p: any): string {
  return `🎉 You're invited!\n\n${p.hostName} invited you to ${p.eventName}\n📅 ${p.date}\n📍 ${p.venue}\n\nRSVP & view your invitation:\n${p.inviteUrl}\n\n— SHEREHE`;
}

function passConfirmationSms(p: any): string {
  return `🎟️ Your pass for ${p.eventName} is ready!\n\nPass code: ${p.passCode}\nShow this at the door for quick check-in.\n\nView your pass:\n${p.inviteUrl}\n\n— SHEREHE`;
}

function galleryLiveSms(p: any): string {
  return `📸 Photos from ${p.eventName} are now live!\n\nView & download the gallery:\n${p.galleryUrl}\n\nPhotos available for 30 days — save your favorites!\n\n— SHEREHE`;
}

function checkInSms(p: any): string {
  return `✅ Checked in to ${p.eventName} at ${p.checkedInAt}!\n\nEnjoy the celebration!\n\n— SHEREHE`;
}

function expiryWarningSms(p: any): string {
  const plural = p.daysLeft === 1 ? "" : "s";
  return `⚠️ Your photos from ${p.eventName} expire in ${p.daysLeft} day${plural}!\n\nDownload them now before they're deleted:\n${p.galleryUrl}\n\n— SHEREHE`;
}

function buildSms(req: SmsRequest): string | { error: string } {
  const p = req.payload;
  switch (req.kind) {
    case "invitation": return invitationSms(p);
    case "pass-confirmation": return passConfirmationSms(p);
    case "gallery-live": return galleryLiveSms(p);
    case "check-in": return checkInSms(p);
    case "expiry-warning": return expiryWarningSms(p);
    default: return { error: `Unknown SMS kind: ${req.kind}` };
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!accountSid || !authToken || !fromNumber) {
    return new Response(
      JSON.stringify({ error: "Server not configured: missing Twilio credentials" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const request = body as SmsRequest;
  if (!request.kind || !request.payload) {
    return new Response(
      JSON.stringify({ error: "Missing kind or payload" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const built = buildSms(request);
  if (typeof built !== "string") {
    return new Response(JSON.stringify(built), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Determine recipient — different payload shapes have it in different places
  const p = request.payload as any;
  const to = p.guestPhone || p.phone || p.to || "";
  if (!to) {
    return new Response(JSON.stringify({ error: "No recipient phone number found in payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Twilio API call
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const twilioBody = new URLSearchParams({
    From: fromNumber,
    To: to,
    Body: built,
  });

  try {
    const res = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
      },
      body: twilioBody.toString(),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[send-sms] Twilio error", res.status, data);
      return new Response(
        JSON.stringify({ error: (data as any)?.message ?? "Twilio returned an error" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ ok: true, sid: (data as any)?.sid }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[send-sms] fetch failed", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
