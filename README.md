# Node Task Manager

**Node** is a modern, intelligent task management application designed for students and professionals. It seamlessly integrates with **Google Classroom** to import assignments and provides powerful tools like Kanban boards, analytics dashboards, and priority matrices to keep your work flowing.

![Node Dashboard Preview](https://github.com/user-attachments/assets/placeholder)

## ✨ Key Features

- **📊 Analytics Dashboard**: Visualize your productivity with activity heatmaps, weekly sparklines, completion rings, and deadline trackers.
- **🎓 Google Classroom Sync**: Automatically import courses and assignments. Keep track of due dates without manual entry.
- **📋 Kanban Board**: Drag-and-drop tasks across columns with cross-column support and smooth animations.
- **📅 Smart Views**: Switch between List, Kanban, Calendar, Matrix (Eisenhower), and Timeline views.
- **🔒 Supabase Auth**: Secure sign-in with Google OAuth.
- **🎨 Premium UI**: Beautiful dark mode interface built with Tailwind CSS and Framer Motion.
- **📱 Responsive**: Fully responsive sidebar and layout for all screen sizes.

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS, Lucide React (Icons)
- **Animations**: Framer Motion
- **State Management**: Zustand
- **Backend / Auth**: Supabase (PostgreSQL, Row Level Security)
- **Drag & Drop**: @dnd-kit

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- A Supabase project
- A Google Cloud project (for OAuth)

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

## 🔐 Authentication Setup

1. **Supabase**: Go to Authentication -> Providers -> Google and enable it.
2. **Google Cloud Console**:
   - Create OAuth 2.0 credentials.
   - Add your redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
