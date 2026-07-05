import type { CameraStyleId, EventTypeId, TimeOfDayId } from "@/constants/templates";
import type { TemplateId } from "@/constants/templates";

export type RsvpStatus = "yes" | "no" | "maybe";

export interface Rsvp {
  id: string;
  name: string;
  status: RsvpStatus;
  guests: number;
  note?: string;
  createdAt: number;
  /** optional phone number for SMS notifications (Twilio) */
  phone?: string;
  /** short token guests show at the door (last 6 of id, uppercased) */
  passCode: string;
  /** epoch ms when host checked the guest in */
  checkedInAt?: number;
  /** number of shots the guest has used */
  shotsUsed?: number;
  /** reason set by the host when rejecting a guest at the door */
  rejectionReason?: string;
}

export interface Photo {
  id: string;
  /** Public URL (or local fallback) used to render the photo */
  uri: string;
  guestName: string;
  takenAt: number;
  filter?: "none" | "warm" | "cool" | "bw" | "sepia";
  style?: CameraStyleId;
  flagged?: boolean;
  /** Path of the object inside the Supabase Storage bucket, e.g. `eventId/photoId.jpg` */
  storagePath?: string;
  /** Epoch ms when the photo was uploaded to the server */
  uploadedAt?: number;
  /** Epoch ms when the server-side retention job will delete the object */
  expiresAt?: number;
  /** Set to true once the server has purged the underlying object (kept as a tombstone for the UI) */
  expired?: boolean;
}

export interface ScheduleItem {
  id: string;
  time: string;
  title: string;
}

export interface Event {
  id: string;
  name: string;
  type: EventTypeId;
  customLabel?: string;
  timeOfDay?: TimeOfDayId;
  cover: string;
  date: number; // epoch ms
  venue: string;
  message: string;
  dressCode?: string;
  schedule: ScheduleItem[];
  template: TemplateId;
  hostName: string;
  // camera rules
  shotsPerGuest: number; // 0 = unlimited
  revealAt: number; // epoch ms — when gallery becomes viewable
  revealMode?: "start" | "plus1h" | "plus6h" | "plus24h" | "custom";
  uploadPermission?: "all" | "rsvp" | "approved";
  privacy?: "private" | "public" | "passcode";
  passcode?: string;
  visibility?: "all_after_reveal" | "rsvp_only" | "host_only";
  checkInEnabled?: boolean;
  isPrivate: boolean;
  // data
  rsvps: Rsvp[];
  photos: Photo[];
  invited: number;
  views: number;
  premium?: boolean;
}
