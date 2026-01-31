# 🩸 GlucoTrack – מעקב סוכר בדם חכם

> אפליקציית PWA **חינמית** לניהול סוכרת – מאובטחת, אופליין-first, עם סנכרון ענן.
>
> **כל התכונות חינם.** תכונות AI (עוזר חכם, ניתוח דפוסים) דורשות מנוי בתשלום.

<div dir="rtl">

[![CI](https://github.com/analist0/glooktrack/actions/workflows/ci.yml/badge.svg)](https://github.com/analist0/glooktrack/actions/workflows/ci.yml)
[![CodeQL](https://github.com/analist0/glooktrack/actions/workflows/codeql.yml/badge.svg)](https://github.com/analist0/glooktrack/actions/workflows/codeql.yml)

</div>

---

## מה זה GlucoTrack?

GlucoTrack (גלוקוטרק) היא אפליקציית ווב מתקדמת למעקב אחר רמות סוכר בדם. האפליקציה שומרת את כל הנתונים **מקומית על המכשיר שלך** כברירת מחדל, עם אפשרות לסנכרון ענן דרך Supabase.

---

### 💰 תמחור

| | חינם | Pro (בתשלום) |
|---|:---:|:---:|
| מעקב מדידות סוכר | ✅ | ✅ |
| סטטיסטיקות וגרפים | ✅ | ✅ |
| ייצוא דוחות (PDF, CSV, JSON) | ✅ | ✅ |
| סנכרון ענן בין מכשירים | ✅ | ✅ |
| התקנה כאפליקציה (PWA) | ✅ | ✅ |
| מצב כהה/בהיר | ✅ | ✅ |
| קלט קולי | ✅ | ✅ |
| **עוזר AI חכם** | ❌ | ✅ |
| **ניתוח דפוסים ותובנות AI** | ❌ | ✅ |
| **שאילתות AI ללא הגבלה** | ❌ | ✅ |

---

### תכונות עיקריות

- **מעקב מדידות** – הזנת ערכי סוכר עם תאריך, שעה, הקשר ארוחה והערות
- **סטטיסטיקות** – ממוצע יומי, שבועי וחודשי, ערכים גבוהים ונמוכים
- **גרף מגמות** – תרשים אינטראקטיבי להצגת מגמות לאורך זמן
- **ייצוא דוחות** – PDF מוכן לרופא, CSV, JSON
- **עוזר AI** 💎 – ניתוח דפוסים ותובנות מבוססות בינה מלאכותית (Gemini, Grok, Perplexity)
- **סנכרון ענן** – גיבוי וסנכרון בין מכשירים דרך Supabase
- **PWA** – התקנה על מסך הבית, עבודה אופליין מלאה
- **מצב כהה/בהיר** – תמיכה מלאה בשני המצבים
- **קלט קולי** – הזנת מדידות בדיבור
- **ממשק עברית RTL** – תמיכה מלאה בעברית מימין לשמאל

---

## התקנה מהירה

### דרישות מוקדמות

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+

### שלבים

```bash
# שכפול הפרויקט
git clone https://github.com/analist0/glooktrack.git
cd glooktrack

# התקנת תלויות
pnpm install

# הרצה בסביבת פיתוח
pnpm dev
```

האפליקציה תעלה בכתובת `http://localhost:3000`.

---

## משתני סביבה

צור קובץ `.env.local` בתיקיית השורש:

```env
# Supabase (נדרש לסנכרון ענן ואימות משתמשים)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# AI Gateway (אופציונלי – לפחות ספק אחד נדרש לעוזר AI)
GEMINI_KEYS=key1,key2
XAI_KEYS=key1,key2
PERPLEXITY_KEYS=key1,key2
```

> **הערה:** האפליקציה עובדת במלואה גם ללא משתני סביבה – מעקב מדידות, סטטיסטיקות ודוחות פועלים מקומית. Supabase נדרש רק לסנכרון ענן, ומפתחות AI נדרשים רק לעוזר החכם.

---

## סקריפטים

| פקודה | תיאור |
|-------|--------|
| `pnpm dev` | שרת פיתוח עם Hot Reload |
| `pnpm build` | בנייה לייצור |
| `pnpm start` | הרצת שרת ייצור |
| `pnpm lint` | בדיקת ESLint |

---

## מבנה הפרויקט

```
glooktrack/
├── app/                        # Next.js App Router
│   ├── page.tsx                # עמוד ראשי – מעקב מדידות
│   ├── layout.tsx              # Layout + מטא-דאטה
│   ├── admin/                  # לוח בקרה למנהל
│   ├── api/ai/                 # API endpoint ל-AI Gateway
│   └── auth/callback/          # OAuth callback
│
├── components/
│   ├── diabetes-tracker/       # רכיבי הליבה
│   │   ├── measurement-form    # טופס הוספת מדידה
│   │   ├── measurement-list    # רשימת מדידות
│   │   ├── statistics-card     # כרטיס סטטיסטיקות
│   │   ├── trends-chart        # גרף מגמות
│   │   ├── report-export       # ייצוא דוחות
│   │   ├── ai-assistant        # עוזר AI
│   │   └── auth-dialog         # דיאלוג התחברות
│   ├── admin/                  # לוח בקרה אדמין
│   └── ui/                     # רכיבי Radix UI
│
├── lib/
│   ├── diabetes-storage.ts     # ניהול localStorage
│   ├── diabetes-types.ts       # TypeScript types
│   ├── settings-storage.ts     # אחסון הגדרות
│   ├── ai/                     # AI Gateway
│   │   ├── key-manager.ts      # ניהול מפתחות + רוטציה
│   │   ├── router.ts           # בחירת ספק
│   │   ├── usage-engine.ts     # הערכת טוקנים ועלויות
│   │   └── providers/          # Gemini, Grok, Perplexity
│   ├── supabase/               # אימות + סנכרון ענן
│   │   ├── client.ts           # קליינט דפדפן
│   │   ├── server.ts           # קליינט שרת
│   │   ├── data-service.ts     # שירות סנכרון
│   │   ├── use-auth.ts         # React hook לאימות
│   │   └── migration.sql       # סכמת DB + RLS
│   └── sync/                   # מנוע סנכרון + תור אופליין
│
├── public/
│   ├── manifest.json           # PWA manifest
│   └── sw.js                   # Service Worker
│
└── .github/workflows/          # CI/CD
    ├── ci.yml                  # Lint, Types, Build
    ├── deploy.yml              # Vercel deployment
    ├── codeql.yml              # סריקת אבטחה
    └── release.yml             # Semantic release
```

---

## טכנולוגיות

| שכבה | טכנולוגיה |
|------|-----------|
| Framework | Next.js 16, React 19, TypeScript |
| עיצוב | Tailwind CSS 4, Radix UI, Lucide Icons |
| גרפים | Recharts |
| טפסים | React Hook Form + Zod |
| אימות | Supabase Auth (Email, Google OAuth) |
| מסד נתונים | Supabase PostgreSQL + RLS |
| AI | Gemini, xAI/Grok, Perplexity (multi-provider gateway) |
| PWA | Service Worker, Web App Manifest |
| CI/CD | GitHub Actions, Vercel |
| אנליטיקס | Vercel Analytics |

---

## AI Gateway

המערכת תומכת במספר ספקי AI עם רוטציה אוטומטית של מפתחות, fallback בין ספקים, והערכת עלויות.

ראה [README-AI-GATEWAY.md](./README-AI-GATEWAY.md) לתיעוד מלא.

**גישה ללוח בקרה:** נווט ל-`/admin` לצפייה בסטטיסטיקות שימוש, סטטוס ספקים ועלויות.

---

## סכמת מסד הנתונים

הקובץ `lib/supabase/migration.sql` מכיל את סכמת ה-DB המלאה. הרץ אותו ב-Supabase SQL Editor:

```sql
-- טבלאות: profiles, measurements, settings
-- כולל Row Level Security (RLS) – כל משתמש רואה רק את הנתונים שלו
-- טריגרים אוטומטיים ליצירת פרופיל בהרשמה
```

---

## פריסה

### Vercel (מומלץ)

1. חבר את הריפו ל-[Vercel](https://vercel.com)
2. הגדר את משתני הסביבה בהגדרות הפרויקט
3. פריסה אוטומטית בכל push ל-`main`

או דרך GitHub Actions:

```bash
# פריסה ידנית דרך workflow dispatch
# Settings → Secrets → הוסף VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID
```

---

## אבטחה

- **אחסון מקומי** – נתונים נשמרים ב-localStorage, לא נשלחים לשרתים חיצוניים
- **RLS** – Row Level Security ב-Supabase, כל משתמש רואה רק את הנתונים שלו
- **מפתחות AI בצד שרת** – מפתחות API נשמרים רק בסביבת השרת
- **OAuth מאובטח** – הגנה מפני Open Redirect בקולבק
- **ולידציית ייבוא** – whitelist של מפתחות מותרים בייבוא נתונים
- **סריקת CodeQL** – בדיקות אבטחה אוטומטיות ב-CI

---

## תרומה לפרויקט

```bash
# צור branch חדש
git checkout -b feature/my-feature

# בצע שינויים ובדוק
pnpm lint
pnpm build

# צור PR
```

---

## רישיון

MIT

---

<div align="center">
<strong>נבנה עם ❤️ לקהילת הסוכרת</strong>
</div>
