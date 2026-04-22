import type { GenerateVideoInput, GenerateVideoTask, VideoProvider } from "./types";
import { minimaxAdapter } from "./minimax";
import { seedanceAdapter } from "./seedance";
import { cliEnabledFor, cliPoll, cliSubmit } from "./mmx-cli";

const adapters = {
  minimax: minimaxAdapter,
  seedance: seedanceAdapter,
} as const;

function getAdapter(provider: VideoProvider) {
  const adapter = adapters[provider];
  if (!adapter) throw new Error(`Unknown provider: ${provider}`);
  return adapter;
}

export async function generateVideo(input: GenerateVideoInput): Promise<GenerateVideoTask> {
  if (cliEnabledFor(input.provider)) {
    return cliSubmit(input);
  }
  return getAdapter(input.provider).submit(input);
}

export async function pollVideo(provider: VideoProvider, taskId: string): Promise<GenerateVideoTask> {
  if (cliEnabledFor(provider)) {
    return cliPoll(provider, taskId);
  }
  return getAdapter(provider).poll(taskId);
}

export type { GenerateVideoInput, GenerateVideoTask, VideoProvider } from "./types";
