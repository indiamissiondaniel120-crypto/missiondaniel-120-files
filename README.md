# DANIEL 120 | Uplifting Education

"Uplifting Education, Shaping Futures" - A comprehensive educational platform for students, mentors, and administrators.

## Features
- **Student Dashboard**: Real-time study tracking, material access, and AI Doubt Solver.
- **Mentor Dashboard**: Student oversight and real-time chat.
- **Admin Panel**: User management, class creation, and detailed attendance/usage CSV exports.
- **AI Integration**: Powered by Google Gemini via Genkit for concept explanations, summarization, and doubt solving.

## How to push to GitHub

Follow these steps in your terminal to host your code on GitHub:

1. **Create a new repository** on [GitHub](https://github.com/new). Do not initialize it with a README or License.
2. **Open the terminal** in this environment.
3. **Initialize Git** (if not already done):
   ```bash
   git init
   git checkout -b main
   ```
4. **Add your GitHub repository as a remote**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   ```
5. **Stage and Commit your changes**:
   ```bash
   git add .
   git commit -m "Initial commit of DANIEL 120 platform"
   ```
6. **Push to GitHub**:
   ```bash
   git push -u origin main
   ```

*Note: You may need to generate a [Personal Access Token (Classic)](https://github.com/settings/tokens) if you haven't set up SSH keys.*

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Database/Auth**: Firebase Firestore & Firebase Auth
- **AI**: Genkit with Google AI (Gemini)
- **UI**: Tailwind CSS, ShadCN UI, Lucide Icons
