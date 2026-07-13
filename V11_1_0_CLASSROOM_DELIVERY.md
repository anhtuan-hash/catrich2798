# Brian English Studio V11.1.0 — Classroom Delivery

V11.1 turns a Lesson Pack into a live classroom session that students can join without creating accounts.

## Teacher workflow

1. Open `#/classroom-delivery`.
2. Choose a Lesson Pack and create a classroom session.
3. Configure teams and response modes for each activity.
4. Open the lobby and share the six-character join code or QR link.
5. Assign learners to teams, launch activities, control the timer and collect responses.
6. Review answers, award team points and export session results as CSV.
7. Download an offline HTML classroom package for presentation when internet access is unreliable.

## Student workflow

Students open `#/classroom-join`, enter the room code and a display name, then receive the current activity. The page supports check-in, short-answer, multiple-choice and poll responses. A participant token stored in the browser keeps the student connected to the same classroom session.

## New routes

- `#/classroom-delivery` — authenticated teacher host console.
- `#/classroom-join?code=ABC234` — public student join page.

## Database objects

- `classroom_sessions`
- `classroom_teams`
- `classroom_participants`
- `classroom_responses`

Public learners write only through security-definer RPCs. Direct table access remains protected by RLS and is limited to the session host or system leaders.

## Public RPCs

- `classroom_join_session`
- `classroom_get_public_state`
- `classroom_submit_response`
- `classroom_ping_participant`

## Important limitation

The downloadable offline classroom package supports presentation, timers and local team scores. Online response collection and student devices require the deployed website and Supabase connection.
