# DSA Revision Tracker

A comprehensive tool designed to help you track your progress on Data Structures and Algorithms patterns and problems. This application integrates progress tracking, problem management, and pattern-based learning to streamline your DSA preparation.

## Features

- **Progress Tracking**: Track your completion status for various DSA patterns (e.g., Sliding Window, Two Pointers) and individual problems.
- **Pattern-Based Learning**: Organized around key DSA patterns to ensure structured learning.
- **Problem Management**: Database of 404 selected problems with auto-generated links.
- **Authentication**: Secure user authentication using NextAuth.js.
- **Local Deployment**: Support for exposing local server via Cloudflare Tunnel.
- **Database**: Powered by Supabase (PostgreSQL) for robust data storage.
- **UI**: Modern, responsive interface built with Tailwind CSS.

## Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [Supabase](https://supabase.com/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **Email**: [Resend](https://resend.com/) (for notifications)

## Getting Started

### Prerequisites

- Node.js installed on your machine.
- A Supabase account and project.

### Environment Setup

1. Create a `.env.local` file in the root directory.
2. Add your Supabase and NextAuth credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### Installation

Install the project dependencies:

```bash
npm install
```

### Database Setup

Follow the detailed instructions in [DATABASE_SETUP.md](./DATABASE_SETUP.md) to set up your database schema and seed initial data.

**Quick Summary:**
1. Run migrations to create tables.
2. Seed categories and patterns.
3. Seed problems using the provided script:

```bash
npm run seed:problems
```

### Running the Application

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run start`: Starts the production server.
- `npm run lint`: Runs ESLint checks.
- `npm run setup:db`: Helper script for database setup.
- `npm run seed:problems`: Seeds the specific list of 404 DSA problems into the database.

## Project Structure

- `app/`: Next.js App Router pages and layouts.
- `components/`: Reusable UI components.
- `lib/`: Utility functions and configurations (Supabase, Auth).
- `supabase/`: Database migrations and seed files.
- `scripts/`: Custom TypeScript scripts for database operations.
- `types/`: TypeScript type definitions.

## Cloudflare Tunnel

To expose your local application to the internet (e.g., for testing on other devices), you can use the included `install_cloudflared.ps1` script to install Cloudflared and then run a tunnel.

```powershell
./install_cloudflared.ps1
# Then configure your tunnel
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
