// SignatureInboxTab — LogbookPage 탭. 모델은 useLogbookPageModel 에서 받는다.
import React from "react";
import { Reveal } from "../../../components/Reveal";
import { InstructorSignatureInboxSection } from "../../../components/account/InstructorSignatureInboxSection";
import type { LogbookModel } from "../useLogbookPageModel";

export function SignatureInboxTab({ m }: { m: LogbookModel }) {
  const { account, signerInstructorCurrencyMet, activeTrack, setActiveTrack } = m;
  return (
    <>
      <section className="bg-navy-dark py-[clamp(24px,4vw,48px)]">
        <div className="mx-auto max-w-4xl px-6">
          <Reveal>
            {account && (
              <InstructorSignatureInboxSection
                account={account}
                instructorCurrencyMet={signerInstructorCurrencyMet}
                track={activeTrack}
                onSwitchTrack={setActiveTrack}
              />
            )}
          </Reveal>
        </div>
      </section>
    </>
  );
}
