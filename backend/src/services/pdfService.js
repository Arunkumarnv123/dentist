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
 * Determine overall health score based on screening findings.
 * Returns: 'good' | 'moderate' | 'poor'
 */
function getHealthStatus(screening) {
    const issues = [screening.caries, screening.gingivitis, screening.malocclusion].filter(Boolean).length;
    const hygiene = (screening.oral_hygiene || '').toLowerCase();

    if (issues === 0 && (hygiene === 'good' || hygiene === 'excellent')) return 'good';
    if (issues >= 2 || hygiene === 'poor') return 'poor';
    return 'moderate';
}

/**
 * Color map for health status.
 */
const STATUS_COLORS = {
    good: { bg: '#E8F5E9', text: '#1B5E20', badge: '#2E7D32', label: 'GOOD' },
    moderate: { bg: '#FFF8E1', text: '#E65100', badge: '#F57F17', label: 'NEEDS ATTENTION' },
    poor: { bg: '#FFEBEE', text: '#B71C1C', badge: '#C62828', label: 'REQUIRES TREATMENT' },
};

/**
 * Oral hygiene color: good=green, fair/moderate=yellow, poor=red
 */
function hygieneColor(val) {
    const v = (val || '').toLowerCase();
    if (v === 'good' || v === 'excellent') return '#2E7D32';
    if (v === 'poor' || v === 'bad') return '#C62828';
    return '#E65100'; // fair / moderate
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

            const healthStatus = getHealthStatus(screening);
            const statusColor = STATUS_COLORS[healthStatus];

            // ── Header ──
            doc.rect(50, 40, 495, 60).fill('#0D3B66').stroke();
            doc.fillColor('#FFFFFF').fontSize(18).font('Helvetica-Bold')
                .text('DENTAL SCREENING REPORT', 50, 52, { align: 'center', width: 495 });
            doc.fontSize(11).font('Helvetica')
                .text(camp.name, 50, 74, { align: 'center', width: 495 });
            doc.fillColor('#000000');

            doc.y = 115;

            // Camp location & date
            doc.fontSize(9).font('Helvetica').fillColor('#555555')
                .text(`Location: ${camp.location || 'N/A'}   |   Date: ${new Date(screening.updatedAt || screening.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`,
                    50, doc.y, { align: 'center', width: 495 });
            doc.fillColor('#000000');
            doc.moveDown(0.8);

            // ── Health Status Badge ──
            const badgeY = doc.y;
            doc.rect(50, badgeY, 495, 32).fill(statusColor.bg).stroke(statusColor.badge);
            doc.fillColor(statusColor.badge).fontSize(11).font('Helvetica-Bold')
                .text(`Overall Health Status: ${statusColor.label}`, 50, badgeY + 8, { align: 'center', width: 495 });
            doc.fillColor('#000000');
            doc.y = badgeY + 42;
            doc.moveDown(0.6);

            // ── Patient Info Section ──
            doc.rect(50, doc.y, 495, 18).fill('#0D3B66');
            doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold')
                .text('PATIENT INFORMATION', 60, doc.y + 3);
            doc.fillColor('#000000');
            doc.y += 20;
            const infoStartY = doc.y;
            doc.fontSize(9.5);

            // Label column widths and value widths (in px)
            const L_X = 50;        // Left col label x
            const L_LBL_W = 75;   // Left col label width
            const L_VAL_X = 128;  // Left col value x
            const L_VAL_W = 145;  // Left col value width (stops before right col)

            const R_X = 290;       // Right col label x
            const R_LBL_W = 75;   // Right col label width
            const R_VAL_X = 368;  // Right col value x
            const R_VAL_W = 175;  // Right col value width (to edge 50+495-2=543)

            const ROW_H = 20;     // Fixed row height — enough for single line, no wrapping

            const leftCol = [
                ['Patient ID', patient.patient_id || 'N/A'],
                ['Full Name', patient.full_name || 'N/A'],
                ['Age', patient.age ? `${patient.age} years` : 'N/A'],
                ['Gender', patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : 'N/A'],
                ['Phone', patient.phone || 'N/A'],
            ];

            const rightCol = [
                ['City', patient.city || 'N/A'],
                ['Address', patient.address || 'N/A'],
                ['Camp', camp.name || 'N/A'],
                ['Prefix', camp.prefix || 'N/A'],
                ['Registered', patient.registered_at ? new Date(patient.registered_at).toLocaleDateString('en-IN') : 'N/A'],
            ];

            const rowCount = Math.max(leftCol.length, rightCol.length);

            for (let i = 0; i < rowCount; i++) {
                const rowY = infoStartY + i * ROW_H;

                // Alternating row background across full width
                const rowBg = i % 2 === 0 ? '#F8F9FA' : '#FFFFFF';
                doc.rect(L_X, rowY, 495, ROW_H).fill(rowBg);

                // Left column
                if (leftCol[i]) {
                    const [lLabel, lValue] = leftCol[i];
                    doc.font('Helvetica-Bold').fillColor('#444444')
                        .text(`${lLabel}:`, L_X + 4, rowY + 4, {
                            width: L_LBL_W, lineBreak: false
                        });
                    doc.font('Helvetica').fillColor('#111111')
                        .text(String(lValue), L_VAL_X, rowY + 4, {
                            width: L_VAL_W, lineBreak: false, ellipsis: true
                        });
                }

                // Right column
                if (rightCol[i]) {
                    const [rLabel, rValue] = rightCol[i];
                    doc.font('Helvetica-Bold').fillColor('#444444')
                        .text(`${rLabel}:`, R_X + 4, rowY + 4, {
                            width: R_LBL_W, lineBreak: false
                        });
                    doc.font('Helvetica').fillColor('#111111')
                        .text(String(rValue), R_VAL_X, rowY + 4, {
                            width: R_VAL_W, lineBreak: false, ellipsis: true
                        });
                }
            }

            doc.y = infoStartY + rowCount * ROW_H + 10;
            doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#DDDDDD').stroke();
            doc.strokeColor('#000000');
            doc.moveDown(0.8);

            // ── Screening Findings Section ──
            doc.rect(50, doc.y, 495, 18).fill('#0D3B66');
            doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold')
                .text('SCREENING FINDINGS', 60, doc.y + 3);
            doc.fillColor('#000000');
            doc.y += 22;
            doc.moveDown(0.3);

            // Table header
            const tableTop = doc.y;
            const col1 = 50, col2 = 230, col3 = 390;
            const tableWidth = 495;

            doc.rect(col1, tableTop, tableWidth, 20).fill('#E3F2FD');
            doc.fillColor('#0D3B66').fontSize(9).font('Helvetica-Bold')
                .text('Parameter', col1 + 10, tableTop + 5)
                .text('Finding', col2 + 10, tableTop + 5)
                .text('Status', col3 + 10, tableTop + 5);
            doc.fillColor('#000000');

            // Findings rows with color-coded status
            // Determine oral hygiene finding details
            const hygieneVal = (screening.oral_hygiene || 'N/A');
            const hygieneDisplay = hygieneVal.charAt(0).toUpperCase() + hygieneVal.slice(1);
            const hygieneIsGood = ['good', 'excellent'].includes(hygieneVal.toLowerCase());
            const hygieneIsPoor = ['poor', 'bad'].includes(hygieneVal.toLowerCase());

            const findings = [
                {
                    param: 'Oral Hygiene',
                    finding: hygieneDisplay,
                    status: hygieneIsGood ? 'GOOD' : hygieneIsPoor ? 'POOR' : 'FAIR',
                    statusColor: hygieneIsGood ? '#2E7D32' : hygieneIsPoor ? '#C62828' : '#E65100',
                    statusBg: hygieneIsGood ? '#E8F5E9' : hygieneIsPoor ? '#FFEBEE' : '#FFF8E1',
                },
                {
                    param: 'Dental Caries',
                    finding: screening.caries ? 'Detected' : 'Not Detected',
                    status: screening.caries ? 'YES' : 'NO',
                    statusColor: screening.caries ? '#C62828' : '#2E7D32',
                    statusBg: screening.caries ? '#FFEBEE' : '#E8F5E9',
                },
                {
                    param: 'Gingivitis',
                    finding: screening.gingivitis ? 'Detected' : 'Not Detected',
                    status: screening.gingivitis ? 'YES' : 'NO',
                    statusColor: screening.gingivitis ? '#C62828' : '#2E7D32',
                    statusBg: screening.gingivitis ? '#FFEBEE' : '#E8F5E9',
                },
                {
                    param: 'Malocclusion',
                    finding: screening.malocclusion ? 'Detected' : 'Not Detected',
                    status: screening.malocclusion ? 'YES' : 'NO',
                    statusColor: screening.malocclusion ? '#E65100' : '#2E7D32',
                    statusBg: screening.malocclusion ? '#FFF8E1' : '#E8F5E9',
                },
            ];

            let rowY = tableTop + 20;
            findings.forEach((row, i) => {
                const rowBg = i % 2 === 0 ? '#FFFFFF' : '#F8F9FA';
                doc.rect(col1, rowY, tableWidth, 22).fill(rowBg);

                // Parameter name
                doc.fillColor('#222222').fontSize(9.5).font('Helvetica-Bold')
                    .text(row.param, col1 + 10, rowY + 5, { width: 170 });

                // Finding text
                doc.fillColor('#444444').font('Helvetica')
                    .text(row.finding, col2 + 10, rowY + 5, { width: 150 });

                // Colored status pill
                const pillX = col3 + 10;
                const pillW = 70;
                const pillH = 14;
                const pillY = rowY + 4;
                doc.rect(pillX, pillY, pillW, pillH).fill(row.statusBg);
                doc.fillColor(row.statusColor).fontSize(8.5).font('Helvetica-Bold')
                    .text(row.status, pillX, pillY + 2, { width: pillW, align: 'center' });

                rowY += 22;
            });

            doc.fillColor('#000000');
            doc.y = rowY + 8;

            // Other findings
            if (screening.other_findings) {
                doc.fontSize(9).font('Helvetica-Bold').fillColor('#333333').text('Other Findings:');
                doc.font('Helvetica').fillColor('#444444').text(screening.other_findings, { indent: 10 });
                doc.moveDown(0.4);
            }

            doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#DDDDDD').stroke();
            doc.strokeColor('#000000');
            doc.moveDown(0.8);

            // ── Treatment Recommendations ──
            doc.rect(50, doc.y, 495, 18).fill('#0D3B66');
            doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold')
                .text('TREATMENT RECOMMENDATIONS', 60, doc.y + 3);
            doc.fillColor('#000000');
            doc.y += 22;
            doc.moveDown(0.3);

            const treatments = Array.isArray(screening.treatments)
                ? screening.treatments
                : (screening.treatments ? JSON.parse(screening.treatments) : []);

            if (treatments.length > 0) {
                treatments.forEach((t, idx) => {
                    doc.rect(50, doc.y, 495, 18).fill(idx % 2 === 0 ? '#FFF8E1' : '#FFFFFF');
                    doc.fillColor('#333333').fontSize(9.5).font('Helvetica')
                        .text(`  ${idx + 1}.  ${t}`, 50, doc.y + 3, { width: 480 });
                    doc.y += 20;
                });
            } else {
                doc.rect(50, doc.y, 495, 22).fill('#E8F5E9');
                doc.fillColor('#2E7D32').fontSize(9.5).font('Helvetica-Bold')
                    .text('No immediate treatment required. Maintain good oral hygiene.', 60, doc.y + 5, { width: 470 });
                doc.y += 24;
            }
            doc.fillColor('#000000');
            doc.moveDown(0.8);

            // ── Screened By ──
            doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#DDDDDD').stroke();
            doc.strokeColor('#000000');
            doc.moveDown(0.6);

            const sigY = doc.y;
            doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#333333').text('Screened By:', 50, sigY);
            doc.font('Helvetica').fillColor('#000000').text(dentist ? dentist.name : 'N/A', 50, sigY + 14);
            doc.moveDown(2.5);
            doc.text('_______________________________', 50, doc.y);
            doc.fontSize(8.5).fillColor('#666666').text('Dentist Signature', 50, doc.y + 3);

            // Report ID on the right
            doc.fontSize(8).fillColor('#999999').font('Helvetica')
                .text(`Report ID: ${reportId}`, 350, sigY, { width: 195, align: 'right' })
                .text(`Version: ${version}`, 350, sigY + 12, { width: 195, align: 'right' })
                .text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 350, sigY + 24, { width: 195, align: 'right' });

            // ── Footer ──
            doc.fontSize(7.5).font('Helvetica').fillColor('#AAAAAA')
                .text(
                    'This report is generated digitally as part of a dental screening camp. It is not a substitute for a comprehensive dental examination. Please consult your dentist for treatment.',
                    50, 770,
                    { width: 495, align: 'center' }
                );

            doc.end();

            writeStream.on('finish', () => resolve(filePath));
            writeStream.on('error', reject);
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = { generatePDF, REPORTS_DIR };
