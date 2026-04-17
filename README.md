# IntelliEco - Smart Waste Recycling System

IntelliEco is a beginner-friendly full-stack web application that helps users identify waste items from images and see simple recycling suggestions.

## Chosen Tech Stack

- Frontend: HTML, CSS, EJS templates, and vanilla JavaScript
- Backend: Node.js with Express
- Database: MongoDB with Mongoose
- AI: Custom TensorFlow.js or Teachable Machine waste classifier running in the browser

### Why this stack?

This project uses Express because it is simple to learn and keeps the folder structure easy for beginners. MongoDB is a good fit because image history records are flexible documents, and TensorFlow.js makes it easy to use a custom trained waste model directly in the browser.

## Features Included

- User registration with name, email, and password
- Email or code verification before login
- Login and logout
- Password reset by email
- Dashboard after login
- Upload image or capture image with the device camera
- Custom trained waste model support
- AI-assisted waste detection with direct class prediction
- Recycling suggestion for each detection
- Detection history with image, waste type, confidence, and date
- Personal waste charts
- Admin dashboard with platform statistics
- Location-based recycling centers using a map API
- User pickup requests with address and contact details
- Admin role management tools
- Downloadable CSV and PDF waste reports
- Cached recycling-center lookups
- Model version tracking for performance comparison
- Persistent MongoDB audit logs for admin actions
- Weekly and monthly scheduled report emails
- Accuracy review workflow for manual correction tracking
- Responsive design for desktop and mobile

## Folder Structure

```text
intellieco/
|-- public/
|   |-- css/style.css
|   |-- js/admin.js
|   |-- js/dashboard.js
|   `-- models/waste-classifier/
|-- src/
|   |-- config/
|   |-- controllers/
|   |-- middleware/
|   |-- models/
|   |-- routes/
|   |-- services/
|   `-- views/
|-- uploads/
|-- .env.example
|-- package.json
|-- README.md
`-- server.js
```

## Step-by-Step Setup Guide

### 1. Install software

Install these tools first:

- [Node.js](https://nodejs.org/) version 18 or later
- [MongoDB Community Server](https://www.mongodb.com/try/download/community) or a MongoDB Atlas connection string
- A custom Teachable Machine or TensorFlow.js image model export for waste categories

### 2. Open the project folder

```bash
cd intellieco
```

### 3. Install dependencies

```bash
npm install
```

### 4. Create your environment file

Copy `.env.example` to `.env` and update the values.

Example:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/intellieco
SESSION_SECRET=my-super-secret-key
BASE_URL=http://localhost:3000
EMAIL_FROM=IntelliEco <no-reply@intellieco.local>
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
ADMIN_EMAILS=admin@example.com
CUSTOM_MODEL_URL=
CUSTOM_METADATA_URL=
CURRENT_MODEL_VERSION=1.0.0
MAP_CACHE_TTL_MS=3600000
REPORT_RECIPIENTS=admin@example.com
```

### 5. Start MongoDB

If you use local MongoDB, make sure the MongoDB service is running.

### 6. Run the app

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Deploying Live

This project can be deployed live, but the best platform depends on how you want to run uploads, sessions, and scheduled jobs.

### Recommended for this project

- Render or Railway for the Node.js app
- MongoDB Atlas for the database
- A real SMTP provider for email delivery
- Cloudinary, S3, or another file storage service if you want uploaded images to survive redeploys

### Important note about Vercel

If you mean Vercel when saying "Vertex app", this app needs extra changes before Vercel is a good production choice:

- local `uploads/` storage will not persist
- `express-session` memory storage is not suitable for production
- scheduled jobs from `node-cron` are unreliable on serverless platforms

For a simple beginner-friendly live version, Render or Railway is the safer choice.

## How Email Works

- If you add real SMTP credentials in `.env`, IntelliEco sends real emails.
- If you leave SMTP settings empty, the app uses an Ethereal test account.
- When using Ethereal, the app does not send mail to the user’s real inbox.
- In development without real SMTP, IntelliEco shows the verification code after signup and shows the reset link after password reset.
- The preview link for the test email also appears in the terminal.

## Account Verification

- Users can verify by email link or by entering a 6-digit verification code on `/verify-account`
- When real email is configured, the verification email includes both the link and the code
- When real email is not configured, the app shows the verification code in the success message after registration

## Pickup Requests

- Users can submit a pickup request from the dashboard with waste type, phone number, area, full address, and optional coordinates
- Admins can review pickup requests in the admin panel
- Admins can assign a delivery person and update status from `pending` to `assigned` or `picked_up`

## Admin Panel

- Add one or more admin emails to `ADMIN_EMAILS` in `.env`
- When those users sign up, their account role becomes `admin`
- Admins can open `/admin` to view platform charts, recent users, and recent detections
- Admins can promote or demote other users from the role management table
- Admins can download waste activity reports as CSV or PDF
- Admins can review detections and save corrected waste types with notes
- IntelliEco records audit logs for role changes, report downloads, schedule edits, and reviews

## Scheduled Reports

- IntelliEco creates weekly and monthly report schedules in MongoDB
- Admins can activate a schedule and edit recipient emails from the admin panel
- Scheduled emails include CSV and PDF attachments
- Weekly jobs run every Monday at 9:00 AM and monthly jobs run on day 1 at 9:00 AM

## How Custom Waste Detection Works

This version no longer depends on generic MobileNet labels. Instead, the dashboard loads a custom TensorFlow.js image model and sends its predicted class directly to the backend.

Recommended class names for your trained model:

- `plastic`
- `metal`
- `paper`
- `organic`
- `glass`

### Option A: Local exported model

Export your Teachable Machine model as TensorFlow.js and place the exported files inside:

```text
public/models/waste-classifier/
```

Required files include:

- `model.json`
- `metadata.json`
- weight files generated by the export

### Option B: Hosted model URLs

If your model is hosted online, set these values in `.env`:

```env
CUSTOM_MODEL_URL=https://your-model-host/model.json
CUSTOM_METADATA_URL=https://your-model-host/metadata.json
CURRENT_MODEL_VERSION=1.0.0
```

Every saved detection stores the model version, so admins can compare confidence and usage across classifier versions.

## Accuracy Review Workflow

- Each detection keeps the original predicted waste type and class label
- Admins can record a reviewed waste type and optional note from the admin panel
- Review status is stored separately so predictions and corrections can be compared later

## Map API Feature

- The dashboard uses OpenStreetMap through Nominatim and Overpass
- Users can search a city or area to see nearby recycling centers
- If the live search API is unavailable, IntelliEco shows a fallback message and static tips
- IntelliEco caches successful map searches in MongoDB so results survive server restarts

## Important Beginner Notes

- External map APIs may rate-limit heavy traffic during development.
- Your custom model should be trained with clear waste images and balanced classes for better results.
- Uploaded images are stored in the local `uploads/` folder.

## Suggested Next Improvements

- Add audit log filters by action type, date, and admin user
- Add schedule frequency customization beyond the built-in weekly and monthly options
- Move report and cache jobs to a background worker queue for larger deployments
- Add bulk review tools for correcting many detections at once
