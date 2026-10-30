import PublicDocumentList from '../components/PublicDocumentList';
import { useAppContext } from '../context/AppContext';

export default function FinancialReportsPage() {
  const { navigateTo } = useAppContext();
  return <PublicDocumentList title="Санхүүгийн тайлангууд" category="report" onBack={() => navigateTo('home')} />;
}
