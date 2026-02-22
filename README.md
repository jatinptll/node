# Node - Advanced Task & Academic Manager

**Node** is a premium, beautifully designed productivity application built for students and professionals. It features a stunning UI powered by dynamic live glassmorphism effects, intelligent analytics, and seamless **Google Classroom** synchronization to effortlessly import, track, and update your academic assignments.

![Node Dashboard](https://github.com/user-attachments/assets/placeholder)

## ✨ Key Features

- **🎓 Google Classroom Sync**: Two-way awareness for imported courses and assignments. Automatically pulls descriptions, due dates, course names, and correctly handles both scheduled and drafted assignments—updating automatically if your professor changes a due date.
- **📊 Interactive Analytics Dashboard**: Deep productivity visualization including:
  - **Activity Heatmap**: A full 365-day commit-style heatmap (with a custom join-year dropdown) to visualize your task completion history.
  - **Streaks & Progress**: Track daily completion streaks, weekly sparklines, and dynamic ring charts.
  - **Priority Check**: Visualize upcoming deadlines categorized strictly by urgency.
- **📋 Master your Workflow**: Drag-and-drop tasks securely in **Kanban** view, map them via **Calendar**, or crush urgencies in the **Eisenhower Matrix** and **Timeline** views.
- **🏷️ Subject Tagging & Clarity**: Tasks intelligently display their respective subject/course colored tags when viewed outside their designated folders, providing context at a glance.
- **🎨 State-of-the-Art Aesthetic**: Built with beautiful live-rendered glassmorphism gradient orbs, meticulous spacing, and smooth micro-animations using Framer Motion. Toggle instantly between gorgeous Dark and Light themes.
- **🔒 Secure Authentication**: Robust Google OAuth sign-in powered seamlessly by Supabase.

## 🛠️ Tech Stack

- **Frontend core**: React, TypeScript, Vite
- **Styling**: Tailwind CSS, bare CSS (Glassmorphism), Lucide React (Icons)
- **Animations**: Framer Motion
- **State Management**: Zustand
- **Backend / DB / Auth**: Supabase (PostgreSQL, Row Level Security)
- **Drag & Drop**: `@dnd-kit/core`
- **Routing**: React Router

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- A Supabase project
- A Google Cloud project (for Classroom APIs and OAuth)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/jatinptll/node.git
   cd node
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory (use `.env.example` as a template):
   ```env
   VITE_SUPABASE_PROJECT_ID="your-project-id"
   VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   VITE_GOOGLE_CLIENT_ID="your-google-client-id"
   ```

4. **Run Database Migrations**
   Copy the SQL from `supabase/migrations/001_initial_schema.sql` and run it in your Supabase SQL Editor to set up tables and RLS policies.

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## 🔐 Google Classroom & Authentication Setup

1. **Supabase**: Go to Authentication -> Providers -> Google and enable it.
2. **Google Cloud Console**:
   - Create OAuth 2.0 Client credentials.
   - Add your redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`
   - Enable the **Google Classroom API** inside the Google Cloud library.
   - Ensure you request the correct scopes in auth (`https://www.googleapis.com/auth/classroom.courses.readonly`, `https://www.googleapis.com/auth/classroom.coursework.me.readonly`).

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
