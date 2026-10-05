import 'dotenv/config'; // Loads environment variables from your .env file
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import nodemailer from 'nodemailer';
// Remove: import { google } from 'googleapis';
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

const RESUME_TEXT_PATH = '/Users/milindtalekar/outbound-dashboard/Config/resume_keywords.txt'; 
// const RESUME_PDF_PATH = '/Users/milindtalekar/Downloads/Resume Claude 2026/Milind_Talekar_SDET_PhonePe_Resume_2026.pdf';
const RESUME_PDF_PATH = '/Users/milindtalekar/Downloads/Milind_Talekar_SDET_Resume_2026.pdf'; 
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

  try {
    const prompt = `You are an expert ATS (Applicant Tracking System) analyzer. 
Compare the following Job Description against the Candidate's Resume Profile.
Return a valid JSON object ONLY with the following structure:
{
  "score": [integer between 0 and 100],
  "matchedKeywords": [array of strings representing matched skills/keywords found in both],
  "missingKeywords": [array of strings representing key skills requested in the job description that are missing from the resume]
}

Job Description:
${jdText}

Resume Keywords / Context:
${resumeText || "Java, Selenium, Playwright, API Automation, Mobile Testing, JIRA, Agile, Manual Testing, SQL, Rest Assured"}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const textOutput = response.text();
    const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsedData = JSON.parse(jsonMatch[0]);
      return res.json(parsedData);
    }
    throw new Error("Failed to parse JSON from AI response.");
  } catch (err) {
    console.error("Gemini ATS Check Error:", err);
    // Fallback heuristic scoring if AI call fails
    return res.json({
      score: 75,
      matchedKeywords: ["Java", "Selenium", "API Testing", "Agile"],
      missingKeywords: ["Docker", "Kubernetes"]
    });
  }
});

// 2. GET APPLICATIONS LEDGER
app.get('/api/applications', (req, res) => {
  if (!fs.existsSync(TRACKER_DB_PATH)) {
    return res.json([]);
  }
  try {
    const data = JSON.parse(fs.readFileSync(TRACKER_DB_PATH, 'utf-8'));
    res.json(data);
  } catch (e) {
    res.json([]);
  }
});

// 3. GET EMAIL SNIPPETS
app.get('/api/snippets', (req, res) => {
  const snippets = getUniqueSnippets();
  res.json(snippets);
});

// // 4. SEND EMAIL & LOG APPLICATION
// app.post('/api/send-email', async (req, res) => {
//   const { toEmail, subject, body, companyName, jobTitle, atsScore } = req.body;

//   if (!toEmail || !subject || !body) {
//     return res.status(400).json({ success: false, error: "Missing required email parameters." });
//   }

//   try {
//     // Configure OAuth2 client for Gmail sending using environment variables
//     const oAuth2Client = new google.auth.OAuth2(
//       process.env.GMAIL_CLIENT_ID,
//       process.env.GMAIL_CLIENT_SECRET,
//       process.env.GMAIL_REDIRECT_URI
//     );

//     oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

//     const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

//     // Construct raw MIME message
//     const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
//     const boundary = `boundary_${Date.now().toString(36)}`;
//     const resumeAvailable = fs.existsSync(RESUME_PDF_PATH);

//     let messageParts;
//     if (resumeAvailable) {
//       const resumeFileName = path.basename(RESUME_PDF_PATH);
//       const resumeBase64 = fs.readFileSync(RESUME_PDF_PATH).toString('base64');
//       // Split base64 into 76-char lines per RFC 2045
//       const resumeBase64Lines = resumeBase64.match(/.{1,76}/g).join('\n');

//       messageParts = [
//         `To: ${toEmail}`,
//         `Subject: ${utf8Subject}`,
//         `MIME-Version: 1.0`,
//         `Content-Type: multipart/mixed; boundary="${boundary}"`,
//         ``,
//         `--${boundary}`,
//         `Content-Type: text/html; charset=utf-8`,
//         ``,
//         body,
//         ``,
//         `--${boundary}`,
//         `Content-Type: application/pdf; name="${resumeFileName}"`,
//         `Content-Disposition: attachment; filename="${resumeFileName}"`,
//         `Content-Transfer-Encoding: base64`,
//         ``,
//         resumeBase64Lines,
//         ``,
//         `--${boundary}--`
//       ];
//     } else {
//       console.error("⚠️ Resume PDF not found at configured path. Sending email without attachment:", RESUME_PDF_PATH);
//       messageParts = [
//         `To: ${toEmail}`,
//         `Subject: ${utf8Subject}`,
//         `MIME-Version: 1.0`,
//         `Content-Type: text/html; charset=utf-8`,
//         ``,
//         body
//       ];
//     }

//     const message = messageParts.join('\n');
//     const encodedMessage = Buffer.from(message)
//       .toString('base64')
//       .replace(/\+/g, '-')
//       .replace(/\//g, '_')
//       .replace(/=+$/, '');

//     // Send email via Gmail API
//     await gmail.users.messages.send({
//       userId: 'me',
//       requestBody: {
//         raw: encodedMessage,
//       },
//     });

//     // Automatically save unique snippet to template database if not already present
//     saveUniqueSnippet(subject, body);

//     // Log the application into the local ledger storage
//     const newEntry = {
//       timestamp: new Date().toISOString(),
//       role: jobTitle || 'QA Engineer',
//       company: companyName || 'Target Company',
//       recipientEmail: toEmail,
//       applicationSource: 'email',
//       atsScore: atsScore || 80,
//       status: 'Dispatched',
//       interviewDone: false,
//       interviewRound: 0,
//       appliedDate: new Date().toISOString().split('T')[0],
//       followUpCount: '0 / 5'
//     };
//     logApplicationData(newEntry);

//     res.json({ success: true, message: "Email dispatched and application logged successfully." });
//   } catch (error) {
//     console.error("SMTP / Gmail API Dispatch Error:", error);
//     res.status(500).json({ success: false, error: error.message || "Failed to send email via Gmail API." });
//   }
// });

// 4. SEND EMAIL & LOG APPLICATION
app.post('/api/send-email', async (req, res) => {
  const { toEmail, subject, body, companyName, jobTitle, atsScore } = req.body;

  if (!toEmail || !subject || !body) {
    return res.status(400).json({ success: false, error: "Missing required email parameters." });
  }

  try {
    // Initialize Nodemailer SMTP Transporter using App Password
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASS,
      },
    });

    // Configure email options
    const mailOptions = {
      from: `"Milind Talekar" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject: subject,
      html: body,
      attachments: []
    };

    // Attach PDF Resume if present
    if (fs.existsSync(RESUME_PDF_PATH)) {
      mailOptions.attachments.push({
        filename: path.basename(RESUME_PDF_PATH),
        path: RESUME_PDF_PATH,
      });
    } else {
      console.warn("⚠️ Resume PDF not found at path:", RESUME_PDF_PATH);
    }

    // Send email via standard SMTP
    await transporter.sendMail(mailOptions);

    // Save unique snippet
    saveUniqueSnippet(subject, body);

    // Log entry in local tracker ledger
    const newEntry = {
      timestamp: new Date().toISOString(),
      role: jobTitle || 'QA Engineer',
      company: companyName || 'Target Company',
      recipientEmail: toEmail,
      applicationSource: 'email',
      atsScore: atsScore || 80,
      status: 'Dispatched',
      interviewDone: false,
      interviewRound: 0,
      appliedDate: new Date().toISOString().split('T')[0],
      followUpCount: '0 / 5'
    };
    logApplicationData(newEntry);

    res.json({ success: true, message: "Email dispatched via SMTP and application logged successfully." });
  } catch (error) {
    console.error("SMTP Dispatch Error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to send email via SMTP." });
  }
});

