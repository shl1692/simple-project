"use client";

import React, { useState } from "react";
import { 
  Home as HomeIcon, 
  MessageSquare, 
  FileText, 
  Settings as SettingsIcon, 
  User, 
  ChevronUp, 
  PanelLeft,
  Activity, 
  TrendingUp, 
  Users, 
  DollarSign,
  Send,
  FilePlus,
  Trash2,
  Download,
  AlertCircle,
  Calendar,
  UploadCloud,
  CheckCircle,
  Loader2,
  File,
  Copy,
  Check,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Tab = "Home" | "Chat" | "PDF Generator" | "Calendar" | "PatentReader" | "Settings";

interface Appointment {
  id: string;
  title: string;
  date: string;
  time: string;
}

const PATENT_EXTRACTION_PROMPT = `You are analysing a patent page for antisense oligonucleotide / siRNA technology.

Extract and structure the following:

1. CHEMICAL MODIFICATIONS
   - Identify any chemical structures shown (draw as SMILES or describe backbone modifications)
   - Note: 2'-OMe, 2'-F, phosphorothioate (PS), LNA, GalNAc, PEG, or other sugar/backbone mods
   - For siRNA: note alternating modification patterns (mN/fN), strand asymmetry, overhangs

2. DELIVERY APPROACH
   - Lipid nanoparticles (LNP): note lipid components if shown
   - GalNAc conjugation, antibody conjugates, exosomes
   - Route of administration (IV, SC, intrathecal etc.)

3. IN VIVO / KNOCKDOWN DATA
   - Target gene and cell line / animal model
   - % knockdown achieved and at what dose
   - Duration of effect
   - Any toxicity or off-target data reported

4. PATENT METADATA (if visible)
   - Patent number, filing date, assignee, inventors

Return as structured JSON only. If a section is not present on this page, return null for that field.`;

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Home");
  const [profileOpen, setProfileOpen] = useState(false);
  
  // Chat state
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { role: "assistant", text: "Hello! How can I help you today?" }
  ]);
  const [sessionId] = useState(() => "session-" + Math.random().toString(36).substring(2, 9));
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // PDF state
  const [pdfTitle, setPdfTitle] = useState("");
  const [pdfContent, setPdfContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfHistory, setPdfHistory] = useState([
    { id: "1", title: "Monthly Report.pdf", date: "May 25, 2026", size: "1.2 MB" },
    { id: "2", title: "Project Proposal.pdf", date: "May 24, 2026", size: "840 KB" }
  ]);

  // Calendar State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appTitle, setAppTitle] = useState("");
  const [appDate, setAppDate] = useState("");
  const [appTime, setAppTime] = useState("");

  // Load appointments from localStorage on mount
  React.useEffect(() => {
    const saved = localStorage.getItem("appointments");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTimeout(() => {
          setAppointments(parsed);
        }, 0);
      } catch (e) {
        console.error("Failed to parse appointments:", e);
      }
    }
  }, []);

  const handleAddAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appTitle.trim() || !appDate) return;

    const newApp: Appointment = {
      id: Date.now().toString(),
      title: appTitle.trim(),
      date: appDate,
      time: appTime || "00:00"
    };

    const updated = [...appointments, newApp];
    setAppointments(updated);
    localStorage.setItem("appointments", JSON.stringify(updated));

    // Clear form
    setAppTitle("");
    setAppDate("");
    setAppTime("");
  };

  const handleDeleteAppointment = (id: string) => {
    const updated = appointments.filter(app => app.id !== id);
    setAppointments(updated);
    localStorage.setItem("appointments", JSON.stringify(updated));
  };

  const getMonthAndDay = (dateStr: string) => {
    if (!dateStr) return { month: "", day: "" };
    const [year, month, day] = dateStr.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    const m = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    const dy = d.getDate().toString();
    return { month: m, day: dy };
  };

  const formatFullDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(":").map(Number);
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, "0");
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  // Patent Reader State
  const [patentFile, setPatentFile] = useState<{ name: string; size: string } | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [patentStatus, setPatentStatus] = useState<"idle" | "uploading" | "parsing" | "summarizing" | "completed" | "error">("idle");
  const [patentProgress, setPatentProgress] = useState(0);
  const [patentSummary, setPatentSummary] = useState<{ title: string; abstract: string; claims: string[] } | null>(null);
  const [patentJsonData, setPatentJsonData] = useState<string>("");
  const [patentActiveTab, setPatentActiveTab] = useState<"summary" | "json">("summary");
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const [copiedStatus, setCopiedStatus] = useState(false);
  const [isDownloadingSummary, setIsDownloadingSummary] = useState(false);

  const simulatePatentProcessing = (filename: string) => {
    setPatentStatus("uploading");
    setPatentProgress(5);
    
    // Step 1: Uploading PDF (Progress 5% -> 25%)
    const interval = setInterval(() => {
      setPatentProgress((prev) => {
        if (prev < 25) {
          return prev + 5;
        } else {
          clearInterval(interval);
          setPatentStatus("parsing"); // Step 2: Qwen-VL vision processing
          
          const parseInterval = setInterval(() => {
            setPatentProgress((prevParse) => {
              if (prevParse < 55) {
                return prevParse + 10;
              } else {
                clearInterval(parseInterval);
                setPatentStatus("summarizing"); // Step 3: DECIMER chemical recognition
                
                const sumInterval = setInterval(() => {
                  setPatentProgress((prevSum) => {
                    if (prevSum < 85) {
                      return prevSum + 10;
                    } else {
                      clearInterval(sumInterval);
                      setPatentStatus("completed"); // Step 4: Structuring JSON
                      setPatentProgress(100);
                      
                      // Generate summary content & structured JSON based on the filename
                      const patentName = filename.replace(/\.[^/.]+$/, ""); // strip extension
                      
                      const mockSummary = {
                        title: `Antisense Oligonucleotide Therapeutics targeting ${patentName}`,
                        abstract: "A novel siRNA modification architecture incorporating alternating 2'-OMe and 2'-F nucleotides coupled to a tri-antennary GalNAc ligand. Visual analyses of claims demonstrate improved in vivo mRNA knockdown in hepatic models with extended duration of effect and minimized systemic toxicities.",
                        claims: [
                          "1. A modified double-stranded siRNA agent comprising a passenger strand and a guide strand, wherein each strand is independently 19-25 nucleotides in length, and contains alternating 2'-OMe and 2'-F modifications.",
                          "2. The modified siRNA agent of claim 1, conjugated to a multi-valent GalNAc ligand at the 3'-terminus of the passenger strand.",
                          "3. A method of reducing target gene expression in hepatocytes comprising contacting cells with the agent of claim 2."
                        ]
                      };

                      const mockJson = {
                        "CHEMICAL_MODIFICATIONS": {
                          "smiles_or_backbone": "O=P(S)(OCC1OC(N)C(O)C1F)O- (Phosphorothioate backbone modifications at terminal linkages)",
                          "sugar_backbone_mods": [
                            "2'-OMe (2'-O-methyl) modifications on alternating nucleotides",
                            "2'-F (2'-fluoro) modifications on alternating nucleotides",
                            "Phosphorothioate (PS) linkages at the 3' and 5' terminal overhangs"
                          ],
                          "sirna_patterns": {
                            "pattern": "Alternating 2'-OMe and 2'-F modification pattern (mN/fN)",
                            "strand_asymmetry": "Asymmetric passenger and guide strands, 21nt/23nt duplex",
                            "overhangs": "2-nucleotide 3' overhangs on both strands containing PS linkages"
                          }
                        },
                        "DELIVERY_APPROACH": {
                          "lipid_nanoparticles": null,
                          "conjugation": "Tri-antennary GalNAc (N-Acetylgalactosamine) ligand conjugated to the 3'-terminus of the passenger strand",
                          "route_of_administration": "Subcutaneous (SC) injection"
                        },
                        "IN_VIVO_KNOCKDOWN_DATA": {
                          "target_gene_and_model": `${patentName} gene expression in murine hepatocyte models`,
                          "percent_knockdown": "88% mRNA knockdown achieved",
                          "dose": "Single dose of 1.5 mg/kg",
                          "duration_of_effect": "Sustained knockdown for up to 35 days post-administration",
                          "toxicity_off_target_data": "No significant hepatotoxicity, transient elevation of ALT/AST resolved within 48h, minimal off-target activity detected by RNA-Seq"
                        },
                        "PATENT_METADATA": {
                          "patent_number": "WO/2026/084201A1",
                          "filing_date": "October 24, 2025",
                          "assignee": "Aethelgard Therapeutics Inc.",
                          "inventors": [
                            "Dr. Sarah Jenkins",
                            "Dr. Li Wei Chen",
                            "Marcus Vance"
                          ]
                        }
                      };

                      setPatentSummary(mockSummary);
                      setPatentJsonData(JSON.stringify(mockJson, null, 2));
                      return 100;
                    }
                  });
                }, 400);
                return 85;
              }
            });
          }, 450);
          return 25;
        }
      });
    }, 300);
  };

  const handlePatentFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        const sizeStr = file.size > 1024 * 1024 
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
          : `${(file.size / 1024).toFixed(1)} KB`;
        setPatentFile({ name: file.name, size: sizeStr });
        simulatePatentProcessing(file.name);
      } else {
        alert("Please upload a PDF file.");
      }
    }
  };

  const handlePatentFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const sizeStr = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
        : `${(file.size / 1024).toFixed(1)} KB`;
      setPatentFile({ name: file.name, size: sizeStr });
      simulatePatentProcessing(file.name);
    }
  };

  const handleCopyPatentJson = () => {
    navigator.clipboard.writeText(patentJsonData);
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 2000);
  };

  const handleDownloadPatentSummary = async () => {
    if (!patentSummary || !patentJsonData) return;
    setIsDownloadingSummary(true);
    
    try {
      const title = `Summary_${patentFile?.name || "Patent"}`;
      const parsedJson = JSON.parse(patentJsonData);
      
      const content = `PATENT EXTRACTION REPORT (Qwen-VL + DECIMER)
==================================================

1. CHEMICAL MODIFICATIONS:
- SMILES/Backbone: ${parsedJson.CHEMICAL_MODIFICATIONS?.smiles_or_backbone || "N/A"}
- Sugar/Backbone Mods: ${parsedJson.CHEMICAL_MODIFICATIONS?.sugar_backbone_mods?.join(', ') || "N/A"}
- siRNA Patterns: ${parsedJson.CHEMICAL_MODIFICATIONS?.sirna_patterns?.pattern || "N/A"}
- Strand Asymmetry: ${parsedJson.CHEMICAL_MODIFICATIONS?.sirna_patterns?.strand_asymmetry || "N/A"}
- Overhangs: ${parsedJson.CHEMICAL_MODIFICATIONS?.sirna_patterns?.overhangs || "N/A"}

2. DELIVERY APPROACH:
- Lipid Nanoparticles (LNP): ${parsedJson.DELIVERY_APPROACH?.lipid_nanoparticles || "N/A"}
- Conjugation: ${parsedJson.DELIVERY_APPROACH?.conjugation || "N/A"}
- Route of Administration: ${parsedJson.DELIVERY_APPROACH?.route_of_administration || "N/A"}

3. IN VIVO / KNOCKDOWN DATA:
- Target & Model: ${parsedJson.IN_VIVO_KNOCKDOWN_DATA?.target_gene_and_model || "N/A"}
- Knockdown %: ${parsedJson.IN_VIVO_KNOCKDOWN_DATA?.percent_knockdown || "N/A"}
- Dose: ${parsedJson.IN_VIVO_KNOCKDOWN_DATA?.dose || "N/A"}
- Duration: ${parsedJson.IN_VIVO_KNOCKDOWN_DATA?.duration_of_effect || "N/A"}
- Toxicity/Off-Target: ${parsedJson.IN_VIVO_KNOCKDOWN_DATA?.toxicity_off_target_data || "N/A"}

4. PATENT METADATA:
- Patent Number: ${parsedJson.PATENT_METADATA?.patent_number || "N/A"}
- Filing Date: ${parsedJson.PATENT_METADATA?.filing_date || "N/A"}
- Assignee: ${parsedJson.PATENT_METADATA?.assignee || "N/A"}
- Inventors: ${parsedJson.PATENT_METADATA?.inventors?.join(', ') || "N/A"}

--------------------------------------------------
Generated using PATENT_EXTRACTION_PROMPT on ${new Date().toLocaleDateString()}`;

      const response = await fetch("http://localhost:8002/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF summary");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = title.endsWith(".pdf") ? title : `${title}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading summary PDF:", error);
      alert("Failed to download summary PDF. Make sure the PDF API service is running on port 8002.");
    } finally {
      setIsDownloadingSummary(false);
    }
  };

  const handleResetPatentReader = () => {
    setPatentFile(null);
    setPatentStatus("idle");
    setPatentProgress(0);
    setPatentSummary(null);
    setPatentJsonData("");
    setPatentActiveTab("summary");
    setIsPromptExpanded(false);
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;
    const currentMessage = chatMessage;
    const userMsg = { role: "user", text: currentMessage };
    setChatHistory((prev) => [...prev, userMsg]);
    setChatMessage("");
    setIsChatLoading(true);
    
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: sessionId,
          chatInput: currentMessage,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from webhook");
      }

      // Check if response is JSON or plain text
      const contentType = response.headers.get("content-type");
      let botText = "Received empty response";

      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          botText = data[0].output || data[0].text || data[0].response || data[0].message || JSON.stringify(data[0]);
        } else if (typeof data === "object" && data !== null) {
          botText = data.output || data.text || data.response || data.message || JSON.stringify(data);
        } else if (typeof data === "string") {
          botText = data;
        }
      } else {
        botText = await response.text();
      }

      setChatHistory((prev) => [...prev, { role: "assistant", text: botText }]);
    } catch (error) {
      console.error("Chat error:", error);
      setChatHistory((prev) => [
        ...prev, 
        { role: "assistant", text: "Sorry, I couldn't reach the agent right now." }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleGeneratePdf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfTitle.trim()) return;
    setIsGenerating(true);
    
    try {
      const response = await fetch("http://localhost:8002/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: pdfTitle,
          content: pdfContent,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = pdfTitle.endsWith(".pdf") ? pdfTitle : `${pdfTitle}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      const newPdf = {
        id: Date.now().toString(),
        title: pdfTitle.endsWith(".pdf") ? pdfTitle : `${pdfTitle}.pdf`,
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        size: `${(blob.size / 1024).toFixed(1)} KB`
      };
      setPdfHistory((prev) => [newPdf, ...prev]);
      setPdfTitle("");
      setPdfContent("");
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Make sure the PDF API service is running on port 8002.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-50 font-sans text-zinc-950 antialiased dark:bg-zinc-950 dark:text-zinc-50">
      {/* Sidebar */}
      <aside 
        className={`flex flex-col border-r border-zinc-200 bg-[#f9f9fb] transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-900/50 ${
          sidebarOpen ? "w-64" : "w-0 -translate-x-full md:w-16 md:translate-x-0"
        }`}
      >
        {/* Header */}
        <div className="flex h-14 items-center px-6 justify-between shrink-0">
          <span className={`text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 transition-opacity duration-200 ${!sidebarOpen ? "md:opacity-0" : "opacity-100"}`}>
            Application
          </span>
        </div>
        
        {/* Nav Items */}
        <nav className="flex-1 space-y-1.5 py-4 px-3 overflow-y-auto">
          <NavItem 
            icon={<HomeIcon className="size-4.5" />} 
            label="Home" 
            active={activeTab === "Home"} 
            sidebarOpen={sidebarOpen}
            onClick={() => setActiveTab("Home")} 
          />
          <NavItem 
            icon={<MessageSquare className="size-4.5" />} 
            label="Chat" 
            active={activeTab === "Chat"} 
            sidebarOpen={sidebarOpen}
            onClick={() => setActiveTab("Chat")} 
          />
          <NavItem 
            icon={<FileText className="size-4.5" />} 
            label="PDF Generator" 
            active={activeTab === "PDF Generator"} 
            sidebarOpen={sidebarOpen}
            onClick={() => setActiveTab("PDF Generator")} 
          />
          <NavItem 
            icon={<Calendar className="size-4.5" />} 
            label="Calendar" 
            active={activeTab === "Calendar"} 
            sidebarOpen={sidebarOpen}
            onClick={() => setActiveTab("Calendar")} 
          />
          <NavItem 
            icon={<FileText className="size-4.5" />} 
            label="Patent Reader" 
            active={activeTab === "PatentReader"} 
            sidebarOpen={sidebarOpen}
            onClick={() => setActiveTab("PatentReader")} 
          />
          <NavItem 
            icon={<SettingsIcon className="size-4.5" />} 
            label="Settings" 
            active={activeTab === "Settings"} 
            sidebarOpen={sidebarOpen}
            onClick={() => setActiveTab("Settings")} 
          />
        </nav>

        {/* Footer Profile Section */}
        <div className="border-t border-zinc-200/60 p-3 dark:border-zinc-800 relative shrink-0">
          <button 
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left text-sm hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors"
          >
            <div className="flex size-7 items-center justify-center rounded-full bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200 shrink-0">
              <User className="size-4.5" />
            </div>
            {sidebarOpen && (
              <>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">Username</p>
                  <p className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">user@example.com</p>
                </div>
                <ChevronUp className={`size-4 text-zinc-500 transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`} />
              </>
            )}
          </button>
          
          {/* Profile Popover */}
          {profileOpen && sidebarOpen && (
            <div className="absolute bottom-16 left-3 right-3 rounded-lg border border-zinc-200 bg-white p-2.5 shadow-lg dark:border-zinc-800 dark:bg-zinc-900 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <button className="flex w-full items-center gap-2 rounded-md p-2 text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">
                My Profile
              </button>
              <button className="flex w-full items-center gap-2 rounded-md p-2 text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">
                Billing
              </button>
              <div className="my-1.5 border-t border-zinc-150 dark:border-zinc-800" />
              <button className="flex w-full items-center gap-2 rounded-md p-2 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30">
                Log Out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden bg-white dark:bg-zinc-950">
        {/* Top Navbar */}
        <header className="flex h-14 items-center px-6 justify-between shrink-0 border-b border-zinc-100 dark:border-zinc-900">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <PanelLeft className="size-5" />
          </Button>
          <div className="ml-4 flex-1">
            {/* Can add search or breadcrumbs here */}
          </div>
        </header>

        {/* Tab Content Panel */}
        <main className="flex-1 overflow-y-auto p-8">
          {activeTab === "Home" && (
            <div className="space-y-8 max-w-5xl">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Dashboard</h1>
                <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                  Welcome to your workspace dashboard. Here is an overview of your current application state.
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total Users" value="1,248" icon={<Users className="size-4 text-zinc-500" />} description="+12% from last month" />
                <StatCard title="System Load" value="24%" icon={<Activity className="size-4 text-zinc-500" />} description="Normal operation" />
                <StatCard title="API Requests" value="45,820" icon={<TrendingUp className="size-4 text-zinc-500" />} description="+4.3% in past 24h" />
                <StatCard title="Monthly Cost" value="$142.50" icon={<DollarSign className="size-4 text-zinc-500" />} description="Under budget limit" />
              </div>

              {/* Main Section */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Recent System Events</h2>
                  <div className="mt-5 space-y-4">
                    <EventItem time="Just now" event="Docker container successfully started" status="success" />
                    <EventItem time="12 mins ago" event="Database connection pooled successfully" status="success" />
                    <EventItem time="45 mins ago" event="Port 3000 conflicts resolved by system" status="warning" />
                    <EventItem time="2 hours ago" event="Next.js static site built (Turbopack)" status="info" />
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Docker Container Status</h2>
                  <div className="mt-5 space-y-3.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500">Container Name</span>
                      <span className="font-mono font-medium text-xs">simpleproject-web-1</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500">Status</span>
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                        Running
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500">Port Mapping</span>
                      <span className="font-mono text-xs text-zinc-600 dark:text-zinc-300">0.0.0.0:3000-&gt;3000</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500">Node Environment</span>
                      <span className="font-mono text-xs text-zinc-600 dark:text-zinc-300">production</span>
                    </div>
                    <div className="pt-2">
                      <Button variant="outline" size="sm" className="w-full justify-center text-xs">
                        Restart Container
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Chat" && (
            <div className="flex flex-col h-[calc(100vh-10rem)] max-w-4xl border border-zinc-200 rounded-xl bg-white dark:border-zinc-800 dark:bg-zinc-900/30 overflow-hidden shadow-sm">
              <div className="border-b border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/80">
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Agent Chat Panel</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Interact with your local Agentic Assistant</p>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatHistory.map((msg, index) => (
                  <div 
                    key={index}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div 
                      className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm shadow-sm ${
                        msg.role === "user" 
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950" 
                          : "bg-zinc-100 text-zinc-850 dark:bg-zinc-800 dark:text-zinc-200"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[75%] rounded-xl px-4 py-2.5 text-sm shadow-sm bg-zinc-100 text-zinc-850 dark:bg-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "150ms" }}></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "300ms" }}></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-zinc-200 p-4 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 flex gap-2">
                <input 
                  type="text" 
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !isChatLoading && handleSendMessage()}
                  placeholder="Type your message here..."
                  className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-zinc-700"
                />
                <Button size="icon" onClick={handleSendMessage} disabled={isChatLoading} className="rounded-lg size-10 shrink-0">
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          )}

          {activeTab === "PDF Generator" && (
            <div className="grid gap-8 md:grid-cols-3 max-w-5xl">
              {/* Creator Form */}
              <div className="md:col-span-2 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                  <FilePlus className="size-4.5 text-zinc-500" /> New Document
                </h2>
                <form onSubmit={handleGeneratePdf} className="mt-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Document Title</label>
                    <input 
                      type="text" 
                      value={pdfTitle}
                      onChange={(e) => setPdfTitle(e.target.value)}
                      placeholder="e.g. Sales Report Q2"
                      required
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-zinc-700"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Content / Data</label>
                    <textarea 
                      value={pdfContent}
                      onChange={(e) => setPdfContent(e.target.value)}
                      placeholder="Type details to generate into PDF..."
                      rows={5}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-zinc-700"
                    />
                  </div>

                  <Button type="submit" disabled={isGenerating} className="w-full justify-center text-xs">
                    {isGenerating ? "Generating PDF..." : "Generate PDF"}
                  </Button>
                </form>
              </div>

              {/* History list */}
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Generated PDFs</h2>
                <div className="mt-4 space-y-3">
                  {pdfHistory.length === 0 ? (
                    <div className="text-center py-6">
                      <AlertCircle className="size-6 mx-auto text-zinc-400 mb-1" />
                      <p className="text-xs text-zinc-500">No PDFs generated yet</p>
                    </div>
                  ) : (
                    pdfHistory.map((pdf) => (
                      <div key={pdf.id} className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-100 hover:border-zinc-200 dark:border-zinc-850 dark:hover:border-zinc-800 transition-all text-xs">
                        <div className="overflow-hidden mr-2">
                          <p className="font-medium truncate text-zinc-900 dark:text-zinc-100">{pdf.title}</p>
                          <p className="text-[10px] text-zinc-500">{pdf.date} • {pdf.size}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon-xs" title="Download">
                            <Download className="size-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon-xs" 
                            className="text-red-500 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20"
                            onClick={() => setPdfHistory((prev) => prev.filter((p) => p.id !== pdf.id))}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "Calendar" && (
            <div className="grid gap-8 md:grid-cols-3 max-w-5xl">
              {/* Add Appointment Form */}
              <div className="md:col-span-1 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 h-fit">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                  <Calendar className="size-4.5 text-zinc-500" /> New Appointment
                </h2>
                <form onSubmit={handleAddAppointment} className="mt-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Appointment Title</label>
                    <input 
                      type="text" 
                      value={appTitle}
                      onChange={(e) => setAppTitle(e.target.value)}
                      placeholder="e.g. Project Sync"
                      required
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-zinc-700"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Date</label>
                    <input 
                      type="date" 
                      value={appDate}
                      onChange={(e) => setAppDate(e.target.value)}
                      required
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-zinc-700 text-zinc-900 dark:text-zinc-150"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Time</label>
                    <input 
                      type="time" 
                      value={appTime}
                      onChange={(e) => setAppTime(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-sm focus:border-zinc-400 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-zinc-700 text-zinc-900 dark:text-zinc-150"
                    />
                  </div>

                  <Button type="submit" className="w-full justify-center text-xs">
                    Save Appointment
                  </Button>
                </form>
              </div>

              {/* Appointments List */}
              <div className="md:col-span-2 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Upcoming Appointments</h2>
                <div className="mt-4 space-y-3">
                  {appointments.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                      <Calendar className="size-8 mx-auto text-zinc-400 mb-2 stroke-[1.5]" />
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-300">No appointments saved yet</p>
                      <p className="text-xs text-zinc-500 mt-1">Add your first appointment using the form on the left.</p>
                    </div>
                  ) : (
                    [...appointments]
                      .sort((a, b) => {
                        const dateTimeA = new Date(`${a.date}T${a.time || "00:00"}`);
                        const dateTimeB = new Date(`${b.date}T${b.time || "00:00"}`);
                        return dateTimeA.getTime() - dateTimeB.getTime();
                      })
                      .map((app) => {
                        const { month, day } = getMonthAndDay(app.date);
                        return (
                          <div 
                            key={app.id} 
                            className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-100 hover:border-zinc-200 dark:border-zinc-850 dark:hover:border-zinc-800 bg-zinc-50/30 hover:bg-zinc-50/60 dark:bg-zinc-900/20 dark:hover:bg-zinc-900/50 transition-all duration-200"
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              {/* Sleek calendar-sheet date badge */}
                              <div className="w-12 h-13 flex flex-col rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shrink-0 text-center shadow-sm">
                                <div className="bg-zinc-900 text-white dark:bg-zinc-700 text-[9px] font-bold py-0.5 tracking-wider uppercase">
                                  {month}
                                </div>
                                <div className="flex-1 flex items-center justify-center text-base font-bold text-zinc-900 dark:text-zinc-50">
                                  {day}
                                </div>
                              </div>
                              
                              <div className="min-w-0">
                                <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-50 truncate">
                                  {app.title}
                                </p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1.5">
                                  <span>{formatFullDate(app.date)}</span>
                                  {app.time && (
                                    <>
                                      <span className="size-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                      <span>{formatTime(app.time)}</span>
                                    </>
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="flex gap-1 shrink-0 ml-4">
                              <Button 
                                variant="ghost" 
                                size="icon-xs" 
                                className="text-red-500 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20"
                                onClick={() => handleDeleteAppointment(app.id)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "PatentReader" && (
            <div className="space-y-6 max-w-4xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Patent Reader</h1>
                  <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                    Process oligonucleotide & siRNA patent PDFs using Qwen-VL and DECIMER to extract structure summaries.
                  </p>
                </div>
              </div>

              {/* Extraction Prompt Collapsible */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 overflow-hidden">
                <button 
                  onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                  className="w-full flex items-center justify-between p-4 text-xs font-semibold text-zinc-700 dark:text-zinc-350 hover:bg-zinc-150/30 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] font-mono bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-400">
                      PATENT_EXTRACTION_PROMPT
                    </span>
                    <span>View Target Prompt Schema</span>
                  </span>
                  {isPromptExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </button>
                {isPromptExpanded && (
                  <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-100/10 dark:bg-zinc-950/25">
                    <pre className="text-xs font-mono text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed select-text">
                      {PATENT_EXTRACTION_PROMPT}
                    </pre>
                  </div>
                )}
              </div>

              {patentStatus === "idle" && (
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
                  onDragLeave={() => setIsDragActive(false)}
                  onDrop={handlePatentFileDrop}
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 cursor-pointer ${
                    isDragActive 
                      ? "border-zinc-900 bg-zinc-50/80 dark:border-zinc-100 dark:bg-zinc-900/50" 
                      : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/10"
                  }`}
                  onClick={() => document.getElementById("patent-file-input")?.click()}
                >
                  <input 
                    type="file" 
                    id="patent-file-input" 
                    accept=".pdf" 
                    className="hidden" 
                    onChange={handlePatentFileSelect}
                  />
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="p-3 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      <UploadCloud className="size-8 stroke-[1.5]" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        Drag and drop your patent PDF here
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        or click to browse from your computer
                      </p>
                    </div>
                    <div className="pt-2">
                      <Button variant="outline" size="sm" className="pointer-events-none text-xs">
                        Select File
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {patentStatus !== "idle" && patentStatus !== "completed" && (
                <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        <File className="size-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate max-w-md">
                          {patentFile?.name}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {patentFile?.size}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-105 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {patentStatus === "parsing" ? "Qwen-VL Vision Scan" : patentStatus === "summarizing" ? "DECIMER OCR" : patentStatus}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      <span>Analyzing document progress</span>
                      <span>{patentProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-850 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-zinc-900 dark:bg-zinc-50 transition-all duration-300 ease-out" 
                        style={{ width: `${patentProgress}%` }}
                      />
                    </div>
                  </div>

                  {/* Processing Stepper */}
                  <div className="border-t border-zinc-100 dark:border-zinc-800 pt-5 space-y-3.5">
                    <StepIndicator 
                      label="Uploading patent document..." 
                      status={patentStatus === "uploading" ? "active" : "completed"} 
                    />
                    <StepIndicator 
                      label="Initializing Qwen-VL Vision model & scanning document..." 
                      status={
                        patentStatus === "uploading" ? "pending" :
                        patentStatus === "parsing" ? "active" : "completed"
                      } 
                    />
                    <StepIndicator 
                      label="Running DECIMER chemical structure recognition (SMILES)..." 
                      status={
                        (patentStatus === "uploading" || patentStatus === "parsing") ? "pending" :
                        patentStatus === "summarizing" ? "active" : "completed"
                      } 
                    />
                  </div>
                </div>
              )}

              {patentStatus === "completed" && patentSummary && (
                <div className="grid gap-6 md:grid-cols-3">
                  {/* Results Panel */}
                  <div className="md:col-span-2 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-150 dark:border-zinc-800">
                      <div>
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                          Qwen-VL + DECIMER Complete
                        </span>
                        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50 mt-1 truncate max-w-sm" title={patentSummary.title}>
                          {patentSummary.title}
                        </h2>
                      </div>
                      
                      {/* Tab toggler */}
                      <div className="flex p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 self-start sm:self-center shrink-0">
                        <button 
                          onClick={() => setPatentActiveTab("summary")}
                          className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                            patentActiveTab === "summary" 
                              ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-900 dark:text-zinc-50" 
                              : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                          }`}
                        >
                          Summary
                        </button>
                        <button 
                          onClick={() => setPatentActiveTab("json")}
                          className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                            patentActiveTab === "json" 
                              ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-900 dark:text-zinc-50" 
                              : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                          }`}
                        >
                          Structured JSON
                        </button>
                      </div>
                    </div>

                    {patentActiveTab === "summary" ? (
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Abstract</h3>
                          <p className="text-sm text-zinc-600 dark:text-zinc-350 leading-relaxed bg-zinc-50/50 dark:bg-zinc-900/20 p-3.5 rounded-lg border border-zinc-100 dark:border-zinc-850 select-text">
                            {patentSummary.abstract}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Key Claims</h3>
                          <div className="space-y-2">
                            {patentSummary.claims.map((claim, index) => (
                              <p 
                                key={index} 
                                className="text-xs text-zinc-650 dark:text-zinc-400 bg-zinc-50/30 dark:bg-zinc-900/10 p-2.5 rounded border border-zinc-100/50 dark:border-zinc-850/50 select-text"
                              >
                                {claim}
                              </p>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2 pt-3.5 border-t border-zinc-150 dark:border-zinc-800">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">DECIMER Chemical Structure Extraction</h3>
                          <div className="bg-zinc-50/50 dark:bg-zinc-900/20 p-3.5 rounded-lg border border-zinc-100 dark:border-zinc-850 space-y-2 text-xs select-text">
                            <div>
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100">SMILES representation: </span>
                              <code className="font-mono bg-zinc-150/50 dark:bg-zinc-900 px-1 py-0.5 rounded text-zinc-800 dark:text-zinc-200">
                                O=P(S)(OCC1OC(N)C(O)C1F)O-
                              </code>
                            </div>
                            <div>
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100">Backbone Modifications: </span>
                              <span className="text-zinc-600 dark:text-zinc-400">
                                {"Phosphorothioate (PS) linkages identified at 3' and 5' termini to provide resistance against exonuclease degradation."}
                              </span>
                            </div>
                            <div>
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100">Sugar Modifications: </span>
                              <span className="text-zinc-600 dark:text-zinc-400">
                                {"Alternating 2'-O-Methyl (2'-OMe) and 2'-Fluoro (2'-F) configuration, maximizing target affinity and duplex stability while reducing immunostimulatory effects."}
                              </span>
                            </div>
                            <div>
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100">Ligand Conjugation: </span>
                              <span className="text-zinc-600 dark:text-zinc-400">
                                {"Tri-antennary GalNAc ligand conjugated to the 3'-terminus of the passenger strand, ensuring targeted delivery to hepatocyte asialoglycoprotein receptors."}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full bg-emerald-500" /> Output Payload
                          </span>
                          <button 
                            onClick={handleCopyPatentJson}
                            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 px-2.5 py-1 rounded border border-zinc-200 dark:border-zinc-700 transition-colors"
                          >
                            {copiedStatus ? (
                              <>
                                <Check className="size-3 text-emerald-500" /> Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="size-3" /> Copy JSON
                              </>
                            )}
                          </button>
                        </div>
                        <div className="relative">
                          <pre className="text-xs font-mono text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-lg overflow-x-auto border border-zinc-200 dark:border-zinc-850 max-h-[350px] leading-relaxed select-text">
                            {patentJsonData}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Metadata & Actions Panel */}
                  <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 h-fit space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Document Details</h3>
                      <div className="mt-4 space-y-3.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Filename</span>
                          <span className="font-medium text-zinc-900 dark:text-zinc-200 truncate max-w-[150px]" title={patentFile?.name}>
                            {patentFile?.name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">File size</span>
                          <span className="font-mono text-zinc-900 dark:text-zinc-200">{patentFile?.size}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Processed at</span>
                          <span className="text-zinc-900 dark:text-zinc-200">{new Date().toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-2">
                      <Button 
                        onClick={handleDownloadPatentSummary} 
                        disabled={isDownloadingSummary} 
                        className="w-full justify-center text-xs gap-1.5"
                      >
                        {isDownloadingSummary ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" /> Generating PDF...
                          </>
                        ) : (
                          <>
                            <Download className="size-3.5" /> Download Summary PDF
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={handleResetPatentReader} 
                        className="w-full justify-center text-xs"
                      >
                        Upload Another Patent
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "Settings" && (
            <div className="max-w-3xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 space-y-6">
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Settings</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Configure global parameters and look & feel.</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Docker Sync Mode</p>
                    <p className="text-xs text-zinc-500">Auto reload container files on save</p>
                  </div>
                  <input type="checkbox" defaultChecked className="accent-zinc-900 size-4" />
                </div>

                <div className="flex items-center justify-between py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Dark Theme</p>
                    <p className="text-xs text-zinc-500">Switch application dark mode styling</p>
                  </div>
                  <input 
                    type="checkbox" 
                    onChange={(e) => {
                      if (e.target.checked) {
                        document.documentElement.classList.add("dark");
                      } else {
                        document.documentElement.classList.remove("dark");
                      }
                    }} 
                    className="accent-zinc-900 size-4" 
                  />
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">API Gateway Port</p>
                    <p className="text-xs text-zinc-500">Change local exposed docker ports</p>
                  </div>
                  <input type="text" defaultValue="3000" className="w-20 text-center rounded border border-zinc-200 py-1 text-xs dark:border-zinc-800 dark:bg-zinc-900" />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  sidebarOpen: boolean;
  onClick: () => void;
}

function NavItem({ icon, label, active, sidebarOpen, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
        active 
          ? "bg-zinc-200 text-zinc-950 font-medium dark:bg-zinc-800 dark:text-zinc-100" 
          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-850 dark:hover:text-zinc-100"
      }`}
    >
      <div className={`shrink-0 transition-transform ${active ? "scale-105" : ""}`}>
        {icon}
      </div>
      {sidebarOpen && <span className="truncate">{label}</span>}
    </button>
  );
}

function StatCard({ title, value, icon, description }: { title: string; value: string; icon: React.ReactNode; description: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{title}</span>
        {icon}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{value}</span>
      </div>
      <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">{description}</p>
    </div>
  );
}

function EventItem({ time, event, status }: { time: string; event: string; status: "success" | "warning" | "info" }) {
  const dotColor = 
    status === "success" ? "bg-emerald-500" :
    status === "warning" ? "bg-amber-500" :
    "bg-sky-500";
    
  return (
    <div className="flex gap-3 text-xs">
      <span className="w-16 text-zinc-400 shrink-0 text-right">{time}</span>
      <div className="flex flex-col items-center">
        <div className={`size-2 rounded-full ${dotColor} mt-1.5`} />
        <div className="w-px flex-1 bg-zinc-100 dark:bg-zinc-800 mt-2" />
      </div>
      <span className="text-zinc-600 dark:text-zinc-400 font-medium">{event}</span>
    </div>
  );
}

function StepIndicator({ label, status }: { label: string; status: "pending" | "active" | "completed" }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="flex items-center justify-center shrink-0">
        {status === "completed" && (
          <CheckCircle className="size-4 text-emerald-500" />
        )}
        {status === "active" && (
          <Loader2 className="size-4 text-zinc-950 dark:text-zinc-50 animate-spin" />
        )}
        {status === "pending" && (
          <div className="size-4 rounded-full border border-zinc-200 dark:border-zinc-800" />
        )}
      </div>
      <span className={`font-medium ${
        status === "completed" ? "text-zinc-400 dark:text-zinc-500 line-through decoration-zinc-200 dark:decoration-zinc-800" :
        status === "active" ? "text-zinc-900 dark:text-zinc-50 font-semibold" :
        "text-zinc-400 dark:text-zinc-600"
      }`}>
        {label}
      </span>
    </div>
  );
}
