// CertificatesTab — LogbookPage 탭. 모델은 useLogbookPageModel 에서 받는다.
import React, { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Reveal } from "../../../components/Reveal";
import { CertificateApprovalStatusWatcher } from "../../../components/certificates/CertificateApprovalStatusWatcher";
import { CertificateForm } from "../../../components/certificates/CertificateForm";
import { CertificateList } from "../../../components/certificates/CertificateList";
import type { LogbookModel } from "../useLogbookPageModel";
import { InfoTip } from "../../../components/InfoTip";

export function CertificatesTab({ m }: { m: LogbookModel }) {
  const [isCertFormOpen, setIsCertFormOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<{ id: string; name: string; withPhoto: boolean } | null>(null);
  const {
    activeTrack,
    birthDate,
    certificates,
    handleCreateCertificate,
    isApprovedInstructor,
    operationType,
    roleContent,
    setSelectedCertificate,
    showToast,
    updateCertificate,
  } = m;
  return (
    <>
      <>
        <section className="bg-panel py-[clamp(24px,4vw,48px)]">
          <div className="mx-auto max-w-4xl px-6">
            <Reveal>
              {lastAdded && (
                <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-control border border-go/30 bg-go/10 px-4 py-3 text-sm text-go">
                  <span>
                    <span className="font-semibold">{lastAdded.name}</span> 등록됐어요.
                    {lastAdded.withPhoto ? " 관리자 인증 요청도 보냈어요 — 확인되면 카드에 \"인증됨\"이 붙어요." : " 사진을 첨부하면 관리자 인증을 받을 수 있어요."}
                  </span>
                  <button type="button" onClick={() => setLastAdded(null)} className="text-xs font-semibold underline underline-offset-2">닫기</button>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display text-2xl font-extrabold text-ink">
                  내 자격증 목록
                </h2>
                {/* 새 사용자가 등록 버튼을 못 찾던 문제 — 목록 제목 옆에서 바로 등록 폼으로(2026-09-07) */}
                <button
                  type="button"
                  data-testid={isCertFormOpen ? undefined : "cert-form-toggle"}
                  aria-expanded={isCertFormOpen}
                  aria-controls="cert-form"
                  onClick={() => {
                    setIsCertFormOpen(true);
                    window.setTimeout(
                      () => document.getElementById("cert-form")?.scrollIntoView({ behavior: "smooth", block: "start" }),
                      60,
                    );
                  }}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-control bg-brand px-3 text-sm font-bold text-white hover:bg-brand-hover
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  자격증 등록
                </button>
              </div>
              {certificates.some(
                (c) =>
                  c.category === "조종교육증명" || c.name.includes("교육증명"),
              ) &&
                !isApprovedInstructor && (
                  <div className="mt-4 rounded-card border border-sky/30 bg-sky/5 p-4 text-sm text-slate-300">
                    조종교육증명을 보유하고 계시네요.{" "}
                    <span className="font-semibold text-ink">교관 승인</span>을
                    받으면 학생들의 서명 요청이 들어오는{" "}
                    <span className="font-semibold text-ink">서명요청함</span>이
                    열립니다.{" "}
                    <Link
                      to="/account"
                      className="font-semibold text-sky underline underline-offset-2"
                    >
                      계정정보에서 교관 승인 신청하기 →
                    </Link>
                  </div>
                )}
              <div className="mt-6">
                <CertificateList
                  highlightId={lastAdded?.id}
                  certificates={certificates}
                  onSelect={setSelectedCertificate}
                  accentHoverBorderClass={roleContent?.hoverBorderClass}
                />
              </div>
              <CertificateApprovalStatusWatcher
                certificates={certificates}
                onUpdate={updateCertificate}
              />
            </Reveal>
          </div>
        </section>
        <section className="bg-surface py-[clamp(24px,4vw,48px)]">
          <div className="mx-auto max-w-4xl px-6">
            <Reveal>
              {/* 역할별 "자격 템플릿" 안내 카드는 정보량이 적어 제거(2026-09-05). TS 연동 카드는 폼 아래로(2026-09-07). */}
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="flex items-center gap-1.5 font-display text-2xl font-extrabold text-ink">
                  자격증 · 한정 등록
                  <InfoTip size="md" label="자격증 · 한정 등록 안내">
                    자격증명·한정·계기·교관·신체검사·항공영어 등을 등록하면 만료가 가까워질 때 카드에 경고가 떠요. 자격증 사진 한 장을 올리면 AI 가 한정사항까지 읽어 같이 등록할 수 있어요. 관리자 인증을 받으면 "인증됨" 표시가 붙어요.
                  </InfoTip>
                </h2>
                {/* 등록 버튼은 목록 제목 옆 하나뿐. 여기선 펼쳐진 폼을 접는 버튼만 보인다(중복 버튼 제거, 2026-09-09) */}
                {isCertFormOpen && (
                  <button
                    type="button"
                    onClick={() => setIsCertFormOpen(false)}
                    aria-expanded={isCertFormOpen}
                    aria-controls="cert-form"
                    data-testid="cert-form-toggle"
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-control border border-white/15 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-white/5
                      focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                  >
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    접기
                  </button>
                )}
              </div>
              <div id="cert-form" hidden={!isCertFormOpen} className="mt-6 rounded-card border border-white/10 bg-panel p-cardpad shadow-sm">
                <CertificateForm
                  mode="create"
                  onSubmit={(input, options) => {
                    // 등록 뒤 폼이 비워져 "정보가 사라진 것처럼" 보이던 문제(지훈 피드백):
                    // 폼을 접고, 새 카드로 스크롤·강조하고, 인증 대기 안내 배너를 남긴다
                    const extras = options?.extras ?? [];
                    void handleCreateCertificate(
                      { ...input, track: input.track ?? activeTrack },
                      options?.approvalFile,
                    ).then(async (created) => {
                      if (!created) return;
                      // 자격증 사진 한 장에서 같이 찾은 한정·계기·교관·항공영어도 같은 사진으로 각각 등록·인증 요청해요.
                      // '한정'은 방금 만든 자격증명에 붙여서 카드 안에 같이 보이게 해요.
                      for (const extra of extras) {
                        await handleCreateCertificate(
                          {
                            ...extra,
                            track: extra.track ?? activeTrack,
                            linkedCertificateId: extra.category === "한정" ? created.id : extra.linkedCertificateId,
                          },
                          options?.approvalFile,
                        );
                      }
                      setIsCertFormOpen(false);
                      setLastAdded({ id: created.id, name: created.name, withPhoto: Boolean(options?.approvalFile) });
                      window.setTimeout(() => {
                        document.getElementById(`cert-item-${created.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }, 120);
                    });
                    showToast(extras.length > 0 ? `자격증 ${extras.length + 1}개가 추가됐어요.` : "자격증이 추가됐어요.");
                  }}
                  roleTemplate={roleContent}
                  track={activeTrack}
                  birthDate={birthDate}
                  commercialSinglePilot={operationType === "commercial"}
                  existingCertificates={certificates}
                />
              </div>
              {/* TS 연동 카드는 뺐어요(2026-09-10). 공단과 협의된 게 없는데 "연동 준비 중"이라고 쓰면 공단 이름을 앞세운 것처럼 보여요.
                  K-EPL 생성원 협의가 진행되면 그때 정확한 문구로 다시 넣어요. 컴포넌트는 남겨 둠. */}
            </Reveal>
          </div>
        </section>
      </>
    </>
  );
}
