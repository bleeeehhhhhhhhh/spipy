-- ============================================
-- Spipy Live Messaging & Notifications Migration
-- Run this in Supabase SQL Editor AFTER SUPABASE_AUTH_SETUP.sql
-- ============================================

-- 1. Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- 2. Conversation participants
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS cp_conversation_idx ON conversation_participants (conversation_id);
CREATE INDEX IF NOT EXISTS cp_user_idx ON conversation_participants (user_id);

ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- 3. Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  image_url TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS messages_sender_idx ON messages (sender_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 4. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('message', 'mention', 'like', 'comment', 'system')),
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  link TEXT DEFAULT '',
  is_read BOOLEAN DEFAULT false,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON notifications (user_id, is_read) WHERE is_read = false;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Conversations: users can only see conversations they participate in
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- Conversations: authenticated users can create conversations
CREATE POLICY "Authenticated users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Conversations: participants can update (for updated_at)
CREATE POLICY "Participants can update conversations"
  ON conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- Conversation Participants: users can see participants of their conversations
CREATE POLICY "Users can view participants of own conversations"
  ON conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants AS cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

-- Conversation Participants: authenticated users can add participants
CREATE POLICY "Authenticated users can add participants"
  ON conversation_participants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Conversation Participants: users can update their own participation
CREATE POLICY "Users can update own participation"
  ON conversation_participants FOR UPDATE
  USING (user_id = auth.uid());

-- Messages: users can read messages from their conversations
CREATE POLICY "Users can read messages in own conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- Messages: participants can send messages to their conversations
CREATE POLICY "Participants can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- Messages: users can soft-delete (update) their own messages
CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid());

-- Notifications: users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Notifications: system/anyone can insert notifications (for triggers)
CREATE POLICY "Anyone can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Notifications: users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Notifications: users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to find existing 1-on-1 conversation between two users
CREATE OR REPLACE FUNCTION find_dm_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
  conv_id UUID;
BEGIN
  SELECT cp1.conversation_id INTO conv_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = user1_id
    AND cp2.user_id = user2_id
    AND (
      SELECT COUNT(*) FROM conversation_participants cp3
      WHERE cp3.conversation_id = cp1.conversation_id
    ) = 2;
  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a notification (can be called from triggers or client)
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT '',
  p_link TEXT DEFAULT '',
  p_sender_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  notif_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, body, link, sender_id, metadata)
  VALUES (p_user_id, p_type, p_title, p_body, p_link, p_sender_id, p_metadata)
  RETURNING id INTO notif_id;
  RETURN notif_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: when a new message is inserted, update conversation.updated_at
-- and create notifications for other participants
CREATE OR REPLACE FUNCTION handle_new_message()
RETURNS TRIGGER AS $$
DECLARE
  participant RECORD;
  sender_name TEXT;
  msg_preview TEXT;
BEGIN
  -- Update conversation timestamp
  UPDATE conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;

  -- Get sender's display name
  SELECT COALESCE(display_name, username, 'Someone') INTO sender_name
  FROM profiles WHERE id = NEW.sender_id;

  -- Truncate message for preview
  msg_preview := LEFT(NEW.content, 100);

  -- Create notification for each participant (except sender)
  FOR participant IN
    SELECT user_id FROM conversation_participants
    WHERE conversation_id = NEW.conversation_id
    AND user_id != NEW.sender_id
  LOOP
    PERFORM create_notification(
      participant.user_id,
      'message',
      sender_name || ' sent you a message',
      msg_preview,
      '/messages/' || NEW.conversation_id,
      NEW.sender_id,
      jsonb_build_object('conversation_id', NEW.conversation_id, 'message_id', NEW.id)
    );
  END LOOP;

  -- Create mention notifications
  IF array_length(NEW.mentions, 1) > 0 THEN
    FOR participant IN
      SELECT unnest(NEW.mentions) AS user_id
    LOOP
      -- Don't double-notify participants who already got a message notification
      IF NOT EXISTS (
        SELECT 1 FROM conversation_participants
        WHERE conversation_id = NEW.conversation_id
        AND user_id = participant.user_id
        AND participant.user_id != NEW.sender_id
      ) THEN
        PERFORM create_notification(
          participant.user_id,
          'mention',
          sender_name || ' mentioned you',
          msg_preview,
          '/messages/' || NEW.conversation_id,
          NEW.sender_id,
          jsonb_build_object('conversation_id', NEW.conversation_id, 'message_id', NEW.id)
        );
      ELSE
        -- Update existing notification to mention type for participants
        UPDATE notifications
        SET type = 'mention', title = sender_name || ' mentioned you'
        WHERE user_id = participant.user_id
        AND sender_id = NEW.sender_id
        AND metadata->>'message_id' = NEW.id::text;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_message ON messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION handle_new_message();

-- ============================================
-- ENABLE REALTIME
-- ============================================
-- Run these individually if the alter publication fails:

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Enable realtime for conversation_participants (for read receipts)
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;

-- Done! 🔥
