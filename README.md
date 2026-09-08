# ProofFix 🛡️

> **Live Production Deployment**: [https://prooffix.vercel.app/](https://prooffix.vercel.app/)

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_%2B_PostGIS-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-Multimodal_AI-4285F4?style=flat-square&logo=google)](https://ai.google.dev/)
[![MapLibre GL](https://img.shields.io/badge/MapLibre_GL-Interactive_Maps-brightgreen?style=flat-square)](https://maplibre.org/)
[![Geoapify](https://img.shields.io/badge/Geoapify-Address_Autocomplete-orange?style=flat-square)](https://www.geoapify.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

**ProofFix** is a decentralized, community-driven civic infrastructure reporting, verification, and resolution platform. It eliminates fake, duplicate, and unaddressed civic complaints (potholes, fallen trees, live electrical wires, road blockages, sewage leaks) through **mandatory GPS telemetry, live WebRTC camera proof, Google Gemini Multimodal AI inspection, PostGIS duplicate detection, and proof-of-resolution visual audits**.

---

## 📑 Table of Contents

- [The Problem](#-the-problem)
- [The ProofFix Solution](#-the-proofFix-solution)
- [Core Features & Workflows](#-core-features--workflows)
  - [1. Verifiable Incident Capture](#1-verifiable-incident-capture)
  - [2. Multimodal AI Analysis](#2-multimodal-ai-analysis)
  - [3. Deterministic 100-Point Priority Engine](#3-deterministic-100-point-priority-engine)
  - [4. PostGIS 4-Factor Smart Duplicate Detection](#4-postgis-4-factor-smart-duplicate-detection)
  - [5. Geoapify Autocomplete & Interactive Risk Map](#5-geoapify-autocomplete--interactive-risk-map)
  - [6. Proof-of-Resolution Visual Verification](#6-proof-of-resolution-visual-verification)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Database Schema (PostgreSQL + PostGIS)](#-database-schema-postgresql--postgis)
- [API Reference](#-api-reference)
- [Security & Trust Architecture](#-security--trust-architecture)
- [Environment Variables](#-environment-variables)
- [Getting Started Locally](#-getting-started-locally)
- [Building for Production](#-building-for-production)

---

## 🚨 The Problem

Traditional municipal complaint portals and civic apps suffer from critical systemic flaws:
1. **Fake or Stale Complaints**: Users upload old gallery photos from unrelated events or stock images.
2. **Ticket Spam & Clutter**: Hundreds of people file separate tickets for the same single pothole or fallen tree.
3. **Subjective Prioritization**: Critical safety hazards (e.g., dangling live wires near schools) get buried under low-priority cosmetic issues.
4. **Unverifiable Resolutions**: Authorities mark tickets "Resolved" without photographic evidence, leaving hazards unrepaired in reality.

---

## 💡 The ProofFix Solution

ProofFix establishes an unforgeable chain of custody for every civic report:

```
[Real GPS Acquired] 
       ↓ 
[Live WebRTC Camera Stream Only (No File Uploads)] 
       ↓ 
[Gemini Multimodal AI Observation Extraction] 
       ↓ 
[Deterministic 100-Point Safety Priority Engine] 
       ↓ 
[PostGIS 30m Radius 4-Factor Duplicate Prevention] 
       ↓ 
[Supabase PostGIS Persistence & Community Confirmation] 
       ↓ 
[On-Site Before vs After Gemini Proof-of-Resolution]
```

---

## 🌟 Core Features & Workflows

### 1. Verifiable Incident Capture
- **Hardware-Enforced GPS**: Captures raw device `latitude`, `longitude`, and `accuracy` via `navigator.geolocation` and reverse-geocodes to the real locality using Geoapify / OSM.
- **Hardware Camera Only**: The report flow streams directly from device video sensors via WebRTC canvas. Gallery and file upload paths are strictly prohibited to prevent fake evidence.

### 2. Multimodal AI Analysis
- Sends live image bytes directly to **Google Gemini** (`gemini-3.8-flash`).
- Extracts structured civic risk observations:
  - Road blockage & traffic disruption level (`none`, `minor`, `moderate`, `severe`)
  - Live/hanging electrical wire hazards
  - Overhead structural/falling hazards
  - Chemical, sewage, or wastewater contamination
  - Deep sinkholes, craters, or road cave-ins

### 3. Deterministic 100-Point Priority Engine
Gemini extracts physical observations from the image, but **code deterministically calculates the final score** (`0` to `100` pts) using strict civic scoring rules:
- **Human Safety (Max 40 pts)**: Live wires (+30), deep cave-ins (+25), falling structures (+20).
- **Environmental & Health (Max 25 pts)**: Chemical/sewage leaks (+25).
- **Public Obstruction (Max 15 pts)**: Full road block (+15), lane block (+10), passage block (+5).
- **Independent Confirmations (Max 10 pts)**: 2 pts per unique neighbor verification.
- **Age / Time Unresolved (Max 10 pts)**: Escalates automatically over time.

### 4. PostGIS 4-Factor Smart Duplicate Detection
When a user submits a report:
1. PostGIS checks for existing open incidents within a **30-meter radius** (`ST_DWithin`).
2. If candidates exist, ProofFix calculates a multi-modal score:
   - **Location Proximity (30%)**
   - **Category Similarity (25%)**
   - **Visual Similarity (35%)** (via Gemini image comparison)
   - **Time Proximity (10%)**
3. If score $\ge 80$, the user is shown the existing issue and prompted to submit an **Independent Confirmation** instead of creating a duplicate ticket.

### 5. Geoapify Autocomplete & Interactive Risk Map
- **Search Any City or Area**: Fast, debounced (400ms) location selector powered by Geoapify Address Autocomplete, restricted to India.
- **MapLibre GL Interactive Canvas**: Plots live incident pins with severity color coding (`Critical`, `High`, `Medium`, `Resolved`) and auto-fits bounds.
- **Device GPS vs. Discovery Isolation**: Browsing other cities does not tamper with the user's reporting GPS coordinates.

### 6. Proof-of-Resolution Visual Verification
- Anyone in the community or municipal staff can resolve an incident.
- **On-Site Proximity Requirement**: Resolver must physically be within 50m of the original incident coordinates.
- **Before vs. After Gemini AI Comparison**: Gemini compares the original report image against the newly captured resolution frame to verify that the obstruction is completely cleared.
- Status is securely transitioned from `open` $\rightarrow$ `resolved` only upon verified proof.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Client["Browser / PWA"]
        UI[Next.js App Router UI]
        GPS[Hardware Geolocation API]
        CAM[Live WebRTC Camera Stream]
        MAP[MapLibre GL Interactive Map]
    end

    subgraph Server["Next.js Server (API Routes)"]
        AUTH_CHK[Session Auth & Security Guard]
        LOC_API["/api/location-search (Geoapify)"]
        GEO_API["/api/geocode"]
        INC_API["/api/incidents"]
        AI_API["/api/analyze-incident (Gemini)"]
        CONF_API["/api/confirm-incident"]
        RES_API["/api/verify-resolution (Gemini Vision)"]
        ENGINE[Priority & Duplicate Engines]
    end

    subgraph Backend["Cloud Infrastructure"]
        SUPA_AUTH[Supabase Auth (Google OAuth)]
        SUPA_DB[(Supabase PostgreSQL + PostGIS)]
        SUPA_STORAGE[Supabase Storage Buckets]
        GEMINI_AI[Google Gemini API]
        GEOAPIFY[Geoapify Autocomplete API]
    end

    GPS --> UI
    CAM --> UI
    UI --> LOC_API --> GEOAPIFY
    UI --> GEO_API
    UI --> INC_API
    UI --> AI_API --> GEMINI_AI
    UI --> CONF_API
    UI --> RES_API --> GEMINI_AI
    
    INC_API --> AUTH_CHK --> SUPA_DB
    INC_API --> SUPA_STORAGE
    CONF_API --> SUPA_DB
    RES_API --> SUPA_DB
    MAP <--> SUPA_DB
```

---

## 💻 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 14 (App Router) | Server-rendered React framework & API routes |
| **Language** | TypeScript | Strict type safety and robust contracts |
| **Styling** | Tailwind CSS | Custom civic design system & responsive layout |
| **Database** | PostgreSQL + PostGIS | Geospatial spatial queries (`ST_DWithin`, `ST_Distance`) |
| **Database Provider** | Supabase | Managed PostgreSQL, Row-Level Security, Realtime |
| **Authentication** | Supabase Auth (OAuth) | Google Sign-in with session persistence |
| **Storage** | Supabase Storage | S3-compatible evidence storage buckets |
| **AI / Vision** | Google Gemini API (`gemini-3.8-flash`) | Multimodal image understanding & comparison |
| **Mapping** | MapLibre GL | Vector & raster interactive map rendering |
| **Geocoding** | Geoapify Autocomplete API | Fast, debounced address search across India |

---

## 🗄️ Database Schema (PostgreSQL + PostGIS)

ProofFix runs on Supabase PostgreSQL with the `postgis` extension enabled:

```sql
-- Enable PostGIS extension
create extension if not exists postgis;

-- User Profiles
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  reputation_score integer default 10,
  created_at timestamp with time zone default now()
);

-- Civic Incidents Table
create table public.incidents (
  id uuid default gen_random_uuid() primary key,
  reporter_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  category text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  location geography(Point, 4326) not null,
  latitude double precision not null,
  longitude double precision not null,
  location_accuracy double precision default 5.0,
  city text,
  address_text text,
  primary_image_url text not null,
  ai_observations jsonb default '{}'::jsonb,
  priority_breakdown jsonb default '{}'::jsonb,
  confirmation_count integer default 1,
  captured_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Spatial Index for Ultra-Fast Radius Queries
create index idx_incidents_location on public.incidents using gist (location);
```

---

## 📡 API Reference

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/incidents` | Fetch incidents by `city`, `severity`, or `status` | Public |
| `POST` | `/api/incidents` | Submit verified incident with storage upload | **Yes (Google OAuth)** |
| `POST` | `/api/analyze-incident` | Send raw image bytes to Gemini Multimodal AI | Optional |
| `POST` | `/api/confirm-incident` | Add neighbor confirmation & increment counter | **Yes** |
| `POST` | `/api/verify-resolution`| Submit on-site resolution photo for AI audit | **Yes** |
| `GET` | `/api/location-search` | Geoapify debounced autocomplete (India) | Public |
| `GET` | `/api/geocode` | Reverse geocode coordinates to locality/city | Public |

---

## 🔒 Security & Trust Architecture

- **Server-Only Secrets**: `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, and `GEOAPIFY_API_KEY` are executed strictly in server runtime (`import 'server-only'`) and are never bundled into client JS.
- **Session-Derived User IDs**: The server extracts the authenticated user ID from Supabase auth session tokens. Client-provided `reporter_id` fields in JSON payloads are ignored to prevent spoofing.
- **Row-Level Security (RLS)**: Direct database mutations from client sessions are blocked by Supabase RLS policies; updates flow through verified server endpoints.
- **Anti-Self-Confirmation**: PostgreSQL triggers and application logic prevent original reporters from self-confirming their own submissions.

---

## ⚙️ Environment Variables

Create a `.env.local` file in the project root:

```env
# Google Gemini Multimodal AI
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash

# Supabase Real Remote PostgreSQL & PostGIS Config
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Geoapify Autocomplete & Geocoding (Server-Only)
GEOAPIFY_API_KEY=your_geoapify_api_key_here
```

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js 18.x or 20.x
- npm / yarn / pnpm

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Itz-Nisanth/ProofFix.git
cd ProofFix

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.local.example .env.local
# (Fill in your GEMINI_API_KEY, SUPABASE keys, and GEOAPIFY_API_KEY)

# 4. Run database migrations in Supabase SQL Editor
# Copy the contents of supabase/schema.sql and execute in Supabase

# 5. Start the local development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Building for Production

To validate TypeScript types and build the production bundle:

```bash
npm run build
```

To start the production server:

```bash
npm run start
```

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ❤️ for resilient, verifiable civic infrastructure.
</p>
