import PublicDocumentList from '../components/PublicDocumentList';
import { useAppContext } from '../context/AppContext';

export default function PoliciesPage() {
  const { navigateTo } = useAppContext();
  return <PublicDocumentList title="Байгууллагын бодлого журам" category="policy" onBack={() => navigateTo('home')} />;
}
