import { ISelfRolePanel } from "../types/guildConfig";

/**
 * باني رسالة لوحة الرتب (Role Panel) كـ JSON خالص — يستخدمه البوت لإرسال/
 * تعديل الرسالة، والداشبورد للنشر عبر REST، بنفس الشكل تمامًا.
 *
 * Custom IDs متوافقة مع معالجات البوت:
 *   أزرار:   selfrole_btn_<panelId>_<roleId>
 *   قائمة:  selfrole_select_<panelId>
 */

export interface RolePanelMessagePayload {
  embeds: Array<{
    title?: string;
    description?: string;
    color?: number;
    footer?: { text: string };
  }>;
  components: Array<{ type: 1; components: unknown[] }>;
}

const DEFAULT_COLOR = 0x5865f2;
const BUTTON_PREFIX = "selfrole_btn_";
const SELECT_PREFIX = "selfrole_select_";

function parseColor(color?: string): number {
  if (!color) return DEFAULT_COLOR;
  const n = parseInt(color.replace("#", ""), 16);
  return Number.isNaN(n) ? DEFAULT_COLOR : n;
}

export function buildRolePanelMessage(panel: ISelfRolePanel): RolePanelMessagePayload {
  const embeds = [
    {
      title: panel.title || "اختر رتبتك",
      ...(panel.description ? { description: panel.description } : {}),
      ...(panel.color ? { color: parseColor(panel.color) } : { color: DEFAULT_COLOR })
    }
  ];

  const options = panel.options.slice(0, 25).map((o) => ({
    label: o.label || o.roleId,
    value: o.roleId,
    ...(o.emoji ? { emoji: { name: o.emoji } } : {}),
    ...(o.description ? { description: o.description } : {})
  }));

  let components: RolePanelMessagePayload["components"] = [];

  if (panel.type === "select") {
    components = [
      {
        type: 1,
        components: [
          {
            type: 4,
            custom_id: `${SELECT_PREFIX}${panel.id}`,
            placeholder: "اختر رتبة أو أكثر...",
            min_values: panel.maxRoles && panel.maxRoles > 0 ? Math.min(panel.maxRoles, 25) : 0,
            max_values: Math.max(1, Math.min(options.length, 25)),
            options
          }
        ]
      }
    ];
  } else {
    panel.options.slice(0, 25).forEach((option, index) => {
      if (index % 5 === 0) components.push({ type: 1, components: [] });
      components[components.length - 1].components.push({
        type: 2,
        style: 2,
        custom_id: `${BUTTON_PREFIX}${panel.id}_${option.roleId}`,
        label: option.label || option.roleId,
        ...(option.emoji ? { emoji: { name: option.emoji } } : {})
      });
    });
  }

  return { embeds, components };
}