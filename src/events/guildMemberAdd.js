const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    try {
      const guild = member.guild;

      // ✅ LOG en canal JOINS
      await logger.logJoin({
        description: `👋 **Nuevo miembro en el servidor**\n\n` +
                     `👤 **Usuario:** ${member.user.tag} (${member.user.id})\n` +
                     `📅 **Cuenta creada:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n` +
                     `⏰ **Unido:** <t:${Math.floor(member.joinedTimestamp / 1000)}:F>\n` +
                     `👥 **Total miembros:** ${guild.memberCount}`,
        fields: [
          { 
            name: '🆕 Edad de cuenta', 
            value: `${Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24))} días`, 
            inline: true 
          },
          { 
            name: '🤖 Bot', 
            value: member.user.bot ? '✅ Sí' : '❌ No', 
            inline: true 
          }
        ]
      });

      logger.info(`👋 Nuevo miembro: ${member.user.tag}`);

      // ⚠️ Alerta si la cuenta es muy nueva (menos de 7 días)
      const accountAge = Date.now() - member.user.createdTimestamp;
      const sevenDays = 7 * 24 * 60 * 60 * 1000;

      if (accountAge < sevenDays) {
        await logger.logSeguridad({
          description: `⚠️ **Cuenta nueva detectada**\n\n` +
                       `👤 **Usuario:** ${member.user.tag}\n` +
                       `📅 **Cuenta creada:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n` +
                       `🚨 **Alerta:** Cuenta menor a 7 días`,
          fields: [
            { name: '🆕 Edad', value: `${Math.floor(accountAge / (1000 * 60 * 60 * 24))} días`, inline: true },
            { name: '⚠️ Riesgo', value: 'Potencial alt/raid', inline: true }
          ]
        });
      }

    } catch (error) {
      logger.error('❌ Error en guildMemberAdd:', error);
    }
  }
};
