# TAPLY

Next.js 15 (App Router) + TypeScript + Tailwind v4.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
```

## Тохируулах газрууд
- `lib/config.ts` — үнэ, холбоо барих мэдээлэл, `SHOW_PRICES`, транзишний чиглэл (`TRANSITION_ORIGIN`)
- `components/PageTransition.tsx` — #how ↔ #order мозайк шилжилт
- `components/Sections.tsx` — хэсгүүдийн текст
- Зураг: `public/photos/01.jpg …` тавиад `components/Sections.tsx` доторх `<Photo n={…} src="/photos/01.jpg" alt="…" />` дээр `src`-ыг нөхнө

## Deploy
GitHub → Vercel (Import Project) → Settings → Domains → `taply.mn`.
