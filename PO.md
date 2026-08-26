# Project Name
Memorai

# One-line Summary
An AI-powered "Second Brain" web archive that curates, organizes, and helps you rediscover saved web content using semantic search and knowledge graph visualization.

# Problem it solves
Digital information overload and bookmark disorganization. It solves the issue of saved links becoming a "digital graveyard" by making content easily retrievable through natural language search, and actively resurfacing unread material via spaced repetition.

# Target Users
Knowledge workers, developers, students, and researchers who frequently save web resources (articles, tools, tutorials) but struggle to find or consume them later.

# Tech Stack
- Frontend: React 18, TypeScript, Vite
- Styling: TailwindCSS, Lucide Icons, Glassmorphism aesthetics
- Backend & Auth: Supabase (PostgreSQL, Auth, RLS)
- Artificial Intelligence: Google Gemini 2.5 Flash API
- Visualization: React Force Graph 2D
- Extensions: Chrome Extension (Manifest V3)
- Email: Resend (for notifications)

# Architecture
- **Frontend**: Single-page application built with React and Vite, featuring concurrent rendering and a modular component structure (Hooks, Context).
- **Backend/Database**: Serverless architecture using Supabase for PostgreSQL data storage, Real-time subscriptions, and robust Row Level Security (RLS) policies.
- **Authentication**: Managed entirely by Supabase ecosystem.
- **AI Integration**: Google Gemini API handles natural language processing, semantic search clustering, and intelligent text analysis for queries.
- **Extension Layer**: A Chrome extension acts as an active data ingest pipeline, allowing one-click saving directly into the database.

# Core Features
- AI-Powered Semantic Search (search by intent/meaning rather than exact keywords)
- Smart Fuzzy Search (handles typos with Levenshtein Distance and phonetic matching)
- Knowledge Graph Visualization (node-based interactive map of saved content)
- Smart Reminders System (Spaced Repetition tracking to prevent link rot)
- Seamless Chrome Extension for one-click bookmarking
- Automatic Categorization and Smart Folders (Recently Added, Favorites)

# Advanced Features
- Hybrid Search Strategy combining traditional text matching with AI re-ranking
- Force-Directed Node Layout for organic clustering of related topics
- Action-driven cooldowns (7-day reset) for link reminders
- Spelling suggestions ("Did you mean...") based on personalized saved vocabulary
- Independent modular scrolling for massive category lists within a unified dashboard

# Project Workflow
1. **Ingest**: The user discovers a useful resource and saves it via the Memorai Chrome Extension. 
2. **Organize**: The application automatically processes the resource, suggesting categories or applying tags based on content.
3. **Retrieve**: When the user needs the resource, they use the dashboard to search with natural language (e.g., "that CSS animation tutorial") rather than exact titles.
4. **Visualize**: The user can explore their overall saved web via the interactive Knowledge Graph to find conceptual links between different categories.
5. **Review**: The Smart Reminder system periodically nudges the user to revisit or clear unread links saved over 3 days ago, resetting via a cooldown mechanism if dismissed.

# Folder Structure
- `src/`: Contains the main React application (components, hooks, context, and core algorithm libraries like Levenshtein and Gemini clients).
- `api/`: Serverless/Edge functions for handling auxiliary backend tasks.
- `extension/`: Source code for the Chrome Extension (Manifest V3) for direct browser saving.
- `supabase/`: Database configurations, migrations, and Row Level Security (RLS) policies.

# APIs & Integrations
- **Google Gemini API**: For semantic understanding and natural language processing.
- **Supabase API**: For PostgreSQL database queries, Authentication, and Real-time syncing.
- **Resend**: For automated email workflows and notifications.

# Database
- **PostgreSQL (via Supabase)**
- Key Tables: `websites` (stores metadata, reminder states, and future vector embeddings) and `categories` (user-defined organizational buckets).
- Security: Implements strict Row Level Security (RLS) so users can only query rows matching their authenticated `user_id`.

# Engineering Highlights
- **Hybrid Search**: Engineered a search algorithm that falls back from strict keyword parsing to AI-driven semantic intent matching.
- **Data Visualization**: Integrated a complex force-directed graph to render non-relational bookmark data as a highly relational conceptual map.
- **Client-Side Algorithms**: Custom implementation of Levenshtein Distance and Soundex-like phonetic algorithms directly on the frontend for lightning-fast fuzzy search.

# Challenges Solved
- Solved exact-match limitations in traditional bookmarks by implementing semantic intent resolution.
- Tackled UI/UX bloat for large lists by implementing independent scrolling and smart categories.
- Overcame the "save and forget" habit by engineering a cooldown-based spaced repetition reminder system.
- Ensured absolute data privacy using database-level RLS rather than relying purely on application-layer checks.

# Resume Description
Developed Memorai, a full-stack "Second Brain" web archive built with React, Vite, and Supabase. Engineered an AI-powered semantic search using Google Gemini and visualized user data via interactive force-directed knowledge graphs, while implementing a spaced repetition system to optimize knowledge retrieval and curation.

# Interview Explanation
Memorai was born out of the frustration of using traditional bookmarks, which often turn into digital graveyards. I built a full-stack solution using React and Supabase that acts as a Second Brain. Instead of relying on exact keywords, I integrated the Google Gemini API for semantic search, allowing users to find links based on intent. To help visualize connections between saved resources, I implemented an interactive Knowledge Graph. I also tackled the "link rot" problem by engineering a spaced-repetition reminder system that nudges users to revisit unread links. Data ingestion is handled seamlessly via a custom Chrome Extension, and all user data is strictly secured using Supabase's Row Level Security.

# Complexity
Advanced
