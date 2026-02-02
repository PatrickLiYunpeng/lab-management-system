import { useState } from 'react';
import {
  InboxArrowDownIcon,
  PaperAirplaneIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import { HandoverPanel } from '../components/handovers/HandoverPanel';

type TabKey = 'incoming' | 'outgoing' | 'all';

const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'incoming', label: '待接收', icon: InboxArrowDownIcon },
  { key: 'outgoing', label: '我发起的', icon: PaperAirplaneIcon },
  { key: 'all', label: '全部交接', icon: ListBulletIcon },
];

export default function HandoversPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('incoming');

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b border-neutral-200 mb-4">
        <nav className="-mb-px flex gap-4" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <HandoverPanel mode={activeTab} />
    </div>
  );
}
