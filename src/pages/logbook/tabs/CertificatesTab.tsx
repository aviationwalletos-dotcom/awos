// CertificatesTab — LogbookPage 탭. 모델은 useLogbookPageModel 에서 받는다.
import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Reveal } from "../../../components/Reveal";
import { CertificateApprovalStatusWatcher } from "../../../components/certificates/CertificateApprovalStatusWatcher";
import { CertificateForm } from "../../../components/certificates/CertificateForm";
import { TsIntegrationCard } from "../../../components/certificates/TsIntegrationCard";
import { CertificateList } from "../../../components/certificates/CertificateList";
import type { LogbookModel } from "../useLogbookPageModel";

export function CertificatesTab({ m }: { m: LogbookModel }) {
  const {
    activeTrack,
    birthDate,
    certificates,
    handleCreateCertificate,
    isApprovedInstructor,
    isPilotLike,
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
              <h2 className="font-display text-2xl font-extrabold text-ink">
                내 자격증 목록
              </h2>
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
              <div
                className={`flex items-start gap-3 rounded-card border p-5 ${
                  roleContent
                    ? `${roleContent.borderClass} ${roleContent.bgClass}`
                    : "border-sky/30 bg-sky/10"
                }`}
              >
                <ShieldCheck
                  className={`mt-0.5 h-5 w-5 shrink-0 ${roleContent ? roleContent.colorClass : "text-sky"}`}
                  aria-hidden="true"
                />
                <div>
                  <p
                    className={`text-xs font-semibold uppercase tracking-wide ${roleContent ? roleContent.colorClass : "text-sky"}`}
                  >
                    {roleContent
                      ? `${roleContent.name} 자격 템플릿`
                      : "자격증 관리"}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {roleContent
                      ? roleContent.summary
                      : "면허, 항공신체검사, 법정교육 등 자격 항목을 자유롭게 등록하고 관리하세요. 역할을 설정하면 역할별 추천 자격 템플릿과 강조 색상이 표시됩니다."}
                  </p>
                  {!isPilotLike && (
                    <p className="mt-2 text-xs text-slate-400">
                      만료일이 등록된 자격증은 D-30/D-7 기준으로 카드에 경고
                      배지가 표시됩니다. 이 직군의 구체적인 법정 갱신 주기는
                      아직 제공되지 않아, 등록한 자격증의 만료 알림으로 갱신
                      시점을 관리해 주세요.
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-8">
                <TsIntegrationCard />
              </div>
              <h2 className="mt-8 font-display text-2xl font-extrabold text-ink">
                자격증 등록
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                면허, 항공신체검사, 법정교육 등 자격 항목을 등록하면 만료 임박
                시 카드에 경고 배지가 표시됩니다.
              </p>
              <div className="mt-6 rounded-card border border-white/10 bg-panel p-cardpad shadow-sm">
                <CertificateForm
                  mode="create"
                  onSubmit={(input, options) => {
                    void handleCreateCertificate(
                      { ...input, track: input.track ?? activeTrack },
                      options?.approvalFile,
                    );
                    showToast("자격증이 추가되었습니다.");
                  }}
                  roleTemplate={roleContent}
                  track={activeTrack}
                  birthDate={birthDate}
                  commercialSinglePilot={operationType === "commercial"}
                  existingCertificates={certificates}
                />
              </div>
            </Reveal>
          </div>
        </section>
      </>
    </>
  );
}
