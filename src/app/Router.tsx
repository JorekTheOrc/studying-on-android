import { createHashRouter, RouterProvider } from 'react-router-dom'
import { Layout } from './Layout'
import { HomePage } from '../features/home/HomePage'
import { StudioPage } from '../features/studio/StudioPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { RunnerPage } from '../features/runner/RunnerPage'
import { PracticePage } from '../features/runner/PracticePage'
import { AllCardsPage } from '../features/flashcards/AllCardsPage'
import { ReviewPage } from '../features/flashcards/ReviewPage'
import { StatisticsPage } from '../features/stats/StatisticsPage'

const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'studio', element: <StudioPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'cards', element: <AllCardsPage /> },
      { path: 'stats', element: <StatisticsPage /> },
      { path: 'review', element: <ReviewPage /> },
      { path: 'runner/:setId', element: <RunnerPage /> },
      { path: 'runner/:setId/practice/:exerciseId', element: <PracticePage /> },
    ],
  },
])

export function Router() {
  return <RouterProvider router={router} />
}
