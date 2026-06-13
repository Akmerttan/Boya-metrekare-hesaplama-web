import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, 
  Trash2, 
  Plus, 
  FileDown, 
  Printer, 
  Search, 
  Sparkles, 
  Coins, 
  Layers, 
  Calendar, 
  Clock, 
  Notebook, 
  Archive, 
  Undo2, 
  X, 
  Check, 
  CheckCircle2, 
  TrendingUp, 
  Store,
  ChevronDown,
  ArrowRightLeft
} from 'lucide-react';
import { Piece, Job } from './types';
import { generateJobPDF } from './utils/pdfGenerator';

export default function App() {
  // Tabs: 'calculator' (Yeni Hesaplama / Ölçü Girişi), 'archive' (Kayıtlı İşler / Arşiv)
  const [activeTab, setActiveTab] = useState<'calculator' | 'archive'>('calculator');

  // Core Calculator Input States
  const [musteriAdi, setMusteriAdi] = useState<string>('');
  const [enInput, setEnInput] = useState<string>('');
  const [boyInput, setBoyInput] = useState<string>('');
  const [adetInput, setAdetInput] = useState<string>('1');
  const [birimFiyat, setBirimFiyat] = useState<string>('150'); // standard m2 default price
  const [notlar, setNotlar] = useState<string>('');
  
  // Temporary piece inventory of the currently editing job
  const [activePieces, setActivePieces] = useState<Piece[]>([]);
  
  // Storage of saved job archive (loaded from localStorage)
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  
  // Global search & filter for archive
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Editing context state (if editing an existing job instead of creating)
  const [editingJobId, setEditingJobId] = useState<string | null>(null);

  // Print Preview Modal context
  const [printPreviewJob, setPrintPreviewJob] = useState<Job | null>(null);

  // Feedback notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // Initialize and load saved jobs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('boyahane_isler');
      if (stored) {
        setSavedJobs(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Kayıtlı işler yüklenirken bir hata oluştu:', err);
    }
  }, []);

  // Save to localStorage whenever savedJobs list or item changes
  const saveJobsToLocalStorage = (jobs: Job[]) => {
    try {
      localStorage.setItem('boyahane_isler', JSON.stringify(jobs));
      setSavedJobs(jobs);
    } catch (err) {
      triggerNotification('error', 'Kayıtlar tarayıcı hafızasına yazılamadı.');
    }
  };

  // Quick notification trigger helper
  const triggerNotification = (type: 'success' | 'info' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Preset dimension shortcuts for faster workspace entry
  const presetDimensions = [
    { label: 'Profil 6 Metre (600x5)', en: 5, boy: 600 },
    { label: 'Profil 6 Metre (600x10)', en: 10, boy: 600 },
    { label: 'Profil 6 Metre (600x15)', en: 15, boy: 600 },
    { label: 'Profil 6 Metre (600x20)', en: 20, boy: 600 },
    { label: 'Küçük Levha (100x200)', en: 100, boy: 200 },
    { label: 'Standart Plaka (125x250)', en: 125, boy: 250 },
    { label: 'Büyük Plaka (150x300)', en: 150, boy: 300 }
  ];

  // Quick quantity shortcuts
  const presetQuantities = [1, 5, 10, 20, 50, 100];

  // Apply a dimension preset
  const applyPreset = (en: number, boy: number) => {
    setEnInput(en.toString());
    setBoyInput(boy.toString());
    triggerNotification('info', `Kalıp uygulandı: En ${en} cm, Boy ${boy} cm`);
  };

  // Live calculation of the raw inputs before adding
  const livePreviewArea = useMemo(() => {
    const en = parseFloat(enInput.replace(',', '.'));
    const boy = parseFloat(boyInput.replace(',', '.'));
    const adet = parseInt(adetInput, 10);
    
    if (!isNaN(en) && en > 0 && !isNaN(boy) && boy > 0 && !isNaN(adet) && adet > 0) {
      const singleArea = (en * boy) / 10000;
      return {
        single: singleArea,
        total: singleArea * adet,
        isValid: true
      };
    }
    return { single: 0, total: 0, isValid: false };
  }, [enInput, boyInput, adetInput]);

  // Handle adding piece into active list
  const handleAddPiece = (e: React.FormEvent) => {
    e.preventDefault();
    
    const enVal = parseFloat(enInput.replace(',', '.'));
    const boyVal = parseFloat(boyInput.replace(',', '.'));
    const adetVal = parseInt(adetInput, 10);

    if (isNaN(enVal) || enVal <= 0) {
      triggerNotification('error', 'Lütfen geçerli bir En (gerekli genişlik) değeri girin.');
      return;
    }
    if (isNaN(boyVal) || boyVal <= 0) {
      triggerNotification('error', 'Lütfen geçerli bir Boy (gerekli uzunluk) değeri girin.');
      return;
    }
    if (isNaN(adetVal) || adetVal <= 0) {
      triggerNotification('error', 'Lütfen geçerli bir Adet miktarı girin.');
      return;
    }

    const singleArea = (enVal * boyVal) / 10000; // Formula: (cm*cm)/10000 = m²
    const totalArea = singleArea * adetVal;

    const newPiece: Piece = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      en: enVal,
      boy: boyVal,
      adet: adetVal,
      alan: singleArea,
      toplamAlan: totalArea
    };

    setActivePieces(prev => [...prev, newPiece]);
    
    // Reset dimension inputs but retain quantity for fast layout additions
    setEnInput('');
    setBoyInput('');
    triggerNotification('success', 'Parça ölçüsü başarıyla listeye eklendi.');
  };

  // Remove individual piece from current list
  const handleRemovePiece = (id: string) => {
    setActivePieces(prev => prev.filter(p => p.id !== id));
    triggerNotification('info', 'Parça listeden çıkarıldı.');
  };

  // Calculate total m² for active pieces
  const activeTotalMetrekare = useMemo(() => {
    return activePieces.reduce((sum, item) => sum + item.toplamAlan, 0);
  }, [activePieces]);

  // Calculate grand total cost for active pieces
  const activeToplamTutar = useMemo(() => {
    const price = parseFloat(birimFiyat.replace(',', '.'));
    if (isNaN(price) || price < 0) return 0;
    return activeTotalMetrekare * price;
  }, [activeTotalMetrekare, birimFiyat]);

  // Save or Update entire active job in list history
  const handleSaveJob = () => {
    if (activePieces.length === 0) {
      triggerNotification('error', 'Hesaplama kaydetmek için en az bir parça eklemelisiniz.');
      return;
    }

    const price = parseFloat(birimFiyat.replace(',', '.'));
    const finalPrice = isNaN(price) || price < 0 ? 0 : price;

    if (editingJobId) {
      // We are updating an existing record
      const updatedJobs = savedJobs.map(job => {
        if (job.id === editingJobId) {
          return {
            ...job,
            musteriAdi: musteriAdi.trim() || 'Adsız Müşteri / İş',
            parcalar: activePieces,
            toplamMetrekare: activeTotalMetrekare,
            birimFiyat: finalPrice,
            toplamTutar: activeTotalMetrekare * finalPrice,
            notlar: notlar.trim()
          };
        }
        return job;
      });

      saveJobsToLocalStorage(updatedJobs);
      triggerNotification('success', 'Kayıt başarıyla güncellendi.');
      
      // Reset after successful save
      resetCalculator();
      setActiveTab('archive');
    } else {
      // Creating a new job record
      const newJob: Job = {
        id: 'job_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        musteriAdi: musteriAdi.trim() || 'Adsız Müşteri / İş',
        parcalar: activePieces,
        toplamMetrekare: activeTotalMetrekare,
        birimFiyat: finalPrice,
        toplamTutar: activeTotalMetrekare * finalPrice,
        tarih: new Date().toISOString(),
        notlar: notlar.trim()
      };

      const updatedJobs = [newJob, ...savedJobs];
      saveJobsToLocalStorage(updatedJobs);
      triggerNotification('success', 'Hesaplama arşive kaydedildi.');
      
      resetCalculator();
      setActiveTab('archive'); // Switch to archive to see the result
    }
  };

  // Reset/Clear active calculator workspace
  const resetCalculator = () => {
    setMusteriAdi('');
    setEnInput('');
    setBoyInput('');
    setAdetInput('1');
    setBirimFiyat('150');
    setNotlar('');
    setActivePieces([]);
    setEditingJobId(null);
  };

  // Handle Loading Job back into the calculator for Editing
  const handleEditJob = (job: Job) => {
    setMusteriAdi(job.musteriAdi);
    setActivePieces(job.parcalar);
    setBirimFiyat(job.birimFiyat.toString());
    setNotlar(job.notlar || '');
    setEditingJobId(job.id);
    
    // Switch to calculator tab
    setActiveTab('calculator');
    triggerNotification('info', `"${job.musteriAdi}" düzenlenmek üzere hesaplayıcıya yüklendi.`);
  };

  // Handle Deleting standard job from history
  const handleDeleteJob = (id: string) => {
    if (confirm('Bu kayıtlı işi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
      const filtered = savedJobs.filter(j => j.id !== id);
      saveJobsToLocalStorage(filtered);
      triggerNotification('success', 'İş kaydı silindi.');
      
      // If we are currently editing the deleted job, clear the edit state too
      if (editingJobId === id) {
        resetCalculator();
      }
    }
  };

  // Search filter applied to saved records
  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) return savedJobs;
    const query = searchQuery.toLowerCase();
    return savedJobs.filter(j => 
      j.musteriAdi.toLowerCase().includes(query) || 
      j.id.toLowerCase().includes(query) ||
      (j.notlar && j.notlar.toLowerCase().includes(query))
    );
  }, [savedJobs, searchQuery]);

  // Compute overall Statistics from ALL saved entries
  const stats = useMemo(() => {
    const totalCount = savedJobs.length;
    const totalAreaSum = savedJobs.reduce((sum, j) => sum + j.toplamMetrekare, 0);
    const totalTutarSum = savedJobs.reduce((sum, j) => sum + j.toplamTutar, 0);
    
    return {
      totalCount,
      totalAreaSum,
      totalTutarSum
    };
  }, [savedJobs]);

  // Native Print Trigger
  const handleSystemPrint = (job: Job) => {
    // Generate clean template for native print
    setPrintPreviewJob(job);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="min-h-screen bg-natural-bg text-natural-text-dark font-sans antialiased flex flex-col selection:bg-natural-pale-olive/50 selection:text-natural-dark-olive print:bg-white print:text-black">
      
      {/* ─────────────────────────────────────────────────────────────────
          HEADER
          ───────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-natural-sand text-natural-text-medium border-b border-natural-border shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-natural-olive rounded-lg flex items-center justify-center text-white font-black text-lg shadow-sm">
              B
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold font-display tracking-tight text-natural-text-medium">
                BoyaHane Pro <span className="text-natural-olive font-medium">Metrekare</span>
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-natural-olive font-semibold font-sans">Metrekare Hesaplama & Takip</p>
            </div>
          </div>
          
          <div className="flex items-center bg-white/70 p-1 rounded-xl border border-natural-border/60 shadow-xs">
            <button
              id="tab-calc-btn"
              onClick={() => setActiveTab('calculator')}
              className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                activeTab === 'calculator' 
                  ? 'bg-natural-olive text-white shadow-sm' 
                  : 'text-natural-text-medium hover:text-natural-text-dark hover:bg-natural-item-bg'
              }`}
            >
              <Calculator className="h-4 w-4" />
              Hesapla & Fiyatlandır
            </button>
            <button
              id="tab-archive-btn"
              onClick={() => setActiveTab('archive')}
              className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer relative ${
                activeTab === 'archive' 
                  ? 'bg-natural-olive text-white shadow-sm' 
                  : 'text-natural-text-medium hover:text-natural-text-dark hover:bg-natural-item-bg'
              }`}
            >
              <Archive className="h-4 w-4" />
              Kayıtlı İşler
              {savedJobs.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm animate-pulse">
                  {savedJobs.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────
          NOTIFICATIONS (ALERT BANNER)
          ───────────────────────────────────────────────────────────────── */}
      {notification && (
        <div className="bg-natural-light-sand border-b border-natural-border py-3 px-4 shadow-sm sticky top-[73px] z-30 transition-all duration-305 print:hidden">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                notification.type === 'success' ? 'bg-emerald-600 shadow-emerald-500/55 shadow-sm' : 
                notification.type === 'error' ? 'bg-rose-600 shadow-rose-500/55 shadow-sm' : 'bg-natural-olive shadow-natural-olive/50 shadow-sm'
              }`} />
              <p className="text-sm font-medium text-natural-text-dark">{notification.message}</p>
            </div>
            <button 
              id="close-notif-btn" 
              onClick={() => setNotification(null)}
              className="text-natural-text-medium hover:text-natural-text-dark p-1 rounded transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          MAIN AREA
          ───────────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 print:px-0 print:py-0">
        
        {activeTab === 'calculator' ? (
          /* ─────────────────────────────────────────────────────────────
             TAB: HESAPLAYICI (CALCULATOR ENGINE)
             ───────────────────────────────────────────────────────────── */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:hidden">
            
            {/* Left Column (Input & Presets Form) - Span 5 */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              
              {/* Job Info & Metadata Box */}
              <div className="bg-natural-white-bg p-6 rounded-3xl border border-natural-light-border shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold font-display tracking-tight text-natural-text-dark flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-natural-olive rounded-full"></span>
                    Müşteri / İş Bilgisi
                  </h2>
                  {editingJobId && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-natural-pale-olive text-natural-dark-olive animate-pulse border border-natural-soft-olive">
                      DÜZENLEME MODU
                    </span>
                  )}
                </div>
                
                <div className="relative">
                  <label htmlFor="customer-name" className="block text-[11px] font-bold uppercase text-natural-olive tracking-wider ml-1 mb-1.5">
                    Müşteri Adı veya İş Adı <span className="text-xs font-normal text-slate-400 capitalize">(İsteğe Bağlı)</span>
                  </label>
                  <input
                    type="text"
                    id="customer-name"
                    value={musteriAdi}
                    onChange={(e) => setMusteriAdi(e.target.value)}
                    placeholder="Örn: Akasya Mobilya - Lake Boya, Demir Profil..."
                    className="w-full bg-natural-item-bg text-natural-text-dark font-medium px-4 py-3 rounded-xl border border-natural-border focus:border-natural-olive focus:ring-1 focus:ring-natural-olive outline-none transition-all placeholder:text-slate-400 text-sm"
                  />
                </div>
              </div>

              {/* Input Sheet (Ölçü Girişi Yardımıyla) */}
              <div className="bg-natural-white-bg p-6 rounded-3xl border border-natural-light-border shadow-xs flex flex-col gap-5">
                <h2 className="text-base font-bold font-display tracking-tight text-natural-text-dark flex items-center gap-2 border-b border-natural-border/30 pb-3">
                  <span className="w-1.5 h-6 bg-natural-olive rounded-full"></span>
                  Parça Ölçü Girişi
                </h2>

                <form onSubmit={handleAddPiece} className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label htmlFor="en-input" className="block text-[11px] font-bold uppercase text-natural-olive tracking-wider ml-1 mb-1">
                      En (cm)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      id="en-input"
                      value={enInput}
                      onChange={(e) => setEnInput(e.target.value)}
                      placeholder="Örn: 120"
                      className="w-full bg-natural-item-bg text-natural-text-dark font-semibold px-3 py-3 rounded-xl border border-natural-border focus:border-natural-olive focus:ring-1 focus:ring-natural-olive outline-none transition-all text-center text-base"
                    />
                  </div>

                  <div className="col-span-1">
                    <label htmlFor="boy-input" className="block text-[11px] font-bold uppercase text-natural-olive tracking-wider ml-1 mb-1">
                      Boy (cm)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      id="boy-input"
                      value={boyInput}
                      onChange={(e) => setBoyInput(e.target.value)}
                      placeholder="Örn: 300"
                      className="w-full bg-natural-item-bg text-natural-text-dark font-semibold px-3 py-3 rounded-xl border border-natural-border focus:border-natural-olive focus:ring-1 focus:ring-natural-olive outline-none transition-all text-center text-base"
                    />
                  </div>

                  <div className="col-span-1">
                    <label htmlFor="adet-input" className="block text-[11px] font-bold uppercase text-natural-olive tracking-wider ml-1 mb-1">
                      Adet
                    </label>
                    <input
                      type="number"
                      min="1"
                      id="adet-input"
                      value={adetInput}
                      onChange={(e) => setAdetInput(e.target.value)}
                      placeholder="1"
                      className="w-full bg-natural-item-bg text-natural-text-dark font-semibold px-3 py-3 rounded-xl border border-natural-border focus:border-natural-olive focus:ring-1 focus:ring-natural-olive outline-none transition-all text-center text-base"
                    />
                  </div>

                  {/* Real-time pre-insert area calculation helper */}
                  {livePreviewArea.isValid && (
                    <div className="col-span-3 bg-natural-light-sand border border-natural-border/50 rounded-xl p-3 mt-1 flex justify-between items-center text-xs text-natural-text-medium shadow-2xs">
                      <span className="font-semibold flex items-center gap-1 text-natural-olive">
                        <Sparkles className="h-3.5 w-3.5 inline text-natural-olive" />
                        Bekleyen Hesap:
                      </span>
                      <span>
                        Sıra Alanı: <strong className="font-mono text-sm underline text-natural-text-dark">{livePreviewArea.total.toFixed(3)} m²</strong>
                        <span className="text-[10px] text-natural-olive block text-right mt-0.5 font-medium">
                          ({enInput} x {boyInput} cm x {adetInput} adet)
                        </span>
                      </span>
                    </div>
                  )}

                  <div className="col-span-3 mt-2">
                    <button
                      type="submit"
                      id="add-piece-btn"
                      className="w-full bg-natural-dark-olive hover:bg-natural-olive text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 shadow-inner text-sm"
                    >
                      <Plus className="h-5 w-5 stroke-[2.5]" />
                      LİSTEYE EKLE
                    </button>
                  </div>
                </form>

                {/* Sizing presets and speed utilities */}
                <div className="border-t border-natural-border/40 pt-4 mt-1">
                  <p className="text-[11px] font-bold text-natural-olive uppercase tracking-wider mb-2.5 flex items-center gap-1.5 ml-1">
                    <Layers className="h-3.5 w-3.5 text-natural-olive" />
                    Boyahane Kalıp Kısayolları (Hızlı Ekle)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-sans">
                    {presetDimensions.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => applyPreset(preset.en, preset.boy)}
                        className="text-left text-xs bg-natural-item-bg hover:bg-natural-sand text-natural-text-medium hover:text-natural-text-dark px-3 py-2 border border-natural-border rounded-lg transition-colors cursor-pointer truncate font-medium flex items-center justify-between"
                      >
                        <span className="truncate">{preset.label}</span>
                        <span className="font-mono font-semibold text-natural-olive shrink-0 text-[10px]">
                          {((preset.en * preset.boy) / 10000).toFixed(2)}m²
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Quantity quick multiplier shortcuts */}
                  <div className="mt-3.5">
                    <p className="text-[11px] font-bold text-natural-olive uppercase tracking-wider mb-2 ml-1">Hızlı Adet Seçimi</p>
                    <div className="flex flex-wrap gap-1.5">
                      {presetQuantities.map((qty) => (
                        <button
                          key={qty}
                          type="button"
                          onClick={() => setAdetInput(qty.toString())}
                          className={`text-xs font-semibold px-3 py-1.5 border rounded-lg transition-all cursor-pointer ${
                            adetInput === qty.toString()
                              ? 'bg-natural-olive text-white border-natural-olive font-bold shadow-xs'
                              : 'bg-white text-natural-text-medium border-natural-border hover:bg-natural-item-bg'
                          }`}
                        >
                          {qty} Adet
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Right Column (List of items & totals / action area) - Span 7 */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              
              {/* Active pieces spreadsheet table */}
              <div className="bg-natural-white-bg rounded-3xl border border-natural-light-border shadow-xs flex-1 flex flex-col overflow-hidden min-h-[350px]">
                <div className="p-5 border-b border-natural-border/30 flex items-center justify-between bg-natural-sand/30">
                  <div>
                    <h3 className="font-bold text-natural-text-dark font-display tracking-tight text-sm md:text-base flex items-center gap-2">
                      <span className="w-1.5 h-6 bg-natural-olive rounded-full"></span>
                      Hesaplanan Parça Ölçü Cetveli
                    </h3>
                    <p className="text-xs text-natural-text-medium mt-0.5">Müşteri işi içerisindeki ölçüler</p>
                  </div>
                  {activePieces.length > 0 && (
                    <button
                      id="clear-all-pieces"
                      onClick={() => {
                        if (confirm('Listedeki tüm ölçü satırlarını silmek istediğinize emin misiniz?')) {
                          setActivePieces([]);
                          triggerNotification('info', 'Hesaplama listesi boşaltıldı.');
                        }
                      }}
                      className="text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                      Tümünü Temizle
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-x-auto">
                  {activePieces.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-natural-item-bg/40">
                      <div className="p-4 bg-natural-sand/50 rounded-full text-natural-text-medium mb-3 border border-natural-border/50 ring-4 ring-natural-sand/20">
                        <Calculator className="h-8 w-8 stroke-[1.5]" />
                      </div>
                      <h4 className="text-sm font-bold text-natural-text-dark">Henüz Parça Ölçüsü Girilmedi</h4>
                      <p className="text-xs text-natural-text-medium max-w-xs mt-1">
                        Soldaki formu kullanarak en, boy ve adet bilgilerini girip listeye ilk boyama parçasını ekleyin.
                      </p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-natural-border/45 text-[10px] uppercase font-bold text-natural-text-medium tracking-wider bg-natural-light-sand/60">
                          <th className="py-3 px-4 text-center w-12">#</th>
                          <th className="py-3 px-3">En (cm)</th>
                          <th className="py-3 px-3">Boy (cm)</th>
                          <th className="py-3 px-3 text-center w-20">Adet</th>
                          <th className="py-3 px-3 text-right">M² (Tek)</th>
                          <th className="py-3 px-3 text-right">Toplam M²</th>
                          <th className="py-3 px-4 text-center w-12">İşlem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-natural-border/30 text-sm">
                        {activePieces.map((piece, idx) => (
                          <tr key={piece.id} className="hover:bg-natural-item-bg transition-colors">
                            <td className="py-3 px-4 text-center font-semibold text-natural-text-medium font-mono text-xs">{idx + 1}</td>
                            <td className="py-3 px-3 font-semibold text-natural-text-dark">{piece.en} cm</td>
                            <td className="py-3 px-3 font-semibold text-natural-text-dark">{piece.boy} cm</td>
                            <td className="py-2 px-3 text-center">
                              <span className="inline-block font-extrabold text-natural-dark-olive bg-natural-pale-olive/40 px-2 py-0.5 rounded-md min-w-[28px] text-center">
                                {piece.adet}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-xs text-natural-text-medium">{piece.alan.toFixed(4)} m²</td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-natural-text-dark">{piece.toplamAlan.toFixed(3)} m²</td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => handleRemovePiece(piece.id)}
                                className="p-1.5 text-natural-text-medium hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Satırı Sil"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* pricing & Grand Total summary card - Section 2 specified */}
              <div className="bg-natural-dark-olive text-white p-6 rounded-3xl shadow-md border border-natural-border/30 flex flex-col gap-6">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-4">
                  <div>
                    <h3 className="font-bold font-display text-base tracking-tight text-white flex items-center gap-2">
                      <Coins className="h-5 w-5 text-natural-pale-olive" />
                      Metrekare Fiyatlandırma & Hesaplama
                    </h3>
                    <p className="text-xs text-white/70">Metrekare birim fiyatı üzerinden bakiye hesaplama</p>
                  </div>
                  
                  {/* Birim m2 Fiyati Input */}
                  <div className="flex items-center bg-white/10 p-1.5 rounded-xl border border-white/10 shrink-0">
                    <span className="text-xs font-bold text-white/95 px-3 uppercase tracking-wider">m² Birim (TL):</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={birimFiyat}
                      onChange={(e) => setBirimFiyat(e.target.value)}
                      placeholder="150"
                      className="w-24 bg-natural-dark-olive text-white font-black px-3 py-1.5 rounded-lg border border-white/20 focus:outline-none focus:border-white text-center text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white/5 p-5 rounded-2xl border border-white/15">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Toplam Alanı:</span>
                    <span className="text-2xl font-black text-white font-mono flex items-baseline gap-1">
                      {activeTotalMetrekare.toLocaleString('tr-TR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                      <span className="text-sm text-white/70 font-bold font-sans">m²</span>
                    </span>
                    <span className="text-[11px] text-white/60 mt-0.5 font-medium">
                      {activePieces.reduce((sum, p) => sum + p.adet, 0)} parça girişinin toplam m² tablosu.
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 border-t sm:border-t-0 sm:border-l border-white/10 pt-4 sm:pt-0 sm:pl-6">
                    <span className="text-xs font-bold text-natural-pale-olive uppercase tracking-wider flex items-center gap-1">
                      HESAPLANAN TUTAR:
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                      {activeToplamTutar.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span className="text-sm font-bold font-sans ml-1 text-white/85">TL</span>
                    </span>
                    <span className="text-[11px] text-white/60 mt-1 font-medium">
                      Girilen ölçülerin toplam tutarı (KDV hariç).
                    </span>
                  </div>
                </div>

                {/* Optional work notes */}
                <div className="relative">
                  <label htmlFor="notes-area" className="text-xs font-bold text-white/90 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Notebook className="h-3.5 w-3.5 text-natural-pale-olive" />
                    Müşteri / İş Detay Notları <span className="text-[10px] text-white/60 font-normal font-sans">(Renk kodu, işlem detayı, fırın sıcaklığı vb.)</span>
                  </label>
                  <textarea
                    id="notes-area"
                    rows={2}
                    value={notlar}
                    onChange={(e) => setNotlar(e.target.value)}
                    placeholder="Örn: Ral 1015 fildişi elektrostatik toz boya, pürüzsüz mat..."
                    className="w-full bg-white/10 text-white mt-1.5 px-3 py-2.5 rounded-xl border border-white/20 focus:outline-none focus:border-white text-xs font-medium placeholder:text-white/40 transition-colors"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                  <button
                    type="button"
                    onClick={resetCalculator}
                    className="px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors duration-200 border border-white/10 inline-flex items-center justify-center gap-2"
                  >
                    <Undo2 className="h-4 w-4" />
                    Ekranı Temizle
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleSaveJob}
                    id="save-job-submit"
                    className="flex-1 bg-white hover:bg-natural-sand text-natural-dark-olive hover:text-natural-text-dark font-black py-4 px-6 rounded-xl text-sm transition-all duration-200 shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="h-5 w-5 stroke-[2.5]" />
                    {editingJobId ? 'Kayıtlı İşi Güncelle' : 'Hesaplamayı Arşive Kaydet'}
                  </button>
                </div>

              </div>

            </div>

          </div>
        ) : (
          /* ─────────────────────────────────────────────────────────────
             TAB: KAYITLI İŞLER (ARCHIVED JOBS VIEW)
             ───────────────────────────────────────────────────────────── */
          <div className="flex flex-col gap-6 print:hidden">
            
            {/* Top statistics summary row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="bg-natural-white-bg p-5 rounded-2xl border border-natural-border/65 shadow-xs flex items-center gap-4">
                <div className="p-3 bg-natural-light-sand text-natural-dark-olive rounded-xl border border-natural-border/30">
                  <Archive className="h-6 w-6" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-natural-olive uppercase tracking-wider">Toplam Kayıtlı İş</span>
                  <span className="text-xl font-bold text-natural-text-dark font-mono mt-0.5">{stats.totalCount} Adet İş</span>
                </div>
              </div>

              <div className="bg-natural-white-bg p-5 rounded-2xl border border-natural-border/65 shadow-xs flex items-center gap-4">
                <div className="p-3 bg-natural-pale-olive/50 text-natural-dark-olive rounded-xl border border-natural-pale-olive/30">
                  <Layers className="h-6 w-6" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-natural-olive uppercase tracking-wider">Kümülatif Boyama Hacmi</span>
                  <span className="text-xl font-bold text-natural-text-dark font-mono mt-0.5">
                    {stats.totalAreaSum.toLocaleString('tr-TR', { minimumFractionDigits: 3 })} m²
                  </span>
                </div>
              </div>

              <div className="bg-natural-white-bg p-5 rounded-2xl border border-natural-border/65 shadow-xs flex items-center gap-4">
                <div className="p-3 bg-natural-sand/65 text-natural-dark-olive rounded-xl border border-natural-border/35">
                  <Coins className="h-6 w-6" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-natural-olive uppercase tracking-wider">Toplam Ciro / Tutar</span>
                  <span className="text-xl font-bold text-natural-text-dark font-mono mt-0.5">
                    {stats.totalTutarSum.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                  </span>
                </div>
              </div>

            </div>

            {/* Filter Search Section */}
            <div className="bg-natural-white-bg p-4 rounded-2xl border border-natural-border/65 shadow-xs flex flex-col sm:flex-row items-center gap-3 justify-between">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-natural-olive" />
                <input
                  type="text"
                  placeholder="Müşteri adı veya iş notuna göre ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-natural-light-sand/60 text-natural-text-dark pl-10 pr-4 py-2.5 rounded-xl border border-natural-border focus:border-natural-olive focus:ring-1 focus:ring-natural-olive outline-none transition-colors text-sm font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-3 text-natural-text-medium hover:text-natural-text-dark"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="text-xs text-natural-text-medium font-semibold font-mono shrink-0">
                Arşivde {filteredJobs.length} kayıt eşleşti
              </p>
            </div>

            {/* Saved Jobs dynamic cards */}
            {filteredJobs.length === 0 ? (
              <div className="bg-natural-white-bg py-16 px-4 rounded-2xl border border-natural-border/65 text-center shadow-xs">
                <div className="p-4 bg-natural-light-sand rounded-full text-natural-text-medium max-w-fit mx-auto mb-4 border border-natural-border/40">
                  <Search className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-natural-text-dark font-display">Hiç Kayıt Bulunamadı</h3>
                <p className="text-xs text-natural-text-medium max-w-sm mx-auto mt-1">
                  Aradığınız kriterlere uygun iş dosyası bulunamadı veya henüz arşivde bir boyama fiyat hesabı yapmadınız.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setActiveTab('calculator');
                  }}
                  className="mt-4 bg-natural-dark-olive hover:bg-natural-olive text-white font-bold py-2.5 px-5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Hesaplayıcıya Dön & İlk Kaydı Ekle
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredJobs.map((job) => (
                  <div 
                    key={job.id} 
                    className="bg-natural-white-bg rounded-2xl border border-natural-border/65 shadow-xs hover:shadow-md hover:border-natural-border/95 transition-all flex flex-col overflow-hidden"
                  >
                    
                    {/* Header Box of Saved Job Card */}
                    <div className="p-5 border-b border-natural-border/40 bg-natural-sand/15 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-natural-olive bg-natural-pale-olive/50 border border-natural-olive/30 px-2 py-0.5 rounded-md font-mono">
                          #{job.id.slice(4, 9).toUpperCase()}
                        </span>
                        <h4 className="font-bold text-natural-text-dark font-display mt-1.5 truncate text-base leading-tight" title={job.musteriAdi}>
                          {job.musteriAdi}
                        </h4>
                        
                        <div className="flex items-center gap-3.5 text-[11px] text-natural-text-medium font-mono mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(job.tarih).toLocaleDateString('tr-TR')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(job.tarih).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Dropdown-like display for Area / Cost */}
                      <div className="text-right shrink-0">
                        <span className="block text-xs font-bold text-natural-olive uppercase tracking-wider">İş Tutarı</span>
                        <span className="block text-lg font-black text-natural-dark-olive font-mono">
                          {job.toplamTutar.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <span className="text-xs font-bold font-sans ml-0.5 text-natural-text-medium">TL</span>
                        </span>
                        <span className="inline-block text-[10px] font-bold text-natural-olive font-mono mt-0.5">
                          {job.toplamMetrekare.toFixed(3)} m² @ {job.birimFiyat} TL
                        </span>
                      </div>
                    </div>

                    {/* Pieces expansion inside card */}
                    <div className="p-5 flex-1 flex flex-col gap-3">
                      
                      <div className="bg-natural-item-bg/60 border border-natural-border/45 rounded-xl p-3 flex flex-col gap-2">
                        <span className="text-[10px] font-bold text-natural-olive uppercase tracking-widest block border-b border-natural-border/30 pb-1.5">
                          Ölçü Detayı ({job.parcalar.length} Farklı Satır)
                        </span>
                        
                        <div className="max-h-24 overflow-y-auto divide-y divide-natural-border/20 text-xs pr-1 flex flex-col gap-1.5">
                          {job.parcalar.map((p, pIdx) => (
                            <div key={p.id} className="flex items-center justify-between py-1 text-natural-text-dark">
                              <span className="font-medium text-natural-text-medium font-mono">
                                {pIdx + 1}. <strong className="text-natural-text-dark font-sans">{p.en} x {p.boy} cm</strong> x {p.adet} adet
                              </span>
                              <span className="font-mono text-natural-dark-olive font-semibold bg-natural-pale-olive/35 border border-natural-border px-1.5 py-0.5 rounded">
                                {p.toplamAlan.toFixed(3)} m²
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {job.notlar && (
                        <div className="text-xs text-natural-text-medium border border-natural-border/60 bg-natural-light-sand/40 p-2.5 rounded-xl italic flex items-start gap-1.5 leading-snug">
                          <Notebook className="h-4 w-4 text-natural-olive shrink-0 mt-0.5" />
                          <span className="line-clamp-2"><strong>Not:</strong> {job.notlar}</span>
                        </div>
                      )}

                    </div>

                    {/* Footer Actions Box */}
                    <div className="px-5 py-4 bg-natural-sand/15 border-t border-natural-border/40 grid grid-cols-4 gap-2">
                      <button
                        onClick={() => handleEditJob(job)}
                        className="col-span-2 bg-white hover:bg-natural-light-sand text-natural-dark-olive border border-natural-border font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        title="İşi tekrar hesaplayıcıya yükle"
                      >
                        Düzenle
                      </button>
                      
                      <button
                        onClick={() => handleDeleteJob(job.id)}
                        className="bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-bold px-2 py-2 rounded-xl text-xs flex items-center justify-center cursor-pointer transition-colors"
                        title="Kaydı Arşivden Sil"
                      >
                        Sil
                      </button>

                      <div className="col-span-1 flex gap-1">
                        <button
                          onClick={() => generateJobPDF(job)}
                          className="flex-1 bg-natural-dark-olive hover:bg-natural-olive text-white border border-natural-dark-olive font-bold p-2 rounded-xl text-xs flex items-center justify-center cursor-pointer transition-colors"
                          title="PDF Olarak Kaydet"
                        >
                          <FileDown className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleSystemPrint(job)}
                          className="flex-1 bg-white hover:bg-natural-light-sand text-natural-text-dark border border-natural-border font-bold p-2 rounded-xl text-xs flex items-center justify-center cursor-pointer transition-colors"
                          title="Faturayı / Fişi Yazdır"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>
        )}

      </main>

      {/* ─────────────────────────────────────────────────────────────────
          PRINT VIEW LAYOUT (Drawn off-screen initially, displayed cleanly during browser print)
          ───────────────────────────────────────────────────────────────── */}
      {printPreviewJob && (
        <div className="hidden print:block fixed inset-0 bg-white text-black z-[9999] p-8 text-sm">
          <div className="border border-black p-6 rounded max-w-4xl mx-auto flex flex-col gap-6">
            
            {/* Print Header */}
            <div className="flex justify-between items-start border-b border-black pb-4">
              <div>
                <h1 className="text-2xl font-bold font-display tracking-tight text-black uppercase">BOYAHANE METREKARE TESLİM BELGESİ</h1>
                <p className="text-xs text-gray-600 mt-1">Endüstriyel Toz Mat / Özel Elektrostatik Fırın Boya Tesisleri</p>
              </div>
              <div className="text-right">
                <span className="block text-md font-bold text-black border border-black px-2 py-0.5 rounded">FİŞ NO: #{printPreviewJob.id.slice(4, 9).toUpperCase()}</span>
                <span className="block text-xs mt-1.5 text-gray-500">Tarih: {new Date(printPreviewJob.tarih).toLocaleString('tr-TR')}</span>
              </div>
            </div>

            {/* Client Card */}
            <div className="grid grid-cols-2 gap-4 border-b border-black pb-4">
              <div>
                <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider">İş / Müşteri Sahibi</span>
                <span className="text-base font-bold text-black">{printPreviewJob.musteriAdi || 'Adsız Müşteri / Hizmet Alan'}</span>
              </div>
              <div className="text-right">
                <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Ölçüm Durumu</span>
                <span className="text-xs font-bold text-emerald-700">✓ Alan Hesaplandı / Teslim Edildi</span>
              </div>
            </div>

            {/* Pieces Table */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Boyanan Parça Detayları</h3>
              <table className="w-full text-left border-collapse border border-black text-xs">
                <thead>
                  <tr className="bg-gray-100 border-b border-black text-black">
                    <th className="py-2 px-3 border-r border-black text-center w-10">Sıra</th>
                    <th className="py-2 px-3 border-r border-black">Genişlik (En - cm)</th>
                    <th className="py-2 px-3 border-r border-black">Uzunluk (Boy - cm)</th>
                    <th className="py-2 px-3 border-r border-black text-center w-20">Adet miktarı</th>
                    <th className="py-2 px-3 border-r border-black text-right">Tek Alan (m²)</th>
                    <th className="py-2 px-3 text-right">Toplam Alan (m²)</th>
                  </tr>
                </thead>
                <tbody>
                  {printPreviewJob.parcalar.map((piece, idx) => (
                    <tr key={piece.id} className="border-b border-black last:border-b-0">
                      <td className="py-2 px-3 border-r border-black text-center font-mono">{idx + 1}</td>
                      <td className="py-2 px-3 border-r border-black">{piece.en} cm</td>
                      <td className="py-2 px-3 border-r border-black">{piece.boy} cm</td>
                      <td className="py-2 px-3 border-r border-black text-center font-bold">{piece.adet}</td>
                      <td className="py-2 px-3 border-r border-black text-right font-mono">{piece.alan.toFixed(4)} m²</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">{piece.toplamAlan.toFixed(3)} m²</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations summaries Box */}
            <div className="flex justify-between items-start gap-4">
              <div className="w-1/2">
                {printPreviewJob.notlar && (
                  <div className="border border-black p-3 rounded text-xs">
                    <strong className="block text-gray-700 uppercase tracking-wider text-[10px] mb-1">Müşteri Notu:</strong>
                    <p className="italic text-gray-650">{printPreviewJob.notlar}</p>
                  </div>
                )}
              </div>
              <div className="w-1/2 border border-black p-4 rounded bg-gray-50 flex flex-col gap-2 font-mono text-xs">
                <div className="flex justify-between border-b border-gray-200 pb-1.5 text-gray-700">
                  <span>Toplam Boyama m² Alanı:</span>
                  <span className="font-bold text-black">{printPreviewJob.toplamMetrekare.toFixed(3)} m²</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-1.5 text-gray-700">
                  <span>Hesap m² Birim Fiyatı:</span>
                  <span className="font-bold text-black">
                    {printPreviewJob.birimFiyat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL / m²
                  </span>
                </div>
                <div className="flex justify-between pt-1.5 text-black font-sans">
                  <span className="font-bold text-sm">GENEL TOPLAM TUTAR:</span>
                  <span className="font-black text-lg text-emerald-800">
                    {printPreviewJob.toplamTutar.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
                  </span>
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 mt-12 text-center text-xs">
              <div>
                <span className="block border-t border-black pt-2 font-bold uppercase text-black">TESLİM EDEN (Operatör Kaşe)</span>
                <span className="block text-[10px] text-gray-500 mt-1">Geri Dönüştürülmüş Sac Plastik Kaplama Sanayi</span>
              </div>
              <div>
                <span className="block border-t border-black pt-2 font-bold uppercase text-black">TESLİM ALAN (Müşteri İmza)</span>
                <span className="block text-[10px] text-gray-500 mt-1">İmza Tarihi ve Teslim Alındı Beyanı</span>
              </div>
            </div>

            {/* Footer */}
            <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest mt-12 border-t border-gray-200 pt-4">
              TEŞEKKÜR EDERİZ - BOYAHANE TEKNİK METREKARE VE KALİTE RAPORUDUR
            </p>

          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          FOOTER
          ───────────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-slate-500 text-center text-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-medium text-slate-400">
            Boyahane Metrekare Alan & Fırın İş Takip Fişi © {new Date().getFullYear()}
          </p>
          <div className="flex gap-4 font-mono">
            <span className="bg-slate-800 px-2 py-1 rounded text-[10px] uppercase text-indigo-400 font-bold border border-slate-700/60">
              Offline-First / Yerel Kayıt
            </span>
            <span className="bg-slate-800 px-2 py-1 rounded text-[10px] uppercase text-amber-500 font-bold border border-slate-700/60">
              CM / Metrekare Çevirici
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
