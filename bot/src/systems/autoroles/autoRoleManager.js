import Guild from '../../models/Guild.js';
import logger from '../../utils/logger.js';

export class AutoRoleManager {
  static async assignAutoRoles(member, client) {
    try {
      const guildData = await Guild.findOne({ guildId: member.guild.id });
      if (!guildData || !guildData.autoroles.enabled) return;

      // Assign basic auto roles
      for (const roleId of guildData.autoroles.roles) {
        try {
          const role = member.guild.roles.cache.get(roleId);
          if (role && !member.roles.cache.has(roleId)) {
            await member.roles.add(role);
            logger.debug(`Assigned auto role ${role.name} to ${member.user.tag}`);
          }
        } catch (error) {
          logger.error(`Error assigning auto role ${roleId}:`, error);
        }
      }

      // Check time-based roles
      const joinTime = member.joinedAt?.getTime() || Date.now();
      const timeInGuild = (Date.now() - joinTime) / 60000; // minutes

      for (const timeRole of guildData.autoroles.timeRoles) {
        if (timeInGuild >= timeRole.time) {
          try {
            const role = member.guild.roles.cache.get(timeRole.roleId);
            if (role && !member.roles.cache.has(timeRole.roleId)) {
              await member.roles.add(role);
              logger.debug(`Assigned time role ${role.name} to ${member.user.tag}`);
            }
          } catch (error) {
            logger.error(`Error assigning time role ${timeRole.roleId}:`, error);
          }
        }
      }
    } catch (error) {
      logger.error('Error assigning auto roles:', error);
    }
  }

  static async handleReactionRole(reaction, user, add) {
    try {
      const guildData = await Guild.findOne({ guildId: reaction.message.guild.id });
      if (!guildData || !guildData.autoroles.enabled) return;

      const reactionRole = guildData.autoroles.reactionRoles.find(
        rr => rr.messageId === reaction.message.id
      );
      if (!reactionRole) return;

      const roleData = reactionRole.roles.find(
        r => r.emoji === reaction.emoji.toString() || r.emoji === reaction.emoji.name
      );
      if (!roleData) return;

      const member = await reaction.message.guild.members.fetch(user.id);
      const role = reaction.message.guild.roles.cache.get(roleData.roleId);
      if (!role) return;

      if (add) {
        if (!member.roles.cache.has(role.id)) {
          await member.roles.add(role);
        }
      } else {
        if (member.roles.cache.has(role.id)) {
          await member.roles.remove(role);
        }
      }
    } catch (error) {
      logger.error('Error handling reaction role:', error);
    }
  }

  static async handleButtonRole(interaction) {
    try {
      if (!interaction.isButton()) return;

      const guildData = await Guild.findOne({ guildId: interaction.guild.id });
      if (!guildData || !guildData.autoroles.enabled) return;

      const buttonRole = guildData.autoroles.buttonRoles.find(
        br => br.messageId === interaction.message.id
      );
      if (!buttonRole) return;

      const roleData = buttonRole.roles.find(
        r => r.label === interaction.component.label
      );
      if (!roleData) return;

      const role = interaction.guild.roles.cache.get(roleData.roleId);
      if (!role) return;

      const member = interaction.member;

      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
        await interaction.reply({ 
          content: `تم إزالة رول ${role.name}`, 
          ephemeral: true 
        });
      } else {
        await member.roles.add(role);
        await interaction.reply({ 
          content: `تم إضافة رول ${role.name}`, 
          ephemeral: true 
        });
      }
    } catch (error) {
      logger.error('Error handling button role:', error);
    }
  }
}
