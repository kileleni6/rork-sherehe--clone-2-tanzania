# Add Guest List with branded Resend/Twilio invitations

## What we'll build

### 1. A Guest List screen after event creation

- [x] After the host finishes creating their event, instead of just landing on the event detail screen, they'll see a new "Share invitations" step where they can enter guests' names, emails, and phone numbers — then send beautiful branded invitations via email (Resend) and SMS (Twilio) with one tap.

### 2. Guest entry form

- [x] Simple form with name, email, and phone fields
- [x] Quick "Add guest" button to build the list
- [x] Each added guest appears as a removable chip in a visual list
- [x] A counter shows how many guests are in the list
- [x] "Skip for now" option for hosts who want to share later

### 3. Branded sending with progress

- [x] A "Send all invitations" button that fires off emails and SMS in parallel
- [x] Animated sending progress bar showing how many sent / failed
- [x] The existing edge functions (`send-email` / `send-sms`) and client libs (`lib/email.ts` / `lib/sms.ts`) are already wired — we just connect them to this screen
- [x] Beautiful dark-themed invitation emails with gold accents (already built in the edge function)

### 4. Access from the Event screen too

- [x] The Event detail screen's "Share invite" action tile now navigates to this Guest List screen (with the QR/link fallback still available)
- [x] The existing OS share sheet buttons remain as a secondary option below the guest list

### Design

- [x] Dark theme consistent with the rest of Sherehe (deep blacks, pink/gold accents)
- [x] Guest chips in a wrapping grid with remove buttons
- [x] Progress bar with animated pink gradient during sending
- [x] Success/failure count after sending completes
- [x] Same aesthetic as the event creation wizard — glass-morphism cards, haptic feedback
