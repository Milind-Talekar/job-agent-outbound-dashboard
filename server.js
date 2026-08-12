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
const SNIPPETS_DB_PATH = path.resolve('./email_snippets.json');

// Helper to load snippets database with built-in deduplication and seed array
function getUniqueSnippets() {
  const sharedApplicationBody = `<div style="font-family: Verdana, Geneva, sans-serif; font-size: 14px; line-height: 1.7; color: #1a1a1a;">
Hello {{Recruiter Name}},<br><br>
I hope this message finds you well.<br><br>
I am writing to apply for the position of <b>{{Position Name}}</b> profile.<br>
My experience and qualification are closely matching with the job responsibilities mentioned in the advertisement.<br><br>
I have 5.4 years of experience in Information Technology, specializing in Software Quality Assurance Testing.<br>
<b>I am an Immediate Joiner.</b><br><br>
Attached is my resume, which provides further insight into my professional experience and qualifications.<br><br>
Thank you for considering my application. I look forward to the opportunity to discuss how I can contribute to your team.<br><br>
Thanks and Regards,<br>
Milind Talekar<br>
+91- 8208132705
</div>`;

  const initialTemplates = [
    { id: "seed_1", subject: "Job Reference | {{Job Portal Name}} | {{Position Name}} | Milind Talekar", body: sharedApplicationBody },
    { id: "seed_2", subject: "Job Application | {{Position Name}} | Milind Talekar", body: sharedApplicationBody }
  ];

  if (!fs.existsSync(SNIPPETS_DB_PATH)) {
    fs.writeFileSync(SNIPPETS_DB_PATH, JSON.stringify(initialTemplates, null, 2), 'utf-8');
    return initialTemplates;
  }

  try {
    const data = JSON.parse(fs.readFileSync(SNIPPETS_DB_PATH, 'utf-8'));
    return Array.isArray(data) ? data : initialTemplates;
  } catch (e) {
    return initialTemplates;
  }
}

// Helper to push a unique snippet safely with strict duplicate validations
function saveUniqueSnippet(subject, body) {
  if (!subject || !body) return false;

  const currentSnippets = getUniqueSnippets();
  const cleanSubject = subject.trim().toLowerCase();
  const cleanBody = body.trim().toLowerCase();

  const isDuplicate = currentSnippets.some(snip => 
    snip.subject.trim().toLowerCase() === cleanSubject || 
    snip.body.trim().toLowerCase() === cleanBody
  );

  if (isDuplicate) {
    console.log("ℹ️ Snippet already registered. Skipping save step to preserve database uniqueness.");
    return false;
  }

  const newSnippet = {
    id: "snip_" + Date.now(),
    subject: subject.trim(),
    body: body.trim()
  };

  currentSnippets.push(newSnippet);
  fs.writeFileSync(SNIPPETS_DB_PATH, JSON.stringify(currentSnippets, null, 2), 'utf-8');
  console.log("✅ New unique outreach snippet successfully stored.");
  return true;
}

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

  let resumeText = "";
  try {
    if (fs.existsSync(RESUME_TEXT_PATH)) {
      resumeText = fs.readFileSync(RESUME_TEXT_PATH, 'utf8').toLowerCase();
    }
  } catch (err) {
    console.error("Could not load local resume file metrics:", err);
  }

  let aiResponse;

  try {
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

    aiResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: systemPrompt,
      config: { responseMimeType: "application/json" }
    });

  } catch (error) {
    console.error("❌ Gemini API Error Handled:", error.message);
    if (error.status === 429) {
      return res.status(429).json({ 
        score: 0, matchedKeywords: [], missingKeywords: [], 
        error: "You've exceeded the free request limits. Please wait a minute and try again." 
      });
    }
    return res.status(500).json({ 
      score: 0, matchedKeywords: [], missingKeywords: [], error: error.message 
    });
  }

  const rawText = aiResponse.text.trim();
  let extractedKeywords = [];
  try {
    extractedKeywords = JSON.parse(rawText);
    if (!Array.isArray(extractedKeywords) && extractedKeywords.keywords) {
      extractedKeywords = extractedKeywords.keywords;
    }
  } catch (parseError) {
    const cleanJsonString = rawText.replace(/```json|```/g, "").trim();
    extractedKeywords = JSON.parse(cleanJsonString);
  }
  
  const matchedKeywords = [];
  const missingKeywords = [];

  if (Array.isArray(extractedKeywords)) {
    extractedKeywords.forEach(keyword => {
      const cleanKeyword = keyword.trim().toLowerCase();
      if (!cleanKeyword) return;

      const escapedKeyword = cleanKeyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const resumeRegex = new RegExp(`\\b${escapedKeyword}\\b|${escapedKeyword}`, 'i');

      if (resumeText.match(resumeRegex)) {
        matchedKeywords.push(keyword.toUpperCase());
      } else {
        missingKeywords.push(keyword.toUpperCase());
      }
    });
  }

  let score = 0;
  const totalKeywords = matchedKeywords.length + missingKeywords.length;
  if (matchedKeywords.length > 0 && totalKeywords > 0) {
    score = Math.round((matchedKeywords.length / totalKeywords) * 100);
  }

  res.json({ score: score, matchedKeywords: matchedKeywords, missingKeywords: missingKeywords });
});

