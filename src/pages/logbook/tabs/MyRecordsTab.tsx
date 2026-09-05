// MyRecordsTab — LogbookPage 탭. 모델은 useLogbookPageModel 에서 받는다.
import React from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "../../../components/Button";
import { Reveal } from "../../../components/Reveal";
import { EntryFilterBar } from "../../../components/logbook/EntryFilterBar";
import { EntryList } from "../../../components/logbook/EntryList";
import { LogbookTotalsSummary } from "../../../components/logbook/LogbookTotalsSummary";
import { LogbookOnboarding } from "../../../components/logbook/LogbookOnboarding";
import { downloadLogbookCsv } from "../../../lib/logbookCsv";
import {
  savePilotFlightExperienceCertificatePdf,
  saveUltralightCertificatePdf,
} from "../../../lib/pdf";
import type { LogbookModel } from "../useLogbookPageModel";
import { describeImportError } from "../../../lib/lazyImport";
import { InfoTip } from "../../../components/InfoTip";

export function MyRecordsTab({ m }: { m: LogbookModel }) {
  const {
    account,
    activeTrack,
    birthDate,
    cleanupSignatureRequestPosts,
    clearAll,
    deleteEntries,
    entries,
    filterKind,
    filterValue,
    filteredEntries,
    handleResyncFromServer,
    isDrone,
    isResyncing,
    pendingSyncCount,
    resyncCooldownSecondsLeft,
    resyncMessage,
    setActiveTab,
    setFilterKind,
    setFilterValue,
    setSelectedEntry,
    showToast,
    trackEntries,
    vehicles,
  } = m;
  return (
    <>
      <>
        {trackEntries.length === 0 && (
          <section className="bg-surface pt-[clamp(24px,4vw,48px)]">
            <div className="mx-auto max-w-4xl px-6">
              <Reveal>
                <LogbookOnboarding
                  onStartExcel={() => {
                    setActiveTab("logbook");
                    window.setTimeout(
                      () =>
                        document
                          .getElementById("legacy-import")
                          ?.scrollIntoView({ behavior: "smooth" }),
                      80,
                    );
                  }}
                  onStartCertificate={() => {
                    setActiveTab("logbook");
                    window.setTimeout(
                      () =>
                        document
                          .getElementById("legacy-import")
                          ?.scrollIntoView({ behavior: "smooth" }),
                      80,
                    );
                  }}
                  onStartNew={() => {
                    setActiveTab("logbook");
                    window.setTimeout(() => {
                      // 입력 폼은 기본 접힘 — "새 기록 시작" 으로 왔을 때는 펼쳐서 보여준다
                      window.dispatchEvent(new CustomEvent("awos:open-new-entry"));
                      document
                        .getElementById("new-entry")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }, 80);
                  }}
                />
              </Reveal>
            </div>
          </section>
        )}
        <section className="bg-navy py-[clamp(24px,4vw,48px)]">
          <div className="mx-auto max-w-4xl px-6">
            <Reveal>
              <h2 className="font-display text-2xl font-extrabold text-white">
                총 비행시간 요약
                <InfoTip size="md" label="총 비행시간 계산 기준">
                  지금까지 등록한 비행 기록을 기준으로 범주·자격·조건별 누적 시간을 계산해요. 지금 보고 있는 구분의 기록만 포함돼요.
                </InfoTip>
              </h2>
              <div className="mt-6">
                <LogbookTotalsSummary
                  entries={trackEntries}
                  accountId={account?.id}
                  track={activeTrack}
                />
              </div>
            </Reveal>
          </div>
        </section>
        {/* 응시경력 진척도(경량·초경량)는 "응시경력" 탭(EligibilityTab)으로 이동 */}
        <section className="bg-panel py-[clamp(24px,4vw,48px)]">
          <div className="mx-auto max-w-4xl px-6">
            <Reveal>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-2xl font-extrabold text-ink">
                  내 비행 기록
                </h2>
                <div className="flex flex-col items-end gap-1">
                  <Button
                    variant="outline"
                    tone="neutral"
                    size="sm"
                    loading={isResyncing}
                    disabled={isResyncing || resyncCooldownSecondsLeft > 0}
                    onClick={handleResyncFromServer}
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    {!isResyncing && resyncCooldownSecondsLeft > 0
                      ? `서버와 다시 동기화 (${resyncCooldownSecondsLeft}초 후 다시 시도 가능)`
                      : "서버와 다시 동기화"}
                  </Button>
                  {resyncMessage && (
                    <p className="text-xs text-slate-400">{resyncMessage}</p>
                  )}
                </div>
              </div>
              <div className="mt-6">
                <EntryFilterBar
                  entries={trackEntries}
                  kind={filterKind}
                  value={filterValue}
                  onKindChange={setFilterKind}
                  onValueChange={setFilterValue}
                />
              </div>
              <div className="mt-6">
                <EntryList
                  entries={filteredEntries}
                  totalAccountEntryCount={trackEntries.length}
                  pendingSyncCount={pendingSyncCount}
                  onSelect={setSelectedEntry}
                  onDeleteMany={(ids) => {
                    cleanupSignatureRequestPosts(ids);
                    deleteEntries(ids);
                  }}
                  onDeleteAll={() => {
                    // 전체 삭제는 현재 트랙만 — 다른 트랙 기록은 보존
                    const ids = trackEntries.map((e) => e.id);
                    cleanupSignatureRequestPosts(ids);
                    if (trackEntries.length === entries.length) clearAll();
                    else deleteEntries(ids);
                  }}
                  onExportCsv={() =>
                    void downloadLogbookCsv(trackEntries).catch((err) =>
                      showToast(`CSV 저장 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`),
                    )
                  }
                  printLabel="비행경력증명서 PDF 저장"
                  onPrint={() => {
                    const holderName = account?.name;
                    const company =
                      String(
                        account?.data?.organization_affiliation ||
                          account?.data?.institution ||
                          "",
                      ) || undefined;
                    const run = isDrone
                      ? saveUltralightCertificatePdf(trackEntries, vehicles, {
                          name: holderName,
                          birthDate,
                          company,
                        })
                      : savePilotFlightExperienceCertificatePdf(trackEntries, {
                          name: holderName,
                          company,
                        });
                    showToast("PDF를 만드는 중이에요…");
                    void run
                      .then(() => showToast("PDF가 준비됐어요."))
                      .catch((err) =>
                        showToast(
                          `PDF 생성 실패: ${describeImportError(err)}`,
                        ),
                      );
                  }}
                />
              </div>
            </Reveal>
          </div>
        </section>
      </>
    </>
  );
}
