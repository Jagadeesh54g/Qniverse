# Qniverse Next

Premium interactive quantum-computing learning platform for SIH26140.

## Stack
- Next.js 14.2.5 + React 18
- Dependency-free educational statevector simulator
- MongoDB/Mongoose persistence (optional)
- ChatGPT/OpenAI API integration (optional)
- CSS/SVG/Canvas animations; no animation framework required

## Run
```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

## Optional integrations
Set `MONGODB_URI` for server persistence. The UI continues to work with localStorage when it is absent.

Set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` for the AI tutor. Without a key, Qniverse uses a deterministic local tutor fallback.

## Functional scope
- Premium responsive landing experience
- Six structured learning modules
- Interactive quantum playground
- H/X/Y/Z/CNOT/SWAP/measurement support
- Statevector simulation and shot sampling
- Measurement histogram, statevector and Bloch visualization
- Code-to-circuit parser for a small safe educational syntax
- Bell, Deutsch–Jozsa, Grover, Teleportation and Superdense Coding studio
- Five circuit challenges with validation
- Local mastery/progress and optional MongoDB persistence API
- Context-aware ChatGPT tutor API with local fallback
- Cross-page circuit session

## Deliberate scope boundary
Real hardware execution, arbitrary Python execution, authentication, instructor dashboards and collaborative editing are not faked into the prototype. They can be added as separate production modules.


## Qniverse Design System

The UI uses a premium, IBM Carbon-inspired technical language without copying IBM branding:
- IBM Plex Sans for interface and learning content
- IBM Plex Mono for code, circuit labels and quantum notation
- Black/gray foundation with IBM-blue interaction accents and restrained quantum cyan
- Strong 1px grid, editorial spacing and information-dense panels
- Motion is used to explain quantum behaviour rather than as decorative neon effects
- Custom Qniverse orbit logo
