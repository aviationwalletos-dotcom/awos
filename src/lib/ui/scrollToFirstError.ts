// 폼 검증 실패 시 첫 오류 위치로 화면을 옮긴다(모바일에서 아래쪽 오류를 못 보는 문제).
// 오류 표시는 aria-invalid="true" 인 입력 또는 오류 문구(role="alert" / .text-rose-400)를 기준으로 찾는다.
export function scrollToFirstError(form: HTMLFormElement | null | undefined): void {
  if (!form) return
  window.requestAnimationFrame(() => {
    const target =
      form.querySelector<HTMLElement>('[aria-invalid="true"]') ??
      form.querySelector<HTMLElement>('[role="alert"], .text-rose-400, .text-rose-300')
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) {
      target.focus({ preventScroll: true })
    }
  })
}
