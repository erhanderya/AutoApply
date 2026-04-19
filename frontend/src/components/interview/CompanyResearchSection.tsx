import type { CompanyResearch } from '../../types';

interface Props {
    research: CompanyResearch | null;
}

export function CompanyResearchSection({ research }: Props) {
    if (!research) return null;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-navy mb-4">Company Research</h2>
            
            <div className="space-y-6">
                <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Summary</h3>
                    <p className="text-gray-700 leading-relaxed">{research.company_summary}</p>
                </div>

                {research.culture_keywords?.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Culture & Values</h3>
                        <div className="flex flex-wrap gap-2">
                            {research.culture_keywords.map((keyword, i) => (
                                <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">
                                    {keyword}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {research.products_or_services?.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Products / Services</h3>
                            <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                                {research.products_or_services.map((item, i) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {research.recent_news?.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Recent News</h3>
                            <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                                {research.recent_news.map((item, i) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {research.sources?.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Sources</h3>
                        <div className="flex flex-wrap gap-3">
                            {research.sources.map((url, i) => (
                                <a
                                    key={i}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-indigo hover:text-indigo-dark hover:underline flex items-center gap-1"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                    Source {i + 1}
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
