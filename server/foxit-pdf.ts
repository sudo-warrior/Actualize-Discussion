import axios from 'axios';
import FormData from 'form-data';
import type { Incident } from '@shared/schema';

const FOXIT_API_KEY = (process.env.FOXIT_API_KEY || '').trim();
const FOXIT_API_SECRET = (process.env.FOXIT_API_SECRET || '').trim();
const FOXIT_BASE_URL = 'https://na1.fusion.foxit.com';

// Helper for Foxit Fusion Auth Headers
const getHeaders = (extra = {}) => ({
  'client_id': FOXIT_API_KEY,
  'client_secret': FOXIT_API_SECRET,
  ...extra
});

// Helper to poll task status
async function pollTask(taskId: string): Promise<string> {
  const maxRetries = 30; // 60 seconds total with 2s interval
  let retries = 0;

  while (retries < maxRetries) {
    const response = await axios.get(`${FOXIT_BASE_URL}/pdf-services/api/tasks/${taskId}`, {
      headers: getHeaders()
    });

    const { status, resultDocumentId, errorTitle, errorDetail } = response.data;

    if (status === 'COMPLETED') return resultDocumentId;
    if (status === 'FAILED') {
      throw new Error(`Foxit Task Failed: ${errorTitle || 'Unknown Error'} - ${errorDetail || ''}`);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    retries++;
  }
  throw new Error('Foxit Task Timeout');
}

// Helper to download document
async function downloadDocument(documentId: string): Promise<Buffer> {
  const response = await axios.get(`${FOXIT_BASE_URL}/pdf-services/api/documents/${documentId}/download`, {
    headers: getHeaders(),
    responseType: 'arraybuffer'
  });
  return Buffer.from(response.data);
}

// Helper to upload document
async function uploadDocument(pdfBuffer: Buffer, filename: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', pdfBuffer, { filename });

  const response = await axios.post(`${FOXIT_BASE_URL}/pdf-services/api/documents/upload`, formData, {
    headers: getHeaders(formData.getHeaders())
  });

  return response.data.documentId;
}

// Generate PDF using Foxit Document Generation API
export async function generateIncidentPDF(incident: Incident): Promise<Buffer> {
  if (!FOXIT_API_KEY || !FOXIT_API_SECRET) {
    throw new Error('Foxit API credentials (FOXIT_API_KEY, FOXIT_API_SECRET) are not configured.');
  }

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
    // Step 1: Upload HTML content
    const htmlBuffer = Buffer.from(htmlContent);
    const htmlDocId = await uploadDocument(htmlBuffer, 'incident.html');

    // Step 2: Submit HTML to PDF task
    const submitResponse = await axios.post(
      `${FOXIT_BASE_URL}/pdf-services/api/documents/create/pdf-from-html`,
      { documentId: htmlDocId },
      { headers: getHeaders({ 'Content-Type': 'application/json' }) }
    );

    const docId = await pollTask(submitResponse.data.taskId);
    let pdfBuffer = await downloadDocument(docId);

    // Step 2: Add Watermark (Async)
    pdfBuffer = await addWatermark(pdfBuffer, 'CONFIDENTIAL');

    // Step 3: OCR (Async)
    pdfBuffer = await makeSearchable(pdfBuffer);

    return pdfBuffer;
  } catch (error: any) {
    const errorData = error.response?.data
      ? JSON.stringify(error.response.data, null, 2)
      : error.message;
    console.error('Foxit API error:', errorData);
    throw new Error(`PDF generation failed: ${errorData}`);
  }
}

async function addWatermark(pdfBuffer: Buffer, text: string): Promise<Buffer> {
  try {
    const documentId = await uploadDocument(pdfBuffer, 'incident.pdf');

    const submitResponse = await axios.post(
      `${FOXIT_BASE_URL}/pdf-services/api/documents/enhance/pdf-watermark`,
      {
        documentId,
        config: {
          content: text,
          type: 'TEXT',
          opacity: 60,
          rotation: 45,
          fontSize: 48,
          color: '#CCCCCC',
          pageRanges: 'all'
        }
      },
      { headers: getHeaders({ 'Content-Type': 'application/json' }) }
    );

    const resultDocId = await pollTask(submitResponse.data.taskId);
    return await downloadDocument(resultDocId);
  } catch (error: any) {
    if (error.response?.data) {
      console.error('Watermark API error details:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Watermark error:', error.message);
    }
    return pdfBuffer;
  }
}

async function makeSearchable(pdfBuffer: Buffer): Promise<Buffer> {
  try {
    const documentId = await uploadDocument(pdfBuffer, 'incident.pdf');

    // Attempting to find the correct OCR/Analyze config
    const submitResponse = await axios.post(
      `${FOXIT_BASE_URL}/pdf-services/api/documents/analyze/pdf-ocr`,
      {
        documentId,
        config: {
          languages: ['en-US'],
          pageRanges: 'all'
        }
      },
      { headers: getHeaders({ 'Content-Type': 'application/json' }) }
    );

    const resultDocId = await pollTask(submitResponse.data.taskId);
    return await downloadDocument(resultDocId);
  } catch (error: any) {
    if (error.response?.data) {
      console.error('OCR API error details:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('OCR execution error:', error.message);
    }
    return pdfBuffer;
  }
}

export async function mergeIncidentPDFs(incidents: Incident[]): Promise<Buffer> {
  try {
    const documentIds: string[] = [];
    for (const incident of incidents) {
      const pdfBuffer = await generateIncidentPDF(incident);
      const docId = await uploadDocument(pdfBuffer, `incident-${incident.id}.pdf`);
      documentIds.push(docId);
    }

    const submitResponse = await axios.post(
      `${FOXIT_BASE_URL}/pdf-services/api/documents/enhance/pdf-combine`,
      { documentIds },
      { headers: getHeaders({ 'Content-Type': 'application/json' }) }
    );

    const resultDocId = await pollTask(submitResponse.data.taskId);
    return await downloadDocument(resultDocId);
  } catch (error: any) {
    console.error('Merge error:', error.message);
    throw new Error('Failed to merge PDFs');
  }
}

