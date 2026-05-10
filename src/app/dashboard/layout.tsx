import Sidebar from '../components/Sidebar'
import BrandingProvider from '../components/BrandingProvider'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <BrandingProvider>
      <div className="min-h-screen bg-slate-950">
        <Sidebar />
        <main className="pt-14 pb-24 w-full">
          <div className="w-full animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>
    </BrandingProvider>
  )
}
