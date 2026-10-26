import AdminShell from '../../components/vvitu/admin/admin-shell';

// A thin SERVER layout. Keeping it server-side is what preserves `robots: noindex`
// on pages that list students by name — a client layout would silently drop the
// metadata export. The shell itself is a client component; the pages inside it
// hold no student data at render time, every figure is fetched behind the
// passcode cookie.
export const metadata = {
    title: {
        default: 'Admin Panel · ToriiMinds × VVITU',
        template: '%s · Admin Panel'
    },
    description: 'Internal ToriiMinds × VVITU admin panel.',
    robots: { index: false, follow: false }
};

export default function AdminLayout({ children }) {
    return <AdminShell>{children}</AdminShell>;
}
