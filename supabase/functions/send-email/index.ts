// SHEREHE — transactional email edge function via Resend.
//
// Handles: invitation emails, RSVP confirmations, gallery-live alerts,
// check-in confirmations, and photo-expiry warnings.
//
// Deploy with:
//   supabase functions deploy send-email --no-verify-jwt
//
// Required secrets (set with `supabase secrets set`):
//   RESEND_API_KEY              — your Resend API key (starts with re_)
//   RESEND_FROM                 — verified sender address, e.g. "Sherehe <noreply@yourapp.com>"
//   SHEREHE_APP_BASE_URL        — the base URL of your app (for deep links in emails)
//
// Usage from the app:
//   supabase.functions.invoke("send-email", { body: { kind, payload } })

// deno-lint-ignore-file no-explicit-any

const RESEND_URL = "https://api.resend.com/emails";

// --------------------------------------------------------------------------
// Payload shapes (one per email kind)
// --------------------------------------------------------------------------

interface InvitationPayload {
  guestName: string;
  guestEmail: string;
  eventName: string;
  hostName: string;
  date: string;
  venue: string;
  inviteUrl: string;
}

interface PassPayload {
  guestName: string;
  guestEmail: string;
  eventName: string;
  passCode: string;
  inviteUrl: string;
}

interface GalleryLivePayload {
  guestName: string;
  guestEmail: string;
  eventName: string;
  galleryUrl: string;
}

interface CheckInPayload {
  guestName: string;
  guestEmail: string;
  eventName: string;
  checkedInAt: string;
}

interface ExpiryWarningPayload {
  guestName: string;
  guestEmail: string;
  eventName: string;
  galleryUrl: string;
  daysLeft: number;
}

type EmailRequest =
  | { kind: "invitation"; payload: InvitationPayload }
  | { kind: "pass-confirmation"; payload: PassPayload }
  | { kind: "gallery-live"; payload: GalleryLivePayload }
  | { kind: "check-in"; payload: CheckInPayload }
  | { kind: "expiry-warning"; payload: ExpiryWarningPayload }
  | { kind: "custom"; payload: { to: string; subject: string; html: string } };

// --------------------------------------------------------------------------
// HTML email templates (inline-styled for broad client support)
// --------------------------------------------------------------------------

function invitationHtml(p: InvitationPayload): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#111;border-radius:16px;overflow:hidden">
          <tr>
            <td style="padding:40px 32px;text-align:center">
              <h1 style="color:#fff;font-size:28px;margin:0 0 8px;font-weight:700">💫 You're Invited</h1>
              <p style="color:#888;font-size:15px;margin:0 0 32px">${p.hostName} invites you to</p>
              <div style="background:#1a1a1a;border-radius:12px;padding:24px;margin:0 0 32px">
                <h2 style="color:#FFD166;font-size:22px;margin:0 0 8px">${p.eventName}</h2>
                <p style="color:#ccc;font-size:14px;margin:4px 0">📅 ${p.date}</p>
                <p style="color:#ccc;font-size:14px;margin:4px 0">📍 ${p.venue}</p>
              </div>
              <a href="${p.inviteUrl}" style="display:inline-block;background:#FFD166;color:#111;text-decoration:none;font-weight:700;font-size:16px;padding:14px 40px;border-radius:10px">View Invitation & RSVP</a>
              <p style="color:#666;font-size:12px;margin:24px 0 0">Powered by SHEREHE — moments that matter.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function passHtml(p: PassPayload): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#111;border-radius:16px;overflow:hidden">
          <tr>
            <td style="padding:40px 32px;text-align:center">
              <h1 style="color:#fff;font-size:28px;margin:0 0 8px">🎟️ Your Pass is Ready</h1>
              <p style="color:#888;font-size:15px;margin:0 0 32px">You're confirmed for <strong style="color:#FFD166">${p.eventName}</strong></p>
              <div style="background:#1a1a1a;border-radius:12px;padding:24px;margin:0 0 32px">
                <p style="color:#888;font-size:13px;margin:0 0 4px">PASS CODE</p>
                <h2 style="color:#FFD166;font-size:36px;margin:0;letter-spacing:6px;font-family:monospace">${p.passCode}</h2>
                <p style="color:#666;font-size:12px;margin:12px 0 0">Show this at the door for quick check-in</p>
              </div>
              <a href="${p.inviteUrl}" style="display:inline-block;background:#FFD166;color:#111;text-decoration:none;font-weight:700;font-size:16px;padding:14px 40px;border-radius:10px">Open Your Pass</a>
              <p style="color:#666;font-size:12px;margin:24px 0 0">Powered by SHEREHE</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function galleryLiveHtml(p: GalleryLivePayload): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#111;border-radius:16px;overflow:hidden">
          <tr>
            <td style="padding:40px 32px;text-align:center">
              <h1 style="color:#fff;font-size:28px;margin:0 0 8px">📸 Gallery is Live!</h1>
              <p style="color:#888;font-size:15px;margin:0 0 32px">Photos from <strong style="color:#FFD166">${p.eventName}</strong> are ready</p>
              <a href="${p.galleryUrl}" style="display:inline-block;background:#FFD166;color:#111;text-decoration:none;font-weight:700;font-size:16px;padding:14px 40px;border-radius:10px">View Gallery</a>
              <p style="color:#666;font-size:12px;margin:24px 0 0">Photos will be available for 30 days. Download your favorites!</p>
              <p style="color:#666;font-size:12px;margin:4px 0 0">Powered by SHEREHE</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function checkInHtml(p: CheckInPayload): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#111;border-radius:16px;overflow:hidden">
          <tr>
            <td style="padding:40px 32px;text-align:center">
              <h1 style="color:#fff;font-size:28px;margin:0 0 8px">✅ You're Checked In</h1>
              <p style="color:#888;font-size:15px;margin:0 0 32px"><strong style="color:#FFD166">${p.eventName}</strong></p>
              <div style="background:#1a1a1a;border-radius:12px;padding:20px;margin:0 0 32px">
                <p style="color:#ccc;font-size:14px;margin:0">🕐 Checked in at <strong style="color:#fff">${p.checkedInAt}</strong></p>
              </div>
              <p style="color:#0f0;font-size:14px;margin:0">You're all set — enjoy the celebration!</p>
              <p style="color:#666;font-size:12px;margin:24px 0 0">Powered by SHEREHE</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function expiryWarningHtml(p: ExpiryWarningPayload): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#111;border-radius:16px;overflow:hidden">
          <tr>
            <td style="padding:40px 32px;text-align:center">
              <h1 style="color:#fff;font-size:28px;margin:0 0 8px">⚠️ Photos Expiring Soon</h1>
              <p style="color:#888;font-size:15px;margin:0 0 32px">Your photos from <strong style="color:#FFD166">${p.eventName}</strong> will be deleted in <strong style="color:#ff4444">${p.daysLeft} day${p.daysLeft === 1 ? "" : "s"}</strong></p>
              <a href="${p.galleryUrl}" style="display:inline-block;background:#FFD166;color:#111;text-decoration:none;font-weight:700;font-size:16px;padding:14px 40px;border-radius:10px">Download Your Photos</a>
              <p style="color:#666;font-size:12px;margin:24px 0 0">Don't lose your memories — save them now!</p>
              <p style="color:#666;font-size:12px;margin:4px 0 0">Powered by SHEREHE</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// --------------------------------------------------------------------------
