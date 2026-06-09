# CrowdSourced FAQ — AI-Powered FAQ Management System

![Status](https://img.shields.io/badge/status-production--ready-green)
![Node](https://img.shields.io/badge/node-18%2B-brightgreen)
![MongoDB](https://img.shields.io/badge/mongodb-6.0%2B-green)
![License](https://img.shields.io/badge/license-MIT-blue)

A full-stack MERN application for crowdsourced FAQ management, featuring an AI-powered suggestion pipeline using Google Gemini Pro, a community discussion forum with moderation tools, and a comprehensive admin dashboard.

**Live Application:** https://faq-generator-frontend.onrender.com  
**Backend API:** https://faq-generator-api.onrender.com

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [License](#license)

---

## Features

### Public
- Browse and search published FAQs
- Rate individual FAQs (1–5 stars)
- Submit questions as a guest (no account required) or as a registered user
- View and participate in community discussion threads

### Authenticated Users
- Register and log in with JWT-based authentication
- Password reset via email (forgot password flow)
- Personal dashboard showing submitted questions and activity
- Create and reply to discussion threads
- Upvote or downvote replies in discussions
- Delete own discussions and replies

### Admin
- **Question Management** — View, categorize, group, and reject submitted questions
- **AI FAQ Pipeline** — Select grouped questions and trigger Google Gemini Pro to auto-suggest a draft FAQ
- **FAQ Lifecycle Management** — Move FAQs through the full pipeline: `suggested -> draft -> approved -> published`; edit and delete at any stage
- **Bulk Operations** — Import questions/FAQs in bulk; export published FAQs to CSV
- **User Management** — View all users, update roles, and delete accounts
- **Activity Log** — Full audit trail of user actions across the platform
- **Analytics Dashboard** — Charts and statistics on logins, questions submitted, and FAQ views
- **Discussion Moderation Dashboard** — Review flagged replies (auto-flagged at 5 downvotes), dismiss flags, or promote high-quality replies (auto-nominated at 10 upvotes) directly to a draft FAQ
- **AI Chatbot** — Floating chatbot widget powered by Gemini Pro, contextualized with published FAQs, with internal deep-links to relevant discussions

---

## Tech Stack

| Layer       | Technology                                  |
|-------------|---------------------------------------------|
| Frontend    | React 18, Vite, Tailwind CSS, React Router  |
| Backend     | Node.js 18+, Express.js                     |
| Database    | MongoDB Atlas, Mongoose                     |
| AI          | Google Gemini Pro (`@google/generative-ai`) |
| Auth        | JWT, bcryptjs                               |
| Email       | Nodemailer                                  |
| Hosting     | Render (Frontend Static Site + Backend Web Service) |

---

## Architecture

```
Client (React SPA — Render Static Site)
        |
        | REST API (JSON over HTTPS)
        |
Server (Express.js — Render Web Service)
        |
        |--- MongoDB Atlas (Database)
        |--- Google Gemini Pro (AI)
        |--- Nodemailer (Email)
```

### Data Models

| Model          | Key Fields                                                                                       |
|----------------|--------------------------------------------------------------------------------------------------|
| `User`         | username, email, password_hash, role (USER / ADMIN), login_count                                 |
| `Question`     | text, category, status (new / grouped / reviewed / converted / rejected), submitted_by, is_guest |
| `FAQ`          | question, answer, category, status (suggested / draft / approved / published / rejected), is_ai_generated, views, average_rating |
| `Discussion`   | title, text, category, author, replies_count, status (open / closed)                             |
| `Reply`        | text, author, discussion, upvotes[], downvotes[], isFaqCandidate, isFlagged                      |
| `Activity`     | user, action, metadata, timestamp                                                                |
| `Notification` | user, message, read, timestamp                                                                   |

---

## Project Structure

```
/
├── render.yaml               # Render Blueprint (auto-deploys both services)
├── package.json              # Root scripts for running dev environment
│
├── client/                   # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx    # Navigation, protected route shell
│   │   │   └── Chatbot.jsx   # Floating AI chatbot widget
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx / Register.jsx / ForgotPassword.jsx / ResetPassword.jsx
│   │   │   ├── SubmitQuestion.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Discussions.jsx / DiscussionThread.jsx
│   │   │   ├── AdminQuestions.jsx
│   │   │   ├── AdminFAQs.jsx
│   │   │   ├── AdminUsers.jsx
│   │   │   ├── AdminActivities.jsx
│   │   │   ├── AdminAnalytics.jsx
│   │   │   └── AdminDiscussions.jsx   # Moderation dashboard
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   └── services/
│   │       └── api.js        # Axios instance with base URL + JWT interceptor
│   └── .env.example
│
└── server/                   # Express backend
    ├── src/
    │   ├── server.js
    │   ├── app.js            # Express app, CORS, middleware, route registration
    │   ├── config/
    │   │   └── db.js         # MongoDB connection
    │   ├── models/           # Mongoose schemas
    │   ├── controllers/      # Business logic
    │   ├── routes/           # Route definitions
    │   ├── middleware/
    │   │   └── auth.js       # authenticate, requireAdmin, optionalAuth
    │   └── services/         # External service integrations (Gemini, email)
    └── .env.example
```

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/YashParmar27/CrowdSourcedFAQ.git
cd CrowdSourcedFAQ

# 2. Install dependencies for both client and server
npm run install:all
```

### Configuration

Create `server/.env` (refer to `server/.env.example`):

```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/dbname
JWT_SECRET=<64+ character random string>
GEMINI_API_KEY=your_gemini_api_key
ADMIN_EMAIL=admin@example.com
CLIENT_URL=http://localhost:5173
PORT=5001
```

Create `client/.env` (refer to `client/.env.example`):

```env
VITE_API_URL=http://localhost:5001
```

### Admin Account

The first user to register with the email address set in `ADMIN_EMAIL` is automatically assigned the `ADMIN` role.

### Running Locally

```bash
# Terminal 1 — Backend (runs on port 5001)
npm run dev:server

# Terminal 2 — Frontend (runs on port 5173)
npm run dev:client
```

---

## API Reference

**Base URL:** `https://faq-generator-api.onrender.com`

Authentication is via a Bearer token in the `Authorization` header.  
`[Auth]` = requires a valid JWT. `[Admin]` = requires ADMIN role.

### Authentication — `/api/auth`

| Method | Endpoint           | Auth | Description                    |
|--------|--------------------|------|--------------------------------|
| POST   | `/register`        | None | Register a new user            |
| POST   | `/login`           | None | Login and receive a JWT        |
| POST   | `/forgot-password` | None | Send password reset email      |
| POST   | `/reset-password`  | None | Reset password using token     |

### Questions — `/api/questions`

| Method | Endpoint        | Auth     | Description                                            |
|--------|-----------------|----------|--------------------------------------------------------|
| POST   | `/`             | Optional | Submit a question (guest or logged-in)                 |
| GET    | `/`             | Admin    | List all questions                                     |
| GET    | `/my`           | Auth     | List questions submitted by current user               |
| PATCH  | `/:id/status`   | Admin    | Update a question's status                             |
| POST   | `/group`        | Admin    | Group selected questions together                      |
| POST   | `/auto-suggest` | Admin    | Trigger Gemini to suggest a FAQ from grouped questions |
| DELETE | `/:id`          | Admin    | Delete a question                                      |

### FAQs — `/api/faqs`

| Method | Endpoint        | Auth  | Description                            |
|--------|-----------------|-------|----------------------------------------|
| GET    | `/published`    | None  | List all published FAQs (public)       |
| GET    | `/my`           | Auth  | List FAQs created by current user      |
| GET    | `/export/csv`   | Admin | Export all published FAQs as CSV       |
| GET    | `/`             | Admin | List all FAQs regardless of status     |
| POST   | `/`             | Admin | Create a FAQ manually                  |
| GET    | `/:id`          | Auth  | Get a single FAQ by ID                 |
| PUT    | `/:id`          | Admin | Update a FAQ's content                 |
| PATCH  | `/:id/status`   | Admin | Update a FAQ's status                  |
| PATCH  | `/:id/view`     | None  | Increment the view counter             |
| POST   | `/:id/rate`     | None  | Submit a star rating for a FAQ         |
| DELETE | `/:id`          | Admin | Delete a FAQ                           |

### Discussions — `/api/discussions`

| Method | Endpoint                    | Auth  | Description                                  |
|--------|-----------------------------|-------|----------------------------------------------|
| GET    | `/`                         | Auth  | List all discussions (paginated)             |
| POST   | `/`                         | Auth  | Create a new discussion thread               |
| GET    | `/moderation`               | Admin | Get flagged replies and FAQ candidates       |
| GET    | `/:id`                      | Auth  | Get a discussion thread and its replies      |
| DELETE | `/:id`                      | Auth  | Delete a discussion (owner or admin)         |
| POST   | `/:id/replies`              | Auth  | Post a reply to a discussion                 |
| DELETE | `/replies/:id`              | Auth  | Delete a reply (owner or admin)              |
| POST   | `/replies/:id/vote`         | Auth  | Upvote or downvote a reply (toggles)         |
| POST   | `/replies/:id/promote`      | Admin | Promote a reply to a draft FAQ               |
| POST   | `/replies/:id/dismiss-flag` | Admin | Dismiss the flag on a reply                  |

### Users — `/api/users`

| Method | Endpoint             | Auth  | Description                      |
|--------|----------------------|-------|----------------------------------|
| GET    | `/`                  | Admin | List all users                   |
| GET    | `/stats`             | Admin | Get user statistics              |
| GET    | `/check-username/:u` | None  | Check if a username is available |
| GET    | `/:id`               | Auth  | Get a user by ID                 |
| PUT    | `/:id`               | Admin | Update a user's details or role  |
| DELETE | `/:id`               | Admin | Delete a user                    |

### Activities — `/api/activities`

| Method | Endpoint | Auth  | Description                   |
|--------|----------|-------|-------------------------------|
| GET    | `/`      | Admin | List all activity log entries |
| GET    | `/stats` | Admin | Get aggregated activity stats |

### Chatbot — `/api/chat`

| Method | Endpoint | Auth | Description                            |
|--------|----------|------|----------------------------------------|
| POST   | `/`      | None | Send a message to the AI FAQ assistant |

---

## Deployment

### Render Blueprint (Recommended)

This repository includes a `render.yaml` Blueprint file. It defines both services and can deploy the entire stack in a few clicks.

1. Create an account at [Render](https://render.com).
2. Click **New +** and select **Blueprint**.
3. Connect your GitHub account and select this repository.
4. Render will detect the `render.yaml` and create both services automatically.
5. Once deployed, navigate to the **faq-generator-api** Web Service, open the **Environment** tab, and fill in the following variables:

| Variable         | Description                               |
|------------------|-------------------------------------------|
| `MONGODB_URI`    | Your MongoDB Atlas connection string      |
| `GEMINI_API_KEY` | Your Google Gemini API key                |
| `ADMIN_EMAIL`    | Email address for the auto-assigned admin |
| `CLIENT_URL`     | The public URL of your deployed frontend  |

### Manual Setup

#### Backend (Render Web Service)

| Setting        | Value        |
|----------------|--------------|
| Root Directory | `server`     |
| Build Command  | `npm install` |
| Start Command  | `npm start`  |
| Node Version   | 18+          |

#### Frontend (Render Static Site)

| Setting           | Value                          |
|-------------------|--------------------------------|
| Root Directory    | `client`                       |
| Build Command     | `npm install && npm run build` |
| Publish Directory | `dist`                         |

Set the environment variable `VITE_API_URL` to your backend's public URL.

---

## FAQ Lifecycle

```
User submits question
       |
   [new]  <-- Admin can reject at any point
       |
Admin groups similar questions
       |
   [grouped]
       |
Admin triggers Gemini AI suggestion  -->  [suggested]
       |
Admin reviews and edits draft
       |
   [draft]
       |
Admin approves
       |
   [approved]
       |
Admin publishes
       |
   [published]  <-- Visible to all users
```

---

## Documentation

| Document | Description |
|---|---|
| [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) | Architecture deep-dive, workflow, and code examples |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Team info and contribution guidelines |

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

*Developed by Team One as an academic project.*
