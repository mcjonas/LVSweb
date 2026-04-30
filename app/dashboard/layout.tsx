import Sidebar from '@/components/dashboard/Sidebar/Sidebar';
import Topbar from '@/components/dashboard/Topbar/Topbar';
import styles from './dashboard.module.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>
        <Topbar />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
