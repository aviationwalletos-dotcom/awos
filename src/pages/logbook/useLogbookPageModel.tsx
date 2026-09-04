// LogbookPage 상태·핸들러 모델 — 화면(탭 컴포넌트)과 분리. v1.1 리팩터링(파일 분할).
import type React from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ClipboardList,
  Gauge,
  Inbox,
  ListChecks,
  PlaneTakeoff,
  Radar,
  Radio,
  ShieldCheck,
} from "lucide-react";
import { buildEntrySuggestions } from "../../components/logbook/EntryForm";
import { matchesFilter } from "../../components/logbook/EntryFilterBar";
import {
  computeAtcCompliance,
  computeDispatcherCompliance,
  computeLsaCompliance,
  computeMechanicCompliance,
  computeUltralightCompliance,
} from "../../lib/roleCompliance";
import { useCreateCertificateApprovalPost } from "../../hooks/baas/useCreateCertificateApprovalPost";
import { useUploadBoardFile } from "../../hooks/baas/useUploadBoardFile";
import {
  buildCertificateApprovalContent,
  buildCertificateApprovalTitle,
} from "../../lib/certificateApproval";
import { useLogbookEntries } from "../../hooks/useLogbookEntries";
import { useCertificates } from "../../hooks/useCertificates";
import { useWorkLogEntries } from "../../hooks/useWorkLogEntries";
import { useIndividualRoleOverride } from "../../hooks/useIndividualRoleOverride";
import { useInstructorApprovalStatus } from "../../hooks/baas/useInstructorApprovalStatus";
import { useDeleteBoardPost } from "../../hooks/baas/useDeleteBoardPost";
import { useAuth } from "../../contexts/AuthContext";
import { INDIVIDUAL_ROLE_LABEL } from "../../lib/baas/types";
import type { IndividualRole } from "../../lib/baas/types";
import { usePilotTracks } from "../../hooks/usePilotTracks";
import { useVehicles } from "../../hooks/useVehicles";
import { useToast } from "../../components/Toast";
import { computeFlightReadiness } from "../../lib/flightReadiness";
import { useCurrencyOverrides } from "../../hooks/useCurrencyOverrides";
import { useConfirm } from "../../components/ConfirmDialog";
import {
  countUntaggedEntries,
  entryTrack,
  filterEntriesByTrack,
} from "../../lib/tracks";
import { getRoleContentByIndividualRole } from "../../data/content";
import { WORK_LOG_ROLE_COPY } from "../../types/workLog";
import type { WorkLogEntry, WorkLogRole } from "../../types/workLog";
import type {
  LogbookEntry,
  LogbookEntryInput,
  LogbookFilterKind,
} from "../../types/logbook";
import type { Certificate, CertificateInput } from "../../types/certificate";

export type TabKey =
  | "myRecords"
  | "certificates"
  | "currency"
  | "logbook"
  | "signatureInbox"
  | "workLog";

