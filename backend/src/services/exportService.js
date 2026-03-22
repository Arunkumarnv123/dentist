let Parser;
try {
    Parser = require('@json2csv/plainjs').Parser;
} catch {
    // Fallback: manual CSV generation
    Parser = class {
        parse(data) {
            if (!data || data.length === 0) return '';
            const headers = Object.keys(data[0]);
            const csvRows = [headers.join(',')];
            data.forEach(row => {
                csvRows.push(headers.map(h => {
                    const val = row[h] === null || row[h] === undefined ? '' : String(row[h]);
                    return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
                }).join(','));
            });
            return csvRows.join('\n');
        }
    };
}
const { Patient, Screening, User, Camp } = require('../models');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const EXPORTS_DIR = path.resolve(process.env.EXPORTS_DIR || './exports');

if (!fs.existsSync(EXPORTS_DIR)) {
    fs.mkdirSync(EXPORTS_DIR, { recursive: true });
}

/**
 * Generate a CSV export of patient and screening data for a camp.
 */
async function generateCSVExport(campId, filters = {}) {
    const whereClause = { camp_id: campId };

    const patients = await Patient.findAll({
        where: whereClause,
        include: [
            {
                model: Screening,
                as: 'screenings',
                where: { draft: false },
                required: false,
                include: [{ model: User, as: 'dentist', attributes: ['name'] }],
            },
        ],
        order: [['patient_id', 'ASC']],
    });

    const rows = patients.map(p => {
        const screening = p.screenings && p.screenings[0];
        return {
            'Patient ID': p.patient_id,
            'Full Name': p.full_name,
            'Age': p.age,
            'Gender': p.gender,
            'Phone': p.phone || '',
            'Organization': p.organization,
            'Department': p.department || '',
            'Aadhaar No.': p.aadhaar_number || '',
            'Flat Number': p.flat_number || '',
            'Registered At': p.registered_at,
            'Oral Hygiene': screening ? screening.oral_hygiene : '',
            'Caries': screening ? (screening.caries ? 'Yes' : 'No') : '',
            'Gingivitis': screening ? (screening.gingivitis ? 'Yes' : 'No') : '',
            'Malocclusion': screening ? (screening.malocclusion ? 'Yes' : 'No') : '',
            'Other Findings': screening ? (screening.other_findings || '') : '',
            'Treatments': screening ? (screening.treatments || []).join(', ') : '',
            'Screened By': screening && screening.dentist ? screening.dentist.name : '',
            'Screened At': screening ? screening.updatedAt : '',
        };
    });

    const parser = new Parser();
    const csv = parser.parse(rows);

    const fileName = `export_${campId}_${Date.now()}.csv`;
    const filePath = path.join(EXPORTS_DIR, fileName);
    fs.writeFileSync(filePath, csv, 'utf-8');

    return { filePath, fileName, recordCount: rows.length };
}

module.exports = { generateCSVExport, EXPORTS_DIR };
