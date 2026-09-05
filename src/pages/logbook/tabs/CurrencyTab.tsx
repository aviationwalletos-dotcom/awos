// CurrencyTab — LogbookPage 탭. 모델은 useLogbookPageModel 에서 받는다.
import React from "react";
import { Reveal } from "../../../components/Reveal";
import { CurrencyDashboard } from "../../../components/currency/CurrencyDashboard";
import type { LogbookModel } from "../useLogbookPageModel";
import { InfoTip } from "../../../components/InfoTip";

export function CurrencyTab({ m }: { m: LogbookModel }) {
  const { account, certificates, isApprovedInstructor, trackEntries } = m;
  return (
    <>
      <section className="bg-surface py-[clamp(24px,4vw,48px)]">
        <div className="mx-auto max-w-4xl px-6">
          <Reveal>
            <h2 className="flex items-center gap-1.5 font-display text-2xl font-extrabold text-ink">
              커런시 현황
              <InfoTip size="md" label="커런시 계산 기준">
                입력한 이착륙·계기접근·교관 시간을 바탕으로 최근 비행경험(운항기술기준 8.2.2)·계기비행 경험(8.2.3)·조종교육 경험(규칙 제125조) 유지 상태를 계산해요.
              </InfoTip>
            </h2>
            <div className="mt-6">
              <CurrencyDashboard
                entries={trackEntries}
                account={account}
                certificates={certificates}
                isApprovedInstructor={isApprovedInstructor}
              />
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
