import { PermissionFlagsBits } from 'discord.js';
import { PermissionError } from './errors.js';

export const checkPermission = (member, permission) => {
  if (!member.permissions.has(permission)) {
    throw new PermissionError(`You don't have permission: ${permission}`);
  }
  return true;
};

export const hasRole = (member, roleId) => {
  return member.roles.cache.has(roleId);
};

export const isAdmin = (member) => {
  return member.permissions.has(PermissionFlagsBits.Administrator);
};

export const isModerator = (member) => {
  return member.permissions.has(
    PermissionFlagsBits.ManageMessages |
    PermissionFlagsBits.KickMembers |
    PermissionFlagsBits.BanMembers |
    PermissionFlagsBits.Administrator
  );
};

export const canManageGuild = (member) => {
  return member.permissions.has(PermissionFlagsBits.ManageGuild);
};