// Build subject + html per email kind
// --------------------------------------------------------------------------

function buildEmail(req: EmailRequest): { subject: string; html: string } | { error: string } {
  switch (req.kind) {
    case "invitation": {
      const p = req.payload;
      return {
        subject: `You're invited to ${p.eventName} by ${p.hostName}`,
        html: invitationHtml(p),
      };
    }
    case "pass-confirmation": {
      const p = req.payload;
      return {
        subject: `Your pass for ${p.eventName} — ${p.passCode}`,
        html: passHtml(p),
      };
    }
    case "gallery-live": {
      const p = req.payload;
      return {
        subject: `Photos from ${p.eventName} are live!`,
        html: galleryLiveHtml(p),
      };
    }
    case "check-in": {
      const p = req.payload;
      return {
        subject: `Checked in to ${p.eventName}`,
        html: checkInHtml(p),
      };
    }
    case "expiry-warning": {
      const p = req.payload;
      return {
        subject: `Your photos from ${p.eventName} expire in ${p.daysLeft} day${p.daysLeft === 1 ? "" : "s"}`,
        html: expiryWarningHtml(p),
      };
    }
    case "custom": {
      const p = req.payload;
      return { subject: p.subject, html: p.html };
    }
    default:
      return { error: `Unknown email kind: ${(req as any).kind}` };
  }
}

// --------------------------------------------------------------------------
// Main handler
// --------------------------------------------------------------------------

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

  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM");

  if (!apiKey || !from) {
    return new Response(
      JSON.stringify({ error: "Server not configured: missing RESEND_API_KEY or RESEND_FROM" }),
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

  const request = body as EmailRequest;
  if (!request.kind || !request.payload) {
    return new Response(
      JSON.stringify({ error: "Missing kind or payload" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const built = buildEmail(request);
  if ("error" in built) {
    return new Response(JSON.stringify({ error: built.error }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Determine recipient(s) — different payload shapes have it in different places
  let to = "";
  const p = request.payload as any;
  if (p.guestEmail) to = p.guestEmail;
  else if (p.to) to = p.to;

  if (!to) {
    return new Response(JSON.stringify({ error: "No recipient email found in payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: built.subject,
        html: built.html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[send-email] Resend error", res.status, data);
      return new Response(
        JSON.stringify({ error: (data as any)?.message ?? "Resend returned an error" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ ok: true, id: (data as any)?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[send-email] fetch failed", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
