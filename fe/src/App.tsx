import { Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/AppLayout'
import { RequireAuth } from '@/components/RequireAuth'
import { Toaster } from '@/components/ui/sonner'
import HomePage from '@/pages/HomePage'
import LoginPage from '@/pages/LoginPage'
import NotFoundPage from '@/pages/NotFoundPage'
import NotificationsPage from '@/pages/NotificationsPage'
import RegisterPage from '@/pages/RegisterPage'
import SettingsPage from '@/pages/SettingsPage'
import TankDetailPage from '@/pages/TankDetailPage'
import TankFormPage from '@/pages/TankFormPage'
import TaskFormPage from '@/pages/TaskFormPage'
import TanksPage from '@/pages/TanksPage'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/tanks" element={<TanksPage />} />
            <Route path="/tanks/new" element={<TankFormPage />} />
            <Route path="/tanks/:id" element={<TankDetailPage />} />
            <Route path="/tanks/:id/edit" element={<TankFormPage />} />
            <Route path="/tanks/:id/tasks/new" element={<TaskFormPage />} />
            <Route path="/tasks/new" element={<TaskFormPage />} />
            <Route path="/tasks/:taskId/edit" element={<TaskFormPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toaster />
    </>
  )
}
