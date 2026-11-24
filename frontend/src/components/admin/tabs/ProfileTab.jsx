import ProfilePage from '../ProfilePage';

// Миний профайл.
// Extracted from AdminPanel.jsx without behaviour changes; outer state and handlers arrive as props.
export default function ProfileTab({ API_URL, user }) {
  return (
    <ProfilePage apiUrl={API_URL} user={user} />
  );
}
