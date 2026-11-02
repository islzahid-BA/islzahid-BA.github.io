# Zahidul Islam Portfolio — Real Content Build v1

This build uses the current September 2026 résumé and the images supplied in chat.

## Public contact choices
- Phone number is not shown.
- Email is not shown in public HTML.
- Connect button goes to LinkedIn.
- Tulsa, Oklahoma appears subtly as location.

## Privacy
The ASF Chapters screenshot was sanitized before inclusion: the staff portrait, displayed email, and displayed phone number were blurred. The unsanitized original is not included in this website package.

## GitHub
Verified Metro repo: https://github.com/islzahid-BA/metro-tmobile-store-performance-analytics
GitHub profile: https://github.com/islzahid-BA

The exact SQL repository path supplied in chat returned 404 through the connected GitHub account during this build. The website therefore avoids publishing a broken direct link and links to the GitHub profile until the path is confirmed.

## Image policy
The headshot received only a web crop and subtle technical optimization—no generative facial alteration.
The business-history section does not use fake historical photos. Real archive images are preferable; otherwise we can use truthful illustration/metrics rather than imagery that could imply documentation that did not exist.

## Next revision
1. Confirm SQL repo URL.
2. Upload next project.
3. Upload 10–20 photography candidates.
4. Upload more cat images if desired.
5. Add real Dota statistics from a retrievable data source.
6. Review case-study wording and privacy.
7. Add favicon/social preview/accessibility polish.

Open `index.html` locally. Everything currently implemented is static HTML/CSS/JS and GitHub Pages-compatible.


## Revision V4
Implemented content notes 18–26: specific INFORMS presentation link, revised About narrative and timeline, reorganized toolkit, three interactive Analytics Lab games, photography typing transition + moving film strip, and a redesigned arcade with Dota + Data and Cat Quest. The Treat Fund UI is intentionally not connected to payments until a real donation URL is provided.


## Revision V5
- Header: removed the "analyst's notebook" and "whiteboard mode" labels.
- Analytics Lab rebuilt with three full games (assets/lab.js, assets/lab.css):
  KPI Detective (10 cases), Bottleneck Factory (10 factories), Calibration Challenge (70-question bank, 10 random per round).
  Visitors get a case they haven't played yet until they've seen them all. Edit or add content in `assets/lab-data.js`.
- Photography: slower typing intro ("Sometimes" → blinking _ cursor → "I stop measuring things."), smaller hero title with one line of text,
  moving contact sheet removed, new "Browse all photographs" page (gallery.html).
  To add photos: drop the file in assets/images/ and add one line to `assets/photos.js`.
- Arcade: terminal removed. Cat Quest now introduces Babia with a typed speech bubble and a pixel-art game, "Babia's Bird Watch" (assets/babia.js).
  The arcade pixel font loads from Google Fonts; it falls back to a monospace font offline.


## Revision V6
- Photography: faster typing intro; removed the two text lines; new full-screen slideshow (cross-fade + slow zoom) with
  "Data helps me understand patterns. Photography reminds me to notice them." and a Browse all button; "Selected frames" mosaic below.
- 28 photos added (resized to web size, location data removed). Gallery (gallery.html) has a full-screen viewer.
  To add photos: put the large file in assets/images/photos/ and a ~720px copy in assets/images/photos/thumbs/, then add one line to assets/photos.js
  (slide: true puts it in the slideshow).
- Arcade split into two worlds: World 1 "Meet Babia" (photos, personality, the game, treat shop) and World 2 "Dota 2" (real Battle Report stats,
  hero cards, screenshots). The 71 MB GIF is now a 0.7 MB looping video (assets/images/dota-menu.mp4).
- Babia is now referred to as "he".

## Revision V7
- Arcade: removed Player_01 label, "Two save files" line, World buttons/labels, Player 2 tag and Dotabuff link. Babia text de-duplicated;
  polaroids now portrait so photos aren't cut. Favorite heroes row (Crystal Maiden, Witch Doctor, Ancient Apparition, Dark Willow, Enigma)
  loads official images from Valve's CDN; if they ever fail, a styled initials tile shows instead. To host your own copies, put PNGs in
  assets/images/heroes/ and change the img src in arcade.html.
- Home: removed PLAYER_01 from the arcade card.
- Photography: slideshow title is now "Nature is where patterns feel most alive."; the data/photography lines close the page above Browse all.
  Corrected place names in assets/photos.js.

## Revision V8
- Nav: About · Work · Decision Games · Beyond Work ▾ (Photography, After Hours). Page labels (casebook, interactive CV, case study) removed.
- Same footer on every page with LinkedIn and GitHub icons. Arrows: → for pages on this site, ↗ for links that open elsewhere.
- Home: greeting instead of the quote, smaller heading and photo so everything fits at 100% zoom; Writing label/icons and footer résumé removed.
- Work: two-line heading, tighter cards; research card opens the new research.html (DHES, brain tumor XAI, BHC auditing).
- Project pages rebuilt as Problem → Solution → Workflow → Work in motion. Metro dashboards and the SQL architecture diagram added.
- A staff member's name in the ASF chapter screenshot is now blurred as well.
- After Hours (formerly Arcade): Treat Fund links to https://ko-fi.com/babiathecat.
- Calibration results rewritten in plain language. Two boat photos added to the gallery.

## Revision V9
- Contact form on the home page ("Let's connect"). To receive messages without your address appearing anywhere:
  1) Sign up free at https://formspree.io with isl.zahidul@gmail.com and create a form.
  2) Copy the form ID (the part after /f/ in its endpoint) into FORMSPREE_ID near the bottom of assets/script.js.
  Until then, "Send message" opens the visitor's email app addressed to you. The footer now also has an Email link to the form.
- About: one short intro + an animated journey timeline (role updated to Database Coordinator & Analyst).
- ASF: workflow removed; "The starting point" / "What changed"; role updated; Work-in-motion intro added.
- Metro: galaxy-schema data model section with the Power BI model diagram; 10 original stores vs. 20 synthetic stores noted.
- Research: hospital-course poster replaced with a new Figure 1 (assets/images/research/bhc-framework.svg).
- "Decision Games" renamed "Play Analyst"; Beyond Work menu shows just Photography and After Hours.
- After Hours: new intro line; Battle Report stats and screenshots removed. Home card: DOTA 2 cartridge instead of the support box.
- Boat photos captioned Mymensingh, Bangladesh. "I've" → "I have".
