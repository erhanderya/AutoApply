import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { buildPreferencesPayload, parseRolesText } from '../lib/preferences';
import { cvService } from '../services/cv.service';
import { preferencesService } from '../services/preferences.service';
import type { CVData, Preferences, WorkTypePreference } from '../types';

const preferencesSchema = z.object({
    targetRolesText: z.string().min(1, 'At least one target role is required'),
    location: z.string().optional(),
    salaryExpectation: z.number().optional(),
    workType: z.enum(['remote', 'hybrid', 'onsite', 'any']),
});

type PreferencesForm = z.infer<typeof preferencesSchema>;

export function OnboardingPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [cvData, setCvData] = useState<CVData | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<PreferencesForm>({
        resolver: zodResolver(preferencesSchema),
        defaultValues: {
            targetRolesText: '',
            location: '',
            workType: 'any',
        },
    });

    const formValues = watch();

    const savePrefsMutation = useMutation({
        mutationFn: (data: Preferences) => preferencesService.update(data),
        onSuccess: () => navigate('/scout'),
    });

    const handleFileUpload = useCallback(async (file: File) => {
        if (!file.name.match(/\.(pdf|docx)$/i)) {
            alert('Please upload a PDF or DOCX file.');
            return;
        }
        setUploading(true);
        setUploadProgress(0);

        const interval = setInterval(() => {
            setUploadProgress((p) => Math.min(p + 15, 90));
        }, 200);

        try {
            const result = await cvService.upload(file);
            clearInterval(interval);
            setUploadProgress(100);
            setCvData(result.parsed);
            setTimeout(() => setStep(2), 500);
        } catch {
            clearInterval(interval);
            alert('Failed to upload CV. Please try again.');
        } finally {
            setUploading(false);
        }
    }, []);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    };

    const onPreferencesSubmit = (_data: PreferencesForm) => {
        setStep(3);
    };

    const handleFinish = () => {
        const payload = buildPreferencesPayload({
            targetRoles: parseRolesText(formValues.targetRolesText),
            location: formValues.location,
            salaryExpectation: formValues.salaryExpectation,
            workType: formValues.workType as WorkTypePreference | 'any',
        });

        savePrefsMutation.mutate(payload);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                <div className="flex items-center justify-center gap-2 mb-8">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center gap-2">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors
                  ${step >= s ? 'bg-indigo text-white' : 'bg-gray-200 text-gray-500'}`}
                            >
                                {step > s ? 'OK' : s}
                            </div>
                            {s < 3 && (
                                <div className={`w-16 h-0.5 ${step > s ? 'bg-indigo' : 'bg-gray-200'}`} />
                            )}
                        </div>
                    ))}
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                    {step === 1 && (
                        <div>
                            <h2 className="text-2xl font-bold text-navy mb-2">Upload your CV</h2>
                            <p className="text-sm text-gray-500 mb-6">We'll parse your skills and experience to prepare Scout.</p>

                            <div
                                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                                onDragLeave={() => setDragActive(false)}
                                onDrop={handleDrop}
                                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors
                  ${dragActive ? 'border-indigo bg-indigo/5' : 'border-gray-300 hover:border-indigo/50'}`}
                            >
                                <div className="text-4xl mb-3">CV</div>
                                <p className="text-sm text-gray-600 mb-2">Drag & drop your CV here</p>
                                <p className="text-xs text-gray-400 mb-4">Supports PDF and DOCX</p>
                                <label className="cursor-pointer">
                                    <Button size="sm" variant="secondary" type="button">
                                        Browse Files
                                    </Button>
                                    <input
                                        type="file"
                                        accept=".pdf,.docx"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleFileUpload(file);
                                        }}
                                    />
                                </label>
                            </div>

                            {uploading && (
                                <div className="mt-4">
                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                        <span>Uploading...</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-indigo h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {cvData && (
                                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                                    <h4 className="text-sm font-semibold text-green-700 mb-2">CV Parsed Successfully</h4>
                                    <p className="text-sm text-gray-700 mb-2"><strong>Name:</strong> {cvData.name}</p>
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {cvData.skills.map((skill) => (
                                            <Badge key={skill} variant="info">{skill}</Badge>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500">{cvData.experience.length} experiences found</p>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleSubmit(onPreferencesSubmit)}>
                            <h2 className="text-2xl font-bold text-navy mb-2">Set Scout preferences</h2>
                            <p className="text-sm text-gray-500 mb-6">You can fine-tune these later from the Scout page.</p>

                            <div className="space-y-4">
                                <Input
                                    label="Target Roles"
                                    placeholder="e.g. Frontend Developer, React Engineer"
                                    error={errors.targetRolesText?.message}
                                    {...register('targetRolesText')}
                                />
                                <Input
                                    label="Location"
                                    placeholder="e.g. Istanbul, TR"
                                    {...register('location')}
                                />
                                <Input
                                    label="Salary Expectation (optional)"
                                    type="number"
                                    placeholder="90000"
                                    {...register('salaryExpectation', { valueAsNumber: true })}
                                />

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Work Type</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {(['remote', 'hybrid', 'onsite', 'any'] as const).map((wt) => (
                                            <button
                                                key={wt}
                                                type="button"
                                                onClick={() => setValue('workType', wt)}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer
                          ${formValues.workType === wt
                                                        ? 'bg-indigo text-white'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {wt === 'any' ? 'Skip for now' : wt.charAt(0).toUpperCase() + wt.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between mt-6">
                                <Button type="button" variant="secondary" onClick={() => setStep(1)}>Back</Button>
                                <Button type="submit">Continue</Button>
                            </div>
                        </form>
                    )}

                    {step === 3 && (
                        <div>
                            <h2 className="text-2xl font-bold text-navy mb-2">You're all set!</h2>
                            <p className="text-sm text-gray-500 mb-6">Review your settings and continue to Scout.</p>

                            <div className="space-y-3">
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Preferences</h4>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div><span className="text-gray-500">Target Roles:</span> <strong>{formValues.targetRolesText}</strong></div>
                                        <div><span className="text-gray-500">Location:</span> <strong>{formValues.location || 'Not set'}</strong></div>
                                        <div><span className="text-gray-500">Work Type:</span> <Badge variant="info">{formValues.workType === 'any' ? 'Not set' : formValues.workType}</Badge></div>
                                        {formValues.salaryExpectation && <div><span className="text-gray-500">Salary:</span> <strong>${formValues.salaryExpectation.toLocaleString()}</strong></div>}
                                    </div>
                                </div>

                                {cvData && (
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">CV Summary</h4>
                                        <p className="text-sm mb-1"><strong>{cvData.name}</strong></p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {cvData.skills.slice(0, 6).map((s) => (
                                                <Badge key={s} variant="info">{s}</Badge>
                                            ))}
                                            {cvData.skills.length > 6 && <Badge variant="neutral">+{cvData.skills.length - 6} more</Badge>}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between mt-6">
                                <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
                                <Button onClick={handleFinish} loading={savePrefsMutation.isPending}>
                                    Open Scout
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
