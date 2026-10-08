# Changelog

All notable changes to the www.scm.mn frontend application are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-10-07

### Added

#### Performance Optimizations
- Enabled ESM tree-shaking for `lucide-react` by removing CommonJS alias
- Implemented code-splitting with `React.lazy()` for four heavy components:
  - `AdminPanel` (admin dashboard)
  - `LoanRequest` (loan application form)
  - `TrustRequest` (trust/investment product request)
  - `CustomerOnboarding` (KYC customer onboarding)
- Configured Vite `manualChunks` for optimal bundle splitting:
  - `vendor-react` — React + React-DOM
  - `vendor-lucide` — Lucide React icons
  - `vendor-seo` — react-helmet-async + dependencies
  - `vendor-axios` — HTTP client
  - `vendor-imgcomp` — browser-image-compression
  - `admin-bundle` — admin-related components
- Enabled Brotli + Gzip compression via `vite-plugin-compression` (`.br` and `.gz` artifacts)
- Added `loading="lazy"` attribute to 9 images for lazy-loading

#### Architecture & Code Organization
- Refactored `App.jsx` from 1601 lines to 510 lines (67% reduction)
- Created new directory structure:
  - `src/data/` — constants and static data (products, blog posts, backgrounds, colors)
  - `src/router/` — routing configuration
  - `src/hooks/` — reusable React hooks (`useScrolled`, `useCmsData`, `useRouting`)
  - `src/context/` — React Context for app-wide state (`AppContext`)
  - `src/sections/` — large page sections (Hero, About, Products, Blog, FAQ, Contact)
  - `src/pages/` — full page views (ProductDetail, Governance, FinancialReports, etc.)
- Introduced `AppContext` for sharing global state without prop drilling
- Extracted 14 new components and modules for better maintainability

#### SEO Improvements
- Added `react-helmet-async@2.0.5` for server-friendly meta tag management
- Implemented `<Helmet>` meta tags on:
  - Home page (title, description, OG images)
  - Each product detail page with product-specific metadata
  - Financial reports page
- Ensured proper `<title>`, `<meta name="description">`, and Open Graph tags (`og:title`, `og:description`, `og:image`, `og:url`) for social sharing

#### Accessibility (WCAG 2.1 AA)
- Improved text color contrast: changed primary green from `#00A651` to `#007A3D` (meeting AA standard)
- Updated 13 files, 58 total line changes for contrast compliance
- Added missing `alt` text to 8 images across components
- Enhanced mobile navigation menu:
  - Added `aria-label` and `aria-expanded` attributes
  - Implemented `aria-controls` for menu toggle button
- Implemented accessible progress bar in LoanRequest:
  - Added `role="progressbar"`, `aria-valuenow`, `aria-valuemax` attributes
- Modal accessibility improvements:
  - Added `role="dialog"` and `aria-modal="true"` attributes
  - Implemented Escape key handler for modal closure
- Alert/error message accessibility:
  - Added `role="alert"` and `aria-live="polite"` for dynamic error messages
- Implemented skip-to-content navigation link
- Added keyboard navigation support for FAQ accordion (`aria-expanded` state)

#### User Experience
- **FAQ Section**: Added 6 frequently asked questions to home page with expand/collapse animation
- **Breadcrumb Navigation**: Added breadcrumb trail on product detail pages
- **Skeleton Screens**: Implemented animated skeleton loaders in `BlogList` component (`animate-pulse`)
- **LoanRequest Auto-Save**: Implemented `localStorage` auto-save for form progress (excludes sensitive fields like ID and phone)
- **Form Validation**:
  - Added `onBlur` validation for LoanRequest form fields
  - Implemented auto-scroll to first validation error
  - Improved error message clarity and positioning
- **File Upload UX**:
  - Added drag-and-drop support
  - Implemented real-time image compression progress indicator
- **Trust Calculator**: New component for calculating investment returns
- **Trust Product Information**: Added detailed trust/investment product landing pages
- **Loan Calculator**: Existing calculator improvements with better UI/UX

#### Trust & Security Information
- **Footer Trust Strip**:
  - Added current year copyright notice
  - Displayed Securities Exchange Commission (СЗХ) license number
  - Added company establishment year
- **Footer Links**:
  - New "Privacy Policy" link (links to `/privacy-policy`)
  - New "Terms of Service" link (links to `/terms`)
- **Legal Pages**: Created `/privacy-policy` and `/terms` pages (Mongolian language)
- **Admin Dashboard**: Added configurable Google Maps URL in settings
- **Contact Section**: Implemented dynamic Google Maps URL loading from `cfg.maps_url`
- **Calculator Disclaimers**: Added disclosure text for loan and investment calculators

#### New Pages
- **404 Not Found Page** (`NotFoundPage.jsx`): Custom error page with navigation back to home
- **Privacy Policy Page** (`PrivacyPolicyPage.jsx`): Full privacy policy in Mongolian
- **Terms of Service Page** (`TermsPage.jsx`): Terms of service and conditions in Mongolian

### Fixed

#### Memory & Resource Leaks
- Fixed `URL.createObjectURL` memory leak by properly calling `URL.revokeObjectURL()` after use

#### Rendering & Navigation
- Fixed `ProductDetailPage` null reference crash when accessing product detail without valid product data
- Fixed stale state in home page: `selectedItem` and `selectedGovernance` now properly reset when navigating away
- Fixed silent API error swallowing — API errors now logged to console for better debugging
- Fixed FAQ accordion double-toggle issue with keyboard navigation
- Fixed breadcrumb "scroll to products" behavior on product detail page

#### Data & State
- Corrected broken character encoding in legacy data entries (via `hasBrokenEncoding` check)
- Fixed state isolation between different page/section views

### Changed

- Updated `package.json` dependencies:
  - Bumped `react` to `^19.2.0`
  - Bumped `react-dom` to `^19.2.0`
  - Bumped `vite` to `^7.2.4`
  - Bumped `tailwindcss` to `^3.4.17`
  - Bumped `autoprefixer` to `^10.4.23`
  - Bumped `lucide-react` to `^0.562.0`
- Refactored component imports to use relative paths within new structure (e.g., `./data/constants`, `./hooks/useScrolled`)
- Improved Vite configuration for better build performance and splitting strategy
- Enhanced ESLint configuration for React best practices

### Deprecated

- Direct import of constants from `App.jsx` — use `src/data/constants.js` instead
- Direct import of products and blog data — use `src/data/products.js` and `src/data/blogPosts.js` respectively

### Security

- No breaking security changes
- Maintained JWT authentication for admin and customer login flows
- All form inputs properly sanitized before API submission
- Environment variables for sensitive configuration (API URL, etc.) are properly isolated

### Notes

- This release focuses on performance, accessibility, and SEO without breaking changes to public API
- Large component lazy-loading will reduce Time to Interactive (TTI) on first page load
- Admin users should note the new lazy-loaded `AdminPanel` — initial dashboard load may have slight delay, but overall app performance improves
- All existing features remain fully functional; this is a non-breaking update
