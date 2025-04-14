This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Comments

- I did a mix of all 3 tasks, hope that's okay :)
- The `GET /api/simulation` endpoint returns the max power demand, total energy consumption, concurrency factor, and the theoretical max power demand.
- Questions: Can an EV leave a chargepoint at the same tick as a new one arrives? What happens when an EV has a charging need of 0km? Are the arrival probabilities per chargepoint?

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.
