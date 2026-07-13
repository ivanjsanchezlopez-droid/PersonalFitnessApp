# Personal Fitness App — v4.4

A mobile-first personal dashboard published with GitHub Pages.

## Included features

- Push, Pull and Legs gym routines.
- Four-week swimming plan.
- Mobility, mountain and open-water activity tracking.
- Completed-session history with undo and individual deletion.
- Weekly/monthly consistency and active-day streak.
- Local export and import of a complete backup.
- Personal body-composition goals with completion date and days to achieve.
- Recovery and overload-prevention check-in.
- Psychology appointment tracking with an in-app one-day reminder.
- Physiotherapy tracking and recurring preventive-review date.
- Static nutrition plan.
- Private local loading of InBody data from JSON.
- Offline-capable Progressive Web App.

## Required public files

Upload these files to the root of the `main` branch:

- `.gitignore`
- `README.md`
- `UPLOAD_INSTRUCTIONS.txt`
- `app.js`
- `icon-192.png`
- `icon-512.png`
- `index.html`
- `manifest.webmanifest`
- `style.css`
- `sw.js`

## Private files

Do not upload the following files to the public repository:

- `body-composition.json`
- `personal-fitness-backup-*.json`

The application reads and stores those records locally in the browser.

## GitHub Pages

Configure:

- Source: **Deploy from a branch**
- Branch: **main**
- Folder: **/(root)**

## Health notice

The recovery indicator is informational. It does not diagnose injuries or
replace medical, physiotherapy, psychological or nutritional care.
