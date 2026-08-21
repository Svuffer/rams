import React, { useState } from 'react';
import FormSection from '../ui/FormSection';

const EditTeamMemberForm = ({ member, onSave, onCancel }) => {
    const [name, setName] = useState(member.name || '');
    const [role, setRole] = useState(member.role || '');
    const [phone, setPhone] = useState(member.phone || '');
    const [email, setEmail] = useState(member.email || '');

    const handleSave = () => {
        if (!name.trim()) {
            alert('Please provide a name.');
            return;
        }
        onSave({ name: name.trim(), role: role.trim(), phone: phone.trim(), email: email.trim() });
    };

    return (
        <div className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded-md space-y-2">
            <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md text-sm" />
            <input type="text" placeholder="Role" value={role} onChange={(e) => setRole(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md text-sm" />
            <input type="text" placeholder="Telephone" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md text-sm" />
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md text-sm" />
            <div className="flex gap-2">
                <button onClick={handleSave} className="bg-[var(--uctel-teal)] text-white font-semibold py-1 px-3 rounded-md text-sm">Save</button>
                <button onClick={onCancel} className="bg-slate-200 text-slate-700 py-1 px-3 rounded-md text-sm">Cancel</button>
            </div>
        </div>
    );
};

const Step2 = ({
    data, onChange, onAdd, onRemove, dbTeamMembers, onSelectMember, onToggleSignoff,
    showManageTeamMembers, onToggleManageTeamMembers, onDeleteGlobalMember, onEditGlobalMember,
}) => {
    const [editingMemberId, setEditingMemberId] = useState(null);

    return (
    <div>
        <FormSection title="Step 2: Project Team" gridCols={1}>
            <p className="text-slate-600 md:col-span-1 -mt-4 mb-2">List the key personnel involved in this project.</p>
            <div className="mb-4">
                <div className="flex items-end gap-2">
                    <div className="flex-grow">
                        <label className="text-sm font-semibold text-slate-600">Add Existing Team Member</label>
                        <select onChange={(e) => { if (e.target.value) { onSelectMember(e.target.value); e.target.value = ''; } }} className="w-full mt-1 p-2 border border-slate-300 rounded-md">
                            <option value="">Select a team member...</option>
                            {dbTeamMembers.map(member => (
                                <option key={member.id} value={member.id}>{member.name} - {member.role}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        type="button"
                        onClick={onToggleManageTeamMembers}
                        className="px-4 py-2 text-sm font-semibold text-[var(--uctel-blue)] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap"
                    >
                        {showManageTeamMembers ? 'Close' : 'Manage Team Members'}
                    </button>
                </div>

                {showManageTeamMembers && (
                    <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                        <p className="text-xs text-slate-500 mb-2">
                            This edits or permanently deletes people from the company-wide team list, used across every RAMS document -- not just this one.
                            To remove someone from just this document, use the &times; button on their card below instead.
                        </p>
                        {dbTeamMembers.length === 0 && (
                            <p className="text-sm text-slate-500">No team members in the company list yet.</p>
                        )}
                        {dbTeamMembers.map(member => (
                            <div key={member.id} className="p-3 border rounded-md bg-white">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm">{member.name || '(no name)'} {member.role ? `- ${member.role}` : ''}</span>
                                    <div className="flex gap-2 shrink-0">
                                        <button
                                            onClick={() => setEditingMemberId(editingMemberId === member.id ? null : member.id)}
                                            className="px-3 py-1 text-xs font-semibold border border-slate-300 rounded-md text-slate-600 hover:border-[var(--uctel-blue)] hover:text-[var(--uctel-blue)]"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => onDeleteGlobalMember(member.id)}
                                            className="px-3 py-1 text-xs font-semibold border border-red-200 text-red-600 rounded-md hover:bg-red-50"
                                        >
                                            Delete Permanently
                                        </button>
                                    </div>
                                </div>
                                {editingMemberId === member.id && (
                                    <EditTeamMemberForm
                                        member={member}
                                        onSave={(updates) => { onEditGlobalMember(member.id, updates); setEditingMemberId(null); }}
                                        onCancel={() => setEditingMemberId(null)}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="space-y-4">
                {data.projectTeam.map((member, index) => (
                    <div key={member.id} className="grid grid-cols-1 md:grid-cols-8 gap-4 p-4 border rounded-lg bg-slate-50 relative">
                        <div className="md:col-span-3">
                            <label className="text-sm font-semibold text-slate-600">Name</label>
                            <input type="text" value={member.name} onChange={(e) => onChange(index, 'name', e.target.value)} className="w-full mt-1 p-2 border border-slate-300 rounded-md" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-sm font-semibold text-slate-600">Role</label>
                            <input type="text" value={member.role} onChange={(e) => onChange(index, 'role', e.target.value)} className="w-full mt-1 p-2 border border-slate-300 rounded-md" />
                        </div>
                        <div className="md:col-span-3">
                            <label className="text-sm font-semibold text-slate-600">Competencies</label>
                            <textarea value={member.competencies} onChange={(e) => onChange(index, 'competencies', e.target.value)} className="w-full mt-1 p-2 border border-slate-300 rounded-md" rows="2" />
                        </div>
                        <div className="md:col-span-3">
                            <label className="text-sm font-semibold text-slate-600">Telephone</label>
                            <input type="text" value={member.phone} onChange={(e) => onChange(index, 'phone', e.target.value)} className="w-full mt-1 p-2 border border-slate-300 rounded-md" />
                        </div>
                        <div className="md:col-span-3">
                            <label className="text-sm font-semibold text-slate-600">Email</label>
                            <input type="email" value={member.email || ''} onChange={(e) => onChange(index, 'email', e.target.value)} className="w-full mt-1 p-2 border border-slate-300 rounded-md" />
                        </div>
                        <div className="md:col-span-2 flex items-end pb-2">
                            <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-600">
                                <input
                                    type="checkbox"
                                    checked={Boolean(member.requiresSignOff)}
                                    onChange={() => onToggleSignoff(index)}
                                    className="h-5 w-5 text-[var(--uctel-teal)] border-slate-300 rounded focus:ring-[var(--uctel-teal)]"
                                />
                                Requires sign-off
                            </label>
                        </div>
                        <button onClick={() => onRemove(index)} title="Remove from this document only -- does not affect the company team list" className="absolute -top-2 -right-2 bg-red-500 text-white h-6 w-6 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">&times;</button>
                    </div>
                ))}
            </div>
            <button onClick={onAdd} className="mt-4 bg-blue-100 text-[var(--uctel-blue)] font-semibold py-2 px-4 rounded-lg hover:bg-blue-200 transition-colors text-sm">
                + Add New Team Member
            </button>
        </FormSection>
    </div>
    );
};

export default Step2;
