import RedirectForm from '../redirect-form';

export default function NewRedirectPage() {
  return <RedirectForm value={{ id: null, from_path: '', to_path: '', status_code: 301, note: null }} />;
}
