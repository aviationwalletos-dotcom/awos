// WorkLogTab — LogbookPage 탭. 모델은 useLogbookPageModel 에서 받는다.
import React from "react";
import { Reveal } from "../../../components/Reveal";
import { WorkLogForm } from "../../../components/worklog/WorkLogForm";
import { WorkLogList } from "../../../components/worklog/WorkLogList";
import { ComplianceSection } from "../../../components/compliance/ComplianceSection";
import type { LogbookModel } from "../useLogbookPageModel";

export function WorkLogTab({ m }: { m: LogbookModel }) {
  const {
    addWorkLogEntry,
    setSelectedWorkLogEntry,
    workLogComplianceItems,
    workLogComplianceTitle,
    workLogCopy,
    workLogEntries,
  } = m;
  return (
    <>
      <>
        <section className="bg-panel py-[clamp(24px,4vw,48px)]">
          <div className="mx-auto max-w-4xl px-6">
            <Reveal>
              <ComplianceSection
                title={workLogComplianceTitle}
                description="아래 항목은 등록한 자격증·업무기록을 바탕으로 자동 계산한 참고 정보여요."
                items={workLogComplianceItems}
              />
            </Reveal>
          </div>
        </section>
        <section className="bg-surface py-[clamp(24px,4vw,48px)]">
          <div className="mx-auto max-w-4xl px-6">
            <Reveal>
              <h2 className="font-display text-2xl font-extrabold text-ink">
                {workLogCopy.formTitle}
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                {workLogCopy.formDesc}
              </p>
              <div className="mt-6 rounded-card border border-white/10 bg-panel p-cardpad shadow-sm">
                <WorkLogForm
                  mode="create"
                  copy={workLogCopy}
                  onSubmit={(input) => addWorkLogEntry(input)}
                />
              </div>
            </Reveal>
          </div>
        </section>
        <section className="bg-panel py-[clamp(24px,4vw,48px)]">
          <div className="mx-auto max-w-4xl px-6">
            <Reveal>
              <h2 className="font-display text-2xl font-extrabold text-ink">
                {workLogCopy.listTitle}
              </h2>
              <div className="mt-6">
                <WorkLogList
                  entries={workLogEntries}
                  copy={workLogCopy}
                  onSelect={setSelectedWorkLogEntry}
                />
              </div>
            </Reveal>
          </div>
        </section>
      </>
    </>
  );
}
