/**
 * Programs Page — Browse workout programs.
 */

'use client';

import { PROGRAMS } from '../../../lib/programs';
import ProgramCard from '../../../components/ProgramCard';

export default function ProgramsPage() {
    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Workout Programs</h1>
                <p className="text-white/30 text-sm mt-1">Choose a structured program to follow</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PROGRAMS.map((program) => (
                    <ProgramCard key={program.id} program={program} />
                ))}
            </div>
        </div>
    );
}
