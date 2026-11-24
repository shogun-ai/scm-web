import FacebookStatusPanel from '../FacebookStatusPanel';

// Facebook холболт.
// Extracted from AdminPanel.jsx without behaviour changes; outer state and handlers arrive as props.
export default function FacebookTab({ API_URL }) {
  return (
    <FacebookStatusPanel apiUrl={API_URL} />
  );
}
