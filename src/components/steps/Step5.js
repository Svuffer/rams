// [SEC 100] Imports & category sub-components
// SEC 100  Imports & category sub-components   BooleanWithTextCategory · TextAreaCategory · AddNewCategoryForm
// SEC 200  Step5 component                     state init · edit helpers · renderCategoryEditForm · renderHeaderActions
// SEC 300  JSX render                          category list (switch on type) · add category footer
import React, { useState } from 'react';
import SelectableList from '../ui/SelectableList';
import { TextArea } from '../ui/FormControls';

const BooleanWithTextCategory = ({ category, onChange, headerActions, footerContent }) => (
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 md:col-span-2">
        <div className="flex flex-wrap justify-between items-start gap-2 mb-4">
            <h3 className="text-xl font-bold text-slate-800">{category.title}</h3>
            {headerActions}
        </div>
        <div className="flex items-center gap-6 mb-4">
            <p>{category.question}</p>
            <label className="flex items-center gap-2">
                <input type="radio" name={category.id} checked={category.enabled} onChange={() => onChange(category.id, 'enabled', true)} className="h-4 w-4 text-[var(--uctel-teal)]"/> Yes
            </label>
            <label className="flex items-center gap-2">
                <input type="radio" name={category.id} checked={!category.enabled} onChange={() => onChange(category.id, 'enabled', false)} className="h-4 w-4 text-[var(--uctel-teal)]"/> No
            </label>
        </div>
        <TextArea 
            label="Details" 
            name={`${category.id}-details`} 
            value={category.details} 
            onChange={(e) => onChange(category.id, 'details', e.target.value)} 
            rows={3} 
        />
        {footerContent}
    </div>
);

const TextAreaCategory = ({ category, onChange, headerActions, footerContent }) => (
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 md:col-span-2">
        <div className="flex flex-wrap justify-between items-start gap-2 mb-4">
            <h3 className="text-xl font-bold text-slate-800">{category.title}</h3>
            {headerActions}
        </div>
        <TextArea 
            label="Details" 
            name={`${category.id}-details`} 
            value={category.details} 
            onChange={(e) => onChange(category.id, 'details', e.target.value)} 
            rows={4} 
        />
        {footerContent}
    </div>
);

const AddNewCategoryForm = ({ onSave, onCancel }) => {
    const [title, setTitle] = useState('');
    const [type, setType] = useState('textArea');

    const handleSave = () => {
        if (!title.trim()) {
            alert('Please enter a title for the new category.');
            return;
        }
        onSave({ title, type });
    };

    return (
        <div className="mt-6 p-4 bg-green-50 border-2 border-dashed border-green-300 rounded-lg space-y-3">
            <h4 className="font-bold text-slate-800">Add New Logistics Category</h4>
            <input
                type="text"
                placeholder="Category Title (e.g., 'Site Access Details')"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-md text-sm"
            />
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md text-sm">
                <option value="textArea">Text Area (for notes)</option>
                <option value="selectableList">Selectable List (like Permits)</option>
            </select>
            <div className="flex gap-2 pt-2">
                <button onClick={handleSave} className="bg-green-600 text-white font-semibold py-1 px-3 rounded-md text-sm">Save Category</button>
                <button onClick={onCancel} className="bg-slate-200 text-slate-700 py-1 px-3 rounded-md text-sm">Cancel</button>
            </div>
        </div>
    );
};
// [SEC 100 END]

