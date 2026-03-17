import React, { useState, useEffect } from "react";
import { Users, UserPlus, Trash2, Edit, ChevronRight, Shield, ShieldAlert, PlusCircle, ArrowLeft } from "lucide-react";

interface Group {
  id: string;
  name: string;
  domain: string | null;
  is_auto_domain: boolean;
  created_at: string;
}

interface Member {
  user_id: string;
  is_group_admin: boolean;
  joined_at: string;
}

const GroupManagement: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [editGroupName, setEditGroupName] = useState("");
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberId, setNewMemberId] = useState("");
  const [isNewMemberAdmin, setIsNewMemberAdmin] = useState(false);

  const API_URL = "https://production.datambit.com";

  useEffect(() => {
    fetchGroups();
  }, []);

  const getAuthHeader = () => {
    const token = localStorage.getItem('jwtToken') ?? sessionStorage.getItem('jwtToken');
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  };

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/usage/groups`, {
        headers: getAuthHeader()
      });
      if (!response.ok) throw new Error("Failed to fetch groups");
      const data = await response.json();
      setGroups(data);
    } catch (err) {
      setError("Failed to load groups. Access denied or server error.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (groupId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/usage/groups/${groupId}/members`, {
        headers: getAuthHeader()
      });
      if (!response.ok) throw new Error("Failed to fetch members");
      const data = await response.json();
      setMembers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName) return;
    try {
      const response = await fetch(`${API_URL}/api/v1/usage/groups`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({ name: newGroupName })
      });
      if (response.ok) {
        setNewGroupName("");
        setShowCreateModal(false);
        fetchGroups();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup || !editGroupName) return;
    try {
      const response = await fetch(`${API_URL}/api/v1/usage/groups/${editingGroup.id}`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify({ name: editGroupName })
      });
      if (response.ok) {
        setEditingGroup(null);
        setEditGroupName("");
        setShowEditModal(false);
        fetchGroups();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm("Are you sure you want to delete this group? This action cannot be undone.")) return;
    try {
      const response = await fetch(`${API_URL}/api/v1/usage/groups/${groupId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      if (response.ok) {
        if (selectedGroup?.id === groupId) setSelectedGroup(null);
        fetchGroups();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMember = async () => {
    if (!selectedGroup || !newMemberId) return;
    try {
      const response = await fetch(`${API_URL}/api/v1/usage/groups/${selectedGroup.id}/members`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({ user_id: newMemberId, is_admin: isNewMemberAdmin })
      });
      if (response.ok) {
        setNewMemberId("");
        setIsNewMemberAdmin(false);
        setShowAddMemberModal(false);
        fetchMembers(selectedGroup.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedGroup) return;
    try {
      const response = await fetch(`${API_URL}/api/v1/usage/groups/${selectedGroup.id}/members/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      if (response.ok) {
        fetchMembers(selectedGroup.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectGroup = (group: Group) => {
    setSelectedGroup(group);
    fetchMembers(group.id);
  };

  if (loading && groups.length === 0) return <div className="text-center py-10">Loading management console...</div>;

  return (
    <div className="p-6 flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          {selectedGroup && (
            <button
              onClick={() => setSelectedGroup(null)}
              className="p-2 hover:bg-gray-800 rounded-full transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="text-blue-400" />
            {selectedGroup ? `Manage Group: ${selectedGroup.name}` : "Platform Group Management"}
          </h1>
        </div>
        {!selectedGroup && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
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
          {groups.map(group => (
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
                    onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                    className="p-2 hover:bg-red-900/30 text-red-400 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-lg mb-1">{group.name}</h3>
              <p className="text-sm text-gray-500 mb-4">
                {group.is_auto_domain ? `Domain: ${group.domain}` : "Manual Group"}
              </p>
              <div className="flex justify-between items-center text-xs text-gray-400 border-t border-gray-800 pt-4">
                <span>Created {new Date(group.created_at).toLocaleDateString()}</span>
                <span className="flex items-center gap-1 text-blue-400 font-medium">
                  Manage <ChevronRight size={14} />
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold">Members</h2>
                <p className="text-sm text-gray-400">{members.length} users in this group</p>
              </div>
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              >
                <UserPlus size={16} /> Add Member
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-black/20 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-6 py-4 font-bold">User ID</th>
                    <th className="px-6 py-4 font-bold">Role</th>
                    <th className="px-6 py-4 font-bold">Joined At</th>
                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {members.map(member => (
                    <tr key={member.user_id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-mono text-sm">{member.user_id}</td>
                      <td className="px-6 py-4">
                        {member.is_group_admin ? (
                          <span className="bg-purple-900/30 text-purple-400 text-xs px-2 py-1 rounded border border-purple-800/50">Admin</span>
                        ) : (
                          <span className="bg-gray-800 text-gray-400 text-xs px-2 py-1 rounded">Member</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {new Date(member.joined_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleRemoveMember(member.user_id)}
                          className="text-gray-500 hover:text-red-400 transition-colors p-1"
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

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Create New Group</h2>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 uppercase font-bold">Group Name</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="bg-black border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGroup}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-bold"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Rename Group</h2>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 uppercase font-bold">New Group Name</label>
                <input
                  type="text"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  placeholder="Enter new name..."
                  className="bg-black border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateGroup}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-bold"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Add Member to Group</h2>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 uppercase font-bold">User ID (UUID)</label>
                <input
                  type="text"
                  value={newMemberId}
                  onChange={(e) => setNewMemberId(e.target.value)}
                  placeholder="00000000-0000-0000-0000-000000000000"
                  className="bg-black border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-blue-500 font-mono text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isAdmin"
                  checked={isNewMemberAdmin}
                  onChange={(e) => setIsNewMemberAdmin(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-700 bg-black text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isAdmin" className="text-sm text-gray-300">Grant Group Admin permissions</label>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowAddMemberModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMember}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-bold"
                >
                  Add User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupManagement;
