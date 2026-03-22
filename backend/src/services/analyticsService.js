const { Screening, Patient, QueueEntry, Camp } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

/**
 * Get analytics data for a camp.
 */
async function getCampAnalytics(campId) {
    const camp = await Camp.findByPk(campId);
    if (!camp) throw new Error('Camp not found');

    // Total registered
    const totalRegistered = await Patient.count({ where: { camp_id: campId } });

    // Queue stats
    const totalScreened = await QueueEntry.count({
        where: { camp_id: campId, status: 'screened' },
    });
    const totalPending = await QueueEntry.count({
        where: { camp_id: campId, status: 'pending' },
    });
    const totalInProgress = await QueueEntry.count({
        where: { camp_id: campId, status: 'in_progress' },
    });

    // Screening findings stats (only finalized screenings)
    const screenings = await Screening.findAll({
        where: { camp_id: campId, draft: false },
    });

    const totalFinalScreenings = screenings.length;
    let cariesCount = 0;
    let gingivitisCount = 0;
    let malocclusion = 0;
    const oralHygiene = { good: 0, fair: 0, poor: 0 };
    const treatmentBreakdown = {};

    screenings.forEach(s => {
        if (s.caries) cariesCount++;
        if (s.gingivitis) gingivitisCount++;
        if (s.malocclusion) malocclusion++;
        if (s.oral_hygiene) oralHygiene[s.oral_hygiene]++;

        const treatments = s.treatments || [];
        treatments.forEach(t => {
            treatmentBreakdown[t] = (treatmentBreakdown[t] || 0) + 1;
        });
    });

    // Screenings per hour (time series)
    const screeningsPerHour = {};
    screenings.forEach(s => {
        const hour = new Date(s.updatedAt).toISOString().slice(0, 13) + ':00';
        screeningsPerHour[hour] = (screeningsPerHour[hour] || 0) + 1;
    });

    return {
        camp: {
            id: camp.id,
            name: camp.name,
            prefix: camp.prefix,
            location: camp.location,
            start_date: camp.start_date,
            end_date: camp.end_date,
        },
        summary: {
            total_registered: totalRegistered,
            total_screened: totalScreened,
            total_pending: totalPending,
            total_in_progress: totalInProgress,
        },
        findings: {
            total_screenings: totalFinalScreenings,
            caries: {
                count: cariesCount,
                percentage: totalFinalScreenings > 0 ? Math.round((cariesCount / totalFinalScreenings) * 100 * 10) / 10 : 0,
            },
            gingivitis: {
                count: gingivitisCount,
                percentage: totalFinalScreenings > 0 ? Math.round((gingivitisCount / totalFinalScreenings) * 100 * 10) / 10 : 0,
            },
            malocclusion: {
                count: malocclusion,
                percentage: totalFinalScreenings > 0 ? Math.round((malocclusion / totalFinalScreenings) * 100 * 10) / 10 : 0,
            },
            oral_hygiene: oralHygiene,
        },
        treatment_breakdown: treatmentBreakdown,
        screenings_per_hour: Object.entries(screeningsPerHour)
            .map(([hour, count]) => ({ hour, count }))
            .sort((a, b) => a.hour.localeCompare(b.hour)),
        last_updated: new Date().toISOString(),
    };
}

module.exports = { getCampAnalytics };
