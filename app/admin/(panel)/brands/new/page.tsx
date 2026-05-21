import BrandForm from '../brand-form';

export default function NewBrandPage() {
  return (
    <BrandForm
      value={{ id: null, slug: '', name: '', logo_url: null, banner_url: null, description: null, sort_order: 0 }}
    />
  );
}
