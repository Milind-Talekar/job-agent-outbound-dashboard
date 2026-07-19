import React, { useState, useEffect } from 'react';
import { 
  Briefcase, Mail, User, Paperclip, Check, X, Download, 
  Trash2, Upload, FileText, Eye, Sparkles, Send, 
  Calendar, Layers, CheckCircle2, AlertCircle, RefreshCw, Sun, Moon 
} from 'lucide-react';

export default function App() {
  // Theme Switcher State ('dark' or 'light')
  const [theme, setTheme] = useState('dark');

  const [jobDescription, setJobDescription] = useState('');
  const [atsScore, setAtsScore] = useState(null);
  const [matchedKeywords, setMatchedKeywords] = useState([]);
  const [missingKeywords, setMissingKeywords] = useState([]);
  const [isCheckingAts, setIsCheckingAts] = useState(false);
  const [recruiterEmail, setRecruiterEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  
  const [fromAccount, setFromAccount] = useState('personal@gmail.com');
  const [subjectLine, setSubjectLine] = useState('');
  const [emailBody, setEmailBody] = useState('');
  
  const [applications, setApplications] = useState([]);
  const [isDeliveringPackage, setIsDeliveringPackage] = useState(false);
  const [loadingFollowUpTimestamp, setLoadingFollowUpTimestamp] = useState(null);

  const [resumeType, setResumeType] = useState('system'); 
  const [customResumeFile, setCustomResumeFile] = useState(null);

  const fetchApplications = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/applications');
      const data = await response.json();
      setApplications(data.reverse());
    } catch (error) {
      console.error("Error retrieving tracking data pipeline logs:", error);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    if (jobTitle || companyName) {
      setSubjectLine(`Application for ${jobTitle || '[Job Title]'} - Milind Talekar`);
      setEmailBody(`Hi Team,\n\nI am incredibly excited about the ${jobTitle || '[Job Title]'} opportunity at ${companyName || '[Company]'}.\n\nAttached, please find my resume for your review. I look forward to connecting.\n\nBest regards,\nMilind Talekar`);
    }
  }, [jobTitle, companyName]);

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

  // FIXED: Converted from multi-part FormData payload to structured application/json payload
  const executeRealSend = async (e) => {
    e.preventDefault();
    if (isDeliveringPackage) return; 
    
    if (resumeType === 'manual') {
      alert("Manual custom upload asset injection is bypassed to match the system JSON backend structure. Your system profile file path configured in server.js will be transmitted automatically.");
    }
    
    setIsDeliveringPackage(true); 
    try {
      const res = await fetch('http://localhost:3001/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          toEmail: recruiterEmail,
          subject: subjectLine,
          body: emailBody,
          companyName: companyName,
          jobTitle: jobTitle,
          atsScore: atsScore || 0
        })
      });
      
      const data = await res.json();
      if (data.success) {
        alert("Real Application Pack successfully targeted and dispatched!");
        fetchApplications(); 
      } else {
        alert(`SMTP Routing Rejection: ${data.error}`);
      }
    } catch (err) {
      alert("Data node infrastructure timeout error.");
    } finally {
      setIsDeliveringPackage(false); 
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
          fromAccount: 'personal@gmail.com',
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
    try {
      await fetch('http://localhost:3001/api/applications/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp })
      });
    } catch (err) {}
  };

  const handleViewFile = () => {
    if (resumeType === 'system') {
      window.open('http://localhost:3001/Milind_Talekar_QA_PhonePe_2026.pdf', '_blank');
    } else if (resumeType === 'manual' && customResumeFile) {
      const fileUrl = URL.createObjectURL(customResumeFile);
      window.open(fileUrl, '_blank');
    }
  };

  const downloadCSV = () => {
    if (applications.length === 0) return alert("No ledger logs available to export.");
    const headers = ["Index", "Timestamp", "Job Title", "Company", "Recruiter Email", "ATS Score", "Status", "Interview Scheduled", "Applied Date", "Follow Up"];
    const rows = applications.map((app, index) => [
      index, `"${app.timestamp || ''}"`, `"${app.role || ''}"`, `"${app.company || ''}"`, `"${app.recipientEmail || ''}"`,
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

  // Semantic Theme Style Mappings
  const isDark = theme === 'dark';
  const bgMain = isDark ? "from-slate-950 via-slate-900 to-slate-900 text-slate-100" : "from-zinc-50 via-slate-50 to-zinc-100 text-slate-800";
  const borderEl = isDark ? "border-slate-800/80" : "border-slate-200";
  const bgPanel = isDark ? "bg-slate-900/50 backdrop-blur-md" : "bg-white/80 backdrop-blur-md shadow-sm";
  const bgInner = isDark ? "bg-slate-950" : "bg-slate-100/70";
  const textTitle = isDark ? "text-white" : "text-slate-900";
  const textSub = isDark ? "text-slate-400" : "text-slate-500";
  const inputEl = isDark ? "bg-slate-950/80 border-slate-800 text-white placeholder-slate-600 focus:ring-blue-500/40" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-blue-500/20";

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgMain} p-4 sm:p-8 font-sans antialiased transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <header className={`flex flex-col sm:flex-row justify-between items-start sm:items-center border-b ${borderEl} pb-6 gap-4`}>
          <div>
            <div className="flex items-center gap-2.5">
              <div className={`p-2 ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'} rounded-xl border shadow-inner`}>
                <Briefcase className="text-blue-500 w-6 h-6" />
              </div>
              <h1 className={`text-2xl font-extrabold tracking-tight ${textTitle}`}>
                Career<span className="text-blue-500 font-medium">Hub</span> AI
              </h1>
            </div>
            <p className={`${textSub} text-xs mt-1 ml-11`}>Application orchestration workspace & target execution node</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={`p-2 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-indigo-600 hover:bg-slate-50'} transition shadow-sm flex items-center gap-1.5 text-xs font-semibold`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span>{isDark ? 'Light Workspace' : 'Eye-Protection Mode'}</span>
            </button>

            <div className={`flex items-center gap-2 ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'} p-1.5 rounded-xl border shadow-sm text-xs font-mono`}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-2"></span>
              <span className={`${textSub} pr-2`}>Ledger Node Active</span>
            </div>
          </div>
        </header>

        {/* METRICS METERS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`${bgPanel} p-4 rounded-2xl border ${borderEl} shadow-md flex items-center justify-between transition-colors`}>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Pipeline Load</p>
              <h3 className={`text-2xl font-bold ${textTitle} mt-0.5`}>{totalApplied} Logged</h3>
            </div>
            <div className={`p-3 ${isDark ? 'bg-blue-500/5 text-blue-400' : 'bg-blue-50 text-blue-600'} rounded-xl`}><Layers className="w-5 h-5" /></div>
          </div>
          <div className={`${bgPanel} p-4 rounded-2xl border ${borderEl} shadow-md flex items-center justify-between transition-colors`}>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Active Conversions</p>
              <h3 className="text-2xl font-bold text-emerald-500 mt-0.5">{totalInterviews} Live</h3>
            </div>
            <div className={`p-3 ${isDark ? 'bg-emerald-500/5 text-emerald-400' : 'bg-emerald-50 text-emerald-600'} rounded-xl`}><Calendar className="w-5 h-5" /></div>
          </div>
          <div className={`${bgPanel} p-4 rounded-2xl border ${borderEl} shadow-md flex items-center justify-between transition-colors`}>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Match Accuracy</p>
              <h3 className="text-2xl font-bold text-amber-500 mt-0.5">{avgAtsScore}% Avg</h3>
            </div>
            <div className={`p-3 ${isDark ? 'bg-amber-500/5 text-amber-400' : 'bg-amber-50 text-amber-600'} rounded-xl`}><Sparkles className="w-5 h-5" /></div>
          </div>
        </div>

        {/* WORKSPACE OPERATIONS PANELS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* OPTIMIZER (LEFT) */}
          <div className={`lg:col-span-4 ${bgPanel} p-5 rounded-2xl border ${borderEl} shadow-xl flex flex-col justify-between transition-colors`}>
            <div className="space-y-4">
              <div className={`flex items-center gap-2 pb-2 border-b ${borderEl}`}>
                <Sparkles className="w-4 h-4 text-blue-500" />
                <h3 className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>1. Context ATS Matcher</h3>
              </div>
              
              <div className="space-y-1.5">
                <label className={`text-[11px] ${textSub} font-medium`}>Target Job Description Specifications</label>
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
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
              >
                {isCheckingAts ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Analyze Interface Overlaps'}
              </button>
            </div>
            
            {atsScore !== null && (
              <div className={`space-y-4 mt-5 pt-4 border-t ${borderEl}`}>
                <div className={`${bgInner} p-3 rounded-xl border ${borderEl} flex justify-between items-center`}>
                  <span className={`text-xs ${textSub}`}>Parser Output Weight:</span>
                  <span className={`text-base font-bold ${atsScore >= 75 ? 'text-emerald-500' : 'text-amber-500'}`}>{atsScore}% Match</span>
                </div>

                <div className="space-y-1.5">
                  <h4 className={`text-[11px] font-bold ${textSub} uppercase tracking-wide flex items-center gap-1.5`}><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Matched Tags</h4>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                    {matchedKeywords.length === 0 ? <span className="text-xs text-slate-400 italic">None identified</span> : 
                      matchedKeywords.map((word, i) => (
                        <span key={i} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] px-2 py-0.5 rounded font-mono">{word}</span>
                      ))
                    }
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className={`text-[11px] font-bold ${textSub} uppercase tracking-wide flex items-center gap-1.5`}><AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Profiling Gaps</h4>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                    {missingKeywords.length === 0 ? <span className="text-xs text-slate-400 italic">No variant differences</span> : 
                      missingKeywords.map((word, i) => (
                        <span key={i} className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] px-2 py-0.5 rounded font-mono">{word}</span>
                      ))
                    }
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* DISPATCH (RIGHT) */}
          <div className={`lg:col-span-8 ${bgPanel} p-5 rounded-2xl border ${borderEl} shadow-xl transition-colors`}>
            <div className={`flex items-center gap-2 pb-2 border-b ${borderEl} mb-4`}>
              <Mail className="w-4 h-4 text-blue-500" />
              <h3 className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>2. Outbound Distribution Core</h3>
            </div>
            
            <form onSubmit={executeRealSend} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={`text-[10px] ${textSub} font-medium`}>Target Entity Name</label>
                  <input type="text" placeholder="Company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 transition ${inputEl}`} />
                </div>
                <div className="space-y-1">
                  <label className={`text-[10px] ${textSub} font-medium`}>Target Role Designation</label>
                  <input type="text" placeholder="Job framework description" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 transition ${inputEl}`} />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className={`text-[10px] ${textSub} font-medium`}>Destination Recruiter Email Address</label>
                <input type="email" placeholder="pointofcontact@company.com" value={recruiterEmail} onChange={(e) => setRecruiterEmail(e.target.value)} className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 transition ${inputEl}`} />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`${bgInner} border ${borderEl} rounded-xl p-3 space-y-2`}>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-amber-500 flex items-center gap-1.5"><User className="w-3 h-3" /> Origin Route Mapping</label>
                  <select value={fromAccount} onChange={(e) => setFromAccount(e.target.value)} className={`w-full rounded-lg p-2 text-xs border focus:outline-none ${isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}>
                    <option value="personal@gmail.com">milind.talekar.qa@gmail.com (OAuth-Secure)</option>
                  </select>
                </div>

                <div className={`${bgInner} border ${borderEl} rounded-xl p-3 space-y-2`}>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-blue-500 flex items-center gap-1.5"><FileText className="w-3 h-3" /> Attached Payload Blueprint</label>
                  <div className="flex flex-col gap-1.5">
                    <select value={resumeType} onChange={(e) => setResumeType(e.target.value)} className={`w-full rounded-lg p-2 text-xs border focus:outline-none ${isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}>
                      <option value="system">Milind's Primary Profile (Automated)</option>
                      <option value="manual">Inject Manual Asset File</option>
                    </select>
                    
                    {resumeType === 'manual' && (
                      <div className={`flex items-center justify-between border rounded-lg p-1 pl-2 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <div className="flex items-center gap-2 truncate max-w-[70%]">
                          <label className={`flex items-center gap-1 text-[10px] font-bold py-1 px-2 rounded-md cursor-pointer transition ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                            <Upload className="w-2.5 h-2.5 text-blue-500" /> Upload
                            <input type="file" accept=".pdf" onChange={(e) => setCustomResumeFile(e.target.files[0])} className="hidden" />
                          </label>
                          <span className="text-[10px] font-mono text-slate-400 truncate">{customResumeFile ? customResumeFile.name : "Null data asset"}</span>
                        </div>
                        {customResumeFile && (
                          <button type="button" onClick={handleViewFile} className="text-[10px] font-bold text-blue-500 hover:underline bg-blue-500/5 px-2 py-1 rounded">Preview</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <input type="text" value={subjectLine} onChange={(e) => setSubjectLine(e.target.value)} className={`w-full border rounded-xl p-2.5 text-xs font-mono focus:outline-none focus:ring-2 transition ${inputEl}`} placeholder="Subject Line" />
                <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} className={`w-full h-36 border rounded-xl p-3 text-xs font-mono resize-none focus:outline-none focus:ring-2 transition scrollbar-thin ${inputEl}`} />
              </div>
              
              <div className={`${bgInner} border border-dashed ${borderEl} rounded-xl p-3 flex items-center justify-between text-xs`}>
                <span className={`flex items-center gap-1.5 text-[11px] font-medium ${textSub}`}><Paperclip className="w-4 h-4 text-blue-500" /> Document Configuration Link:</span>
                <div className="flex items-center gap-2 font-mono text-[10px]">
                  <span className={`${isDark ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-white text-slate-600 border-slate-200'} px-2 py-1 border rounded-md`}>
                    {resumeType === 'system' ? 'Milind_Talekar_QA_PhonePe_2026.pdf' : (customResumeFile?.name || 'Setup required')}
                  </span>
                  <button type="button" onClick={handleViewFile} className="text-blue-500 hover:text-blue-600 font-bold bg-blue-500/5 border border-blue-500/10 px-2 py-1 rounded-md transition flex items-center gap-1">
                    <Eye className="w-3 h-3" /> View Target File
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isDeliveringPackage}
                className={`w-full py-3 text-white text-xs font-bold rounded-xl transition shadow-md flex items-center justify-center gap-2 ${
                  isDeliveringPackage ? "bg-slate-400 dark:bg-slate-800 cursor-not-allowed text-slate-200" : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500"
                }`}
              >
                {isDeliveringPackage ? "Executing SMTP Link & Packet Delivery Configuration..." : <><Send className="w-3.5 h-3.5" /> Dispatch Active Package Assets & Update Ledger</>}
              </button>
            </form>
          </div>
        </div>

        {/* DATA LOG TABLE PIPELINE */}
        <div className={`${bgPanel} border ${borderEl} rounded-2xl p-5 shadow-2xl transition-colors`}>
          <div className={`flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-5 pb-3 border-b ${borderEl}`}>
            <div>
              <h2 className={`text-sm font-bold uppercase tracking-wider ${textTitle} flex items-center gap-2`}><Layers className="w-4 h-4 text-blue-500" /> Operational Record Tracking Pipeline</h2>
              <p className={`${textSub} text-[11px] mt-0.5`}>Synchronized historical ledger logging backend transactions</p>
            </div>
            <button onClick={downloadCSV} className={`self-start sm:self-auto flex items-center gap-1.5 border px-3 py-2 rounded-xl text-xs font-bold transition shadow-sm ${isDark ? 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
              <Download className="w-3.5 h-3.5 text-blue-500" /> Export System Data (.CSV)
            </button>
          </div>
          
          <div className={`overflow-x-auto rounded-xl border ${isDark ? 'border-slate-950' : 'border-slate-200'} shadow-sm`}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'} border-b text-[10px] font-bold text-slate-400 uppercase tracking-wider`}>
                  <th className="py-3 px-4"># ID</th>
                  <th className="py-3 px-4">Job Designation</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">Destination Router</th>
                  <th className="py-3 px-4 text-center">ATS Weight</th>
                  <th className="py-3 px-4">Dispatch Status</th>
                  <th className="py-3 px-4">Interview Framework</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Follow-Up</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/40' : 'divide-slate-100'}`}>
                {applications.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-8 text-center text-slate-400 font-mono text-xs italic">No data transactions synchronized to local node ledger cluster.</td>
                  </tr>
                ) : (
                  applications.map((app, index) => (
                    <tr key={app.timestamp} className={`text-xs transition-colors ${isDark ? 'hover:bg-slate-950/40 text-slate-300' : 'hover:bg-slate-50/80 text-slate-700'}`}>
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">{index}</td>
                      <td className={`py-3.5 px-4 font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{app.role}</td>
                      <td className="py-3.5 px-4 font-medium">{app.company}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">{app.recipientEmail}</td>
                      
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block font-mono font-bold text-[11px] px-2 py-0.5 rounded ${
                          app.atsScore >= 75 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                          app.atsScore >= 50 ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                        }`}>{app.atsScore || 0}%</span>
                      </td>
                      
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-emerald-500 font-medium bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded-full text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{app.status || 'Dispatched'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`flex p-0.5 rounded-lg border text-[10px] font-bold ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                            <button type="button" onClick={() => handleToggleInterview(app.timestamp, app.interviewDone)} className={`px-2 py-0.5 rounded-md transition-all ${app.interviewDone ? 'bg-emerald-500 text-white font-bold' : 'text-slate-400'}`}>Yes</button>
                            <button type="button" onClick={() => handleToggleInterview(app.timestamp, app.interviewDone)} className={`px-2 py-0.5 rounded-md transition-all ${!app.interviewDone ? (isDark ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-700 shadow-sm') : 'text-slate-400'}`}>No</button>
                          </div>

                          {app.interviewDone && (
                            <div className={`flex items-center px-1.5 py-0.5 rounded-lg border text-[10px] ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                              <span className="text-slate-400 mr-1.5 font-bold uppercase text-[9px]">Round</span>
                              <button type="button" onClick={() => handleUpdateRound(app.timestamp, 'decrement')} className={`w-4 h-4 flex items-center justify-center rounded font-bold ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}></button>
                              <span className="font-mono font-bold text-blue-500 px-1.5 min-w-[14px] text-center">{app.interviewRound || 0}</span>
                              <button type="button" onClick={() => handleUpdateRound(app.timestamp, 'increment')} className={`w-4 h-4 flex items-center justify-center rounded font-bold ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>+</button>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">{app.appliedDate ? app.appliedDate.substring(0, 10) : 'N/A'}</td>
                      <td className="py-3.5 px-4 font-mono text-[11px]"><span className={`px-2 py-0.5 border rounded ${isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>{app.followUpCount || "0 / 5"}</span></td>
                      
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button type="button" onClick={() => handleFollowUp(app)} disabled={loadingFollowUpTimestamp === app.timestamp} className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-lg transition">{loadingFollowUpTimestamp === app.timestamp ? "Sending..." : "Follow-up"}</button>
                          <button type="button" onClick={() => deleteApplication(app.timestamp)} className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}