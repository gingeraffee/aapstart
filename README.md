# AAP Start â€” Onboarding Portal

A guided onboarding portal for new AAP employees. Built with FastAPI (backend) and Next.js (frontend).

---

## Table of Contents

1. [What This Is](#what-this-is)
2. [Project Structure](#project-structure)
3. [Running Locally](#running-locally)
4. [Editing Content](#editing-content)
5. [Adding a New Module](#adding-a-new-module)
6. [Managing Resources](#managing-resources)
7. [Google Sheets Setup](#google-sheets-setup)
8. [Deploying Changes](#deploying-changes)

---

## What This Is

AAP Start is an employee onboarding portal that guides new hires through a series of learning modules. Each module can include:

- Reading content
- A checklist of setup tasks
- An acknowledgement step (employee confirms they understand key points)
- A short quiz

Progress is saved automatically. Employees can log out and return at any time.

**Tracks** â€” Employees are assigned a track (HR, Warehouse, or Administrative) based on their entry in the Google Sheets roster. The track determines which modules they see.

---

## Project Structure

```
aapstart/
â”œâ”€â”€ backend/          FastAPI backend (Python)
â”‚   â”œâ”€â”€ app/
â”‚   â”‚   â”œâ”€â”€ auth/     Login, JWT session
â”‚   â”‚   â”œâ”€â”€ content/  Content loader (reads /content files)
â”‚   â”‚   â”œâ”€â”€ database/ SQLite progress tracking
â”‚   â”‚   â”œâ”€â”€ modules/  Module API routes
â”‚   â”‚   â”œâ”€â”€ progress/ Progress tracking routes
â”‚   â”‚   â””â”€â”€ resources/ Resource Hub routes
â”‚   â”œâ”€â”€ static/
â”‚   â”‚   â””â”€â”€ downloads/ Downloadable files served by the Resource Hub
â”‚   â”œâ”€â”€ .env          Your local environment config (not committed)
â”‚   â”œâ”€â”€ .env.example  Template for .env
â”‚   â””â”€â”€ requirements.txt
â”‚
â”œâ”€â”€ frontend/         Next.js frontend (TypeScript)
â”‚   â”œâ”€â”€ app/          Pages and routes
â”‚   â”œâ”€â”€ components/   Reusable UI components
â”‚   â”œâ”€â”€ lib/          API client, types, context
â”‚   â””â”€â”€ styles/       Global CSS
â”‚
â””â”€â”€ content/          All editable content lives here
    â”œâ”€â”€ modules/      One .md file per module
    â”œâ”€â”€ resources/
    â”‚   â””â”€â”€ resources.yaml   Resource Hub items
    â””â”€â”€ ui/
        â”œâ”€â”€ rotating-headers.yaml  Welcome message variants
        â”œâ”€â”€ coach-tips.yaml        Quick tip variants
        â””â”€â”€ login-scenes.yaml      Login page left panel
```

---

## Shared Design System

The frontend now has a small set of shared files that control most of the visual system.
Start here before changing page-level styling:

- `frontend/tailwind.config.ts` â€” core design tokens (colors, type scale, radius, shadows, animation)
- `frontend/styles/globals.css` â€” ambient background, premium panel styles, prose styling, utility classes
- `frontend/components/layout/AppShell.tsx` â€” global portal shell, header, navigation, signed-in framing
- `frontend/components/layout/PageContainer.tsx` â€” page width and spacing rules
- `frontend/components/ui/` â€” reusable buttons, cards, badges, tabs, checklist controls, callouts

Feature-level page composition lives here:

- `frontend/components/features/login/` â€” login composition and form
- `frontend/components/features/overview/` â€” welcome hero, progress, module cards, right rail
- `frontend/components/features/modules/` â€” module content rendering and checklist blocks
- `frontend/components/features/completion/` â€” completion state presentation

Keep content changes in `/content` whenever possible. Use React components for layout and interaction, not for storing business copy.

## Frontend Pages

Primary product routes live in `frontend/app/`:

- `frontend/app/(auth)/login/page.tsx` â€” sign-in experience
- `frontend/app/(portal)/overview/page.tsx` â€” post-login home / launch point
- `frontend/app/(portal)/modules/[slug]/page.tsx` â€” guided module reading experience
- `frontend/app/(portal)/modules/[slug]/acknowledge/page.tsx` â€” acknowledgement flow
- `frontend/app/(portal)/modules/[slug]/quiz/page.tsx` â€” one-question-at-a-time quiz flow
- `frontend/app/(portal)/modules/[slug]/complete/page.tsx` â€” completion state
- `frontend/app/(portal)/resources/page.tsx` â€” resource hub

## Content vs UI

Use these rules to keep the project maintainable:

- Update module copy, quiz questions, acknowledgements, and track-specific content in `content/modules/`
- Update resource metadata in `content/resources/resources.yaml`
- Update rotating welcome headers, coach tips, and other lightweight UI copy in `content/ui/`
- Avoid scattering HR/policy copy directly through React components unless it is purely structural UI text

## Running Locally

### Prerequisites

- Python 3.11+
- Node.js 18+
- A Google Cloud service account with access to the Google Sheet (see [Google Sheets Setup](#google-sheets-setup))

### 1. Backend setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env â€” add your JWT secret, Google credentials path, and sheet name
```

**Required `.env` values:**

| Variable | Description |
|---|---|
| `GOOGLE_CREDENTIALS_FILE` | Path to your service account JSON file |
| `GOOGLE_SHEET_NAME` | Exact name of the Google Sheet |
| `ACCESS_CODE` | Shared access code employees enter at login (default: `AAP`) |
| `JWT_SECRET_KEY` | Long random string used to sign session tokens |

```bash
# Start the backend
uvicorn app.main:app --reload --port 8000
```

API docs available at http://localhost:8000/api/docs

### 2. Frontend setup

```bash
cd frontend

npm install

# Copy environment file
cp .env.local.example .env.local
# Edit if needed (defaults work for local dev)

npm run dev
```

Frontend available at http://localhost:3000

Both servers must be running at the same time for the app to work.

---

## Editing Content

All content lives in the `/content` folder. You can edit these files directly in VS Code â€” no coding required.

### Module files (`content/modules/`)

Each module is a single `.md` file. The top section (between the `---` lines) is the configuration. The bottom section is the readable content.

**Common things to edit:**

**Change the quiz questions:**
Find the `quiz:` section at the top of the file. Edit `text:` (the question), the `text:` under each option, and `correctId:` (the letter of the correct option).

```yaml
quiz:
  questions:
    - id: q1
      text: What system is used for PTO requests?
      options:
        - id: a
          text: Paylocity
        - id: b
          text: BambooHR   â† correct answer
        - id: c
          text: LinkedIn Learning
      correctId: b          â† must match the id above
```

**Change acknowledgement statements:**
Find `acknowledgements:` and edit the `statement:` text.

```yaml
acknowledgements:
  - id: ack-1
    statement: I have read and understood the conduct expectations.
```

**Edit body content:**
Everything below the second `---` is regular Markdown. Standard formatting works:
- `**bold**` â†’ bold
- `*italic*` â†’ italic
- `## Heading` â†’ section heading
- `- Item` â†’ bullet list

**Special content blocks:**

```
:::callout tip
This shows as a teal tip box.
:::

:::callout note
This shows as a blue info box.
:::

:::checklist
- [ ] Task the employee needs to complete
- [ ] Another task
:::

:::link
url: https://example.com
label: Click here
description: Brief description of the link.
:::
```

**Change module status:**
In the frontmatter, set `status:` to one of:
- `published` â€” visible and accessible
- `coming_soon` â€” visible but locked with a "coming soon" label
- `draft` â€” completely hidden from employees

---

## Adding a New Module

1. **Create the file.** Copy an existing module file and rename it:
   ```
   content/modules/my-new-module.md
   ```

2. **Update the frontmatter.** At minimum, change:
   - `slug:` â€” must match the filename (without `.md`)
   - `title:` â€” shown on the overview page
   - `description:` â€” shown under the title on the overview card
   - `tracks:` â€” which employees see it: `[hr]`, `[warehouse]`, `[administrative]`, or `[hr, warehouse, administrative]`
   - `order:` â€” position in the module list (lower = earlier)
   - `status:` â€” `published`, `coming_soon`, or `draft`

3. **Set quiz/acknowledgement flags:**
   - `requiresQuiz: true` â€” employee must pass a quiz to complete
   - `requiresAcknowledgement: true` â€” employee must confirm statements to complete
   - Set to `false` if not needed

4. **Write the content** below the second `---`.

5. **Restart the backend.** Content is loaded at startup:
   ```bash
   # Stop the running backend (Ctrl+C) and restart:
   uvicorn app.main:app --reload --port 8000
   ```

---

## Managing Resources

Resources live in `content/resources/resources.yaml`.

### Adding a link resource

```yaml
- id: my-new-link          # Unique ID, no spaces
  title: My Resource
  description: A short description shown under the title.
  type: link
  url: https://example.com
  category: quick-links    # Must match a category id
```

### Adding a downloadable file

1. Place the file in `backend/static/downloads/`
2. Add an entry to `resources.yaml`:

```yaml
- id: my-form
  title: My Form
  description: A form employees can download and fill out.
  type: download
  filename: my-form.pdf    # Must match the filename in backend/static/downloads/
  category: forms
```

### Adding a new category

In `resources.yaml`, add to the `categories:` list:

```yaml
categories:
  - id: my-category
    label: My Category
```

Then use `category: my-category` on resources.

### Track-specific resources

To show a resource only to certain tracks, add a `tracks:` field:

```yaml
tracks: [hr]           # Only HR employees see this
tracks: [hr, administrative]   # HR and Administrative only
```

Omit `tracks:` entirely to show to all employees.

---

## Google Sheets Setup

AAP Start uses a Google Sheet to authenticate employees at login.

### Sheet structure

The sheet must have a worksheet named **`Employee Roster`** with these columns (row 1 = headers):

| Column | Value |
|---|---|
| Employee ID | Employee's ID number |
| Full Name | Employee's full name (First Last) |
| Track | `hr`, `warehouse`, or `administrative` |

**Sheet 1** (the main worksheet) is used for progress notes/other tracking and is not read by the app.

### Service account setup

1. In [Google Cloud Console](https://console.cloud.google.com), create a project (or use an existing one).
2. Enable the **Google Sheets API**.
3. Create a **Service Account** and download the JSON credentials file.
4. Share your Google Sheet with the service account's email address (give it Viewer access).
5. Place the credentials JSON file somewhere accessible to the backend (e.g., `backend/credentials.json`).
6. In `backend/.env`, set:
   ```
   GOOGLE_CREDENTIALS_FILE=credentials.json
   GOOGLE_SHEET_NAME=AAP New Hire Orientation Progress
   ```

> **Security:** The credentials JSON file contains a private key. Never commit it to git. It is already excluded by `.gitignore`.

---

## Deploying Changes

### Content-only changes (modules, resources, UI copy)

1. Edit the files in `/content`
2. Restart the backend â€” content is loaded at startup
3. No frontend rebuild needed

### Code changes (frontend or backend)

**Backend:**
```bash
cd backend
pip install -r requirements.txt   # If requirements changed
uvicorn app.main:app --port 8000
```

**Frontend:**
```bash
cd frontend
npm install       # If package.json changed
npm run build
npm start         # Production build
# or
npm run dev       # Development mode
```

---

## Common Questions

**An employee can't log in.**
- Check that their Employee ID and Full Name exactly match the Employee Roster sheet (case-insensitive, but spelling must match).
- Check that the `ACCESS_CODE` in `.env` matches what employees are told to enter.

**A module isn't showing up.**
- Check that `status:` is set to `published` (not `draft` or `coming_soon`).
- Check that `tracks:` includes the employee's track.
- Restart the backend â€” content loads at startup.

**A quiz answer isn't working.**
- Confirm `correctId:` matches the `id:` of the correct option exactly (e.g., `b`).

**A downloadable file isn't working.**
- Confirm the file exists in `backend/static/downloads/`.
- Confirm the `filename:` in `resources.yaml` matches exactly (including extension and capitalisation).

**Employee progress isn't saving.**
- Check that the backend is running and reachable.
- Check that `DATABASE_URL` in `.env` points to a writable location.

---

## Contact

For questions about this application, contact Nicole Thornton, HR Manager.