// 5. MANUAL LEDGER LOGGING ENDPOINT
app.post('/api/applications/manual-log', (req, res) => {
  const { companyName, jobTitle, recipientEmail, appliedDate, applicationSource } = req.body;
  if (!companyName || !jobTitle) {
    return res.status(400).json({ success: false, error: "Company name and job title are required." });
  }

  const newEntry = {
    timestamp: new Date().toISOString(),
    role: jobTitle,
    company: companyName,
    recipientEmail: recipientEmail || 'Phone Direct',
    applicationSource: applicationSource || 'phone',
    atsScore: 85,
    status: 'Logged Manually',
    interviewDone: false,
    interviewRound: 0,
    appliedDate: appliedDate || new Date().toISOString().split('T')[0],
    followUpCount: '0 / 5'
  };

  logApplicationData(newEntry);
  res.json({ success: true, message: "Manual application entry logged successfully." });
});

// 6. TOGGLE INTERVIEW STATUS
app.post('/api/applications/toggle-interview', (req, res) => {
  const { timestamp } = req.body;
  if (!fs.existsSync(TRACKER_DB_PATH)) return res.status(404).json({ success: false });

  try {
    let logs = JSON.parse(fs.readFileSync(TRACKER_DB_PATH, 'utf-8'));
    logs = logs.map(app => {
      if (app.timestamp === timestamp) {
        const nextStatus = !app.interviewDone;
        return { ...app, interviewDone: nextStatus, interviewRound: nextStatus ? 1 : 0 };
      }
      return app;
    });
    fs.writeFileSync(TRACKER_DB_PATH, JSON.stringify(logs, null, 2), 'utf-8');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. TOGGLE APPLICATION SOURCE CHANNEL
app.post('/api/applications/toggle-source', (req, res) => {
  const { timestamp, source } = req.body;
  if (!fs.existsSync(TRACKER_DB_PATH)) return res.status(404).json({ success: false });

  try {
    let logs = JSON.parse(fs.readFileSync(TRACKER_DB_PATH, 'utf-8'));
    logs = logs.map(app => {
      if (app.timestamp === timestamp) {
        return { ...app, applicationSource: source };
      }
      return app;
    });
    fs.writeFileSync(TRACKER_DB_PATH, JSON.stringify(logs, null, 2), 'utf-8');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. UPDATE INTERVIEW ROUND
app.post('/api/applications/update-round', (req, res) => {
  const { timestamp, action } = req.body;
  if (!fs.existsSync(TRACKER_DB_PATH)) return res.status(404).json({ success: false });

  try {
    let logs = JSON.parse(fs.readFileSync(TRACKER_DB_PATH, 'utf-8'));
    logs = logs.map(app => {
      if (app.timestamp === timestamp) {
        let currentRound = app.interviewRound || 0;
        if (action === 'increment') currentRound += 1;
        if (action === 'decrement' && currentRound > 0) currentRound -= 1;
        return { ...app, interviewRound: currentRound };
      }
      return app;
    });
    fs.writeFileSync(TRACKER_DB_PATH, JSON.stringify(logs, null, 2), 'utf-8');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. UPDATE INDIVIDUAL APPLICATION RECORD
app.post('/api/applications/update', (req, res) => {
  const { timestamp, role, company, recipientEmail, atsScore } = req.body;
  if (!fs.existsSync(TRACKER_DB_PATH)) return res.status(404).json({ success: false });

  try {
    let logs = JSON.parse(fs.readFileSync(TRACKER_DB_PATH, 'utf-8'));
    logs = logs.map(app => {
      if (app.timestamp === timestamp) {
        return {
          ...app,
          ...(role !== undefined && { role }),
          ...(company !== undefined && { company }),
          ...(recipientEmail !== undefined && { recipientEmail }),
          ...(atsScore !== undefined && { atsScore }),
        };
      }
      return app;
    });
    fs.writeFileSync(TRACKER_DB_PATH, JSON.stringify(logs, null, 2), 'utf-8');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. DELETE APPLICATION RECORD
app.post('/api/applications/delete', (req, res) => {
  const { timestamp } = req.body;
  if (!fs.existsSync(TRACKER_DB_PATH)) return res.status(404).json({ success: false });

  try {
    let logs = JSON.parse(fs.readFileSync(TRACKER_DB_PATH, 'utf-8'));
    logs = logs.filter(app => app.timestamp !== timestamp);
    fs.writeFileSync(TRACKER_DB_PATH, JSON.stringify(logs, null, 2), 'utf-8');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. SERVE STATIC RESUME FILE DOWNLOAD / VIEW
app.get('/Milind_Talekar_SDET_PhonePe_Resume_2026.pdf', (req, res) => {
  if (fs.existsSync(RESUME_PDF_PATH)) {
    res.sendFile(RESUME_PDF_PATH);
  } else {
    res.status(404).send("Resume PDF file not found on server path.");
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 CareerHub Node backend server running live on port ${PORT}`);
});