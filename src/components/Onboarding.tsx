"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronRight, ChevronLeft, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  targetId: string;
  title: string;
  description: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    targetId: "onboard-sensor-control",
    title: "Sensör Kontrol Paneli",
    description:
      'Bu buton ile sistemi başlatırsınız. İlk tıkta "Sensörleri Aç" ile ML API sunucusunu (port 8000) başlatırsınız. ' +
      'Sunucu hazır olduğunda buton "Sensörlerden Veri Çek" olarak değişir ve NASA CMAPSS verilerini Supabase\'e aktarmaya başlar. ' +
      '"Durdur" butonu tüm scriptleri kapatır ve Supabase\'deki realtime verileri temizler.',
  },
  {
    targetId: "onboard-kpi",
    title: "Genel Bakış (KPI Kartları)",
    description:
      "6 adet KPI kartı: Toplam Anomali (tespit edilen toplam anomali sayısı), Aktif Cihaz (offline olmayan cihaz sayısı), " +
      "Ort. Anomali Skoru (Isolation Forest + LSTM skorlarının ortalaması, 0-1 arası), Son 24s Alarm (son 24 saatteki anomali sayısı), " +
      "Ortalama RUL (tüm cihazların kalan faydalı ömür ortalaması, döngü cinsinden), Kritik Cihaz (anomali tespit edilen cihaz sayısı).",
  },
  {
    targetId: "onboard-rul",
    title: "Cihaz Sağlık Durumu (RUL Gauge)",
    description:
      "RUL = Remaining Useful Life (Kalan Faydalı Ömür). Her cihaz için SVG dairesel gösterge. " +
      "RUL 164 demek: o motorun 164 döngü (uçuş) daha çalışabileceği tahmin ediliyor. " +
      "Yeşil (>150): Sağlıklı — Bakım gerekmiyor. Sarı (50-150): Dikkat — Bakım planlanmalı. " +
      "Kırmızı (<50): Kritik — Acil bakım gerekli. Turuncu çerçeve = o cihazda anomali tespit edildi.",
  },
  {
    targetId: "onboard-sensor-chart",
    title: "Sensör Verisi (Canlı Grafik)",
    description:
      "NASA CMAPSS veri setinden 14 aktif sensör gösterilir. Pill butonlarla sensör seç/kaldır. " +
      "Her sensörün pill rengi = grafik çizgi rengi. Örnek sensörler: Fan Giriş Sıcaklığı, HPC Çıkış Sıcaklığı, " +
      "Fiziksel Fan Hızı, Bypass Oranı vb. Yeşil nokta = canlı bağlantı var, veri akmaya devam ediyor.",
  },
  {
    targetId: "onboard-anomaly-dist",
    title: "Anomali Dağılımı (Scatter Plot)",
    description:
      "Anomali olayları severity bazlı scatter plot üzerinde gösterilir. " +
      "Kırmızı = Kritik, Turuncu = Yüksek, Sarı = Orta, Yeşil = Düşük. " +
      "X ekseni zaman, Y ekseni anomali skoru. Noktaya tıklayarak detay görebilirsiniz.",
  },
  {
    targetId: "onboard-trend",
    title: "Anomali Trendi (Stacked Bar)",
    description:
      "Günlük anomali trendini gösterir. 7 gün / 30 gün arasında geçiş yapabilirsiniz. " +
      "Renkli çubuklar severity seviyelerini temsil eder. Yukarı ok = anomali artışı (kötü), " +
      "aşağı ok = anomali azalması (iyi). Yüzde değişim önceki döneme göredir.",
  },
  {
    targetId: "onboard-anomaly-table",
    title: "Son Anomali Olayları (Tablo)",
    description:
      "3 sütunlu tablo: Cihaz (hangi cihazda), Uyarı (severity + en etkili sensör SHAP analizi ile), " +
      "Tarih (ne zaman tespit edildi). En son 10 anomali olayı listelenir. " +
      "Her satırın başındaki renkli nokta severity seviyesini gösterir.",
  },
  {
    targetId: "onboard-devices",
    title: "Cihazlar",
    description:
      "5 cihaz kartı: Türbin A1, Türbin A2, Pompa B1, Kompresör C1, Jeneratör D1. " +
      "Her kartta RUL bazlı durum (Aktif/Dikkat/Kritik), sensör sayısı ve son görülme zamanı yer alır. " +
      "Turuncu vurgulama = o cihazda anomali tespit edildi. " +
      "RUL değeri her /predict API çağrısıyla güncellenir.",
  },
];

function OnboardingPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

export function Onboarding() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [arrowLeft, setArrowLeft] = useState(0);
  const [arrowOnTop, setArrowOnTop] = useState(true);
  const popupRef = useRef<HTMLDivElement>(null);

  // Session-based: auto-start on first visit
  useEffect(() => {
    const seen = sessionStorage.getItem("onboarding_seen");
    if (!seen) {
      const timer = setTimeout(() => setIsActive(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const positionPopup = useCallback(() => {
    const step = ONBOARDING_STEPS[currentStep];
    if (!step) return;
    // Try primary target, fallback to mobile variant
    let target = document.getElementById(step.targetId);
    if (target && target.offsetParent === null) {
      // Element is hidden (display:none via md:hidden), try mobile fallback
      const mobileTarget = document.getElementById(step.targetId + "-mobile");
      if (mobileTarget) target = mobileTarget;
    }
    if (!target) return;

    // Scroll target into view first
    target.scrollIntoView({ behavior: "smooth", block: "center" });

    // Recalculate after scroll settles
    requestAnimationFrame(() => {
      setTimeout(() => {
        const rect = target.getBoundingClientRect();
        const scrollY = window.scrollY;
        const viewportW = window.innerWidth;
        const popupW = Math.min(400, viewportW - 32);
        const popupH = 280; // approximate

        // Decide: show below or above
        const spaceBelow = window.innerHeight - rect.bottom;
        const showBelow = spaceBelow > popupH + 20 || rect.top < popupH + 20;
        const gap = 14;

        let top: number;
        if (showBelow) {
          top = rect.bottom + scrollY + gap;
          setArrowOnTop(true);
        } else {
          top = rect.top + scrollY - popupH - gap;
          setArrowOnTop(false);
        }

        // Horizontal: center on target
        let left = rect.left + rect.width / 2 - popupW / 2;
        left = Math.max(16, Math.min(left, viewportW - popupW - 16));

        // Arrow points to target center
        const targetCenterX = rect.left + rect.width / 2;
        const arrowX = targetCenterX - left - 8;
        setArrowLeft(Math.max(20, Math.min(arrowX, popupW - 36)));

        setPopupPos({ top, left, width: popupW });
      }, 350);
    });
  }, [currentStep]);

  // Apply highlight + position on step change
  useEffect(() => {
    if (!isActive) return;

    const step = ONBOARDING_STEPS[currentStep];
    let target = document.getElementById(step.targetId);
    if (target && target.offsetParent === null) {
      const mobileTarget = document.getElementById(step.targetId + "-mobile");
      if (mobileTarget) target = mobileTarget;
    }

    if (target) {
      target.setAttribute("data-onboard-active", "true");
    }

    positionPopup();

    const onResize = () => positionPopup();
    window.addEventListener("resize", onResize);

    return () => {
      if (target) {
        target.removeAttribute("data-onboard-active");
      }
      window.removeEventListener("resize", onResize);
    };
  }, [isActive, currentStep, positionPopup]);

  const finish = useCallback(() => {
    setIsActive(false);
    setPopupPos(null);
    sessionStorage.setItem("onboarding_seen", "true");
    // Remove all highlights
    ONBOARDING_STEPS.forEach((s) => {
      const el = document.getElementById(s.targetId);
      if (el) el.removeAttribute("data-onboard-active");
    });
  }, []);

  const next = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      finish();
    }
  };

  const prev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const startOnboarding = () => {
    setCurrentStep(0);
    setIsActive(true);
  };

  // Help button (always visible)
  const helpButton = (
    <button
      onClick={startOnboarding}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
      title="Rehberi Başlat"
    >
      <HelpCircle className="h-4 w-4" />
    </button>
  );

  if (!isActive) return helpButton;

  const step = ONBOARDING_STEPS[currentStep];

  return (
    <>
      {helpButton}
      <OnboardingPortal>
        {/* Overlay */}
        <div
          onClick={finish}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99998,
            backgroundColor: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(2px)",
          }}
        />

        {/* Highlighted target ring */}
        <HighlightRing targetId={step.targetId} />

        {/* Popup */}
        {popupPos && (
          <div
            ref={popupRef}
            style={{
              position: "absolute",
              top: popupPos.top,
              left: popupPos.left,
              width: popupPos.width,
              zIndex: 100000,
            }}
          >
            <div
              className="relative bg-card text-card-foreground border border-border rounded-2xl shadow-2xl p-5"
              style={{ animation: "onboard-fade-in 0.25s ease-out" }}
            >
              {/* Arrow */}
              <div
                style={{
                  position: "absolute",
                  left: arrowLeft,
                  ...(arrowOnTop ? { top: -7 } : { bottom: -7 }),
                }}
              >
                <div
                  className="bg-card"
                  style={{
                    width: 14,
                    height: 14,
                    transform: "rotate(45deg)",
                    borderTopWidth: arrowOnTop ? 1 : 0,
                    borderTopStyle: arrowOnTop ? "solid" : "none",
                    borderLeftWidth: arrowOnTop ? 1 : 0,
                    borderLeftStyle: arrowOnTop ? "solid" : "none",
                    borderBottomWidth: arrowOnTop ? 0 : 1,
                    borderBottomStyle: arrowOnTop ? "none" : "solid",
                    borderRightWidth: arrowOnTop ? 0 : 1,
                    borderRightStyle: arrowOnTop ? "none" : "solid",
                    borderColor: "inherit",
                  }}
                />
              </div>

              {/* Close button */}
              <button
                onClick={finish}
                className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Step badge */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {currentStep + 1} / {ONBOARDING_STEPS.length}
                </span>
              </div>

              {/* Content */}
              <h3 className="text-sm font-bold mb-2">{step.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                {step.description}
              </p>

              {/* Step dots */}
              <div className="flex items-center justify-center gap-1.5 mb-4">
                {ONBOARDING_STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentStep(i)}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-200",
                      i === currentStep
                        ? "w-6 bg-primary"
                        : i < currentStep
                          ? "w-1.5 bg-primary/40"
                          : "w-1.5 bg-muted-foreground/30"
                    )}
                  />
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={finish}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors font-medium"
                >
                  Atla
                </button>
                <div className="flex items-center gap-2">
                  {currentStep > 0 && (
                    <button
                      onClick={prev}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Geri
                    </button>
                  )}
                  <button
                    onClick={next}
                    className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
                  >
                    {currentStep === ONBOARDING_STEPS.length - 1 ? "Tamamla" : "Ileri"}
                    {currentStep < ONBOARDING_STEPS.length - 1 && (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inline keyframe */}
        <style>{`
          @keyframes onboard-fade-in {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </OnboardingPortal>
    </>
  );
}

/** Renders a highlight ring around the target element */
function HighlightRing({ targetId }: { targetId: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const update = () => {
      const el = document.getElementById(targetId);
      if (el) setRect(el.getBoundingClientRect());
    };

    update();
    const id = setInterval(update, 400);
    window.addEventListener("scroll", update);
    return () => {
      clearInterval(id);
      window.removeEventListener("scroll", update);
    };
  }, [targetId]);

  if (!rect) return null;

  const pad = 6;
  return (
    <div
      style={{
        position: "fixed",
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
        zIndex: 99999,
        borderRadius: 16,
        border: "2px solid hsl(221, 83%, 53%)",
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
        pointerEvents: "none",
        transition: "all 0.3s ease",
      }}
    />
  );
}