// 2. LIVE ROUTING ENVIRONMENT - DYNAMIC EMAIL EXTRACTION & SNIPPET CAPTURE
app.post('/api/send-email', async (appReq, appRes) => {
  if (!appReq.body || Object.keys(appReq.body).length === 0) {
    return appRes.status(400).json({ 
      success: false, error: "Transmission payload undefined. Verify frontend configuration." 
    });
  }

  const { toEmail, subject, body, companyName, jobTitle, atsScore } = appReq.body;
  
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, 'http://localhost:3001');
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  try {
    if (!fs.existsSync(RESUME_PDF_PATH)) {
      return appRes.status(400).json({ success: false, error: "Resume document asset could not be read." });
    }
    
    saveUniqueSnippet(subject, body);

    const attachmentBinary = fs.readFileSync(RESUME_PDF_PATH);
    const filename = 'Milind_Talekar_Resume.pdf';
    const boundary = "xxxx_boundary_xxxx";

    const rawMessage = [
      `From: "Milind Talekar" <milindstalekar1667@gmail.com>`,
      `To: ${toEmail}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      body.replace(/\n/g, '<br>'),
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
      recipientEmail: toEmail || "milindstalekar1667@gmail.com",
      atsScore: atsScore || 0,
      status: "Emailed",
      appliedDate: currentTimestamp,
      followUpCount: "0 / 5",
      interviewDone: false, 
      interviewRound: 0, 
      googleThreadId: sent.data.threadId,
      applicationSource: "email"
    });

    appRes.json({ success: true, messageId: sent.data.id, threadId: sent.data.threadId });

  } catch (error) {
    console.error(error);
    appRes.status(500).json({ success: false, error: error.message });
  }
});

// Manual Recruiter Call / Direct Application Logging Endpoint
app.post('/api/applications/manual-log', (req, res) => {
  const { companyName, jobTitle, recipientEmail, appliedDate, applicationSource } = req.body;
  
  if (!companyName || !jobTitle) {
    return res.status(400).json({ success: false, error: "Company and Role are required." });
  }

  const currentTimestamp = new Date().toISOString();

  const newEntry = {
    timestamp: currentTimestamp,
    role: jobTitle,
    company: companyName,
    recipientEmail: recipientEmail || "Phone Direct",
    atsScore: 100, 
    status: "Phone Call",
    appliedDate: appliedDate ? new Date(appliedDate).toISOString() : currentTimestamp,
    followUpCount: "0 / 5",
    interviewDone: true, 
    interviewRound: 1,
    applicationSource: applicationSource || "phone"
  };

  logApplicationData(newEntry);
  res.json({ success: true, entry: newEntry });
});

app.get('/api/snippets', (req, res) => {
  const list = getUniqueSnippets();
  res.json(list);
});

app.post('/api/snippets/save', (req, res) => {
  const { subject, body } = req.body;
  if (!subject || !body) {
    return res.status(400).json({ success: false, error: "Subject and Body elements are required." });
  }
  const wasSaved = saveUniqueSnippet(subject, body);
  res.json({ success: true, storedNewUnique: wasSaved });
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
        if (app.timestamp === timestamp) return { ...app, interviewDone: !app.interviewDone };
        return app;
      });
      fs.writeFileSync(TRACKER_DB_PATH, JSON.stringify(logs, null, 2), 'utf-8');
      return res.sendStatus(200);
    }
    res.status(404).send("Ledger tracking base node mapping index missing.");
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

app.post('/api/applications/toggle-source', (req, res) => {
  const { timestamp, source } = req.body;
  try {
    if (fs.existsSync(TRACKER_DB_PATH)) {
      let logs = JSON.parse(fs.readFileSync(TRACKER_DB_PATH, 'utf-8'));
      logs = logs.map(app => {
        if (app.timestamp === timestamp) {
          const nextSource = source || (app.applicationSource === 'phone' ? 'email' : 'phone');
          return { ...app, applicationSource: nextSource };
        }
        return app;
      });
      fs.writeFileSync(TRACKER_DB_PATH, JSON.stringify(logs, null, 2), 'utf-8');
      return res.sendStatus(200);
    }
    res.status(404).send("Ledger tracking base node mapping index missing.");
  } catch (error) {
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
    res.status(500).send("Internal Server Error");
  }
});

// Update application record ledger endpoint
app.post('/api/applications/update', (req, res) => {
  const { timestamp, role, company, recipientEmail, atsScore } = req.body;
  
  if (!timestamp) {
    return res.status(400).json({ success: false, error: "Timestamp identifier is required for updates." });
  }

  try {
    if (fs.existsSync(TRACKER_DB_PATH)) {
      let logs = JSON.parse(fs.readFileSync(TRACKER_DB_PATH, 'utf-8'));
      logs = logs.map(app => {
        if (app.timestamp === timestamp) {
          return {
            ...app,
            role: role !== undefined ? role : app.role,
            company: company !== undefined ? company : app.company,
            recipientEmail: recipientEmail !== undefined ? recipientEmail : app.recipientEmail,
            atsScore: atsScore !== undefined ? Number(atsScore) : app.atsScore
          };
        }
        return app;
      });
      fs.writeFileSync(TRACKER_DB_PATH, JSON.stringify(logs, null, 2), 'utf-8');
      return res.json({ success: true });
    }
    res.status(404).json({ success: false, error: "Database ledger file missing." });
  } catch (error) {
    console.error("Failed to update application record:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(3001, () => {
  console.log('⚡ Server Running on Port 3001');
  getUniqueSnippets();
});