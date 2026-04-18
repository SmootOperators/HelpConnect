"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAuditLog = writeAuditLog;
const admin_1 = require("./admin");
async function writeAuditLog(entry) {
    await admin_1.db.collection("audit_logs").add({
        ...entry,
        timestamp: admin_1.Timestamp.now(),
    });
}
//# sourceMappingURL=audit.js.map