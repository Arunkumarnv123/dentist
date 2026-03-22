const { Camp } = require('../models');
const sequelize = require('../config/database');

/**
 * Generate a concurrency-safe sequential Patient ID for a camp.
 * Uses DB transaction with row-level locking to prevent duplicates.
 * Returns IDs like "HF-0001", "HF-0002", etc.
 */
async function generatePatientId(campId) {
    const result = await sequelize.transaction(async (transaction) => {
        // Lock the camp row and increment counter atomically
        const camp = await Camp.findByPk(campId, {
            transaction,
            lock: transaction.LOCK ? transaction.LOCK.UPDATE : true,
        });

        if (!camp) {
            throw new Error(`Camp ${campId} not found`);
        }

        const newCounter = camp.patient_counter + 1;
        await camp.update({ patient_counter: newCounter }, { transaction });

        // Format: PREFIX-0001 (zero-padded to 4 digits)
        const paddedNumber = String(newCounter).padStart(4, '0');
        return `${camp.prefix}-${paddedNumber}`;
    });

    return result;
}

module.exports = { generatePatientId };
