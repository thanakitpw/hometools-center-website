import LoginForm from './login-form';

export const metadata = {
  title: 'เข้าสู่ระบบ — Admin',
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="min-h-svh flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-xl border shadow-sm p-6">
        <h1 className="text-xl font-semibold mb-1">เข้าสู่ระบบ Admin</h1>
        <p className="text-sm text-slate-500 mb-6">Home Tool Center</p>
        <LoginForm next={next ?? '/admin'} />
      </div>
    </div>
  );
}
