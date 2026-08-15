import { ExtendedClient } from "../client";
import { componentRouter } from "../handlers/componentRouter";
import { registerTicketComponents } from "./tickets/ticketManager";
import { registerTempVoiceComponents } from "./tempVoice/voiceManager";
import { registerColorComponents } from "./roles/colorRoles";
import { registerSelfRoleComponents } from "./roles/selfRoles";
import { registerCaptchaComponents } from "./captcha/captcha";
import { startVoiceXpInterval } from "./leveling/xpManager";
import { startJailExpiryInterval } from "./jail/expiry";
import { startAlwaysVoiceLoop } from "./alwaysVoice/alwaysVoiceManager";
import { startMemberCounter } from "./memberCounter/memberCounterManager";
import { startScheduledMessages } from "./scheduledMessages/scheduledMessagesManager";
import { registerReactionRoles } from "./reactionRoles/reactionRolesManager";
import { initGames } from "../games";

/** نقطة تجميع مركزية: تسجّل كل معالجات الأزرار/القوائم الخاصة بكل موديول، وتشغّل المهام الدورية */
export function registerAllModules(client: ExtendedClient) {
  registerTicketComponents(componentRouter);
  registerTempVoiceComponents(componentRouter);
  registerColorComponents(componentRouter);
  registerSelfRoleComponents(componentRouter);
  registerCaptchaComponents(componentRouter);
  registerReactionRoles(client);
  initGames(client);

  client.once("ready", () => {
    startVoiceXpInterval(client);
    startJailExpiryInterval(client);
    startAlwaysVoiceLoop(client);
    startMemberCounter(client);
    startScheduledMessages(client);
  });
}
