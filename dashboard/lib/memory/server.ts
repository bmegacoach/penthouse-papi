import { MemoryEngine } from "./engine";
import { DailyWriter } from "./daily-writer";
import { EventLogger } from "./event-logger";
import { KnowledgeManager } from "./knowledge-manager";
import { TacitManager } from "./tacit-manager";
import { Retriever } from "./retriever";
import { ResearchQueue } from "./autoresearch/queue";
import { AutoresearchWorker } from "./autoresearch/worker";
import { Heartbeat } from "./heartbeat";
import { Consolidator } from "./consolidator";

let _engine: MemoryEngine | null = null;
let _dw: DailyWriter | null = null;
let _el: EventLogger | null = null;
let _km: KnowledgeManager | null = null;
let _tm: TacitManager | null = null;
let _rq: ResearchQueue | null = null;
let _worker: AutoresearchWorker | null = null;
let _heartbeat: Heartbeat | null = null;
let _consolidator: Consolidator | null = null;

export async function getEngine(): Promise<MemoryEngine> {
  if (!_engine) _engine = await MemoryEngine.create(process.cwd());
  return _engine;
}

export async function getDailyWriter(): Promise<DailyWriter> {
  if (!_dw) _dw = new DailyWriter(await getEngine());
  return _dw;
}

export async function getEventLogger(): Promise<EventLogger> {
  if (!_el) _el = new EventLogger(await getEngine());
  return _el;
}

export async function getKnowledgeManager(): Promise<KnowledgeManager> {
  if (!_km) _km = new KnowledgeManager(await getEngine());
  return _km;
}

export async function getTacitManager(): Promise<TacitManager> {
  if (!_tm) _tm = new TacitManager(await getEngine());
  return _tm;
}

export async function getResearchQueue(): Promise<ResearchQueue> {
  if (!_rq) _rq = new ResearchQueue(await getEngine());
  return _rq;
}

export async function getRetriever(): Promise<Retriever> {
  const engine = await getEngine();
  return new Retriever(
    engine,
    new KnowledgeManager(engine),
    new TacitManager(engine),
    new DailyWriter(engine),
  );
}

export async function getAutoresearchWorker(): Promise<AutoresearchWorker> {
  if (!_worker) {
    _worker = new AutoresearchWorker(await getEngine(), {
      perplexityApiKey: process.env.PERPLEXITY_API_KEY,
      youtubeApiKey: process.env.YOUTUBE_API_KEY,
    });
  }
  return _worker;
}

export async function getWorker(): Promise<AutoresearchWorker> {
  return getAutoresearchWorker();
}

export async function getHeartbeat(): Promise<Heartbeat> {
  if (!_heartbeat) {
    const engine = await getEngine();
    _heartbeat = new Heartbeat(engine, new EventLogger(engine), new ResearchQueue(engine));
  }
  return _heartbeat;
}

export async function getConsolidator(): Promise<Consolidator> {
  if (!_consolidator) {
    const engine = await getEngine();
    _consolidator = new Consolidator(
      engine,
      new DailyWriter(engine),
      new EventLogger(engine),
      new KnowledgeManager(engine),
      new TacitManager(engine),
    );
  }
  return _consolidator;
}
