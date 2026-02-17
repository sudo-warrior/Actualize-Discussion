import axios from 'axios';
import FormData from 'form-data';
import type { Incident } from '@shared/schema';

const FOXIT_API_KEY = process.env.FOXIT_API_KEY || '';
const FOXIT_API_SECRET = process.env.FOXIT_API_SECRET || '';
const FOXIT_BASE_URL = 'https://api.foxit.com/v1';

// Generate PDF using Foxit Document Generation API
export async function generateIncidentPDF(incident: Incident): Promise<Buffer> {
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; line-height: 1.6; }
    h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px; }
    .meta { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb; }
    .section { margin: 25px 0; }
    .section h2 { color: #1f2937; font-size: 18px; margin-bottom: 12px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
    .critical { background: #fee2e2; color: #991b1b; border: 2px solid #991b1b; }
    .high { background: #fef3c7; color: #92400e; border: 2px solid #92400e; }
    .medium { background: #dbeafe; color: #1e40af; border: 2px solid #1e40af; }
    .low { background: #d1fae5; color: #065f46; border: 2px solid #065f46; }
    .evidence-item { background: #f9fafb; padding: 10px; margin: 8px 0; border-left: 3px solid #ef4444; font-family: monospace; font-size: 12px; }
    .step { background: #f9fafb; padding: 12px; margin: 8px 0; border-radius: 6px; border-left: 3px solid #3b82f6; }
    .step.completed { border-left-color: #10b981; background: #f0fdf4; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 11px; }
  </style>
</head>
<body>
  <h1>🚨 INCIDENT REPORT</h1>
  <h2>${incident.title}</h2>
  
  <div class="meta">
    <p><strong>Incident ID:</strong> ${incident.id}</p>
    <p><strong>Severity:</strong> <span class="badge ${incident.severity}">${incident.severity}</span></p>
    <p><strong>Status:</strong> ${incident.status.toUpperCase()}</p>
    <p><strong>Confidence:</strong> ${incident.confidence}%</p>
    <p><strong>Created:</strong> ${new Date(incident.createdAt).toLocaleString()}</p>
  </div>

  <div class="section">
    <h2>🔍 Root Cause</h2>
    <p>${incident.rootCause}</p>
  </div>

  <div class="section">
    <h2>🔧 Fix</h2>
    <p>${incident.fix}</p>
  </div>

  <div class="section">
    <h2>📋 Evidence</h2>
    ${incident.evidence.map(e => `<div class="evidence-item">${e.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`).join('')}
  </div>

  <div class="section">
    <h2>✅ Steps</h2>
    ${incident.nextSteps.map((step, i) => {
      const completed = (incident.completedSteps || []).includes(i);
      return `<div class="step ${completed ? 'completed' : ''}">
        ${completed ? '☑' : '☐'} <strong>Step ${i + 1}:</strong> ${step}
      </div>`;
    }).join('')}
  </div>

  <div class="footer">
    <p><strong>Incident Commander</strong> • ${new Date().toLocaleString()}</p>
    <p>Powered by Foxit PDF Services</p>
  </div>
</body>
</html>`;

  try {
    // Step 1: Generate PDF from HTML using Foxit Document Generation API
    const response = await axios.post(
      `${FOXIT_BASE_URL}/document/generate`,
      { html: htmlContent, options: { format: 'A4', printBackground: true } },
      {
        headers: {
          'Authorization': `Bearer ${FOXIT_API_KEY}`,
          'X-API-Secret': FOXIT_API_SECRET,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );
    
    let pdfBuffer = Buffer.from(response.data);
    
    // Step 2: Enhance PDF using Foxit PDF Services API
    // Add watermark
    pdfBuffer = await addWatermark(pdfBuffer, 'CONFIDENTIAL');
    
    // Make searchable
    pdfBuffer = await makeSearchable(pdfBuffer);
    
    return pdfBuffer;
  } catch (error: any) {
    console.error('Foxit API error:', error.response?.data || error.message);
    return generateFallbackPDF(incident);
  }
}

// Add watermark using Foxit PDF Services API
async function addWatermark(pdfBuffer: Buffer, text: string): Promise<Buffer> {
  try {
    const formData = new FormData();
    formData.append('file', pdfBuffer, 'incident.pdf');
    formData.append('watermark', JSON.stringify({
      text,
      opacity: 0.3,
      rotation: 45,
      fontSize: 48,
      color: '#cccccc'
    }));
    
    const response = await axios.post(
      `${FOXIT_BASE_URL}/pdf/watermark`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${FOXIT_API_KEY}`,
          'X-API-Secret': FOXIT_API_SECRET,
          ...formData.getHeaders()
        },
        responseType: 'arraybuffer'
      }
    );
    
    return Buffer.from(response.data);
  } catch (error) {
    console.error('Watermark error:', error);
    return pdfBuffer;
  }
}

// Make PDF searchable using Foxit OCR
async function makeSearchable(pdfBuffer: Buffer): Promise<Buffer> {
  try {
    const formData = new FormData();
    formData.append('file', pdfBuffer, 'incident.pdf');
    formData.append('language', 'en');
    
    const response = await axios.post(
      `${FOXIT_BASE_URL}/pdf/ocr`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${FOXIT_API_KEY}`,
          'X-API-Secret': FOXIT_API_SECRET,
          ...formData.getHeaders()
        },
        responseType: 'arraybuffer'
      }
    );
    
    return Buffer.from(response.data);
  } catch (error) {
    console.error('OCR error:', error);
    return pdfBuffer;
  }
}

// Merge multiple incident PDFs
export async function mergeIncidentPDFs(incidents: Incident[]): Promise<Buffer> {
  try {
    const formData = new FormData();
    
    // Generate PDFs for each incident
    for (let i = 0; i < incidents.length; i++) {
      const pdfBuffer = await generateIncidentPDF(incidents[i]);
      formData.append('files', pdfBuffer, `incident-${i}.pdf`);
    }
    
    const response = await axios.post(
      `${FOXIT_BASE_URL}/pdf/merge`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${FOXIT_API_KEY}`,
          'X-API-Secret': FOXIT_API_SECRET,
          ...formData.getHeaders()
        },
        responseType: 'arraybuffer'
      }
    );
    
    return Buffer.from(response.data);
  } catch (error: any) {
    console.error('Merge error:', error.response?.data || error.message);
    throw new Error('Failed to merge PDFs');
  }
}

async function generateFallbackPDF(incident: Incident): Promise<Buffer> {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let y = 800;
  page.drawText('INCIDENT REPORT', { x: 50, y, size: 24, font: boldFont, color: rgb(0.15, 0.38, 0.92) });
  y -= 40;
  page.drawText(incident.title, { x: 50, y, size: 16, font: boldFont });
  y -= 30;
  page.drawText(`Severity: ${incident.severity.toUpperCase()}`, { x: 50, y, size: 12, font });
  y -= 20;
  page.drawText(`Confidence: ${incident.confidence}%`, { x: 50, y, size: 12, font });
  y -= 30;
  page.drawText('ROOT CAUSE', { x: 50, y, size: 14, font: boldFont });
  y -= 20;
  page.drawText(incident.rootCause.substring(0, 200), { x: 50, y, size: 10, font, maxWidth: 500 });
  
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
