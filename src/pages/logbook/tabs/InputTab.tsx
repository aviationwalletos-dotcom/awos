// InputTab — LogbookPage 탭. 모델은 useLogbookPageModel 에서 받는다.
import React, { useEffect, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { Reveal } from "../../../components/Reveal";
import { EntryForm } from "../../../components/logbook/EntryForm";
import { LegacyImportSection } from "../../../components/logbook/LegacyImportSection";
import { UltralightEntryForm } from "../../../components/logbook/UltralightEntryForm";
import { VehicleCards } from "../../../components/logbook/VehicleCards";
import type { LogbookModel } from "../useLogbookPageModel";
import { sendEntrySignatureRequest } from "../../../lib/approvals/entrySignatureRequest";
import { isForeignRecord } from "../../../lib/foreignRecord";
import { toLogbookEntryInput } from "../../../lib/logbookEntryInput";
import { useOrganizationAffiliationOverride } from "../../../hooks/useOrganizationAffiliationOverride";

export function InputTab({ m }: { m: LogbookModel }) {
  const {
    account,
    updateEntry,
    activeTrack,
    addEntry,
    addVehicle,
    aircraftLabelProps,
    defaultEntryRole,
    deleteVehicle,
    entrySuggestions,
    handleImportLegacyEntries,
    hasPilotLicence,
    isDrone,
    showToast,
    vehicles,
  } = m;
  const { override: affiliationOverride } = useOrganizationAffiliationOverride(account);
  const myAffiliation = affiliationOverride ?? (account?.data?.organization_affiliation as string | undefined);
  // 입력 폼은 길어서 아래 "종이 로그북 가져오기"를 가린다 → 기본은 접어 두고 기록할 때 펼친다.
  // 접어도 폼은 그대로 두어(unmount 하지 않음) 적던 내용이 사라지지 않는다.
  const [isFormOpen, setIsFormOpen] = useState(false);
  useEffect(() => {
    const open = () => setIsFormOpen(true);
    window.addEventListener("awos:open-new-entry", open);
    return () => window.removeEventListener("awos:open-new-entry", open);
  }, []);
  return (
    <>
      <>
        <section
          id="new-entry"
          className="bg-surface py-[clamp(24px,4vw,48px)]"
        >
          <div className="mx-auto max-w-4xl px-6">
            <Reveal>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display text-2xl font-extrabold text-ink">
                  새 기록
                </h2>
                <button
                  type="button"
                  onClick={() => setIsFormOpen((v) => !v)}
                  aria-expanded={isFormOpen}
                  aria-controls="new-entry-form"
                  data-testid="new-entry-toggle"
                  className={`inline-flex min-h-[44px] items-center gap-2 rounded-control px-4 py-2 text-sm font-bold transition-colors
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky
                    ${isFormOpen ? "border border-white/15 text-slate-300 hover:bg-white/5" : "bg-brand text-white hover:bg-brand-hover"}`}
                >
                  {isFormOpen ? (
                    <>
                      <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      접기
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      기록 추가
                    </>
                  )}
                </button>
              </div>
              <div id="new-entry-form" hidden={!isFormOpen}>
              {isDrone && (
                <div className="mt-4">
                  <VehicleCards
                    vehicles={vehicles}
                    onAdd={addVehicle}
                    onDelete={deleteVehicle}
                  />
                </div>
              )}
              <div className="mt-4 rounded-card border border-white/10 bg-panel p-cardpad shadow-sm">
                {isDrone ? (
                  <UltralightEntryForm
                    mode="create"
                    vehicles={vehicles}
                    holderName={account?.name}
                    onSubmit={(input) => {
                      addEntry(input);
                      showToast("비행기록이 추가됐어요.");
                    }}
                  />
                ) : (
                  <EntryForm
                    mode="create"
                    onSubmit={(input, options) => {
                      const created = addEntry({
                        ...input,
                        vehicleClass: input.vehicleClass ?? activeTrack,
                      });
                      const target = options?.requestSignatureTo;
                      // 해외 기록은 국내 교관 서명 대상이 아니라 요청을 보내지 않는다
                      if (target && created && account && !isForeignRecord(created)) {
                        void sendEntrySignatureRequest(created, account, target, myAffiliation)
                          .then((req) => {
                            updateEntry(created.id, { ...toLogbookEntryInput(created), signatureRequestPostId: req.id });
                            showToast(`비행기록을 저장하고 ${target.name} 교관에게 서명 요청을 보냈어요.`);
                          })
                          .catch((err: unknown) => {
                            showToast(`기록은 저장됐지만 서명 요청은 실패했어요: ${err instanceof Error ? err.message : "다시 시도해 주세요"}`);
                          });
                        return;
                      }
                      showToast(
                        input.pilotCertification
                          ? "본인 서명과 함께 비행기록이 저장됐어요."
                          : "비행기록이 추가됐어요.",
                      );
                    }}
                    suggestions={entrySuggestions}
                    track={activeTrack}
                    defaultRole={defaultEntryRole}
                    hasLicence={hasPilotLicence}
                    {...aircraftLabelProps}
                  />
                )}
              </div>
              </div>
            </Reveal>
          </div>
        </section>
        <section className="bg-panel py-[clamp(24px,4vw,48px)]">
          <div className="mx-auto max-w-4xl px-6">
            <Reveal>
              <h2 className="font-display text-2xl font-extrabold text-ink">
                과거 기록 가져오기
              </h2>
              <div className="mt-6">
                <div id="legacy-import">
                  <LegacyImportSection
                    onAddEntries={handleImportLegacyEntries}
                  />
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </>
    </>
  );
}
