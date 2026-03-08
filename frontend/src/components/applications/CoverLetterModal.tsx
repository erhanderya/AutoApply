import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { Application } from '../../types';

interface CoverLetterModalProps {
    application: Application | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: string, text: string) => Promise<void>;
}

export function CoverLetterModal({ application, isOpen, onClose, onSave }: CoverLetterModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [text, setText] = useState('');
    const [saving, setSaving] = useState(false);

    const handleEdit = () => {
        setText(application?.coverLetterText || '');
        setIsEditing(true);
    };

    const handleSave = async () => {
        if (!application) return;
        setSaving(true);
        try {
            await onSave(application.id, text);
            setIsEditing(false);
        } finally {
            setSaving(false);
        }
    };

    const handleCopy = () => {
        const content = isEditing ? text : application?.coverLetterText || '';
        navigator.clipboard.writeText(content);
    };

    const handleClose = () => {
        setIsEditing(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Cover Letter">
            {application && (
                <div>
                    <div className="mb-4">
                        <p className="text-xs text-gray-500 mb-1">
                            {application.job.title} at {application.job.company}
                        </p>
                    </div>

                    {isEditing ? (
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="w-full h-64 p-3 text-sm border border-gray-300 rounded-lg resize-none
                focus:outline-none focus:ring-2 focus:ring-indigo/30 focus:border-indigo font-mono"
                        />
                    ) : (
                        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                            {application.coverLetterText || 'No cover letter generated yet.'}
                        </div>
                    )}

                    <div className="flex justify-between mt-4">
                        <Button variant="ghost" size="sm" onClick={handleCopy}>
                            📋 Copy
                        </Button>
                        <div className="flex gap-2">
                            {isEditing ? (
                                <>
                                    <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
                                        Cancel
                                    </Button>
                                    <Button size="sm" loading={saving} onClick={handleSave}>
                                        Save
                                    </Button>
                                </>
                            ) : (
                                <Button variant="secondary" size="sm" onClick={handleEdit}>
                                    ✏️ Edit
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    );
}
