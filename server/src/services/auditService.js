import AuditLog from '../models/AuditLog.js';
import { logger } from '../utils/logger.js';

export async function recordAudit(userId, action, metadata = {}, req = null) {
  try {
    await AuditLog.create({
      userId,
      action,
      metadata,
      ip: req?.ip || ''
    });
  } catch (error) {
    logger.warn(`Audit log write failed for ${action}: ${error.message}`);
  }
}
