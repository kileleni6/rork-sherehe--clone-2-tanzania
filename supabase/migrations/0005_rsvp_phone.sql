-- Add optional phone column to rsvps table for Twilio SMS notifications
alter table public.rsvps
  add column if not exists phone text;
