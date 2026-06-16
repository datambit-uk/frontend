import React, { useState } from 'react';
import { Shield, Users, SlidersHorizontal, UserCog, KeyRound } from 'lucide-react';
import GroupsTab from '../components/admin/GroupsTab';
import TemplatesTab from '../components/admin/TemplatesTab';
import UsersTab from '../components/admin/UsersTab';
import AccessTab from '../components/admin/AccessTab';

type TabKey = 'groups' | 'templates' | 'users' | 'access';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'groups', label: 'Groups', icon: <Users size={16} /> },
  { key: 'templates', label: 'Templates', icon: <SlidersHorizontal size={16} /> },
  { key: 'users', label: 'Users', icon: <UserCog size={16} /> },
  { key: 'access', label: 'Access', icon: <KeyRound size={16} /> },
];

const AdminConsole: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('groups');

  return (
    <div className="p-6 flex flex-col gap-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Shield className="text-blue-400" /> Admin Console
      </h1>

      <div className="flex gap-2 border-b border-gray-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'groups' && <GroupsTab />}
      {tab === 'templates' && <TemplatesTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'access' && <AccessTab />}
    </div>
  );
};

export default AdminConsole;
