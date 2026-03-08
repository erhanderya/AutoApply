interface JobFiltersProps {
    search: string;
    workType: string;
    onSearchChange: (value: string) => void;
    onWorkTypeChange: (value: string) => void;
}

const workTypes = [
    { value: 'any', label: 'All Types' },
    { value: 'remote', label: 'Remote' },
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'onsite', label: 'On-site' },
];

export function JobFilters({ search, workType, onSearchChange, onWorkTypeChange }: JobFiltersProps) {
    return (
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
            {/* Search bar */}
            <div className="relative flex-1">
                <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search jobs by title or company..."
                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm
            focus:outline-none focus:ring-2 focus:ring-indigo/30 focus:border-indigo
            placeholder:text-gray-400 bg-white"
                />
            </div>

            {/* Work type filter chips */}
            <div className="flex gap-1.5 flex-wrap">
                {workTypes.map((wt) => (
                    <button
                        key={wt.value}
                        onClick={() => onWorkTypeChange(wt.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-200 cursor-pointer
              ${workType === wt.value
                                ? 'bg-indigo text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {wt.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
