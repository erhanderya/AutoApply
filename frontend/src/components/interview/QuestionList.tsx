import { useState } from 'react';
import type { InterviewQuestion, StarAnswer } from '../../types';
import { StarAnswerCard } from './StarAnswerCard';

interface Props {
    questions: InterviewQuestion[];
    answers: StarAnswer[];
}

export function QuestionList({ questions, answers }: Props) {
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const toggle = (id: number) => {
        setExpandedId(prev => (prev === id ? null : id));
    };

    const getCategoryStyle = (category: string) => {
        switch (category) {
            case 'behavioral': return 'bg-blue-100 text-blue-800';
            case 'technical': return 'bg-purple-100 text-purple-800';
            case 'culture_fit': return 'bg-pink-100 text-pink-800';
            case 'role_specific': return 'bg-emerald-100 text-emerald-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatCategory = (category: string) => {
        return category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    if (!questions?.length) return null;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-navy mb-6">Generated Questions & STAR Answers</h2>
            
            <div className="space-y-4">
                {questions.map((q) => {
                    const answer = answers.find(a => a.question_id === q.id);
                    const isExpanded = expandedId === q.id;

                    return (
                        <div 
                            key={q.id}
                            className={`border rounded-lg transition-colors duration-200 ${isExpanded ? 'border-indigo shadow-md' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                            <button
                                onClick={() => toggle(q.id)}
                                className="w-full text-left px-5 py-4 focus:outline-none focus:ring-2 focus:ring-indigo focus:ring-inset rounded-lg flex items-start gap-4"
                            >
                                <div className="flex-shrink-0 pt-1">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-indigo font-bold text-sm">
                                        {q.id}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getCategoryStyle(q.category)}`}>
                                            {formatCategory(q.category)}
                                        </span>
                                    </div>
                                    <h3 className="text-base font-semibold text-slate-800 leading-snug pr-8 relative">
                                        {q.question}
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400">
                                            <svg 
                                                className={`w-5 h-5 transform transition-transform duration-200 ${isExpanded ? 'rotate-180 text-indigo' : ''}`} 
                                                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-2 italic">
                                        <span className="font-semibold not-italic">Focus: </span>{q.focus}
                                    </p>
                                </div>
                            </button>
                            
                            {isExpanded && (
                                <div className="px-5 pb-5 border-t border-gray-100 bg-gray-50/50 rounded-b-lg">
                                    <StarAnswerCard answer={answer} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
