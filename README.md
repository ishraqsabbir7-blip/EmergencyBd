# 🚨 EmergencyBD — Community Emergency Response Platform

EmergencyBD is a full-stack web application built for Bangladesh that connects 
citizens during emergencies. Users can report incidents in real time, send 
radius-based SOS alerts to nearby users, request and donate to community 
funding campaigns, register as blood donors, and join volunteer efforts — all 
within a single platform with admin oversight and live analytics.

## ✨ Features

- 🔐 JWT-based user authentication and profile management
- 🚨 Emergency incident reporting with GPS location capture and image upload
- 📡 Radius-based SOS alert system using geospatial queries
- 🗺️ Interactive emergency map powered by Leaflet and OpenStreetMap
- 💰 Fund request system with admin approval and donation tracking
- 🌍 Mass community funding with progress bars, multiple payment methods,
     and full donation history
- 🩸 Blood donation management (requests, donors, campaigns)
- 🤝 Volunteer system with opportunity listings, approvals, and leaderboard
- 🛡️ Progressive warning system with auto-account restriction for abuse
- 📊 Admin analytics dashboard with SVG charts and activity timeline
- 👮 Admin panel for report management, user moderation, and fund oversight

## 🛠️ Tech Stack

**Frontend:** React 18, React Router v6, Axios, Leaflet / react-leaflet  
**Backend:** Node.js, Express.js, Mongoose  
**Database:** MongoDB Atlas  
**Media Storage:** Cloudinary  
**Authentication:** JSON Web Tokens (JWT), bcryptjs  
**Geocoding:** OpenStreetMap Nominatim (no API key required)  
**Testing:** Jest, Supertest  

## 👥 Team

Built as a semester project for CSE470 — Software Engineering at BRAC University.
