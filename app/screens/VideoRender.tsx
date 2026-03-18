import { Navigation } from "../components/Navigation";
import { NeonButton } from "../components/NeonButton";
import { NeonCard } from "../components/NeonCard";
import { Play, Download, Save, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import { renderApi, videosApi } from "../services/api";
import * as XLSX from "xlsx";
import { FileSpreadsheet, Trash2, Plus, Clock, PlayCircle, XCircle, Edit3, X, Check, StopCircle } from "lucide-react";

interface PromptItem {
  id: string;
  title: string;
  text: string;
  status: 'pending' | 'submitting' | 'rendering' | 'completed' | 'failed';
  promptId?: string;
  renderId?: string;
  videoUrl?: string;
}

export function VideoRender() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialPrompt = location.state?.promptText || "";
  const initialPromptId = location.state?.promptId || "";

  const [promptQueue, setPromptQueue] = useState<PromptItem[]>([]);
  const [globalStatus, setGlobalStatus] = useState<string>("idle"); // idle, processing, done
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeIntervals = useRef<{ [key: string]: any }>({});

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [tempItem, setTempItem] = useState<{ id?: string, title: string, text: string }>({ title: "", text: "" });

  useEffect(() => {
    // If we came from prompt generator with an initial prompt or series, add to queue
    const initialPrompts = location.state?.prompts as any[];

    if (initialPrompts && Array.isArray(initialPrompts)) {
      const newItems: PromptItem[] = initialPrompts.map((p, index) => ({
        id: Math.random().toString(36).substr(2, 9),
        promptId: p.id,
        title: p.title || `Prompt ${index + 1}`,
        text: typeof p === 'string' ? p : (p.promptText || p.text || ""),
        status: 'pending' as const
      })).filter(item => item.text.length > 0);

      if (newItems.length > 0) {
        setPromptQueue(newItems);
      }
    } else if (initialPrompt) {
      setPromptQueue([{
        id: Math.random().toString(36).substr(2, 9),
        title: "Initial Prompt",
        text: initialPrompt,
        status: 'pending'
      }]);
    }

    return () => {
      // Cleanup all intervals on unmount
      Object.values(activeIntervals.current).forEach(clearInterval);
    };
  }, [initialPrompt, location.state?.prompts]);

  const updatePromptStatus = (id: string, updates: Partial<PromptItem>) => {
    setPromptQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const bstr = event.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

      let startIndex = 0;
      if (data.length > 0) {
        const firstRow = data[0];
        if (typeof firstRow[0] === 'string' && (firstRow[0].toLowerCase().includes('title') || firstRow[1]?.toString().toLowerCase().includes('prompt'))) {
          startIndex = 1;
        }
      }

      const newItems: PromptItem[] = data.slice(startIndex)
        .filter(row => row.length >= 1)
        .map(row => ({
          id: Math.random().toString(36).substr(2, 9),
          title: row[0] ? row[0].toString().trim() : "Untitled",
          text: row[1] ? row[1].toString().trim() : (row[0] ? row[0].toString().trim() : ""),
          status: 'pending' as const
        }))
        .filter(item => item.text.length > 0);

      if (newItems.length > 0) {
        setPromptQueue(prev => [...prev, ...newItems]);
        setLogs(prev => [...prev, `Imported ${newItems.length} prompts from Excel.`]);
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startPolling = (requestId: string, promptId: string) => {
    // Clear old interval if exists
    if (activeIntervals.current[promptId]) clearInterval(activeIntervals.current[promptId]);

    const interval = setInterval(async () => {
      try {
        const response = await renderApi.getStatus(requestId);
        const data = response.data;

        if (data.status === "Completed") {
          updatePromptStatus(promptId, { status: 'completed', videoUrl: data.videoUrl });
          clearInterval(interval);
          delete activeIntervals.current[promptId];

          // Check if all are done
          setPromptQueue(currentQueue => {
            const stillRunning = currentQueue.some(item =>
              item.id !== promptId && (item.status === 'rendering' || item.status === 'submitting')
            );
            if (!stillRunning) setGlobalStatus("done");
            return currentQueue;
          });

        } else if (data.status === "Failed") {
          updatePromptStatus(promptId, { status: 'failed' });
          setError(data.errorMessage || "Render failed.");
          clearInterval(interval);
          delete activeIntervals.current[promptId];
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 3000);

    activeIntervals.current[promptId] = interval;
  };

  const handleRender = async () => {
    const pendingItems = promptQueue.filter(item => item.status === 'pending');
    if (pendingItems.length === 0) {
      setError("No pending prompts in the queue.");
      return;
    }

    setGlobalStatus("processing");
    setError("");
    setLogs([`Starting batch processing for ${pendingItems.length} prompt(s)...`]);

    for (const item of pendingItems) {
      updatePromptStatus(item.id, { status: 'submitting' });
      try {
        const response = await renderApi.submit({
          promptId: item.promptId || initialPromptId || undefined,
          promptText: item.text,
          aspectRatio: "9:16", // Default
          styleOverride: undefined
        });

        const requestId = response.data.renderRequestId;
        updatePromptStatus(item.id, { status: 'rendering', renderId: requestId });
        startPolling(requestId, item.id);
      } catch (err) {
        updatePromptStatus(item.id, { status: 'failed' });
        console.error(err);
      }
    }
  };

  const handleCancelAll = () => {
    if (window.confirm("Are you sure you want to cancel all running tasks?")) {
      // 1. Stop all polling
      Object.values(activeIntervals.current).forEach(clearInterval);
      activeIntervals.current = {};

      // 2. Clear queue or reset statuses
      setPromptQueue([]);
      setGlobalStatus("idle");
      setLogs(prev => [...prev, "❌ Batch processing cancelled by user."]);
    }
  };

  const removePrompt = (id: string) => {
    if (activeIntervals.current[id]) {
      clearInterval(activeIntervals.current[id]);
      delete activeIntervals.current[id];
    }
    setPromptQueue(prev => prev.filter(item => item.id !== id));
  };

  const clearQueue = () => {
    if (window.confirm("Are you sure you want to clear the entire queue?")) {
      Object.values(activeIntervals.current).forEach(clearInterval);
      activeIntervals.current = {};
      setPromptQueue([]);
      setGlobalStatus("idle");
    }
  };

  const openAddModal = () => {
    setModalMode('add');
    setTempItem({ title: "", text: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (item: PromptItem) => {
    setModalMode('edit');
    setTempItem({ id: item.id, title: item.title, text: item.text });
    setIsModalOpen(true);
  };

  const saveModalItem = () => {
    if (!tempItem.text.trim()) return;

    if (modalMode === 'add') {
      if (isBatchMode) {
        const lines = tempItem.text.split('\n').filter(l => l.trim().length > 0);
        const newItems: PromptItem[] = lines.map(line => ({
          id: Math.random().toString(36).substr(2, 9),
          title: tempItem.title || "Manual Entry",
          text: line.trim(),
          status: 'pending'
        }));
        setPromptQueue(prev => [...prev, ...newItems]);
      } else {
        const newItem: PromptItem = {
          id: Math.random().toString(36).substr(2, 9),
          title: tempItem.title || "Manual Entry",
          text: tempItem.text.trim(),
          status: 'pending'
        };
        setPromptQueue(prev => [...prev, newItem]);
      }
    } else {
      updatePromptStatus(tempItem.id!, { title: tempItem.title, text: tempItem.text });
    }

    setIsModalOpen(false);
  };

  const handleDownloadVideo = async (url: string, title: string) => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || "http://localhost:5050";
      const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

      const response = await fetch(fullUrl);
      if (!response.ok) throw new Error("Network response was not ok");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      link.download = `${safeTitle || 'video'}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Failed to download video. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F18]">
      <Navigation />

      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-4xl font-semibold mb-2 bg-gradient-to-r from-[#A855F7] via-[#7C3AED] to-[#22D3EE] bg-clip-text text-transparent">
              Video Render
            </h1>
            <p className="text-gray-400">Generate stunning videos with Veo3 AI engine</p>
          </div>
          <div className="flex gap-3">
            {globalStatus === "processing" && (
              <NeonButton
                variant="outline"
                icon={StopCircle}
                onClick={handleCancelAll}
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                Cancel All
              </NeonButton>
            )}
            <NeonButton
              variant="primary"
              icon={globalStatus === "processing" ? Loader2 : Play}
              onClick={handleRender}
              disabled={globalStatus === "processing" || promptQueue.filter(i => i.status === 'pending').length === 0}
            >
              {globalStatus === "processing" ? "Processing Batch..." : "Start Render Batch"}
            </NeonButton>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Panel - Queue Table (Takes up 2/3) */}
          <div className="lg:col-span-2 space-y-5">
            <NeonCard glow glowColor="purple" className="h-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-white">Prompt Queue</h2>
                <div className="flex gap-2">
                  <button
                    onClick={openAddModal}
                    className="p-2 bg-[#2A2A3E]/50 rounded-lg text-gray-400 hover:text-white transition-colors"
                    title="Thêm Prompt thủ công"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 bg-[#2A2A3E]/50 rounded-lg text-gray-400 hover:text-[#A855F7] transition-colors"
                    title="Nhập danh sách Prompt từ file Excel"
                  >
                    <FileSpreadsheet className="w-5 h-5" />
                  </button>
                  <button
                    onClick={clearQueue}
                    className="p-2 bg-[#2A2A3E]/50 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                    title="Xóa toàn bộ hàng đợi"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleExcelImport}
                    accept=".xlsx, .xls"
                    className="hidden"
                  />
                </div>
              </div>

              <div className="bg-[#0F0F18]/50 border border-[#2A2A3E] rounded-xl overflow-hidden">
                <div className="min-h-[500px] max-h-[700px] overflow-y-auto scrollbar-hide">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#171728] text-xs uppercase text-gray-500 font-medium z-10">
                      <tr>
                        <th className="px-6 py-4">Title</th>
                        <th className="px-6 py-4">Prompt Content</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-gray-300 divide-y divide-[#2A2A3E]">
                      {promptQueue.length > 0 ? (
                        promptQueue.map((item) => (
                          <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-6 py-4 font-medium text-white truncate max-w-[150px]">
                              {item.title}
                            </td>
                            <td className="px-6 py-4 max-w-[400px]">
                              <p className="line-clamp-2 text-gray-400 italic">
                                {item.text}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {item.status === 'pending' && <Clock className="w-5 h-5 text-gray-500" />}
                                {item.status === 'submitting' && <Loader2 className="w-5 h-5 text-[#A855F7] animate-spin" />}
                                {item.status === 'rendering' && <PlayCircle className="w-5 h-5 text-[#22D3EE] animate-pulse" />}
                                {item.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                                {item.status === 'failed' && <XCircle className="w-5 h-5 text-red-400" />}
                                <span className="capitalize">{item.status}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-3">
                                {item.status === 'completed' && item.videoUrl && (
                                  <button
                                    onClick={() => handleDownloadVideo(item.videoUrl!, item.title)}
                                    className="p-2 bg-[#A855F7]/10 text-[#A855F7] rounded-lg hover:bg-[#A855F7]/20 transition-colors"
                                    title="Tải video về máy"
                                  >
                                    <Download className="w-5 h-5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => openEditModal(item)}
                                  disabled={item.status === 'rendering' || item.status === 'submitting'}
                                  className="p-2 text-gray-400 hover:text-[#22D3EE] hover:bg-[#22D3EE]/10 rounded-lg transition-colors disabled:opacity-30"
                                  title="Chỉnh sửa nội dung Prompt"
                                >
                                  <Edit3 className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => removePrompt(item.id)}
                                  disabled={item.status === 'rendering' || item.status === 'submitting'}
                                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-30"
                                  title="Xóa Prompt này khỏi hàng đợi"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-20 text-center text-gray-500 italic">
                            <div className="flex flex-col items-center gap-4">
                              <Plus className="w-12 h-12 opacity-10" />
                              <p>Queue is empty. Import Excel or add prompts manually to get started.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {error && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </NeonCard>
          </div>

          {/* Right Panel - Logs (Takes up 1/3) */}
          <div className="space-y-5">
            <NeonCard glow glowColor="cyan" className="h-full flex flex-col">
              <h2 className="text-2xl font-semibold text-white mb-4 flex items-center justify-between">
                Render Logs
                {globalStatus === "processing" && <Loader2 className="w-5 h-5 animate-spin text-[#22D3EE]" />}
                {globalStatus === "done" && <CheckCircle2 className="w-5 h-5 text-green-400" />}
              </h2>
              <div className="bg-[#0F0F18] border-2 border-[#22D3EE]/30 rounded-2xl p-6 flex-grow overflow-y-auto font-mono text-sm scrollbar-hide">
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <p key={index} className="text-[#22D3EE] mb-2 leading-relaxed">
                      <span className="opacity-50 mr-2">[{new Date().toLocaleTimeString()}]</span>
                      {log}
                    </p>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center opacity-40">
                    <p className="italic text-center">Batch metrics and server events<br />will appear here</p>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-[#2A2A3E]">
                <p className="text-xs text-gray-500 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Connected to Veo3 Backend
                </p>
              </div>
            </NeonCard>
          </div>
        </div>
      </div>

      {/* Prompt Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#171728] border border-[#2A2A3E] rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-[#2A2A3E] flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">
                {modalMode === 'add' ? 'Add New Prompt' : 'Edit Prompt'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Title (Optional)</label>
                <input
                  type="text"
                  value={tempItem.title}
                  onChange={(e) => setTempItem({ ...tempItem, title: e.target.value })}
                  placeholder="e.g., Beach Sunset Scene"
                  className="w-full px-4 py-3 bg-[#0F0F18] border border-[#2A2A3E] rounded-xl text-white placeholder-gray-500 focus:border-[#A855F7] focus:outline-none transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-gray-400 text-sm font-medium">Prompt Content</label>
                  {modalMode === 'add' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Batch Mode</span>
                      <button
                        onClick={() => setIsBatchMode(!isBatchMode)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${isBatchMode ? 'bg-[#A855F7]' : 'bg-gray-700'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isBatchMode ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  )}
                </div>
                <textarea
                  value={tempItem.text}
                  onChange={(e) => setTempItem({ ...tempItem, text: e.target.value })}
                  rows={8}
                  placeholder="Enter your prompt here. Paragraphs are preserved unless Batch Mode is ON."
                  className="w-full px-4 py-3 bg-[#0F0F18] border border-[#2A2A3E] rounded-xl text-white placeholder-gray-500 focus:border-[#A855F7] focus:outline-none transition-all resize-none font-light"
                />
                {isBatchMode && (
                  <p className="mt-2 text-xs text-[#22D3EE]">
                    * Each line will be created as a separate prompt in the queue.
                  </p>
                )}
              </div>
            </div>

            <div className="p-6 bg-[#0F0F18]/50 border-t border-[#2A2A3E] flex gap-3">
              <NeonButton
                variant="outline"
                className="flex-1"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </NeonButton>
              <NeonButton
                variant="primary"
                className="flex-1"
                icon={modalMode === 'add' ? Plus : Check}
                onClick={saveModalItem}
              >
                {modalMode === 'add' ? 'Add to Queue' : 'Update Prompt'}
              </NeonButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
