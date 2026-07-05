/**
 * SHEREHE transactional SMS client.
 *
 * All SMS sending goes through the Supabase Edge Function
 * `send-sms` which uses Twilio on the server side.
 *
 * Twilio credentials live exclusively as Supabase secrets — never exposed to the client.
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Payload shapes (mirrors the edge function)
// ---------------------------------------------------------------------------

export interface InvitationSms {
  guestPhone: string;
  guestName: string;
  eventName: string;
  hostName: string;
  date: string;
  venue: string;
  inviteUrl: string;
}

export interface PassSms {
  guestPhone: string;
  guestName: string;
  eventName: string;
  passCode: string;
  inviteUrl: string;
}

export interface GalleryLiveSms {
  guestPhone: string;
  guestName: string;
  eventName: string;
  galleryUrl: string;
}

export interface CheckInSms {
  guestPhone: string;
  guestName: string;
  eventName: string;
  checkedInAt: string;
}

export interface ExpiryWarningSms {
  guestPhone: string;
  guestName: string;
  eventName: string;
  galleryUrl: string;
  daysLeft: number;
}

// ---------------------------------------------------------------------------
// Send helpers
// ---------------------------------------------------------------------------

async function invokeSms(kind: string, payload: unknown): Promise<boolean> {
  if (!isSupabaseConfigured) {
    console.log("[sms] Supabase not configured — skipping SMS");
    return false;
  }
  try {
    const { error } = await supabase.functions.invoke("send-sms", {
      body: { kind, payload },
    });
    if (error) {
      console.log("[sms] send-sms function error", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.log("[sms] invoke failed", e);
    return false;
  }
}

/** Send an invitation SMS to a guest. */
export async function sendInvitationSms(payload: InvitationSms): Promise<boolean> {
  return invokeSms("invitation", payload);
}

/** Send a pass confirmation SMS after RSVP. */
export async function sendPassConfirmationSms(payload: PassSms): Promise<boolean> {
  return invokeSms("pass-confirmation", payload);
}

/** Notify a guest via SMS that the gallery is live. */
export async function sendGalleryLiveSms(payload: GalleryLiveSms): Promise<boolean> {
  return invokeSms("gallery-live", payload);
}

/** Confirm a guest was checked in via SMS. */
export async function sendCheckInSms(payload: CheckInSms): Promise<boolean> {
  return invokeSms("check-in", payload);
}

/** Warn a guest via SMS that their photos are expiring soon. */
export async function sendExpiryWarningSms(payload: ExpiryWarningSms): Promise<boolean> {
  return invokeSms("expiry-warning", payload);
}

/**
 * Send a batch of invitation SMS messages.
 * Returns the number of successfully sent messages.
 */
export async function sendBulkInvitationsSms(
  invitations: InvitationSms[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (const inv of invitations) {
    const ok = await sendInvitationSms(inv);
    if (ok) sent++;
    else failed++;
  }
  return { sent, failed };
}
