import { Settings2 } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import LoanTaskConfigEditor from '../../loanTask/LoanTaskConfigEditor';

// Хүсэлтийн маягт — зээлийн хүсэлтийн маягтын тохиргоо (Prism Sky, cyan). Renders directly on the sky.
export default function LoanTaskConfigTab({ API_URL }) {
  return <div className="adm-board space-y-4 md:space-y-5" style={{ '--hue': 'var(--sp-cyan)' }}>
    <PageHeader hue="cyan" icon={Settings2} eyebrow="Тохиргоо" title="Хүсэлтийн маягт" description="Бүтээгдэхүүн бүрийн нийтийн хүсэлтийн маягт, дэд хөтөлбөр, хуваарилалт" />
    <LoanTaskConfigEditor apiUrl={API_URL} />
  </div>;
}
