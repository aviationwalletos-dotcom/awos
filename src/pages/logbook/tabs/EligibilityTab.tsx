// EligibilityTab — 경량·초경량 트랙 전용 "응시경력" 탭. 모델은 useLogbookPageModel 에서 받는다.
// (예전엔 비행기록 탭 아래에 붙어 있어 길었다 → 2026-09-05 별도 탭으로 분리)
import React from "react";
import { Reveal } from "../../../components/Reveal";
import { Collapsible } from "../../../components/Collapsible";
import { ComplianceSection } from "../../../components/compliance/ComplianceSection";
import { EligibilityProgressPanel } from "../../../components/logbook/EligibilityProgressPanel";
import { NextGoalCard } from "../../../components/logbook/NextGoalCard";
import type { LogbookModel } from "../useLogbookPageModel";

export function EligibilityTab({ m }: { m: LogbookModel }) {
  const {
    activeTrack,
    certificates,
    droneComplianceItems,
    isLsa,
    lsaComplianceItems,
    trackEntries,
    vehicles,
  } = m;
  return (
    <section id="elig-section" className="bg-panel py-[clamp(24px,4vw,48px)]">
      <div className="mx-auto max-w-4xl px-6">
        <Reveal>
          <h2 className="font-display text-2xl font-extrabold text-white">
            응시경력 진척도
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            {isLsa
              ? "시행규칙 별표 4 제2호"
              : "초경량비행장치·무인비행장치 조종자 증명 운영세칙 별표 1·2·3"}{" "}
            기준으로 자격증명 → 지도조종자 → 실기평가조종자 순서의 요건을
            계산해요. 참고 판정이며 최종 응시자격은 공단이 심사합니다.
          </p>
          <div className="mt-6">
            <NextGoalCard
              track={activeTrack}
              entries={trackEntries}
              certificates={certificates}
              vehicles={vehicles}
            />
          </div>
          <EligibilityProgressPanel
            track={activeTrack}
            entries={trackEntries}
            certificates={certificates}
            vehicles={vehicles}
            title="전체 요건 보기"
          />
          <Collapsible
            id="elig-guide"
            className="mt-2"
            title={isLsa ? "응시경력 안내/현황" : "법정 요건 안내/현황"}
            summary={
              <span className="text-slate-400">
                {isLsa ? "별표 4 제2호" : "운영세칙 · 제124조 · 제127조"}
              </span>
            }
          >
            <ComplianceSection
              title={
                isLsa
                  ? "경량항공기 조종사 응시경력 안내/현황"
                  : "초경량비행장치 조종자 법정 요건 안내/현황"
              }
              description={
                isLsa
                  ? "별표 4 제2호 항목별 안내. 위 진척도와 같은 기록으로 계산한 참고 정보입니다."
                  : "초경량 구분의 비행기록만으로 계산한 참고 정보입니다. 항공기·경량항공기 기록은 섞이지 않습니다."
              }
              items={isLsa ? lsaComplianceItems : droneComplianceItems}
            />
          </Collapsible>
        </Reveal>
      </div>
    </section>
  );
}
