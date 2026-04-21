// Learning Algorithm 
// Analyzes asset_performance to optimize future calendar generation.
// Run with: npx ts-node learning_algorithm.ts

console.log("🧠 Penthouse Papi Learning Algorithm");
console.log("-----------------------------------");

interface PerformanceRecord {
    asset_id: string;
    theme: string;
    assetType: string;
    metrics: { views: number; likes: number };
    conversions: number;
}

// Simulated Database Fetch
const fetchLast30DaysData = (): PerformanceRecord[] => {
    return [
        { asset_id: "val-1", theme: "Social Proof", assetType: "video", metrics: { views: 12000, likes: 450 }, conversions: 12 },
        { asset_id: "val-2", theme: "Educational Tip", assetType: "image", metrics: { views: 3000, likes: 100 }, conversions: 2 },
        { asset_id: "val-3", theme: "Contrarian Hook", assetType: "video", metrics: { views: 25000, likes: 1200 }, conversions: 35 },
        { asset_id: "val-4", theme: "Direct Offer", assetType: "copy", metrics: { views: 1500, likes: 20 }, conversions: 1 }
    ];
};

const calculateScore = (record: PerformanceRecord): number => {
    // Score logic: 20% Views, 30% Engagement Rate, 50% Conversions
    // Normalized for simulation:
    const viewScore = (record.metrics.views / 25000) * 20;
    const engagementScore = ((record.metrics.likes / record.metrics.views) * 100) * 3; // roughly 30 max
    const conversionScore = (record.conversions / 35) * 50;

    return viewScore + engagementScore + conversionScore;
};

const analyzePerformance = () => {
    console.log("[Learning] Fetching performance data...");
    const data = fetchLast30DaysData();

    console.log(`[Learning] Analyzing ${data.length} records...`);

    const scoredData = data.map(record => ({
        ...record,
        score: calculateScore(record)
    })).sort((a, b) => b.score - a.score);

    console.log("\nTop Performing Assets:");
    scoredData.slice(0, 2).forEach((val, i) => {
        console.log(`#${i + 1} [Score: ${val.score.toFixed(1)}] ${val.theme} (${val.assetType})`);
    });

    // Generate Weights Update
    console.log("\n[Learning] Optimization Recommendations:");
    console.log("-> Action: Increase 'Contrarian Hook' theme frequency by 15%");
    console.log("-> Action: Favor 'video' format over 'image' for Awareness phase.");

    return scoredData;
};

// Execute
analyzePerformance();
