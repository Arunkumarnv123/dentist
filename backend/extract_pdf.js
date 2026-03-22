const PDFParser = require('pdf2json');
const fs = require('fs');

function extractPDF(filePath, outputPath) {
    return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser();

        pdfParser.on('pdfParser_dataError', errData => {
            reject(errData.parserError);
        });

        pdfParser.on('pdfParser_dataReady', pdfData => {
            const text = pdfParser.getRawTextContent();
            fs.writeFileSync(outputPath, text);
            console.log(outputPath + ' extracted, length: ' + text.length);
            resolve(text);
        });

        pdfParser.loadPDF(filePath);
    });
}

async function main() {
    try {
        await extractPDF(
            'd:/ANGULAR/docter aapointment and tracking/frontend/healthfirst_dental_camp_PRD.pdf',
            'd:/ANGULAR/docter aapointment and tracking/prd.txt'
        );
        await extractPDF(
            'd:/ANGULAR/docter aapointment and tracking/frontend/healthfirst_dental_platform_full_spec.pdf',
            'd:/ANGULAR/docter aapointment and tracking/spec.txt'
        );
        console.log('Both PDFs extracted successfully');
    } catch (e) {
        console.log('Error:', e);
    }
}

main();
