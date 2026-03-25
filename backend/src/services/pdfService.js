const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const REPORTS_DIR = path.resolve(process.env.REPORTS_DIR || './reports');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

/**
 * Generate a dental screening PDF report.
 * Returns the file path of the generated PDF.
 */
async function generatePDF({ patient, screening, camp, dentist, reportId, version }) {
    const fileName = `report_${patient.patient_id}_v${version}_${Date.now()}.pdf`;
    const filePath = path.join(REPORTS_DIR, fileName);

    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const writeStream = fs.createWriteStream(filePath);

            doc.pipe(writeStream);

            // ── Header ──
            doc.fontSize(20).font('Helvetica-Bold')
                .text('DENTAL SCREENING REPORT', { align: 'center' });
            doc.moveDown(0.3);

            doc.fontSize(14).font('Helvetica')
                .text(camp.name, { align: 'center' });
            doc.fontSize(10)
                .text(camp.location || '', { align: 'center' });
            doc.moveDown(0.5);

            // Divider
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#2196F3');
            doc.moveDown(0.8);

            // ── Patient Info ──
            doc.fontSize(13).font('Helvetica-Bold').text('Patient Information');
            doc.moveDown(0.3);

            const infoStartY = doc.y;
            doc.fontSize(10).font('Helvetica');

            const leftCol = [
                ['Patient ID', patient.patient_id],
                ['Full Name', patient.full_name],
                ['Age', `${patient.age} years`],
                ['Gender', patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : 'N/A'],
            ];

            const rightCol = [
                ['Phone', patient.phone || 'N/A'],
                ['Organization', patient.organization],
                ['Department', patient.department || 'N/A'],
                ['Aadhaar No.', patient.aadhaar_number || 'N/A'],
            ];

            let y = infoStartY;
            leftCol.forEach(([label, value]) => {
                doc.font('Helvetica-Bold').text(`${label}:`, 50, y, { continued: true });
                doc.font('Helvetica').text(` ${value}`, { continued: false });
                y += 16;
            });

            y = infoStartY;
            rightCol.forEach(([label, value]) => {
                doc.font('Helvetica-Bold').text(`${label}:`, 300, y, { continued: true });
                doc.font('Helvetica').text(` ${value}`, { continued: false });
                y += 16;
            });

            doc.y = y + 10;

            // Divider
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#E0E0E0');
            doc.moveDown(0.8);

            // ── Screening Details ──
            doc.fontSize(13).font('Helvetica-Bold').text('Screening Findings');
            doc.moveDown(0.3);

            const screeningDate = new Date(screening.updatedAt || screening.createdAt);
            doc.fontSize(10).font('Helvetica')
                .text(`Date of Screening: ${screeningDate.toISOString().split('T')[0]} (${screeningDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })})`);
            doc.moveDown(0.5);

            // Findings table
            const findings = [
                ['Oral Hygiene', (screening.oral_hygiene || 'N/A').charAt(0).toUpperCase() + (screening.oral_hygiene || 'N/A').slice(1)],
                ['Dental Caries', screening.caries ? '⚠ Yes' : '✓ No'],
                ['Gingivitis', screening.gingivitis ? '⚠ Yes' : '✓ No'],
                ['Malocclusion', screening.malocclusion ? '⚠ Yes' : '✓ No'],
            ];

            const tableTop = doc.y;
            const colWidth = 247;

            // Header row
            doc.rect(50, tableTop, colWidth, 22).fill('#2196F3');
            doc.rect(50 + colWidth, tableTop, colWidth, 22).fill('#2196F3');
            doc.fontSize(10).font('Helvetica-Bold').fillColor('#FFFFFF')
                .text('Parameter', 60, tableTop + 5)
                .text('Finding', 60 + colWidth, tableTop + 5);
            doc.fillColor('#000000');

            let rowY = tableTop + 22;
            findings.forEach(([param, value], i) => {
                const bgColor = i % 2 === 0 ? '#F5F5F5' : '#FFFFFF';
                doc.rect(50, rowY, colWidth, 20).fill(bgColor);
                doc.rect(50 + colWidth, rowY, colWidth, 20).fill(bgColor);

                doc.fillColor('#333333').font('Helvetica')
                    .text(param, 60, rowY + 5)
                    .text(value, 60 + colWidth, rowY + 5);
                rowY += 20;
            });

            doc.fillColor('#000000');
            doc.y = rowY + 10;

            // Other findings
            if (screening.other_findings) {
                doc.font('Helvetica-Bold').text('Other Findings:');
                doc.font('Helvetica').text(screening.other_findings);
                doc.moveDown(0.5);
            }

            // Divider
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#E0E0E0');
            doc.moveDown(0.8);

            // ── Treatment Recommendations ──
            doc.fontSize(13).font('Helvetica-Bold').text('Treatment Recommendations');
            doc.moveDown(0.3);

            const treatments = screening.treatments || [];
            if (treatments.length > 0) {
                treatments.forEach(t => {
                    doc.fontSize(10).font('Helvetica').text(`• ${t}`, { indent: 20 });
                });
            } else {
                doc.fontSize(10).font('Helvetica').text('No immediate treatment required.');
            }
            doc.moveDown(1);

            // ── Dentist Info & Signature ──
            const bottomY = doc.y;
            doc.fontSize(10).font('Helvetica-Bold').text('Screened By:', 50, bottomY);
            doc.font('Helvetica').text(dentist.name);
            doc.moveDown(1.5);
            doc.text('_________________________');
            doc.text('Dentist Signature');

            // ── Footer ──
            doc.fontSize(8).font('Helvetica').fillColor('#888888')
                .text(
                    'This report is generated digitally as part of a dental screening camp. It is not a substitute for a comprehensive dental examination. Please consult your dentist for any treatment.',
                    50, 750,
                    { width: 495, align: 'center' }
                );
            doc.text(`Report ID: ${reportId} | Version: ${version}`, 50, 770, { align: 'center', width: 495 });

            doc.end();

            writeStream.on('finish', () => resolve(filePath));
            writeStream.on('error', reject);
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = { generatePDF, REPORTS_DIR };