// [SEC 200] Step5 component
const Step5 = ({ data, handlers }) => {
    const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
    const [categoryEditState, setCategoryEditState] = useState(null);

    const startCategoryEdit = (category) => {
        setCategoryEditState({
            id: category.id,
            title: category.title,
            question: category.question || '',
            type: category.type
        });
    };

    const cancelCategoryEdit = () => setCategoryEditState(null);

    const saveCategoryEdit = () => {
        if (!categoryEditState || !categoryEditState.title.trim()) {
            alert('Category title cannot be empty.');
            return;
        }
        const updates = { title: categoryEditState.title.trim() };
        if (categoryEditState.type === 'booleanWithText') {
            updates.question = categoryEditState.question;
        }
        handlers.handleEditSafetyCategory(categoryEditState.id, updates);
        setCategoryEditState(null);
    };

    const renderCategoryEditForm = (category) => {
        if (!categoryEditState || categoryEditState.id !== category.id) {
            return null;
        }
        return (
            <div className="mt-3 p-3 bg-white border border-dashed border-slate-300 rounded-md space-y-2">
                <input
                    type="text"
                    value={categoryEditState.title}
                    onChange={(e) => setCategoryEditState((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-md text-sm"
                    placeholder="Category title"
                />
                {category.type === 'booleanWithText' && (
                    <input
                        type="text"
                        value={categoryEditState.question}
                        onChange={(e) => setCategoryEditState((prev) => ({ ...prev, question: e.target.value }))}
                        className="w-full p-2 border border-slate-300 rounded-md text-sm"
                        placeholder="Category question"
                    />
                )}
                <div className="flex gap-2">
                    <button onClick={saveCategoryEdit} className="bg-[var(--uctel-teal)] text-white font-semibold py-1 px-3 rounded-md text-sm">Save Changes</button>
                    <button onClick={cancelCategoryEdit} className="bg-slate-200 text-slate-700 py-1 px-3 rounded-md text-sm">Cancel</button>
                </div>
            </div>
        );
    };

    const renderHeaderActions = (category) => (
        <div className="flex gap-2 flex-wrap">
            <button
                onClick={() => startCategoryEdit(category)}
                className="px-3 py-1 text-xs font-semibold border border-slate-300 rounded-md text-slate-600 hover:border-[var(--uctel-blue)] hover:text-[var(--uctel-blue)]"
            >
                Edit
            </button>
            <button
                onClick={() => {
                    if (window.confirm('Remove this category? This cannot be undone.')) {
                        handlers.handleDeleteSafetyCategory(category.id);
                        cancelCategoryEdit();
                    }
                }}
                className="px-3 py-1 text-xs font-semibold border border-red-200 text-red-600 rounded-md hover:bg-red-50"
            >
                Delete
            </button>
        </div>
    );
// [SEC 200 END]

// [SEC 300] JSX render
    return (
        <div>
            <h2 className="text-2xl font-bold text-[var(--uctel-blue)] border-b-2 border-[var(--uctel-orange)] pb-2 mb-6">Step 5: Safety & Logistics</h2>
            <div className="space-y-8">
                {data.safetyLogistics.map(category => {
                    switch (category.type) {
                        case 'selectableList':
                            return (
                                <div key={category.id} className="space-y-2">
                                    <SelectableList 
                                        category={category} 
                                        onToggle={handlers.handleSafetyListItemToggle} 
                                        onAddCustom={handlers.handleAddCustomSafetyItem} 
                                        onEditItem={handlers.handleEditSafetyListItem}
                                        onRemoveItem={handlers.handleRemoveSafetyListItem}
                                        headerActions={renderHeaderActions(category)}
                                        footerContent={renderCategoryEditForm(category)}
                                    />
                                    {category.id === 'permits' && (
                                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                            <label className="block text-sm font-medium text-blue-800 mb-2">
                                                Permits Details (Optional)
                                            </label>
                                            <textarea
                                                value={data.permitsDetails || ''}
                                                onChange={(e) => handlers.handleInputChange({ target: { name: 'permitsDetails', value: e.target.value } })}
                                                placeholder="Add site-specific details about where/how permits are obtained..."
                                                rows={3}
                                                className="w-full p-2 border border-blue-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        case 'booleanWithText':
                            return (
                                <BooleanWithTextCategory
                                    key={category.id}
                                    category={category}
                                    onChange={handlers.handleSafetyLogisticsChange}
                                    headerActions={renderHeaderActions(category)}
                                    footerContent={renderCategoryEditForm(category)}
                                />
                            );
                        case 'textArea':
                            return (
                                <TextAreaCategory
                                    key={category.id}
                                    category={category}
                                    onChange={handlers.handleSafetyLogisticsChange}
                                    headerActions={renderHeaderActions(category)}
                                    footerContent={renderCategoryEditForm(category)}
                                />
                            );
                        default:
                            return null;
                    }
                })}
            </div>

            <div className="mt-8 pt-4 border-t border-slate-200">
                {!showNewCategoryForm ? (
                    <button onClick={() => setShowNewCategoryForm(true)} className="w-full bg-green-100 text-green-800 font-semibold py-2 px-4 rounded-lg hover:bg-green-200 transition-colors text-sm">
                        + Add New Logistics Category
                    </button>
                ) : (
                    <AddNewCategoryForm 
                        onSave={(newCategory) => { handlers.handleAddNewSafetyCategory(newCategory); setShowNewCategoryForm(false); }}
                        onCancel={() => setShowNewCategoryForm(false)}
                    />
                )}
            </div>
        </div>
    );
};

export default Step5;
// [SEC 300 END]