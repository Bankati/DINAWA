'use client';

import { useParams } from 'next/navigation';
import { ConversationThread } from '@/components/whatsapp/conversation-thread';

export default function ManagerConversationPage() {
  const params = useParams<{ id: string }>();
  return <ConversationThread id={params.id} basePath="/gestionnaire/messages" />;
}
