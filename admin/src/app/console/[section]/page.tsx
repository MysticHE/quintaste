import Console from '../../../components/Console';
export default async function Page({ params }: { params: Promise<{section:string}> }) {
  return <Console section={(await params).section}/>;
}
