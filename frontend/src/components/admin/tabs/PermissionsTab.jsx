import TaskPermissionMatrix from '../TaskPermissionMatrix';

// Эрхийн матриц.
// Extracted from AdminPanel.jsx without behaviour changes; outer state and handlers arrive as props.
export default function PermissionsTab({ API_URL }) {
  return (
    <TaskPermissionMatrix apiUrl={API_URL} />
  );
}
