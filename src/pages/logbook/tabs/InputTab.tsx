// InputTab — LogbookPage 탭. 모델은 useLogbookPageModel 에서 받는다.
import React from "react";
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
  return (
    <>
      <>
        <section
          id="new-entry"
          className="bg-surface py-[clamp(24px,4vw,48px)]"
        >
          <div className="mx-auto max-w-4xl px-6">
            <Reveal>
              <h2 className="font-display text-2xl font-extrabold text-ink">
                새 비행 기록 추가
              </h2>
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
