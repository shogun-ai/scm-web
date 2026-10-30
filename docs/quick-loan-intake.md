# Quick loan intake

The public `frontend/` application uses a three-step form: contact details, loan needs, and optional documents plus consent. It creates a loan request, without creating a customer record.

## API and documents

`POST /api/loans/quick` accepts multipart data. Required fields are borrower type, applicant/contact name, phone, email, loan product, amount, term in months, repayment source, and consent. Organizations also provide an organization name.

Supported uploads are PDF, JPEG, PNG, and WEBP. Each file is limited to 10 MB, each submission to 12 files and 50 MB. Bank statements allow four files; other public document fields allow three. The backend validates file signatures before persisting documents. New request documents use authenticated Cloudinary delivery. The public response contains only an application reference.

Document fields: `file_id`, `file_address`, `file_social`, `file_bank`, `file_credit`, `file_car_photos`, and `file_prop_map`. Documents are optional at initial submission; staff determine what further material is needed.

## Request workflow

Administrators and directors manage assignment. Eligible assigned staff work from their request queue. Approval decisions use the existing committee permission matrix.

`returned` means additional material or correction is needed; `rejected` means a negative decision. Existing `resolved` retains its previous conditional-approval meaning. `closed` represents a closed case. This avoids changing the meaning of historical records.

The request screen shows document availability, saved bank statement and credit analyses, and automated reading status. AI assists extraction and analysis; staff retain responsibility for decisions. Automatic results must not overwrite concurrent staff edits.

## Release verification

Deploy the backend and frontend together: the new public form requires `/api/loans/quick`, and the staff queue requires `/api/loan-requests`. The production API fallback remains `https://scm-okjs.onrender.com`; use `VITE_API_URL` to override it.

Before release, run the frontend production build and targeted lint, backend syntax checks, `backend/loanIntake.test.js`, and relevant existing regression tests. Verify authenticated document delivery and AI processing in a controlled environment with approved sample documents. Unit tests use mocks and do not verify production MongoDB, Cloudinary, or OpenAI configuration.

Montserrat is served locally from `frontend/public/fonts/`, with its license included. No Google Fonts request is required.
