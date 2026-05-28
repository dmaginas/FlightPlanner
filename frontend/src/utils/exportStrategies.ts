import { exportOFP, exportMsfsPln, type ExportData } from './exportService'

export type { ExportData }

export interface ExportStrategy {
  id: string
  label: string
  subtitle: string
  icon: string
  execute(data: ExportData): Promise<void>
}

const ofpPdfStrategy: ExportStrategy = {
  id: 'ofp-pdf',
  label: 'OFP PDF',
  subtitle: 'Operational Flight Plan',
  icon: '📄',
  async execute(data) { await exportOFP(data) },
}

const msfsPlnStrategy: ExportStrategy = {
  id: 'msfs-pln',
  label: 'MSFS .pln',
  subtitle: 'Flight Simulator 2020 / 2024',
  icon: '🛫',
  async execute(data) { exportMsfsPln(data) },
}

export const EXPORT_STRATEGIES: ExportStrategy[] = [
  ofpPdfStrategy,
  msfsPlnStrategy,
]
