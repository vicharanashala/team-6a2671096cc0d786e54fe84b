# FAQ Generator - AI-Powered FAQ Management System

<div align="center">

![Status](https://img.shields.io/badge/status-production--ready-green)
![Node](https://img.shields.io/badge/node-18%2B-brightgreen)
![MongoDB](https://img.shields.io/badge/mongodb-6.0%2B-green)
![License](https://img.shields.io/badge/license-MIT-blue)

**A comprehensive MERN stack FAQ management system with AI-powered FAQ generation using Google Gemini Pro**

*Developed by [Team One](CONTRIBUTING.md) as an academic project*

### 🚀 [Try the Live Demo Here!](https://faq-generator-frontend.onrender.com/)
**Backend API**: [https://faq-generator-api.onrender.com](https://faq-generator-api.onrender.com).
</div>

## Features

- **User Management** - Registration, login, role-based access (USER/ADMIN)
- **Question Submission** - Users can submit questions; guests can also contribute
- **AI-Powered FAQ Generation** - Google Gemini Pro suggests comprehensive FAQs from grouped questions
- **Approval Workflow** - Complete pipeline: new → grouped → reviewed → draft → approved → published
- **Admin Dashboard** - Manage users, questions, FAQs with full control
- **Analytics** - Track user logins, questions submitted, FAQ views
- **Bulk Import/Export** - Import questions/FAQs in bulk; export to CSV
- **Responsive Design** - Mobile-friendly UI built with Tailwind CSS
- **Secure** - JWT authentication, password hashing with bcrypt, CORS protection

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS, React Router |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| AI | Google Gemini Pro |
| Auth | JWT, bcryptjs |
| Hosting | Render (Frontend + Backend) |

---

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Google Gemini API key

### Installation

```bash
# Clone repository
git clone https://github.com/FiscalMindset/FAQ.git
cd FAQ

# Install dependencies
cd server && npm install
cd ../client && npm install
```

### Configuration

Create `server/.env`:
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net
JWT_SECRET=your_64_char_secret
GEMINI_API_KEY=your_gemini_key
ADMIN_EMAIL=admin@example.com
PORT=5000
```

Create `client/.env`:
```env
VITE_API_URL=http://localhost:5000
```

### Run

```bash
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend
cd client && npm run dev
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Users & Admins                    │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│              Render Cloud (Frontend)                 │
│           React + Vite + Tailwind CSS                │
└───────────────────────┬─────────────────────────────┘
                        │ REST API
┌───────────────────────▼─────────────────────────────┐
│              Render Cloud (Backend)                  │
│           Express.js + Node.js + MongoDB             │
└───────────────────────┬─────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  MongoDB    │ │   Gemini    │ │    JWT      │
│   Atlas     │ │    AI       │ │   Auth      │
└─────────────┘ └─────────────┘ └─────────────┘
```

---

## FAQ Workflow

```
User submits question
        ↓
    [NEW] ← Admin can reject
        ↓
Admin groups similar questions
        ↓
   [GROUPED]
        ↓
Admin selects → Gemini AI suggests FAQ
        ↓
    [DRAFT] ← Admin edits/approves
        ↓
   [APPROVED]
        ↓
Admin publishes
        ↓
   [PUBLISHED] ← Visible to everyone
```

---

## API Endpoints

### Base URL
```
[https://faq-generator-api.onrender.com](https://faq-generator-api.onrender.com)
```

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |

### Questions (Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/questions` | List questions |
| POST | `/api/questions` | Submit question |
| POST | `/api/questions/group` | Group questions |
| POST | `/api/questions/suggest-faq` | Get AI suggestion |

### FAQs (Public/Admin)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/faqs/published` | None | List published |
| GET | `/api/faqs` | Admin | List all |
| POST | `/api/faqs` | Admin | Create |
| PATCH | `/api/faqs/:id/status` | Admin | Update status |

### Users (Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users |
| GET | `/api/users/stats` | Get statistics |
| PUT | `/api/users/:id` | Update user |

---

## Deployment

### Both Frontend & Backend on Render (Via Blueprint)

The easiest way to deploy this project is using the included `render.yaml` Blueprint.
1. Create an account on [Render](https://render.com)
2. Click **New +** -> **Blueprint**
3. Connect your repository. Render will automatically configure and build both the Web Service and Static Site!
4. Once deployed, add your `MONGODB_URI`, `GEMINI_API_KEY`, and `CLIENT_URL` to the Web Service environment variables.

### Manual Setup (Without Blueprint)

#### Backend - Render (Web Service)
| Setting | Value |
|---------|-------|
| **Name** | `faq-generator-api` |
| **Root Directory** | `server` |
| **Framework** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |

**Environment Variables:**
```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net
JWT_SECRET=your_64_char_secret
GEMINI_API_KEY=your_gemini_key
CLIENT_URL=https://your-frontend.onrender.com
PORT=5000
ADMIN_EMAIL=admin@example.com
NODE_ENV=production
```

#### Frontend - Render (Static Site)
| Setting | Value |
|---------|-------|
| **Name** | `faq-generator-frontend` |
| **Root Directory** | `client` |
| **Framework** | `Static` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

**Environment Variables:**
```env
VITE_API_URL=https://backendfaq.onrender.com
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) | Setup, workflow, code examples |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Team info and contribution guidelines |

---

## License

MIT License - See [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with MERN Stack**

</div>
