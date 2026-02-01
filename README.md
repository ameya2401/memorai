# Memorai - Your Second Brain for the Web 🧠

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.3-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green.svg)
![Gemini AI](https://img.shields.io/badge/AI-Gemini%20Flash%202.5-purple.svg)

> **"A Personal Archive for Curated Web Content"**

Memorai is a specialized full-stack application designed to solve the chaos of bookmark management. Unlike traditional browser bookmarks that become "digital graveyards," Memorai serves as an intelligent archive that helps you save, organize, and—most importantly—**rediscover** your favorite web resources using AI-powered semantic search and knowledge visualization.

---

## ✨ Why Memorai?

We all face **Digital Information Overload**. We save articles, tools, and tutorials "for later," but "later" never comes because we forget they exist or can't find them with simple keyword searches.

Memorai solves this by:
1.  **Understanding Intent**: Search for "that React animation library" and find content even if those exact words aren't in the title.
2.  **Visual Context**: See your saved web as a **Knowledge Graph**, clustering related topics together.
3.  **Active Recall**: A built-in **Spaced Repetition/Reminder** system nudges you to revisit saved content you haven't read.

---

## 🚀 Key Features

### 🧠 AI-Powered Semantic Search
Powered by **Google Gemini 2.5 Flash**, Memorai understands the *meaning* of your search queries.
- **Natural Language**: Search for "tools for backend development" to find database tutorials you saved.
- **Hybrid Search Strategy**: Combines regular text search with AI re-ranking for speed and accuracy.

### 🔍 Smart Fuzzy Search
Never worry about typos again.
- **Levenshtein Distance**: Matches "recat" to "React" (up to 3 character edits).
- **Phonetic Matching**: Finds words that sound similar (Soundex-like algorithms).
- **Spelling Suggestions**: "Did you mean..." prompts based on your personal saved vocabulary.

### 🕸️ Knowledge Graph Visualization
Visualize your "second brain." The **Graph View** renders your websites as nodes connected to their categories.
- **Interactive**: Click nodes to navigate or zoom into clusters.
- **Force-Directed Layout**: Organic grouping of related content.

### 🔔 Smart Reminders System
Don't let links rot.
- **Automatic Cues**: Websites saved >3 days ago that haven't been visited appear in "Reminders."
- **Cooldowns**: Acknowledgement resets the timer for 7 days.
- **Customizable**: Dismiss reminders for reference-only items.

### 🛠️ Sidebar & Organization
- **Independent Scrolling**: Navigate massive category lists without losing your place in the grid.
- **Smart Categories**: "Recently Added," "Favorites," and auto-categorization suggestions (via Extension).
- **Smooth UI**: Glassmorphism headers, dark mode support, and fluid transitions.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18, TypeScript, Vite | Robust, type-safe UI with concurrent rendering |
| **Styling** | TailwindCSS, Lucide Icons | Premium, Notion-inspired minimal aesthetic |
| **Backend** | Supabase (PostgreSQL) | Auth, Database, and Real-time subscriptions |
| **AI** | Google Gemini API | Semantic understanding and content analysis |
| **Visualization**| React Force Graph | Interactive knowledge graph rendering |
| **Extension** | Chrome (Manifest V3) | One-click saving from the browser |

---

## 📂 Project Structure

```bash
Memorai/project/
├── src/
│   ├── components/         # Modular UI components (Dashboard, Graph, Reminders)
│   ├── contexts/          # Global state (Auth, Theme)
│   ├── hooks/             # Custom hooks (useReminders, useSmartSearch)
│   ├── lib/               # Core algorithms (Levenshtein, Gemini client)
│   └── types/             # TypeScript definitions
├── api/                    # Serverless/Edge functions
├── extension/              # Chrome Extension source
└── supabase/              # DB Migrations & RLS Policies
```

---

## 📊 Database & Security

### Schema
Key tables: `websites` and `categories`.
- **websites**: Stores metadata, vector embeddings (future), and reminder states.
- **categories**: User-defined organizational buckets.

### Security (Row Level Security)
Security is enforced at the **Database Ecosystem level**, not just the API.
- Users can **only** access rows where `user_id` matches their authenticated session.
- Even if the frontend were compromised, one user's data remains invisible to others.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase Account
- Google Gemini API Key

### Installation

1.  **Clone the Repo**
    ```bash
    git clone https://github.com/yourusername/memorai.git
    cd memorai/project
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create `.env` in `project/`:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_anon_key
    VITE_GEMINI_API_KEY=your_gemini_key
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```

### Chrome Extension
1.  Go to `chrome://extensions`.
2.  Enable **Developer Mode**.
3.  Click **Load Unpacked** and select the `memorai/project/extension` folder.

---

## 🔮 Future Roadmap
- [ ] **Mobile App**: Native mobile experience.
- [ ] **Reader Mode**: Distraction-free content reading within the app.
- [ ] **Collaborative Spaces**: Shared folders for teams.

---

## 👨‍💻 Author
**Ameya Bhagat**
*Developed as a Semester Mini-Project demonstrating modern Full-Stack & AI capabilities.*

---