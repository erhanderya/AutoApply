import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { cvService } from '../services/cv.service';
import { useAuthStore } from '../store/authStore';
import type { CVData, User } from '../types';

const createEmptyCV = (): CVData => ({
    name: '',
    email: '',
    phone: '',
    summary: '',
    skills: [],
    languages: [],
    experience: [{ title: '', company: '', duration: '', description: '' }],
    education: [{ degree: '', school: '', year: '' }],
});

function syncUser(setUser: (user: User) => void, currentUser: User | null, partial: Partial<User>) {
    if (!currentUser) {
        return;
    }

    setUser({ ...currentUser, ...partial });
}

export function ProfilePage() {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const queryClient = useQueryClient();
    const currentUser = useAuthStore((state) => state.user);
    const setUser = useAuthStore((state) => state.setUser);
    const [draft, setDraft] = useState<CVData>(createEmptyCV());
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [parserInfo, setParserInfo] = useState<{ mode?: string | null; model?: string | null } | null>(null);

    const cvQuery = useQuery({
        queryKey: ['cv'],
        queryFn: () => cvService.getCV(),
        retry: false,
    });

    useEffect(() => {
        if (cvQuery.data) {
            setDraft({
                ...createEmptyCV(),
                ...cvQuery.data,
                skills: cvQuery.data.skills || [],
                languages: cvQuery.data.languages || [],
                experience: cvQuery.data.experience?.length ? cvQuery.data.experience : createEmptyCV().experience,
                education: cvQuery.data.education?.length ? cvQuery.data.education : createEmptyCV().education,
            });
            return;
        }

        if (cvQuery.data === null) {
            setDraft((previous) => ({
                ...createEmptyCV(),
                ...previous,
                email: previous.email || currentUser?.email || '',
            }));
        }
    }, [cvQuery.data, currentUser?.email]);

    const uploadMutation = useMutation({
        mutationFn: (file: File) => cvService.upload(file),
        onSuccess: (response) => {
            setUploadError(null);
            setParserInfo({ mode: response.parserMode, model: response.parserModel });
            setDraft({
                ...createEmptyCV(),
                ...response.parsed,
                skills: response.parsed.skills || [],
                languages: response.parsed.languages || [],
                experience: response.parsed.experience?.length ? response.parsed.experience : createEmptyCV().experience,
                education: response.parsed.education?.length ? response.parsed.education : createEmptyCV().education,
            });
            queryClient.setQueryData(['cv'], response.parsed);
            syncUser(setUser, currentUser, { cvParsed: true });
            void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
        },
        onError: () => {
            setUploadError('CV upload failed. Please try again with another file.');
            setParserInfo(null);
        },
    });

    const saveMutation = useMutation({
        mutationFn: (payload: CVData) => cvService.update(payload),
        onSuccess: (response) => {
            setDraft(response);
            queryClient.setQueryData(['cv'], response);
            syncUser(setUser, currentUser, { cvParsed: true });
            void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
        },
    });

    const stats = useMemo(
        () => [
            { label: 'Skills', value: draft.skills.length },
            { label: 'Experience', value: draft.experience.filter((item) => item.title || item.company).length },
            { label: 'Education', value: draft.education.filter((item) => item.degree || item.school).length },
        ],
        [draft.skills, draft.experience, draft.education]
    );

    const handleUpload = (file?: File) => {
        if (!file) {
            return;
        }
        setUploadError(null);
        uploadMutation.mutate(file);
    };

    const updateExperience = (index: number, key: 'title' | 'company' | 'duration' | 'description', value: string) => {
        setDraft((previous) => ({
            ...previous,
            experience: previous.experience.map((item, itemIndex) =>
                itemIndex === index ? { ...item, [key]: value } : item
            ),
        }));
    };

    const updateEducation = (index: number, key: 'degree' | 'school' | 'year', value: string) => {
        setDraft((previous) => ({
            ...previous,
            education: previous.education.map((item, itemIndex) =>
                itemIndex === index ? { ...item, [key]: value } : item
            ),
        }));
    };

    const removeExperience = (index: number) => {
        setDraft((previous) => ({
            ...previous,
            experience:
                previous.experience.length > 1
                    ? previous.experience.filter((_, itemIndex) => itemIndex !== index)
                    : createEmptyCV().experience,
        }));
    };

    const removeEducation = (index: number) => {
        setDraft((previous) => ({
            ...previous,
            education:
                previous.education.length > 1
                    ? previous.education.filter((_, itemIndex) => itemIndex !== index)
                    : createEmptyCV().education,
        }));
    };

    const hasCV = Boolean(currentUser?.cvParsed || cvQuery.data);

    return (
        <PageWrapper>
            <div className="grid gap-6 xl:grid-cols-[1.05fr_1.45fr]">
                <section className="space-y-6">
                    <div className="rounded-3xl bg-navy text-white p-6 shadow-sm relative overflow-hidden">
                        <div className="absolute inset-0 opacity-20">
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo rounded-full blur-3xl" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-violet rounded-full blur-3xl" />
                        </div>
                        <div className="relative">
                            <Badge variant={hasCV ? 'success' : 'warning'} className="mb-4">
                                {hasCV ? 'CV Ready' : 'CV Missing'}
                            </Badge>
                            <h2 className="text-2xl font-bold mb-2">Profile Workspace</h2>
                            <p className="text-sm text-white/80 mb-6">
                                Upload your resume, review the parsed output, and tweak it before the agents use it.
                            </p>

                            <div className="grid grid-cols-3 gap-3">
                                {stats.map((stat) => (
                                    <div key={stat.label} className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3">
                                        <p className="text-xl font-bold">{stat.value}</p>
                                        <p className="text-xs text-white/70">{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-navy">CV Upload</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Drag a PDF or DOCX here, or upload a fresh version manually.
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => fileInputRef.current?.click()}
                                loading={uploadMutation.isPending}
                            >
                                {hasCV ? 'Replace File' : 'Upload File'}
                            </Button>
                        </div>

                        <div
                            className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-8 text-center"
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => {
                                event.preventDefault();
                                handleUpload(event.dataTransfer.files?.[0]);
                            }}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.docx"
                                className="hidden"
                                onChange={(event) => handleUpload(event.target.files?.[0])}
                            />
                            <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-indigo/10 text-indigo flex items-center justify-center">
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            </div>
                            <p className="text-sm font-medium text-gray-700">Drop your resume here</p>
                            <p className="text-xs text-gray-500 mt-1">The parsed result will appear in the editor on the right.</p>
                        </div>

                        {uploadError && (
                            <div className="mt-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3">
                                {uploadError}
                            </div>
                        )}

                        {parserInfo?.mode && (
                            <div className="mt-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm px-4 py-3">
                                Parser mode: <strong>{parserInfo.mode}</strong>
                                {parserInfo.model ? ` | model: ${parserInfo.model}` : ''}
                            </div>
                        )}

                        {cvQuery.isLoading && (
                            <div className="mt-4 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 text-sm px-4 py-3">
                                Loading CV data...
                            </div>
                        )}
                    </div>
                </section>

                <section className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-start justify-between gap-4 mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-navy">Parsed CV Editor</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Review the parser output and save your corrections.
                            </p>
                        </div>
                        <Button type="button" onClick={() => saveMutation.mutate(draft)} loading={saveMutation.isPending}>
                            Save Changes
                        </Button>
                    </div>

                    <div className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                            <Input
                                label="Full Name"
                                value={draft.name}
                                onChange={(event) => setDraft((previous) => ({ ...previous, name: event.target.value }))}
                            />
                            <Input
                                label="Email"
                                value={draft.email}
                                onChange={(event) => setDraft((previous) => ({ ...previous, email: event.target.value }))}
                            />
                            <Input
                                label="Phone"
                                value={draft.phone || ''}
                                onChange={(event) => setDraft((previous) => ({ ...previous, phone: event.target.value }))}
                            />
                            <Input
                                label="Languages"
                                placeholder="English, Turkish"
                                value={(draft.languages || []).join(', ')}
                                onChange={(event) =>
                                    setDraft((previous) => ({
                                        ...previous,
                                        languages: event.target.value.split(',').map((item) => item.trim()).filter(Boolean),
                                    }))
                                }
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Professional Summary</label>
                            <textarea
                                value={draft.summary || ''}
                                onChange={(event) => setDraft((previous) => ({ ...previous, summary: event.target.value }))}
                                rows={4}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo/30 focus:border-indigo"
                                placeholder="Short, scannable career summary"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Skills</label>
                            <textarea
                                value={draft.skills.join(', ')}
                                onChange={(event) =>
                                    setDraft((previous) => ({
                                        ...previous,
                                        skills: event.target.value.split(',').map((item) => item.trim()).filter(Boolean),
                                    }))
                                }
                                rows={3}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo/30 focus:border-indigo"
                                placeholder="React, TypeScript, FastAPI, PostgreSQL"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold text-navy">Experience</h4>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() =>
                                        setDraft((previous) => ({
                                            ...previous,
                                            experience: [...previous.experience, { title: '', company: '', duration: '', description: '' }],
                                        }))
                                    }
                                >
                                    Add Experience
                                </Button>
                            </div>
                            <div className="space-y-4">
                                {draft.experience.map((item, index) => (
                                    <div key={`experience-${index}`} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                        <div className="grid md:grid-cols-2 gap-3 mb-3">
                                            <Input label="Title" value={item.title} onChange={(event) => updateExperience(index, 'title', event.target.value)} />
                                            <Input label="Company" value={item.company} onChange={(event) => updateExperience(index, 'company', event.target.value)} />
                                            <Input label="Duration" value={item.duration} onChange={(event) => updateExperience(index, 'duration', event.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-sm font-medium text-gray-700">Description</label>
                                            <textarea
                                                value={item.description || ''}
                                                onChange={(event) => updateExperience(index, 'description', event.target.value)}
                                                rows={3}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo/30 focus:border-indigo"
                                                placeholder="What did you build, improve, or own?"
                                            />
                                        </div>
                                        <div className="flex justify-end mt-3">
                                            <Button type="button" variant="ghost" size="sm" onClick={() => removeExperience(index)}>
                                                Remove
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold text-navy">Education</h4>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() =>
                                        setDraft((previous) => ({
                                            ...previous,
                                            education: [...previous.education, { degree: '', school: '', year: '' }],
                                        }))
                                    }
                                >
                                    Add Education
                                </Button>
                            </div>
                            <div className="space-y-4">
                                {draft.education.map((item, index) => (
                                    <div key={`education-${index}`} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                        <div className="grid md:grid-cols-3 gap-3">
                                            <Input label="Degree" value={item.degree} onChange={(event) => updateEducation(index, 'degree', event.target.value)} />
                                            <Input label="School" value={item.school} onChange={(event) => updateEducation(index, 'school', event.target.value)} />
                                            <Input label="Year" value={item.year} onChange={(event) => updateEducation(index, 'year', event.target.value)} />
                                        </div>
                                        <div className="flex justify-end mt-3">
                                            <Button type="button" variant="ghost" size="sm" onClick={() => removeEducation(index)}>
                                                Remove
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {saveMutation.isSuccess && (
                            <div className="rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3">
                                Profile CV saved successfully.
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </PageWrapper>
    );
}
