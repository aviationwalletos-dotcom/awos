// PDF 생성 진입점 — pdf-lib·폰트는 여기서만 dynamic import 되어 초기 번들에 포함되지 않는다.
import { importWithReload } from '../lazyImport'
import type { LogbookEntry } from '../../types/logbook'
import type { Vehicle } from '../../types/vehicle'
import { saveBlob } from '../ui/saveFile'
import type { PilotCertificateHolder } from './pilotCertificatePdf'
import type { UltralightHolder } from './ultralightCertificatePdf'

function stamp(): string {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

export async function savePilotFlightExperienceCertificatePdf(entries: LogbookEntry[], holder: PilotCertificateHolder): Promise<void> {
  const { buildPilotFlightExperienceCertificatePdf } = await importWithReload('pilotCertificatePdf', () => import('./pilotCertificatePdf'))
  const bytes = await buildPilotFlightExperienceCertificatePdf(entries, holder)
  await saveBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), `비행경력증명서_초안_${holder.name ?? ''}_${stamp()}.pdf`)
}

export async function saveUltralightCertificatePdf(entries: LogbookEntry[], vehicles: Vehicle[], holder: UltralightHolder): Promise<void> {
  const { buildUltralightCertificatePdf } = await importWithReload('ultralightCertificatePdf', () => import('./ultralightCertificatePdf'))
  const bytes = await buildUltralightCertificatePdf(entries, vehicles, holder)
  await saveBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), `비행경력증명서_초경량_초안_${holder.name ?? ''}_${stamp()}.pdf`)
}
