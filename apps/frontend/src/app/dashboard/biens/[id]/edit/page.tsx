'use client';

import { useParams } from 'next/navigation';
import BienForm from '../../_components/bien-form';

export default function EditBienPage() {
  const params = useParams();
  const id = params?.id as string;

  return <BienForm bienId={id} />;
}
