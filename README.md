# CaseZero
### From report to resolution. Automatically.

CaseZero is an AI-powered civic issue management platform that transforms 
citizen complaints into tracked, accountable cases — ensuring nothing gets ignored.

## Live Demo
https://casezero-1087212795790.asia-southeast1.run.app

## Project Documentation
https://docs.google.com/document/d/1ylkxSJO3MdF6OG4VSeBmRhtM1JEmY7jAJZMjLpTIVYg/edit?usp=sharing

## AI Features (Powered by Gemini)
- **Gemini Vision** — analyzes photos to identify issue type, severity, root cause
- **Fake Resolution Detection** — AI flags suspicious case closures
- **Collective Petition Generator** — drafts formal complaints when 3+ issues cluster
- **Public Escalation Post** — generates viral social media posts for ignored cases
- **SLA Auto-Escalation** — cases automatically advance if authorities are unresponsive

## Tech Stack
- React + TypeScript + Vite
- Express.js backend
- Google Gemini (gemini-3.5-flash)
- Firebase Firestore
- Leaflet.js maps
- Google Cloud Run

## Setup
1. Clone the repo
2. Add `GEMINI_API_KEY` and Firebase config to `.env`
3. Run `npm install && npm run dev`
