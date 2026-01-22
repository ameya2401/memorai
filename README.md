# Memorai

**A Personal Archive for Curated Web Content**

Memorai is a full-stack web application that helps users save, organize, and search their favorite websites with AI-powered capabilities. Built as a semester project demonstrating modern web development practices including React, TypeScript, Supabase, and Google Gemini AI integration.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.3-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green.svg)

---

## ✨ Features

### Core Functionality
- **Save Websites** - Store URLs with titles, descriptions, and categories
- **Smart Categories** - Organize content with custom categories
- **AI-Powered Search** - Use Google Gemini to find websites using natural language
- **Fuzzy Text Search** - Find content even with typos or partial matches
- **Spelling Suggestions** - "Did you mean..." corrections for misspelled queries
- **Dark/Light Theme** - Comfortable viewing in any environment

### Chrome Extension
- **One-Click Save** - Save current tab instantly
- **Auto-Categorization** - Smart category suggestions based on URL patterns
- **Bookmark Import** - Bulk import existing browser bookmarks
- **Keyboard Shortcuts** - Quick save with Ctrl+Shift+S

### User Experience
- **Real-time Sync** - Changes reflect immediately across devices
- **Responsive Design** - Works seamlessly on desktop and mobile
- **Grid/List Views** - Choose your preferred layout
- **Reminder System** - Get notified about saved websites

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | TailwindCSS, Google Sans Font |
| **Backend** | Supabase (PostgreSQL + Auth) |
| **AI** | Google Gemini API |
| **Serverless** | Vercel API Routes |
| **Extension** | Chrome Extension (Manifest V3) |

---

## 📁 Project Structure

```
Memorai/project/
├── src/                    # React application source
│   ├── components/         # React components
│   ├── contexts/          # React Context providers
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility libraries
│   └── types/             # TypeScript type definitions
├── api/                    # Serverless API functions
├── extension/              # Chrome browser extension
├── supabase/              # Database migrations
└── public/                # Static assets
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Google Cloud account (for Gemini API)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/memorai.git
   cd memorai/project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the project root:
   ```env
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   VITE_GEMINI_API_KEY=your-gemini-api-key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   
   Navigate to `http://localhost:5173`

### Chrome Extension Setup

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension` folder
5. Configure your dashboard URL in extension settings

---

## 📊 Database Schema

### Websites Table
```sql
CREATE TABLE websites (
  id UUID PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Uncategorized',
  description TEXT,
  favicon TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Categories Table
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 🔒 Security Features

- **Row Level Security (RLS)** - Users can only access their own data
- **JWT Authentication** - Secure token-based auth via Supabase
- **API Key Protection** - Server-side API keys never exposed to client
- **Input Sanitization** - All user inputs validated and sanitized

---

## 🎯 Key Algorithms

### Fuzzy Search (Levenshtein Distance)
The app implements a custom fuzzy search algorithm that:
- Calculates edit distance between query and content
- Supports typo tolerance up to 3 characters
- Uses phonetic matching for similar-sounding words
- Provides spelling suggestions for failed searches

### Relevance Ranking
Search results are ranked using a weighted scoring system:
- Exact title match: 200 points
- Fuzzy title match: 150 points
- Description match: 80 points
- URL match: 50 points
- Category match: 40 points

---

## 📈 Future Scope

- [ ] Semantic search using AI embeddings
- [ ] Browser extensions for Firefox and Edge
- [ ] Mobile application (React Native)
- [ ] Export/Import functionality (JSON, CSV)
- [ ] Tags in addition to categories
- [ ] Website screenshot thumbnails
- [ ] Duplicate detection
- [ ] Collaboration and sharing features

---

## 👨‍💻 Author

**Ameya Bhagat**

This project was developed as a semester project demonstrating full-stack web development skills including modern frontend frameworks, cloud databases, AI integration, and browser extension development.

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- [React](https://reactjs.org/) - UI Framework
- [Supabase](https://supabase.io/) - Backend as a Service
- [Google Gemini](https://ai.google.dev/) - AI API
- [TailwindCSS](https://tailwindcss.com/) - CSS Framework
- [Lucide Icons](https://lucide.dev/) - Icon Library