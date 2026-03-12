# AAP Start Ã¢â‚¬â€ Onboarding Portal

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

**Tracks** Ã¢â‚¬â€ Employees are assigned a track (HR, Warehouse, or Administrative) based on their entry in the Google Sheets roster. The track determines which modules they see.

---

## Project Structure

```
aapstart/
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ backend/          FastAPI backend (Python)
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ app/
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ auth/     Login, JWT session
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ content/  Content loader (reads /content files)
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ database/ SQLite progress tracking
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ modules/  Module API routes
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ progress/ Progress tracking routes
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ resources/ Resource Hub routes
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ static/
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ downloads/ Downloadable files served by the Resource Hub
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ .env          Your local environment config (not committed)
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ .env.example  Template for .env
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ requirements.txt
Ã¢â€â€š
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ frontend/         Next.js frontend (TypeScript)
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ app/          Pages and routes
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ components/   Reusable UI components
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ lib/          API client, types, context
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ styles/       Global CSS
Ã¢â€â€š
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ content/          All editable content lives here
    Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ modules/      One .md file per module
    Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ resources/
    Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ resources.yaml   Resource Hub items
    Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ ui/
        Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ rotating-headers.yaml  Welcome message variants
        Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ coach-tips.yaml        Quick tip variants
        Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ login-scenes.yaml      Login page left panel
```

---

## Shared Design System

The frontend now has a small set of shared files that control most of the visual system.
Start here before changing page-level styling:

- `frontend/tailwind.config.ts` Ã¢â‚¬â€ core design tokens (colors, type scale, radius, shadows, animation)
- `frontend/styles/globals.css` Ã¢â‚¬â€ ambient background, premium panel styles, prose styling, utility classes
- `frontend/components/layout/AppShell.tsx` Ã¢â‚¬â€ global portal shell, header, navigation, signed-in framing
- `frontend/components/layout/PageContainer.tsx` Ã¢â‚¬â€ page width and spacing rules
- `frontend/components/ui/` Ã¢â‚¬â€ reusable buttons, cards, badges, tabs, checklist controls, callouts

Feature-level page composition lives here:

- `frontend/components/features/login/` Ã¢â‚¬â€ login composition and form
- `frontend/components/features/overview/` Ã¢â‚¬â€ welcome hero, progress, module cards, right rail
- `frontend/components/features/modules/` Ã¢â‚¬â€ module content rendering and checklist blocks
- `frontend/components/features/completion/` Ã¢â‚¬â€ completion state presentation

Keep content changes in `/content` whenever possible. Use React components for layout and interaction, not for storing business copy.

## Frontend Pages

Primary product routes live in `frontend/app/`:

- `frontend/app/(auth)/login/page.tsx` Ã¢â‚¬â€ sign-in experience
- `frontend/app/(portal)/overview/page.tsx` Ã¢â‚¬â€ post-login home / launch point
- `frontend/app/(portal)/modules/[slug]/page.tsx` Ã¢â‚¬â€ guided module reading experience
- `frontend/app/(portal)/modules/[slug]/acknowledge/page.tsx` Ã¢â‚¬â€ acknowledgement flow
- `frontend/app/(portal)/modules/[slug]/quiz/page.tsx` Ã¢â‚¬â€ one-question-at-a-time quiz flow
- `frontend/app/(portal)/modules/[slug]/complete/page.tsx` Ã¢â‚¬â€ completion state
- `frontend/app/(portal)/resources/page.tsx` Ã¢â‚¬â€ resource hub

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
# Edit .env Ã¢â‚¬â€ add your JWT secret, Google credentials path, and sheet name
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

All content lives in the `/content` folder. You can edit these files directly in VS Code Ã¢â‚¬â€ no coding required.

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
          text: BambooHR   Ã¢â€ Â correct answer
        - id: c
          text: LinkedIn Learning
      correctId: b          Ã¢â€ Â must match the id above
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
- `**bold**` Ã¢â€ â€™ bold
- `*italic*` Ã¢â€ â€™ italic
- `## Heading` Ã¢â€ â€™ section heading
- `- Item` Ã¢â€ â€™ bullet list

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
- `published` Ã¢â‚¬â€ visible and accessible
- `coming_soon` Ã¢â‚¬â€ visible but locked with a "coming soon" label
- `draft` Ã¢â‚¬â€ completely hidden from employees

---

## Adding a New Module

1. **Create the file.** Copy an existing module file and rename it:
   ```
   content/modules/my-new-module.md
   ```

2. **Update the frontmatter.** At minimum, change:
   - `slug:` Ã¢â‚¬â€ must match the filename (without `.md`)
   - `title:` Ã¢â‚¬â€ shown on the overview page
   - `description:` Ã¢â‚¬â€ shown under the title on the overview card
   - `tracks:` Ã¢â‚¬â€ which employees see it: `[hr]`, `[warehouse]`, `[administrative]`, or `[hr, warehouse, administrative]`
   - `order:` Ã¢â‚¬â€ position in the module list (lower = earlier)
   - `status:` Ã¢â‚¬â€ `published`, `coming_soon`, or `draft`

3. **Set quiz/acknowledgement flags:**
   - `requiresQuiz: true` Ã¢â‚¬â€ employee must pass a quiz to complete
   - `requiresAcknowledgement: true` Ã¢â‚¬â€ employee must confirm statements to complete
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
2. Restart the backend Ã¢â‚¬â€ content is loaded at startup
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
- Restart the backend Ã¢â‚¬â€ content loads at startup.

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

## Dev Login Bypass

For local development, you can bypass Google Sheets login entirely.
This stays off unless you explicitly enable it.

Backend in `backend/.env`:

```env
DEV_AUTH_BYPASS=true
DEV_AUTH_EMPLOYEE_ID=dev-001
DEV_AUTH_FULL_NAME=Dev User
DEV_AUTH_TRACK=hr
```

Frontend in `frontend/.env.local`:

```env
NEXT_PUBLIC_DEV_AUTH_BYPASS=true
```

Then restart both servers.

What this does:
- The backend skips roster validation and signs you in as the dev user from `backend/.env`
- The login page shows an `Enter with dev profile` button when the frontend flag is enabled
- Progress stays tied to that stable dev employee ID, so you can test flows consistently

Keep this off in production.