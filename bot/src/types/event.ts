import { ExtendedClient } from "../client";

export interface BotEvent {
  name: string;
  once?: boolean;
  execute(client: ExtendedClient, ...args: any[]): Promise<void> | void;
}
