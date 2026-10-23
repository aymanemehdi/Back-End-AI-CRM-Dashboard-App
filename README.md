# AI CRM Back-End

**Back-End** for an AI-powered CRM dashboard. It is built with **Node.js**, **Express.js**, **MongoDB**, **JWT authentication**, and **Google Gemini AI**.

This service powers the CRM data layer for leads, contacts, tasks, notes, analytics, and AI-generated sales help.

---

## What Is a CRM?

CRM stands for **Customer Relationship Management**.

A CRM helps a business keep track of:

- People you are talking to
- Companies and contacts
- Sales leads and deal stages
- Follow-up tasks and reminders
- Notes from calls, meetings, and emails
- Reports and performance statistics

In simple terms, a CRM gives your team one place to manage customers and sales opportunities instead of keeping everything in spreadsheets, chat messages, or scattered notes.

---

## What This Project Does

It provides:

- Authentication and user profile endpoints
- Lead management with pipeline stages
- Contact management
- Task tracking
- Notes for record keeping and sales context
- Analytics and dashboard metrics
- AI features powered by Gemini

The API is designed to support a front-end dashboard that shows a sales pipeline, user data, and AI-assisted workflows.

---

## Features

- JWT-based authentication and protected routes
- Lead CRUD operations
- Lead stage reordering for pipeline management
- Contact CRUD operations
- Task management for follow-ups and reminders
- Notes for record keeping and sales context
- Analytics overview with pipeline stats and trends
- AI lead summaries
- AI email draft generation
- AI sales insights generation
- MongoDB persistence with Mongoose
- CORS support for a separate front-end application

---

## Project Structure

```
Back-End-AI-CRM-Dashboard-App/
├── config/
│   └── database.js
├── controllers/
│   ├── ai.controller.js
│   ├── analytics.controller.js
│   ├── auth.controller.js
│   ├── contact.controller.js
│   ├── lead.controller.js
│   ├── note.controller.js
│   └── task.controller.js
├── middleware/
│   ├── auth.middleware.js
│   └── error.middleware.js
├── models/
│   ├── Contact.js
│   ├── Lead.js
│   ├── Note.js
│   ├── Task.js
│   └── User.js
├── routes/
│   ├── ai.routes.js
│   ├── analytics.routes.js
│   ├── auth.routes.js
│   ├── contact.routes.js
│   ├── lead.routes.js
│   ├── note.routes.js
│   └── task.routes.js
├── services/
│   └── ai.service.js
├── utils/
│   ├── APIError.js
│   ├── asyncHandler.js
│   └── generateToken.js
├── server.js
├── README.md
├── .gitignore
├── package.json
├── LICENSE
└── SECURITY.md
```

---

## Tech Stack

- **Node.js**
- **Express**
- **MongoDB**
- **Mongoose**
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Google Gemini AI** for AI assistance
- **CORS** for front-end integration
- **Morgan** for request logging in development

---

## API Overview

- `/api/auth` - authentication and profile
- `/api/leads` - lead management
- `/api/contacts` - contact management
- `/api/tasks` - task management
- `/api/notes` - note management
- `/api/analytics` - dashboard statistics
- `/api/ai` - AI-powered CRM features

### Main Endpoints

#### Authentication

- `POST /api/auth/register` - create a new user
- `POST /api/auth/login` - sign in and receive a token
- `GET /api/auth/me` - get the current authenticated user
- `PUT /api/auth/profile` - update the current user profile

#### Leads

- `GET /api/leads` - list leads
- `POST /api/leads` - create a lead
- `GET /api/leads/:id` - get one lead
- `PUT /api/leads/:id` - update a lead
- `DELETE /api/leads/:id` - delete a lead
- `PATCH /api/leads/reorder` - reorder pipeline stages or lead ordering

#### Contacts

- `GET /api/contacts` - list contacts
- `POST /api/contacts` - create a contact
- `GET /api/contacts/:id` - get one contact
- `PUT /api/contacts/:id` - update a contact
- `DELETE /api/contacts/:id` - delete a contact

#### Tasks

- `GET /api/tasks` - list tasks
- `POST /api/tasks` - create a task
- `PUT /api/tasks/:id` - update a task
- `DELETE /api/tasks/:id` - delete a task

#### Notes

- `GET /api/notes` - list notes
- `POST /api/notes` - create a note
- `PUT /api/notes/:id` - update a note
- `DELETE /api/notes/:id` - delete a note

#### Analytics

- `GET /api/analytics/overview` - pipeline and dashboard metrics

#### AI

- `GET /api/ai/status` - check AI configuration
- `POST /api/ai/lead-summary` - generate a summary for a lead
- `POST /api/ai/generate-email` - generate an email draft
- `POST /api/ai/sales-insights` - generate AI sales insights

---

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/AymaneMehdi/Back-End-AI-CRM-Dashboard-App.git
   cd Back-End-AI-CRM-Dashboard-App
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Create your environment file**

   Add a `.env` file in the project root:

   ```env
   PORT=8000
   NODE_ENV=development
   CLIENT_URL=http://localhost:5173

   MONGO_URI=your_mongodb_connection_string_here

   JWT_SECRET=replace_this_with_a_long_random_string
   JWT_EXPIRES_IN=7d

   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-2.5-flash
   ```

---

## Running the Project

### Development

```bash
npm run dev
```

Starts the server with `nodemon` for automatic restarts during development.

### Production

```bash
npm start
```

Starts the API server with Node.js.

The default port is `8000`, so the API runs at:

```text
http://localhost:8000
```

You can also verify the service with:

```text
GET /api
```

This returns a simple JSON response showing that the CRM API is running.

---

## Environment Variables

- `PORT` - the server port
- `NODE_ENV` - environment mode such as `development` or `production`
- `CLIENT_URL` - allowed front-end origin for CORS
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - secret used to sign authentication tokens
- `JWT_EXPIRES_IN` - token lifetime
- `GEMINI_API_KEY` - Google Gemini API key
- `GEMINI_MODEL` - Gemini model name used for AI responses

---

## How the CRM Works

1. A user registers or logs in.
2. The front end sends a JWT token with protected requests.
3. Leads are created and moved through stages such as new, qualified, proposal, won, and lost.
4. Contacts, tasks, and notes help the sales team stay organized.
5. Analytics summarize the current pipeline and recent activity.
6. AI endpoints can summarize leads, draft emails, and generate sales insights.

This flow is what makes the system a CRM: it combines customer data, sales workflow, and follow-up actions in one place.

---

## AI Features

The AI layer is built around Google Gemini and is used to assist sales workflows.

It can:

- Summarize a lead
- Estimate risk context for a lead
- Draft a sales email
- Generate pipeline and sales insights

If the Gemini key or model is missing, the AI status endpoint can show whether AI is configured.

---

## Code Security

- Passwords are hashed with `bcryptjs`
- Auth uses JWT tokens
- Protected routes require authentication
- CORS is restricted to the configured front-end origin
- Centralized error handling is used for API responses

---

## Deployment

The easiest way to deploy your app is using [Vercel Platform](https://vercel.com) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

---

## Security

Please review our [Security Policy](SECURITY.md) for information about reporting vulnerabilities.

## License

This project is licensed under the [MIT License](LICENSE).

---

**Copyright © Aymane Mehdi**