export type TabDef = {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

// 조종사(및 역할 미설정 계정 폴백)용 기본 탭 구성. 절대 변경하지 않습니다.
export const PILOT_TABS: TabDef[] = [
  { key: "myRecords", label: "비행기록", icon: ListChecks },
  { key: "logbook", label: "기록 입력·가져오기", icon: PlaneTakeoff },
  { key: "certificates", label: "자격증", icon: ShieldCheck },
  { key: "currency", label: "커런시", icon: Gauge },
];

export const SIGNATURE_INBOX_TAB: TabDef = {
  key: "signatureInbox",
  label: "서명 요청함",
  icon: Inbox,
};

// 초경량 조종자용 탭 구성: 비행기록 구조는 재사용하되 커런시/실시간 적합성 등 조종사 전용 개념은 제외합니다.
export const DRONE_TABS: TabDef[] = [
  { key: "myRecords", label: "비행기록", icon: ListChecks },
  { key: "logbook", label: "기록 입력·가져오기", icon: PlaneTakeoff },
  { key: "certificates", label: "자격증", icon: ShieldCheck },
];

// v1.1 — 경량항공기 조종사용 탭. 야간비행 금지(규칙 제311조)라 커런시 탭은 두지 않는다(응시경력은 비행기록 탭에서).
export const LSA_TABS: TabDef[] = DRONE_TABS;

export const WORK_LOG_TAB_ICON: Record<WorkLogRole, TabDef["icon"]> = {
  mechanic: ClipboardList,
  atc: Radar,
  dispatcher: Radio,
};

export const WORK_LOG_ROLES: WorkLogRole[] = ["mechanic", "atc", "dispatcher"];

// 엑셀 대량 가져오기 시 한 번에 처리할 배치 크기(BUG-020). 너무 크면 여전히 요청이 몰리고,
// 너무 작으면 배치 수가 늘어나 전체 완료까지 시간이 길어지므로 적당한 값으로 고정한다.
export const LEGACY_IMPORT_BATCH_SIZE = 8;

// "서버와 다시 동기화" 버튼 연속 클릭 방지용 쿨다운(짧은 시간에 여러 번 눌러 로그북/자격증/업무기록
// resyncFromServer + retryPendingSync 배치 요청이 한꺼번에 몰리는 것을 막기 위한 최소한의 프론트엔드 방어).
export const RESYNC_COOLDOWN_MS = 10000;

export const WORK_LOG_COMPLIANCE_TITLE: Record<WorkLogRole, string> = {
  mechanic: "정비사 법정 요건 안내/현황",
  atc: "관제사 법정 요건 안내/현황",
  dispatcher: "운항관리사 법정 요건 안내/현황",
};

export function isWorkLogRole(
  role: IndividualRole | undefined,
): role is WorkLogRole {
  return Boolean(role) && (WORK_LOG_ROLES as string[]).includes(role as string);
}

export function useLogbookPageModel() {
  const { account, userType } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("myRecords");

  const { override: roleOverride } = useIndividualRoleOverride(account);
  const accountIndividualRole = account?.data?.individual_role as
    IndividualRole | undefined;
  const individualRole = roleOverride ?? accountIndividualRole;
  const individualRoleLabel = individualRole
    ? INDIVIDUAL_ROLE_LABEL[individualRole]
    : null;
  const roleContent = useMemo(
    () => getRoleContentByIndividualRole(individualRole),
    [individualRole],
  );

  // v1.1 — 보유 트랙(복수) + 지금 보고 있는 트랙. 모든 집계·커런시·덱은 activeTrack 기준으로만 계산한다.
  const {
    tracks: pilotTracks,
    activeTrack,
    setActiveTrack,
    birthDate,
    operationType,
  } = usePilotTracks(account);
  const { vehicles, addVehicle, deleteVehicle } = useVehicles(account);
  const { toast, showToast } = useToast();

  // 로컬 저장(오프라인 사본) 실패 알림 — 서버에는 저장되지만 이 브라우저 용량이 찼을 때
  useEffect(() => {
    const onFail = () =>
      showToast(
        "브라우저 저장 공간이 부족해 오프라인 사본을 갱신하지 못했어요. 서버에는 저장됩니다.",
      );
    window.addEventListener("awos:local-storage-failed", onFail);
    return () =>
      window.removeEventListener("awos:local-storage-failed", onFail);
  }, [showToast]);
  const confirm = useConfirm();

  // 탭바는 상단 헤더 바로 아래에 붙는다. 헤더 높이를 실측해 반영(고정값 121px이 중간에 떠 보이던 문제).
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(57);
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const update = () => setHeaderHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 비조종 직군(관제사·정비사·운항관리사)은 트랙과 무관하게 업무기록 화면을 쓴다.
  const workLogRole = isWorkLogRole(individualRole)
    ? individualRole
    : undefined;
  const workLogCopy = workLogRole ? WORK_LOG_ROLE_COPY[workLogRole] : undefined;
  // 조종사 전용 개념(항공신체검사/커런시/실시간 비행 적합성/승무시간 한도/교관 서명 요청함)은 항공기 트랙에서만.
  const isPilotLike = !workLogRole && activeTrack === "aircraft";
  const isLsa = !workLogRole && activeTrack === "lsa";
  const isDrone = !workLogRole && activeTrack === "ultralight";

  const { isApproved: isApprovedInstructor } = useInstructorApprovalStatus(
    userType === "individual" ? (account ?? null) : null,
  );

  const TABS: TabDef[] = useMemo(() => {
    if (workLogRole && workLogCopy) {
      return [
        {
          key: "workLog",
          label: workLogCopy.tabLabel,
          icon: WORK_LOG_TAB_ICON[workLogRole],
        },
        { key: "certificates", label: "자격증", icon: ShieldCheck },
      ];
    }
    if (isDrone) {
      return DRONE_TABS;
    }
    if (isLsa) {
      return LSA_TABS;
    }
    return isApprovedInstructor
      ? [...PILOT_TABS, SIGNATURE_INBOX_TAB]
      : PILOT_TABS;
  }, [workLogRole, workLogCopy, isDrone, isLsa, isApprovedInstructor]);

  // 역할/승인 상태가 바뀌어 현재 선택된 탭이 더 이상 목록에 없으면, 목록의 첫 번째 탭으로 되돌린다.
  useEffect(() => {
    if (!TABS.some((t) => t.key === activeTab)) {
      setActiveTab(TABS[0]?.key ?? "myRecords");
    }
  }, [activeTab, TABS]);

  const {
    entries,
    addEntry,
    updateEntry,
    deleteEntry,
    deleteEntries,
    clearAll,
    resyncFromServer: resyncLogbookEntries,
    retryPendingSync: retryLogbookPendingSync,
  } = useLogbookEntries(account);

  // v1.1 — 현재 트랙의 기록만. 이것이 버그 수정의 핵심이다: 드론 트랙에서 C172·DA42 시간이 섞이지 않는다.
  const trackEntries = useMemo(
    () => filterEntriesByTrack(entries, activeTrack),
    [entries, activeTrack],
  );
  const untaggedCount = useMemo(() => countUntaggedEntries(entries), [entries]);
  const entrySuggestions = useMemo(
    () => buildEntrySuggestions(trackEntries),
    [trackEntries],
  );

  // 덱 상단 표기용 총 비행시간(LogbookTotalsSummary와 같은 기준: 미인증 비행경력증명서 기록 제외)
  const trackTotalHours = useMemo(
    () =>
      trackEntries
        .filter(
          (e) =>
            !(
              e.origin === "flight_experience_certificate" &&
              e.certificateApprovalStatus !== "confirmed"
            ),
        )
        .reduce((sum, e) => sum + (e.blockTime || 0), 0),
    [trackEntries],
  );
  const { uploadFile } = useUploadBoardFile();
  const { createCertificateApprovalPost } = useCreateCertificateApprovalPost();

  /** 자격증 등록 → 사진 업로드 → 관리자 인증 요청 게시글 생성 → 요청 id를 카드에 기록 */
  async function handleCreateCertificate(
    input: CertificateInput,
    approvalFile?: File,
  ) {
    const created = addCertificate({ ...input, approvalStatus: "pending" });
    if (!created) return;
    try {
      let fileIds: number[] | undefined;
      if (approvalFile) {
        const uploaded = await uploadFile(approvalFile, {
          filename: approvalFile.name,
          contentType: approvalFile.type || "image/jpeg",
        });
        fileIds = [uploaded.fileId];
      }
      const post = await createCertificateApprovalPost({
        title: buildCertificateApprovalTitle({
          category: created.category,
          certId: created.id,
          userName: account?.name || account?.user_id || "사용자",
          userId: account?.user_id || "",
          affiliation: account?.data?.organization_affiliation || undefined,
        }),
        content: buildCertificateApprovalContent(created),
        ...(fileIds ? { file_ids: fileIds } : {}),
      });
      const {
        id: _id,
        createdAt: _c,
        updatedAt: _u,
        syncPostId: _s,
        ...rest
      } = created;
      updateCertificate(created.id, {
        ...rest,
        approvalStatus: "pending",
        approvalRequestPostId: post.id,
      });
    } catch (err) {
      console.warn("[자격증 인증 요청 실패]", err);
    }
  }
  const [filterKind, setFilterKind] = useState<LogbookFilterKind>("all");
  const [filterValue, setFilterValue] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<LogbookEntry | null>(null);

  // EntryDetailDialog와 AutoSyncEntryDecisions(다이얼로그 밖 백그라운드 watcher, BUG-015)가
  // 공유하는 갱신 핸들러. 현재 열려있는 상세 다이얼로그가 갱신된 기록과 같으면 그 화면도 함께 갱신한다.
  const handleUpdateEntry = useCallback(
    (id: string, input: LogbookEntryInput) => {
      updateEntry(id, input);
      setSelectedEntry((prev) =>
        prev && prev.id === id
          ? { ...prev, ...input, updatedAt: Date.now() }
          : prev,
      );
    },
    [updateEntry],
  );

  // v1.1 — 자격 구분이 없는 예전 기록을 현재 추정값 그대로 명시 저장한다(추정 배너 해소).
  const confirmInferredEntries = useCallback(async () => {
    const targets = entries.filter((e) => !e.vehicleClass);
    if (targets.length === 0) return;
    const ok = await confirm({
      title: "자동 분류 확정",
      message: `예전 기록 ${targets.length}건의 자격 구분을 기종명 기준 자동 분류대로 확정할까요?\n나중에 기록을 열어 바꿀 수 있어요.`,
      confirmLabel: "확정",
    });
    if (!ok) return;
    for (const e of targets) {
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = e;
      updateEntry(e.id, { ...rest, vehicleClass: entryTrack(e) });
    }
  }, [entries, updateEntry, confirm]);

  // 엑셀 대량 가져오기 시 동시 요청 폭주 완화(BUG-020, BUG-014/BUG-019 후속): 수십~수백 건을 한꺼번에
  // addEntry로 넘기면 그만큼의 서버 게시글 생성 요청이 거의 동시에 나가, 일부가 네트워크 과부하/일시적
  // 오류로 실패하면 그 기록들은 로컬에만 남고 서버에는 존재하지 않게 되어 다른 기기에서 받아올 수 없다.
  // addEntry 자체는 그대로 두고(로컬 즉시 반영 + 내부 best-effort 서버 생성), 호출하는 쪽만 작은
  // 배치 단위로 나눠 순차 처리하도록 개선한다.
  const handleImportLegacyEntries = useCallback(
    (inputs: LogbookEntryInput[]) => {
      void (async () => {
        for (let i = 0; i < inputs.length; i += LEGACY_IMPORT_BATCH_SIZE) {
          const batch = inputs.slice(i, i + LEGACY_IMPORT_BATCH_SIZE);
          // 배치 단위로 addEntry 호출이 모두 처리된 뒤에만 다음 배치로 넘어가, 동시에 나가는
          // 서버 생성 요청 수를 배치 크기로 제한한다.
          await Promise.allSettled(
            batch.map((input) =>
              Promise.resolve().then(() =>
                addEntry({
                  ...input,
                  vehicleClass: input.vehicleClass ?? activeTrack,
                }),
              ),
            ),
          );
        }
      })();
    },
    [addEntry, activeTrack],
  );

  // 비행기록이 삭제되면, 그 기록에 연결된 "서명 요청" 게시판 게시글도 함께 정리한다(교관 서명
  // 완료 여부와 무관 — signatureRequestPostId가 남아있으면 정리 대상). 로컬 기록 삭제는 게시글
  // 삭제 성공 여부와 무관하게 항상 진행되어야 하므로, best-effort로 병렬 삭제만 시도하고 실패는
  // 조용히 콘솔 경고로만 남긴다(이미 삭제됨/네트워크 오류 등으로 실패해도 사용자 삭제 흐름을 막지 않음).
  const { deletePost } = useDeleteBoardPost();
  function cleanupSignatureRequestPosts(entryIds: string[]) {
    const postIds = entries
      .filter((e) => entryIds.includes(e.id) && e.signatureRequestPostId)
      .map((e) => e.signatureRequestPostId as string);
    if (postIds.length === 0) return;

    void Promise.allSettled(postIds.map((postId) => deletePost(postId))).then(
      (results) => {
        const failedCount = results.filter(
          (result) => result.status === "rejected",
        ).length;
        if (failedCount > 0) {
          console.warn(
            `[LogbookPage] 서명 요청 게시글 ${failedCount}건 삭제에 실패했습니다(이미 삭제되었거나 네트워크 오류일 수 있음). 로컬 비행 기록 삭제는 정상 진행되었습니다.`,
          );
        }
      },
    );
  }

  const {
    certificates,
    addCertificate,
    updateCertificate,
    deleteCertificate,
    resyncFromServer: resyncCertificates,
    retryPendingSync: retryCertificatesPendingSync,
  } = useCertificates(account);

  // "이 비행에서 나의 역할" 기본값 — 승인 교관이면 교관, 조종사 자격증명이 있으면 기장, 없으면 학생
  // 규칙: 승인 교관 → 교관 / 그 외 → 학생(자격 보유 여부는 hasLicence로 자동채움 규칙만 가른다). 일반 비행은 직접 "기장"을 고른다.
  const hasPilotLicence = useMemo(
    () =>
      certificates.some(
        (c) =>
          c.category === "조종사 자격증명" ||
          c.category === "경량항공기 조종사 자격증명",
      ),
    [certificates],
  );
  const defaultEntryRole = useMemo<"student" | "pic" | "cfi">(
    () => (isApprovedInstructor ? "cfi" : "student"),
    [isApprovedInstructor],
  );

  // 시행규칙 제77조②나목: 비행경력을 증명하는 조종교관은 제125조 경험(1년 10시간 또는 신임 1년 유예)이 있어야 한다.
  // 서명 교관 본인의 커런시를 계산해 서명함에 경고로 띄운다.
  const { instructorRecoveryChecked } = useCurrencyOverrides(account);
  const signerInstructorCurrencyMet = useMemo(() => {
    if (!isApprovedInstructor) return true;
    const r = computeFlightReadiness(
      entries.filter((e) => entryTrack(e) === "aircraft"),
      certificates,
      { instructorRecoveryChecked, operationType },
    );
    return r.instructor.met || r.instructor.isNewInstructorGrace;
  }, [
    isApprovedInstructor,
    entries,
    certificates,
    instructorRecoveryChecked,
    operationType,
  ]);
  const [selectedCertificate, setSelectedCertificate] =
    useState<Certificate | null>(null);

  const {
    entries: workLogEntries,
    addEntry: addWorkLogEntry,
    updateEntry: updateWorkLogEntry,
    deleteEntry: deleteWorkLogEntry,
    resyncFromServer: resyncWorkLogEntries,
    retryPendingSync: retryWorkLogPendingSync,
  } = useWorkLogEntries(account, workLogRole);

  // 사용자가 직접 세 종류(비행기록/자격증/업무기록)의 서버 초기 동기화를 즉시 다시 시도할 수 있게 하는
  // 수동 재시도 버튼 상태(FEAT-041). 최초 시도에서 일부 배치가 실패해도 새로고침 없이 재시도할 수 있다.
  // BUG-020 후속: 서버 → 로컬 방향의 초기 동기화(resyncFromServer)뿐 아니라, 로컬에만 남아 서버에
  // 한 번도 저장되지 못한 미동기화 기록을 다시 올리는 로컬 → 서버 방향 재시도(retryPendingSync)도
  // 이 버튼 한 번으로 함께 시도한다.
  const [isResyncing, setIsResyncing] = useState(false);
  const [resyncMessage, setResyncMessage] = useState<string | null>(null);

  // 연속 클릭 방지 쿨다운(짧은 시간 내 여러 번 눌러 배치 요청이 몰리는 것을 막는다). 마지막 시도 시각은
  // 렌더링과 무관하게 즉시 최신값을 참조해야 하므로 ref로 보관하고, 남은 초 표시는 1초 간격으로만
  // 갱신되는 별도 state(resyncCooldownSecondsLeft)로 관리한다.
  const lastResyncAtRef = useRef(0);
  const [resyncCooldownSecondsLeft, setResyncCooldownSecondsLeft] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const remainingMs =
        RESYNC_COOLDOWN_MS - (Date.now() - lastResyncAtRef.current);
      setResyncCooldownSecondsLeft(
        remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0,
      );
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const handleResyncFromServer = useCallback(() => {
    const elapsedSinceLastAttempt = Date.now() - lastResyncAtRef.current;
    if (isResyncing || elapsedSinceLastAttempt < RESYNC_COOLDOWN_MS) {
      return;
    }
    lastResyncAtRef.current = Date.now();
    setResyncCooldownSecondsLeft(Math.ceil(RESYNC_COOLDOWN_MS / 1000));
    setIsResyncing(true);
    setResyncMessage(null);
    void Promise.allSettled([
      resyncLogbookEntries(),
      resyncCertificates(),
      resyncWorkLogEntries(),
      retryLogbookPendingSync(),
      retryCertificatesPendingSync(),
      retryWorkLogPendingSync(),
    ]).then((results) => {
      // 미동기화 기록 재시도 3건(뒤 3개 결과)의 attempted/succeeded 건수를 합산해 사용자에게 간단히 안내한다.
      const retryResults = results.slice(3);
      let attempted = 0;
      let succeeded = 0;
      for (const result of retryResults) {
        if (result.status === "fulfilled" && result.value) {
          attempted += result.value.attempted;
          succeeded += result.value.succeeded;
        }
      }
      setIsResyncing(false);
      setResyncMessage(
        attempted > 0
          ? `서버와 다시 동기화를 시도했습니다. (미동기화 기록 ${attempted}건 중 ${succeeded}건 재전송 성공)`
          : "서버와 다시 동기화를 시도했습니다.",
      );
      window.setTimeout(() => setResyncMessage(null), 4000);
    });
  }, [
    isResyncing,
    resyncLogbookEntries,
    resyncCertificates,
    resyncWorkLogEntries,
    retryLogbookPendingSync,
    retryCertificatesPendingSync,
    retryWorkLogPendingSync,
  ]);

  const [selectedWorkLogEntry, setSelectedWorkLogEntry] =
    useState<WorkLogEntry | null>(null);

  // 정비사/관제사/운항관리사 법정 요건 안내/현황(실제 법령 근거 기반, 참고용 자동 계산).
  const workLogComplianceItems = useMemo(() => {
    if (workLogRole === "mechanic")
      return computeMechanicCompliance(certificates, workLogEntries);
    if (workLogRole === "atc")
      return computeAtcCompliance(certificates, workLogEntries);
    if (workLogRole === "dispatcher")
      return computeDispatcherCompliance(certificates, workLogEntries);
    return [];
  }, [workLogRole, certificates, workLogEntries]);
  const workLogComplianceTitle = workLogRole
    ? WORK_LOG_COMPLIANCE_TITLE[workLogRole]
    : "";

  // 초경량·경량 법정 요건 안내/현황 — 반드시 트랙 필터된 기록으로 계산한다.
  const droneComplianceItems = useMemo(
    () => (isDrone ? computeUltralightCompliance(trackEntries, vehicles) : []),
    [isDrone, trackEntries, vehicles],
  );
  const lsaComplianceItems = useMemo(
    () => (isLsa ? computeLsaCompliance(trackEntries) : []),
    [isLsa, trackEntries],
  );

  const filteredEntries = useMemo(
    () => trackEntries.filter((e) => matchesFilter(e, filterKind, filterValue)),
    [trackEntries, filterKind, filterValue],
  );

  // 서버에 아직 저장되지 않은(미동기화) 기록 수. syncPostId가 없으면 서버 게시글 생성이
  // 실패했거나 아직 시도 전이라는 뜻이다 — 로컬에는 안전하게 있으므로 경고 배지로만 알린다.
  const pendingSyncCount = useMemo(
    () => entries.filter((e) => !e.syncPostId).length,
    [entries],
  );

  // 새 비행 기록 입력 모드: 비행 직후 최소 입력(quick)이 기본, 공식 양식 전체는 detail.

  // 드론 조종자는 "항공기" 대신 "기체" 개념을 사용하므로 입력 폼/상세 라벨만 자연스럽게 조정합니다.
  const aircraftLabelProps = isDrone
    ? {
        aircraftTypeLabel: "기체 모델",
        aircraftTypePlaceholder: "예: DJI Matrice 300, EVO II Pro",
        aircraftIdLabel: "기체 신고번호 (선택)",
        aircraftIdPlaceholder: "예: LM12-034567",
      }
    : {};

  return {
    TABS,
    account,
    accountIndividualRole,
    activeTab,
    activeTrack,
    addCertificate,
    addEntry,
    addVehicle,
    addWorkLogEntry,
    aircraftLabelProps,
    birthDate,
    certificates,
    cleanupSignatureRequestPosts,
    clearAll,
    confirm,
    confirmInferredEntries,
    createCertificateApprovalPost,
    defaultEntryRole,
    deleteCertificate,
    deleteEntries,
    deleteEntry,
    deletePost,
    deleteVehicle,
    deleteWorkLogEntry,
    droneComplianceItems,
    entries,
    entrySuggestions,
    filterKind,
    filterValue,
    filteredEntries,
    handleCreateCertificate,
    handleImportLegacyEntries,
    handleResyncFromServer,
    handleUpdateEntry,
    hasPilotLicence,
    headerHeight,
    headerRef,
    individualRole,
    individualRoleLabel,
    instructorRecoveryChecked,
    isApprovedInstructor,
    isDrone,
    isLsa,
    isPilotLike,
    isResyncing,
    lastResyncAtRef,
    lsaComplianceItems,
    operationType,
    pendingSyncCount,
    pilotTracks,
    resyncCertificates,
    resyncCooldownSecondsLeft,
    resyncLogbookEntries,
    resyncMessage,
    resyncWorkLogEntries,
    retryCertificatesPendingSync,
    retryLogbookPendingSync,
    retryWorkLogPendingSync,
    roleContent,
    roleOverride,
    selectedCertificate,
    selectedEntry,
    selectedWorkLogEntry,
    setActiveTab,
    setActiveTrack,
    setFilterKind,
    setFilterValue,
    setIsResyncing,
    setResyncCooldownSecondsLeft,
    setResyncMessage,
    setSelectedCertificate,
    setSelectedEntry,
    setSelectedWorkLogEntry,
    showToast,
    signerInstructorCurrencyMet,
    toast,
    trackEntries,
    trackTotalHours,
    untaggedCount,
    updateCertificate,
    updateEntry,
    updateWorkLogEntry,
    uploadFile,
    userType,
    vehicles,
    workLogComplianceItems,
    workLogComplianceTitle,
    workLogCopy,
    workLogEntries,
    workLogRole,
  };
}

export type LogbookModel = ReturnType<typeof useLogbookPageModel>;
