// LogbookPage — 레이아웃·히어로·탭 라우팅만. 상태는 useLogbookPageModel, 각 탭은 ./logbook/tabs/*
import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, NotebookPen } from "lucide-react";
import { Footer } from "../components/Footer";
import { EntryDetailDialog } from "../components/logbook/EntryDetailDialog";
import { AutoSyncEntryDecisions } from "../components/logbook/AutoSyncEntryDecisions";
import { CertificateDetailDialog } from "../components/certificates/CertificateDetailDialog";
import { FlightReadinessPanel } from "../components/logbook/FlightReadinessPanel";
import { MyCertificateStatusCard } from "../components/logbook/MyCertificateStatusCard";
import { DutyTimeLimitCard } from "../components/logbook/DutyTimeLimitCard";
import { WorkLogDetailDialog } from "../components/worklog/WorkLogDetailDialog";
import { VehicleSummaryCard } from "../components/logbook/VehicleSummaryCard";
import { RecentFlightsCard } from "../components/logbook/RecentFlightsCard";
import { NextGoalCard } from "../components/logbook/NextGoalCard";
import { PILOT_TRACK_LABEL, PILOT_TRACK_SHORT } from "../lib/tracks";
import type { PilotTrack } from "../lib/tracks";
import { useLogbookPageModel } from "./logbook/useLogbookPageModel";
import { MyRecordsTab } from "./logbook/tabs/MyRecordsTab";
import { CertificatesTab } from "./logbook/tabs/CertificatesTab";
import { EligibilityTab } from "./logbook/tabs/EligibilityTab";
import { CurrencyTab } from "./logbook/tabs/CurrencyTab";
import { InputTab } from "./logbook/tabs/InputTab";
import { WorkLogTab } from "./logbook/tabs/WorkLogTab";
import { SignatureInboxTab } from "./logbook/tabs/SignatureInboxTab";

