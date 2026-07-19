import 'dotenv/config'; // Loads environment variables from your .env file
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai'; // Added Google Gemini AI SDK

// Fix __dirname for ES Modules configuration environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Initialize the Gemini client using the environment variable
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const RESUME_TEXT_PATH = '/Users/milindtalekar/Downloads/Job_Dashboard_using_Gemini/resume_keywords.txt'; 
const RESUME_PDF_PATH = '/Users/milindtalekar/Documents/MOOLYA/Milind_Talekar_QA_PhonePe_2026.pdf'; 
const TRACKER_DB_PATH = path.resolve('./applications_log.json');

// Dedicated ledger helper tracking exact data points
function logApplicationData(entry) {
  let logs = [];
  if (fs.existsSync(TRACKER_DB_PATH)) {
    try {
      logs = JSON.parse(fs.readFileSync(TRACKER_DB_PATH, 'utf-8'));
    } catch (e) {
      console.error("⚠️ Error reading ledger, resetting storage.");
    }
  }
  logs.push(entry);
  fs.writeFileSync(TRACKER_DB_PATH, JSON.stringify(logs, null, 2), 'utf-8');
}

// 1. DYNAMIC AI-DRIVEN ATS SCORE COMPUTATION
app.post('/api/ats-check', async (req, res) => {
  const { jdText } = req.body;
  if (!jdText) {
    return res.json({ score: 0, matchedKeywords: [], missingKeywords: [] });
  }

  // Read local resume keywords file
  let resumeText = "";
  try {
    if (fs.existsSync(RESUME_TEXT_PATH)) {
      resumeText = fs.readFileSync(RESUME_TEXT_PATH, 'utf8').toLowerCase();
    }
  } catch (err) {
    console.error("Could not load local resume file metrics:", err);
  }

  // Declare variable outside the try block to fix the ReferenceError scope bug
  let aiResponse;

  try {
    // Structural engineer prompt forcing clean JSON extraction
    const systemPrompt = `
      You are an expert ATS (Applicant Tracking System) parser specialized in software engineering and QA Automation.
      Analyze the following Job Description and extract a list of core technical skills, frameworks, testing concepts, and tools required for the job.
      
      CRITICAL INSTRUCTIONS:
      - Clean the output and only extract high-value professional keywords (e.g., "Playwright", "API Testing", "SDLC", "Postman", "CI/CD").
      - Return the result ONLY as a valid, raw JSON array of strings. Do not include markdown blocks, text wrappers, formatting, or extra dialogue.
      
      Example expected output structure:
      ["PLAYWRIGHT", "TEST AUTOMATION", "API TESTING", "POSTMAN", "SDLC", "JIRA"]
      
      Job Description:
      ${jdText}
    `;

    console.log("🤖 Sending request to Gemini...");

    // Send context query payload directly to Gemini
    aiResponse = await ai.models.generateContent({
      model: 'gemini-3.5-flash', 
      contents: systemPrompt,
      config: {
        responseMimeType: "application/json"
      }
    });

  } catch (error) {
    console.error("❌ Gemini API Error Handled:", error.message);
    
    // Explicitly handle free tier quota restrictions safely
    if (error.status === 429) {
      return res.status(429).json({ 
        score: 0, 
        matchedKeywords: [], 
        missingKeywords: [], 
        error: "You've exceeded the free request limits. Please wait a minute and try again." 
      });
    }
    
    return res.status(500).json({ 
      score: 0, 
      matchedKeywords: [], 
      missingKeywords: [], 
      error: error.message 
    });
  }

  // Processing steps continue safely outside the API fetch block
  const rawText = aiResponse.text.trim();
  console.log("📥 Raw response from Gemini:", rawText);

  // Parse AI-generated keyword array
  let extractedKeywords = [];
  try {
    extractedKeywords = JSON.parse(rawText);
    if (!Array.isArray(extractedKeywords) && extractedKeywords.keywords) {
      extractedKeywords = extractedKeywords.keywords;
    }
  } catch (parseError) {
    console.log("⚠️ Fallback cleaning markdown blocks for parser...");
    const cleanJsonString = rawText.replace(/```json|```/g, "").trim();
    extractedKeywords = JSON.parse(cleanJsonString);
  }
  
  const matchedKeywords = [];
  const missingKeywords = [];

  // Map extracted elements over local text logs
  if (Array.isArray(extractedKeywords)) {
    extractedKeywords.forEach(keyword => {
      const cleanKeyword = keyword.trim().toLowerCase();
      if (!cleanKeyword) return;

      // Escape dynamic string values to prevent regex pattern breaks
      const escapedKeyword = cleanKeyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const resumeRegex = new RegExp(`\\b${escapedKeyword}\\b|${escapedKeyword}`, 'i');

      if (resumeText.match(resumeRegex)) {
        matchedKeywords.push(keyword.toUpperCase());
      } else {
        missingKeywords.push(keyword.toUpperCase());
      }
    });
  }

  // Calculate dynamic percentage metric bases
  let score = 0;
  const totalKeywords = matchedKeywords.length + missingKeywords.length;

  if (matchedKeywords.length > 0 && totalKeywords > 0) {
    score = Math.round((matchedKeywords.length / totalKeywords) * 100);
  }

  res.json({
    score: score,
    matchedKeywords: matchedKeywords,
    missingKeywords: missingKeywords
  });
});

