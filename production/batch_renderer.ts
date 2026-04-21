// Batch Renderer Service
// Run with: npx ts-node batch_renderer.ts

console.log("🏭 Penthouse Papi Batch Renderer");
console.log("--------------------------------");

// Mock Supabase Client (Replace with real client)
const supabase = {
    from: (table: string) => ({
        select: (cols: string) => ({
            eq: (col: string, val: string) => Promise.resolve({
                data: [
                    { id: "asset-1", template: "DynamicKinetic", props: { title: "Video 1" } },
                    { id: "asset-2", template: "SplitScreen", props: { leftContent: "Video 2" } }
                ],
                error: null
            })
        })
    })
};

const renderAsset = async (asset: any) => {
    console.log(`[Batch] Processing Asset ${asset.id} using template ${asset.template}...`);

    // Simulate Render Time
    await new Promise(r => setTimeout(r, 500));

    // Call Remotion (Mock)
    // exec(`npx remotion render src/index.ts ${asset.template} out/${asset.id}.mp4 --props='${JSON.stringify(asset.props)}'`);

    console.log(`[Batch] ✅ Rendered: out/${asset.id}.mp4`);
    return `https://storage/${asset.id}.mp4`;
};

const runBatch = async () => {
    // 1. Fetch Queued Items
    const { data: queuedAssets } = await supabase.from('video_assets').select('*').eq('status', 'queued');

    if (!queuedAssets || queuedAssets.length === 0) {
        console.log("[Batch] No items in queue.");
        return;
    }

    console.log(`[Batch] Found ${queuedAssets.length} items to render.`);

    // 2. Process Queue
    for (const asset of queuedAssets) {
        try {
            await renderAsset(asset);
            // Update Status in DB
            console.log(`[Batch] Updated DB status to 'ready'`);
        } catch (e) {
            console.error(`[Batch] ❌ Failed ${asset.id}`);
        }
    }
};

runBatch();
