import React, { useState, useEffect } from 'react';
import { apiCall } from '../../api/api';
import {
  Users,
  UserPlus,
  Trash2,
  Edit,
  ChevronRight,
  ShieldAlert,
  PlusCircle,
  ArrowLeft,
} from 'lucide-react';
import { Group, Member, TemplateSummary, GroupTemplateInfo } from './types';

/**
 * Permission Groups (auth-service).
 *
 * Previously this tab called usage-tracking `/usage/groups` while template
 * assignment used `/auth/groups/:id/template` — two different databases, so
 * create/list and assign never shared IDs. All group CRUD now lives on auth.
 */
const GroupsTab: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [groupTemplate, setGroupTemplate] = useState<GroupTemplateInfo | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [editGroupName, setEditGroupName] = useState('');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberId, setNewMemberId] = useState('');
  const [isNewMemberAdmin, setIsNewMemberAdmin] = useState(false);
  const [assignTemplateId, setAssignTemplateId] = useState('');

  useEffect(() => {
    fetchGroups();
    fetchTemplates();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiCall({ endpoint: '/auth/groups', jwtToken: true });
      setGroups(res.message?.groups ?? []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load groups. Access denied or server error.');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await apiCall({ endpoint: '/auth/templates', jwtToken: true });
      setTemplates(res.message?.templates ?? []);
    } catch {
      // non-fatal
    }
  };

  const fetchMembers = async (groupId: string) => {
    try {
      const res = await apiCall({
        endpoint: `/auth/groups/${groupId}/members`,
        jwtToken: true,
      });
      setMembers(res.message?.members ?? []);
    } catch {
      setMembers([]);
    }
  };

  const fetchGroupTemplate = async (groupId: string) => {
    try {
      const res = await apiCall({
        endpoint: `/auth/groups/${groupId}/template`,
        jwtToken: true,
      });
      setGroupTemplate(res.message ?? null);
    } catch {
      setGroupTemplate(null);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await apiCall({
        endpoint: '/auth/groups',
        method: 'POST',
        body: { name: newGroupName.trim() },
        jwtToken: true,
      });
      setNewGroupName('');
      setShowCreateModal(false);
      fetchGroups();
    } catch (err: any) {
      setError(err?.message || 'Failed to create group');
    }
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup || !editGroupName.trim()) return;
    try {
      await apiCall({
        endpoint: `/auth/groups/${editingGroup.id}`,
        method: 'PUT',
        body: { name: editGroupName.trim() },
        jwtToken: true,
      });
      setEditingGroup(null);
      setEditGroupName('');
      setShowEditModal(false);
      fetchGroups();
    } catch (err: any) {
      setError(err?.message || 'Failed to update group');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm('Delete this group? This cannot be undone.')) return;
    try {
      await apiCall({
        endpoint: `/auth/groups/${groupId}`,
        method: 'DELETE',
        jwtToken: true,
      });
      if (selectedGroup?.id === groupId) setSelectedGroup(null);
      fetchGroups();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete group');
    }
  };

  const handleAddMember = async () => {
    if (!selectedGroup || !newMemberId.trim()) return;
    try {
      await apiCall({
        endpoint: `/auth/groups/${selectedGroup.id}/members`,
        method: 'POST',
        body: {
          user_id: newMemberId.trim(),
          is_group_admin: isNewMemberAdmin,
        },
        jwtToken: true,
      });
      setNewMemberId('');
      setIsNewMemberAdmin(false);
      setShowAddMemberModal(false);
      fetchMembers(selectedGroup.id);
    } catch (err: any) {
      setError(err?.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedGroup) return;
    try {
      await apiCall({
        endpoint: `/auth/groups/${selectedGroup.id}/members/${userId}`,
        method: 'DELETE',
        jwtToken: true,
      });
      fetchMembers(selectedGroup.id);
    } catch (err: any) {
      setError(err?.message || 'Failed to remove member');
    }
  };

  const handleAssignTemplate = async () => {
    if (!selectedGroup || !assignTemplateId) return;
    try {
      const res = await apiCall({
        endpoint: `/auth/groups/${selectedGroup.id}/template`,
        method: 'POST',
        body: { template_id: assignTemplateId },
        jwtToken: true,
      });
      const count = res.message?.recomputed_users ?? res.message?.recomputed_count ?? 0;
      setError(null);
      window.alert(`Template assigned. Recomputed ${count} user(s).`);
      setAssignTemplateId('');
      fetchGroupTemplate(selectedGroup.id);
    } catch (err: any) {
      setError(err?.message || 'Failed to assign template');
    }
  };

  const selectGroup = (group: Group) => {
    setSelectedGroup(group);
    setAssignTemplateId('');
    fetchMembers(group.id);
    fetchGroupTemplate(group.id);
  };

  if (loading && groups.length === 0) {
    return <div className="text-center py-10 text-gray-400">Loading groups...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          {selectedGroup && (
            <button
              onClick={() => setSelectedGroup(null)}
              className="p-2 hover:bg-gray-800 rounded-full"
              type="button"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h2 className="text-lg font-bold">
            {selectedGroup ? `Manage: ${selectedGroup.name}` : 'Permission Groups'}
          </h2>
        </div>
        {!selectedGroup && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg"
          >
            <PlusCircle size={18} /> Create Group
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-900/50 text-red-200 p-4 rounded-lg flex items-center gap-2">
          <ShieldAlert size={20} /> {error}
        </div>
      )}

      {!selectedGroup ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <div
              key={group.id}
              className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition-all group cursor-pointer"
              onClick={() => selectGroup(group)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-600/20 p-3 rounded-lg text-blue-400">
                  <Users size={24} />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingGroup(group);
                      setEditGroupName(group.name);
                      setShowEditModal(true);
                    }}
                    className="p-2 hover:bg-gray-800 text-gray-400 rounded-lg"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGroup(group.id);
                    }}
                    className="p-2 hover:bg-red-900/30 text-red-400 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-lg mb-1">{group.name}</h3>
              <p className="text-sm text-gray-500 mb-4">
                {group.is_auto_domain && group.domain
                  ? `Domain: ${group.domain}`
                  : 'Manual group'}
              </p>
              <div className="flex justify-between items-center text-xs text-gray-400 border-t border-gray-800 pt-4">
                <span>
                  Created{' '}
                  {group.created_at
                    ? new Date(group.created_at).toLocaleDateString()
                    : '—'}
                </span>
                <span className="flex items-center gap-1 text-blue-400 font-medium">
                  Manage <ChevronRight size={14} />
                </span>
              </div>
            </div>
          ))}
          {groups.length === 0 && <p className="text-gray-500">No groups yet.</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <h3 className="text-md font-bold mb-2">Permission Template</h3>
            <p className="text-sm text-gray-400 mb-4">
              Current:{' '}
              {groupTemplate?.template_name ? (
                <span className="text-blue-400 font-medium">
                  {groupTemplate.template_name}
                </span>
              ) : (
                <span className="text-gray-500">Unassigned</span>
              )}
            </p>
            <div className="flex gap-3">
              <select
                value={assignTemplateId}
                onChange={(e) => setAssignTemplateId(e.target.value)}
                className="flex-1 bg-black border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="">Select template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAssignTemplate}
                disabled={!assignTemplateId}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg"
              >
                Assign
              </button>
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">Members</h3>
                <p className="text-sm text-gray-400">{members.length} users</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMemberModal(true)}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm"
              >
                <UserPlus size={16} /> Add Member
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-black/20 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-6 py-4">User ID</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Joined</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {members.map((m) => (
                    <tr key={m.user_id} className="hover:bg-white/5">
                      <td className="px-6 py-4 font-mono text-sm">{m.user_id}</td>
                      <td className="px-6 py-4">
                        {m.is_group_admin ? (
                          <span className="bg-purple-900/30 text-purple-400 text-xs px-2 py-1 rounded border border-purple-800/50">
                            Admin
                          </span>
                        ) : (
                          <span className="bg-gray-800 text-gray-400 text-xs px-2 py-1 rounded">
                            Member
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {m.joined_at
                          ? new Date(m.joined_at).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(m.user_id)}
                          className="text-gray-500 hover:text-red-400 p-1"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Create New Group</h2>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="w-full bg-black border border-gray-700 rounded px-4 py-2 mb-4 focus:outline-none focus:border-blue-500"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateGroup}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Rename Group</h2>
            <input
              type="text"
              value={editGroupName}
              onChange={(e) => setEditGroupName(e.target.value)}
              className="w-full bg-black border border-gray-700 rounded px-4 py-2 mb-4 focus:outline-none focus:border-blue-500"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateGroup}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Add Member</h2>
            <input
              type="text"
              value={newMemberId}
              onChange={(e) => setNewMemberId(e.target.value)}
              placeholder="User UUID"
              className="w-full bg-black border border-gray-700 rounded px-4 py-2 mb-4 font-mono text-sm focus:outline-none focus:border-blue-500"
            />
            <label className="flex items-center gap-2 mb-4 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={isNewMemberAdmin}
                onChange={(e) => setIsNewMemberAdmin(e.target.checked)}
                className="w-4 h-4"
              />{' '}
              Grant Group Admin
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                className="flex-1 px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddMember}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupsTab;
