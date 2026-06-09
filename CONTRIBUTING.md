# Contributing to FAQ Generator

<div align="center">

![Project](https://img.shields.io/badge/project-FAQ%20Generator-blue)
![Stack](https://img.shields.io/badge/stack-MERN%20%2B%20Gemini-green)
![Status](https://img.shields.io/badge/status-active-success)

**A collaborative academic project by Team One**

*Built as a comprehensive FAQ management system with AI-powered features*

</div>

---

## About This Project

**FAQ Generator** is a production-ready MERN stack application that allows organizations to efficiently manage frequently asked questions with the help of AI.

### Key Features
- 🤖 **AI-Powered** - Uses Google Gemini Pro to generate comprehensive FAQs from grouped questions
- 👥 **Role-Based Access** - USER and ADMIN roles with appropriate permissions
- ✅ **Approval Workflow** - Complete pipeline from question submission to FAQ publication
- 📊 **Analytics** - Track user activity, question metrics, and FAQ engagement
- 📦 **Bulk Operations** - Import/export questions and FAQs via CSV
- 📱 **Responsive** - Works seamlessly on desktop and mobile devices

---


### Contributors

| Name | Email | GitHub |
|------|-------|--------|
| Poorti Swarup [LEAD] | poortiswarup1306@gmail.com | [@Codeindespair](https://github.com/codeindespair) |
| Anoogna Gunjari | anoognagunjari@gmail.com | [@Anoogna](https://github.com/Anoogna) |
| Yash Parmar | yparmar24020@gmail.com | [@YashParmar27](https://github.com/YashParmar27) |
| Muskan Kumari | muskankumari5386@gmail.com | [@tulipcoder](https://github.com/tulipcoder) |
| Siddharth Sadhu | siddharthsadhu28@gmail.com | [@siddharthsadhu](https://github.com/siddharthsadhu) |
| Aakashi Singh | aakashisingh4671@gmail.com | [@aakashisingh4671-pixel](https://github.com/aakashisingh4671-pixel) |
|Jatin Kumar | jatinkumar1101@gmail.com | [@jatin110105](https://github.com/jatin110105) |
| Muralikrishnan N | muralikrishnan2k7@gmail.com | [@murali-33011](https://github.com/murali-33011) |
| Sneha | rajpootsneha831@gmail.com | [@sneha-techiee](https://github.com/sneha-techiee) |
| N Vardhana | nallavardhana292@gmail.com | [@vardhana292](https://github.com/vardhana292) |

---

## Project Structure

```
FAQ Generator/
├── server/                    # Express.js Backend API
│   ├── src/
│   │   ├── config/           # Database configuration
│   │   ├── controllers/      # Request handlers
│   │   ├── middleware/       # Auth middleware
│   │   ├── models/           # Mongoose schemas
│   │   ├── routes/           # API routes
│   │   ├── app.js            # Express app
│   │   ├── server.js         # Entry point
│   │   └── seed.js           # Database seeder
│   └── package.json
│
├── client/                    # React Frontend
│   ├── src/
│   │   ├── components/       # Shared components
│   │   ├── context/          # React context (Auth)
│   │   ├── pages/            # Page components
│   │   ├── services/         # API service
│   │   ├── App.jsx           # Router
│   │   └── main.jsx          # Entry point
│   ├── index.html
│   └── package.json
│
├── README.md                  # Project documentation
├── DEVELOPER_GUIDE.md         # Developer documentation
├── CONTRIBUTING.md            # This file
└── package.json               # Root scripts
```

---

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | React 18, Vite | UI Framework |
| **Styling** | Tailwind CSS | Responsive Design |
| **Routing** | React Router v6 | Client-side Routing |
| **HTTP** | Axios | API Communication |
| **Backend** | Express.js | REST API Server |
| **Runtime** | Node.js | JavaScript Runtime |
| **Database** | MongoDB, Mongoose | Data Storage |
| **Auth** | JWT, bcryptjs | Authentication |
| **AI** | Google Gemini Pro | FAQ Generation |
| **Hosting** | Vercel, Render | Cloud Deployment |

---

## Development Setup

### Prerequisites

- Node.js 18 or higher
- MongoDB Atlas account
- Google Gemini API key

### Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/FiscalMindset/FAQ.git
cd FAQ

# 2. Install server dependencies
cd server && npm install

# 3. Install client dependencies
cd ../client && npm install

# 4. Configure environment variables
cp server/.env.example server/.env
# Edit server/.env with your credentials

# 5. Start development servers
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

### Required Environment Variables

**Server (`server/.env`):**
```bash
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/dbname
JWT_SECRET=your_64_character_random_string
GEMINI_API_KEY=your_google_gemini_api_key
ADMIN_EMAIL=admin@example.com
PORT=5000
CLIENT_URL=http://localhost:5173
```

**Client (`client/.env`):**
```bash
VITE_API_URL=http://localhost:5000
```

---

## Git Workflow

### Branching Strategy

```bash
# Feature branches
git checkout -b feature/your-feature-name

# Bug fixes
git checkout -b fix/issue-description

# Documentation
git checkout -b docs/update-readme
```

### Commit Message Format

| Type | Description |
|------|-------------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation changes |
| `refactor:` | Code refactoring |
| `test:` | Adding tests |
| `chore:` | Maintenance tasks |

**Example:**
```bash
git commit -m "feat: add user activity tracking
- Added login_count and last_login fields to User model
- Updated auth controller to track logins
- Added stats endpoint for admin dashboard"
```

### Pull Request Process

1. Fork the repository (if external)
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit Pull Request to `main` branch
6. Wait for review and approval

---

## Code Style Guidelines

### JavaScript/Node.js

- Use ES6+ modules (`import/export`)
- Use `async/await` over `.then()` chains
- Use meaningful variable names
- Add error handling with try/catch
- One export per file

### React

- Functional components with hooks
- Use `useState` for local state
- Use `useContext` for shared state
- Use `useEffect` for side effects
- Prefer composition over prop drilling

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `userName`, `totalCount` |
| Constants | UPPER_SNAKE | `MAX_RETRIES`, `API_URL` |
| Functions | camelCase | `getUser()`, `handleSubmit()` |
| Components | PascalCase | `UserProfile.jsx`, `AdminDashboard` |
| Files | kebab-case | `user-profile.jsx`, `api-service.js` |

---

## API Development

### Adding a New Endpoint

**1. Create Controller** (`server/src/controllers/example.controller.js`)
```javascript
export const exampleHandler = async (req, res) => {
  try {
    // Your logic here
    res.json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

**2. Add Route** (`server/src/routes/example.routes.js`)
```javascript
import { Router } from 'express';
import { exampleHandler } from '../controllers/example.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.get('/', authenticate, exampleHandler);
export default router;
```

**3. Register Route** (`server/src/app.js`)
```javascript
import exampleRoutes from './routes/example.routes.js';
app.use('/api/example', exampleRoutes);
```

### Response Format

```json
// Success
{ "success": true, "data": {...} }

// Error
{ "success": false, "error": "Error message" }
```

---

## Testing

### Manual Testing Checklist

**Authentication:**
- [ ] User registration with validation
- [ ] Login with correct credentials
- [ ] Login with wrong credentials (should fail)
- [ ] Logout functionality

**User Flow:**
- [ ] Submit question
- [ ] View published FAQs
- [ ] Dashboard shows user data

**Admin Flow:**
- [ ] View all questions
- [ ] Group questions
- [ ] Generate AI FAQ suggestion
- [ ] Edit draft FAQ
- [ ] Approve and publish FAQ
- [ ] Verify on homepage
- [ ] View users list and stats
- [ ] Change user roles
- [ ] Export data to CSV

---

## Common Issues & Solutions

### MongoDB Connection Failed
- Check `MONGODB_URI` format
- Ensure IP whitelist includes `0.0.0.0/0` (for development)
- Verify database credentials

### JWT Token Invalid
- Clear localStorage: `localStorage.clear()`
- Login again to get fresh token

### CORS Error
- Ensure `CLIENT_URL` in `.env` matches frontend URL
- Include port number in development

### Gemini API Not Working
- Verify `GEMINI_API_KEY` is valid
- Check billing is enabled at Google AI Studio
- Ensure API key has necessary permissions

---

## Resources

- [React Documentation](https://react.dev)
- [Node.js Documentation](https://nodejs.org)
- [MongoDB Documentation](https://docs.mongodb.com)
- [Express.js Guide](https://expressjs.com)
- [Google Gemini API](https://ai.google.dev)
- [Tailwind CSS](https://tailwindcss.com)

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## Contact

For questions or collaboration, reach out to the team:

- **Project Lead**: Vicky Kumar - [@FiscalMindset](https://github.com/FiscalMindset)
- **Repository**: https://github.com/FiscalMindset/FAQ

---

<div align="center">

**© 2026 Team One - Academic Project**

*Built with MERN Stack + Google Gemini AI*

</div>
