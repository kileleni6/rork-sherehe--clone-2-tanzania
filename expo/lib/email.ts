/**
 * SHEREHE transactional email client.
 *
 * All email sending goes through the Supabase Edge Function
 * `send-email` which uses Resend on the server side.
 *
 * The Resend API key is NEVER exposed to the client — it lives
 * exclusively as a Supabase secret (`RESEND_API_KEY`).
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Payload shapes (mirrors the edge function)
// ---------------------------------------------------------------------------

export interface InvitationEmail {
  guestName: string;
  guestEmail: string;
  eventName: string;
  hostName: string;
  date: string;
  venue: string;
  inviteUrl: string;
}

export interface PassEmail {
  guestName: string;
  guestEmail: string;
  eventName: string;
  passCode: string;
  inviteUrl: string;
}

export interface GalleryLiveEmail {
  guestName: string;
  guestEmail: string;
  eventName: string;
  galleryUrl: string;
}

export interface CheckInEmail {
  guestName: string;
  guestEmail: string;
  eventName: string;
  checkedInAt: string;
}

export interface ExpiryWarningEmail {
  guestName: string;
  guestEmail: string;
  eventName: string;
  galleryUrl: string;
  daysLeft: number;
}

// ---------------------------------------------------------------------------
// Send helpers
// ---------------------------------------------------------------------------

async function invokeEmail(kind: string, payload: unknown): Promise<boolean> {
  if (!isSupabaseConfigured) {
    console.log("[email] Supabase not configured — skipping email");
    return false;
  }
  try {
    const { error } = await supabase.functions.invoke("send-email", {
      body: { kind, payload },
    });
    if (error) {
      console.log("[email] send-email function error", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.log("[email] invoke failed", e);
    return false;
  }
}

/** Send an invitation email to a guest. */
export async function sendInvitationEmail(payload: InvitationEmail): Promise<boolean> {
  return invokeEmail("invitation", payload);
}

/** Send a pass confirmation email after RSVP. */
export async function sendPassConfirmationEmail(payload: PassEmail): Promise<boolean> {
  return invokeEmail("pass-confirmation", payload);
}

/** Notify a guest that the gallery is live. */
export async function sendGalleryLiveEmail(payload: GalleryLiveEmail): Promise<boolean> {
  return invokeEmail("gallery-live", payload);
}

/** Confirm a guest was checked in. */
export async function sendCheckInEmail(payload: CheckInEmail): Promise<boolean> {
  return invokeEmail("check-in", payload);
}

/** Warn a guest that their photos are expiring soon. */
export async function sendExpiryWarningEmail(payload: ExpiryWarningEmail): Promise<boolean> {
  return invokeEmail("expiry-warning", payload);
}

/**
 * Send a batch of invitation emails.
 * Returns the number of successfully sent emails.
 */
export async function sendBulkInvitations(
  invitations: InvitationEmail[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (const inv of invitations) {
    const ok = await sendInvitationEmail(inv);
    if (ok) sent++;
    else failed++;
  }
  return { sent, failed };
}
