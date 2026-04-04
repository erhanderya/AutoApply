import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { buildPreferencesPayload, normalizePreferences, normalizeTargetRoles } from '../lib/preferences';
import { preferencesService } from '../services/preferences.service';
import { scoutService } from '../services/scout.service';
import { useAuthStore } from '../store/authStore';
import type { Preferences, ScoutTaskStatus, WorkTypePreference } from '../types';


const roleSuggestions = [
    'Frontend Developer',
    'Backend Developer',
    'Full Stack Engineer',
    'Product Designer',
    'Data Analyst',
    'QA Engineer',
];

const workTypeOptions: { label: string; value: WorkTypePreference }[] = [
    { label: 'Remote', value: 'remote' },
    { label: 'Hybrid', value: 'hybrid' },
    { label: 'Onsite', value: 'onsite' },
];

const terminalStates = new Set(['SUCCESS', 'FAILURE', 'REVOKED']);

function createDraft(preferences?: Preferences) {
    const normalized = normalizePreferences(preferences);
    return {
        targetRoles: normalized.targetRoles,
        location: normalized.location || '',
        salaryExpectation: normalized.salaryExpectation ? String(normalized.salaryExpectation) : '',
        workType: normalized.workType || null,
    };
}

export function ScoutPage() {
    const queryClient = useQueryClient();
    const currentUser = useAuthStore((state) => state.user);
    const setUser = useAuthStore((state) => state.setUser);
    const [draft, setDraft] = useState(() => createDraft(currentUser?.preferences));
    const [roleInput, setRoleInput] = useState('');
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

    useEffect(() => {
        setDraft(createDraft(currentUser?.preferences));
    }, [currentUser?.preferences]);

    const preferencesPayload = useMemo(
        () =>
            buildPreferencesPayload({
                targetRoles: draft.targetRoles,
                location: draft.location,
                salaryExpectation: draft.salaryExpectation ? Number(draft.salaryExpectation) : undefined,
                workType: draft.workType,
            }),
        [draft]
    );

    const saveMutation = useMutation({
        mutationFn: (payload: Preferences) => preferencesService.update(payload),
        onSuccess: (savedPreferences) => {
            if (currentUser) {
                setUser({
                    ...currentUser,
                    preferences: normalizePreferences(savedPreferences),
                });
            }
            void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
        },
    });

    const triggerMutation = useMutation({
        mutationFn: () => scoutService.trigger(),
        onSuccess: (result) => {
            setActiveTaskId(result.taskId);
        },
    });

    const statusQuery = useQuery({
        queryKey: ['scout-status', activeTaskId],
        queryFn: () => scoutService.getStatus(activeTaskId as string),
        enabled: !!activeTaskId,
        refetchInterval: (query) => {
            const data = query.state.data as ScoutTaskStatus | undefined;
            if (!data) {
                return 2000;
            }
            return terminalStates.has(data.state) ? false : 2000;
        },
    });

    const addRole = (value: string) => {
        const [nextRole] = normalizeTargetRoles([value]);
        if (!nextRole) {
            return;
        }

        setDraft((previous) => ({
            ...previous,
            targetRoles: normalizeTargetRoles([...previous.targetRoles, nextRole]),
        }));
        setRoleInput('');
    };

    const removeRole = (role: string) => {
        setDraft((previous) => ({
            ...previous,
            targetRoles: previous.targetRoles.filter((item) => item !== role),
        }));
    };

    const savePreferences = async () => {
        await saveMutation.mutateAsync(preferencesPayload);
    };

    const handleManualTrigger = async () => {
        await savePreferences();
        await triggerMutation.mutateAsync();
    };

    const manualTriggerDisabled = draft.targetRoles.length === 0 || saveMutation.isPending || triggerMutation.isPending;
    const hasUnsavedChanges =
        JSON.stringify(preferencesPayload) !== JSON.stringify(normalizePreferences(currentUser?.preferences));

    return (
        <PageWrapper>
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <section className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-gray-200 bg-gradient-to-r from-navy via-indigo to-violet px-6 py-6 text-white">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <Badge variant="info" className="mb-3 bg-white/15 text-white">
                                    Scout Control Center
                                </Badge>
                                <h2 className="text-2xl font-bold">Job discovery that stays running</h2>
                                <p className="mt-2 max-w-2xl text-sm text-white/80">
                                    Save one or more target roles and Scout will queue a fresh scan every 5 minutes. You can also run it manually whenever you want.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 min-w-52">
                                <p className="text-xs uppercase tracking-[0.16em] text-white/60">Automatic trigger</p>
                                <p className="mt-2 text-lg font-semibold">Every 5 minutes</p>
                                <p className="mt-1 text-xs text-white/70">
                                    Active after you save at least one target role.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        <div>
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <div>
                                    <h3 className="text-lg font-semibold text-navy">Target roles</h3>
                                </div>
                                <Badge variant={draft.targetRoles.length ? 'success' : 'warning'}>
                                    {draft.targetRoles.length ? `${draft.targetRoles.length} selected` : 'Required for Scout'}
                                </Badge>
                            </div>

                            <div className="flex flex-col gap-3">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Input
                                        label="Add a role"
                                        placeholder="e.g. Frontend Developer"
                                        value={roleInput}
                                        onChange={(event) => setRoleInput(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                                event.preventDefault();
                                                addRole(roleInput);
                                            }
                                        }}
                                    />
                                    <div className="sm:pt-7">
                                        <Button type="button" onClick={() => addRole(roleInput)}>
                                            Add Role
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {roleSuggestions.map((role) => (
                                        <button
                                            key={role}
                                            type="button"
                                            onClick={() => addRole(role)}
                                            className="rounded-full border border-indigo/20 bg-indigo/5 px-3 py-1.5 text-sm text-indigo hover:bg-indigo/10 transition-colors cursor-pointer"
                                        >
                                            {role}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex flex-wrap gap-2 min-h-10">
                                    {draft.targetRoles.length > 0 ? (
                                        draft.targetRoles.map((role) => (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={() => removeRole(role)}
                                                className="inline-flex items-center gap-2 rounded-full bg-navy px-3 py-1.5 text-sm text-white cursor-pointer"
                                            >
                                                {role}
                                                <span className="text-white/70">×</span>
                                            </button>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-400">Henüz hedef rol eklenmedi.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <Input
                                label="Location"
                                placeholder="e.g. Istanbul, Berlin, London"
                                value={draft.location}
                                onChange={(event) => setDraft((previous) => ({ ...previous, location: event.target.value }))}
                            />
                            <Input
                                label="Salary expectation"
                                type="number"
                                min="0"
                                placeholder="e.g. 90000"
                                value={draft.salaryExpectation}
                                onChange={(event) =>
                                    setDraft((previous) => ({ ...previous, salaryExpectation: event.target.value }))
                                }
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700">Work type</h3>
                                    <p className="text-sm text-gray-500">You can leave it blank.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setDraft((previous) => ({ ...previous, workType: null }))}
                                    className="text-sm text-gray-500 hover:text-navy cursor-pointer"
                                >
                                    Clear
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {workTypeOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setDraft((previous) => ({
                                            ...previous,
                                            workType: previous.workType === option.value ? null : option.value,
                                        }))}
                                        className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                                            draft.workType === option.value
                                                ? 'bg-indigo text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                type="button"
                                variant={hasUnsavedChanges ? 'primary' : 'secondary'}
                                onClick={() => void savePreferences()}
                                loading={saveMutation.isPending}
                            >
                                Save Scout Filters
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => void handleManualTrigger()}
                                loading={triggerMutation.isPending}
                                disabled={manualTriggerDisabled}
                            >
                                Run Scout Now
                            </Button>
                        </div>

                        {(saveMutation.isSuccess || currentUser?.preferences?.targetRoles?.length) && (
                            <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                                Saved filters keep automatic Scout active every 5 minutes as long as at least one target role exists.
                            </div>
                        )}
                    </div>
                </section>

                <section className="space-y-6">
                    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-navy">Manual trigger</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Manual run uses the latest saved filters, and the button saves the draft first.
                                </p>
                            </div>
                            <Badge
                                variant={
                                    statusQuery.data?.state === 'SUCCESS'
                                        ? 'success'
                                        : statusQuery.data?.state === 'FAILURE'
                                            ? 'danger'
                                            : activeTaskId
                                                ? 'warning'
                                                : 'neutral'
                                }
                            >
                                {statusQuery.data?.state || 'Idle'}
                            </Badge>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="rounded-2xl bg-gray-50 px-4 py-3">
                                <p className="text-gray-500">Task ID</p>
                                <p className="mt-1 font-medium text-navy break-all">{activeTaskId || 'No run yet'}</p>
                            </div>
                            <div className="rounded-2xl bg-gray-50 px-4 py-3">
                                <p className="text-gray-500">Last result</p>
                                <p className="mt-1 font-medium text-navy">
                                    {statusQuery.data?.result || 'Scout sonucu burada görünecek.'}
                                </p>
                            </div>
                            {(saveMutation.error || triggerMutation.error || statusQuery.error) && (
                                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
                                    Scout action failed. Please verify your saved filters and backend worker status.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-navy mb-4">Current filter snapshot</h3>
                        <div className="space-y-4 text-sm">
                            <div>
                                <p className="text-gray-500 mb-2">Roles</p>
                                <div className="flex flex-wrap gap-2">
                                    {preferencesPayload.targetRoles.length ? (
                                        preferencesPayload.targetRoles.map((role) => (
                                            <Badge key={role} variant="info">{role}</Badge>
                                        ))
                                    ) : (
                                        <Badge>Not set</Badge>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-2xl bg-gray-50 px-4 py-3">
                                    <p className="text-gray-500">Location</p>
                                    <p className="mt-1 font-medium text-navy">{preferencesPayload.location || 'Not set'}</p>
                                </div>
                                <div className="rounded-2xl bg-gray-50 px-4 py-3">
                                    <p className="text-gray-500">Salary</p>
                                    <p className="mt-1 font-medium text-navy">
                                        {preferencesPayload.salaryExpectation
                                            ? `$${preferencesPayload.salaryExpectation.toLocaleString()}`
                                            : 'Not set'}
                                    </p>
                                </div>
                            </div>
                            <div className="rounded-2xl bg-gray-50 px-4 py-3">
                                <p className="text-gray-500">Work type</p>
                                <p className="mt-1 font-medium text-navy">
                                    {preferencesPayload.workType
                                        ? preferencesPayload.workType[0].toUpperCase() + preferencesPayload.workType.slice(1)
                                        : 'Not set'}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </PageWrapper>
    );
}
