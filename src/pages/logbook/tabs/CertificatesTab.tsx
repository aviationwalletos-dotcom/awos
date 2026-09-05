// CertificatesTab — LogbookPage 탭. 모델은 useLogbookPageModel 에서 받는다.
import React from "react";
import { Link } from "react-router-dom";
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
              {/* 역할별 "자격 템플릿" 안내 카드는 정보량이 적어 제거(2026-09-05). 역할 색상은 등록 폼 칩에 그대로 쓰인다. */}
              <TsIntegrationCard />
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
