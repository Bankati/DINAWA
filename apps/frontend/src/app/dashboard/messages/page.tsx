'use client';

import { ConversationList } from '@/components/whatsapp/conversation-list';

export default function OwnerMessagesPage() {
  return <ConversationList basePath="/dashboard/messages" />;
}
