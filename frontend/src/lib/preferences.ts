import type { Preferences, WorkTypePreference } from '../types';


const WORK_TYPES: WorkTypePreference[] = ['remote', 'hybrid', 'onsite'];


export function normalizeTargetRoles(value: unknown): string[] {
    const items = Array.isArray(value)
        ? value
        : typeof value === 'string'
            ? value.split(',')
            : [];

    const uniqueRoles: string[] = [];
    const seen = new Set<string>();

    items.forEach((item) => {
        const role = String(item).trim();
        if (!role) {
            return;
        }

        const normalized = role.toLowerCase();
        if (seen.has(normalized)) {
            return;
        }

        seen.add(normalized);
        uniqueRoles.push(role);
    });

    return uniqueRoles;
}

export function parseRolesText(value: string): string[] {
    return normalizeTargetRoles(value.split(','));
}

export function normalizePreferences(input: unknown): Preferences {
    if (!input || typeof input !== 'object') {
        return { targetRoles: [] };
    }

    const raw = input as Record<string, unknown>;
    const workType = typeof raw.workType === 'string' && WORK_TYPES.includes(raw.workType as WorkTypePreference)
        ? (raw.workType as WorkTypePreference)
        : undefined;

    const location = typeof raw.location === 'string' ? raw.location.trim() : '';
    const salaryExpectationSource =
        typeof raw.salaryExpectation === 'number'
            ? raw.salaryExpectation
            : typeof raw.salaryMin === 'number'
                ? raw.salaryMin
                : undefined;

    const targetRoles = normalizeTargetRoles(raw.targetRoles ?? raw.targetRole);

    return {
        targetRoles,
        ...(location ? { location } : {}),
        ...(typeof salaryExpectationSource === 'number' && Number.isFinite(salaryExpectationSource)
            ? { salaryExpectation: salaryExpectationSource }
            : {}),
        ...(workType ? { workType } : {}),
    };
}

export function buildPreferencesPayload(input: {
    targetRoles: string[];
    location?: string;
    salaryExpectation?: number | null;
    workType?: WorkTypePreference | 'any' | null;
}): Preferences {
    const payload: Preferences = {
        targetRoles: normalizeTargetRoles(input.targetRoles),
    };

    const location = input.location?.trim();
    if (location) {
        payload.location = location;
    }

    if (typeof input.salaryExpectation === 'number' && Number.isFinite(input.salaryExpectation)) {
        payload.salaryExpectation = input.salaryExpectation;
    }

    if (input.workType && input.workType !== 'any') {
        payload.workType = input.workType;
    }

    return payload;
}
