import { Bot } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import BotContentPanel from '../BotContentPanel';

// Ботын агуулга (Prism Sky, cyan). Renders directly on the sky.
export default function BotContentTab({ API_URL }) {
  return <div className="adm-board space-y-4 md:space-y-5" style={{ '--hue': 'var(--sp-cyan)' }}>
    <PageHeader hue="cyan" icon={Bot} eyebrow="Чатбот" title="Ботын агуулга" description="Сайтын чатбот болон Messenger бот нэг агуулга ашиглана" />
    <BotContentPanel apiUrl={API_URL} />
  </div>;
}