// 2. LIVE ROUTING ENVIRONMENT WITH DYNAMIC CAPTURE 
app.post('/api/send-email', async (appReq, appRes) => {
  if (!appReq.body || Object.keys(appReq.body).length === 0) {
    return appRes.status(400).json({ 
      success: false, 
      error: "Transmission payload undefined. Verify frontend application JSON configuration headers." 
    });
  }

  const { toEmail, subject, body, companyName, jobTitle, atsScore } = appReq.body;
  
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'http://localhost:3001'
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  try {
    if (!fs.existsSync(RESUME_PDF_PATH)) {
      return appRes.status(400).json({ success: false, error: "Resume document asset could not be read." });
    }
    
    const attachmentBinary = fs.readFileSync(RESUME_PDF_PATH);
    const filename = 'Milind_Talekar_Resume.pdf';
    const boundary = "xxxx_boundary_xxxx";

    const rawMessage = [
      `From: "Milind Talekar" <milindtalekar1221@gmail.com>`,
      `To: ${toEmail}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      body,
      ``,
      `--${boundary}`,
      `Content-Type: application/pdf; name="${filename}"`,
      `Content-Disposition: attachment; filename="${filename}"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      attachmentBinary.toString('base64'),
      `--${boundary}--`
    ].join('\r\n');

    const encodedEmail = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const sent = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedEmail }
    });

    const currentTimestamp = new Date().toISOString();

    logApplicationData({
      timestamp: currentTimestamp,
      role: jobTitle || "QA Engineer",
      company: companyName || "Unknown Company",
      recipientEmail: toEmail || "milindtalekar1221@gmail.com",
      atsScore: atsScore || 0,
      status: "Applied (emailed) - manual send",
      appliedDate: currentTimestamp,
      followUpCount: "0 / 5",
      interviewDone: false, 
      interviewRound: 0, 
      googleThreadId: sent.data.threadId
    });

    appRes.json({ success: true, messageId: sent.data.id, threadId: sent.data.threadId });

  } catch (error) {
    console.error(error);
    appRes.status(500).json({ success: false, error: error.message });
  }
});

// 3. RETRIEVE LEDGER RECORDS FOR RENDERING
app.get('/api/applications', (appReq, appRes) => {
  if (!fs.existsSync(TRACKER_DB_PATH)) return appRes.json([]);
  try {
    const logs = JSON.parse(fs.readFileSync(TRACKER_DB_PATH, 'utf-8'));
    appRes.json(logs);
  } catch (e) {
    appRes.json([]);
  }
});

// 4. INTERVIEW BUTTON TOGGLE MUTATION HANDLER
app.post('/api/applications/toggle-interview', (req, res) => {
  const { timestamp } = req.body;

  try {
    if (fs.existsSync(TRACKER_DB_PATH)) {
      let logs = JSON.parse(fs.readFileSync(TRACKER_DB_PATH, 'utf-8'));
      
      logs = logs.map(app => {
        if (app.timestamp === timestamp) {
          return { ...app, interviewDone: !app.interviewDone };
        }
        return app;
      });
      
      fs.writeFileSync(TRACKER_DB_PATH, JSON.stringify(logs, null, 2), 'utf-8');
      return res.sendStatus(200);
    }
    res.status(404).send("Ledger tracking base node mapping index missing.");
  } catch (error) {
    console.error("Error updating interview status:", error);
    res.status(500).send("Internal Server Error");
  }
});

// 5. PURGE REJECTION OR UNWANTED ENTRIES
app.post('/api/applications/delete', (req, res) => {
  const { timestamp } = req.body;
  if (!fs.existsSync(TRACKER_DB_PATH)) return res.sendStatus(404);
  
  try {
    let logs = JSON.parse(fs.readFileSync(TRACKER_DB_PATH, 'utf-8'));
    logs = logs.filter(app => app.timestamp !== timestamp);
    fs.writeFileSync(TRACKER_DB_PATH, JSON.stringify(logs, null, 2), 'utf-8');
    res.sendStatus(200);
  } catch (err) {
    res.status(500).send("Failed to execute purge array modification sequence.");
  }
});

// 6. UPDATE INTERVIEW ROUND COUNT
app.post('/api/applications/update-round', (req, res) => {
  const { timestamp, action } = req.body; 

  try {
    if (fs.existsSync(TRACKER_DB_PATH)) {
      let logs = JSON.parse(fs.readFileSync(TRACKER_DB_PATH, 'utf-8'));
      
      logs = logs.map(app => {
        if (app.timestamp === timestamp) {
          let currentRounds = app.interviewRound || 0;
          if (action === 'increment') currentRounds += 1;
          if (action === 'decrement' && currentRounds > 0) currentRounds -= 1;
          
          return { ...app, interviewRound: currentRounds };
        }
        return app;
      });
      
      fs.writeFileSync(TRACKER_DB_PATH, JSON.stringify(logs, null, 2), 'utf-8');
      return res.sendStatus(200);
    }
    res.status(404).send("Database node missing.");
  } catch (error) {
    console.error("Error modifying interview round:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(3001, () => console.log('⚡ Server Running on Port 3001'));