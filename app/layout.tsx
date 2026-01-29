import React from "react";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <head>
        {/* Basic Meta */}
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        
        {/* Title & Description */}
        <title>גלוקוטרק - מעקב רמת סוכר בדם | אפליקציה חינמית לניהול סוכרת</title>
        <meta name="description" content="אפליקציית מעקב סוכרת חינמית ומאובטחת. תעד מדידות סוכר, צפה בסטטיסטיקות, גרפים ודוחות לרופא. נתונים נשמרים במכשיר בלבד - פרטיות מלאה." />
        
        {/* Keywords */}
        <meta name="keywords" content="מעקב סוכרת, סוכר בדם, אפליקציית סוכרת, ניהול סוכרת, דו״ח לרופא, מעקב גלוקוז, סוכרת סוג 1, סוכרת סוג 2, בדיקת סוכר, diabetes tracker, blood sugar monitor" />
        
        {/* Author & Copyright */}
        <meta name="author" content="יוסף אלישר - Full Stack Developer" />
        <meta name="copyright" content="יוסף אלישר" />
        
        {/* Robots */}
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="googlebot" content="index, follow" />
        
        {/* Language & Locale */}
        <meta name="language" content="Hebrew" />
        <meta httpEquiv="content-language" content="he-IL" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="he_IL" />
        <meta property="og:site_name" content="גלוקוטרק" />
        <meta property="og:title" content="גלוקוטרק - מעקב רמת סוכר בדם" />
        <meta property="og:description" content="אפליקציית מעקב סוכרת חינמית ומאובטחת. תעד מדידות, צפה בסטטיסטיקות וייצא דוחות לרופא." />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="גלוקוטרק - אפליקציית מעקב סוכרת" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="גלוקוטרק - מעקב רמת סוכר בדם" />
        <meta name="twitter:description" content="אפליקציית מעקב סוכרת חינמית ומאובטחת. תעד מדידות, צפה בסטטיסטיקות וייצא דוחות לרופא." />
        <meta name="twitter:image" content="/og-image.png" />
        
        {/* PWA / Mobile */}
        <meta name="theme-color" content="#0d9488" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="גלוקוטרק" />
        <meta name="application-name" content="גלוקוטרק" />
        <meta name="msapplication-TileColor" content="#0d9488" />
        
        {/* Favicon */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* Canonical */}
        <link rel="canonical" href="https://glucotrack.app" />
        
        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Heebo:wght@100..900&display=swap"
          rel="stylesheet"
        />
        
        {/* Security */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        
        {/* Structured Data / JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "גלוקוטרק",
              "alternateName": "GlucoTrack",
              "description": "אפליקציית מעקב סוכרת חינמית ומאובטחת לניהול רמות הסוכר בדם",
              "url": "https://glucotrack.app",
              "applicationCategory": "HealthApplication",
              "operatingSystem": "All",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "ILS"
              },
              "author": {
                "@type": "Person",
                "name": "יוסף אלישר",
                "jobTitle": "Full Stack Developer",
                "telephone": "058-4423342"
              },
              "inLanguage": "he-IL",
              "isAccessibleForFree": true,
              "featureList": [
                "מעקב רמות סוכר בדם",
                "סטטיסטיקות וממוצעים",
                "גרפים ומגמות",
                "ייצוא דוח לרופא",
                "הקלטה קולית",
                "אחסון מקומי מאובטח"
              ]
            }),
          }}
        />
        
        {/* Medical Application Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "MedicalWebPage",
              "name": "גלוקוטרק - מעקב סוכרת",
              "about": {
                "@type": "MedicalCondition",
                "name": "סוכרת",
                "alternateName": "Diabetes Mellitus"
              },
              "audience": {
                "@type": "PeopleAudience",
                "healthCondition": {
                  "@type": "MedicalCondition",
                  "name": "סוכרת"
                }
              },
              "specialty": {
                "@type": "MedicalSpecialty",
                "name": "אנדוקרינולוגיה"
              }
            }),
          }}
        />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}

export const metadata = {
      generator: 'v0.app'
    };
