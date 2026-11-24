import { ScanText } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import GlassSheet from '../theme/GlassSheet';
import LoanResearch from '../../LoanResearch';

// Баримт AI уншилт (violet). Only the page chrome is restyled: the header sits on the sky and the AI document
// workbench (LoanResearch documentOnly → StatementWorkbench) renders unchanged inside a pearl sheet.
export default function DocumentAiTab({ API_URL }) {
  return <div className="adm-board space-y-4 md:space-y-5" style={{ '--hue': 'var(--sp-violet)' }}>
    <PageHeader hue="violet" icon={ScanText} eyebrow="Баримт AI" title="Баримтын AI уншилт" description="Дансны хуулга ба ЗМС лавлагааг уншиж, шинжилгээ гаргана" />
    <GlassSheet hue="violet">
      <LoanResearch apiUrl={API_URL} documentOnly />
    </GlassSheet>
  </div>;
}
