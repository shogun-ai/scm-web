# www.scm.mn Frontend

The official frontend application for **Solongo Capital Management** (SCM), a Mongolian investment and trust company. This application provides products, financial information, governance documentation, and customer onboarding services.

**Live Site:** [www.scm.mn](https://www.scm.mn)

## Overview

- **Framework:** React 19 + Vite 7
- **Styling:** Tailwind CSS 3
- **Icons:** Lucide React
- **HTTP Client:** Axios
- **Metadata Management:** react-helmet-async
- **Image Processing:** browser-image-compression
- **Data:** XLSX spreadsheet support
- **Deployment:** Vercel (auto-deploy on main branch push)

## Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Navbar.jsx       # Navigation menu with logo
│   │   ├── AdminPanel.jsx   # Admin dashboard (lazy-loaded)
│   │   ├── LoanRequest.jsx  # Loan application form (lazy-loaded)
│   │   ├── LoanCalculator.jsx
│   │   ├── TrustCalculator.jsx
│   │   ├── Footer.jsx
│   │   └── ...
│   ├── pages/               # Full page views
│   │   ├── ProductDetailPage.jsx
│   │   ├── GovernanceDetailPage.jsx
│   │   ├── FinancialReportsPage.jsx
│   │   ├── PrivacyPolicyPage.jsx    # NEW: Privacy policy
│   │   ├── TermsPage.jsx             # NEW: Terms of service
│   │   ├── NotFoundPage.jsx          # NEW: 404 error page
│   │   └── ...
│   ├── sections/            # Large page sections
│   │   ├── HeroSection.jsx
│   │   ├── AboutSection.jsx
│   │   ├── ProductsSection.jsx
│   │   ├── BlogSection.jsx
│   │   ├── FAQSection.jsx   # NEW: Frequently asked questions
│   │   └── ContactSection.jsx
│   ├── hooks/               # Custom React hooks
│   │   ├── useScrolled.js   # Detect scroll position
│   │   ├── useCmsData.js    # Fetch and cache API data
│   │   └── useRouting.js    # Routing logic
│   ├── context/             # React Context
│   │   └── AppContext.jsx   # App-wide state (user, settings, etc.)
│   ├── data/                # Static data and constants
│   │   ├── constants.js     # Backgrounds, colors, images, API URL
│   │   ├── products.js      # Product definitions
│   │   └── blogPosts.js     # Blog post data
│   ├── assets/              # Logo and background images
│   ├── App.jsx              # Main app component (refactored to 510 lines)
│   ├── App.css              # Global styles
│   └── main.jsx             # Entry point
├── public/                  # Static files
│   ├── board/               # Board member photos
│   ├── policies/            # PDF documents
│   └── _redirects           # Vercel routing rules
├── dist/                    # Build output (generated)
├── package.json
├── vite.config.js           # Build and optimization config
├── eslint.config.js         # Code quality rules
├── tailwind.config.js       # Tailwind CSS config
└── README.md
```

## Getting Started

### Prerequisites

- **Node.js** 18+ and **npm** 9+
- (Optional) **git** for version control

### Installation

Clone the repository and install dependencies:

```bash
cd frontend
npm install
```

### Development

Start the Vite development server with hot module reloading (HMR):

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### Build for Production

Generate optimized bundles:

```bash
npm run build
```

Outputs are created in the `dist/` directory, ready for deployment to Vercel.

### Preview Built Application

Test the production build locally:

```bash
npm run preview
```

### Code Quality

Lint all files and check for style violations:

```bash
npm run lint
```

## Key Features

### Performance

- **Code Splitting:** Heavy components (AdminPanel, LoanRequest, TrustRequest, CustomerOnboarding) are lazy-loaded via `React.lazy()`
- **Vendor Chunking:** Vite `manualChunks` separate React, Lucide, SEO, Axios, and image compression libraries into dedicated bundles
- **Compression:** Brotli (`.br`) and Gzip (`.gz`) artifacts generated at build time for optimal file serving
- **Image Optimization:**
  - Client-side image compression for uploads (via `browser-image-compression`)
  - Native `loading="lazy"` attribute on images for lazy-loading
- **Tree-Shaking:** ESM imports of lucide-react enable dead-code elimination

### SEO

- **Meta Tags:** react-helmet-async manages title, description, and Open Graph tags dynamically
- **Per-Page Metadata:** Home page, product pages, and reports all include unique meta tags
- **Structured Data:** Open Graph tags for social media sharing

### Accessibility (WCAG 2.1 AA)

- **Color Contrast:** Text colors meet AA accessibility standards (primary green: `#007A3D`)
- **Images:** All images have descriptive `alt` text
- **Navigation:** Skip-to-content link and proper heading hierarchy
- **Forms:** LoanRequest form has proper `aria-label`, `aria-expanded` for mobile menu, `aria-live="polite"` for error messages
- **Modals & Dialogs:** `role="dialog"`, `aria-modal`, and Escape-key handlers
- **Progress Indicators:** LoanRequest progress bar uses `role="progressbar"` with `aria-valuenow` and `aria-valuemax`
- **Keyboard Navigation:** FAQ accordion fully navigable via keyboard

### Trust & Security

- **Footer Trust Information:**
  - Current year copyright notice
  - Securities Exchange Commission (СЗХ) license number
  - Company establishment year
- **Legal Pages:**
  - Privacy Policy (`/privacy-policy`)
  - Terms of Service (`/terms`)
- **Admin Features:**
  - JWT-based authentication (Login component)
  - Configurable Google Maps URL for office location
  - Dashboard for managing loans, reports, and notifications

### User Experience

- **FAQ Section:** 6 questions with expandable answers on home page
- **Breadcrumb Navigation:** Product detail pages include breadcrumbs
- **Skeleton Screens:** Blog list displays loading placeholders
- **Form Auto-Save:** LoanRequest form state persisted to localStorage (sensitive fields excluded)
- **Form Validation:** Real-time `onBlur` validation with error messages and auto-scroll to first error
- **File Upload:** Drag-and-drop support with real-time compression progress
- **Loan & Investment Calculators:** Tools for calculating monthly payments and investment returns with disclaimers

## Environment Variables

Create a `.env` file in the `frontend/` directory:

```
VITE_API_URL=https://scm-okjs.onrender.com  # Backend API (dev: http://localhost:3000)
```

The app reads `VITE_API_URL` via `import.meta.env.VITE_API_URL` in `src/data/constants.js`.

## API Integration

The frontend communicates with the backend at `/api/` endpoints:

**Base URL:** `https://scm-okjs.onrender.com` (or `http://localhost:3000` in development)

### Common Endpoints

- `POST /api/auth/login` — User/admin login (returns JWT token)
- `POST /api/auth/register` — Customer registration
- `GET /api/cmsData` — Fetch product, blog, and governance data
- `POST /api/loans` — Submit loan application
- `POST /api/trusts` — Submit trust/investment request
- `GET /api/config` — Fetch app configuration (maps URL, etc.)

For full API documentation, see the backend repository.

## Dependencies

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^19.2.0 | UI library |
| `react-dom` | ^19.2.0 | React DOM renderer |
| `react-helmet-async` | ^2.0.5 | Meta tag management |
| `lucide-react` | ^0.562.0 | Icon library |
| `axios` | ^1.13.2 | HTTP client |
| `browser-image-compression` | ^2.0.2 | Image compression (client-side) |
| `xlsx` | ^0.18.5 | Excel file parsing |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `vite` | ^7.2.4 | Build tool & dev server |
| `@vitejs/plugin-react` | ^5.1.1 | React support in Vite |
| `tailwindcss` | ^3.4.17 | Utility-first CSS framework |
| `autoprefixer` | ^10.4.23 | CSS vendor prefixes |
| `postcss` | ^8.5.6 | CSS transformations |
| `eslint` | ^9.39.1 | Code linter |
| `eslint-plugin-react-hooks` | ^7.0.1 | React Hooks linting |
| `eslint-plugin-react-refresh` | ^0.4.24 | Fast Refresh linting |
| `vite-plugin-compression` | ^0.5.1 | Brotli/Gzip compression |

## Build Optimization

The Vite configuration (`vite.config.js`) implements:

1. **Code Splitting** — `manualChunks` strategy:
   - `vendor-react` — React libraries
   - `vendor-lucide` — Icon library
   - `vendor-seo` — react-helmet-async
   - `vendor-axios` — HTTP client
   - `vendor-imgcomp` — Image compression
   - `admin-bundle` — Admin-related components

2. **Compression** — Brotli and Gzip artifacts generated at build time

3. **History API Fallback** — SPA routing support in development

4. **Path Aliases** (for future use):
   - `@shared` → `../shared` (for monorepo shared code)

## Deployment

### Automatic Deployment (Vercel)

Every push to the `main` branch triggers automatic deployment to [www.scm.mn](https://www.scm.mn).

**Vercel Project Settings:**
- **Framework:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Environment Variables:** `VITE_API_URL` configured in Vercel dashboard

### Manual Deployment

If needed, deploy manually to Vercel:

```bash
npm run build
npx vercel --prod
```

## Common Tasks

### Add a New Page

1. Create `src/pages/MyNewPage.jsx`:
   ```jsx
   import { Helmet } from 'react-helmet-async';
   
   export default function MyNewPage() {
     return (
       <>
         <Helmet>
           <title>My New Page | SCM</title>
           <meta name="description" content="..." />
         </Helmet>
         <div>Page content</div>
       </>
     );
   }
   ```

2. Add route in `App.jsx`:
   ```jsx
   import MyNewPage from './pages/MyNewPage';
   // ... in render logic
   if (currentPage === 'my-new-page') return <MyNewPage />;
   ```

### Add a New Component

1. Create `src/components/MyComponent.jsx`
2. Import and use in parent component
3. If component is large, consider moving it to a separate file and lazy-loading it:
   ```jsx
   const MyLargeComponent = React.lazy(() => import('./components/MyLargeComponent'));
   ```

### Update Product Data

Edit `src/data/products.js` to modify product definitions, descriptions, or images.

### Update Blog Posts

Edit `src/data/blogPosts.js` to add, edit, or remove blog entries.

### Update Colors & Backgrounds

Edit `src/data/constants.js` to modify `SECTION_RAINBOW_COLORS`, `BACKGROUNDS`, or other constants.

## Troubleshooting

### Issue: Images not loading

- Check that image paths in `src/data/constants.js` match files in `public/` directory
- Verify `public/_redirects` is present for Vercel routing

### Issue: API errors (404, CORS)

- Verify `VITE_API_URL` environment variable is set correctly
- Check backend is running and accessible
- In development, ensure backend CORS policy allows requests from `localhost:5173`

### Issue: Build size is too large

- Run `npm run build` and check output — identify which vendor chunk is largest
- Consider splitting additional large components via `React.lazy()`
- Update `manualChunks` strategy in `vite.config.js`

### Issue: Admin panel loads slowly

- AdminPanel is lazy-loaded; initial load includes a network fetch. This is intentional for performance.
- Cache is preserved via AppContext; subsequent visits are fast

## Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Commit changes: `git commit -am 'feat: my new feature'`
3. Push to branch: `git push origin feature/my-feature`
4. Open a pull request on GitHub

### Code Style

- Follow the existing code style in the project
- Use Prettier-compatible formatting (2-space indentation)
- Run `npm run lint` before committing to catch issues
- Component names should be PascalCase
- Files should use camelCase (except `.jsx` extensions)

## License

Solongo Capital Management — All Rights Reserved.

## Support & Contact

For issues, feature requests, or questions:

- **Email:** [support@scm.mn](mailto:support@scm.mn)
- **Office:** See contact information on [www.scm.mn](https://www.scm.mn)
- **Internal Documentation:** Check backend repository for API specs

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history and release notes.
