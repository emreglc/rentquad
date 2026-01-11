# RentQuad - Self-Driving Quadricycle Rental System

A mobile application for renting autonomous quadricycles with contactless operation, real-time tracking, and QR code authentication.

## Overview

RentQuad is a complete rental platform that connects users with self-driving quadricycles through a mobile app. The system handles vehicle discovery, reservations, QR-based unlocking, live ride monitoring, and automated payment processing.

## Features

- **Vehicle Discovery**: Browse available quadricycles on an interactive map with real-time location and battery status
- **Smart Reservations**: Reserve vehicles remotely with automatic timeout handling
- **QR Code Authentication**: Unlock vehicles by scanning QR codes mounted on the quadricycle
- **Live Ride Tracking**: Monitor ride duration, distance, and estimated cost in real time
- **Find Vehicle**: Trigger acoustic signals and flashing lights to locate your reserved quadricycle
- **User Profiles**: Secure authentication with "remember me" functionality
- **Spatial Queries**: PostgreSQL with PostGIS for efficient location-based searches

## Tech Stack

### Mobile App
- **Framework**: React Native with Expo SDK 54
- **Navigation**: React Navigation (Stack & Tab navigators)
- **Maps**: react-native-maps
- **Camera**: expo-camera for QR scanning
- **State Management**: React Context + Custom Hooks

### Backend
- **Platform**: Supabase (PostgreSQL 14 + PostGIS)
- **Authentication**: Supabase Auth with OAuth 2.0-style flows
- **Real-time**: WebSocket subscriptions for live updates
- **Security**: Row-level security policies

### IoT Layer
- Vehicle microcontrollers with MQTT/HTTP communication
- GPS telemetry uplink
- Remote lock/unlock control

## Project Structure

```
rentquad/
├── screens/          # Main app screens (Home, Explore, ScanQR, Profile, Settings)
├── components/       # Reusable UI components (RideDetailsCard)
├── context/          # Global state management (AuthContext)
├── hooks/            # Custom React hooks (useRentalFlow)
├── lib/              # Utilities (supabaseClient, vehicleUtils)
├── data/             # Mock data (cars)
├── supabase/         # Database schema and seed scripts
├── assets/           # Images and static resources
└── report/           # Undergraduate thesis documentation
```

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Expo CLI: `npm install -g expo-cli`
- Supabase account (or self-hosted instance)
- iOS Simulator or Android Emulator

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/rentquad.git
cd rentquad
```

2. Install dependencies:
```bash
npm install
```

3. Configure Supabase:
   - Create a new Supabase project
   - Copy your project URL and anon key
   - Update `lib/supabaseClient.js` with your credentials

4. Set up the database:
```bash
# Run the schema
psql -h your-db-host -U postgres -d your-db -f supabase/schema.sql

# Seed with sample data
psql -h your-db-host -U postgres -d your-db -f supabase/seed.sql
```

5. Start the development server:
```bash
npx expo start
```

6. Run on your device:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app for physical device

## Usage

### For Users

1. **Sign Up/Login**: Create an account or log in with existing credentials
2. **Explore Vehicles**: Browse the map to find nearby available quadricycles
3. **Reserve**: Tap a vehicle marker and press "Rezerve Et" to reserve it
4. **Scan QR**: Walk to the vehicle and scan the QR code to unlock
5. **Ride**: Monitor your trip with live stats on the Active Rental card
6. **Find Vehicle**: Use "Aracı Bul" if you need help locating it
7. **End Ride**: Press "Sürüşü Bitir" when done

### For Developers

The rental flow is managed by the `useRentalFlow` hook with these phases:
- `IDLE`: No active rental
- `SELECTING`: User is viewing vehicle details
- `RESERVING`: Reservation in progress
- `RESERVED`: Vehicle is reserved
- `SCANNING`: QR code being processed
- `RIDING`: Active trip
- `ENDING`: Trip is ending

## Database Schema

Key tables:
- `profiles`: User information and license verification
- `vehicles`: Fleet inventory with PostGIS location data
- `reservations`: Active and expired reservations
- `rides`: Trip history with telemetry
- `vehicle_locations`: GPS tracking waypoints
- `payments`: Transaction records (not yet integrated)

## Current Limitations

- Payment processing is simulated (iyzico/Stripe integration pending)
- Vehicle hardware lacks full autonomous navigation
- Route replay on map not fully implemented
- Requires constant internet connection

## Future Work

- Integrate real payment providers (iyzico, Stripe)
- Add path-planning algorithms for autonomous navigation
- Implement offline resilience with local caching
- Multi-language support
- Loyalty programs and fleet analytics

## Academic Context

This project was developed as an undergraduate thesis at Gebze Technical University by Emre Güleç (Student ID: 200104004045) under the supervision of Assoc. Prof. Mehmet Göktürk.

Full thesis documentation is available in the `report/` directory.

## License

This project is available for educational and research purposes.

## Contributing

This is an academic project, but suggestions and improvements are welcome. Feel free to open issues or submit pull requests.

## Contact

- **Student**: Emre Güleç
- **Institution**: Gebze Technical University
- **Department**: Computer Engineering

---

Built with ❤️ for sustainable urban mobility
