// Planning Algorithm Simulation
// Run with: npx ts-node planning_algorithm.ts

console.log("📅 Penthouse Papi Planning Algorithm");
console.log("------------------------------------");

interface Concept {
    id: string;
    description: string;
    durationDays: number;
    startDate: Date;
}

interface CalendarItem {
    date: string;
    phase: string;
    theme: string;
    assetType: 'video' | 'image' | 'copy';
    platform: string[];
}

const generateCalendar = (concept: Concept): CalendarItem[] => {
    const calendar: CalendarItem[] = [];
    const phases = [
        { name: 'Awareness', weight: 0.4 },
        { name: 'Consideration', weight: 0.3 },
        { name: 'Conversion', weight: 0.3 }
    ];

    let currentDay = 0;

    phases.forEach(phase => {
        const phaseDays = Math.floor(concept.durationDays * phase.weight);
        console.log(`> Scheduling ${phase.name}: ${phaseDays} days`);

        for (let i = 0; i < phaseDays; i++) {
            currentDay++;
            const date = new Date(concept.startDate);
            date.setDate(date.getDate() + currentDay);

            let assetType: CalendarItem['assetType'] = 'copy';
            let platforms = ['linkedin'];

            // Logic: Mondays = Video, Wednesdays = Image, Fridays = Copy
            const dayOfWeek = date.getDay();
            if (dayOfWeek === 1) { // Mon
                assetType = 'video';
                platforms.push('instagram', 'youtube');
            } else if (dayOfWeek === 3) { // Wed
                assetType = 'image';
                platforms.push('instagram');
            }

            calendar.push({
                date: date.toISOString().split('T')[0],
                phase: phase.name,
                theme: `${phase.name} Topic #${i + 1} for ${concept.description}`,
                assetType,
                platform: platforms
            });
        }
    });

    return calendar;
};

// Test
const testConcept: Concept = {
    id: "gold-001",
    description: "Goldbackbond Q1 Launch",
    durationDays: 30,
    startDate: new Date()
};

const plan = generateCalendar(testConcept);
console.log(`\nGenerated ${plan.length} items:`);
console.log(plan.slice(0, 3)); // Show first 3
console.log("...");
