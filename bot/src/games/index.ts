import { ExtendedClient } from "../client";
import { componentRouter } from "../handlers/componentRouter";
import { registerGameComponents } from "./core/interaction";
import { registerGameCenter } from "./gameCenter";
import { registry } from "./core/registry";
import { recoverStaleSessions } from "./core/engine";

import xo from "./multiplayer/xo";
import rps from "./multiplayer/rps";
import roulette from "./multiplayer/roulette";
import quickdraw from "./multiplayer/quickdraw";
import numberwar from "./multiplayer/numberwar";
import highlow from "./multiplayer/highlow";
import truthordare from "./multiplayer/truthordare";
import flags from "./multiplayer/flags";
import hangman from "./multiplayer/hangman";
import connect4 from "./multiplayer/connect4";
import guessnumber from "./multiplayer/guessnumber";
import mafia from "./multiplayer/mafia";

import button from "./singleplayer/button";
import faster from "./singleplayer/faster";
import memory from "./singleplayer/memory";
import math from "./singleplayer/math";
import simon from "./singleplayer/simon";
import reaction from "./singleplayer/reaction";
import typing from "./singleplayer/typing";
import morefaster from "./singleplayer/morefaster";
import colortile from "./singleplayer/colortile";
import scramble from "./singleplayer/scramble";
import trivia from "./singleplayer/trivia";
import game2048 from "./singleplayer/game2048";

const GAMES = [
  xo, rps, roulette, quickdraw, numberwar, highlow,
  truthordare, flags, hangman, connect4, guessnumber, mafia,
  button, faster, memory, math, simon, reaction,
  typing, morefaster, colortile, scramble, trivia, game2048
];

/**
 * تهيئة نظام The Z Games:
 *  1) تسجيل كل الألعاب في الـ Registry
 *  2) تسجيل تفاعلات الجلسات (أزرار/قوائم اللعب)
 *  3) تسجيل تفاعلات مركز الألعاب (/game)
 *  4) استعادة الجلسات المعلّقة بعد إعادة التشغيل
 */
export function initGames(client: ExtendedClient): void {
  for (const game of GAMES) {
    registry.register(game);
  }
  registerGameComponents(componentRouter);
  registerGameCenter(componentRouter);

  client.once("ready", () => {
    void recoverStaleSessions(client);
  });

  console.log(`🎮 تم تحميل ${registry.size()} لعبة (${registry.byCategory("multiplayer").length} جماعية، ${registry.byCategory("singleplayer").length} فردية).`);
}

export { handleGamePrefix } from "./core/prefix";