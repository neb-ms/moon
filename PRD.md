# Product Requirements Document (PRD): Project Lunar (Bri's Moon App)

## 1. Project Overview
**Objective:** To build a zero-cost, self-hosted Progressive Web App (PWA) that provides beautiful, at-a-glance lunar information. The app will blend precise scientific data (moon phases, rise/set times) with astrological context (Zodiac transits, daily vibes). 
**Target User:** Bri. The app must be intuitive, fast, and accessible as a home-screen icon on her mobile device.
**Hosting Strategy:** 100% self-hosted on a Raspberry Pi Zero 2 W, utilizing a Cloudflare Tunnel for secure, remote access from any network.

## 2. Design & UX Guidelines
* **Aesthetic:** Minimalist and clean. 
* **Theme:** High-contrast Dark Mode strictly enforced. Deep blacks and stark, bright accents to make the data and imagery pop.
* **Graphics:** Pixel art styling for the main moon graphics and calendar icons. 
* **Interaction:** Single-page application (SPA) feel. Smooth scrolling for details, and simple modal popups for calendar dates to avoid page reloads.

## 3. Minimum Viable Product (MVP) Features
### 3.1 The Daily Dashboard (Home Screen)
The default landing view, requiring no interaction to get the most critical daily data.
* **Visual:** Large, crisp pixel-art graphic of the current moon phase.
* **Header:** Current phase name (e.g., "Waxing Gibbous") and the current Zodiac sign.
* **The Vibe:** A one-sentence astrological summary outlining the energy of the current phase/sign.
* **Scientific Stats Card:** A clean grid below the main visual displaying:
    * Illumination Percentage.
    * Local Moonrise Time.
    * Local Moonset Time.

### 3.2 The Lunar Calendar
Accessible via a simple bottom navigation bar or top-right icon.
* **Monthly Grid:** A standard calendar layout where days are represented by minimalist pixel-art moon phase icons instead of just text.
* **Detail Modal:** Tapping a specific date opens a lightweight bottom sheet displaying that day's phase, illumination, and astrological sign. Includes a simple 'X' to close.

## 4. Technical Architecture
### 4.1 Hardware & Infrastructure
* **Server:** Raspberry Pi Zero 2 W.
* **Networking:** Cloudflare Tunnel to expose the local web server securely to the internet without opening router ports, allowing access whether on home Wi-Fi or cellular data.

### 4.2 Backend (Data & Logic)
* **Language:** Python.
* **Framework:** FastAPI (or Flask) for a lightweight, fast API.
* **Libraries:** `ephem` or `skyfield` for precise, local astronomical calculations (eliminating the need for paid external APIs).
* **Service:** Managed via `systemd` to ensure the backend is always running.

### 4.3 Frontend (UI/UX)
* **Core:** JavaScript and HTML.
* **Framework:** React/Next.js (exported as static files) or Vanilla JS. 
* **Styling:** Tailwind CSS for rapid implementation of the high-contrast dark mode.
* **Delivery:** Served by Nginx on the Raspberry Pi.
* **PWA Setup:** Web app manifest and service workers configured so the app can be installed directly to an iOS or Android home screen.

## 5. User Flow
1.  **Launch:** User taps the PWA icon on their home screen.
2.  **Permissions (First Run Only):** App requests location data to calculate precise local rise/set times.
3.  **View:** App lands immediately on the Daily Dashboard for at-a-glance data.
4.  **Scroll:** User scrolls down to view the Scientific Stats Card.
5.  **Navigate:** User taps the Calendar icon to view the monthly grid. User taps a past/future date to view the Detail Modal.

## 6. Future Scope (Icebox)
* Native iOS/Android Home Screen Widgets.
* Mood & Intention daily journaling functionality.
* Automated push notifications for Full/New moon peaks.
* Device-sensor AR Sky View to physically locate the moon.