import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'

const OverviewPage = lazy(() => import('./pages/OverviewPage').then((module) => ({ default: module.OverviewPage })))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage })))
const MarketingPage = lazy(() => import('./pages/MarketingPage').then((module) => ({ default: module.MarketingPage })))
const ExplorerPage = lazy(() => import('./pages/ExplorerPage').then((module) => ({ default: module.ExplorerPage })))
const ImportPage = lazy(() => import('./pages/ImportPage').then((module) => ({ default: module.ImportPage })))
const ReportPage = lazy(() => import('./pages/ReportPage').then((module) => ({ default: module.ReportPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<OverviewPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="marketing" element={<MarketingPage />} />
        <Route path="explorer" element={<ExplorerPage />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="report" element={<ReportPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
