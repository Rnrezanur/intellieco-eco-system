const AuditLog = require("../models/AuditLog");

async function logAdminAction({ adminUserId, actionType, targetType, targetId, details = {} }) {
  if (!adminUserId || !actionType || !targetType) {
    return;
  }

  await AuditLog.create({
    adminUser: adminUserId,
    actionType,
    targetType,
    targetId: targetId ? String(targetId) : undefined,
    details
  });
}

module.exports = {
  logAdminAction
};
