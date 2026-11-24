import AdminSettingsPanel from '../AdminSettingsPanel';

// Устгах тохиргоо.
// Extracted from AdminPanel.jsx without behaviour changes; outer state and handlers arrive as props.
export default function DeleteSettingsTab({ API_URL }) {
  return (
    <AdminSettingsPanel apiUrl={API_URL} />
  );
}
