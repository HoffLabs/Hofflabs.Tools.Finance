import { getCurrentUserId } from '@/lib/auth/utils'
import { redirect } from 'next/navigation'

// Client component for settings
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const userId = await getCurrentUserId()
  
  if (!userId) {
    redirect('/auth/login')
  }
  
  return (
    <div className="w-full p-6 lg:p-8 xl:p-10">
      <div className="w-full">
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
              <p className="text-sm text-slate-500 mt-1">Manage your account, connected banks, and preferences.</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider">Account ID</p>
              <p className="text-xs text-slate-400 font-mono">{userId}</p>
            </div>
          </div>
        </div>
        <SettingsClient userId={userId} />
      </div>
    </div>
  )
}