export function LogbookPage() {
  const model = useLogbookPageModel();
  const {
    TABS,
    account,
    activeTab,
    activeTrack,
    aircraftLabelProps,
    certificates,
    cleanupSignatureRequestPosts,
    confirmInferredEntries,
    deleteCertificate,
    deleteEntry,
    deleteWorkLogEntry,
    entries,
    handleUpdateEntry,
    headerHeight,
    headerRef,
    individualRoleLabel,
    isDrone,
    isLsa,
    isPilotLike,
    operationType,
    pilotTracks,
    roleContent,
    selectedCertificate,
    selectedEntry,
    selectedWorkLogEntry,
    setActiveTab,
    setActiveTrack,
    setSelectedCertificate,
    setSelectedEntry,
    setSelectedWorkLogEntry,
    toast,
    trackEntries,
    trackTotalHours,
    untaggedCount,
    updateCertificate,
    updateWorkLogEntry,
    vehicles,
    workLogCopy,
    workLogRole,
  } = model;
  return (
    <div className="min-h-screen bg-surface font-body text-ink">
      <header
        ref={headerRef}
        className="sticky top-0 z-50 border-b border-white/10 bg-navy/90 backdrop-blur"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-sky
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky rounded"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            홈으로
          </Link>
          <p className="font-display text-base font-extrabold tracking-tight text-white">
            Aviation Wallet <span className="text-sky">OS</span>
          </p>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-navy-dark py-[clamp(24px,3vw,40px)] text-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(0,212,255,0.14),transparent_55%)]" />
          <div className="relative mx-auto max-w-4xl px-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col items-start gap-2">
                <span className="inline-flex items-center gap-2 rounded-control border border-sky/30 bg-sky/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-sky">
                  <NotebookPen className="h-3.5 w-3.5" aria-hidden="true" />
                  AWOS 디지털 자격 월렛
                </span>
                {account && (
                  <p className="text-sm font-semibold text-sky">
                    {workLogRole
                      ? (individualRoleLabel ?? "역할 미설정")
                      : PILOT_TRACK_LABEL[activeTrack]}{" "}
                    · <span>{account.name}</span>님
                  </p>
                )}
              </div>

              {account && (
                <div className="flex flex-col items-end gap-2">
                  {!workLogRole && pilotTracks.length > 1 && (
                    <div
                      role="tablist"
                      aria-label="자격 구분 전환"
                      className="flex flex-wrap justify-end gap-1.5"
                    >
                      {pilotTracks.map((t: PilotTrack) => {
                        const isActive = t === activeTrack;
                        return (
                          <button
                            key={t}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => setActiveTrack(t)}
                            className={`inline-flex min-h-[30px] items-center gap-1.5 rounded-control border px-2.5 py-1 text-[11px] font-semibold transition-colors
                              ${isActive ? "border-sky bg-sky/15 text-[#00D4FF]" : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/30"}`}
                          >
                            {PILOT_TRACK_SHORT[t]}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {!workLogRole && untaggedCount > 0 && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-control border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                <span>
                  예전 기록 {untaggedCount}건은 자격 구분이 저장돼 있지 않아
                  기종명으로 자동 분류했어요.
                </span>
                <button
                  type="button"
                  onClick={() => void confirmInferredEntries()}
                  className="rounded-control border border-amber-300/50 bg-amber-300/15 px-2.5 py-1 text-[11px] font-semibold text-amber-100 hover:bg-amber-300/25"
                >
                  자동 분류 그대로 확정
                </button>
              </div>
            )}

            {isPilotLike ? (
              <div className="mt-4 flex flex-col gap-4">
                <FlightReadinessPanel
                  entries={trackEntries}
                  certificates={certificates}
                  account={account}
                  compact
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <MyCertificateStatusCard
                    certificates={certificates}
                    roleContent={roleContent}
                    compact
                    holderName={account?.name}
                    track={activeTrack}
                    totalHours={trackTotalHours}
                  />
                  <DutyTimeLimitCard
                    entries={trackEntries}
                    compact
                    operationType={operationType}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <MyCertificateStatusCard
                  certificates={certificates}
                  roleContent={roleContent}
                  compact
                  holderName={account?.name}
                  track={workLogRole ? "aircraft" : activeTrack}
                  totalHours={workLogRole ? undefined : trackTotalHours}
                />
                {(isDrone || isLsa) && (
                  <div className="flex flex-col gap-4">
                    <NextGoalCard
                      track={activeTrack}
                      entries={trackEntries}
                      certificates={certificates}
                      vehicles={vehicles}
                      onOpenDetail={() => {
                        // 상세는 "응시경력" 탭으로 이동(2026-09-05 탭 분리)
                        setActiveTab("eligibility");
                        window.setTimeout(
                          () =>
                            document
                              .getElementById("elig-section")
                              ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                          80,
                        );
                      }}
                    />
                    {isDrone && (
                      <VehicleSummaryCard
                        vehicles={vehicles}
                        onManage={() => setActiveTab("logbook")}
                      />
                    )}
                    {isLsa && <RecentFlightsCard entries={trackEntries} />}
                  </div>
                )}
              </div>
            )}

          </div>
        </section>

        <section
          style={{ top: headerHeight }}
          className="sticky z-30 border-b border-white/10 bg-navy/95 backdrop-blur"
        >
          <div className="mx-auto max-w-4xl px-6">
            <div
              role="tablist"
              aria-label="AWOS 기능 선택"
              className="-mx-6 flex gap-2 overflow-x-auto px-6 py-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden [&>*]:shrink-0"
            >
              {TABS.map(({ key, label, icon: Icon }) => {
                const isActive = activeTab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    data-state={isActive ? "active" : "idle"}
                    onClick={() => setActiveTab(key)}
                    className={`inline-flex min-h-[44px] items-center gap-2 rounded-control border px-4 py-2 text-sm font-semibold transition-colors
                      focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky
                      ${isActive ? "border-sky bg-sky/10 text-[#00D4FF]" : "border-white/10 bg-panel text-slate-400 hover:bg-white/[0.06]"}`}
                  >
                    <Icon className="h-4 w-4" aria-hidden={true} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {activeTab === "myRecords" && <MyRecordsTab m={model} />}

        {activeTab === "certificates" && <CertificatesTab m={model} />}
        {activeTab === "eligibility" && <EligibilityTab m={model} />}

        {activeTab === "currency" && isPilotLike && <CurrencyTab m={model} />}

        {activeTab === "logbook" && <InputTab m={model} />}

        {activeTab === "workLog" && workLogCopy && <WorkLogTab m={model} />}

        {activeTab === "signatureInbox" && <SignatureInboxTab m={model} />}
      </main>

      <Footer />

      {/* 다이얼로그 열림 여부와 무관하게, 대기중인 비행경력증명서 인증/교관 서명 요청을
          백그라운드에서 자동으로 확인해 반영한다(BUG-015). */}
      {toast}
      <AutoSyncEntryDecisions entries={entries} onUpdate={handleUpdateEntry} />

      <EntryDetailDialog
        vehicles={vehicles}
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
        onUpdate={handleUpdateEntry}
        onDelete={(id) => {
          cleanupSignatureRequestPosts([id]);
          deleteEntry(id);
          setSelectedEntry(null);
        }}
        {...aircraftLabelProps}
      />

      <CertificateDetailDialog
        certificate={selectedCertificate}
        roleTemplate={roleContent}
        onClose={() => setSelectedCertificate(null)}
        onUpdate={(id, input) => {
          updateCertificate(id, input);
          setSelectedCertificate((prev) =>
            prev && prev.id === id
              ? { ...prev, ...input, updatedAt: Date.now() }
              : prev,
          );
        }}
        onDelete={(id) => {
          deleteCertificate(id);
          setSelectedCertificate(null);
        }}
      />

      {workLogCopy && (
        <WorkLogDetailDialog
          entry={selectedWorkLogEntry}
          copy={workLogCopy}
          onClose={() => setSelectedWorkLogEntry(null)}
          onUpdate={(id, input) => {
            updateWorkLogEntry(id, input);
            setSelectedWorkLogEntry((prev) =>
              prev && prev.id === id
                ? { ...prev, ...input, updatedAt: Date.now() }
                : prev,
            );
          }}
          onDelete={(id) => {
            deleteWorkLogEntry(id);
            setSelectedWorkLogEntry(null);
          }}
        />
      )}
    </div>
  );
}
