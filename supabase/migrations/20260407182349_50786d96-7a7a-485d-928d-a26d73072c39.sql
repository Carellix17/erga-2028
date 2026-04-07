
-- Chat conversations
CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text NOT NULL DEFAULT 'Nuova chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations" ON public.chat_conversations FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY "Users can insert own conversations" ON public.chat_conversations FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY "Users can update own conversations" ON public.chat_conversations FOR UPDATE TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY "Users can delete own conversations" ON public.chat_conversations FOR DELETE TO authenticated USING (user_id = (auth.uid())::text);

-- Chat messages
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages" ON public.chat_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id = conversation_id AND c.user_id = (auth.uid())::text));
CREATE POLICY "Users can insert own messages" ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id = conversation_id AND c.user_id = (auth.uid())::text));
CREATE POLICY "Users can delete own messages" ON public.chat_messages FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id = conversation_id AND c.user_id = (auth.uid())::text));

CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id, created_at);
CREATE INDEX idx_chat_conversations_user ON public.chat_conversations(user_id, updated_at DESC);
