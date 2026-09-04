// CurrencyTab — LogbookPage 탭. 모델은 useLogbookPageModel 에서 받는다.
import React from "react";
import { Reveal } from "../../../components/Reveal";
import { CurrencyDashboard } from "../../../components/currency/CurrencyDashboard";
import type { LogbookModel } from "../useLogbookPageModel";

export function CurrencyTab({ m }: { m: LogbookModel }) {
  const { account, certificates, isApprovedInstructor, trackEntries } = m;
  return (
    <>
      <section className="bg-surface py-[clamp(24px,4vw,48px)]">
        <div className="mx-auto max-w-4xl px-6">
          <Reveal>
            <h2 className="font-display text-2xl font-extrabold text-ink">
              커런시 현황
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              '기록 입력·가져오기' 탭에 입력한 이착륙·계기접근·비행교관 시간을
              바탕으로 최근 비행경험·계기비행 경험·조종교육 비행경험 유지 상태를
              계산합니다.
            </p>
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
