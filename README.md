# EV Charging Intelligence Platform

A smart EV charging platform designed to reduce range anxiety by helping drivers find the most suitable charging station based on route, distance, waiting time, charger availability, charging speed, ratings, and amenities.

The system also includes an operator dashboard with AI-powered CCTV vehicle detection to estimate station occupancy and waiting time.

---

# Project Goal

The platform helps EV drivers answer:

> "Which charging station should I go to right now?"

Instead of simply showing nearby charging stations, the system recommends the best option based on multiple factors.

## Normal Mode

The recommendation considers:

1. Reachability
2. Waiting time
3. Route deviation
4. Distance
5. Charger availability
6. Charging speed
7. Rating
8. Amenities

Amenities and ratings have lower priority than practical charging factors.

## Emergency Mode

When the driver's battery is critically low, the system prioritizes:

1. Reachability
2. ETA
3. Battery remaining on arrival
4. Waiting time

Ratings and amenities become low priority.

The UI should visually indicate Emergency Mode using red accents, but the entire interface should NOT turn red.

---

# Main Product Areas

## Driver

The driver can:

- Enter starting location
- Enter destination
- Provide current battery level
- View charging stations
- View recommendations
- View station details
- See distance and route deviation
- See estimated waiting time
- See charger availability
- See charging speed
- See ratings
- See amenities
- Start a trip
- Call a station
- Use Emergency Mode

---

## Charging Station / Operator

Operators can:

- View dashboard
- Monitor station operations
- View chargers
- View analytics
- Update station information
- Update timings
- Update amenities
- View customer support information
- View sales/revenue information
- View live CCTV-based vehicle detection

The operator dashboard should eventually show AI-detected vehicle count and estimated charger availability/waiting time.

---

# AI / CCTV Feature

One of the major differentiating features is CCTV-based station intelligence.

Conceptually:

CCTV Camera
↓
AI Vehicle Detection
↓
Vehicle Count
↓
Station Occupancy
↓
Estimated Waiting Time
↓
Recommendation Engine
↓
Driver

The CCTV vehicle detection is primarily visible from the operator dashboard.

The resulting occupancy/waiting-time information is later used by the driver's recommendation system.

---

# Current Tech Stack

## Frontend

- React
- Vite
- Tailwind CSS
- React Router

## Backend

- FastAPI

## Database / Authentication

- Supabase

Supabase will eventually handle:

- Authentication
- User profiles
- Driver/operator roles
- Charging stations
- Chargers
- Reviews
- Amenities
- Station information

## Deployment

Frontend is intended to be deployed using Vercel or a similar frontend hosting platform.

Backend will be deployed separately.

---

# Current Frontend Routes

```text
/                       Landing page

/login                  Login

/signup                 Signup

/driver                 Driver Home

/driver/recommendations Driver Recommendations

/operator               Operator Dashboard

/operator/live          Live Operations

/operator/chargers      Charger Management

/operator/analytics     Analytics
