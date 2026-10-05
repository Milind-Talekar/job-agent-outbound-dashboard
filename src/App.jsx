import React, { useState, useEffect, useRef } from 'react';
import { 
  Briefcase, Mail, User, Paperclip, Check, X, Download, 
  Trash2, Upload, FileText, Eye, Sparkles, Send, 
  Calendar, Layers, CheckCircle2, AlertCircle, RefreshCw, Sun, Moon, PhoneCall, CalendarDays, Edit3, MessageSquare 
} from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState('dark');

  const [jobDescription, setJobDescription] = useState('');
  const [atsScore, setAtsScore] = useState(null);
  const [matchedKeywords, setMatchedKeywords] = useState([]);
  const [missingKeywords, setMissingKeywords] = useState([]);
  const [isCheckingAts, setIsCheckingAts] = useState(false);
  const [recruiterEmail, setRecruiterEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);
  
  // Custom Dropdown Selections for Job Portal and Position Name
  const [selectedJobPortal, setSelectedJobPortal] = useState('LinkedIn');
  const [customJobPortal, setCustomJobPortal] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('QA Engineer');
  const [customPosition, setCustomPosition] = useState('');

  const [fromAccount, setFromAccount] = useState('milindstalekar1667@gmail.com');
  const [subjectLine, setSubjectLine] = useState('');
  const [emailBody, setEmailBody] = useState('');
  
  const [applications, setApplications] = useState([]);
  const [selectedTimestamps, setSelectedTimestamps] = useState([]);
  const [isDeliveringPackage, setIsDeliveringPackage] = useState(false);
  const [loadingFollowUpTimestamp, setLoadingFollowUpTimestamp] = useState(null);

  // Snippets State (Filtered to max 2 templates)
  const [snippets, setSnippets] = useState([]);
  const [selectedSnippetId, setSelectedSnippetId] = useState('');

  // Batch / Multi Edit States
  const [isBatchEditing, setIsBatchEditing] = useState(false);
  const [batchEditForm, setBatchEditForm] = useState({ role: '', company: '', recipientEmail: '', atsScore: '' });

  const [resumeType, setResumeType] = useState('system'); 
  const [customResumeFile, setCustomResumeFile] = useState(null);

  // Manual recruiter call entry states
  const [manualCompany, setManualCompany] = useState('');
  const [manualRole, setManualRole] = useState('');
  const [manualContact, setManualContact] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);

  // ==================== QA JOB MATCH RUNNER (Integrated from HTML Snippet) ====================
  const DEFAULT_SKILLS = "Manual Testing, Automation Testing, Selenium WebDriver, Playwright, Appium, Rest Assured, API Testing, Database Testing, Mobile App Testing, BDD Cucumber, Gherkin, Java, TypeScript, SQL Server, MySQL, MongoDB, Postman, SOAP UI, Apache JMeter, Jenkins, Git, GitHub, Bitbucket, GitLab CI/CD, BrowserStack, HeadSpin, Android Studio, JIRA, Confluence, TestRail, Zephyr, Agile, Scrum, STLC, SDLC, Regression Testing, Smoke Testing, Sanity Testing, Integration Testing, CI/CD, Visual AI Testing, Fintech, Payments, Banking, Forex, Mobile Banking, E-Commerce, CRM, ChatGPT, Copilot, AI Tools";
  const DEFAULT_YEARS = "5.4";

  const [qjmSkills, setQjmSkills] = useState(DEFAULT_SKILLS);
  const [qjmYears, setQjmYears] = useState(DEFAULT_YEARS);
  const [qjmProfileSaved, setQjmProfileSaved] = useState(false);
  const [qjmJobs, setQjmJobs] = useState([]);
  const [qjmRegion, setQjmRegion] = useState('all');
  const [qjmVerdict, setQjmVerdict] = useState('all');
  const [qjmSort, setQjmSort] = useState('score');
  
  // New Location Filter States
  const [selectedLocations, setSelectedLocations] = useState([]); // Array for multi-select
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);

  const [qjmStatusText, setQjmStatusText] = useState('');
  const [qjmIsLoading, setQjmIsLoading] = useState(false);
  const [qjmIsError, setQjmIsError] = useState(false);
  const [expandedJobIds, setExpandedJobIds] = useState({});
  const qjmFileInputRef = useRef(null);

  // ==================== HR EMAIL CONTACT EXTRACTOR (New Feature) ====================
  const [hrContacts, setHrContacts] = useState([]);
  const [hrStatusText, setHrStatusText] = useState('');
  const [hrIsLoading, setHrIsLoading] = useState(false);
  const [hrIsError, setHrIsError] = useState(false);
  const hrFileInputRef = useRef(null);
  // ====================================================================================

  // Load PDF.js CDN script dynamically for client-side parsing
  useEffect(() => {
    if (!window.pdfjsLib) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.async = true;
      script.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
      };
      document.body.appendChild(script);
    }
  }, []);

  // Load saved profile and jobs from localStorage on mount
  useEffect(() => {
    try {
      const savedProfile = JSON.parse(localStorage.getItem('qjm-profile-v1'));
      if (savedProfile) {
        setQjmSkills(savedProfile.skills || DEFAULT_SKILLS);
        setQjmYears(savedProfile.years || DEFAULT_YEARS);
      }
      const savedJobs = JSON.parse(localStorage.getItem('qjm-jobs-v1'));
      if (savedJobs && Array.isArray(savedJobs)) {
        setQjmJobs(savedJobs);
      }
    } catch (e) {
      console.error("Error loading QJM local storage:", e);
    }
    fetchApplications();
    fetchSnippets();
  }, []);

  // Load saved HR contacts from localStorage on mount (new, standalone effect)
  useEffect(() => {
    try {
      const savedHrContacts = JSON.parse(localStorage.getItem('hr-contacts-v1'));
      if (savedHrContacts && Array.isArray(savedHrContacts)) {
        setHrContacts(savedHrContacts);
      }
    } catch (e) {
      console.error("Error loading HR contacts local storage:", e);
    }
  }, []);

  const handleSaveQjmProfile = () => {
    const profile = { skills: qjmSkills, years: qjmYears };
    try {
      localStorage.setItem('qjm-profile-v1', JSON.stringify(profile));
      setQjmProfileSaved(true);
      setTimeout(() => setQjmProfileSaved(false), 1600);
      if (qjmJobs.length > 0) scoreAndRenderJobs(qjmJobs, qjmSkills, qjmYears);
    } catch (e) {
      console.error("Failed to save profile");
    }
  };

  const cleanNoise = (text) => {
    const NOISE_LINE_PATTERNS = [
      /^LATEST QA JOBS$/i, /^\d{1,2}-[A-Za-z]+-\d{4}$/, /SHAMMI JHA/i, /^Click to Join/i,
      /^(INDIA QA JOBS|ABROAD QA JOBS|FRESHER JOBS)$/i, /^DISCLAIMER$/i, /^All Posts Are Collected/i, /^Thank You$/i, /^-{3,}$/
    ];
    const lines = text.split(/\n/).map(l => l.trim());
    const kept = lines.filter(l => {
      if (!l) return false;
      return !NOISE_LINE_PATTERNS.some(re => re.test(l));
    });
    return kept.join(' ').replace(/\s+/g, ' ').trim();
  };

  const LABELS = ['Company:', 'Location:', 'Job Title:', 'Experience Required:', 'Skills Required:', 'Job Description:', 'Interested candidates can share their resume at:'];

  const extractField = (block, label, idx) => {
    const start = block.indexOf(label);
    if (start === -1) return '';
    let from = start + label.length;
    let end = block.length;
    for (let j = idx + 1; j < LABELS.length; j++) {
      const pos = block.indexOf(LABELS[j], from);
      if (pos !== -1 && pos < end) end = pos;
    }
    const nextCompany = block.indexOf('Company:', from);
    if (nextCompany !== -1 && nextCompany < end) end = nextCompany;
    return block.slice(from, end).trim().replace(/^[:\s]+/, '');
  };

  const parseExpMin = (expStr) => {
    if (!expStr) return null;
    const m = expStr.match(/(\d+(\.\d+)?)/);
    return m ? parseFloat(m[1]) : null;
  };

  const guessRegion = (job) => {
    const loc = (job.location || '').toLowerCase();
    const abroad = ['usa', 'uk', 'canada', 'australia', 'remote – usa', 'remote - usa', 'az ', 'tx ', 'nj', 'ca)', 'florida', 'indiana', 'sydney', 'toronto', 'columbus', 'phoenix', 'austin', 'charlotte', 'pasadena'];
    for (let i = 0; i < abroad.length; i++) {
      if (loc.indexOf(abroad[i]) > -1) return 'abroad';
    }
    const expNum = parseExpMin(job.experience);
    if (expNum === 0 && /fresher|intern/i.test(job.title)) return 'fresher';
    return 'india';
  };

  // Helper to extract clean distinct location names (avoiding combined strings like "Bangalore / Ahmedabad")
  const getNormalizedLocations = (jobLocationStr) => {
    if (!jobLocationStr) return ['Not Specified'];
    // Split by common delimiters like '/', ',', '|', '&', or 'or'
    const parts = jobLocationStr.split(/[\/|,&]|(\bor\b)/i).map(s => s ? s.trim() : '').filter(Boolean);
    return parts.length > 0 ? parts : [jobLocationStr.trim()];
  };

  const tokenizeSkills = (str) => {
    return (str || '').split(/[\/,&|]| and |\+/i).map(s => s.trim()).filter(s => s.length > 1);
  };

  const scoreJobItem = (job, resumeSkillsLower, userYears) => {
    const reqTokens = tokenizeSkills(job.skillsRequired);
    const jdLower = ((job.skillsRequired || '') + ' ' + (job.description || '')).toLowerCase();
    const hits = [];
    const misses = [];
    if (reqTokens.length) {
      reqTokens.forEach(tok => {
        const tl = tok.toLowerCase();
        const found = resumeSkillsLower.some(rs => tl.indexOf(rs) > -1 || rs.indexOf(tl) > -1);
        if (found) hits.push(tok); else misses.push(tok);
      });
    }
    const base = reqTokens.length ? (hits.length / reqTokens.length) : 0.4;
    let jdBonusHits = 0;
    resumeSkillsLower.forEach(rs => { if (rs.length > 2 && jdLower.indexOf(rs) > -1) jdBonusHits++; });
    const jdBonus = Math.min(0.15, jdBonusHits * 0.01);
    const domainWords = ['payment', 'fintech', 'bank', 'forex', 'e-commerce', 'ecommerce', 'crm', 'upi'];
    const domainHit = domainWords.some(d => jdLower.indexOf(d) > -1 || (job.company || '').toLowerCase().indexOf(d) > -1);
    const domainBonus = domainHit ? 0.08 : 0;
    const reqMin = parseExpMin(job.experience);
    let expPenalty = 0;
    if (reqMin !== null && userYears !== null) {
      if (reqMin > userYears + 3) expPenalty = 0.25;
      else if (reqMin > userYears + 1) expPenalty = 0.1;
      else if (userYears - reqMin > 4) expPenalty = 0.2;
      else if (userYears - reqMin > 2.5) expPenalty = 0.08;
    }
    const score = Math.round(Math.max(0, Math.min(1, base + jdBonus + domainBonus - expPenalty)) * 100);
    const verdict = score >= 70 ? 'PASS' : (score >= 45 ? 'REVIEW' : 'SKIP');
    const tip = verdict === 'PASS' ? 'Strong match for your profile tools.' : 'Review required skills before applying.';
    return { score, verdict, hits, misses, tip };
  };

  const scoreAndRenderJobs = (jobsList, skillsStr, yearsVal) => {
    const resumeSkillsLower = skillsStr.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const userYears = parseFloat(yearsVal) || 5.4;

    const processed = jobsList.map(job => {
      if (!job.region) job.region = guessRegion(job);
      const res = scoreJobItem(job, resumeSkillsLower, userYears);
      return {
        ...job,
        score: res.score,
        verdict: res.verdict,
        hits: res.hits,
        misses: res.misses,
        tip: res.tip
      };
    });

    setQjmJobs(processed);
    try {
      localStorage.setItem('qjm-jobs-v1', JSON.stringify(processed));
    } catch (e) {}
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setQjmIsLoading(true);
    setQjmIsError(false);
    setQjmStatusText(`Reading ${file.name}...`);

    try {
      let full = '';
      
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        full = await file.text();
      } else {
        if (!window.pdfjsLib) {
          alert("PDF.js library is still loading. Please try again in a moment.");
          setQjmIsLoading(false);
          return;
        }

        const buf = await file.arrayBuffer();
        const doc = await window.pdfjsLib.getDocument({ data: buf }).promise;
        for (let i = 1; i <= doc.numPages; i++) {
          setQjmStatusText(`Parsing page ${i} of ${doc.numPages}...`);
          const page = await doc.getPage(i);
          const content = await page.getTextContent();
          let lastY = null;
          let lastEndX = null;
          let lineText = '';
          content.items.forEach(it => {
            const y = it.transform[5];
            const x = it.transform[4];
            if (lastY !== null && Math.abs(y - lastY) > 2) {
              full += lineText + '\n';
              lineText = '';
              lastEndX = null;
            }
            // PDF.js sometimes splits a single word into multiple text runs
            // (font/kerning boundaries) with almost no gap between them.
            // Only insert a space when there's a real visual gap - otherwise
            // words like "resume" get corrupted into "r esume", which broke
            // exact-string label matching and email extraction downstream.
            if (lastEndX !== null) {
              const gap = x - lastEndX;
              if (gap > 1) lineText += ' ';
            }
            lineText += it.str;
            lastEndX = x + (it.width || 0);
            lastY = y;
          });
          if (lineText) full += lineText + '\n';
          full += '\n';
        }
      }

      setQjmStatusText("Extracting job records...");
      const text = cleanNoise(full);
      const chunks = text.split(/(?=Company:\s)/g).filter(c => c.indexOf('Company:') === 0);
      const parsedJobs = [];
      chunks.forEach((block, idx) => {
        const company = extractField(block, 'Company:', 0);
        const location = extractField(block, 'Location:', 1);
        const title = extractField(block, 'Job Title:', 2);
        const exp = extractField(block, 'Experience Required:', 3);
        const skillsReq = extractField(block, 'Skills Required:', 4);
        const jd = extractField(block, 'Job Description:', 5);
        const emailField = extractField(block, 'Interested candidates can share their resume at:', 6);
        const emailMatch = emailField ? emailField.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/) : null;
        if (!company || !title) return;
        parsedJobs.push({
          id: 'job-' + Date.now() + '-' + idx,
          company,
          location,
          title,
          experience: exp,
          skillsRequired: skillsReq,
          description: jd,
          email: emailMatch ? emailMatch[0] : '',
          region: ''
        });
      });

      scoreAndRenderJobs(parsedJobs, qjmSkills, qjmYears);
      setQjmStatusText(`Successfully parsed and scored ${parsedJobs.length} job listings!`);
    } catch (err) {
      console.error(err);
      setQjmIsError(true);
      setQjmStatusText("Error parsing document.");
    } finally {
      setQjmIsLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleClearQjmData = () => {
    setQjmJobs([]);
    setExpandedJobIds({});
    setQjmStatusText('');
    setQjmIsError(false);
    setQjmIsLoading(false);
    setQjmRegion('all');
    setQjmVerdict('all');
    setSelectedLocations([]);
    try {
      localStorage.removeItem('qjm-jobs-v1');
    } catch (e) {}
    if (qjmFileInputRef.current) {
      qjmFileInputRef.current.value = '';
    }
  };

  const handleQuickApplyLoad = (job) => {
    setCompanyName(job.company);
    setJobTitle(job.title);
    setSelectedPosition('Custom');
    setCustomPosition(job.title);
    if (job.email) {
      setRecruiterEmail(job.email);
    }
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };
  // ============================================================================================

  // ==================== HR EMAIL CONTACT EXTRACTOR (New Feature) ====================
  const parseHrContactsFromText = (rawText) => {
    const rawLines = rawText.split(/\n/).map(l => l.trim()).filter(Boolean);
    const mergedLines = [];
    rawLines.forEach(line => {
      if (mergedLines.length > 0 && /^[a-z]{1,3}$/.test(line)) {
        mergedLines[mergedLines.length - 1] = mergedLines[mergedLines.length - 1] + line;
      } else {
        mergedLines.push(line);
      }
    });

    const contacts = [];
    mergedLines.forEach((line, idx) => {
      const emailMatch = line.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
      if (!emailMatch) return;
      const linkedinMatch = line.match(/https?:\/\/[^\s]*linkedin\.com[^\s]*/i);
      let name = line.substring(0, emailMatch.index).trim();
      name = name.replace(/[:\-|]+$/, '').trim();
      if (!name || /HR Name|HR Email|Email ID|LinkedIn Profile/i.test(name)) name = 'Unknown';
      contacts.push({
        id: 'hr-' + Date.now() + '-' + idx,
        name,
        email: emailMatch[0],
        linkedin: linkedinMatch ? linkedinMatch[0] : ''
      });
    });
    return contacts;
  };

  const handleHrFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setHrIsLoading(true);
    setHrIsError(false);
    setHrStatusText(`Reading ${file.name}...`);

    try {
      let full = '';
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        full = await file.text();
      } else {
        if (!window.pdfjsLib) {
          alert("PDF.js library is still loading. Please try again in a moment.");
          setHrIsLoading(false);
          return;
        }

        const buf = await file.arrayBuffer();
        const doc = await window.pdfjsLib.getDocument({ data: buf }).promise;
        for (let i = 1; i <= doc.numPages; i++) {
          setHrStatusText(`Parsing page ${i} of ${doc.numPages}...`);
          const page = await doc.getPage(i);
          const content = await page.getTextContent();
          let lastY = null;
          let lastEndX = null;
          let lineText = '';
          content.items.forEach(it => {
            const y = it.transform[5];
            const x = it.transform[4];
            if (lastY !== null && Math.abs(y - lastY) > 2) {
              full += lineText + '\n';
              lineText = '';
              lastEndX = null;
            }
            // PDF.js sometimes splits a single word into multiple text runs
            // (font/kerning boundaries) with almost no gap between them.
            // Only insert a space when there's a real visual gap - otherwise
            // words like "resume" get corrupted into "r esume", which broke
            // exact-string label matching and email extraction downstream.
            if (lastEndX !== null) {
              const gap = x - lastEndX;
              if (gap > 1) lineText += ' ';
            }
            lineText += it.str;
            lastEndX = x + (it.width || 0);
            lastY = y;
          });
          if (lineText) full += lineText + '\n';
          full += '\n';
        }
      }

      setHrStatusText("Extracting HR contacts...");
      const parsedContacts = parseHrContactsFromText(full);
      setHrContacts(parsedContacts);
      try {
        localStorage.setItem('hr-contacts-v1', JSON.stringify(parsedContacts));
      } catch (err) {}
      setHrStatusText(`Successfully extracted ${parsedContacts.length} HR contact(s)!`);
    } catch (err) {
      console.error(err);
      setHrIsError(true);
      setHrStatusText("Error parsing document.");
    } finally {
      setHrIsLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleUseHrContact = (contact) => {
    setRecruiterEmail(contact.email);
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  const handleClearHrContacts = () => {
    setHrContacts([]);
    setHrStatusText('');
    setHrIsError(false);
    setHrIsLoading(false);
    try {
      localStorage.removeItem('hr-contacts-v1');
    } catch (err) {}
    if (hrFileInputRef.current) {
      hrFileInputRef.current.value = '';
    }
  };
  // ====================================================================================

  const fetchApplications = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/applications');
      const data = await response.json();
      setApplications(data.reverse());
    } catch (error) {
      console.error("Error retrieving tracking data pipeline logs:", error);
    }
  };

  const fetchSnippets = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/snippets');
      const data = await response.json();
      if (Array.isArray(data)) {
        setSnippets(data.slice(0, 2));
      }
    } catch (error) {
      console.error("Error retrieving templates:", error);
    }
  };

  useEffect(() => {
    fetchApplications();
    fetchSnippets();
  }, []);

  useEffect(() => {
    const effectiveRole = selectedPosition === 'Custom' ? customPosition : selectedPosition;
    if (effectiveRole) {
      setJobTitle(effectiveRole);
    }
  }, [selectedPosition, customPosition]);

  useEffect(() => {
    const effectiveRole = selectedPosition === 'Custom' ? customPosition : selectedPosition;
    const effectivePortal = selectedJobPortal === 'Custom' ? customJobPortal : selectedJobPortal;

    if (effectiveRole || companyName) {
      const activeSnippet = snippets.find(s => s.id === selectedSnippetId);
      if (activeSnippet) {
        let populatedSubject = activeSnippet.subject
          .replace(/\{\{Position Name\}\}/g, effectiveRole || '[Job Title]')
          .replace(/\{\{Job Portal Name\}\}/g, effectivePortal || 'Job Portal');
        
        let populatedBody = activeSnippet.body
          .replace(/\{\{Recruiter Name\}\}/g, 'Team')
          .replace(/\{\{Position Name\}\}/g, `<b>${effectiveRole || '[Job Title]'}</b>`)
          .replace(/\{\{Job Portal Name\}\}/g, effectivePortal || 'Job Portal');
        
        setSubjectLine(populatedSubject);
        setEmailBody(populatedBody);
      } else {
        setSubjectLine(companyName ? `Job Application | ${companyName} | ${effectiveRole || '[Job Title]'} | Milind Talekar` : `Job Application | ${effectiveRole || '[Job Title]'} | Milind Talekar`);
        setEmailBody(`Hello,<br><br>I hope this message finds you well.<br><br>I am writing to apply for the position of <b>${effectiveRole || '[Job Title]'}</b> profile.<br>My experience and qualification are closely matching with the job responsibilities mentioned in the job description.<br><br>I have <b>5.4 years of experience</b> in Information Technology, specializing in <b>Software Quality Assurance Testing</b>.<br>I am an <b>Immediate Joiner.</b><br><br>Attached is my resume, which provides further insight into my professional experience and qualifications.<br><br>Thank you for considering my application. I look forward to the opportunity to discuss how I can contribute to your team.<br><br>Thanks and Regards,<br>Milind Talekar<br>+91- 8208132705`);
      }
    }
  }, [selectedPosition, customPosition, selectedJobPortal, customJobPortal, companyName, selectedSnippetId]);

  const handleSnippetChange = (e) => {
    const sId = e.target.value;
    setSelectedSnippetId(sId);
    const target = snippets.find(s => s.id === sId);
    const effectiveRole = selectedPosition === 'Custom' ? customPosition : selectedPosition;
    const effectivePortal = selectedJobPortal === 'Custom' ? customJobPortal : selectedJobPortal;

    if (target) {
      let populatedSubject = target.subject
        .replace(/\{\{Position Name\}\}/g, effectiveRole || '[Job Title]')
        .replace(/\{\{Job Portal Name\}\}/g, effectivePortal || 'Job Portal');
      
      let populatedBody = target.body
        .replace(/\{\{Recruiter Name\}\}/g, 'Team')
        .replace(/\{\{Position Name\}\}/g, effectiveRole || '[Job Title]')
        .replace(/\{\{Job Portal Name\}\}/g, effectivePortal || 'Job Portal');
      
      setSubjectLine(populatedSubject);
      setEmailBody(populatedBody);
    }
  };

  const triggerRealAtsCheck = async () => {
    if (!jobDescription) return;
    setIsCheckingAts(true);
    try {
      const res = await fetch('http://localhost:3001/api/ats-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jdText: jobDescription })
      });
      const data = await res.json();
      setAtsScore(data.score);
      setMatchedKeywords(data.matchedKeywords || []);
      setMissingKeywords(data.missingKeywords || []);
      
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const detected = jobDescription.match(emailRegex);
      if (detected) setRecruiterEmail(detected[0]);
    } catch (e) {
      alert("Error linking to Node process server.");
    }
    setIsCheckingAts(false);
  };

  const executeRealSend = async (e) => {
    e.preventDefault();
    if (isDeliveringPackage) return; 
    
    setIsDeliveringPackage(true); 
    try {
      const effectiveRole = selectedPosition === 'Custom' ? customPosition : selectedPosition;
      const res = await fetch('http://localhost:3001/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: recruiterEmail,
          subject: subjectLine,
          body: emailBody,
          companyName: companyName,
          jobTitle: effectiveRole || jobTitle,
          atsScore: atsScore || 0
        })
      });
      
      const data = await res.json();
      if (data.success) {
        alert("Real Application Pack successfully targeted and dispatched!");
        fetchApplications(); 
        fetchSnippets();
      } else {
        alert(`SMTP Routing Rejection: ${data.error}`);
      }
    } catch (err) {
      alert("Data node infrastructure timeout error.");
    } finally {
      setIsDeliveringPackage(false); 
    }
  };

  const handleManualLog = async (e) => {
    e.preventDefault();
    if (!manualCompany || !manualRole) {
      return alert("Please enter at least the company name and job role.");
    }

    try {
      const res = await fetch('http://localhost:3001/api/applications/manual-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: manualCompany,
          jobTitle: manualRole,
          recipientEmail: manualContact || 'Phone Direct',
          appliedDate: manualDate,
          applicationSource: 'phone'
        })
      });
      
      if (res.ok) {
        alert("Recruiter call/application successfully logged to the ledger!");
        setManualCompany('');
        setManualRole('');
        setManualContact('');
        fetchApplications(); 
      }
    } catch (err) {
      alert("Failed to communicate with server backend.");
    }
  };

  const startBatchEditing = () => {
    if (selectedTimestamps.length === 0) return alert("Please select at least one record to edit.");
    if (selectedTimestamps.length === 1) {
      const target = applications.find(a => a.timestamp === selectedTimestamps[0]);
      if (target) {
        setBatchEditForm({
          role: target.role || '',
          company: target.company || '',
          recipientEmail: target.recipientEmail || '',
          atsScore: target.atsScore || ''
        });
      }
    } else {
      setBatchEditForm({ role: '', company: '', recipientEmail: '', atsScore: '' });
    }
    setIsBatchEditing(true);
  };

  const saveBatchEditing = async () => {
    const timestampsToUpdate = [...selectedTimestamps];
    
    setApplications(prev => 
      prev.map(app => {
        if (timestampsToUpdate.includes(app.timestamp)) {
          return {
            ...app,
            ...(batchEditForm.role !== '' && { role: batchEditForm.role }),
            ...(batchEditForm.company !== '' && { company: batchEditForm.company }),
            ...(batchEditForm.recipientEmail !== '' && { recipientEmail: batchEditForm.recipientEmail }),
            ...(batchEditForm.atsScore !== '' && { atsScore: Number(batchEditForm.atsScore) }),
          };
        }
        return app;
      })
    );
    
    setIsBatchEditing(false);
    setSelectedTimestamps([]);

    try {
      await Promise.all(
        timestampsToUpdate.map(timestamp => {
          const currentApp = applications.find(a => a.timestamp === timestamp);
          return fetch('http://localhost:3001/api/applications/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              timestamp,
              role: batchEditForm.role !== '' ? batchEditForm.role : (currentApp?.role || ''),
              company: batchEditForm.company !== '' ? batchEditForm.company : (currentApp?.company || ''),
              recipientEmail: batchEditForm.recipientEmail !== '' ? batchEditForm.recipientEmail : (currentApp?.recipientEmail || ''),
              atsScore: batchEditForm.atsScore !== '' ? Number(batchEditForm.atsScore) : (currentApp?.atsScore || 0)
            })
          });
        })
      );
    } catch (err) {
      console.error("Failed to sync batch updates to server backend:", err);
    }
  };

  const handleFollowUp = async (app) => {
    if (loadingFollowUpTimestamp === app.timestamp) return; 
    
    setLoadingFollowUpTimestamp(app.timestamp); 
    const currentCount = parseInt(app.followUpCount || '0');
    
    let emailMessage = `Hi Team,\n\nI wanted to quickly follow up on my application for the ${app.role || 'QA Engineer'} role at ${app.company || 'your company'}. I'm still very interested and would love to connect.\n\nBest regards,\nMilind Talekar`;
    
    if (currentCount >= 1) {
      emailMessage = `Hi Team,\n\nFollowing up once more regarding the ${app.role || 'QA Engineer'} opportunity. I wanted to see if there were any updates on the timeline or next steps.\n\nBest regards,\nMilind Talekar`;
    }

    try {
      const res = await fetch('http://localhost:3001/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAccount: 'milindstalekar1667@gmail.com',
          toEmail: app.recipientEmail,
          subject: `Following up: ${app.role || 'QA Engineer'} application status`,
          body: emailMessage,
          companyName: app.company,
          jobTitle: app.role,
          atsScore: app.atsScore || 0
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(`Follow-up email successfully sent to ${app.recipientEmail}!`);
        setApplications(prev => 
          prev.map(item => {
            if (item.timestamp === app.timestamp) {
              const nextCount = Math.min(currentCount + 1, 5);
              return { ...item, followUpCount: `${nextCount} / 5` };
            }
            return item;
          })
        );
      } else {
        alert(`Mailer Error: ${data.error}`);
      }
    } catch (err) {
      alert("Failed to connect to mail infrastructure server.");
    } finally {
      setLoadingFollowUpTimestamp(null); 
    }
  };

  const handleToggleInterview = async (timestamp, currentStatus) => {
    const nextStatus = !currentStatus;
    setInterviewStatusLocal(timestamp, nextStatus);
    try {
      await fetch('http://localhost:3001/api/applications/toggle-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp })
      });
    } catch (err) {
      console.error("Failed to sync interview status toggle to backend:", err);
    }
  };

  const handleToggleSource = async (timestamp, currentSource) => {
    const nextSource = currentSource === 'phone' ? 'email' : 'phone';
    setApplications(prev => 
      prev.map(app => 
        app.timestamp === timestamp ? { ...app, applicationSource: nextSource } : app
      )
    );
    try {
      await fetch('http://localhost:3001/api/applications/toggle-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp, source: nextSource })
      });
    } catch (err) {
      console.error("Failed to sync application source:", err);
    }
  };

  const handleUpdateRound = async (timestamp, action) => {
    try {
      const response = await fetch('http://localhost:3001/api/applications/update-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp, action })
      });
      if (response.ok) {
        fetchApplications(); 
      }
    } catch (err) {
      console.error("Failed to alter metrics state data element:", err);
    }
  };

  const setInterviewStatusLocal = (timestamp, statusValue) => {
    setApplications(prev => 
      prev.map(app => 
        app.timestamp === timestamp ? { ...app, interviewDone: statusValue } : app
      )
    );
  };

  const deleteApplication = async (timestamp) => {
    if (!window.confirm("Are you sure you want to remove this application record from history?")) return;
    setApplications(prev => prev.filter(app => app.timestamp !== timestamp));
    setSelectedTimestamps(prev => prev.filter(t => t !== timestamp));
    try {
      await fetch('http://localhost:3001/api/applications/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp })
      });
    } catch (err) {}
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedTimestamps(applications.map(app => app.timestamp));
    } else {
      setSelectedTimestamps([]);
    }
  };

  const handleSelectOne = (timestamp) => {
    setSelectedTimestamps(prev => 
      prev.includes(timestamp) ? prev.filter(t => t !== timestamp) : [...prev, timestamp]
    );
  };

  const deleteSelectedApplications = async () => {
    if (selectedTimestamps.length === 0) return;
    if (!window.confirm(`Are you sure you want to remove ${selectedTimestamps.length} selected application record(s) from history?`)) return;

    const timestampsToDelete = [...selectedTimestamps];
    setApplications(prev => prev.filter(app => !timestampsToDelete.includes(app.timestamp)));
    setSelectedTimestamps([]);

    try {
      await Promise.all(
        timestampsToDelete.map(timestamp => 
          fetch('http://localhost:3001/api/applications/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ timestamp })
          })
        )
      );
    } catch (err) {
      console.error("Failed to delete selected items on server backend:", err);
    }
  };

  const handleViewFile = () => {
    if (resumeType === 'system') {
      window.open('http://localhost:3001/Milind_Talekar_SDET_PhonePe_Resume_2026.pdf', '_blank');
    } else if (resumeType === 'manual' && customResumeFile) {
      const fileUrl = URL.createObjectURL(customResumeFile);
      window.open(fileUrl, '_blank');
    }
  };

  const downloadCSV = () => {
    if (applications.length === 0) return alert("No ledger logs available to export.");
    const headers = ["Index", "Timestamp", "Job Title", "Company", "Destination Router", "Channel", "ATS Score", "Status", "Interview Scheduled", "Applied Date", "Follow Up"];
    const rows = applications.map((app, index) => [
      index, `"${app.timestamp || ''}"`, `"${app.role || ''}"`, `"${app.company || ''}"`, `"${app.recipientEmail || ''}"`,
      `"${app.applicationSource === 'phone' ? 'Phone Call' : 'Email'}"`,
      app.atsScore || 0, `"${app.status || ''}"`, app.interviewDone ? '"Yes"' : '"No"', `"${app.appliedDate || ''}"`, `"${app.followUpCount || '0 / 5'}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `applications_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalApplied = applications.length;
  const totalInterviews = applications.filter(a => a.interviewDone).length;
  const avgAtsScore = totalApplied > 0 ? Math.round(applications.reduce((acc, a) => acc + (a.atsScore || 0), 0) / totalApplied) : 0;

  const isDark = theme === 'dark';
  const borderEl = isDark ? "border-slate-700/60" : "border-slate-200";
  const bgPanel = isDark ? "bg-slate-900/85 backdrop-blur-md shadow-2xl" : "bg-white/90 backdrop-blur-md shadow-lg";
  const bgInner = isDark ? "bg-slate-950/80" : "bg-slate-100/80";
  const textTitle = isDark ? "text-white" : "text-slate-900";
  const textSub = isDark ? "text-slate-300" : "text-slate-600";
  const inputEl = isDark ? "bg-slate-950/90 border-slate-700 text-white placeholder-slate-500 focus:ring-blue-500/50" : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-blue-500/30";

  // Gather all unique normalized location options from loaded jobs
  const availableLocations = Array.from(
    new Set(
      qjmJobs.flatMap(job => getNormalizedLocations(job.location))
    )
  ).sort();

  // Filter & Sort jobs for QJM section
  const filteredQjmJobs = qjmJobs.filter(job => {
    if (qjmRegion !== 'all' && job.region !== qjmRegion) return false;
    if (qjmVerdict !== 'all' && job.verdict !== qjmVerdict) return false;
    
    // Custom Multi-Location Filter Logic
    if (selectedLocations.length > 0) {
      const jobLocs = getNormalizedLocations(job.location);
      const matchesAnyLocation = selectedLocations.some(selLoc => 
        jobLocs.some(jl => jl.toLowerCase().includes(selLoc.toLowerCase()))
      );
      if (!matchesAnyLocation) return false;
    }

    return true;
  }).sort((a, b) => {
    if (qjmSort === 'score') return (b.score || 0) - (a.score || 0);
    if (qjmSort === 'title') return a.title.localeCompare(b.title);
    return 0;
  });

  const qjmPassCount = qjmJobs.filter(j => j.verdict === 'PASS').length;
  const qjmReviewCount = qjmJobs.filter(j => j.verdict === 'REVIEW').length;
  const qjmSkipCount = qjmJobs.filter(j => j.verdict === 'SKIP').length;

  return (
    <div className="relative min-h-screen font-sans antialiased transition-colors duration-300">
      
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-0 bg-cover bg-center filter blur-[4px] scale-105 opacity-85"
          style={{ backgroundImage: `url('https://media.licdn.com/dms/image/v2/D5612AQEeL8f1dzZPYA/article-cover_image-shrink_720_1280/B56ZVEAGPXHQAQ-/0/1740602632665?e=2147483647&v=beta&t=jAmOyWbjEQkVzx7XD6X3ZeNZp8ddWtgH2s0e6PDdFOU')` }}
        />
        <div className={`absolute inset-0 ${isDark ? 'bg-slate-950/55' : 'bg-zinc-100/40'}`} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-8 space-y-6">
        
        <header className={`flex flex-col sm:flex-row justify-between items-start sm:items-center border-b ${borderEl} pb-4 gap-4`}>
          <div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl blur-lg opacity-40"></div>
                <div className="relative p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30">
                  <Briefcase className="text-white w-6 h-6" strokeWidth={2.2} />
                </div>
              </div>
              <h1 className={`text-2xl font-extrabold tracking-tight leading-none ${textTitle}`}>
                Milind's Career<span className="bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">Hub</span>
                <span className="ml-1.5 text-[10px] align-top font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-1.5 py-0.5 rounded-md tracking-wider">AI</span>
              </h1>
            </div>
            <p className={`${textSub} text-xs mt-1.5 ml-[52px] font-medium`}>Application orchestration workspace & target execution node</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={`p-2 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700 text-amber-400 hover:bg-slate-800' : 'bg-white border-slate-300 text-indigo-600 hover:bg-slate-50'} transition shadow-md flex items-center gap-1.5 text-xs font-semibold`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span>{isDark ? 'Light Workspace' : 'Eye-Protection Mode'}</span>
            </button>

            <div className={`flex items-center gap-2 ${isDark ? 'bg-slate-900/90 border-slate-700' : 'bg-white border-slate-300'} p-1.5 rounded-xl border shadow-md text-xs font-mono`}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-2"></span>
              <span className={`${textSub} pr-2 font-medium`}>Ledger Node Active</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`${bgPanel} p-4 rounded-2xl border ${borderEl} shadow-xl flex items-center justify-between transition-colors`}>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Pipeline Load</p>
              <h3 className={`text-2xl font-bold ${textTitle} mt-0.5`}>{totalApplied} Logged</h3>
            </div>
            <div className={`p-3 ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'} rounded-xl`}><Layers className="w-5 h-5" /></div>
          </div>
          <div className={`${bgPanel} p-4 rounded-2xl border ${borderEl} shadow-xl flex items-center justify-between transition-colors`}>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Active Conversions</p>
              <h3 className="text-2xl font-bold text-emerald-500 mt-0.5">{totalInterviews} Live</h3>
            </div>
            <div className={`p-3 ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'} rounded-xl`}><Calendar className="w-5 h-5" /></div>
          </div>
          <div className={`${bgPanel} p-4 rounded-2xl border ${borderEl} shadow-xl flex items-center justify-between transition-colors`}>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Match Accuracy</p>
              <h3 className="text-2xl font-bold text-amber-500 mt-0.5">{avgAtsScore}% Avg</h3>
            </div>
            <div className={`p-3 ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'} rounded-xl`}><Sparkles className="w-5 h-5" /></div>
          </div>
        </div>

        {/* ==================== QA JOB MATCH RUNNER PANEL (INTEGRATED) ==================== */}
        <div className={`${bgPanel} p-5 rounded-2xl border ${borderEl} shadow-2xl transition-colors space-y-4`}>
          <div className={`flex items-center justify-between pb-2 border-b ${borderEl}`}>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-500" />
              <h3 className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>QA Job Match Runner</h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Client-Side PDF Runner</span>
          </div>

          {/* Top Control Grid Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch mb-4">
            
            {/* Left Column: Upload Listings File */}
            <div className="space-y-1 flex flex-col justify-between h-full">
              <label className={`text-[11px] ${textSub} font-semibold uppercase tracking-wide`}>01 · Upload Listings File</label>
              <label className={`flex flex-col items-center justify-center border-2 border-dashed ${borderEl} rounded-xl p-5 text-center cursor-pointer hover:border-blue-500 transition ${bgInner} flex-grow`}>
                <input type="file" ref={qjmFileInputRef} onChange={handleFileUpload} className="hidden" />
                <Upload className="w-6 h-6 text-blue-500 mb-1" />
                <span className={`text-xs font-bold ${textTitle}`}>Click to choose any job listing file</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Supports PDF, Text files, and more</span>
              </label>
              {qjmStatusText && (
                <div className={`flex items-center gap-2 text-xs font-mono mt-2 ${qjmIsError ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {qjmIsLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>{qjmStatusText}</span>
                </div>
              )}
            </div>

            {/* Right Column: Matcher Profile */}
            <div className="space-y-3 flex flex-col justify-between h-full">
              <div className="space-y-1">
                <label className={`text-[11px] ${textSub} font-semibold uppercase tracking-wide`}>02 · Matcher Profile</label>
                <textarea 
                  value={qjmSkills} 
                  onChange={(e) => setQjmSkills(e.target.value)} 
                  className={`w-full min-h-[95px] border rounded-xl p-2.5 text-xs font-mono resize-y focus:outline-none ${inputEl}`}
                  placeholder="Skills & tools (comma separated)"
                />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <div className="w-1/2 space-y-1">
                  <label className={`text-[10px] ${textSub} font-semibold`}>Experience (Years)</label>
                  <input 
                    type="text" 
                    value={qjmYears} 
                    onChange={(e) => setQjmYears(e.target.value)} 
                    className={`w-full border rounded-xl p-2 text-xs font-mono ${inputEl}`} 
                  />
                </div>
                <div className="w-1/2 flex items-end">
                  <button 
                    onClick={handleSaveQjmProfile} 
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-1.5"
                  >
                    <span>Save Profile</span>
                    {qjmProfileSaved && <span className="text-emerald-300">✓</span>}
                  </button>
                </div>
              </div>
            </div>

          </div>

          {qjmJobs.length > 0 && (
            <div className="space-y-4 pt-3 border-t border-slate-700/40">
              <div className="flex flex-wrap gap-3">
                <div className={`${bgInner} border ${borderEl} rounded-xl px-3 py-2 flex items-center gap-2`}>
                  <span className="text-xs text-slate-400 uppercase font-bold text-[10px]">Total Parsed:</span>
                  <span className={`text-sm font-bold ${textTitle}`}>{qjmJobs.length}</span>
                </div>
                <div className={`${bgInner} border ${borderEl} rounded-xl px-3 py-2 flex items-center gap-2`}>
                  <span className="text-xs text-emerald-400 uppercase font-bold text-[10px]">Pass:</span>
                  <span className="text-sm font-bold text-emerald-400">{qjmPassCount}</span>
                </div>
                <div className={`${bgInner} border ${borderEl} rounded-xl px-3 py-2 flex items-center gap-2`}>
                  <span className="text-xs text-amber-400 uppercase font-bold text-[10px]">Review:</span>
                  <span className="text-sm font-bold text-amber-400">{qjmReviewCount}</span>
                </div>
                <div className={`${bgInner} border ${borderEl} rounded-xl px-3 py-2 flex items-center gap-2`}>
                  <span className="text-xs text-rose-400 uppercase font-bold text-[10px]">Skip:</span>
                  <span className="text-sm font-bold text-rose-400">{qjmSkipCount}</span>
                </div>
                <button
                  onClick={handleClearQjmData}
                  className="flex items-center gap-1.5 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl px-3 py-2 text-xs font-bold transition"
                  title="Clear parsed listings and upload a new file"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear Data
                </button>
              </div>

              {/* Filters & Sorting */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className={`flex rounded-xl border ${borderEl} overflow-hidden text-xs font-mono`}>
                    <button onClick={() => setQjmRegion('all')} className={`px-3 py-1.5 ${qjmRegion === 'all' ? 'bg-blue-600 text-white font-bold' : `${textSub} hover:bg-slate-800`}`}>All Regions</button>
                    <button onClick={() => setQjmRegion('india')} className={`px-3 py-1.5 ${qjmRegion === 'india' ? 'bg-blue-600 text-white font-bold' : `${textSub} hover:bg-slate-800`}`}>India</button>
                    <button onClick={() => setQjmRegion('abroad')} className={`px-3 py-1.5 ${qjmRegion === 'abroad' ? 'bg-blue-600 text-white font-bold' : `${textSub} hover:bg-slate-800`}`}>Abroad</button>
                    <button onClick={() => setQjmRegion('fresher')} className={`px-3 py-1.5 ${qjmRegion === 'fresher' ? 'bg-blue-600 text-white font-bold' : `${textSub} hover:bg-slate-800`}`}>Fresher</button>
                  </div>

                  {/* Multi-Select Location Filter Section */}
                  <div className="relative">
                    <button 
                      type="button"
                      onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
                      className={`px-3 py-1.5 rounded-xl border ${borderEl} text-xs font-mono flex items-center gap-2 ${isDark ? 'bg-slate-950 text-slate-200' : 'bg-white text-slate-800'}`}
                    >
                      <span>Location: {selectedLocations.length === 0 ? 'All Locations' : `${selectedLocations.length} selected`}</span>
                      <span className="text-[10px]">▼</span>
                    </button>

                    {isLocationDropdownOpen && (
                      <div className={`absolute z-20 mt-1 w-56 rounded-xl border ${borderEl} ${isDark ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-900'} shadow-2xl p-3 space-y-2 max-h-60 overflow-y-auto`}>
                        <div className="flex items-center justify-between pb-2 border-b border-slate-700/40 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <span>Filter Locations</span>
                          {selectedLocations.length > 0 && (
                            <button onClick={() => setSelectedLocations([])} className="text-blue-400 hover:underline">Reset</button>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          {availableLocations.map((loc) => {
                            const isChecked = selectedLocations.includes(loc);
                            return (
                              <label key={loc} className="flex items-center gap-2 text-xs cursor-pointer hover:opacity-80">
                                <input 
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setSelectedLocations(selectedLocations.filter(item => item !== loc));
                                    } else {
                                      setSelectedLocations([...selectedLocations, loc]);
                                    }
                                  }}
                                  className="accent-blue-600 rounded"
                                />
                                <span className="font-mono truncate">{loc}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={`flex rounded-xl border ${borderEl} overflow-hidden text-xs font-mono`}>
                    <button onClick={() => setQjmVerdict('all')} className={`px-2.5 py-1.5 ${qjmVerdict === 'all' ? 'bg-indigo-600 text-white font-bold' : `${textSub} hover:bg-slate-800`}`}>All Verdicts</button>
                    <button onClick={() => setQjmVerdict('PASS')} className={`px-2.5 py-1.5 ${qjmVerdict === 'PASS' ? 'bg-emerald-600 text-white font-bold' : `${textSub} hover:bg-slate-800`}`}>Pass</button>
                    <button onClick={() => setQjmVerdict('REVIEW')} className={`px-2.5 py-1.5 ${qjmVerdict === 'REVIEW' ? 'bg-amber-600 text-white font-bold' : `${textSub} hover:bg-slate-800`}`}>Review</button>
                    <button onClick={() => setQjmVerdict('SKIP')} className={`px-2.5 py-1.5 ${qjmVerdict === 'SKIP' ? 'bg-rose-600 text-white font-bold' : `${textSub} hover:bg-slate-800`}`}>Skip</button>
                  </div>
                </div>

                <select 
                  value={qjmSort} 
                  onChange={(e) => setQjmSort(e.target.value)} 
                  className={`text-xs rounded-xl px-3 py-2 border ${inputEl} font-mono`}
                >
                  <option value="score">Sort: Best Match First</option>
                  <option value="title">Sort: Job Title</option>
                </select>
              </div>

              {/* Parsed Jobs List */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {filteredQjmJobs.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 font-mono text-xs italic">No listings match the selected filters.</div>
                ) : (
                  filteredQjmJobs.map((job) => {
                    const isExpanded = expandedJobIds[job.id];
                    const verdictColor = 
                      job.verdict === 'PASS' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                      job.verdict === 'REVIEW' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                      'bg-rose-500/15 text-rose-400 border-rose-500/30';

                    return (
                      <div key={job.id} className={`${bgInner} border ${borderEl} rounded-xl p-4 space-y-3 transition shadow-md`}>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div>
                            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{job.company} • {job.location || 'Location Not Specified'}</div>
                            <h4 className={`text-base font-bold ${textTitle} mt-0.5`}>{job.title}</h4>
                            <div className="text-xs text-slate-300 mt-1 font-mono">Exp: {job.experience || 'Not specified'}</div>
                          </div>
                          
                          {/* Right Side Group: Badge, Quick Apply, and Email stacked vertically below */}
                          <div className="flex flex-col items-end gap-1.5 self-end sm:self-auto">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold font-mono px-3 py-1 rounded-full border ${verdictColor}`}>{job.verdict} ({job.score}%)</span>
                              <button 
                                onClick={() => handleQuickApplyLoad(job)}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-sm transition"
                                title="Load job details into Outbound Core email sender"
                              >
                                Quick Apply →
                              </button>
                            </div>
                            {job.email && (
                              <div className="mt-2 text-xs font-medium text-slate-400">
                                Recruiter Email : <a href={`mailto:${job.email}`} className="text-blue-400 hover:text-blue-300 font-semibold underline decoration-blue-400/30 underline-offset-4 transition-all">
                                  {job.email}
                                </a>
                              </div>
                            )}

                          </div>
                        </div>

                        {/* Match Bar */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-700/50">
                            <div className={`h-full rounded-full ${job.score >= 70 ? 'bg-emerald-500' : job.score >= 45 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${job.score}%` }}></div>
                          </div>
                          <span className={`font-mono text-xs font-bold w-10 text-right ${
                                  job.score >= 80 
                                  ? 'text-emerald-400' 
                                  : job.score >= 50 
                                  ? 'text-amber-500' 
                                  : 'text-rose-500'
                                  }`}>
                                {job.score}%
                          </span>
                        </div>

                        {/* Hits and Misses tags */}
                        {job.hits && job.hits.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {job.hits.map((h, i) => (
                              <span key={i} className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">✓ {h}</span>
                            ))}
                            {job.misses && job.misses.map((m, i) => (
                              <span key={i} className="text-[10px] font-mono bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded">✗ {m}</span>
                            ))}
                          </div>
                        )}

                        <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-700/40">
                          <span className="text-slate-400 italic text-[11px]">{job.tip}</span>
                          <button 
                            onClick={() => setExpandedJobIds(prev => ({ ...prev, [job.id]: !isExpanded }))}
                            className="text-blue-400 font-bold hover:underline font-mono text-[11px]"
                          >
                            {isExpanded ? 'Hide Description ▴' : 'View Description ▾'}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="text-xs font-mono text-slate-300 bg-slate-950/80 p-3 rounded-lg border border-slate-800 whitespace-pre-line leading-relaxed">
                            {job.description || "No full description extracted."}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
        {/* ============================================================================================ */}

        {/* ==================== HR EMAIL CONTACT EXTRACTOR PANEL (NEW) ==================== */}
        <div className={`${bgPanel} p-5 rounded-2xl border ${borderEl} shadow-2xl transition-colors space-y-4`}>
          <div className={`flex items-center justify-between pb-2 border-b ${borderEl}`}>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-500" />
              <h3 className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>HR Email Contact Extractor</h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Client-Side PDF Runner</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            <div className="space-y-1 flex flex-col justify-between h-full">
              <label className={`text-[11px] ${textSub} font-semibold uppercase tracking-wide`}>Upload HR Email List File</label>
              <label className={`flex flex-col items-center justify-center border-2 border-dashed ${borderEl} rounded-xl p-5 text-center cursor-pointer hover:border-emerald-500 transition ${bgInner} flex-grow`}>
                <input type="file" ref={hrFileInputRef} onChange={handleHrFileUpload} className="hidden" />
                <Upload className="w-6 h-6 text-emerald-500 mb-1" />
                <span className={`text-xs font-bold ${textTitle}`}>Click to choose HR email list file</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Supports PDF, Text files, and more</span>
              </label>
              {hrStatusText && (
                <div className={`flex items-center gap-2 text-xs font-mono mt-2 ${hrIsError ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {hrIsLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>{hrStatusText}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-5 justify-center items-start">
              <div className={`${bgInner} border ${borderEl} rounded-xl px-3.5 py-2 flex items-center justify-between gap-x-3 gap-y-1.5 flex-wrap sm:flex-nowrap w-fit motion-safe:transition-all duration-200`}>
                <span className="text-xs text-slate-400 uppercase font-bold text-[12px]">Contacts Found:</span>
                <span className={`text-sm font-bold ${textTitle}`}>{hrContacts.length}</span>
              </div>
              {hrContacts.length > 0 && (
                <button
                  onClick={handleClearHrContacts}
                  className="flex items-center gap-1.5 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl px-3 py-2 text-xs font-bold transition self-start"
                  title="Clear extracted HR contacts and upload a new file"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear Data
                </button>
              )}
            </div>
          </div>

          {hrContacts.length > 0 && (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 pt-2 border-t border-slate-700/40">
              {hrContacts.map((contact) => (
                <div key={contact.id} className={`${bgInner} border ${borderEl} rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-md`}>
                  <div>
                    <div className={`text-xs font-bold ${textTitle}`}>{contact.name}</div>
                    <a href={`mailto:${contact.email}`} className="text-blue-400 hover:text-blue-300 text-xs font-mono underline decoration-blue-400/30 underline-offset-4">{contact.email}</a>
                    {contact.linkedin && (
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 underline decoration-slate-500/30">LinkedIn Profile</a>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleUseHrContact(contact)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition self-start sm:self-auto"
                    title="Load this HR email into Outbound Core email sender"
                  >
                    Use Email →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* ============================================================================================ */}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className={`lg:col-span-4 ${bgPanel} p-5 rounded-2xl border ${borderEl} shadow-2xl flex flex-col space-y-4 transition-colors`}>
            <div className={`flex items-center gap-2 pb-2 border-b ${borderEl}`}>
              <Sparkles className="w-4 h-4 text-blue-500" />
              <h3 className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>1. Context ATS Matcher</h3>
            </div>
            
            <div className="space-y-1.5">
              <label className={`text-[11px] ${textSub} font-semibold`}>Target Job Description Specifications</label>
              <textarea 
                value={jobDescription} 
                onChange={(e) => setJobDescription(e.target.value)}
                className={`w-full h-52 border rounded-xl p-3 text-xs font-mono resize-none focus:outline-none focus:ring-2 transition scrollbar-thin ${inputEl}`}
                placeholder="Drop core requirements, responsibilities or skills requirements text block here..."
              />
            </div>

            <button 
              onClick={triggerRealAtsCheck} 
              disabled={isCheckingAts || !jobDescription}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white disabled:text-slate-400 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md"
            >
              {isCheckingAts ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Analyze Interface Overlaps'}
            </button>
            
            {atsScore !== null && (
              <div className={`space-y-4 pt-4 border-t ${borderEl}`}>
                <div className={`${bgInner} p-3 rounded-xl border ${borderEl} flex justify-between items-center shadow-inner`}>
                  <span className={`text-xs ${textSub} font-medium`}>Parser Output Weight:</span>
                  <span className={`text-base font-bold ${atsScore >= 75 ? 'text-emerald-500' : 'text-amber-500'}`}>{atsScore}% Match</span>
                </div>

                <div className="space-y-1.5">
                  <h4 className={`text-[11px] font-bold ${textSub} uppercase tracking-wide flex items-center gap-1.5`}><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Matched Tags</h4>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                    {matchedKeywords.length === 0 ? <span className="text-xs text-slate-400 italic">None identified</span> : 
                      matchedKeywords.map((word, i) => (
                        <span key={i} className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-mono font-medium">{word}</span>
                      ))
                    }
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className={`text-[11px] font-bold ${textSub} uppercase tracking-wide flex items-center gap-1.5`}><AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Profiling Gaps</h4>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                    {missingKeywords.length === 0 ? <span className="text-xs text-slate-400 italic">No variant differences</span> : 
                      missingKeywords.map((word, i) => (
                        <span key={i} className="bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] px-2 py-0.5 rounded font-mono font-medium">{word}</span>
                      ))
                    }
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-8 space-y-6">
            <div className={`${bgPanel} p-5 rounded-2xl border ${borderEl} shadow-2xl transition-colors`}>
              <div className={`flex items-center justify-between pb-2 border-b ${borderEl} mb-4`}>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-500" />
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>2. Outbound Distribution Core</h3>
                </div>
                {snippets.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1"><MessageSquare className="w-3 h-3 text-blue-400" /> Template:</span>
                    <select 
                      value={selectedSnippetId} 
                      onChange={handleSnippetChange}
                      className={`text-xs rounded-lg px-2 py-1 border ${isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`}
                    >
                      <option value="">-- Custom / Default --</option>
                      {snippets.map(snip => (
                        <option key={snip.id} value={snip.id}>
                          {snip.subject.length > 40 ? snip.subject.substring(0, 40) + '...' : snip.subject}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              
              <form onSubmit={executeRealSend} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className={`text-[10px] ${textSub} font-semibold`}>Company Name</label>
                    <input type="text" placeholder="Company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 transition ${inputEl}`} />
                  </div>
                  
                  {/* Job Portal Selector Dropdown */}
                  <div className="space-y-1">
                    <label className={`text-[10px] ${textSub} font-semibold`}>Job Portal Reference</label>
                    <div className="flex gap-1.5">
                      <select 
                        value={selectedJobPortal} 
                        onChange={(e) => setSelectedJobPortal(e.target.value)} 
                        className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none transition ${inputEl}`}
                      >
                        <option value="Naukri">Naukri</option>
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="Indeed">Indeed</option>
                        <option value="Glassdoor">Glassdoor</option>
                        <option value="Cutshort.ai">Cutshort.ai</option>
                        <option value="Instahire">Instahire</option>
                        <option value="Custom">Other (Custom Portal)</option>
                      </select>
                      {selectedJobPortal === 'Custom' && (
                        <input 
                          type="text" 
                          placeholder="Custom Portal Name" 
                          value={customJobPortal} 
                          onChange={(e) => setCustomJobPortal(e.target.value)} 
                          className={`w-1/2 border rounded-xl p-2.5 text-xs focus:outline-none transition ${inputEl}`}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                    <label className={`text-[10px] ${textSub} font-semibold`}>Target Role Designation</label>
                    <div className="flex gap-1.5">
                      <select 
                        value={selectedPosition} 
                        onChange={(e) => setSelectedPosition(e.target.value)} 
                        className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none transition ${inputEl}`}
                      >
                        <option value="QA Engineer">QA Engineer</option>
                        <option value="Software Test Engineer">Software Test Engineer</option>
                        <option value="Automation Engineer">Automation Engineer</option>
                        <option value="SDET">SDET</option>
                        <option value="Custom">Other (Custom Title)</option>
                      </select>
                      {selectedPosition === 'Custom' && (
                        <input 
                          type="text" 
                          placeholder="Custom Job Title" 
                          value={customPosition} 
                          onChange={(e) => setCustomPosition(e.target.value)} 
                          className={`w-[110px] sm:w-[130px] border rounded-xl p-2.5 text-xs focus:outline-none transition ${inputEl}`}
                        />
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className={`text-[10px] ${textSub} font-semibold`}>Destination Recruiter Email Address</label>
                    <input type="email" placeholder="pointofcontact@company.com" value={recruiterEmail} onChange={(e) => setRecruiterEmail(e.target.value)} className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 transition ${inputEl}`} />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className={`${bgInner} border ${borderEl} rounded-xl p-3 space-y-2 shadow-inner`}>
                    <label className="text-[10px] uppercase tracking-wider font-bold text-amber-400 flex items-center gap-1.5"><User className="w-3 h-3" /> Origin Route Mapping</label>
                    <select value={fromAccount} onChange={(e) => setFromAccount(e.target.value)} className={`w-full rounded-lg p-2 text-xs border focus:outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`}>
                      <option value="milindstalekar1667@gmail.com">milindstalekar1667@gmail.com (OAuth-Secure)</option>
                    </select>
                  </div>

                  <div className={`${bgInner} border ${borderEl} rounded-xl p-3 space-y-2 shadow-inner`}>
                    <label className="text-[10px] uppercase tracking-wider font-bold text-blue-400 flex items-center gap-1.5"><FileText className="w-3 h-3" /> Attached Payload Blueprint</label>
                    <div className="flex flex-col gap-1.5">
                      <select value={resumeType} onChange={(e) => setResumeType(e.target.value)} className={`w-full rounded-lg p-2 text-xs border focus:outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`}>
                        <option value="system">Milind's Primary Profile (Automated)</option>
                        <option value="manual">Inject Manual Asset File</option>
                      </select>
                      
                      {resumeType === 'manual' && (
                        <div className={`flex items-center justify-between border rounded-lg p-1 pl-2 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}>
                          <div className="flex items-center gap-2 truncate max-w-[70%]">
                            <label className={`flex items-center gap-1 text-[10px] font-bold py-1 px-2 rounded-md cursor-pointer transition ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                              <Upload className="w-2.5 h-2.5 text-blue-500" /> Upload
                              <input type="file" accept=".pdf" onChange={(e) => setCustomResumeFile(e.target.files[0])} className="hidden" />
                            </label>
                            <span className="text-[10px] font-mono text-slate-400 truncate">{customResumeFile ? customResumeFile.name : "Please upload resume here"}</span>
                          </div>
                          {customResumeFile && (
                            <button type="button" onClick={handleViewFile} className="text-[10px] font-bold text-blue-400 hover:underline bg-blue-500/10 px-2 py-1 rounded">Preview</button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <input type="text" value={subjectLine} onChange={(e) => setSubjectLine(e.target.value)} className={`w-full border rounded-xl p-2.5 text-xs font-mono focus:outline-none focus:ring-2 transition ${inputEl}`} placeholder="Subject Line" />
                  
                  {/* Rich Text Email Body Section with Toolbar, Font Selection, Undo/Redo & Maximize */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className={`text-[11px] ${textSub} font-semibold uppercase tracking-wide`}>Email Body</label>
                      <button 
                        type="button"
                        onClick={() => setIsMaximized(!isMaximized)}
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border transition ${isDark ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'}`}
                      >
                        {isMaximized ? 'Minimize 🗗' : 'Maximize 🗖'}
                      </button>
                    </div>
                    
                    <div className={`border ${borderEl} rounded-xl overflow-hidden ${bgInner} transition-all duration-200`}>
                      {/* Toolbar Header */}
                      <div className={`flex items-center gap-1.5 px-3 py-2 border-b ${borderEl} bg-slate-900/50 text-slate-300 text-xs flex-wrap`}>
                        {/* Formatting Buttons */}
                        <button 
                          type="button"
                          onClick={() => document.execCommand('bold', false, null)} 
                          className="px-2 py-1 hover:bg-slate-700/60 rounded font-bold transition" 
                          title="Bold"
                        >
                          B
                        </button>
                        <button 
                          type="button"
                          onClick={() => document.execCommand('italic', false, null)} 
                          className="px-2 py-1 hover:bg-slate-700/60 rounded italic transition" 
                          title="Italic"
                        >
                          I
                        </button>
                        <button 
                          type="button"
                          onClick={() => document.execCommand('underline', false, null)} 
                          className="px-2 py-1 hover:bg-slate-700/60 rounded underline transition" 
                          title="Underline"
                        >
                          U
                        </button>

                        <div className="w-[1px] h-4 bg-slate-700 mx-1"></div>

                        {/* Font Family Selector */}
                        <select 
                          onChange={(e) => document.execCommand('fontName', false, e.target.value)}
                          defaultValue="Verdana"
                          className="bg-slate-800 border border-slate-700 text-slate-200 text-[11px] rounded px-1.5 py-1 focus:outline-none cursor-pointer"
                          title="Font Family"
                        >
                          <option value="Verdana">Verdana</option>
                          <option value="Arial">Arial</option>
                          <option value="Georgia">Georgia</option>
                          <option value="Courier New">Courier New</option>
                          <option value="Inter">Inter</option>
                        </select>

                        {/* Font Size Selector */}
                        <select 
                          onChange={(e) => document.execCommand('fontSize', false, e.target.value)}
                          defaultValue="3"
                          className="bg-slate-800 border border-slate-700 text-slate-200 text-[11px] rounded px-1.5 py-1 focus:outline-none cursor-pointer"
                          title="Font Size"
                        >
                          <option value="2">Small</option>
                          <option value="3">Normal</option>
                          <option value="4">Large</option>
                          <option value="5">Extra Large</option>
                        </select>

                        <div className="w-[1px] h-4 bg-slate-700 mx-1"></div>

                        {/* Undo / Redo */}
                        <button 
                          type="button"
                          onClick={() => document.execCommand('undo', false, null)} 
                          className="px-2 py-1 hover:bg-slate-700/60 rounded transition font-mono text-[11px]" 
                          title="Undo"
                        >
                          ↺ Undo
                        </button>
                        <button 
                          type="button"
                          onClick={() => document.execCommand('redo', false, null)} 
                          className="px-2 py-1 hover:bg-slate-700/60 rounded transition font-mono text-[11px]" 
                          title="Redo"
                        >
                          Redo ↻
                        </button>
                      </div>

                      {/* ContentEditable Rich Text Editor Box preserving exact formatting */}
                      <div 
                        ref={(node) => {
                          if (node && node.innerHTML !== emailBody && !node.contains(document.activeElement)) {
                            node.innerHTML = emailBody;
                          }
                        }}
                        contentEditable={true}
                        onInput={(e) => setEmailBody(e.currentTarget.innerHTML)}
                        style={{ fontFamily: 'Verdana, Geneva, sans-serif', whiteSpace: 'pre-wrap' }}
                        className={`w-full bg-transparent p-3 text-xs focus:outline-none ${textTitle} overflow-y-auto transition-all ${isMaximized ? 'h-[450px]' : 'h-40'}`}
                      />
                    </div>
                  </div>
                </div>
                
                <div className={`${bgInner} border border-dashed ${borderEl} rounded-xl p-3 flex items-center justify-between text-xs shadow-inner`}>
                  <span className={`flex items-center gap-1.5 text-[11px] font-semibold ${textSub}`}><Paperclip className="w-4 h-4 text-blue-500" /> Document Configuration Link:</span>
                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    <span className={`${isDark ? 'bg-slate-900 text-slate-300 border-slate-700' : 'bg-white text-slate-700 border-slate-300'} px-2 py-1 border rounded-md font-medium`}>
                      {resumeType === 'system' ? 'Milind_Talekar_SDET_PhonePe_Resume_2026.pdf' : (customResumeFile?.name || 'Setup required')}
                    </span>
                    <button type="button" onClick={handleViewFile} className="text-blue-400 hover:text-blue-300 font-bold bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-md transition flex items-center gap-1">
                      <Eye className="w-3 h-3" /> View Target File
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isDeliveringPackage}
                  className={`w-full py-3 text-white text-xs font-bold rounded-xl transition shadow-lg flex items-center justify-center gap-2 ${
                    isDeliveringPackage ? "bg-slate-700 cursor-not-allowed text-slate-300" : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500"
                  }`}
                >
                  {isDeliveringPackage ? "Executing SMTP Link & Packet Delivery Configuration..." : <><Send className="w-3.5 h-3.5" /> Dispatch Active Package Assets & Update Ledger</>}
                </button>
              </form>
            </div>

            <div className={`${bgPanel} p-5 rounded-2xl border ${borderEl} shadow-2xl transition-colors`}>
              <div className={`flex items-center gap-2 pb-2 border-b ${borderEl} mb-4`}>
                <PhoneCall className="w-4 h-4 text-emerald-500" />
                <h3 className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>3. Log Inbound Recruiter Call / Direct Contact</h3>
              </div>
              
              <form onSubmit={handleManualLog} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className={`text-[10px] ${textSub} font-semibold`}>Company Name</label>
                    <input type="text" placeholder="Recruiter's Company" value={manualCompany} onChange={(e) => setManualCompany(e.target.value)} className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none ${inputEl}`} />
                  </div>
                  <div className="space-y-1">
                    <label className={`text-[10px] ${textSub} font-semibold`}>Job Role Designation</label>
                    <input type="text" placeholder="Offered or Discussed Role" value={manualRole} onChange={(e) => setManualRole(e.target.value)} className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none ${inputEl}`} />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className={`text-[10px] ${textSub} font-semibold`}>Recruiter Name / Phone / Email</label>
                    <input type="text" placeholder="Recruiter Contact Details" value={manualContact} onChange={(e) => setManualContact(e.target.value)} className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none ${inputEl}`} />
                  </div>
                  <div className="space-y-1">
                    <label className={`text-[10px] ${textSub} font-semibold flex items-center gap-1.5`}>
                      <CalendarDays className="w-3.5 h-3.5 text-emerald-500" /> Call / Contact Date
                    </label>
                    <input 
                      type="date" 
                      value={manualDate} 
                      onChange={(e) => setManualDate(e.target.value)} 
                      className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none cursor-pointer ${inputEl} [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[0.6] [&::-webkit-calendar-picker-indicator]:hover:opacity-100`} 
                    />
                  </div>
                </div>

                <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-md">
                  Save Recruiter Call to Ledger
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className={`${bgPanel} border ${borderEl} rounded-2xl p-5 shadow-2xl transition-colors`}>
          <div className={`flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-5 pb-3 border-b ${borderEl}`}>
            <div className="flex items-center gap-4">
              <div>
                <h2 className={`text-sm font-bold uppercase tracking-wider ${textTitle} flex items-center gap-2`}><Layers className="w-4 h-4 text-blue-500" /> Operational Record Tracking Pipeline</h2>
                <p className={`${textSub} text-[11px] mt-0.5 font-medium`}>Synchronized historical ledger logging backend transactions</p>
              </div>
              {selectedTimestamps.length > 0 && (
                <button 
                  onClick={deleteSelectedApplications}
                  className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-md animate-fade-in"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Selected ({selectedTimestamps.length})
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button 
                onClick={startBatchEditing} 
                disabled={selectedTimestamps.length === 0}
                className={`flex items-center gap-1.5 border px-3 py-2 rounded-xl text-xs font-bold transition shadow-md ${
                  selectedTimestamps.length > 0 
                    ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500 cursor-pointer' 
                    : isDark ? 'bg-slate-950/50 border-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Selected ({selectedTimestamps.length})
              </button>
              <button onClick={downloadCSV} className={`flex items-center gap-1.5 border px-3 py-2 rounded-xl text-xs font-bold transition shadow-md ${isDark ? 'bg-slate-950 border-slate-700 text-slate-200 hover:text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                <Download className="w-3.5 h-3.5 text-blue-500" /> Export System Data (.CSV)
              </button>
            </div>
          </div>

          {isBatchEditing && (
            <div className={`mb-5 p-4 rounded-xl border ${isDark ? 'bg-slate-950/90 border-blue-500/50' : 'bg-blue-50/80 border-blue-300'} shadow-lg space-y-3`}>
              <div className="flex justify-between items-center">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${textTitle} flex items-center gap-1.5`}>
                  <Edit3 className="w-4 h-4 text-blue-500" /> Batch Edit Selected Records ({selectedTimestamps.length})
                </h3>
                <button onClick={() => setIsBatchEditing(false)} className="text-slate-400 hover:text-slate-200 text-xs font-bold">✕ Close</button>
              </div>
              <p className="text-[11px] text-slate-400">Leave fields blank if you do not want to alter them across the selected items.</p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input 
                  type="text" 
                  placeholder="New Job Title (leave blank to keep)" 
                  value={batchEditForm.role} 
                  onChange={(e) => setBatchEditForm({ ...batchEditForm, role: e.target.value })} 
                  className={`border rounded-lg p-2 text-xs ${inputEl}`} 
                />
                <input 
                  type="text" 
                  placeholder="New Company (leave blank to keep)" 
                  value={batchEditForm.company} 
                  onChange={(e) => setBatchEditForm({ ...batchEditForm, company: e.target.value })} 
                  className={`border rounded-lg p-2 text-xs ${inputEl}`} 
                />
                <input 
                  type="text" 
                  placeholder="New Destination Email" 
                  value={batchEditForm.recipientEmail} 
                  onChange={(e) => setBatchEditForm({ ...batchEditForm, recipientEmail: e.target.value })} 
                  className={`border rounded-lg p-2 text-xs font-mono ${inputEl}`} 
                />
                <input 
                  type="number" 
                  placeholder="New ATS Score %" 
                  value={batchEditForm.atsScore} 
                  onChange={(e) => setBatchEditForm({ ...batchEditForm, atsScore: e.target.value })} 
                  className={`border rounded-lg p-2 text-xs font-mono ${inputEl}`} 
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setIsBatchEditing(false)} className={`px-3 py-1.5 border rounded-lg text-xs font-semibold ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-900' : 'border-slate-300 text-slate-700 hover:bg-white'}`}>Cancel</button>
                <button onClick={saveBatchEditing} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md">Apply Batch Updates</button>
              </div>
            </div>
          )}
          
          <div className={`overflow-x-auto rounded-xl border ${isDark ? 'border-slate-800' : 'border-slate-200'} shadow-md`}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`${isDark ? 'bg-slate-950/90 border-slate-700' : 'bg-slate-100 border-slate-200'} border-b text-[10px] font-bold text-slate-400 uppercase tracking-wider`}>
                  <th className="py-3 px-3 text-center">
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll} 
                      checked={applications.length > 0 && selectedTimestamps.length === applications.length}
                      className="cursor-pointer accent-blue-600 rounded" 
                    />
                  </th>
                  <th className="py-3 px-4"># ID</th>
                  <th className="py-3 px-4">Job Designation</th>
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">Destination Router & Channel</th>
                  <th className="py-3 px-4 text-center">ATS Weight</th>
                  <th className="py-3 px-4">Dispatch Status</th>
                  <th className="py-3 px-4">Interview Scheduled</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Follow-Up</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                {applications.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="py-8 text-center text-slate-400 font-mono text-xs italic">No data transactions synchronized to local node ledger cluster.</td>
                  </tr>
                ) : (
                  applications.map((app, index) => {
                    const isSelected = selectedTimestamps.includes(app.timestamp);

                    return (
                      <tr key={app.timestamp} className={`text-xs transition-colors ${isSelected ? (isDark ? 'bg-blue-950/30' : 'bg-blue-50/50') : ''} ${isDark ? 'hover:bg-slate-950/60 text-slate-200' : 'hover:bg-slate-50 text-slate-800'}`}>
                        <td className="py-3.5 px-3 text-center align-middle">
                          <input 
                            type="checkbox" 
                            checked={isSelected} 
                            onChange={() => handleSelectOne(app.timestamp)}
                            className="cursor-pointer accent-blue-600 rounded" 
                          />
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px] align-middle">{index}</td>
                        
                        <td className="py-3.5 px-4 font-bold align-middle">
                          <span className={isDark ? 'text-white' : 'text-slate-900'}>{app.role}</span>
                        </td>

                        <td className="py-3.5 px-4 font-semibold align-middle">
                          {app.company}
                        </td>
                        
                        <td className="py-3.5 px-4 align-middle">
                          <div className="space-y-1.5 py-0.5">
                            <div className="font-mono text-slate-300 text-[11px] truncate max-w-[180px]" title={app.recipientEmail}>{app.recipientEmail || 'Phone Direct'}</div>
                            <div>
                              <button 
                                type="button" 
                                onClick={() => handleToggleSource(app.timestamp, app.applicationSource)}
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition inline-flex items-center gap-1 ${
                                  app.applicationSource === 'phone' 
                                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' 
                                    : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                                }`}
                                title="Click to toggle between Email and Phone call channel"
                              >
                                {app.applicationSource === 'phone' ? '📞 Recruiter Phone Call' : '✉️ Email Application'}
                              </button>
                            </div>
                          </div>
                        </td>
                        
                        <td className="py-3.5 px-4 text-center align-middle">
                          <span className={`inline-block font-mono font-bold text-[11px] px-2 py-0.5 rounded ${
                            app.atsScore >= 75 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 
                            app.atsScore >= 50 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}>{app.atsScore || 0}%</span>
                        </td>
                        
                        <td className="py-3.5 px-4 align-middle">
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>{app.status || 'Dispatched'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 align-middle">
                          <div className="flex flex-col gap-1.5 min-w-[130px]">
                            <div className={`flex p-0.5 rounded-lg border text-[10px] font-bold w-fit ${isDark ? 'bg-slate-950 border-slate-700' : 'bg-slate-100 border-slate-300'}`}>
                              <button type="button" onClick={() => handleToggleInterview(app.timestamp, app.interviewDone)} className={`px-2 py-0.5 rounded-md transition-all ${app.interviewDone ? 'bg-emerald-500 text-white font-bold' : 'text-slate-400'}`}>Yes</button>
                              <button 
                                type="button" 
                                onClick={() => handleToggleInterview(app.timestamp, app.interviewDone)} 
                                className={`px-2 py-0.5 rounded-md transition-all ${
                                  !app.interviewDone 
                                    ? 'bg-rose-600 text-white shadow-sm font-bold' 
                                    : 'text-slate-400'
                                }`}
                              >
                                No
                              </button>
                            </div>

                            {app.interviewDone && (
                              <div className={`flex items-center px-2 py-0.5 rounded-lg border text-[10px] w-fit ${isDark ? 'bg-slate-950 border-slate-700 shadow-inner' : 'bg-white border-slate-300 shadow-sm'}`}>
                                <span className="text-slate-400 mr-1.5 font-bold uppercase text-[9px]">Round</span>
                                <button type="button" onClick={() => handleUpdateRound(app.timestamp, 'decrement')} className={`w-4 h-4 flex items-center justify-center rounded font-bold ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>-</button>
                                <span className="font-mono font-bold text-blue-400 px-1.5 min-w-[14px] text-center">{app.interviewRound || 0}</span>
                                <button type="button" onClick={() => handleUpdateRound(app.timestamp, 'increment')} className={`w-4 h-4 flex items-center justify-center rounded font-bold ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>+</button>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-300 text-[11px] align-middle">{app.appliedDate ? app.appliedDate.substring(0, 10) : 'N/A'}</td>
                        <td className="py-3.5 px-4 font-mono text-[11px] align-middle"><span className={`px-2 py-0.5 border rounded ${isDark ? 'bg-slate-950 border-slate-700 text-slate-300 font-medium' : 'bg-slate-50 border-slate-300 text-slate-700'}`}>{app.followUpCount || "0 / 5"}</span></td>
                        
                        <td className="py-3.5 px-4 text-center align-middle">
                          <div className="flex items-center justify-center gap-1.5">
                            <button type="button" onClick={() => handleFollowUp(app)} disabled={loadingFollowUpTimestamp === app.timestamp} className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-lg transition shadow-sm">{loadingFollowUpTimestamp === app.timestamp ? "..." : "Follow-up"}</button>
                            <button type="button" onClick={() => deleteApplication(app.timestamp)} className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}