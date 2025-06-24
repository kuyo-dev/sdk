console.log("Kuyo SDK loaded");
import { NextjsAdapter } from "./adapters/nextjs";
import { KuyoCore } from "./core";
import { KuyoAdapters, KuyoConfig } from "./types";

let globalCore: KuyoCore | null = null;

export function init(config: KuyoConfig) {
  globalCore = new KuyoCore(config);

  const adapter = getAdapter(config.adapter);

  globalCore.useAdapter(adapter);
}

function getAdapter(adapter: KuyoAdapters) {
  if (!globalCore) {
    throw new Error("Kuyo core not initialized");
  }

  switch (adapter) {
    case "nextjs":
      return new NextjsAdapter(globalCore);
    default:
      throw new Error(`Unsupported adapter: ${adapter}`);
  }
}
