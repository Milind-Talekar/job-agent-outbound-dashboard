import 'dotenv/config'; // Loads environment variables from your .env file
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname for ES Modules configuration environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

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

// 1. DYNAMIC ATS SCORE COMPUTATION
app.post('/api/ats-check', (req, res) => {
  const { jdText } = req.body;
  if (!jdText) {
    return res.json({ score: 0, matchedKeywords: [], missingKeywords: [] });
  }

  // Read your local resume keywords file
  let resumeText = "";
  try {
    if (fs.existsSync(RESUME_TEXT_PATH)) {
      resumeText = fs.readFileSync(RESUME_TEXT_PATH, 'utf8').toLowerCase();
    }
  } catch (err) {
    console.error("Could not load local resume file metrics:", err);
  }

  // Definitive dictionary of QA skills to look for inside the Job Description
  const QA_SKILL_DICTIONARY = [
      // --- Testing Skills ---
      "manual testing", "automated testing", "functional testing", "integration testing", 
      "smoke testing", "sanity testing", "regression testing", "test case design", 
      "test case execution", "api testing", "database testing", "mobile app testing", 
      "android testing", "ios testing", "bdd", "cucumber", "gherkin", "selenium", 
      "webdriver", "selenium webdriver", "playwright", "appium", "rest-assured", 
      "rest assured", "agile", "scrum", "visual ai testing", "security testing", 
      "security testing fundamentals", "end to end testing",

      // --- Programming Languages & Tools ---
      "java", "typescript", "sql server", "mysql", "mongodb", "postman", "soap ui", 
      "apache jmeter", "jmeter", "jenkins", "git", "github", "bitbucket", "gitlab", "ci/cd",
      "browserstack", "headspin", "ide", "android studio", "visual studio code", "vs code", 
      "eclipse", "intellij", "pycharm", "mantis", "jira", "confluence", "testrail", "zephyr",

      // --- Log Analysis ---
      "log analysis", "droove logs", "elastic search", "echo", "redux", "chucker logs",

      // --- AI Tools ---
      "ai tools", "phonepe agenthub", "agenthub", "wingman ai", "testim.io", "opencode ai", 
      "chatgpt", "google gemini", "gemini", "copilot ai", "prompt engineering",

      // --- Soft Skills ---
      "critical thinking", "ai validation", "complex problem solving", 
      "stakeholder management", "data-driven analysis", "explaining risk"
    ];

  const matchedKeywords = [];
  const missingKeywords = [];

  // Clean the job description text for safe, case-insensitive keyword checking
  const cleanJdText = jdText.toLowerCase().replace(/[#\/]/g, ' ');

  // Find which dictionary skills exist in the JD, then check your resume
  QA_SKILL_DICTIONARY.forEach(skill => {
    const jdRegex = new RegExp(`\\b${skill}\\b`, 'i');
    
    if (cleanJdText.match(jdRegex)) {
      const resumeRegex = new RegExp(`\\b${skill}\\b`, 'i');
      
      if (resumeText.match(resumeRegex)) {
        matchedKeywords.push(skill.toUpperCase());
      } else {
        missingKeywords.push(skill.toUpperCase());
      }
    }
  });

  // Calculate accurate percentage base score
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
  const { toEmail, subject, body, companyName, jobTitle, atsScore } = appReq.body;
  
  // Safely extract environment keys
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  // Dynamically initialize the OAuth2 client using credentials from .env
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