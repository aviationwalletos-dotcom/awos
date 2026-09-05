// InputTab — LogbookPage 탭. 모델은 useLogbookPageModel 에서 받는다.
import React, { useEffect, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { Reveal } from "../../../components/Reveal";
import { EntryForm } from "../../../components/logbook/EntryForm";
import { LegacyImportSection } from "../../../components/logbook/LegacyImportSection";
import { UltralightEntryForm } from "../../../components/logbook/UltralightEntryForm";
import { VehicleCards } from "../../../components/logbook/VehicleCards";
import type { LogbookModel } from "../useLogbookPageModel";

export function InputTab({ m }: { m: LogbookModel }) {
  const {
    account,
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-2xl font-extrabold text-ink">
                  새 비행 기록 추가
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
                      기록 추가하기
                    </>
                  )}
                </button>
              </div>
              {!isFormOpen && (
                <p className="mt-2 text-sm text-slate-400">
                  비행을 마쳤다면 "기록 추가하기"를 눌러 입력 폼을 펼치세요. 과거 기록을 옮겨오려면 아래 "종이 로그북 기록 가져오기"를 이용하세요.
                </p>
              )}
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
                      showToast("비행기록이 추가되었습니다.");
                    }}
                  />
                ) : (
                  <EntryForm
                    mode="create"
                    onSubmit={(input) => {
                      addEntry({
                        ...input,
                        vehicleClass: input.vehicleClass ?? activeTrack,
                      });
                      showToast(
                        input.pilotCertification
                          ? "본인 서명과 함께 비행기록이 저장되었습니다."
                          : "비행기록이 추가되었습니다.",
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
                종이 로그북 기록 가져오기
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                기존에 종이 로그북(탈론 로그 등)이나 개인 엑셀 파일로 관리하던
                과거 비행 기록을 이 앱으로 옮겨올 수 있습니다.
              </p>
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
