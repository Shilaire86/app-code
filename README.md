# The Becoming Method - Mobile App

A transformational identity-shift platform built with Expo and React Native.

## Tech Stack

- **Framework:** Expo SDK 54 + React Native
- **Language:** TypeScript
- **Navigation:** expo-router (file-based routing)
- **State Management:** Zustand + cached query/services layer
- **Backend:** Supabase
- **Payments:** RevenueCat for native subscriptions, Stripe for web checkout

## Project Structure

```
app-code/
├── src/
│   ├── app/                 # expo-router screens
│   │   ├── _layout.tsx      # Root layout
│   │   └── index.tsx        # Home screen
│   ├── components/
│   │   └── ui/              # Design system components
│   │       └── Button.tsx
│   ├── constants/
│   │   └── theme.ts         # Design tokens
│   ├── hooks/               # Custom React hooks
│   ├── stores/              # Zustand stores
│   ├── services/            # API services
│   ├── lib/                 # Utilities
│   └── types/               # TypeScript types
├── assets/                  # Images, fonts, etc.
├── app.json                 # Expo configuration
├── package.json
└── tsconfig.json
```

## Getting Started

### Prerequisites

- Node.js 20+ (LTS)
- npm or yarn
- iOS Simulator (Mac only) or Android Emulator

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on iOS (Mac only)
npm run ios

# Run on Android
npm run android

# Run on web
npm run web
```

### Development

The app uses expo-router for navigation. Add new screens by creating files in `src/app/`:

- `src/app/index.tsx` → `/`
- `src/app/profile.tsx` → `/profile`
- `src/app/settings/index.tsx` → `/settings`

## Design System

The app uses a centralized design system defined in `src/constants/theme.ts`:

- **Colors:** Primary, secondary, background, text, status colors
- **Typography:** Predefined text styles (h1-h4, body, caption)
- **Spacing:** Consistent spacing scale (xs to xxxl)
- **Radius:** Border radius values
- **Shadows:** Elevation styles

### Using the Design System

```typescript
import { theme } from '@/constants/theme';

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.md,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
});
```

## Path Aliases

The project uses TypeScript path aliases for cleaner imports:

```typescript
// Instead of: import { Button } from '../../components/ui/Button'
import { Button } from '@/components/ui/Button';
```

## Phase 0 Status

✅ Expo project initialized
✅ TypeScript configured
✅ expo-router set up
✅ Design system tokens created
✅ Core auth, profile bootstrap, and route guards implemented
✅ Training, nutrition, progress, messaging, and admin surfaces implemented
✅ Native and web billing flows scaffolded
✅ Project glossary and architecture notes added

### Next Steps (Phase 1)

- [ ] Finalize Supabase schema and RLS policies
- [ ] Connect billing sync/webhooks end to end
- [ ] Replace remaining backend-bound placeholders with live implementations
- [ ] Add broader integration coverage for auth, billing, and privileged flows

## Scripts

- `npm start` — Start Expo development server
- `npm run ios` — Run on iOS simulator
- `npm run android` — Run on Android emulator
- `npm run web` — Run in web browser

## Documentation

- [PRD](../PRD.md) — Product Requirements
- [Architecture](../ARCHITECTURE.md) — Technical architecture
- [Configuration Guide](../docs/CONFIGURATION.md) — Setup instructions
- [Deployment Guide](../docs/DEPLOYMENT.md) — Deployment procedures

## License

Private - All Rights Reserved
