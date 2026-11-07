import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout } from './Layout'
import { HomePage } from '../features/home/HomePage'
import { BuilderPage } from '../features/builder/BuilderPage'
import { ImportPage } from '../features/import/ImportPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { RunnerPage } from '../features/runner/RunnerPage'
import { PracticePage } from '../features/runner/PracticePage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'builder', element: <BuilderPage /> },
      { path: 'import', element: <ImportPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'runner/:setId', element: <RunnerPage /> },
      { path: 'runner/:setId/practice/:exerciseId', element: <PracticePage /> },
    ],
  },
])

export function Router() {
  return <RouterProvider router={router} />
}
