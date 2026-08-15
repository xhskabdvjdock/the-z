import { Collection } from "../db/collection";
import { ServerBackup } from "../types/backup";
import { randomUUID } from "crypto";

/** قالب سيرفر محفوظ من الداشبورد — يُطبَّق على أي سيرفر عبر استعادة النسخة الاحتياطية */
export interface IServerTemplate {
  _id?: string;
  /** معرّف فريد داخل بيانات المستند (قابل للاستعلام عبر Collection) */
  id: string;
  name: string;
  description?: string;
  /** السيرفر الذي أُنشئ منه القالب */
  guildId: string;
  guildName?: string;
  backup: ServerBackup;
  createdAt: Date;
}

export const ServerTemplate = new Collection<IServerTemplate>("server_templates", "guildId", () => ({
  id: randomUUID(),
  createdAt: new Date()
}));