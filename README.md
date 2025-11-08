# 📚 Book Data Manager

A modern, responsive **Book Data Management Dashboard** built with **Next.js**, **Firebase**, and **Recharts**.  
This web app helps you **analyze, visualize, and manage book data** (Textbooks and Notebooks) with dynamic filtering, chart visualizations, cost summaries, and Excel export — all in a spreadsheet-like interface.

---

## ✨ Features

✅ **Firestore Data Sync**  
Fetches data automatically from your Firebase collections (`textbooks` & `notebooks`).

✅ **Interactive Filters**  
Filter books by **Class**, **Course Combination**, or **Publisher**.  
Supports **multi-select** and **auto-suggestion** for smooth searching.

✅ **Real-time Summary Cards**  
Displays **total books**, **total value**, **average discount**, and **average tax** dynamically.

✅ **Charts & Data Visualization**  
View data as **bar charts** or a detailed **table**.  
Toggle between **Book Count** and **Total Cost (₹)** views.  
Clean, animated visualizations with Recharts and Framer Motion.

✅ **Excel Export**  
Download **all data** or **filtered data** instantly in `.xlsx` format.

✅ **Data Management**  
Delete all uploaded records securely with confirmation prompts.  
Refresh button for live data reload.

✅ **Responsive UI**  
Works seamlessly across desktop, tablet, and mobile.  
Built using TailwindCSS and ShadCN/UI components.

---

## 🧱 Tech Stack

| Layer | Technology |
|:------|:------------|
| **Frontend Framework** | Next.js (React 18 + TypeScript) |
| **Styling & UI** | Tailwind CSS, ShadCN/UI |
| **Backend & Database** | Firebase Firestore |
| **Charts** | Recharts |
| **Animations** | Framer Motion |
| **Icons** | Lucide React |
| **Data Export** | XLSX.js |
| **Auth / Hosting** | Firebase Authentication & Hosting |

---

## 🧩 Folder Structure

🗂️ Folder Structure

📁 src/

📂 app/

📁 explorer/

🧭 page.tsx — Page route for the Data Explorer

🧩 components/

🎨 ui/

🖱️ button.tsx — Reusable button component

🧱 card.tsx — Card layout component for displaying data

📋 table.tsx — Table component for tabular data view

🔘 switch.tsx — Toggle switch for chart mode

🏷️ label.tsx — Label component for form and UI elements

🔍 multi-select.tsx — Custom multi-select dropdown with search and filters

➕ ... — Other shared UI utilities

📊 data-explorer.tsx — Main dashboard logic (data fetching, charts, filters, visualization)

🔥 firebase/

⚙️ index.ts — Firebase configuration and initialization hooks

🪄 hooks/

💬 use-toast.ts — Custom toast notification hook for user feedback

---

## ⚙️ Setup Guide

### 1️⃣ Clone the repository
```bash
git clone https://github.com/Gubs2709/book-data-manager.git
cd book-data-manager


2️⃣ Install dependencies
npm install

3️⃣ Configure Firebase

Create a .env.local file in the root of your project and add your Firebase credentials:

NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

4️⃣ Run the app locally
npm run dev
