import "dotenv/config";
import { generateIncidentPDF } from '../server/foxit-pdf';
import type { Incident } from '../shared/schema';

const mockIncident: Incident = {
    id: 'test-id-' + Math.random().toString(36).substring(7),
    userId: 'test-user',
    title: 'Async Test Incident',
    severity: 'medium',
    status: 'analyzing',
    confidence: 85,
    rawLogs: 'System alert: unusual activity detected.',
    rootCause: 'Database connection spike due to unoptimized query.',
    fix: 'Applied query optimization and indexed the target column.',
    evidence: ['log line 404', 'spike at 12:00'],
    nextSteps: ['Monitor DB performance', 'Refactor query'],
    completedSteps: [0],
    createdAt: new Date(),
    stepGuidance: []
};

async function testAsyncFoxit() {
    console.log('Testing Async Foxit Fusion PDF generation...');

    if (!process.env.FOXIT_API_KEY || !process.env.FOXIT_API_SECRET) {
        console.error('❌ FAIL: Missing Foxit credentials in .env');
        process.exit(1);
    }

    try {
        const start = Date.now();
        const pdfBuffer = await generateIncidentPDF(mockIncident);
        const duration = (Date.now() - start) / 1000;

        console.log(`✅ SUCCESS: PDF generated in ${duration.toFixed(1)}s`);
        console.log(`   Buffer size: ${pdfBuffer.length} bytes`);

        // Check for PDF signature
        if (pdfBuffer.slice(0, 4).toString() === '%PDF') {
            console.log('   ✅ Valid PDF header found.');
        } else {
            console.error('   ❌ FAIL: Invalid PDF header.');
            process.exit(1);
        }

        process.exit(0);
    } catch (error: any) {
        console.error('❌ FAIL: PDF generation failed:', error.message);
        process.exit(1);
    }
}

testAsyncFoxit();
