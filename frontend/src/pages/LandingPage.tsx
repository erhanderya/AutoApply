import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

const features = [
    { icon: '🔎', title: 'Smart Job Scanning', description: 'AI agents scan top job boards and match positions to your profile automatically.' },
    { icon: '📊', title: 'CV-Job Fit Analysis', description: 'Get instant fit scores and gap analysis for every position found.' },
    { icon: '✍️', title: 'Tailored Applications', description: 'AI generates customized CVs and cover letters for each application.' },
    { icon: '📨', title: 'Auto-Submit', description: 'Applications are submitted automatically, or queued for your approval.' },
    { icon: '📈', title: 'Progress Tracking', description: 'Track every application status with real-time updates and analytics.' },
    { icon: '🔔', title: 'Smart Follow-ups', description: 'Automated follow-up scheduling ensures no opportunity is missed.' },
];

const steps = [
    { num: '01', title: 'Upload Your CV', description: 'Drop your resume and let our AI parse your skills and experience.', icon: '📄' },
    { num: '02', title: 'Agents Go to Work', description: '5 AI agents scan, analyze, write, apply, and track — all automatically.', icon: '🤖' },
    { num: '03', title: 'Get Hired', description: 'Track interviews, offers, and responses in one beautiful dashboard.', icon: '🎉' },
];

export function LandingPage() {
    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section className="bg-navy text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-indigo rounded-full blur-[100px]" />
                    <div className="absolute bottom-10 right-20 w-96 h-96 bg-violet rounded-full blur-[120px]" />
                </div>

                <nav className="relative max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">⚡</span>
                        <span className="text-lg font-bold tracking-tight">AutoApply</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link to="/login">
                            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                                Sign In
                            </Button>
                        </Link>
                        <Link to="/register">
                            <Button size="sm">Get Started</Button>
                        </Link>
                    </div>
                </nav>

                <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-28 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-sm mb-6 backdrop-blur-sm border border-white/10">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse-dot" />
                        Powered by 5 AI Agents
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-5 max-w-3xl mx-auto">
                        Your job search,{' '}
                        <span className="bg-gradient-to-r from-indigo-light to-violet-light bg-clip-text text-transparent">
                            fully automated.
                        </span>
                    </h1>
                    <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8 leading-relaxed">
                        Upload your CV once. Set your preferences. AutoApply's AI agents handle the rest —
                        scanning jobs, tailoring applications, and tracking outcomes.
                    </p>
                    <div className="flex items-center justify-center gap-4">
                        <Link to="/register">
                            <Button size="lg">
                                Get Started Free →
                            </Button>
                        </Link>
                        <Button variant="ghost" size="lg" className="text-white border border-white/20 hover:bg-white/10">
                            See Demo
                        </Button>
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl font-bold text-navy mb-3">How it works</h2>
                        <p className="text-gray-500 max-w-xl mx-auto">Three simple steps to automate your entire job search.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {steps.map((step) => (
                            <div key={step.num} className="text-center group">
                                <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo/10 flex items-center justify-center text-3xl mb-4 group-hover:bg-indigo/20 transition-colors">
                                    {step.icon}
                                </div>
                                <span className="text-xs font-bold text-indigo uppercase tracking-wider">Step {step.num}</span>
                                <h3 className="text-lg font-semibold text-navy mt-2 mb-2">{step.title}</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl font-bold text-navy mb-3">Everything you need</h2>
                        <p className="text-gray-500 max-w-xl mx-auto">Powerful AI agents working together to supercharge your job hunt.</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature) => (
                            <div
                                key={feature.title}
                                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-indigo/30 transition-all duration-300"
                            >
                                <span className="text-3xl mb-3 block">{feature.icon}</span>
                                <h3 className="text-base font-semibold text-navy mb-2">{feature.title}</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-navy text-gray-400 py-8">
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span>⚡</span>
                        <span className="text-sm font-semibold text-white">AutoApply</span>
                    </div>
                    <p className="text-xs">© 2026 AutoApply. Making job hunting autonomous.</p>
                </div>
            </footer>
        </div>
    );
}
