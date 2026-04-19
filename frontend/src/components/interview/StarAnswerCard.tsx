import type { StarAnswer } from '../../types';

interface Props {
    answer: StarAnswer | undefined;
}

export function StarAnswerCard({ answer }: Props) {
    if (!answer) {
        return (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4 text-center text-gray-500 italic">
                No answer generated for this question.
            </div>
        );
    }

    return (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-2">
                        <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded flex items-center justify-center">S</span>
                        Situation
                    </h4>
                    <p className="text-gray-700 text-sm">{answer.situation}</p>
                </div>
                
                <div>
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-2">
                        <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded flex items-center justify-center">T</span>
                        Task
                    </h4>
                    <p className="text-gray-700 text-sm">{answer.task}</p>
                </div>
                
                <div>
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-2">
                        <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded flex items-center justify-center">A</span>
                        Action
                    </h4>
                    <p className="text-gray-700 text-sm">{answer.action}</p>
                </div>
                
                <div>
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-2">
                        <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded flex items-center justify-center">R</span>
                        Result
                    </h4>
                    <p className="text-gray-700 text-sm">{answer.result}</p>
                </div>
            </div>

            {answer.talking_points?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">Key Talking Points</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-2">
                        {answer.talking_points.map((point, i) => (
                            <li key={i}>{point}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
