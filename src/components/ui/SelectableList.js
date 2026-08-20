import React, { useState, useEffect } from 'react';

const AddCustomItemForm = ({ onSave, onCancel }) => {
    const [name, setName] = useState('');

    const handleSave = () => {
        if (name.trim()) {
            onSave(name.trim());
            setName('');
        }
    };

    return (
        <div className="mt-3 p-3 bg-blue-50 border border-dashed border-blue-200 rounded-md flex items-center gap-2">
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter new item name..."
                className="flex-grow p-2 border border-slate-300 rounded-md text-sm"
            />
            <button onClick={handleSave} className="bg-[var(--uctel-blue)] text-white font-semibold py-1 px-3 rounded-md text-sm">Add</button>
            <button onClick={onCancel} className="bg-slate-200 text-slate-700 py-1 px-3 rounded-md text-sm">Cancel</button>
        </div>
    );
};

const SelectableList = ({
    category,
    onToggle,
    onAddCustom,
    onEditItem,
    onRemoveItem,
    headerActions,
    footerContent
}) => {
    const [showCustomForm, setShowCustomForm] = useState(false);
    const [editingItemId, setEditingItemId] = useState(null);
    const [editingValue, setEditingValue] = useState('');

    useEffect(() => {
        setEditingItemId(null);
        setEditingValue('');
        setShowCustomForm(false);
    }, [category.id]);

    const handleEditStart = (item) => {
        setEditingItemId(item.id);
        setEditingValue(item.name);
    };

    const handleEditSave = () => {
        if (!editingValue.trim() || !onEditItem) {
            return;
        }
        onEditItem(category.id, editingItemId, editingValue.trim());
        setEditingItemId(null);
        setEditingValue('');
    };

    return (
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 md:col-span-2">
            <div className="flex flex-wrap justify-between items-start gap-2 mb-4">
                <h3 className="text-xl font-bold text-slate-800">{category.title}</h3>
                {headerActions}
            </div>
            <div className="space-y-3">
                {category.items.map(item => {
                    const isEditing = editingItemId === item.id;
                    const canEditItem = Boolean(onEditItem);
                    const canDeleteItem = Boolean(onRemoveItem);
                    return (
                        <div key={item.id} className="p-3 border rounded-md bg-white">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={item.selected} onChange={() => onToggle(category.id, item.id)} className="h-5 w-5 text-[var(--uctel-teal)] border-slate-300 rounded focus:ring-[var(--uctel-teal)]" />
                                <span className="flex-1 text-sm">{item.name}</span>
                            </label>
                            {(canEditItem || canDeleteItem) && (
                                <div className="flex gap-2 mt-3 justify-end">
                                    {canEditItem && (
                                        <button
                                            onClick={() => handleEditStart(item)}
                                            className="px-3 py-1 text-xs font-semibold border border-slate-300 rounded-md text-slate-600 hover:border-[var(--uctel-blue)] hover:text-[var(--uctel-blue)]"
                                        >
                                            Edit
                                        </button>
                                    )}
                                    {canDeleteItem && (
                                        <button
                                            onClick={() => {
                                                if (window.confirm('Remove this item?')) {
                                                    onRemoveItem(category.id, item.id);
                                                    if (isEditing) {
                                                        setEditingItemId(null);
                                                        setEditingValue('');
                                                    }
                                                }
                                            }}
                                            className="px-3 py-1 text-xs font-semibold border border-red-200 text-red-600 rounded-md hover:bg-red-50"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            )}
                            {isEditing && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <input
                                        type="text"
                                        value={editingValue}
                                        onChange={(e) => setEditingValue(e.target.value)}
                                        className="flex-1 min-w-[180px] p-2 border border-slate-300 rounded-md text-sm"
                                    />
                                    <button onClick={handleEditSave} className="bg-[var(--uctel-teal)] text-white text-xs font-semibold px-3 py-1 rounded-md">Save</button>
                                    <button onClick={() => { setEditingItemId(null); setEditingValue(''); }} className="text-xs px-3 py-1 border border-slate-300 rounded-md">Cancel</button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {footerContent}
            <div className="mt-4 pt-4 border-t border-slate-200">
                {!showCustomForm ? ( <button onClick={() => setShowCustomForm(true)} className="w-full bg-blue-100 text-[var(--uctel-blue)] font-semibold py-2 px-4 rounded-lg hover:bg-blue-200 transition-colors text-sm"> + Add Custom Item </button> ) : ( <AddCustomItemForm onSave={(itemName) => { onAddCustom(category.id, itemName); setShowCustomForm(false); }} onCancel={() => setShowCustomForm(false)} /> )}
            </div>
        </div>
    );
};

export default SelectableList;