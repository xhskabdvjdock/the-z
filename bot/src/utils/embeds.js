import { EmbedBuilder } from 'discord.js';

export const createEmbed = (title, description, color = '#5865F2') => {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();
};

export const successEmbed = (message) => {
  return createEmbed('✅ نجاح', message, '#57F287');
};

export const errorEmbed = (message) => {
  return createEmbed('❌ خطأ', message, '#ED4245');
};

export const warningEmbed = (message) => {
  return createEmbed('⚠️ تحذير', message, '#FEE75C');
};

export const infoEmbed = (message) => {
  return createEmbed('ℹ️ معلومات', message, '#5865F2');
};
